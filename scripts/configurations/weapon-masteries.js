import { MODULE } from "../constants.js";
import { ConfigForm } from "../forms/config-form.js";
import { ConfigEditForm } from "../forms/config-edit-form.js";
import { configs } from "./registry.js";

/* -------------------------------------------- */
/*  CONSTANTS                                   */
/* -------------------------------------------- */

const constants = {
  ID: "weapon-masteries",
  MENU: {
    KEY: "weapon-masteries-menu",
    HINT: "CUSTOM_DND5E.menu.weaponMasteries.hint",
    ICON: "fas fa-hand-fist",
    LABEL: "CUSTOM_DND5E.menu.weaponMasteries.label",
    NAME: "CUSTOM_DND5E.menu.weaponMasteries.name"
  },
  SETTING: {
    ENABLE: {
      KEY: "enable-weapon-masteries"
    },
    CONFIG: {
      KEY: "weapon-masteries"
    }
  },
  TEMPLATE: {
    EDIT: "modules/custom-dnd5e/templates/weapon-masteries-edit.hbs",
    FORM: "modules/custom-dnd5e/templates/config-form.hbs",
    LIST: "modules/custom-dnd5e/templates/config-list.hbs"
  },
  UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.B48iqFBddUikMMer.JournalEntryPage.wM3kTpNxR7vYhD9c"
};

/* -------------------------------------------- */
/*  FORM CLASSES                                */
/* -------------------------------------------- */

class WeaponMasteriesEditForm extends ConfigEditForm {
  /**
   * Constructor for WeaponMasteriesEditForm.
   * @param {object} args
   */
  constructor(args) {
    super(args);
    this.config = configs.weaponMasteries;
    this.requiresReload = true;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-weapon-masteries-edit-form`,
    position: {
      height: 260
    },
    window: {
      title: "CUSTOM_DND5E.form.weaponMasteries.edit.title"
    }
  };

  /* -------------------------------------------- */

  /**
   * Parts of the form.
   * @type {object}
   */
  static PARTS = {
    form: {
      template: constants.TEMPLATE.EDIT
    }
  };
}

/* -------------------------------------------- */

class WeaponMasteriesForm extends ConfigForm {
  /**
   * Constructor for WeaponMasteriesForm.
   */
  constructor() {
    super();
    this.editForm = WeaponMasteriesEditForm;
    this.listTitle = "CUSTOM_DND5E.form.weaponMasteries.listTitle";
    this.requiresReload = false;
    this.config = configs.weaponMasteries;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-weapon-masteries-form`,
    window: {
      title: "CUSTOM_DND5E.form.weaponMasteries.title"
    }
  };
}

/* -------------------------------------------- */
/*  DEFINITION                                  */
/* -------------------------------------------- */

export default {
  configKey: "weaponMasteries",
  constants,
  form: WeaponMasteriesForm,
  configRequiresReload: true,
  entryType: "object",
  entry: [
    { key: "label", localize: true },
    { key: "reference" }
  ]
};
