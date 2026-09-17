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
  UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.B48iqFBddUikMMer.JournalEntryPage.V3QbxNviHsZd8Ssb"
};

/* -------------------------------------------- */
/*  FORM CLASSES                                */
/* -------------------------------------------- */

class ActorSizesEditForm extends ConfigEditForm {
  /**
   * @param {object} args
   */
  constructor(args) {
    super(args);
    this.config = configs.actorSizes;
    this.requiresReload = true;
  }

  /* -------------------------------------------- */

  /**
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-actor-sizes-edit-form`,
    window: {
      title: `CUSTOM_DND5E.form.${constants.ID}.edit.title`
    }
  };

  /* -------------------------------------------- */

  /**
   * Default CSS class applied to field labels.
   * @type {string}
   */
  static LABEL_CLASS = "custom-dnd5e-edit-label-fixed-lg";

  /* -------------------------------------------- */

  /**
   * @type {object[]}
   */
  static FIELDS = [
    { name: "fullKey", type: "text", label: "CUSTOM_DND5E.fullKey", localizeValue: true,
      hint: "CUSTOM_DND5E.form.actorSizes.fullKey.hint" },
    { name: "label", type: "text", label: "CUSTOM_DND5E.label", localizeValue: true },
    { name: "abbreviation", type: "text", label: "CUSTOM_DND5E.abbreviation", localizeValue: true },
    { name: "numerical", type: "number", label: "CUSTOM_DND5E.numericalSize", step: 1,
      hint: "CUSTOM_DND5E.form.actorSizes.numerical.hint" },
    { name: "hitDie", type: "number", label: "CUSTOM_DND5E.hitDie", step: 1,
      hint: "CUSTOM_DND5E.form.actorSizes.hitDie.hint" },
    { name: "token", type: "number", label: "CUSTOM_DND5E.tokenSize", step: 0.05,
      hint: "CUSTOM_DND5E.form.actorSizes.token.hint" },
    { name: "dynamicTokenScale", type: "number", label: "CUSTOM_DND5E.dynamicTokenScale", step: 0.05,
      hint: "CUSTOM_DND5E.form.actorSizes.dynamicTokenScale.hint" },
    { name: "capacityMultiplier", type: "number", label: "CUSTOM_DND5E.capacityMultiplier", step: 0.05,
      hint: "CUSTOM_DND5E.form.actorSizes.capacityMultiplier.hint" }
  ];
}

/* -------------------------------------------- */

class ActorSizesForm extends ConfigForm {
  constructor() {
    super();
    this.editForm = ActorSizesEditForm;
    this.listTitle = `CUSTOM_DND5E.form.${constants.ID}.listTitle`;
    this.requiresReload = false;
    this.config = configs.actorSizes;
  }

  /* -------------------------------------------- */

  /**
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
    { key: "fullKey", conditional: "defined" },
    { key: "label", localize: true },
    { key: "numerical", conditional: "defined" },
    { key: "token", conditional: "defined" }
  ]
};
