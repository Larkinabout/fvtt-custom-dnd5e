import { CONSTANTS } from "./constants.js";
import { checkEmpty, registerMenu, registerSetting, resetDnd5eConfig } from "./utils.js";
import { ItemRarityForm } from "./forms/config-form.js";

const property = "itemRarity";

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
    CONSTANTS.ITEM_RARITY.MENU.KEY,
    {
      hint: game.i18n.localize(CONSTANTS.ITEM_RARITY.MENU.HINT),
      label: game.i18n.localize(CONSTANTS.ITEM_RARITY.MENU.LABEL),
      name: game.i18n.localize(CONSTANTS.ITEM_RARITY.MENU.NAME),
      icon: CONSTANTS.ITEM_RARITY.MENU.ICON,
      type: ItemRarityForm,
      restricted: true,
      scope: "world"
    }
  );

  registerSetting(
    CONSTANTS.ITEM_RARITY.SETTING.KEY,
    {
      scope: "world",
      config: false,
      type: Object,
      default: CONFIG.CUSTOM_DND5E[property]
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
    if ( checkEmpty(CONFIG.DND5E[property]) ) {
      resetDnd5eConfig(property);
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

  const defaultConfig = foundry.utils.deepClone(CONFIG.CUSTOM_DND5E[property]);
  const config = buildConfig(Object.keys(data), foundry.utils.mergeObject(defaultConfig, data));

  if ( config ) {
    CONFIG.DND5E[property] = config;
  }
}
