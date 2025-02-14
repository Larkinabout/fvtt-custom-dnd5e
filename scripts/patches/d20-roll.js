import { MODULE } from "../constants.js";
import { isCustomRoll } from "../rolls.js";

/**
 * Patch the D20Roll to apply custom roll settings.
 */
export function patchD20Roll() {
  if ( !isCustomRoll() ) return;

  libWrapper.register(MODULE.ID, "CONFIG.Dice.D20Roll.fromConfig", fromConfigPatch, "OVERRIDE");
  libWrapper.register(MODULE.ID, "CONFIG.Dice.D20Roll.prototype.configureModifiers", configureModifiersPatch, "WRAPPER");
  libWrapper.register(MODULE.ID, "CONFIG.Dice.D20Roll.prototype.validD20Roll", validD20RollPatch, "OVERRIDE");
}

/* -------------------------------------------- */

/**
 * Override the fromConfig method to support custom dice.
 * @param {object} config The roll configuration
 * @param {object} process The process data
 * @returns {CONFIG.Dice.D20Roll} The configured D20Roll
 */
function fromConfigPatch(config, process) {
  const baseDie = config.options?.customDie || new CONFIG.Dice.D20Die().formula;
  const formula = [baseDie].concat(config.parts ?? []).join(" + ");
  config.options.target ??= process.target;
  return new this(formula, config.data, config.options);
}

/* -------------------------------------------- */

/**
 * Wrapper for configuring modifiers to support custom dice.
 * @param {Function} wrapped The original function
 */
function configureModifiersPatch(wrapped) {
  if ( this.options.customDie ) this.d20.options.customDie = this.options.customDie;

  wrapped();
}

/* -------------------------------------------- */

/**
 * Override the validD20Roll method to support custom dice.
 * @returns {boolean} Whether the roll is valid
 */
function validD20RollPatch() {
  return !!this.options.customDie || ((this.d20 instanceof CONFIG.Dice.D20Die) && this.d20.isValid);
}
