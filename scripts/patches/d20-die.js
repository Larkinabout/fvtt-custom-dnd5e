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
  this.modifiers.findSplice(m => m.startsWith("adv") || m.startsWith("dis") || (m === "kh") || (m === "kl"));
  this.number = baseNumber;
  if ( advantageMode === CONFIG.Dice.D20Roll.ADV_MODE.NORMAL ) return;
  const isAdvantage = advantageMode === CONFIG.Dice.D20Roll.ADV_MODE.ADVANTAGE;
  this.modifiers.push(`${isAdvantage ? "adv" : "dis"}${isAdvantage && this.options.elvenAccuracy ? "2" : ""}`);
}
