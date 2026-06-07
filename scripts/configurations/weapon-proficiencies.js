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
    KEY: "weapon-proficiencies-menu",
    HINT: "CUSTOM_DND5E.menu.weaponProficiencies.hint",
    ICON: "fas fa-swords",
    LABEL: "CUSTOM_DND5E.menu.weaponProficiencies.label",
    NAME: "CUSTOM_DND5E.menu.weaponProficiencies.name"
  },
  SETTING: {
    ENABLE: {
      KEY: "enable-weapon-proficiencies"
    },
    CONFIG: {
      KEY: "weapon-proficiencies"
    }
  },
  TEMPLATE: {
    FORM: "modules/custom-dnd5e/templates/config-form.hbs",
    LIST: "modules/custom-dnd5e/templates/config-edit-in-list.hbs"
  },
  UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.B48iqFBddUikMMer.JournalEntryPage.Cy09wdPVi8XrkjJ2"
};

/* -------------------------------------------- */
/*  FORM CLASS                                  */
/* -------------------------------------------- */

/**
 * Weapon proficiencies settings menu form.
 * @extends ConfigForm
 */
class WeaponProficienciesForm extends ConfigForm {
  /**
   * Constructor for WeaponProficienciesForm.
   * @param {...any} args
   */
  constructor(...args) {
    super(args);
    this.editInList = true;
    this.nestable = true;
    this.config = configs.weaponProficiencies;
    this.settingDefault = this.config.getSettingDefault();
    this.setting = getSetting(this.settingKey) || this.settingDefault;
    this.listTitle = "CUSTOM_DND5E.form.weaponProficiencies.listTitle";
  }

  /* -------------------------------------------- */

  static DEFAULT_OPTIONS = {
    actions: {
      reset: WeaponProficienciesForm.reset
    },
    id: `${MODULE.ID}-weapon-proficiencies-form`,
    window: {
      title: "CUSTOM_DND5E.form.weaponProficiencies.title"
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
  await resetDnd5eConfig("weaponProficiencies");
  await resetDnd5eConfig("weaponProficienciesMap");
  await resetDnd5eConfig("weaponTypes");
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
 * Set CONFIG.DND5E.weaponProficiencies, CONFIG.DND5E.weaponProficienciesMap and CONFIG.DND5E.weaponTypes.
 * @param {object} [settingData=null]
 * @returns {void}
 */
export function setConfig(settingData) {
  if ( !getSetting(constants.SETTING.ENABLE.KEY) ) return;
  settingData ??= getSetting(constants.SETTING.CONFIG.KEY);
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
