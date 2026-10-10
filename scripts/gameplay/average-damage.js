import { CONSTANTS } from "../constants.js";
import { getSetting, registerSetting } from "../utils.js";

const constants = CONSTANTS.AVERAGE_DAMAGE;

/* -------------------------------------------- */

/**
 * Register setting and hooks.
 */
export function register() {
  registerSettings();
  registerHooks();
}

/* -------------------------------------------- */

/**
 * Register hooks.
 */
function registerHooks() {
  Hooks.on("dnd5e.preRollDamageV2", skipDamageDialog);
  Hooks.on("dnd5e.postDamageRollConfiguration", applyAverageDamage);
  Hooks.on("renderDamageRollConfigurationDialog", showAverageDamageInDialog);
}

/* -------------------------------------------- */

/**
 * Register settings.
 */
function registerSettings() {
  registerSetting(
    constants.SETTING.USE.KEY,
    {
      scope: "world",
      config: false,
      type: String,
      default: "neither"
    }
  );

  registerSetting(
    constants.SETTING.SHOW_DIALOG.KEY,
    {
      scope: "world",
      config: false,
      type: Boolean,
      default: false
    }
  );
}

/* -------------------------------------------- */

/**
 * Whether to use average damage.
 * @param {object} config
 * @returns {boolean}
 */
function useAverageDamage(config) {
  const activity = config.subject;
  if ( !activity ) return false;
  const useAverageDamage = getSetting(constants.SETTING.USE.KEY);
  if ( activity.actor?.type !== useAverageDamage && useAverageDamage !== "both" ) return false;
  if ( canvas.tokens.controlled.length >= 4 && getSetting(CONSTANTS.MOB_DAMAGE.SETTING.ENABLE.KEY) ) return false;
  return true;
}

/* -------------------------------------------- */

/**
 * Skip the damage roll dialog for average damage unless the Show Damage Roll Dialog setting is on.
 * @param {object} config
 * @param {object} dialog
 */
function skipDamageDialog(config, dialog) {
  if ( !useAverageDamage(config) ) return;
  if ( getSetting(constants.SETTING.SHOW_DIALOG.KEY) ) return;
  dialog.configure ??= false;
}

/* -------------------------------------------- */

/**
 * Replace each damage roll with its average before it is rolled.
 * @param {DamageRoll[]} rolls
 * @param {object} config
 */
function applyAverageDamage(rolls, config) {
  if ( !useAverageDamage(config) ) return;

  for ( const roll of rolls ) {
    roll.terms = [new foundry.dice.terms.NumericTerm({ number: getAverageDamage(roll) })];
    roll.resetFormula();
  }
}

/* -------------------------------------------- */

/**
 * Show the average damage in the damage roll dialog.
 * @param {ApplicationV2} app
 * @param {HTMLElement} html
 */
function showAverageDamageInDialog(app, html) {
  if ( !useAverageDamage(app.config) ) return;

  html.querySelector(".rolls .dice")?.replaceChildren();
  html.querySelectorAll(".rolls .formulas .formula").forEach((formula, index) => {
    const roll = app.rolls[index];
    if ( roll ) formula.textContent = getAverageDamage(roll);
  });
}

/* -------------------------------------------- */

/**
 * Get the average of a damage roll.
 * @param {DamageRoll} roll
 * @returns {number} Average damage
 */
function getAverageDamage(roll) {
  const formula = dnd5e.dice.simplifyRollFormula(roll.formula);
  const min = Roll.create(formula).evaluateSync({ minimize: true }).total;
  const max = Roll.create(formula).evaluateSync({ maximize: true }).total;
  return Math.floor((min + max) / 2);
}
