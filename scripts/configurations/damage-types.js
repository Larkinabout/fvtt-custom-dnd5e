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
import { DamageTypesForm } from "../forms/config-form.js";

const constants = CONSTANTS.DAMAGE_TYPES;
const configKey = "damageTypes";

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
      type: DamageTypesForm,
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
      type: Object,
      default: CONFIG.CUSTOM_DND5E[configKey]
    }
  );
}

/* -------------------------------------------- */

/**
 * Get default config.
 * @param {string|null} key The key
 * @returns {object} The config data
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
 * Set CONFIG.DND5E.damageTypes.
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

  Hooks.callAll("customDnd5e.setDamageTypesConfig", configData);

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
    color: data.color,
    icon: data.icon,
    ...(data.isPhysical !== undefined && { isPhysical: data.isPhysical }),
    label: game.i18n.localize(data.label),
    reference: data.reference
  };
}

