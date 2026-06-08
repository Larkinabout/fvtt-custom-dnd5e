import { MODULE } from "../constants.js";
import { ConfigForm } from "../forms/config-form.js";
import { ConfigEditForm } from "../forms/config-edit-form.js";
import { configs } from "./registry.js";

/* -------------------------------------------- */
/*  CONSTANTS                                   */
/* -------------------------------------------- */

const constants = {
  ID: "creatureTypes",
  MENU: {
    KEY: "creature-types-menu",
    HINT: "CUSTOM_DND5E.menu.creatureTypes.hint",
    ICON: "fas fa-paw-claws",
    LABEL: "CUSTOM_DND5E.menu.creatureTypes.label",
    NAME: "CUSTOM_DND5E.menu.creatureTypes.name"
  },
  SETTING: {
    ENABLE: {
      KEY: "enable-creature-types"
    },
    CONFIG: {
      KEY: "creature-types"
    }
  },
  UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.B48iqFBddUikMMer.JournalEntryPage.sRMUy8oNAZNCQOG0"
};

/* -------------------------------------------- */
/*  FORM CLASSES                                */
/* -------------------------------------------- */

class CreatureTypesEditForm extends ConfigEditForm {
  /**
   * @param {object} args
   */
  constructor(args) {
    super(args);
    this.config = configs.creatureTypes;
    this.requiresReload = true;
  }

  /* -------------------------------------------- */

  /**
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-creature-types-edit-form`,
    window: {
      title: `CUSTOM_DND5E.form.${constants.ID}.edit.title`
    }
  };

  /* -------------------------------------------- */

  /**
   * @type {object[]}
   */
  static FIELDS = [
    { name: "label", type: "text", label: "CUSTOM_DND5E.label", localizeValue: true },
    { name: "plural", type: "text", label: "CUSTOM_DND5E.plural", localizeValue: true },
    { name: "icon", type: "filePicker", label: "CUSTOM_DND5E.icon" },
    { name: "reference", type: "text", label: "CUSTOM_DND5E.reference" },
    { name: "detectAlignment", type: "checkbox", label: "CUSTOM_DND5E.detectAlignment" }
  ];
}

/* -------------------------------------------- */

class CreatureTypesForm extends ConfigForm {
  constructor() {
    super();
    this.editForm = CreatureTypesEditForm;
    this.listTitle = `CUSTOM_DND5E.form.${constants.ID}.listTitle`;
    this.requiresReload = false;
    this.config = configs.creatureTypes;
    this.actorProperties = ["system.traits.di.value", "system.traits.dr.value", "system.traits.dv.value"];
  }

  /* -------------------------------------------- */

  /**
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-damage-types-form`,
    window: {
      title: `CUSTOM_DND5E.form.${constants.ID}.title`
    }
  };
}

/* -------------------------------------------- */
/*  DEFINITION                                  */
/* -------------------------------------------- */

export default {
  configKey: "creatureTypes",
  constants,
  form: CreatureTypesForm,
  entryType: "object",
  entry: [
    { key: "detectAlignment", conditional: "defined" },
    { key: "icon" },
    { key: "label", localize: true },
    { key: "plural", localize: true },
    { key: "reference" }
  ]
};
