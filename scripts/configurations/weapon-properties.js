import { CONSTANTS } from "../constants.js";
import {
  checkEmpty,
  getDefaultDnd5eConfig,
  getSetting,
  registerMenu,
  registerSetting,
  resetDnd5eConfig,
  resetSetting } from "../utils.js";
import { WeaponPropertiesForm } from "../forms/config-form.js";

const constants = CONSTANTS.WEAPON_PROPERTIES;
const configKey = "weaponProperties";

/**
 * Register settings.
 */
export function register() {
  registerSettings();
}

/**
 * Register Settings
 */
export function registerSettings() {
  registerMenu(
    constants.MENU.KEY,
    {
      hint: game.i18n.localize(constants.MENU.HINT),
      label: game.i18n.localize(constants.MENU.LABEL),
      name: game.i18n.localize(constants.MENU.NAME),
      icon: constants.MENU.ICON,
      type: WeaponPropertiesForm,
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
  setValidProperties(getSetting(constants.SETTING.CONFIG.KEY));
}

/* -------------------------------------------- */

/**
 * Set CONFIG.DND5E.weaponProperties and CONFIG.DND5E.validProperties.weapon
 * @param {object} [settingData=null] The setting data
 * @returns {void}
 */
export function setConfig(settingData) {
  if ( !getSetting(constants.SETTING.ENABLE.KEY) ) return;
  if ( checkEmpty(settingData) ) return handleEmptyData();

  const mergedSettingData = foundry.utils.mergeObject(
    foundry.utils.mergeObject(settingData, CONFIG.DND5E[configKey], { overwrite: false }),
    getSettingDefault(),
    { overwrite: false }
  );

  const configData = buildConfig(mergedSettingData);

  Hooks.callAll("customDnd5e.setWeaponPropertiesConfig", configData);

  if ( configData ) {
    CONFIG.DND5E[configKey] = configData;
  }

  setValidProperties(settingData);
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
  return game.i18n.localize(value.label);
}

/* -------------------------------------------- */

/**
 * Updates CONFIG.DND5E.validProperties.weapon.
 * @param {object} data The data
 * @returns {void}
 */
function setValidProperties(data) {
  CONFIG.DND5E.validProperties.weapon = new Set(Object.keys(data).filter(
    key => data[key].visible || typeof data[key].visible === "undefined"
  ));
}
