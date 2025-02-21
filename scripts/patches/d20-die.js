import { MODULE } from "../constants.js";
import { isCustomRoll } from "../rolls.js";
import { getDieParts } from "../utils.js";

/**
 * Patch the D20Die to apply custom roll settings.
 */
export function patchD20Die() {
  if ( !isCustomRoll() ) return;

  libWrapper.register(MODULE.ID, "CONFIG.Dice.D20Die.prototype.applyAdvantage", applyAdvantagePatch, "OVERRIDE");
}

/* -------------------------------------------- */

/**
 * Apply advantage or disadvantage to the roll.
 * @param {number} advantageMode The advantage mode
 */
function applyAdvantagePatch(advantageMode) {
  const customDieParts = getDieParts(this.options.customDie);
  const baseNumber = customDieParts?.number ?? 1;
  this.options.advantageMode = advantageMode;
  this.modifiers.findSplice(m => ["kh", "kl"].includes(m));
  if ( advantageMode === CONFIG.Dice.D20Roll.ADV_MODE.NORMAL ) this.number = baseNumber;
  else {
    const isAdvantage = advantageMode === CONFIG.Dice.D20Roll.ADV_MODE.ADVANTAGE;
    this.number = (isAdvantage && this.options.elvenAccuracy) ? (baseNumber * 3) : baseNumber * 2;
    this.modifiers.push(isAdvantage ? `kh${baseNumber}` : `kl${baseNumber}`);
  }
}
