import { CONSTANTS } from "./constants.js";
import {
  c5eLoadTemplates,
  checkEmpty,
  getSetting,
  registerMenu,
  registerSetting,
  resetDnd5eConfig,
  resetSetting } from "./utils.js";
import { ItemPropertiesForm } from "./forms/config-form.js";

const constants = CONSTANTS.ITEM_PROPERTIES;
const configKey = "itemProperties";

/**
 * Register settings and load templates.
 */
export function register() {
  registerSettings();

  const templates = [
    constants.TEMPLATE.EDIT
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
      type: ItemPropertiesForm,
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
 * Get default config.
 * @param {string|null} key The key
 * @returns {object} The config
 */
export function getSettingDefault(key = null) {
  const config = foundry.utils.deepClone(CONFIG.CUSTOM_DND5E[configKey]);

  Object.entries(CONFIG.CUSTOM_DND5E.validProperties).forEach(itemType => {
    // Check if instance of Set to ensure valid structure
    if ( itemType[1] instanceof Set ) {
      [...itemType[1]].forEach(property => {
        const itemProperty = config[property];
        if ( itemProperty ) {
          itemProperty[itemType[0]] = true;
        }
      });
    }
  });

  if ( key ) {
    return config[key];
  } else {
    return config;
  }
}

/* -------------------------------------------- */

/**
 * Reset config and setting to their default values.
 */
export async function resetConfigSetting() {
  await resetDnd5eConfig(configKey);
  await resetDnd5eConfig("validProperties");
  await resetSetting(constants.SETTING.CONFIG.KEY);
}

/* -------------------------------------------- */

/**
 * Set CONFIG.DND5E.itemProperties and CONFIG.DND5E.validProperties.
 * @param {object} [settingData=null] The setting data
 * @returns {void}
 */
export function setConfig(settingData = null) {
  if ( !getSetting(constants.SETTING.ENABLE.KEY) ) return;
  if ( checkEmpty(settingData) ) return handleEmptyData();

  // Include item properties added by other modules
  Object.entries(CONFIG.DND5E[configKey]).forEach(([id, value]) => {
    if ( !settingData[id] ) {
      settingData[id] = foundry.utils.deepClone(value);
      itemTypes.forEach(itemType => {
        if ( CONFIG.DND5E.validProperties[itemType].has(id) ) {
          settingData[id][itemType] = true;
        }
      });
    }
  });

  const mergedSettingData = foundry.utils.mergeObject(
    foundry.utils.mergeObject(settingData, CONFIG.DND5E[configKey], { overwrite: false }),
    getSettingDefault(),
    { overwrite: false }
  );

  const itemPropertiesConfigData = buildItemPropertiesConfig(mergedSettingData);

  Hooks.callAll("customDnd5e.setItemPropertiesConfig", itemPropertiesConfigData);

  if ( itemPropertiesConfigData ) {
    CONFIG.DND5E[configKey] = itemPropertiesConfigData;
  }

  setValidProperties(mergedSettingData);
}

/* -------------------------------------------- */

/**
 * Handle empty data.
 */
function handleEmptyData() {
  if ( checkEmpty(CONFIG.DND5E[configKey]) ) {
    resetDnd5eConfig(configKey);
  }
  if ( checkEmpty(CONFIG.DND5E.validProperties) ) {
    resetDnd5eConfig("validProperties");
  }
}

/* -------------------------------------------- */

/**
 * Build config.
 * @param {object} settingData The setting data
 * @returns {object} The config data
 */
function buildItemPropertiesConfig(settingData) {
  return Object.fromEntries(
    Object.keys(settingData)
      .filter(key => settingData[key].visible || settingData[key].visible === undefined)
      .map(key => [key, buildItemPropertiesConfigEntry(settingData[key])])
  );
}

/* -------------------------------------------- */

/**
 * Build config entry.
 * @param {object} data The data
 * @returns {object} The config entry
 */
function buildItemPropertiesConfigEntry(data) {
  return {
    ...(data.abbreviation !== undefined && { abbreviation: game.i18n.localize(data.abbreviation) }),
    ...(data.icon !== undefined && { icon: data.icon }),
    ...(data.isPhysical !== undefined && { isPhysical: data.isPhysical }),
    ...(data.isTag !== undefined && { isTag: data.isTag }),
    label: game.i18n.localize(data.label),
    ...(data.reference !== undefined && { reference: data.reference })
  };
}

/**
 * Set valid item properties.
 * @param {object} settingData The setting data
 */
function setValidProperties(settingData) {
  const itemTypesSet = new Set(
    Object.keys(CONFIG.CUSTOM_DND5E.validProperties),
    Object.keys(CONFIG.DND5E.validProperties)
  );
  const itemTypes = [...itemTypesSet];

  const validProperties = {};

  Object.entries(CONFIG.CUSTOM_DND5E.validProperties).forEach(property => {
    validProperties[property[0]] = new Set([...property[1]]);
  });

  Object.entries(settingData).forEach(([key, value]) => {
    itemTypes.forEach(itemType => {
      if ( value[itemType] && (value.visible || typeof value.visible === "undefined") ) {
        validProperties[itemType].add(key);
      } else {
        validProperties[itemType].delete(key);
      }
    });
  });

  CONFIG.DND5E.validProperties = (checkEmpty(validProperties))
    ? foundry.utils.deepClone(CONFIG.CUSTOM_DND5E.validProperties)
    : validProperties;
}
