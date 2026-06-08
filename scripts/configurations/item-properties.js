import {
  checkEmpty,
  getSetting,
  registerMenu,
  registerSetting,
  resetDnd5eConfig,
  resetSetting } from "../utils.js";
import { MODULE } from "../constants.js";
import { ConfigForm } from "../forms/config-form.js";
import { ConfigEditForm } from "../forms/config-edit-form.js";
import { configs } from "./registry.js";

/* -------------------------------------------- */
/*  CONSTANTS                                   */
/* -------------------------------------------- */

export const constants = {
  ID: "itemProperties",
  MENU: {
    KEY: "item-properties-menu",
    HINT: "CUSTOM_DND5E.menu.itemProperties.hint",
    ICON: "fas fa-sparkles",
    LABEL: "CUSTOM_DND5E.menu.itemProperties.label",
    NAME: "CUSTOM_DND5E.menu.itemProperties.name"
  },
  SETTING: {
    ENABLE: {
      KEY: "enable-item-properties"
    },
    CONFIG: {
      KEY: "item-properties"
    }
  },
  UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.B48iqFBddUikMMer.JournalEntryPage.dM6sUm93mUi9oeBo"
};
export const configKey = "itemProperties";
export const configKeys = ["itemProperties", "validProperties"];

/* -------------------------------------------- */
/*  FORM CLASSES                                */
/* -------------------------------------------- */

/**
 * Per-item-property edit form.
 * @extends ConfigEditForm
 */
class ItemPropertiesEditForm extends ConfigEditForm {
  /**
   * @param {object} args
   */
  constructor(args) {
    super(args);
    this.config = configs.itemProperties;
    this.requiresReload = true;
  }

  /* -------------------------------------------- */

  /**
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-item-properties-edit-form`,
    window: {
      title: `CUSTOM_DND5E.form.${constants.ID}.edit.title`
    }
  };

  /* -------------------------------------------- */

  /**
   * @type {object[]}
   */
  static FIELDS = [
    { name: "label", type: "text", label: "CUSTOM_DND5E.label", localizeValue: true },
    { name: "abbreviation", type: "text", label: "CUSTOM_DND5E.abbreviation", localizeValue: true },
    { name: "icon", type: "filePicker", label: "CUSTOM_DND5E.icon" },
    { name: "isPhysical", type: "checkbox", label: "CUSTOM_DND5E.physical" },
    { name: "isTag", type: "checkbox", label: "CUSTOM_DND5E.tag" },
    { name: "reference", type: "text", label: "CUSTOM_DND5E.reference" },
    { name: "itemTypes", type: "checkboxGrid", label: "CUSTOM_DND5E.itemTypes", items: form => form._getItemTypes() }
  ];

  /* -------------------------------------------- */

  /**
   * Get the item types.
   * @returns {Array} List of item types
   */
  _getItemTypes() {
    return Object.keys(CONFIG.DND5E.validProperties).map(key => {
      let label = game.i18n.localize(`CUSTOM_DND5E.${key}`);
      if ( label === `CUSTOM_DND5E.${key}` ) {
        label = key.charAt(0).toUpperCase() + key.slice(1);
      }
      return {
        key,
        label,
        checked: !!this.setting?.[this.key]?.[key]
      };
    }
    );
  }
}

/* -------------------------------------------- */

/**
 * Item properties settings menu form.
 * @extends ConfigForm
 */
class ItemPropertiesForm extends ConfigForm {
  constructor() {
    super();
    this.editForm = ItemPropertiesEditForm;
    this.listTitle = `CUSTOM_DND5E.form.${constants.ID}.listTitle`;
    this.requiresReload = false;
    this.config = configs.itemProperties;
  }

  /* -------------------------------------------- */

  /**
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-item-properties-form`,
    window: {
      title: `CUSTOM_DND5E.form.${constants.ID}.title`
    }
  };
}

/* -------------------------------------------- */
/*  REGISTRATION                                */
/* -------------------------------------------- */

/**
 * Register settings and load templates.
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
/*  CONFIG                                      */
/* -------------------------------------------- */

/**
 * Get default config.
 * @param {string|null} key
 * @returns {object} Default config
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
 * @param {object} [settingData=null]
 * @returns {void}
 */
export function setConfig(settingData) {
  if ( !getSetting(constants.SETTING.ENABLE.KEY) ) return;
  settingData ??= getSetting(constants.SETTING.CONFIG.KEY);
  if ( checkEmpty(settingData) ) return handleEmptyData();

  const itemTypesSet = new Set(
    Object.keys(CONFIG.CUSTOM_DND5E.validProperties),
    Object.keys(CONFIG.DND5E.validProperties)
  );
  const itemTypes = [...itemTypesSet];

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

  setValidProperties(mergedSettingData, itemTypes);
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
 * @param {object} settingData
 * @returns {object} Config data
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
 * @param {object} data
 * @returns {object} Config entry
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

/* -------------------------------------------- */

/**
 * Set valid item properties.
 * @param {object} settingData
 * @param {string[]} itemTypes List of item types
 */
function setValidProperties(settingData, itemTypes) {
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
