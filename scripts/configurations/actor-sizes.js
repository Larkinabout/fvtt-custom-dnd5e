import { MODULE } from "../constants.js";
import { ConfigForm } from "../forms/config-form.js";
import { ConfigEditForm } from "../forms/config-edit-form.js";
import { configs } from "./registry.js";

/* -------------------------------------------- */
/*  CONSTANTS                                   */
/* -------------------------------------------- */

const constants = {
  ID: "actorSizes",
  MENU: {
    KEY: "actor-sizes-menu",
    HINT: "CUSTOM_DND5E.menu.actorSizes.hint",
    ICON: "fas fa-arrow-up-big-small",
    LABEL: "CUSTOM_DND5E.menu.actorSizes.label",
    NAME: "CUSTOM_DND5E.menu.actorSizes.name"
  },
  SETTING: {
    ENABLE: {
      KEY: "enable-actor-sizes"
    },
    CONFIG: {
      KEY: "actor-sizes"
    }
  },
  TEMPLATE: {
    EDIT: "modules/custom-dnd5e/templates/actor-sizes-edit.hbs"
  },
  UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.B48iqFBddUikMMer.JournalEntryPage.V3QbxNviHsZd8Ssb"
};

/* -------------------------------------------- */
/*  FORM CLASSES                                */
/* -------------------------------------------- */

class ActorSizesEditForm extends ConfigEditForm {
  /**
   * Constructor for ActorSizesEditForm.
   *
   * @param {object} args
   */
  constructor(args) {
    super(args);
    this.config = configs.actorSizes;
    this.requiresReload = true;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-actor-sizes-edit-form`,
    position: {
      height: 460
    },
    window: {
      title: `CUSTOM_DND5E.form.${constants.ID}.edit.title`
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
      template: constants.TEMPLATE.EDIT
    }
  };
}

/* -------------------------------------------- */

class ActorSizesForm extends ConfigForm {
  /**
   * Constructor for ActorSizesForm.
   */
  constructor() {
    super();
    this.editForm = ActorSizesEditForm;
    this.listTitle = `CUSTOM_DND5E.form.${constants.ID}.listTitle`;
    this.requiresReload = false;
    this.config = configs.actorSizes;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-actor-sizes-form`,
    window: {
      title: `CUSTOM_DND5E.form.${constants.ID}.title`
    }
  };
}

/* -------------------------------------------- */
/*  DEFINITION                                  */
/* -------------------------------------------- */

export default {
  configKey: "actorSizes",
  constants,
  form: ActorSizesForm,
  entryType: "object",
  entry: [
    { key: "abbreviation", localize: true },
    { key: "capacityMultiplier", conditional: "defined" },
    { key: "hitDie" },
    { key: "dynamicTokenScale", conditional: "defined" },
    { key: "label", localize: true },
    { key: "token", conditional: "defined" }
  ]
};
