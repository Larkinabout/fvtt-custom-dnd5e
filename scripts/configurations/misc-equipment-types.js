import { MODULE } from "../constants.js";
import { ConfigForm } from "../forms/config-form.js";
import { configs } from "./registry.js";

/* -------------------------------------------- */
/*  CONSTANTS                                   */
/* -------------------------------------------- */

const constants = {
  ID: "miscEquipmentTypes",
  MENU: {
    KEY: "misc-equipment-types-menu",
    HINT: "CUSTOM_DND5E.menu.miscEquipmentTypes.hint",
    ICON: "fas fa-ring-diamond",
    LABEL: "CUSTOM_DND5E.menu.miscEquipmentTypes.label",
    NAME: "CUSTOM_DND5E.menu.miscEquipmentTypes.name"
  },
  SETTING: {
    ENABLE: {
      KEY: "enable-misc-equipment-types"
    },
    CONFIG: {
      KEY: "misc-equipment-types"
    }
  },
  UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.B48iqFBddUikMMer.JournalEntryPage.koB9uAZtQ9f2n1f8"
};

/* -------------------------------------------- */
/*  FORM CLASSES                                */
/* -------------------------------------------- */

class MiscEquipmentTypesForm extends ConfigForm {
  /**
   * Constructor for MiscEquipmentTypesForm.
   */
  constructor() {
    super();
    this.editInList = true;
    this.listTitle = "CUSTOM_DND5E.form.miscEquipmentTypes.listTitle";
    this.requiresReload = false;
    this.config = configs.miscEquipmentTypes;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-equipment-types-form`,
    window: {
      title: "CUSTOM_DND5E.form.miscEquipmentTypes.title"
    }
  };
}

/* -------------------------------------------- */
/*  DEFINITION                                  */
/* -------------------------------------------- */

export default {
  configKey: "miscEquipmentTypes",
  hookName: "customDnd5e.setEquipmentTypesConfig",
  constants,
  form: MiscEquipmentTypesForm,
  loadTemplates: false,
  entryType: "scalar",
  entry: { source: "labelOrSelf", localize: true }
};
