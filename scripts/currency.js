import { CONSTANTS, SHEET_TYPE } from "./constants.js";
import {
  c5eLoadTemplates,
  checkEmpty,
  getSetting,
  registerMenu,
  registerSetting,
  getDefaultDnd5eConfig,
  resetDnd5eConfig } from "./utils.js";
import { CurrencyForm } from "./forms/config-form.js";

const constants = CONSTANTS.CURRENCY;
const configKey = "currencies";

/**
 * Register settings and hooks, and load templates.
 */
export function register() {
  registerSettings();
  registerHooks();

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
      type: CurrencyForm,
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
      default: foundry.utils.deepClone(CONFIG.CUSTOM_DND5E[configKey])
    }
  );
}

/* -------------------------------------------- */

/**
 * Register hooks.
 */
function registerHooks() {
  if ( !getSetting(constants.SETTING.ENABLE.KEY) ) return;

  Hooks.on("renderCurrencyManager", (app, html, data) => {
    const setting = getSetting(constants.SETTING.CONFIG.KEY);

    Object.entries(setting).forEach(([key, value]) => {
      if ( value.visible === false ) {
        html[0].querySelector(`input[name="amount.${key}"]`)?.closest("label")?.remove();
      }
    });
  });

  Hooks.on("renderActorSheet", (app, html, data) => {
    const sheetType = SHEET_TYPE[app.constructor.name];

    if ( !sheetType ) return;

    const setting = getSetting(constants.SETTING.CONFIG.KEY);

    if ( !sheetType.legacy ) {
      Object.entries(setting).forEach(([key, value]) => {
        if ( value.visible === false ) {
          html[0].querySelector(`.${key}`)?.closest("label")?.remove();
        }
      });
    }
  });
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
 * Set CONFIG.DND5E.currencies.
 * @param {object} data The data
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
          conversion: data[key].conversion,
          icon: data[key].icon,
          label: game.i18n.localize(data[key].label)
        }
      ])
  );

  const defaultConfig = foundry.utils.deepClone(CONFIG.CUSTOM_DND5E[configKey]);
  const config = buildConfig(Object.keys(data), foundry.utils.mergeObject(defaultConfig, data));

  if ( config ) {
    CONFIG.DND5E[configKey] = config;
  }
}
