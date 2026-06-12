import { MODULE } from "../constants.js";
import { getSetting } from "../utils.js";
import { configs } from "../configurations/registry.js";

/**
 * Actor types whose derived movement has custom speeds applied.
 * @type {string[]}
 */
const MOVEMENT_ACTOR_TYPES = ["character", "npc", "vehicle"];

/* -------------------------------------------- */

/**
 * Patch data models to apply custom movement.
 */
export function patchPrepareDerivedData() {
  if ( !getSetting(configs.movementTypes.SETTING.ENABLE.KEY) ) return;

  for ( const type of MOVEMENT_ACTOR_TYPES ) {
    if ( !CONFIG.Actor.dataModels?.[type]?.prototype?.prepareDerivedData ) continue;
    libWrapper.register(
      MODULE.ID,
      `CONFIG.Actor.dataModels.${type}.prototype.prepareDerivedData`,
      applyCustomMovement,
      "WRAPPER"
    );
  }
}

/* -------------------------------------------- */

/**
 * Apply custom movement from `flags.custom-dnd5e.movementTypes` to the movement data.
 * @this {CharacterData|NPCData|VehicleData}
 * @param {Function} wrapped
 * @param {...*} args
 * @returns {*} Wrapped result
 */
function applyCustomMovement(wrapped, ...args) {
  try {
    const movement = this.attributes?.movement;
    const flagMovement = this.parent?.flags?.[MODULE.ID]?.movementTypes;
    if ( movement && flagMovement ) {
      const systemMovementTypes = new Set(Object.keys(CONFIG.CUSTOM_DND5E?.movementTypes ?? {}));
      for ( const [key, value] of Object.entries(flagMovement) ) {
        if ( value === undefined || value === null || value === "" ) continue;
        if ( systemMovementTypes.has(key) ) continue;
        if ( !(key in CONFIG.DND5E.movementTypes) ) continue;
        movement[key] = value;
      }
    }
  } catch {}
  return wrapped(...args);
}
