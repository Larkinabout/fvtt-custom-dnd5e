import { CONSTANTS, MODULE } from "../constants.js";
import { ConfigForm, IdForm } from "../forms/config-form.js";
import { configs } from "./registry.js";

/* -------------------------------------------- */
/*  CONSTANTS                                   */
/* -------------------------------------------- */

const constants = {
  ID: "armorIds",
  MENU: {
    KEY: "armor-ids-menu",
    HINT: "CUSTOM_DND5E.menu.armorIds.hint",
    ICON: "fas fa-shield-halved",
    LABEL: "CUSTOM_DND5E.menu.armorIds.label",
    NAME: "CUSTOM_DND5E.menu.armorIds.name"
  },
  SETTING: {
    ENABLE: {
      KEY: "enable-armor-ids"
    },
    CONFIG: {
      KEY: "armor-ids"
    }
  },
  UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.B48iqFBddUikMMer.JournalEntryPage.ehZqnZslXx3cknv9"
};

/* -------------------------------------------- */
/*  FORM CLASSES                                */
/* -------------------------------------------- */

class ArmorIdsForm extends IdForm {
  /**
   * Constructor for ArmorIdsForm.
   */
  constructor() {
    super();
    this.editInList = true;
    this.listTitle = `CUSTOM_DND5E.form.${constants.ID}.listTitle`;
    this.requiresReload = true;
    this.config = configs.armorIds;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-armor-ids-form`,
    window: {
      title: `CUSTOM_DND5E.form.${constants.ID}.title`
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
      template: CONSTANTS.CONFIG.TEMPLATE.FORM
    }
  };
}

/* -------------------------------------------- */
/*  DEFINITION                                  */
/* -------------------------------------------- */

export default {
  configKey: "armorIds",
  constants,
  form: ArmorIdsForm,
  loadTemplates: false,
  entryType: "scalar",
  entry: { source: "labelOrSelf", localize: true }
};
