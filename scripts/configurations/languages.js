import { MODULE } from "../constants.js";
import { ConfigForm } from "../forms/config-form.js";
import { configs } from "./registry.js";

/* -------------------------------------------- */
/*  CONSTANTS                                   */
/* -------------------------------------------- */

const constants = {
  ID: "languages",
  MENU: {
    KEY: "languages-menu",
    HINT: "CUSTOM_DND5E.menu.languages.hint",
    ICON: "fas fa-comment",
    LABEL: "CUSTOM_DND5E.menu.languages.label",
    NAME: "CUSTOM_DND5E.menu.languages.name"
  },
  SETTING: {
    ENABLE: {
      KEY: "enable-languages"
    },
    CONFIG: {
      KEY: "languages"
    }
  },
  UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.B48iqFBddUikMMer.JournalEntryPage.UHurkLgqKecvpq2S"
};

/* -------------------------------------------- */
/*  FORM CLASSES                                */
/* -------------------------------------------- */

class LanguagesForm extends ConfigForm {
  /**
   * Constructor for LanguagesForm.
   */
  constructor() {
    super();
    this.editInList = true;
    this.listTitle = `CUSTOM_DND5E.form.${constants.ID}.listTitle`;
    this.nestable = true;
    this.requiresReload = false;
    this.config = configs.languages;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-languages-form`,
    window: {
      title: `CUSTOM_DND5E.form.${constants.ID}.title`
    }
  };
}

/* -------------------------------------------- */
/*  DEFINITION                                  */
/* -------------------------------------------- */

export default {
  configKey: "languages",
  constants,
  form: LanguagesForm,
  loadTemplates: false,
  mergeStrategy: "defaultsOnly",
  buildEntry: (key, data, helpers) => {
    if ( data?.children ) {
      return {
        label: game.i18n.localize(data.label),
        children: helpers.buildConfig(data.children)
      };
    }
    return game.i18n.localize(data?.label || data);
  }
};
