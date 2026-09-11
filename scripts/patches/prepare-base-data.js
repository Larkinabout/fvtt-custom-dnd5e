import { CONSTANTS, MODULE } from "../constants.js";
import { getSetting } from "../utils.js";

const constants = CONSTANTS.PROFICIENCY_BONUS;

/**
 * The actor types with their own proficiency bonus table, and the settings holding them.
 * @type {Array<{type: string, enableKey: string, tableKey: string}>}
 */
const ACTOR_TYPES = [
  {
    type: "character",
    enableKey: constants.SETTING.CHARACTER_ENABLE.KEY,
    tableKey: constants.SETTING.CHARACTER_PROFICIENCY_BONUS.KEY
  },
  {
    type: "npc",
    enableKey: constants.SETTING.NPC_ENABLE.KEY,
    tableKey: constants.SETTING.NPC_PROFICIENCY_BONUS.KEY
  }
];

/* -------------------------------------------- */

/**
 * Whether the D&D 5e "Proficiency Dice" variant is active.
 * @returns {boolean}
 */
export function isProficiencyDiceMode() {
  try {
    return game.settings.get("dnd5e", "proficiencyModifier") === "dice";
  } catch {
    return false;
  }
}

/* -------------------------------------------- */

/**
 * Patch actor data models to apply a custom proficiency bonus.
 * Characters and NPCs are enabled and configured independently.
 */
export function patchPrepareBaseData() {
  for ( const { type, enableKey, tableKey } of ACTOR_TYPES ) {
    if ( !getSetting(enableKey) ) continue;
    if ( !CONFIG.Actor.dataModels?.[type]?.prototype?.prepareBaseData ) continue;
    libWrapper.register(
      MODULE.ID,
      `CONFIG.Actor.dataModels.${type}.prototype.prepareBaseData`,
      function(wrapped, ...args) {
        return applyCustomProficiencyBonus.call(this, wrapped, args, type, tableKey);
      },
      "WRAPPER"
    );
  }
}

/* -------------------------------------------- */

/**
 * Override `this.attributes.prof` with the configured value.
 * Blank table entries fall back to the system value.
 * @this {CharacterData|NPCData}
 * @param {Function} wrapped
 * @param {Array<*>} args
 * @param {string} type Actor type
 * @param {string} tableKey Setting key for proficiency bonus table
 * @returns {*} Wrapped result
 */
function applyCustomProficiencyBonus(wrapped, args, type, tableKey) {
  const result = wrapped(...args);

  try {
    if ( this.attributes?.prof === null || this.attributes?.prof === undefined ) return result;

    const table = getSetting(tableKey) ?? {};

    let level = this.details?.level ?? 0;
    if ( type === "npc" ) {
      level = Math.max(this.details?.cr ?? 0, level, 1);
    }

    const value = table[level] ?? table[String(level)];
    if ( value === undefined || value === null || value === "" ) return result;

    let pb = Number(value);
    if ( Number.isNaN(pb) ) return result;

    if ( pb < 0 && isProficiencyDiceMode() ) pb = 0;

    this.attributes.prof = pb;
  } catch {}

  return result;
}
