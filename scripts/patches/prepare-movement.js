import { MODULE, CONSTANTS } from "../constants.js";
import { getSetting } from "../utils.js";

/**
 * Patch the prepareMovement function to use multiplier-based speed reduction for encumbrance.
 */
export function patchPrepareMovement() {
  if ( !getSetting(CONSTANTS.ENCUMBRANCE.SETTING.ENABLE.KEY) ) return;
  if ( getSetting(CONSTANTS.ENCUMBRANCE.SPEED_REDUCTION_MODE.SETTING.KEY) !== "multiplier" ) return;
  if ( game.modules.get("variant-encumbrance-dnd5e")?.active ) return;
  libWrapper.register(MODULE.ID, "dnd5e.dataModels.actor.AttributesFields.prepareMovement", prepareMovementPatch, "OVERRIDE");
}

/**
 * Prepare movement speeds, applying multiplier-based encumbrance reductions.
 * @this {CharacterData|NPCData|VehicleData}
 * @param {object} rollData The Actor's roll data.
 */
function prepareMovementPatch(rollData = this.parent.getRollData()) {
  const simplifyBonus = dnd5e.utils.simplifyBonus;
  const convertLength = dnd5e.utils.convertLength;
  const defaultUnits = dnd5e.utils.defaultUnits;

  const statuses = this.parent.statuses;
  const noMovement = this.parent.hasConditionEffect("noMovement");
  const crawl = this.parent.hasConditionEffect("crawl");
  for ( const type of Object.keys(CONFIG.DND5E.movementTypes) ) {
    if ( noMovement || (crawl && (type !== "walk")) ) this.attributes.movement[type] = 0;
    else this.attributes.movement[type] = Math.max(0, simplifyBonus(this.attributes.movement[type], rollData));
    if ( type === "walk" ) this.attributes.movement.speed = this.attributes.movement.walk;
  }

  const halfMovement = this.parent.hasConditionEffect("halfMovement");
  const encumbered = statuses.has("encumbered");
  const heavilyEncumbered = statuses.has("heavilyEncumbered");
  const exceedingCarryingCapacity = statuses.has("exceedingCarryingCapacity");
  const units = this.attributes.movement.units ??= defaultUnits("length");
  let reduction = game.settings.get("dnd5e", "rulesVersion") === "modern"
    ? (this.attributes.exhaustion ?? 0) * (CONFIG.DND5E.conditionTypes.exhaustion?.reduction?.speed ?? 0) : 0;
  reduction = convertLength(reduction, CONFIG.DND5E.defaultUnits.length.imperial, units);
  const bonus = simplifyBonus(this.attributes.movement.bonus, rollData);
  this.attributes.movement.max = 0;

  const encumberedMultiplier = getSetting(CONSTANTS.ENCUMBRANCE.SPEED_REDUCTION_MULTIPLIER_ENCUMBERED.SETTING.KEY) ?? 0.67;
  const heavilyEncumberedMultiplier = getSetting(CONSTANTS.ENCUMBRANCE.SPEED_REDUCTION_MULTIPLIER_HEAVILY_ENCUMBERED.SETTING.KEY) ?? 0.33;
  const exceedingCapacityMultiplier = getSetting(CONSTANTS.ENCUMBRANCE.SPEED_REDUCTION_MULTIPLIER_EXCEEDING_CARRYING_CAPACITY.SETTING.KEY) ?? 0;
  const rounding = getSetting(CONSTANTS.ENCUMBRANCE.SPEED_REDUCTION_MULTIPLIER_ROUNDING.SETTING.KEY) || 1;

  for ( const type of Object.keys(CONFIG.DND5E.movementTypes) ) {
    let speed = Math.max(0, this.attributes.movement[type] - reduction);
    if ( speed ) {
      speed = Math.max(0, speed + bonus);
      if ( halfMovement ) speed *= 0.5;
      if ( heavilyEncumbered ) {
        speed = Math.max(0, speed * heavilyEncumberedMultiplier);
      } else if ( encumbered ) {
        speed = Math.max(0, speed * encumberedMultiplier);
      }
      if ( exceedingCarryingCapacity ) {
        speed = Math.max(0, speed * exceedingCapacityMultiplier);
      }
    }
    this.attributes.movement[type] = Math.round(speed / rounding) * rounding;
    this.attributes.movement.max = Math.max(speed, this.attributes.movement.max);
    if ( type === "walk" ) this.attributes.movement.speed = speed;
  }
  const baseSpeed = this._source.attributes.movement.walk || this.attributes.movement.fromSpecies?.walk;
  this.attributes.movement.slowed = this.attributes.movement.walk <= (simplifyBonus(baseSpeed, rollData) / 2);
}
