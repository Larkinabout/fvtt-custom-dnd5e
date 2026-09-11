import { CONSTANTS } from "../constants.js";
import { c5eLoadTemplates, registerMenu, registerSetting } from "../utils.js";
import { ProficiencyBonusForm } from "../forms/proficiency-bonus-form.js";

const constants = CONSTANTS.PROFICIENCY_BONUS;

/* -------------------------------------------- */

/**
 * Register settings and load templates.
 */
export function register() {
  registerSettings();

  const templates = [constants.TEMPLATE.FORM];
  c5eLoadTemplates(templates);
}

/* -------------------------------------------- */

/**
 * Register settings.
 */
function registerSettings() {
  registerMenu(
    constants.MENU.KEY,
    {
      hint: game.i18n.localize(constants.MENU.HINT),
      label: game.i18n.localize(constants.MENU.LABEL),
      name: game.i18n.localize(constants.MENU.NAME),
      icon: constants.MENU.ICON,
      type: ProficiencyBonusForm,
      restricted: true,
      scope: "world"
    }
  );

  for ( const key of [constants.SETTING.CHARACTER_ENABLE.KEY, constants.SETTING.NPC_ENABLE.KEY] ) {
    registerSetting(
      key,
      {
        scope: "world",
        config: false,
        requiresReload: true,
        type: Boolean,
        default: false
      }
    );
  }

  const tables = [
    { key: constants.SETTING.CHARACTER_PROFICIENCY_BONUS.KEY, max: getMaxLevel() },
    { key: constants.SETTING.NPC_PROFICIENCY_BONUS.KEY, max: getMaxChallengeRating() }
  ];

  for ( const { key, max } of tables ) {
    registerSetting(
      key,
      {
        scope: "world",
        config: false,
        type: Object,
        default: getProficiencyBonusTableDefault(max)
      }
    );
  }
}

/* -------------------------------------------- */

/**
 * Get the max level.
 * @returns {number} Max level
 */
export function getMaxLevel() {
  return CONFIG.DND5E?.maxLevel ?? 20;
}

/* -------------------------------------------- */

/**
 * Get the max CR using CR XP levels.
 * @returns {number} Max CR
 */
export function getMaxChallengeRating() {
  return (CONFIG.DND5E?.CR_EXP_LEVELS?.length ?? 31) - 1;
}

/* -------------------------------------------- */

/**
 * Build a default proficiency bonus table using the standard D&D 5e progression.
 * @param {number} max Max level or CR
 * @returns {object} Default proficiency bonus table
 */
export function getProficiencyBonusTableDefault(max) {
  const table = {};
  for ( let level = 1; level <= max; level++ ) {
    table[level] = Math.floor((level + 7) / 4);
  }
  return table;
}

