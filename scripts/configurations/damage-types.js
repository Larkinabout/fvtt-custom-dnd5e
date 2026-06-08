import { MODULE } from "../constants.js";
import { ConfigForm } from "../forms/config-form.js";
import { ConfigEditForm } from "../forms/config-edit-form.js";
import { configs } from "./registry.js";

/* -------------------------------------------- */
/*  CONSTANTS                                   */
/* -------------------------------------------- */

const constants = {
  ID: "damageTypes",
  MENU: {
    KEY: "damage-types-menu",
    HINT: "CUSTOM_DND5E.menu.damageTypes.hint",
    ICON: "fas fa-face-head-bandage",
    LABEL: "CUSTOM_DND5E.menu.damageTypes.label",
    NAME: "CUSTOM_DND5E.menu.damageTypes.name"
  },
  SETTING: {
    ENABLE: {
      KEY: "enable-damage-types"
    },
    CONFIG: {
      KEY: "damage-types"
    }
  },
  UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.B48iqFBddUikMMer.JournalEntryPage.qkB3382uO7YUUApw"
};

/* -------------------------------------------- */
/*  FORM CLASSES                                */
/* -------------------------------------------- */

class DamageTypesEditForm extends ConfigEditForm {
  /**
   * @param {object} args
   */
  constructor(args) {
    super(args);
    this.config = configs.damageTypes;
    this.requiresReload = true;
  }

  /* -------------------------------------------- */

  /**
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-damage-types-edit-form`,
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
    { name: "icon", type: "filePicker", label: "CUSTOM_DND5E.icon" },
    { name: "color", type: "colorPicker", label: "CUSTOM_DND5E.color" },
    { name: "reference", type: "text", label: "CUSTOM_DND5E.reference" },
    { name: "isPhysical", type: "checkbox", label: "CUSTOM_DND5E.physical" }
  ];
}

/* -------------------------------------------- */

class DamageTypesForm extends ConfigForm {
  constructor() {
    super();
    this.editForm = DamageTypesEditForm;
    this.listTitle = `CUSTOM_DND5E.form.${constants.ID}.listTitle`;
    this.requiresReload = false;
    this.config = configs.damageTypes;
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
  configKey: "damageTypes",
  constants,
  form: DamageTypesForm,
  entryType: "object",
  entry: [
    { key: "color", transform: v => Color.fromString(v || "#ffffff") },
    { key: "icon" },
    { key: "isPhysical", conditional: "defined" },
    { key: "label", localize: true, systemLabelFallback: true },
    { key: "reference" }
  ]
};
