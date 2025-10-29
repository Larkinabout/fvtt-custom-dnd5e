import { CONSTANTS } from "../constants.js";
import {
  checkEmpty,
  getDefaultDnd5eConfig,
  getSetting,
  registerMenu,
  registerSetting,
  resetDnd5eConfig,
  resetSetting } from "../utils.js";
import { FeatureTypesForm } from "../forms/config-form.js";

const constants = CONSTANTS.FEATURE_TYPES;
const configKey = "featureTypes";

/**
 * Register settings.
 */
export function register() {
  registerSettings();
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
      type: FeatureTypesForm,
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
 * Set CONFIG.DND5E.featureTypes.
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

  Hooks.callAll("customDnd5e.setFeatureTypesConfig", configData);

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
 * @param {boolean} [isSubtype=false] Whether the data is a subtype
 * @returns {object} The config data
 */
function buildConfig(settingData, isSubtype = false) {
  return Object.fromEntries(
    Object.keys(settingData)
      .filter(key => settingData[key].visible || settingData[key].visible === undefined)
      .map(key => [key, buildConfigEntry(settingData[key], isSubtype)])
  );
}

/* -------------------------------------------- */

/**
 * Build config entry.
 * @param {object} data The data
 * @param {boolean} [isSubtype=false] Whether the data is a subtype
 * @returns {object} The config entry
 */
function buildConfigEntry(data, isSubtype = false) {
  if ( isSubtype ) {
    return game.i18n.localize(data.label || data);
  } else {
    return {
      label: game.i18n.localize(data.label || data),
      ...(data.subtypes !== undefined && {
        subtypes: buildConfig(data.subtypes, true)
      })
    };
  }
}
