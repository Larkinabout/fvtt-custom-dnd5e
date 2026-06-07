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
  TEMPLATE: {
    EDIT: "modules/custom-dnd5e/templates/abilities-edit.hbs"
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
   * Constructor for AbilitiesEditForm.
   * @param {object} args
   */
  constructor(args) {
    super(args);
    this.config = configs.abilities;
    this.requiresReload = true;
  }

  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-abilities-edit-form`,
    position: { height: 500 },
    window: { title: `CUSTOM_DND5E.form.${constants.ID}.edit.title` }
  };

  static PARTS = {
    form: { template: constants.TEMPLATE.EDIT }
  };

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
  /**
   * Constructor for AbilitiesForm.
   */
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
