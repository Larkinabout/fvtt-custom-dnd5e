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
  UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.B48iqFBddUikMMer.JournalEntryPage.PlVATLzmAndA0gfR"
};

/* -------------------------------------------- */
/*  FORM CLASSES                                */
/* -------------------------------------------- */

class SpellSchoolsEditForm extends ConfigEditForm {
  /**
   * @param {object} args
   */
  constructor(args) {
    super(args);
    this.config = configs.spellSchools;
    this.requiresReload = true;
  }

  /* -------------------------------------------- */

  /**
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-spell-schools-edit-form`,
    window: {
      title: "CUSTOM_DND5E.form.spellSchools.edit.title"
    }
  };

  /* -------------------------------------------- */

  /**
   * @type {object[]}
   */
  static FIELDS = [
    { name: "fullKey", type: "text", label: "CUSTOM_DND5E.fullKey", localizeValue: true },
    { name: "label", type: "text", label: "CUSTOM_DND5E.label", localizeValue: true },
    { name: "icon", type: "filePicker", label: "CUSTOM_DND5E.icon" },
    { name: "reference", type: "text", label: "CUSTOM_DND5E.reference" }
  ];
}

/* -------------------------------------------- */

class SpellSchoolsForm extends ConfigForm {
  constructor() {
    super();
    this.editForm = SpellSchoolsEditForm;
    this.listTitle = "CUSTOM_DND5E.form.spellSchools.listTitle";
    this.requiresReload = false;
    this.config = configs.spellSchools;
  }

  /* -------------------------------------------- */

  /**
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
