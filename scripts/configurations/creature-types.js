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
  TEMPLATE: {
    EDIT: "modules/custom-dnd5e/templates/creature-types-edit.hbs",
    FORM: "modules/custom-dnd5e/templates/config-form.hbs",
    LIST: "modules/custom-dnd5e/templates/config-list.hbs"
  },
  UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.B48iqFBddUikMMer.JournalEntryPage.sRMUy8oNAZNCQOG0"
};

/* -------------------------------------------- */
/*  FORM CLASSES                                */
/* -------------------------------------------- */

class CreatureTypesEditForm extends ConfigEditForm {
  /**
   * Constructor for CreatureTypesEditForm.
   *
   * @param {object} args
   */
  constructor(args) {
    super(args);
    this.config = configs.creatureTypes;
    this.requiresReload = true;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-creature-types-edit-form`,
    position: {
      height: 340
    },
    window: {
      title: `CUSTOM_DND5E.form.${constants.ID}.edit.title`
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
}

/* -------------------------------------------- */

class CreatureTypesForm extends ConfigForm {
  /**
   * Constructor for CreatureTypesForm.
   */
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
   * Default options for the form.
   *
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
