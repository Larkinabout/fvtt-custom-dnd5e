import { MODULE } from "../constants.js";
import { ConfigForm } from "../forms/config-form.js";
import { ConfigEditForm } from "../forms/config-edit-form.js";
import { configs } from "./registry.js";

/* -------------------------------------------- */
/*  CONSTANTS                                   */
/* -------------------------------------------- */

const constants = {
  ID: "spell-schools",
  MENU: {
    KEY: "spell-schools-menu",
    HINT: "CUSTOM_DND5E.menu.spellSchools.hint",
    ICON: "fas fa-book-sparkles",
    LABEL: "CUSTOM_DND5E.menu.spellSchools.label",
    NAME: "CUSTOM_DND5E.menu.spellSchools.name"
  },
  SETTING: {
    ENABLE: {
      KEY: "enable-spell-schools"
    },
    CONFIG: {
      KEY: "spell-schools"
    }
  },
  TEMPLATE: {
    EDIT: "modules/custom-dnd5e/templates/spell-schools-edit.hbs",
    FORM: "modules/custom-dnd5e/templates/config-form.hbs",
    LIST: "modules/custom-dnd5e/templates/config-list.hbs"
  },
  UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.B48iqFBddUikMMer.JournalEntryPage.PlVATLzmAndA0gfR"
};

/* -------------------------------------------- */
/*  FORM CLASSES                                */
/* -------------------------------------------- */

class SpellSchoolsEditForm extends ConfigEditForm {
  /**
   * Constructor for SpellSchoolsEditForm.
   *
   * @param {object} args
   */
  constructor(args) {
    super(args);
    this.config = configs.spellSchools;
    this.requiresReload = true;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-spell-schools-edit-form`,
    position: {
      height: 320
    },
    window: {
      title: "CUSTOM_DND5E.form.spellSchools.edit.title"
    }
  };

  /* -------------------------------------------- */

  /**
   * Parts of the form.
   *
   * @type {object}
   */
  static PARTS = {
    form: {
      template: constants.TEMPLATE.EDIT
    }
  };

  /* -------------------------------------------- */

  /**
   * Get the select options for the form.
   *
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
      }
    };
  }
}

/* -------------------------------------------- */

class SpellSchoolsForm extends ConfigForm {
  /**
   * Constructor for SpellSchoolsForm.
   */
  constructor() {
    super();
    this.editForm = SpellSchoolsEditForm;
    this.listTitle = "CUSTOM_DND5E.form.spellSchools.listTitle";
    this.requiresReload = false;
    this.config = configs.spellSchools;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-spell-schools-form`,
    window: {
      title: "CUSTOM_DND5E.form.spellSchools.title"
    }
  };
}

/* -------------------------------------------- */
/*  DEFINITION                                  */
/* -------------------------------------------- */

export default {
  configKey: "spellSchools",
  constants,
  form: SpellSchoolsForm,
  configRequiresReload: true,
  entryType: "object",
  entry: [
    { key: "fullKey" },
    { key: "icon" },
    { key: "label", localize: true },
    { key: "reference" }
  ]
};
