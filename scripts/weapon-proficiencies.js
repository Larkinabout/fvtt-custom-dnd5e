import { CONSTANTS } from "./constants.js";
import {
  c5eLoadTemplates,
  checkEmpty,
  getDefaultDnd5eConfig,
  getSetting,
  registerMenu,
  registerSetting,
  resetDnd5eConfig,
  resetSetting } from "./utils.js";
import { WeaponProficienciesForm } from "./forms/weapon-proficiencies-form.js";

const constants = CONSTANTS.WEAPON_PROFICIENCIES;

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

/**
 * Register settings,
 */
function registerSettings() {
  registerMenu(
    constants.MENU.KEY,
    {
      hint: game.i18n.localize(constants.MENU.HINT),
      label: game.i18n.localize(constants.MENU.LABEL),
      name: game.i18n.localize(constants.MENU.NAME),
      icon: constants.MENU.ICON,
      type: WeaponProficienciesForm,
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
      default: getSettingDefault()
    }
  );
}

/* -------------------------------------------- */

/**
 * Get setting default.
 * @returns {object} The setting
 */
export function getSettingDefault() {
  return buildData(CONFIG.CUSTOM_DND5E);
}

/* -------------------------------------------- */

/**
 * Reset config and setting to their default values.
 */
export async function resetConfigSetting() {
  await resetDnd5eConfig("weaponProficiencies");
  await resetDnd5eConfig("weaponProficienciesMap");
  await resetDnd5eConfig("weaponTypes");
  await resetSetting(constants.SETTING.CONFIG.KEY);
}

/* -------------------------------------------- */

/**
 * Build setting data.
 * @param {object} config The config data
 * @returns {object} The setting data
 */
function buildData(config) {
  const data = {};

  Object.entries(config.weaponProficiencies).forEach(([key, value]) => {
    data[key] = { label: value };
  });

  Object.entries(config.weaponTypes).forEach(([key, value]) => {
    const map = config.weaponProficienciesMap[key];

    if ( map ) {
      if ( !foundry.utils.hasProperty(data[map], "children") ) {
        data[map].children = {};
      }
      data[map].children[key] = value;
    } else {
      data[key] = { label: value };
    }
  });

  return data;
}

/* -------------------------------------------- */

/**
 * Set CONFIG.DND5E.weaponProficiencies, CONFIG.DND5E.weaponProficienciesMap and CONFIG.DND5E.weaponTypes
 * @param {object} [settingData=null] The setting data
 * @returns {void}
 */
export function setConfig(settingData = null) {
  if ( !getSetting(constants.SETTING.ENABLE.KEY) ) return;
  const properties = ["weaponProficiencies", "weaponProficienciesMap", "weaponTypes"];
  if ( checkEmpty(settingData) ) return handleEmptyData(properties);

  // Initialise the config object
  const config = {
    weaponProficiencies: {},
    weaponProficienciesMap: {},
    weaponTypes: {}
  };

  // Populate config
  Object.entries(settingData)
    .filter(([_, value]) => value.visible || value.visible === undefined)
    .forEach(([key, value]) => {
      const localisedLabel = game.i18n.localize(value.label ?? value);

      if ( Object.keys(value.children ?? {}).length ) {
        config.weaponProficiencies[key] = localisedLabel;

        Object.entries(value.children).forEach(([childKey, childValue]) => {
          config.weaponProficienciesMap[childKey] = key;
          config.weaponTypes[childKey] = game.i18n.localize(childValue.label ?? childValue);
        });
      } else {
        config.weaponTypes[key] = localisedLabel;
      }
    });

  // Apply the config to CONFIG.DND5E
  properties.forEach(property => {
    const hookLabel = property.charAt(0).toUpperCase() + property.slice(1);
    Hooks.callAll(`customDnd5e.set${hookLabel}Config`, config[property]);

    if ( Object.keys(config[property]).length ) {
      CONFIG.DND5E[property] = config[property];
    }
  });
}

/* -------------------------------------------- */

/**
 * Handle empty data.
 * @param {string[]} properties The properties
 */
function handleEmptyData(properties) {
  properties.forEach(property => {
    if ( checkEmpty(CONFIG.DND5E[property]) ) {
      resetDnd5eConfig(property);
    }
  });
}
