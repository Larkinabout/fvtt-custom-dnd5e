import { CONSTANTS } from "../constants.js";
import { c5eLoadTemplates,
  checkEmpty,
  getSetting,
  registerMenu,
  registerSetting,
  resetDnd5eConfig,
  resetSetting } from "../utils.js";
import { ArmorProficienciesForm } from "../forms/armor-proficiencies-form.js";

const constants = CONSTANTS.ARMOR_PROFICIENCIES;

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
      type: ArmorProficienciesForm,
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
 * Get setting default.
 *
 * @returns {object} The setting data.
 */
export function getSettingDefault() {
  return buildConfigSetting(CONFIG.CUSTOM_DND5E);
}

/* -------------------------------------------- */

/**
 * Build setting data.
 * @param {object} config The config data.
 * @returns {object} The setting data.
 */
function buildConfigSetting(config) {
  const data = {};

  Object.entries(config.armorProficiencies).forEach(([key, value]) => {
    data[key] = { label: value };
  });

  Object.entries(config.armorTypes).forEach(([key, value]) => {
    const map = config.armorProficienciesMap[key];

    // For some reason, armorProficienciesMap contains both keys and booleans
    if ( map && map !== true ) {
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
 * Reset config and setting to their default values.
 */
export async function resetConfigSetting() {
  await resetDnd5eConfig(configKey);
  await resetSetting(constants.SETTING.CONFIG.KEY);
}

/* -------------------------------------------- */

/**
 * Set CONFIG.DND5E.armorProficiencies, CONFIG.DND5E.armorProficienciesMap, and CONFIG.DND5E.armorTypes.
 * @param {object} [data=null] The armor proficiencies data.
 * @returns {void}
 */
export function setConfig(data = null) {
  if ( !getSetting(constants.SETTING.ENABLE.KEY) ) return;
  const properties = ["armorProficiencies", "armorProficienciesMap", "armorTypes"];
  if ( checkEmpty(data) ) return handleEmptyData(properties);

  // Initialise the config object
  const config = {
    armorProficiencies: {},
    armorProficienciesMap: {},
    armorTypes: {}
  };

  // Populate config
  Object.entries(data)
    .filter(([_, value]) => value.visible || value.visible === undefined)
    .forEach(([key, value]) => {
      const label = game.i18n.localize(value.label ?? value);
      const children = value.children ?? {};

      if ( Object.keys(children).length ) {
        config.armorProficiencies[key] = label;

        Object.entries(children).forEach(([childKey, childValue]) => {
          config.armorProficienciesMap[childKey] = key;
          config.armorTypes[childKey] = game.i18n.localize(childValue.label ?? childValue);
        });
      } else {
        config.armorTypes[key] = label;
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
 * @param {string[]} properties The properties to check.
 */
function handleEmptyData(properties) {
  properties.forEach(property => {
    if ( checkEmpty(CONFIG.DND5E[property]) ) {
      resetDnd5eConfig(property);
    }
  });
}
