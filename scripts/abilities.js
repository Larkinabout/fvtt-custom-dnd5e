import { CONSTANTS } from "./constants.js";
import {
  c5eLoadTemplates,
  checkEmpty,
  registerMenu,
  getSetting,
  registerSetting,
  getDefaultDnd5eConfig,
  resetDnd5eConfig } from "./utils.js";
import { AbilitiesForm } from "./forms/config-form.js";

const constants = CONSTANTS.ABILITIES;
const configKey = "abilities";

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
      type: AbilitiesForm,
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
      requiresReload: true,
      type: Object,
      default: foundry.utils.deepClone(CONFIG.CUSTOM_DND5E[configKey])
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
 * Set CONFIG.DND5E.abilities.
 * @param {object} [data=null] The abilities data.
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
          abbreviation: game.i18n.localize(data[key].abbreviation),
          ...(data[key].defaults !== undefined && { defaults: { ...data[key].defaults } }),
          fullKey: data[key].fullKey,
          ...(data[key].improvement === false && { improvement: data[key].improvement }),
          label: game.i18n.localize(data[key].label),
          reference: data[key].reference,
          rollMode: data[key].rollMode ?? "default",
          type: data[key].type
        }
      ])
  );

  const defaultConfig = foundry.utils.deepClone(CONFIG.CUSTOM_DND5E[configKey]);
  const config = buildConfig(Object.keys(data), foundry.utils.mergeObject(defaultConfig, data));
  if ( config ) {
    CONFIG.DND5E[configKey] = config;
  }
}
