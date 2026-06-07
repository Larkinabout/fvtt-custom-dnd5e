import { MODULE } from "../constants.js";
import { ConfigForm } from "../forms/config-form.js";
import { ConfigEditForm } from "../forms/config-edit-form.js";
import { configs } from "./registry.js";

/* -------------------------------------------- */
/*  CONSTANTS                                   */
/* -------------------------------------------- */

const constants = {
  ID: "armorCalculations",
  MENU: {
    KEY: "armor-calculations-menu",
    HINT: "CUSTOM_DND5E.menu.armorClasses.hint",
    ICON: "fas fa-abacus",
    LABEL: "CUSTOM_DND5E.menu.armorClasses.label",
    NAME: "CUSTOM_DND5E.menu.armorClasses.name"
  },
  SETTING: {
    ENABLE: {
      KEY: "enable-armor-calculations"
    },
    CONFIG: {
      KEY: "armor-calculations"
    }
  },
  TEMPLATE: {
    EDIT: "modules/custom-dnd5e/templates/armor-calculations-edit.hbs"
  },
  UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.B48iqFBddUikMMer.JournalEntryPage.bjFllCYYW9paPCNG"
};

/* -------------------------------------------- */
/*  FORM CLASSES                                */
/* -------------------------------------------- */

class ArmorCalculationsEditForm extends ConfigEditForm {
  /**
   * Constructor for ArmorCalculationsEditForm.
   *
   * @param {object} args
   */
  constructor(args) {
    super(args);
    this.config = configs.armorCalculations;
    this.requiresReload = true;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-armor-calculations-edit-form`,
    position: {
      height: 260
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

class ArmorCalculationsForm extends ConfigForm {
  /**
   * Constructor for ArmorCalculationsForm.
   */
  constructor() {
    super();
    this.editForm = ArmorCalculationsEditForm;
    this.listTitle = `CUSTOM_DND5E.form.${constants.ID}.listTitle`;
    this.requiresReload = false;
    this.config = configs.armorCalculations;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-armor-calculations-form`,
    window: {
      title: `CUSTOM_DND5E.form.${constants.ID}.title`
    }
  };
}

/* -------------------------------------------- */
/*  DEFINITION                                  */
/* -------------------------------------------- */

export default {
  configKey: "armorClasses",
  hookName: "customDnd5e.setArmorCalculationsConfig",
  constants,
  form: ArmorCalculationsForm,
  configRequiresReload: true,
  entryType: "object",
  entry: [
    { key: "formula" },
    { key: "label", localize: true }
  ]
};
