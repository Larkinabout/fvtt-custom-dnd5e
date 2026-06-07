import { registerConfig } from "./config-engine.js";
import { MODULE } from "../constants.js";
import { ConfigForm } from "../forms/config-form.js";
import { ConfigEditForm } from "../forms/config-edit-form.js";
import { configs } from "./registry.js";

/* -------------------------------------------- */
/*  CONSTANTS                                   */
/* -------------------------------------------- */

const constants = {
  ID: "activationCosts",
  MENU: {
    KEY: "activation-costs-menu",
    HINT: "CUSTOM_DND5E.menu.activityActivationTypes.hint",
    ICON: "fas fa-clock",
    LABEL: "CUSTOM_DND5E.menu.activityActivationTypes.label",
    NAME: "CUSTOM_DND5E.menu.activityActivationTypes.name"
  },
  SETTING: {
    ENABLE: {
      KEY: "enable-activation-costs"
    },
    CONFIG: {
      KEY: "activation-costs"
    }
  },
  TEMPLATE: {
    EDIT: "modules/custom-dnd5e/templates/activation-costs-edit.hbs",
    FORM: "modules/custom-dnd5e/templates/config-form.hbs",
    LIST: "modules/custom-dnd5e/templates/config-list.hbs"
  },
  UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.B48iqFBddUikMMer.JournalEntryPage.LehHpGOmEbRQ4day"
};

/* -------------------------------------------- */
/*  FORM CLASSES                                */
/* -------------------------------------------- */

class ActivationCostsEditForm extends ConfigEditForm {
  /**
   * Constructor for ActivationCostsEditForm.
   *
   * @param {object} args
   */
  constructor(args) {
    super(args);
    this.config = configs.activationCosts;
    this.requiresReload = true;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-activation-costs-edit-form`,
    position: {
      height: 300
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

class ActivationCostsForm extends ConfigForm {
  /**
   * Constructor for ActivationCostsForm.
   */
  constructor() {
    super();
    this.editForm = ActivationCostsEditForm;
    this.listTitle = `CUSTOM_DND5E.form.${constants.ID}.listTitle`;
    this.requiresReload = false;
    this.config = configs.activationCosts;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-activation-costs-form`,
    window: {
      title: `CUSTOM_DND5E.form.${constants.ID}.title`
    }
  };
}

/* -------------------------------------------- */

/* -------------------------------------------- */

/**
 * Register settings and load templates.
 */
export function register() {
  if ( !foundry.utils.isNewerVersion(game.dnd5e.version, "3.3.1") ) return;
  registerConfig(DEFINITION);
}

/* -------------------------------------------- */
/*  DEFINITION                                  */
/* -------------------------------------------- */

const DEFINITION = {
  configKey: "activityActivationTypes",
  hookName: "customDnd5e.setActivationCostsConfig",
  constants,
  form: ActivationCostsForm,
  entryType: "object",
  entry: [
    { key: "group", conditional: "defined" },
    { key: "label", localize: true },
    { key: "scalar", conditional: "defined" }
  ]
};
export default DEFINITION;
