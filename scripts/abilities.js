import { CONSTANTS } from "./constants.js";
import { c5eLoadTemplates, checkEmpty, registerMenu, registerSetting, resetDnd5eConfig } from "./utils.js";
import { AbilitiesForm } from "./forms/config-form.js";

const constants = CONSTANTS.ABILITIES;
const property = "abilities";

/**
 * Register settings and load templates.
 */
export function register() {
  registerSettings();

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
      type: AbilitiesForm,
      restricted: true,
      scope: "world"
    }
  );

  registerSetting(
    constants.SETTING.KEY,
    {
      scope: "world",
      config: false,
      requiresReload: true,
      type: Object,
      default: foundry.utils.deepClone(CONFIG.CUSTOM_DND5E[property])
    }
  );
}

/* -------------------------------------------- */

/**
 * Set CONFIG.DND5E.abilities.
 * @param {object} [data=null] The abilities data.
 */
export function setConfig(data = null) {
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

  if ( checkEmpty(data) ) {
    if ( checkEmpty(CONFIG.DND5E[property]) ) {
      resetDnd5eConfig(property);
    }
    return;
  }

  const defaultConfig = foundry.utils.deepClone(CONFIG.CUSTOM_DND5E[property]);
  const config = buildConfig(Object.keys(data), foundry.utils.mergeObject(defaultConfig, data));
  if ( config ) {
    CONFIG.DND5E[property] = config;
  }
}
