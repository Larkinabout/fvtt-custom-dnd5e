import { registerConfig } from "./config-engine.js";
import { MODULE } from "../constants.js";
import { getSetting } from "../utils.js";
import { ConfigForm } from "../forms/config-form.js";
import { ConfigEditForm } from "../forms/config-edit-form.js";
import { configs } from "./registry.js";

/* -------------------------------------------- */
/*  CONSTANTS                                   */
/* -------------------------------------------- */

const constants = {
  ID: "movementTypes",
  MENU: {
    KEY: "movement-types-menu",
    HINT: "CUSTOM_DND5E.menu.movementTypes.hint",
    ICON: "fas fa-person-running",
    LABEL: "CUSTOM_DND5E.menu.movementTypes.label",
    NAME: "CUSTOM_DND5E.menu.movementTypes.name"
  },
  SETTING: {
    ENABLE: {
      KEY: "enable-movement-types"
    },
    CONFIG: {
      KEY: "movement-types"
    }
  },
  UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.B48iqFBddUikMMer.JournalEntryPage.eB8rvEuqHwPK8NXd"
};

/* -------------------------------------------- */

/**
 * Whether a movement type is a custom type (not a built-in dnd5e type).
 * @param {{key: string}} args
 * @returns {boolean}
 */
function isCustomMovementType({ key }) {
  return !(key in (CONFIG.CUSTOM_DND5E?.movementTypes ?? {}));
}

/* -------------------------------------------- */
/*  FORM CLASSES                                */
/* -------------------------------------------- */

class MovementTypesEditForm extends ConfigEditForm {
  /**
   * @param {object} args
   */
  constructor(args) {
    super(args);
    this.config = configs.movementTypes;
    this.requiresReload = true;
  }

  /* -------------------------------------------- */

  /**
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-movement-types-edit-form`,
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
      name: "icon",
      type: "text",
      label: "CUSTOM_DND5E.form.movementTypes.icon.label",
      hint: "CUSTOM_DND5E.form.movementTypes.icon.hint",
      placeholder: "fa-solid fa-person-running"
    },
    {
      name: "img",
      type: "filePicker",
      label: "CUSTOM_DND5E.form.movementTypes.img.label",
      hint: "CUSTOM_DND5E.form.movementTypes.img.hint"
    },
    {
      name: "travel",
      type: "select",
      label: "CUSTOM_DND5E.form.movementTypes.travel.label",
      hint: "CUSTOM_DND5E.form.movementTypes.travel.hint",
      choices: {
        land: "CUSTOM_DND5E.form.movementTypes.travel.land",
        air: "CUSTOM_DND5E.form.movementTypes.travel.air",
        water: "CUSTOM_DND5E.form.movementTypes.travel.water"
      },
      localizeChoices: true
    },
    {
      name: "walkFallback",
      type: "checkbox",
      label: "CUSTOM_DND5E.form.movementTypes.walkFallback.label",
      hint: "CUSTOM_DND5E.form.movementTypes.walkFallback.hint"
    },
    {
      name: "hidden",
      type: "checkbox",
      label: "CUSTOM_DND5E.form.movementTypes.hidden.label",
      hint: "CUSTOM_DND5E.form.movementTypes.hidden.hint"
    },
    {
      name: "teleport",
      type: "checkbox",
      label: "CUSTOM_DND5E.form.movementTypes.teleport.label",
      hint: "CUSTOM_DND5E.form.movementTypes.teleport.hint",
      condition: isCustomMovementType
    },
    {
      name: "costMultiplier",
      type: "number",
      label: "CUSTOM_DND5E.form.movementTypes.costMultiplier.label",
      hint: "CUSTOM_DND5E.form.movementTypes.costMultiplier.hint",
      step: "any",
      min: 0,
      condition: isCustomMovementType
    }
  ];
}

/* -------------------------------------------- */

class MovementTypesForm extends ConfigForm {
  constructor() {
    super();
    this.editForm = MovementTypesEditForm;
    this.listTitle = `CUSTOM_DND5E.form.${constants.ID}.listTitle`;
    this.requiresReload = true;
    this.config = configs.movementTypes;
  }

  /* -------------------------------------------- */

  /**
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-movement-types-form`,
    window: {
      title: `CUSTOM_DND5E.form.${constants.ID}.title`
    }
  };
}

/* -------------------------------------------- */
/*  REGISTRATION                                */
/* -------------------------------------------- */

/**
 * Register settings and movement actions.
 */
export function register() {
  registerConfig(DEFINITION);
  registerMovementActions();
}

/* -------------------------------------------- */

/**
 * Register custom movement types as Token movement actions so they appear in the Token HUD.
 */
function registerMovementActions() {
  if ( !getSetting(DEFINITION.constants.SETTING.ENABLE.KEY) ) return;

  const actions = CONFIG.Token?.movement?.actions;
  const movementTypes = getSetting(DEFINITION.constants.SETTING.CONFIG.KEY);
  if ( !actions || !movementTypes ) return;

  let order = 0;
  for ( const [key, value] of Object.entries(movementTypes) ) {
    if ( value?.visible === false ) continue;

    const existing = actions[key];
    if ( existing ) {
      if ( value.icon ) existing.icon = value.icon;
      if ( value.img ) existing.img = value.img;
      existing.order = order++;
      continue;
    }

    const action = {
      label: value.label || key,
      icon: value.icon || "fa-solid fa-person-running",
      img: value.img || null,
      order: order++
    };

    if ( value.teleport ) {
      action.teleport = true;
      action.speedMultiplier = Infinity;
      action.terrainAction = null;
    }

    const costMultiplier = Number(value.costMultiplier);
    if ( `${value.costMultiplier ?? ""}`.trim() !== "" && Number.isFinite(costMultiplier) ) {
      action.costMultiplier = costMultiplier;
    }

    actions[key] = action;
  }

  for ( const [key, config] of Object.entries(actions) ) {
    if ( !(key in movementTypes) ) config.order = order++;
  }
}

/* -------------------------------------------- */
/*  DEFINITION                                  */
/* -------------------------------------------- */

const DEFINITION = {
  configKey: "movementTypes",
  constants,
  form: MovementTypesForm,
  configRequiresReload: true,
  entryType: "object",
  entry: [
    { key: "label", localize: true },
    { key: "travel", conditional: "defined" },
    { key: "walkFallback", conditional: "defined" },
    { key: "hidden", conditional: "defined" }
  ]
};
export default DEFINITION;
