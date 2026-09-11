import { MODULE } from "../constants.js";
import { getSetting } from "../utils.js";
import { configs } from "../configurations/registry.js";

/**
 * Patch the prepareMovement function to use multiplier-based speed reduction for encumbrance.
 */
export function patchPrepareMovement() {
  if ( !getSetting(configs.encumbrance.SETTING.ENABLE.KEY) ) return;
  if ( getSetting(configs.encumbrance.SPEED_REDUCTION_MODE.SETTING.KEY) !== "multiplier" ) return;
  if ( game.modules.get("variant-encumbrance-dnd5e")?.active ) return;
  libWrapper.register(MODULE.ID, "dnd5e.dataModels.actor.AttributesFields.prepareMovement", prepareMovementPatch, "OVERRIDE");
}

/**
 * Prepare movement speeds, applying multiplier-based encumbrance reductions.
 * Based on `AttributesFields.prepareMovement` from dnd5e 6.0.1.
 * @this {CharacterData|NPCData|VehicleData}
 * @param {object} rollData The Actor's roll data.
 */
function prepareMovementPatch(rollData = this.parent.getRollData()) {
  const simplifyBonus = dnd5e.utils.simplifyBonus;
  const convertLength = dnd5e.utils.convertLength;
  const defaultUnits = dnd5e.utils.defaultUnits;
  const ConditionData = dnd5e.dataModels.activeEffect.ConditionData;

  const statuses = this.parent.statuses;
  const noMovement = this.parent.hasConditionEffect("noMovement");
  const crawl = this.parent.hasConditionEffect("crawl");
  const speeds = this.attributes.movement.speeds;
  for ( const type of Object.keys(CONFIG.DND5E.movementTypes) ) {
    if ( noMovement || (crawl && (type !== "walk")) ) speeds[type] = 0;
    else speeds[type] = Math.max(0, simplifyBonus(speeds[type], rollData));
    if ( type === "walk" ) this.attributes.movement.speed = speeds.walk;
  }

  const halfMovement = this.parent.hasConditionEffect("halfMovement");
  const encumbered = statuses.has("encumbered");
  const heavilyEncumbered = statuses.has("heavilyEncumbered");
  const exceedingCarryingCapacity = statuses.has("exceedingCarryingCapacity");
  const units = this.attributes.movement.units ??= defaultUnits("length");

  let reduction = statuses.reduce((acc, status) => {
    const immune = this.traits?.ci?.value?.has(status);
    if ( immune ) return acc;

    const speed = CONFIG.DND5E.conditionTypes[status]?.reduction?.speed ?? 0;
    const level = ConditionData.hasLevels(status)
      ? this.parent.system.conditions[status] ?? 0
      : Boolean(statuses.has(status));
    return acc + (level * speed);
  }, 0);
  if ( ((this.attributes.ac?.equippedArmor?.system.strength ?? 0) > (this.abilities?.str?.value ?? Infinity))
    && !this.parent.flags.dnd5e?.ignoreArmorSpeedReduction && this.isCreature ) {
    reduction += CONFIG.DND5E.armorSpeedReduction;
  }
  reduction = convertLength(reduction, CONFIG.DND5E.defaultUnits.length.imperial, units);
  const bonus = simplifyBonus(this.attributes.movement.bonus, rollData);
  const multiplier = this.attributes.movement.multiplier * (halfMovement ? 0.5 : 1);
  this.attributes.movement.max = 0;

  const encumberedMultiplier =
    getSetting(configs.encumbrance.SPEED_REDUCTION_MULTIPLIER_ENCUMBERED.SETTING.KEY) ?? 0.67;
  const heavilyEncumberedMultiplier =
    getSetting(configs.encumbrance.SPEED_REDUCTION_MULTIPLIER_HEAVILY_ENCUMBERED.SETTING.KEY) ?? 0.33;
  const exceedingCapacityMultiplier =
    getSetting(configs.encumbrance.SPEED_REDUCTION_MULTIPLIER_EXCEEDING_CARRYING_CAPACITY.SETTING.KEY) ?? 0;
  const rounding = getSetting(configs.encumbrance.SPEED_REDUCTION_MULTIPLIER_ROUNDING.SETTING.KEY) || 1;

  for ( const type of Object.keys(CONFIG.DND5E.movementTypes) ) {
    let speed = Math.max(0, speeds[type] - reduction);
    if ( (speed * multiplier) > 0 ) {
      speed = Math.max(0, speed + bonus) * multiplier;
      if ( heavilyEncumbered ) {
        speed = Math.max(0, speed * heavilyEncumberedMultiplier);
      } else if ( encumbered ) {
        speed = Math.max(0, speed * encumberedMultiplier);
      }
      if ( exceedingCarryingCapacity ) {
        speed = Math.max(0, speed * exceedingCapacityMultiplier);
      }
      speeds[type] = Math.round(speed / rounding) * rounding;
    } else {
      speeds[type] = 0;
    }
    this.attributes.movement.max = Math.max(speeds[type], this.attributes.movement.max);
    if ( type === "walk" ) this.attributes.movement.speed = speeds[type];
  }
  const baseSpeed = this._source.attributes.movement.speeds.walk || this.attributes.movement.fromSpecies?.walk;
  this.attributes.movement.slowed = speeds.walk <= (simplifyBonus(baseSpeed, rollData) / 2);
  speeds.jump = (this.abilities?.str.value ?? 0) / 2;
}
