import { CONSTANTS } from "./constants.js";
import { checkEmpty, registerMenu, registerSetting, resetDnd5eConfig } from "./utils.js";
import { ItemRarityForm } from "./forms/config-form.js";

const constants = CONSTANTS.ITEM_RARITY;
const configKey = "itemRarity";

/**
 * Register settings and hooks.
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
      type: ItemRarityForm,
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
      default: CONFIG.CUSTOM_DND5E[configKey]
    }
  );
}

/* -------------------------------------------- */

/**
 * Set CONFIG.DND5E.itemRarity.
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
        game.i18n.localize(data[key].label || data[key])
      ])
  );

  const defaultConfig = foundry.utils.deepClone(CONFIG.CUSTOM_DND5E[configKey]);
  const config = buildConfig(Object.keys(data), foundry.utils.mergeObject(defaultConfig, data));

  if ( config ) {
    CONFIG.DND5E[configKey] = config;
  }
}
