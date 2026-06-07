import {
  c5eLoadTemplates,
  checkEmpty,
  getSetting,
  registerMenu,
  registerSetting,
  resetDnd5eConfig,
  resetSetting,
  setSetting } from "../utils.js";
import { MODULE } from "../constants.js";
import { ConfigForm } from "../forms/config-form.js";
import { configs } from "./registry.js";

/* -------------------------------------------- */
/*  CONSTANTS                                   */
/* -------------------------------------------- */

export const constants = {
  MENU: {
    KEY: "tool-proficiencies-menu",
    HINT: "CUSTOM_DND5E.menu.toolProficiencies.hint",
    ICON: "fas fa-hammer-brush",
    LABEL: "CUSTOM_DND5E.menu.toolProficiencies.label",
    NAME: "CUSTOM_DND5E.menu.toolProficiencies.name"
  },
  SETTING: {
    ENABLE: {
      KEY: "enable-tool-proficiencies"
    },
    CONFIG: {
      KEY: "tool-proficiencies"
    }
  },
  TEMPLATE: {
    FORM: "modules/custom-dnd5e/templates/config-form.hbs",
    LIST: "modules/custom-dnd5e/templates/config-edit-in-list.hbs"
  },
  UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.B48iqFBddUikMMer.JournalEntryPage.Ls4Rn45UNhTBagHD"
};

/* -------------------------------------------- */
/*  FORM CLASS                                  */
/* -------------------------------------------- */

/**
 * Tool proficiencies settings menu form.
 * @extends ConfigForm
 */
class ToolProficienciesForm extends ConfigForm {
  /**
   * Constructor for ToolProficienciesForm.
   * @param {...any} args
   */
  constructor(...args) {
    super(args);
    this.editInList = true;
    this.nestable = true;
    this.config = configs.toolProficiencies;
    this.settingDefault = this.config.getSettingDefault();
    this.setting = getSetting(this.settingKey) || this.settingDefault;
    this.listTitle = "CUSTOM_DND5E.form.toolProficiencies.listTitle";
  }

  /* -------------------------------------------- */

  static DEFAULT_OPTIONS = {
    actions: {
      reset: ToolProficienciesForm.reset
    },
    id: `${MODULE.ID}-tool-proficiencies-form`,
    window: {
      title: "CUSTOM_DND5E.form.toolProficiencies.title"
    }
  };

  /* -------------------------------------------- */

  /**
   * Prepare the context for rendering the form.
   * @returns {Promise<object>} Context data
   */
  async _prepareContext() {
    this.setting = getSetting(this.settingKey) || this.settingDefault;

    const labelise = data => {
      Object.entries(data).forEach(([key, value]) => {
        if ( typeof value === "string" ) {
          data[key] = { label: value };
        }

        if ( value.children ) {
          labelise(value.children);
        }
      });
    };

    labelise(this.setting);

    return { editInList: this.editInList, label: this.label, listTitle: this.listTitle, items: this.setting };
  }

  /* -------------------------------------------- */

  /**
   * Reset the form to default settings.
   */
  static async reset() {
    const reset = async () => {
      await setSetting(this.settingKey, this.settingDefault);
      this.setConfig(this.settingDefault);
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
 * Register menu and settings.
 */
function registerSettings() {
  registerMenu(
    constants.MENU.KEY,
    {
      hint: game.i18n.localize(constants.MENU.HINT),
      label: game.i18n.localize(constants.MENU.LABEL),
      name: game.i18n.localize(constants.MENU.NAME),
      icon: constants.MENU.ICON,
      type: ToolProficienciesForm,
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
 * @returns {object} Default setting data
 */
export function getSettingDefault() {
  return buildData(CONFIG.CUSTOM_DND5E);
}

/* -------------------------------------------- */

/**
 * Reset config and setting to their default values.
 */
export async function resetConfigSetting() {
  await resetDnd5eConfig("toolProficiencies");
  await resetDnd5eConfig("toolTypes");
  await resetSetting(constants.SETTING.CONFIG.KEY);
}

/* -------------------------------------------- */

/**
 * Build setting data.
 * @param {object} config Config data
 * @returns {object} Setting data
 */
function buildData(config) {
  const data = {};

  Object.entries(config.toolProficiencies).forEach(([key, value]) => {
    data[key] = { label: value };
  });

  Object.entries(config.toolTypes).forEach(([key, value]) => {
    if ( data[key] ) {
      if ( !foundry.utils.hasProperty(data[key], "children") ) {
        data[key].children = {};
      }
      data[key].children[key] = value;
    } else {
      data[key] = { label: value };
    }
  });

  return data;
}

/* -------------------------------------------- */

/**
 * Set CONFIG.DND5E.toolProficiencies and CONFIG.DND5E.toolTypes.
 * @param {object} settingData
 * @returns {void}
 */
export function setConfig(settingData) {
  if ( !getSetting(constants.SETTING.ENABLE.KEY) ) return;
  settingData ??= getSetting(constants.SETTING.CONFIG.KEY);
  const properties = ["toolProficiencies", "toolTypes"];
  if ( checkEmpty(settingData) ) return handleEmptyData(properties);

  // Initialise the config object
  const config = {
    toolProficiencies: {},
    toolTypes: {}
  };

  Object.entries(settingData)
    .filter(([_, value]) => value.visible || value.visible === undefined)
    .forEach(([key, value]) => {
      const localisedLabel = game.i18n.localize(value.label ?? value);

      config.toolProficiencies[key] = localisedLabel;

      if ( Object.keys(value.children ?? {}).length ) {
        Object.entries(value.children).forEach(([childKey, childValue]) => {
          config.toolTypes[childKey] = game.i18n.localize(childValue.label ?? childValue);
        });
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
