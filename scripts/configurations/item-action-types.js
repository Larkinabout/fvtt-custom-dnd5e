import { registerConfig } from "./config-engine.js";
import { MODULE } from "../constants.js";
import { ConfigForm } from "../forms/config-form.js";
import { configs } from "./registry.js";

/* -------------------------------------------- */
/*  CONSTANTS                                   */
/* -------------------------------------------- */

const constants = {
  ID: "itemActionTypes",
  MENU: {
    KEY: "item-action-types-menu",
    HINT: "CUSTOM_DND5E.menu.itemActionTypes.hint",
    ICON: "fas fa-pen-to-square",
    LABEL: "CUSTOM_DND5E.menu.itemActionTypes.label",
    NAME: "CUSTOM_DND5E.menu.itemActionTypes.name"
  },
  SETTING: {
    ENABLE: {
      KEY: "enable-item-actions-types"
    },
    CONFIG: {
      KEY: "item-action-types"
    }
  },
  UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.B48iqFBddUikMMer.JournalEntryPage.Ubzow5wKgOUEXYJw"
};

/* -------------------------------------------- */
/*  FORM CLASSES                                */
/* -------------------------------------------- */

class ItemActionTypesForm extends ConfigForm {
  /**
   * Constructor for ItemActionTypesForm.
   */
  constructor() {
    super();
    this.listTitle = `CUSTOM_DND5E.form.${constants.ID}.listTitle`;
    this.requiresReload = false;
    this.config = configs.itemActionTypes;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-item-action-types-form`,
    window: {
      title: `CUSTOM_DND5E.form.${constants.ID}.title`
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
  configKey: "itemActionTypes",
  constants,
  form: ItemActionTypesForm,
  loadTemplates: false,
  entryType: "scalar",
  entry: { source: "labelOrSelf", localize: true }
};
export default DEFINITION;
