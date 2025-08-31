import { CONSTANTS } from "../constants.js";
import {
  c5eLoadTemplates,
  checkEmpty,
  getSetting,
  registerMenu,
  registerSetting,
  getDefaultDnd5eConfig,
  resetDnd5eConfig,
  resetSetting } from "../utils.js";
import { SkillsForm } from "../forms/config-form.js";

const constants = CONSTANTS.SKILLS;
const configKey = "skills";

/**
 * Register settings and load templates.
 */
export function register() {
  registerSettings();

  const templates = [
    constants.TEMPLATE.EDIT
  ];
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
      type: SkillsForm,
      restricted: true,
      scope: "world"
    }
  );

  registerSetting(
    constants.SETTING.ENABLE.KEY,
    {
      scope: "world",
      config: false,
      requiresReload: true,
      type: Boolean,
      default: false
    }
  );

  registerSetting(
    constants.SETTING.CONFIG.KEY,
    {
      scope: "world",
      config: false,
      requiresReload: true,
      type: Object,
      default: getSettingDefault()
    }
  );
}

/* -------------------------------------------- */

/**
 * Get default config.
 * @param {string|null} key The key
 * @returns {object} The config
 */
export function getSettingDefault(key = null) {
  return getDefaultDnd5eConfig(configKey, key);
}

/* -------------------------------------------- */

/**
 * Reset config and setting to their default values.
 */
export async function resetConfigSetting() {
  await resetDnd5eConfig(configKey);
  await resetSetting(constants.SETTING.CONFIG.KEY);
}

/* -------------------------------------------- */

/**
 * Set CONFIG.DND5E.skills.
 * @param {object} [settingData=null] The setting data
 * @returns {void}
 */
export function setConfig(settingData = null) {
  if ( !getSetting(constants.SETTING.ENABLE.KEY) ) return;
  if ( checkEmpty(settingData) ) return handleEmptyData();

  const mergedSettingData = foundry.utils.mergeObject(
    foundry.utils.mergeObject(settingData, CONFIG.DND5E[configKey], { overwrite: false }),
    getSettingDefault(),
    { overwrite: false }
  );

  const configData = buildConfig(mergedSettingData);

  Hooks.callAll("customDnd5e.setSkillsConfig", configData);

  if ( configData ) {
    CONFIG.DND5E[configKey] = configData;
  }
}


/* -------------------------------------------- */

/**
 * Handle empty data.
 */
function handleEmptyData() {
  if ( checkEmpty(CONFIG.DND5E[configKey]) ) {
    resetDnd5eConfig(configKey);
  }
}

/* -------------------------------------------- */

/**
 * Build config.
 * @param {object} settingData The setting data
 * @returns {object} The config data
 */
function buildConfig(settingData) {
  return Object.fromEntries(
    Object.keys(settingData)
      .filter(key => settingData[key].visible || settingData[key].visible === undefined)
      .map(key => [key, buildConfigEntry(settingData[key])])
  );
}

/* -------------------------------------------- */

/**
 * Build config entry.
 * @param {object} data The data
 * @returns {object} The config entry
 */
function buildConfigEntry(data) {
  return {
    ability: data.ability,
    fullKey: data.fullKey,
    icon: data.icon,
    label: game.i18n.localize(data.label),
    reference: data.reference,
    rollMode: data.rollMode ?? "default"
  };
}

