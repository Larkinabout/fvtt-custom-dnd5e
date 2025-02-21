import { CONSTANTS } from "./constants.js";
import {
  c5eLoadTemplates,
  checkEmpty,
  registerMenu,
  getSetting,
  registerSetting,
  getDefaultDnd5eConfig,
  resetDnd5eConfig } from "./utils.js";
import { ActivationCostsForm } from "./forms/config-form.js";

const constants = CONSTANTS.ACTIVATION_COSTS;
const configKey = "activityActivationTypes";

/**
 * Register settings and load templates.
 */
export function register() {
  if ( !foundry.utils.isNewerVersion(game.dnd5e.version, "3.3.1") ) return;

  registerSettings();

  const templates = [
    constants.TEMPLATE.EDIT
  ];
  c5eLoadTemplates(templates);
}

/* -------------------------------------------- */

/**
 * Register settings
 */
function registerSettings() {
  registerMenu(
    constants.MENU.KEY,
    {
      hint: game.i18n.localize(constants.MENU.HINT),
      label: game.i18n.localize(constants.MENU.LABEL),
      name: game.i18n.localize(constants.MENU.NAME),
      icon: constants.MENU.ICON,
      type: ActivationCostsForm,
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
      default: true
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
 * @returns {object} The config
 */
export function getDefaultConfig(key = null) {
  return getDefaultDnd5eConfig(configKey, key);
}

/* -------------------------------------------- */

/**
 * Set CONFIG.DND5E.activityActivationTypes
 * @param {object} [data=null] The activation types data.
 */
export function setConfig(data = null) {
  if ( !getSetting(constants.SETTING.ENABLE.KEY) ) return;
  if ( checkEmpty(data) ) {
    if ( checkEmpty(CONFIG.DND5E[configKey]) ) {
      resetDnd5eConfig(configKey);
    }
    return;
  }

  const buildConfig = (keys, data) => Object.fromEntries(
    keys.filter(key => data[key].visible || data[key].visible === undefined)
      .map(key => [
        key,
        {
          ...(data[key].group !== undefined && { group: data[key].group }),
          label: game.i18n.localize(data[key].label),
          ...(data[key].scalar !== undefined && { scalar: data[key].scalar })
        }
      ])
  );

  const defaultConfig = foundry.utils.deepClone(CONFIG.CUSTOM_DND5E[configKey]);
  const config = buildConfig(Object.keys(data), foundry.utils.mergeObject(defaultConfig, data));

  if ( config ) {
    CONFIG.DND5E[configKey] = config;
  }
}
