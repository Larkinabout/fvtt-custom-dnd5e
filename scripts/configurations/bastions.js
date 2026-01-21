import { CONSTANTS, MODULE } from "../constants.js";
import {
  c5eLoadTemplates,
  checkEmpty,
  getSetting,
  registerMenu,
  registerSetting,
  resetDnd5eConfig } from "../utils.js";
import { BastionsForm } from "../forms/bastions-form.js";

const constants = CONSTANTS.BASTIONS;
const configKey = "facilities";

/**
 * Register settings and load templates.
 */
export function register() {
  registerSettings();

  const templates = [
    constants.TEMPLATE.FORM,
    constants.TEMPLATE.SIZES_LIST,
    constants.TEMPLATE.SIZES_EDIT,
    constants.TEMPLATE.TYPES_LIST,
    constants.TEMPLATE.ORDERS_LIST,
    constants.TEMPLATE.ORDERS_EDIT
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
      type: BastionsForm,
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
 * @param {string} [key=null] Optional key to get a specific default value.
 * @returns {object} The config data
 */
export function getSettingDefault(key = null) {
  const config = foundry.utils.deepClone(CONFIG.CUSTOM_DND5E[configKey]) ?? {};

  // Transform types subtypes from strings to objects
  if ( config.types ) {
    for ( const [typeKey, typeValue] of Object.entries(config.types) ) {
      if ( typeValue.subtypes ) {
        const transformedSubtypes = {};
        for ( const [subKey, subValue] of Object.entries(typeValue.subtypes) ) {
          transformedSubtypes[subKey] = typeof subValue === "string"
            ? { label: subValue, visible: true }
            : subValue;
        }
        config.types[typeKey].subtypes = transformedSubtypes;
      }
    }
  }

  if ( key ) {
    return foundry.utils.getProperty(config, key);
  }

  return config;
}

/* -------------------------------------------- */

/**
 * Reset config and setting to their default values.
 */
export async function resetConfigSetting() {
  await resetDnd5eConfig(configKey);
  await game.settings.set(MODULE.ID, constants.SETTING.CONFIG.KEY, getSettingDefault());
}

/* -------------------------------------------- */

/**
 * Set CONFIG.DND5E.facilities
 * @param {object} [settingData=null] The setting data
 * @returns {void}
 */
export function setConfig(settingData = null) {
  if ( !getSetting(constants.SETTING.ENABLE.KEY) ) return;
  if ( checkEmpty(settingData) ) {
    if ( checkEmpty(CONFIG.DND5E[configKey]) ) {
      resetDnd5eConfig(configKey);
    }
    return;
  }

  const defaultConfig = foundry.utils.deepClone(CONFIG.CUSTOM_DND5E[configKey]);
  const config = foundry.utils.mergeObject(defaultConfig, settingData, { overwrite: true });

  if ( config ) {
    // Process sizes
    if ( config.sizes ) {
      config.sizes = Object.fromEntries(
        Object.entries(config.sizes)
          .filter(([_, value]) => value.visible !== false)
          .map(([key, value]) => [key, {
            label: game.i18n.localize(value.label),
            days: value.days,
            squares: value.squares,
            value: value.value
          }])
      );
    }

    // Process orders
    if ( config.orders ) {
      config.orders = Object.fromEntries(
        Object.entries(config.orders)
          .filter(([_, value]) => value.visible !== false)
          .map(([key, value]) => [key, {
            label: game.i18n.localize(value.label),
            icon: value.icon,
            ...(value.duration !== undefined && { duration: value.duration }),
            ...(value.basic !== undefined && { basic: value.basic }),
            ...(value.hidden !== undefined && { hidden: value.hidden })
          }])
      );
    }

    // Process types
    if ( config.types ) {
      config.types = Object.fromEntries(
        Object.entries(config.types)
          .filter(([_, value]) => value.visible !== false)
          .map(([key, value]) => {
            const subtypes = value.subtypes
              ? Object.fromEntries(
                Object.entries(value.subtypes)
                  .filter(([_, subValue]) => {
                    if ( typeof subValue === "string" ) return true;
                    return subValue.visible !== false;
                  })
                  .map(([subKey, subValue]) => [
                    subKey,
                    typeof subValue === "string" ? game.i18n.localize(subValue) : game.i18n.localize(subValue.label)
                  ])
              )
              : {};
            return [key, {
              label: game.i18n.localize(value.label),
              subtypes
            }];
          })
      );
    }

    CONFIG.DND5E[configKey] = config;
  }
}
