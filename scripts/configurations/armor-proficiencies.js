import {
  checkEmpty,
  getSetting,
  registerMenu,
  registerSetting,
  resetDnd5eConfig,
  resetSetting,
  setSetting } from "../utils.js";
import { MODULE } from "../constants.js";
import { ConfigForm, labeliseConfigData } from "../forms/config-form.js";
import { configs } from "./registry.js";

/* -------------------------------------------- */
/*  CONSTANTS                                   */
/* -------------------------------------------- */

export const constants = {
  ID: "armorProficiencies",
  MENU: {
    KEY: "armor-proficiencies-menu",
    HINT: "CUSTOM_DND5E.menu.armorProficiencies.hint",
    ICON: "fas fa-user-shield",
    LABEL: "CUSTOM_DND5E.menu.armorProficiencies.label",
    NAME: "CUSTOM_DND5E.menu.armorProficiencies.name"
  },
  SETTING: {
    ENABLE: {
      KEY: "enable-armor-proficiencies"
    },
    CONFIG: {
      KEY: "armor-proficiencies"
    }
  },
  UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.B48iqFBddUikMMer.JournalEntryPage.mTVSShsLO960Kmrk"
};

export const configKeys = ["armorProficiencies", "armorProficienciesMap", "armorTypes"];

/* -------------------------------------------- */
/*  FORM CLASS                                  */
/* -------------------------------------------- */

/**
 * Armor proficiencies settings menu form.
 * @extends ConfigForm
 */
class ArmorProficienciesForm extends ConfigForm {
  /**
   * Constructor for ArmorProficienciesForm.
   * @param {...any} args
   */
  constructor(...args) {
    super(args);
    this.editInList = true;
    this.nestable = true;
    this.config = configs.armorProficiencies;
    this.settingDefault = this.config.getSettingDefault();
    this.setting = getSetting(this.settingKey) || this.settingDefault;
    this.listTitle = `CUSTOM_DND5E.form.${constants.ID}.listTitle`;
  }

  /* -------------------------------------------- */

  static DEFAULT_OPTIONS = {
    actions: {
      reset: ArmorProficienciesForm.reset
    },
    id: `${MODULE.ID}-armor-proficiencies-form`,
    window: {
      title: `CUSTOM_DND5E.form.${constants.ID}.title`
    }
  };

  /* -------------------------------------------- */

  /**
   * Prepare the context for rendering the form.
   * @returns {Promise<object>} Context data
   */
  async _prepareContext() {
    this.setting = getSetting(this.settingKey) || this.settingDefault;

    labeliseConfigData(this.setting);

    return { editInList: this.editInList, label: this.label, listTitle: this.listTitle, items: this.setting };
  }

  /* -------------------------------------------- */

  /**
   * Reset the form to its default settings.
   * @returns {Promise<void>}
   */
  static async reset() {
    const reset = async () => {
      await setSetting(this.settingKey, this.settingDefault);
      setConfig(this.settingDefault);
      this.render(true);
    };

    await foundry.applications.api.DialogV2.confirm({
      window: {
        title: game.i18n.localize("CUSTOM_DND5E.dialog.reset.title")
      },
      content: `<p>${game.i18n.localize("CUSTOM_DND5E.dialog.reset.content")}</p>`,
      modal: true,
      yes: {
        label: game.i18n.localize("CUSTOM_DND5E.yes"),
        callback: async () => {
          reset();
        }
      },
      no: {
        label: game.i18n.localize("CUSTOM_DND5E.no")
      }
    });
  }
}

/* -------------------------------------------- */
/*  REGISTRATION                                */
/* -------------------------------------------- */

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
/*  CONFIG                                      */
/* -------------------------------------------- */

/**
 * Get setting default.
 * @returns {object} Setting data
 */
export function getSettingDefault() {
  return buildConfigSetting(CONFIG.CUSTOM_DND5E);
}

/* -------------------------------------------- */

/**
 * Build setting data.
 * @param {object} config Config data
 * @returns {object} Setting data
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
 * @param {object} [data=null]
 * @returns {void}
 */
export function setConfig(data) {
  if ( !getSetting(constants.SETTING.ENABLE.KEY) ) return;
  data ??= getSetting(constants.SETTING.CONFIG.KEY);
  const properties = ["armorProficiencies", "armorProficienciesMap", "armorTypes"];
  if ( checkEmpty(data) ) return handleEmptyData(properties);

  const config = {
    armorProficiencies: {},
    armorProficienciesMap: {},
    armorTypes: {}
  };

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
 * @param {string[]} properties
 */
function handleEmptyData(properties) {
  properties.forEach(property => {
    if ( checkEmpty(CONFIG.DND5E[property]) ) {
      resetDnd5eConfig(property);
    }
  });
}
