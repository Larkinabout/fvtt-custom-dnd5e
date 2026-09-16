import { MODULE } from "../constants.js";
import { isCustomRoll } from "../rolls.js";
import { getDieParts } from "../utils.js";

/**
 * Patch the D20Die to apply custom roll settings.
 */
export function patchD20Die() {
  if ( !isCustomRoll() ) return;

  libWrapper.register(MODULE.ID, "CONFIG.Dice.D20Die.prototype.applyAdvantage", applyAdvantagePatch, "OVERRIDE");
  libWrapper.register(MODULE.ID, "CONFIG.Dice.D20Die.prototype.isValid", isValidPatch, "OVERRIDE");
}

/* -------------------------------------------- */

/**
 * Treat a custom die as a valid challenge die.
 * @returns {boolean} Whether this is a valid challenge die
 */
function isValidPatch() {
  return this.faces === 20 || !!this.options.customDie;
}

/* -------------------------------------------- */

/**
 * Apply advantage or disadvantage to the roll.
 * @param {number} advantageMode
 */
function applyAdvantagePatch(advantageMode) {
  const customDieParts = getDieParts(this.options.customDie);
  const baseNumber = customDieParts?.number ?? 1;
  this.options.advantageMode = advantageMode;
  this.modifiers.findSplice(m => m.startsWith("adv") || m.startsWith("dis") || (m === "kh") || (m === "kl"));
  this.number = baseNumber;
  if ( advantageMode === CONFIG.Dice.D20Roll.ADV_MODE.NORMAL ) return;
  const isAdvantage = advantageMode === CONFIG.Dice.D20Roll.ADV_MODE.ADVANTAGE;
  this.modifiers.push(`${isAdvantage ? "adv" : "dis"}${isAdvantage && this.options.elvenAccuracy ? "2" : ""}`);
}
