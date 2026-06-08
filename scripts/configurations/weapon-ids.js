import { CONSTANTS, MODULE } from "../constants.js";
import { IdForm } from "../forms/config-form.js";
import { configs } from "./registry.js";

/* -------------------------------------------- */
/*  CONSTANTS                                   */
/* -------------------------------------------- */

const constants = {
  MENU: {
    KEY: "weapon-ids-menu",
    HINT: "CUSTOM_DND5E.menu.weaponIds.hint",
    ICON: "fas fa-sword",
    LABEL: "CUSTOM_DND5E.menu.weaponIds.label",
    NAME: "CUSTOM_DND5E.menu.weaponIds.name"
  },
  SETTING: {
    ENABLE: {
      KEY: "enable-weapon-ids"
    },
    CONFIG: {
      KEY: "weapon-ids"
    }
  },
  UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.B48iqFBddUikMMer.JournalEntryPage.CeUiNZoH8giNsqNR"
};

/* -------------------------------------------- */
/*  FORM CLASSES                                */
/* -------------------------------------------- */

class WeaponIdsForm extends IdForm {
  /**
   * Constructor for WeaponIdsForm.
   */
  constructor() {
    super();
    this.editInList = true;
    this.listTitle = "CUSTOM_DND5E.form.weaponIds.listTitle";
    this.requiresReload = true;
    this.config = configs.weaponIds;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-weapon-ids-form`,
    window: {
      title: "CUSTOM_DND5E.form.weaponIds.title"
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
  configKey: "weaponIds",
  constants,
  form: WeaponIdsForm,
  loadTemplates: false,
  entryType: "scalar",
  entry: { source: "labelOrSelf", localize: true }
};
