import { MODULE } from "../constants.js";
import { ConfigForm, IdForm } from "../forms/config-form.js";
import { ConfigEditForm } from "../forms/config-edit-form.js";
import { configs } from "./registry.js";

/* -------------------------------------------- */
/*  CONSTANTS                                   */
/* -------------------------------------------- */

const constants = {
  MENU: {
    KEY: "tool-ids-menu",
    HINT: "CUSTOM_DND5E.menu.tools.hint",
    ICON: "fas fa-trowel",
    LABEL: "CUSTOM_DND5E.menu.tools.label",
    NAME: "CUSTOM_DND5E.menu.tools.name"
  },
  SETTING: {
    ENABLE: {
      KEY: "enable-tools-ids"
    },
    CONFIG: {
      KEY: "tool-ids"
    }
  },
  UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.B48iqFBddUikMMer.JournalEntryPage.mBgCguO7mTNQuPtz"
};

/* -------------------------------------------- */
/*  FORM CLASSES                                */
/* -------------------------------------------- */

class ToolsEditForm extends ConfigEditForm {
  /**
   * @param {object} args
   */
  constructor(args) {
    super(args);
    this.config = configs.tools;
    this.requiresReload = true;
  }

  /* -------------------------------------------- */

  /**
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-tools-edit-form`,
    window: {
      title: "CUSTOM_DND5E.form.tools.edit.title"
    }
  };

  /* -------------------------------------------- */

  /**
   * @type {object[]}
   */
  static FIELDS = [
    { name: "id", type: "text", label: "CUSTOM_DND5E.id", localizeValue: true },
    { name: "ability", type: "text", label: "CUSTOM_DND5E.ability", localizeValue: true }
  ];
}

/* -------------------------------------------- */

class ToolsForm extends IdForm {
  constructor() {
    super();
    this.editForm = ToolsEditForm;
    this.editInList = false;
    this.listTitle = "CUSTOM_DND5E.form.tools.listTitle";
    this.requiresReload = true;
    this.config = configs.tools;
  }

  /* -------------------------------------------- */

  /**
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-tools-form`,
    window: {
      title: "CUSTOM_DND5E.form.tools.title"
    }
  };
}

/* -------------------------------------------- */
/*  DEFINITION                                  */
/* -------------------------------------------- */

export default {
  configKey: "tools",
  constants,
  form: ToolsForm,
  loadTemplates: false,
  entryType: "object",
  entry: [
    { key: "ability" },
    { key: "id" }
  ]
};
