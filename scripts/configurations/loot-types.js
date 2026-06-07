import { MODULE } from "../constants.js";
import { ConfigForm } from "../forms/config-form.js";
import { configs } from "./registry.js";

/* -------------------------------------------- */
/*  CONSTANTS                                   */
/* -------------------------------------------- */

const constants = {
  ID: "lootTypes",
  MENU: {
    KEY: "loot-types-menu",
    HINT: "CUSTOM_DND5E.menu.lootTypes.hint",
    ICON: "fas fa-treasure-chest",
    LABEL: "CUSTOM_DND5E.menu.lootTypes.label",
    NAME: "CUSTOM_DND5E.menu.lootTypes.name"
  },
  SETTING: {
    ENABLE: {
      KEY: "enable-loot-types"
    },
    CONFIG: {
      KEY: "loot-types"
    }
  },
  UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.B48iqFBddUikMMer.JournalEntryPage.Jly3oGH0ntybdpBu"
};

/* -------------------------------------------- */
/*  FORM CLASSES                                */
/* -------------------------------------------- */

class LootTypesForm extends ConfigForm {
  /**
   * Constructor for ItemRarityForm.
   */
  constructor() {
    super();
    this.editInList = true;
    this.listTitle = `CUSTOM_DND5E.form.${constants.ID}.listTitle`;
    this.requiresReload = false;
    this.config = configs.lootTypes;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-loot-types-form`,
    window: {
      title: `CUSTOM_DND5E.form.${constants.ID}.title`
    }
  };
}

/* -------------------------------------------- */
/*  DEFINITION                                  */
/* -------------------------------------------- */

export default {
  configKey: "lootTypes",
  constants,
  form: LootTypesForm,
  loadTemplates: false,
  entryType: "object",
  entry: [
    { key: "label", localize: true, transform: (v, data) => v || data }
  ]
};
