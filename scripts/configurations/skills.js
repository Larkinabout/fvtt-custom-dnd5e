import { MODULE } from "../constants.js";
import { ConfigForm } from "../forms/config-form.js";
import { ConfigEditForm } from "../forms/config-edit-form.js";
import { configs } from "./registry.js";

/* -------------------------------------------- */
/*  CONSTANTS                                   */
/* -------------------------------------------- */

const constants = {
  ID: "skills",
  MENU: {
    KEY: "skills-menu",
    HINT: "CUSTOM_DND5E.menu.skills.hint",
    ICON: "fas fa-person-running-fast",
    LABEL: "CUSTOM_DND5E.menu.skills.label",
    NAME: "CUSTOM_DND5E.menu.skills.name"
  },
  SETTING: {
    ENABLE: {
      KEY: "enable-skills"
    },
    CONFIG: {
      KEY: "skills"
    }
  },
  UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.B48iqFBddUikMMer.JournalEntryPage.0SCQdu9sYAjcDqAk"
};

/* -------------------------------------------- */
/*  FORM CLASSES                                */
/* -------------------------------------------- */

class SkillsEditForm extends ConfigEditForm {
  /**
   * @param {object} args
   */
  constructor(args) {
    super(args);
    this.config = configs.skills;
    this.requiresReload = true;
  }

  /* -------------------------------------------- */

  /**
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-skills-edit-form`,
    window: {
      title: "CUSTOM_DND5E.form.skills.edit.title"
    }
  };

  /* -------------------------------------------- */

  /**
   * @type {object[]}
   */
  static FIELDS = [
    { name: "fullKey", type: "text", label: "CUSTOM_DND5E.fullKey", localizeValue: true },
    { name: "label", type: "text", label: "CUSTOM_DND5E.label", localizeValue: true },
    { name: "ability", type: "text", label: "CUSTOM_DND5E.ability" },
    { name: "icon", type: "filePicker", label: "CUSTOM_DND5E.icon" },
    { name: "reference", type: "text", label: "CUSTOM_DND5E.reference" },
    { name: "rollMode", type: "select", label: "CUSTOM_DND5E.rollMode", choices: "rollMode", localizeChoices: true }
  ];

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

class SkillsForm extends ConfigForm {
  constructor() {
    super();
    this.editForm = SkillsEditForm;
    this.listTitle = "CUSTOM_DND5E.form.skills.listTitle";
    this.requiresReload = true;
    this.config = configs.skills;
  }

  /* -------------------------------------------- */

  /**
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-skills-form`,
    window: {
      title: "CUSTOM_DND5E.form.skills.title"
    }
  };
}

/* -------------------------------------------- */
/*  DEFINITION                                  */
/* -------------------------------------------- */

export default {
  configKey: "skills",
  constants,
  form: SkillsForm,
  configRequiresReload: true,
  entryType: "object",
  entry: [
    { key: "ability" },
    { key: "fullKey" },
    { key: "icon" },
    { key: "label", localize: true },
    { key: "reference" },
    { key: "rollMode", default: "default" }
  ]
};
