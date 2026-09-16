import { MODULE } from "../constants.js";
import { isCustomRoll } from "../rolls.js";

/**
 * Patch the D20Roll to apply custom roll settings.
 */
export function patchD20Roll() {
  if ( !isCustomRoll() ) return;

  libWrapper.register(MODULE.ID, "CONFIG.Dice.D20Roll.fromConfig", fromConfigPatch, "WRAPPER");
  libWrapper.register(MODULE.ID, "CONFIG.Dice.D20Roll.prototype.configureModifiers", configureModifiersPatch, "WRAPPER");
  libWrapper.register(MODULE.ID, "CONFIG.Dice.D20Roll.prototype.validD20Roll", validD20RollPatch, "OVERRIDE");
}

/* -------------------------------------------- */

/**
 * Wrap the fromConfig method to support custom dice.
 * @param {Function} wrapped
 * @param {object} config 
 * @param {object} process
 * @returns {CONFIG.Dice.D20Roll} Configured D20Roll
 */
function fromConfigPatch(wrapped, config, process) {
  const roll = wrapped(config, process);
  const customDie = config.options?.customDie;
  if ( !customDie ) return roll;

  // Clear so the custom roll configures its own die.
  delete config.options.configured;

  const formula = [customDie].concat(config.parts ?? []).join(" + ");
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
