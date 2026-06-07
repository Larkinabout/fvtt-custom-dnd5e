import { MODULE } from "../constants.js";
import { ConfigForm } from "../forms/config-form.js";
import { configs } from "./registry.js";

/* -------------------------------------------- */
/*  CONSTANTS                                   */
/* -------------------------------------------- */

const constants = {
  ID: "itemRarity",
  MENU: {
    KEY: "item-rarity-menu",
    HINT: "CUSTOM_DND5E.menu.itemRarity.hint",
    ICON: "fas fa-gem",
    LABEL: "CUSTOM_DND5E.menu.itemRarity.label",
    NAME: "CUSTOM_DND5E.menu.itemRarity.name"
  },
  SETTING: {
    ENABLE: {
      KEY: "enable-item-rarity"
    },
    CONFIG: {
      KEY: "item-rarity"
    }
  },
  UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.B48iqFBddUikMMer.JournalEntryPage.FIMLwqJ6ACWHbuDJ"
};

/* -------------------------------------------- */
/*  FORM CLASSES                                */
/* -------------------------------------------- */

class ItemRarityForm extends ConfigForm {
  /**
   * Constructor for ItemRarityForm.
   */
  constructor() {
    super();
    this.editInList = true;
    this.listTitle = `CUSTOM_DND5E.form.${constants.ID}.listTitle`;
    this.requiresReload = false;
    this.config = configs.itemRarity;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-item-rarity-form`,
    window: {
      title: `CUSTOM_DND5E.form.${constants.ID}.title`
    }
  };
}

/* -------------------------------------------- */
/*  DEFINITION                                  */
/* -------------------------------------------- */

export default {
  configKey: "itemRarity",
  constants,
  form: ItemRarityForm,
  loadTemplates: false,
  entryType: "scalar",
  entry: { source: "labelOrSelf", localize: true }
};
