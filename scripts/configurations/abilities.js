import { MODULE } from "../constants.js";
import { ConfigForm } from "../forms/config-form.js";
import { ConfigEditForm } from "../forms/config-edit-form.js";
import { configs } from "./registry.js";

/* -------------------------------------------- */
/*  CONSTANTS                                   */
/* -------------------------------------------- */

const constants = {
  ID: "abilities",
  MENU: {
    KEY: "abilities-menu",
    HINT: "CUSTOM_DND5E.menu.abilities.hint",
    ICON: "fas fa-head-side-brain",
    LABEL: "CUSTOM_DND5E.menu.abilities.label",
    NAME: "CUSTOM_DND5E.menu.abilities.name"
  },
  SETTING: {
    ENABLE: { KEY: "enable-abilities" },
    CONFIG: { KEY: "abilities" }
  },
  UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.B48iqFBddUikMMer.JournalEntryPage.tVG6b7kBJUOVvpwP"
};

/* -------------------------------------------- */
/*  FORM CLASSES                                */
/* -------------------------------------------- */

/**
 * Per-item edit form for abilities.
 * @extends ConfigEditForm
 */
class AbilitiesEditForm extends ConfigEditForm {
  /**
   * @param {object} args
   */
  constructor(args) {
    super(args);
    this.config = configs.abilities;
    this.requiresReload = true;
  }

  /* -------------------------------------------- */

  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-abilities-edit-form`,
    window: { title: `CUSTOM_DND5E.form.${constants.ID}.edit.title` }
  };

  /* -------------------------------------------- */

  /**
   * @type {object[]}
   */
  static FIELDS = [
    { name: "fullKey", type: "text", label: "CUSTOM_DND5E.fullKey", localizeValue: true },
    { name: "label", type: "text", label: "CUSTOM_DND5E.label", localizeValue: true },
    { name: "abbreviation", type: "text", label: "CUSTOM_DND5E.abbreviation", localizeValue: true },
    { name: "improvement", type: "checkbox", label: "Include for ASI", default: true },
    { name: "type", type: "select", label: "CUSTOM_DND5E.type", choices: "type", localizeChoices: true,
      disabledWhenSystem: true },
    { name: "reference", type: "text", label: "CUSTOM_DND5E.reference" },
    { name: "rollMode", type: "select", label: "CUSTOM_DND5E.rollMode", choices: "rollMode", localizeChoices: true }
  ];

  /* -------------------------------------------- */

  /**
   * Select options for the form.
   * @returns {object} Select options
   */
  _getSelects() {
    return {
      rollMode: {
        choices: {
          default: "CUSTOM_DND5E.default",
          blindroll: "CHAT.MODES.blind",
          gmroll: "CHAT.MODES.gm",
          publicroll: "CHAT.MODES.public",
          selfroll: "CHAT.MODES.self"
        }
      },
      type: {
        choices: {
          mental: "CUSTOM_DND5E.mental",
          physical: "CUSTOM_DND5E.physical"
        }
      }
    };
  }
}

/* -------------------------------------------- */

/**
 * Main settings menu form for abilities.
 * @extends ConfigForm
 */
class AbilitiesForm extends ConfigForm {
  constructor() {
    super();
    this.editForm = AbilitiesEditForm;
    this.listTitle = `CUSTOM_DND5E.form.${constants.ID}.listTitle`;
    this.requiresReload = true;
    this.config = configs.abilities;
  }

  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-abilities-form`,
    window: { title: `CUSTOM_DND5E.form.${constants.ID}.title` }
  };
}

/* -------------------------------------------- */
/*  DEFINITION                                  */
/* -------------------------------------------- */

export default {
  configKey: "abilities",
  constants,
  form: AbilitiesForm,
  configRequiresReload: true,
  entryType: "object",
  entry: [
    { key: "abbreviation", localize: true },
    { key: "defaults", conditional: "defined", transform: v => ({ ...v }) },
    { key: "fullKey" },
    { key: "improvement", conditional: data => data?.improvement === false },
    { key: "label", localize: true },
    { key: "reference" },
    { key: "rollMode", default: "default" },
    { key: "type" }
  ]
};
