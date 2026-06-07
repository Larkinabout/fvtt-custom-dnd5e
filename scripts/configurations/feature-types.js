import { MODULE } from "../constants.js";
import { ConfigForm } from "../forms/config-form.js";
import { configs } from "./registry.js";

/* -------------------------------------------- */
/*  CONSTANTS                                   */
/* -------------------------------------------- */

const constants = {
  ID: "featureTypes",
  MENU: {
    KEY: "feature-types-menu",
    HINT: "CUSTOM_DND5E.menu.featureTypes.hint",
    ICON: "fas fa-list",
    LABEL: "CUSTOM_DND5E.menu.featureTypes.label",
    NAME: "CUSTOM_DND5E.menu.featureTypes.name"
  },
  SETTING: {
    ENABLE: {
      KEY: "enable-feature-types"
    },
    CONFIG: {
      KEY: "feature-types"
    }
  },
  UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.B48iqFBddUikMMer.JournalEntryPage.dgX7G9bkLoEif6pk"
};

/* -------------------------------------------- */
/*  FORM CLASSES                                */
/* -------------------------------------------- */

class FeatureTypesForm extends ConfigForm {
  /**
   * Constructor for FeatureTypesForm.
   */
  constructor() {
    super();
    this.editInList = true;
    this.listTitle = `CUSTOM_DND5E.form.${constants.ID}.listTitle`;
    this.nestable = true;
    this.nestType = "subtypes";
    this.requiresReload = false;
    this.config = configs.featureTypes;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-feature-types-form`,
    window: {
      title: `CUSTOM_DND5E.form.${constants.ID}.title`
    }
  };
}

/* -------------------------------------------- */
/*  DEFINITION                                  */
/* -------------------------------------------- */

export default {
  configKey: "featureTypes",
  constants,
  form: FeatureTypesForm,
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
