import { CONSTANTS, SHEET_TYPE } from './constants.js'
import { checkEmpty, getSetting, registerMenu, registerSetting, resetDnd5eConfig } from './utils.js'
import { EncumbranceForm } from './forms/encumbrance-form.js'

/**
 * Register
 */
export function register () {
    // Return if the Variant Encumbrance + Midi module is active
    if (game.modules.get('variant-encumbrance-dnd5e')?.active) return

    registerSettings()
    registerHooks()

    loadTemplates([
        CONSTANTS.ENCUMBRANCE.TEMPLATE.FORM
    ])
}

/**
 * Register settings
 */
function registerSettings () {
    registerMenu(
        CONSTANTS.ENCUMBRANCE.MENU.KEY,
        {
            hint: game.i18n.localize(CONSTANTS.ENCUMBRANCE.MENU.HINT),
            label: game.i18n.localize(CONSTANTS.ENCUMBRANCE.MENU.LABEL),
            name: game.i18n.localize(CONSTANTS.ENCUMBRANCE.MENU.NAME),
            icon: CONSTANTS.ENCUMBRANCE.MENU.ICON,
            type: EncumbranceForm,
            restricted: true,
            scope: 'world'
        }
    )

    registerSetting(
        CONSTANTS.ENCUMBRANCE.SETTING.KEY,
        {
            scope: 'world',
            config: false,
            type: Object,
            default: CONFIG.CUSTOM_DND5E.encumbrance
        }
    )

    registerSetting(
        CONSTANTS.ENCUMBRANCE.EQUIPPED_ITEM_WEIGHT_MODIFIER.SETTING.KEY,
        {
            scope: 'world',
            config: false,
            type: Number,
            default: 1
        }
    )

    registerSetting(
        CONSTANTS.ENCUMBRANCE.PROFICIENT_EQUIPPED_ITEM_WEIGHT_MODIFIER.SETTING.KEY,
        {
            scope: 'world',
            config: false,
            type: Number,
            default: 1
        }
    )

    registerSetting(
        CONSTANTS.ENCUMBRANCE.UNEQUIPPED_ITEM_WEIGHT_MODIFIER.SETTING.KEY,
        {
            scope: 'world',
            config: false,
            type: Number,
            default: 1
        }
    )
}

/**
 * Register hooks
 */
function registerHooks () {
    /**
     * Modified from Actor5e._prepareEncumbrance
     */
    Hooks.on('preRenderActorSheet', (app, data) => {
        if (!SHEET_TYPE[app.constructor.name]?.character) return

        const equippedMod = getSetting(CONSTANTS.ENCUMBRANCE.EQUIPPED_ITEM_WEIGHT_MODIFIER.SETTING.KEY) || 0
        const proficientEquippedMod = getSetting(CONSTANTS.ENCUMBRANCE.PROFICIENT_EQUIPPED_ITEM_WEIGHT_MODIFIER.SETTING.KEY) || 0
        const unequippedMod = getSetting(CONSTANTS.ENCUMBRANCE.UNEQUIPPED_ITEM_WEIGHT_MODIFIER.SETTING.KEY) || 0

        if (equippedMod === 1 && proficientEquippedMod === 1 && unequippedMod === 1) return

        const actor = data.actor
        const config = CONFIG.DND5E.encumbrance
        const units = game.settings.get('dnd5e', 'metricWeightUnits') ? 'metric' : 'imperial'
        // Get the total weight from items
        let weight = actor.items
            .filter(item => !item.container)
            .reduce((weight, item) => {
                const equipped = item.system.equipped
                const proficient = item.system.prof?.multiplier >= 1
                const mod = (proficient) ? Math.min(proficientEquippedMod, equippedMod) : equippedMod
                return weight + ((equipped) ? (item.system.totalWeight ?? 0) * mod : (item.system.totalWeight ?? 0) * unequippedMod || 0)
            }, 0)

        // [Optional] add Currency Weight (for non-transformed actors)
        const currency = actor.system.currency
        if (game.settings.get('dnd5e', 'currencyWeight') && currency) {
            const numCoins = Object.values(currency).reduce((val, denom) => val + Math.max(denom, 0), 0)
            const currencyPerWeight = config.currencyPerWeight[units]
            weight += numCoins / currencyPerWeight
        }

        data.encumbrance.value = weight.toNearest(0.1)
        data.encumbrance.pct = Math.clamped((data.encumbrance.value * 100) / data.encumbrance.max, 0, 100)
    })
}

/**
 * Set CONFIG.DND5E.encumbrance
 * @param {object} data
 */
export function setConfig (data = null) {
    if (checkEmpty(data)) {
        if (checkEmpty(CONFIG.DND5E.encumbrance)) {
            resetDnd5eConfig('encumbrance')
        }
        return
    }

    data && (CONFIG.DND5E.encumbrance = data)
}
