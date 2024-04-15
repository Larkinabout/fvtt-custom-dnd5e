import { MODULE, CONSTANTS } from '../constants.js'
import { getSetting } from '../utils.js'

export function patchPrepareEncumbrance () {
    if (game.modules.get('variant-encumbrance-dnd5e')?.active) return
    libWrapper.register(MODULE.ID, 'CONFIG.Actor.documentClass.prototype._prepareEncumbrance', prepareEncumbrancePatch, 'OVERRIDE')
}

async function prepareEncumbrancePatch () {
    const equippedMod = getSetting(CONSTANTS.ENCUMBRANCE.EQUIPPED_ITEM_WEIGHT_MODIFIER.SETTING.KEY) || 0
    const proficientEquippedMod = getSetting(CONSTANTS.ENCUMBRANCE.PROFICIENT_EQUIPPED_ITEM_WEIGHT_MODIFIER.SETTING.KEY) || 0
    const unequippedMod = getSetting(CONSTANTS.ENCUMBRANCE.UNEQUIPPED_ITEM_WEIGHT_MODIFIER.SETTING.KEY) || 0

    const config = CONFIG.DND5E.encumbrance;
    const encumbrance = this.system.attributes.encumbrance ??= {};
    const units = game.settings.get("dnd5e", "metricWeightUnits") ? "metric" : "imperial";

    // Get the total weight from items
    let weight = this.items
        .filter(item => !item.container)
        .reduce((weight, item) => {
            const equipped = item.system.equipped
            const proficient = item.system.prof?.multiplier >= 1
            const mod = (proficient) ? Math.min(proficientEquippedMod, equippedMod) : equippedMod
            return weight + ((equipped) ? (item.system.totalWeight ?? 0) * mod : (item.system.totalWeight ?? 0) * unequippedMod || 0)
        }, 0)

    // [Optional] add Currency Weight (for non-transformed actors)
    const currency = this.system.currency;
    if ( game.settings.get("dnd5e", "currencyWeight") && currency ) {
      const numCoins = Object.values(currency).reduce((val, denom) => val + Math.max(denom, 0), 0);
      const currencyPerWeight = config.currencyPerWeight[units];
      weight += numCoins / currencyPerWeight;
    }

    // Determine the Encumbrance size class
    const keys = Object.keys(CONFIG.DND5E.actorSizes);
    const index = keys.findIndex(k => k === this.system.traits.size);
    const sizeConfig = CONFIG.DND5E.actorSizes[
      keys[this.flags.dnd5e?.powerfulBuild ? Math.min(index + 1, keys.length - 1) : index]
    ];
    const mod = sizeConfig?.capacityMultiplier ?? sizeConfig?.token ?? 1;

    const calculateThreshold = multiplier => this.type === "vehicle"
      ? this.system.attributes.capacity.cargo * config.vehicleWeightMultiplier[units]
      : ((this.system.abilities.str?.value ?? 10) * multiplier * mod).toNearest(0.1);

    // Populate final Encumbrance values
    encumbrance.mod = mod;
    encumbrance.value = weight.toNearest(0.1);
    encumbrance.thresholds = {
      encumbered: calculateThreshold(config.threshold.encumbered[units]),
      heavilyEncumbered: calculateThreshold(config.threshold.heavilyEncumbered[units]),
      maximum: calculateThreshold(config.threshold.maximum[units])
    };
    encumbrance.max = encumbrance.thresholds.maximum;
    encumbrance.stops = {
      encumbered: Math.clamped((encumbrance.thresholds.encumbered * 100) / encumbrance.max, 0, 100),
      heavilyEncumbered: Math.clamped((encumbrance.thresholds.heavilyEncumbered * 100) / encumbrance.max, 0, 100)
    };
    encumbrance.pct = Math.clamped((encumbrance.value * 100) / encumbrance.max, 0, 100);
    encumbrance.encumbered = encumbrance.value > encumbrance.heavilyEncumbered;
}
