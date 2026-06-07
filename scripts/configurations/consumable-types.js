import { MODULE } from "../constants.js";
import { ConfigForm } from "../forms/config-form.js";
import { configs } from "./registry.js";

/* -------------------------------------------- */
/*  CONSTANTS                                   */
/* -------------------------------------------- */

const constants = {
  ID: "consumableTypes",
  MENU: {
    KEY: "consumable-types-menu",
    HINT: "CUSTOM_DND5E.menu.consumableTypes.hint",
    ICON: "fas fa-flask-round-potion",
    LABEL: "CUSTOM_DND5E.menu.consumableTypes.label",
    NAME: "CUSTOM_DND5E.menu.consumableTypes.name"
  },
  SETTING: {
    ENABLE: {
      KEY: "enable-consumable-types"
    },
    CONFIG: {
      KEY: "consumable-types"
    }
  },
  UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.B48iqFBddUikMMer.JournalEntryPage.OgMhctYM5NFh8neL"
};

/* -------------------------------------------- */
/*  FORM CLASSES                                */
/* -------------------------------------------- */

class ConsumableTypesForm extends ConfigForm {
  /**
   * Constructor for ConsumableTypesForm.
   */
  constructor() {
    super();
    this.editInList = true;
    this.listTitle = `CUSTOM_DND5E.form.${constants.ID}.listTitle`;
    this.nestable = true;
    this.nestType = "subtypes";
    this.requiresReload = false;
    this.config = configs.consumableTypes;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-consumable-types-form`,
    window: {
      title: `CUSTOM_DND5E.form.${constants.ID}.title`
    }
  };
}

/* -------------------------------------------- */
/*  DEFINITION                                  */
/* -------------------------------------------- */

export default {
  configKey: "consumableTypes",
  constants,
  form: ConsumableTypesForm,
  loadTemplates: false,
  entryType: "object",
  entry: [
    { key: "label", localize: true, transform: (v, data) => v || data },
    { key: "subtypes", conditional: "defined", children: {
      entryType: "scalar",
      entry: { source: "labelOrSelf", localize: true }
    } }
  ]
};
