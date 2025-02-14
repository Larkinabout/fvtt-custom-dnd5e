import { CONSTANTS } from "./constants.js";
import { c5eLoadTemplates, checkEmpty, registerMenu, registerSetting, resetDnd5eConfig } from "./utils.js";
import { ToolProficienciesForm } from "./forms/tool-proficiencies-form.js";

/**
 * Register settings and load templates.
 */
export function register() {
  registerSettings();

  const templates = [
    CONSTANTS.TOOL_PROFICIENCIES.TEMPLATE.FORM,
    CONSTANTS.TOOL_PROFICIENCIES.TEMPLATE.LIST
  ];
  c5eLoadTemplates(templates);
}

/* -------------------------------------------- */

/**
 * Register settings.
 */
function registerSettings() {
  registerMenu(
    CONSTANTS.TOOL_PROFICIENCIES.MENU.KEY,
    {
      hint: game.i18n.localize(CONSTANTS.TOOL_PROFICIENCIES.MENU.HINT),
      label: game.i18n.localize(CONSTANTS.TOOL_PROFICIENCIES.MENU.LABEL),
      name: game.i18n.localize(CONSTANTS.TOOL_PROFICIENCIES.MENU.NAME),
      icon: CONSTANTS.TOOL_PROFICIENCIES.MENU.ICON,
      type: ToolProficienciesForm,
      restricted: true,
      scope: "world"
    }
  );

  registerSetting(
    CONSTANTS.TOOL_PROFICIENCIES.SETTING.KEY,
    {
      scope: "world",
      config: false,
      type: Object,
      default: getDefault()
    }
  );
}

/* -------------------------------------------- */

/**
 * Get dnd5e config
 *
 * @returns {object} The tool proficiencies and tool types
 */
export function getDnd5eConfig() {
  return buildData(CONFIG.CUSTOM_DND5E);
}

/* -------------------------------------------- */

/**
 * Get setting default
 * @returns {object} The setting
 */
function getDefault() {
  return buildData(CONFIG.DND5E);
}

/* -------------------------------------------- */

/**
 * Build setting data
 * @param {object} config The config data
 * @returns {object} The setting data
 */
function buildData(config) {
  const data = {};

  Object.entries(config.toolProficiencies).forEach(([key, value]) => {
    data[key] = { label: value, children: {} };
  });

  Object.entries(config.toolTypes).forEach(([key, value]) => {
    if ( data[key] ) {
      data[key].children[key] = value;
    } else {
      data[key] = { label: value, children: {} };
    }
  });

  return data;
}

/* -------------------------------------------- */

/**
 * Set CONFIG.DND5E.toolProficiencies and CONFIG.DND5E.toolTypes.
 * @param {object} data The data
 */
export function setConfig(data = null) {
  const properties = ["toolProficiencies", "toolTypes"];

  // Initialise the config object
  const config = {
    toolProficiencies: {},
    toolTypes: {}
  };

  // Exit if data is empty and reset config
  if ( checkEmpty(data) ) {
    properties.forEach(property => {
      if ( checkEmpty(CONFIG.DND5E[property]) ) {
        resetDnd5eConfig(property);
      }
    });
    return;
  }

  // Populate config
  Object.entries(data)
    .filter(([_, value]) => value.visible || value.visible === undefined)
    .forEach(([key, value]) => {
      const localisedLabel = game.i18n.localize(value.label ?? value);

      config.toolProficiencies[key] = localisedLabel;

      if ( value.children ) {
        Object.entries(value.children).forEach(([childKey, childValue]) => {
          config.toolTypes[childKey] = game.i18n.localize(childValue.label ?? childValue);
        });
      }
    });

  // Apply the config to CONFIG.DND5E
  properties.forEach(property => {
    if ( Object.keys(config[property]).length ) {
      CONFIG.DND5E[property] = config[property];
    }
  });
}
