import { CONSTANTS } from "./constants.js";
import { checkEmpty, registerMenu, registerSetting, resetDnd5eConfig } from "./utils.js";
import { ConsumableTypesForm } from "./forms/config-form.js";

const constants = CONSTANTS.CONSUMABLE_TYPES;
const property = "consumableTypes";

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
      type: ConsumableTypesForm,
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
 * Set CONFIG.DND5E.CONSUMABLE_TYPES.
 * @param {object} data The data
 */
export function setConfig(data = null) {
  if ( checkEmpty(data) ) {
    if ( checkEmpty(CONFIG.DND5E[property]) ) {
      resetDnd5eConfig(property);
    }
    return;
  }

  const buildConfig = (keys, data, isSubtype = false) => Object.fromEntries(
    keys.filter(key => data[key].visible || data[key].visible === undefined)
      .map(key => [
        key,
        isSubtype
          ? game.i18n.localize(data[key]?.label || data[key])
          : {
            label: game.i18n.localize(data[key].label),
            ...(data[key].subtypes !== undefined && {
              subtypes: buildConfig(Object.keys(data[key].subtypes), data[key].subtypes, true)
            })
          }
      ])
  );

  const defaultConfig = foundry.utils.deepClone(CONFIG.CUSTOM_DND5E[property]);
  const config = buildConfig(Object.keys(data), foundry.utils.mergeObject(defaultConfig, data));

  if ( config ) {
    CONFIG.DND5E[property] = config;
  }
}
