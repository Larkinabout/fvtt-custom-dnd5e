import { CONSTANTS } from "./constants.js";
import { checkEmpty, registerMenu, registerSetting, resetDnd5eConfig } from "./utils.js";
import { LanguagesForm } from "./forms/config-form.js";

const constants = CONSTANTS.LANGUAGES;
const configKey = "languages";

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
      type: LanguagesForm,
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
      default: foundry.utils.deepClone(CONFIG.CUSTOM_DND5E[configKey])
    }
  );
}

/* -------------------------------------------- */

/**
 * Set CONFIG.DND5E.languages.
 * @param {object} data The data
 */
export function setConfig(data = null) {
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
        data[key].children
          ? { label: game.i18n.localize(data[key].label),
            children: buildConfig(Object.keys(data[key].children), data[key].children) }
          : game.i18n.localize(data[key]?.label || data[key])
      ])
  );

  const coreConfig = foundry.utils.deepClone(CONFIG.CUSTOM_DND5E[configKey]);
  const currentConfig = foundry.utils.deepClone(CONFIG.DND5E[configKey]);
  const mergedConfig = foundry.utils.mergeObject(foundry.utils.mergeObject(coreConfig, currentConfig), data);
  const config = buildConfig(Object.keys(mergedConfig), mergedConfig);

  if ( config ) {
    CONFIG.DND5E[configKey] = config;
  }
}
