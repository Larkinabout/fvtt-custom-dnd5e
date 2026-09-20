import { MODULE } from "../constants.js";
import { ConfigForm } from "../forms/config-form.js";
import { ConfigEditForm } from "../forms/config-edit-form.js";
import { configs } from "./registry.js";

/* -------------------------------------------- */
/*  CONSTANTS                                   */
/* -------------------------------------------- */

const constants = {
  ID: "senses",
  MENU: {
    KEY: "senses-menu",
    HINT: "CUSTOM_DND5E.menu.senses.hint",
    ICON: "fas fa-eye",
    LABEL: "CUSTOM_DND5E.menu.senses.label",
    NAME: "CUSTOM_DND5E.menu.senses.name"
  },
  SETTING: {
    ENABLE: {
      KEY: "enable-senses"
    },
    CONFIG: {
      KEY: "senses"
    }
  },
  UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.B48iqFBddUikMMer.JournalEntryPage.UC0cWoAGMtU6yISR"
};

/* -------------------------------------------- */

/**
 * Build select choices from a canvas mode registry.
 * @param {object} registry `CONFIG.Canvas.visionModes` or `CONFIG.Canvas.detectionModes`
 * @returns {object} Choices keyed by mode id
 */
function getCanvasModeChoices(registry) {
  const choices = Object.values(registry ?? {})
    .filter(mode => mode.tokenConfig)
    .map(mode => [mode.id, game.i18n.localize(mode.label)])
    .sort(([, a], [, b]) => a.localeCompare(b, game.i18n.lang));

  return { "": game.i18n.localize("CUSTOM_DND5E.none"), ...Object.fromEntries(choices) };
}

/* -------------------------------------------- */
/*  FORM CLASSES                                */
/* -------------------------------------------- */

class SensesEditForm extends ConfigEditForm {
  /**
   * Constructor for SensesEditForm.
   * @param {object} args
   */
  constructor(args) {
    super(args);
    this.config = configs.senses;
    this.requiresReload = true;
  }

  /* -------------------------------------------- */

  /**
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-senses-edit-form`,
    window: {
      title: `CUSTOM_DND5E.form.${constants.ID}.edit.title`
    }
  };

  /* -------------------------------------------- */

  /**
   * @type {object[]}
   */
  static FIELDS = [
    { name: "label", type: "text", label: "CUSTOM_DND5E.label", localizeValue: true },
    {
      name: "grantsSight",
      type: "checkbox",
      label: `CUSTOM_DND5E.form.${constants.ID}.grantsSight.label`,
      hint: `CUSTOM_DND5E.form.${constants.ID}.grantsSight.hint`
    },
    {
      name: "visionMode",
      type: "select",
      label: `CUSTOM_DND5E.form.${constants.ID}.visionMode.label`,
      hint: `CUSTOM_DND5E.form.${constants.ID}.visionMode.hint`,
      choices: () => getCanvasModeChoices(CONFIG.Canvas?.visionModes)
    },
    {
      name: "detectionMode",
      type: "select",
      label: `CUSTOM_DND5E.form.${constants.ID}.detectionMode.label`,
      hint: `CUSTOM_DND5E.form.${constants.ID}.detectionMode.hint`,
      choices: () => getCanvasModeChoices(CONFIG.Canvas?.detectionModes)
    }
  ];
}

/* -------------------------------------------- */

class SensesForm extends ConfigForm {
  /**
   * Constructor for SensesForm.
   */
  constructor() {
    super();
    this.editForm = SensesEditForm;
    this.listTitle = "CUSTOM_DND5E.form.senses.listTitle";
    this.requiresReload = true;
    this.config = configs.senses;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-senses-form`,
    window: {
      title: "CUSTOM_DND5E.form.senses.title"
    }
  };
}

/* -------------------------------------------- */
/*  DEFINITION                                  */
/* -------------------------------------------- */

/**
 * Resolve a sense property.
 * @param {string} property
 * @returns {(value: *, data: *, key: string) => *}
 */
const senseProperty = property => (value, data, key) => {
  if ( value === undefined ) return CONFIG.CUSTOM_DND5E?.senses?.[key]?.[property];
  return (value === "" || value === null) ? undefined : value;
};

/* -------------------------------------------- */

const DEFINITION = {
  configKey: "senses",
  constants,
  form: SensesForm,
  configRequiresReload: true,
  entryType: "object",
  entry: [
    {
      key: "label",
      localize: true,
      required: true,
      transform: (value, data) => value ?? (typeof data === "string" ? data : undefined)
    },
    { key: "grantsSight", transform: senseProperty("grantsSight") },
    { key: "visionMode", transform: senseProperty("visionMode") },
    { key: "detectionMode", transform: senseProperty("detectionMode") }
  ]
};
export default DEFINITION;
