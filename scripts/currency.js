import { CONSTANTS, SHEET_TYPE } from "./constants.js";
import { c5eLoadTemplates, checkEmpty, getSetting, registerMenu, registerSetting, resetDnd5eConfig } from "./utils.js";
import { CurrencyForm } from "./forms/config-form.js";

const constants = CONSTANTS.CURRENCY;
const property = "currencies";

/**
 * Register settings and hooks, and load templates.
 */
export function register() {
  registerSettings();
  registerHooks();

  const templates = [
    constants.TEMPLATE.FORM,
    constants.TEMPLATE.LIST
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
    constants.SETTING.KEY,
    {
      scope: "world",
      config: false,
      type: Object,
      default: foundry.utils.deepClone(CONFIG.CUSTOM_DND5E[property])
    }
  );
}

/* -------------------------------------------- */

/**
 * Register hooks.
 */
function registerHooks() {
  Hooks.on("renderCurrencyManager", (app, html, data) => {
    const setting = getSetting(constants.SETTING.KEY);

    Object.entries(setting).forEach(([key, value]) => {
      if ( value.visible === false ) {
        html[0].querySelector(`input[name="amount.${key}"]`)?.closest("label")?.remove();
      }
    });
  });

  Hooks.on("renderActorSheet", (app, html, data) => {
    const sheetType = SHEET_TYPE[app.constructor.name];

    if ( !sheetType ) return;

    const setting = getSetting(constants.SETTING.KEY);

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
 * Set CONFIG.DND5E.currencies.
 * @param {object} data The data
 */
export function setConfig(data = null) {
  if ( checkEmpty(data) ) {
    if ( checkEmpty(CONFIG.DND5E[property]) ) {
      resetDnd5eConfig(property);
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

  const defaultConfig = foundry.utils.deepClone(CONFIG.CUSTOM_DND5E[property]);
  const config = buildConfig(Object.keys(data), foundry.utils.mergeObject(defaultConfig, data));

  if ( config ) {
    CONFIG.DND5E[property] = config;
  }
}
