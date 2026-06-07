import { registerConfig } from "./config-engine.js";
import { MODULE } from "../constants.js";
import { ConfigForm } from "../forms/config-form.js";
import { configs } from "./registry.js";

/* -------------------------------------------- */
/*  CONSTANTS                                   */
/* -------------------------------------------- */

const constants = {
  ID: "item-activation-cost-types",
  MENU: {
    KEY: "item-activation-cost-types-menu",
    HINT: "CUSTOM_DND5E.menu.itemActivationCostTypes.hint",
    ICON: "fas fa-pen-to-square",
    LABEL: "CUSTOM_DND5E.menu.itemActivationCostTypes.label",
    NAME: "CUSTOM_DND5E.menu.itemActivationCostTypes.name"
  },
  SETTING: {
    ENABLE: {
      KEY: "enable-item-activation-cost-types"
    },
    CONFIG: {
      KEY: "item-activation-cost-types"
    }
  },
  UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.B48iqFBddUikMMer.JournalEntryPage.uFxtCCVz8Ow95cUL"
};

/* -------------------------------------------- */
/*  FORM CLASSES                                */
/* -------------------------------------------- */

class ItemActivationCostTypesForm extends ConfigForm {
  /**
   * Constructor for ItemActivationCostTypesForm.
   */
  constructor() {
    super();
    this.listTitle = "CUSTOM_DND5E.form.itemActivationCostTypes.listTitle";
    this.requiresReload = false;
    this.config = configs.itemActivationCostTypes;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-item-activation-cost-types-form`,
    window: {
      title: "CUSTOM_DND5E.form.itemActivationCostTypes.title"
    }
  };
}

/* -------------------------------------------- */

/* -------------------------------------------- */

/**
 * Register settings.
 */
export function register() {
  if ( foundry.utils.isNewerVersion(game.dnd5e.version, "3.3.1") ) return;
  registerConfig(DEFINITION);
}

/* -------------------------------------------- */
/*  DEFINITION                                  */
/* -------------------------------------------- */

const DEFINITION = {
  configKey: "abilityActivationTypes",
  hookName: "customDnd5e.setItemActivationCostTypesConfig",
  constants,
  form: ItemActivationCostTypesForm,
  loadTemplates: false,
  entryType: "scalar",
  entry: { source: "labelOrSelf", localize: true }
};
export default DEFINITION;
