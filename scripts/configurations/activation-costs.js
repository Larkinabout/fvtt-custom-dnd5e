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
  UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.B48iqFBddUikMMer.JournalEntryPage.LehHpGOmEbRQ4day"
};

/* -------------------------------------------- */
/*  FORM CLASSES                                */
/* -------------------------------------------- */

class ActivationCostsEditForm extends ConfigEditForm {
  /**
   * @param {object} args
   */
  constructor(args) {
    super(args);
    this.config = configs.activationCosts;
    this.requiresReload = true;
  }

  /* -------------------------------------------- */

  /**
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-activation-costs-edit-form`,
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
    { name: "group", type: "text", label: "CUSTOM_DND5E.group", localizeValue: true },
    { name: "scalar", type: "checkbox", label: "CUSTOM_DND5E.scalar" }
  ];
}

/* -------------------------------------------- */

class ActivationCostsForm extends ConfigForm {
  constructor() {
    super();
    this.editForm = ActivationCostsEditForm;
    this.listTitle = `CUSTOM_DND5E.form.${constants.ID}.listTitle`;
    this.requiresReload = false;
    this.config = configs.activationCosts;
  }

  /* -------------------------------------------- */

  /**
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
/*  REGISTRATION                                */
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
