import { CONSTANTS, MODULE } from "../constants.js";
import { getDieParts, getSetting } from "../utils.js";

const ROLL_MODES = ["publicroll", "gmroll", "blindroll", "selfroll"];

/**
 * Patch initiative rolled from the combat tracker so the Configure Rolls initiative die and roll mode apply.
 */
export function patchInitiativeRoll() {
  if ( hasCustomInitiativeDie() ) {
    libWrapper.register(
      MODULE.ID,
      "CONFIG.Actor.documentClass.prototype.getInitiativeRollConfig",
      getInitiativeRollConfigPatch,
      "WRAPPER"
    );
    libWrapper.register(
      MODULE.ID,
      "CONFIG.Actor.documentClass.prototype.getInitiativeRoll",
      getInitiativeRollPatch,
      "WRAPPER"
    );
  }

  if ( hasCustomInitiativeRollMode() ) {
    libWrapper.register(
      MODULE.ID,
      "CONFIG.Combat.documentClass.prototype.rollInitiative",
      rollInitiativePatch,
      "WRAPPER"
    );
  }
}

/* -------------------------------------------- */

/**
 * Get the configured initiative roll settings.
 * @returns {{ die: string, rollMode: string }|null} Initiative roll settings, if any
 */
function getInitiativeSettings() {
  return getSetting(CONSTANTS.ROLLS.SETTING.ROLLS.KEY)?.initiative ?? null;
}

/* -------------------------------------------- */

/**
 * Whether a custom initiative die is configured.
 * @returns {boolean} Whether a custom initiative die is configured
 */
function hasCustomInitiativeDie() {
  const die = getInitiativeSettings()?.die;
  return !!getDieParts(die) && die !== "1d20";
}

/* -------------------------------------------- */

/**
 * Whether a specific initiative roll mode is configured.
 * @returns {boolean} Whether a specific initiative roll mode is configured
 */
function hasCustomInitiativeRollMode() {
  return ROLL_MODES.includes(getInitiativeSettings()?.rollMode);
}

/* -------------------------------------------- */

/**
 * Add the custom initiative die and its critical thresholds to the roll configuration.
 * @param {Function} wrapped
 * @param {object} [options] Roll options
 * @returns {object|null} Roll configuration
 */
function getInitiativeRollConfigPatch(wrapped, options = {}) {
  const config = wrapped(options);
  if ( !config ) return config;

  const initiative = getInitiativeSettings();
  const dieParts = getDieParts(initiative?.die);
  if ( !dieParts || initiative.die === "1d20" ) return config;

  config.options ??= {};
  config.options.customDie ??= initiative.die;
  config.options.criticalSuccess ??= dieParts.number * dieParts.faces;
  config.options.criticalFailure ??= dieParts.number;
  return config;
}

/* -------------------------------------------- */

/**
 * Rebuild the initiative roll with the custom die when one is configured.
 * @param {Function} wrapped
 * @param {object} [options] Roll options
 * @returns {Roll|null} Initiative roll
 */
function getInitiativeRollPatch(wrapped, options = {}) {
  const roll = wrapped(options);
  if ( this._cachedInitiativeRoll || !(roll instanceof CONFIG.Dice.D20Roll) ) return roll;

  const config = this.getInitiativeRollConfig(options);
  const customDie = config?.options?.customDie;
  if ( !customDie || config.options.fixed !== undefined ) return roll;

  const formula = [customDie].concat(config.parts ?? []).join(" + ");
  return new CONFIG.Dice.D20Roll(formula, config.data, config.options);
}

/* -------------------------------------------- */

/**
 * Apply the configured initiative roll mode to initiative rolled from the combat tracker.
 * @param {Function} wrapped
 * @param {string|string[]} ids Combatant ids
 * @param {object} [options] Roll options
 * @returns {Promise<Combat>} Combat
 */
function rollInitiativePatch(wrapped, ids, options = {}) {
  const rollMode = getInitiativeSettings()?.rollMode;
  const hasExplicitMode = options.messageMode !== undefined || options.messageOptions?.rollMode !== undefined;
  if ( !ROLL_MODES.includes(rollMode) || hasExplicitMode ) return wrapped(ids, options);

  const combatantIds = typeof ids === "string" ? [ids] : ids;
  const anyHidden = combatantIds.some(id => this.combatants.get(id)?.hidden);
  if ( rollMode === "publicroll" && anyHidden ) return wrapped(ids, options);

  const messageMode = foundry.dice.Roll._mapLegacyRollMode(rollMode);
  return wrapped(ids, { ...options, messageMode });
}
