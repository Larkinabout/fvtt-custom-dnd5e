import { MODULE } from "../constants.js";
import { ConfigForm } from "../forms/config-form.js";
import { ConfigEditForm } from "../forms/config-edit-form.js";
import { configs } from "./registry.js";

/* -------------------------------------------- */
/*  CONSTANTS                                   */
/* -------------------------------------------- */

const constants = {
  ID: "skills",
  MENU: {
    KEY: "skills-menu",
    HINT: "CUSTOM_DND5E.menu.skills.hint",
    ICON: "fas fa-person-running-fast",
    LABEL: "CUSTOM_DND5E.menu.skills.label",
    NAME: "CUSTOM_DND5E.menu.skills.name"
  },
  SETTING: {
    ENABLE: {
      KEY: "enable-skills"
    },
    CONFIG: {
      KEY: "skills"
    }
  },
  UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.B48iqFBddUikMMer.JournalEntryPage.0SCQdu9sYAjcDqAk"
};

/* -------------------------------------------- */
/*  FORM CLASSES                                */
/* -------------------------------------------- */

class SkillsEditForm extends ConfigEditForm {
  /**
   * @param {object} args
   */
  constructor(args) {
    super(args);
    this.config = configs.skills;
    this.requiresReload = true;
  }

  /* -------------------------------------------- */

  /**
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-skills-edit-form`,
    window: {
      title: "CUSTOM_DND5E.form.skills.edit.title"
    }
  };

  /* -------------------------------------------- */

  /**
   * @type {object[]}
   */
  static FIELDS = [
    { fields: [
      { name: "fullKey", type: "text", label: "CUSTOM_DND5E.fullKey", localizeValue: true,
        hint: "CUSTOM_DND5E.form.skills.fullKey.hint" },
      { name: "label", type: "text", label: "CUSTOM_DND5E.label", localizeValue: true },
      { name: "ability", type: "text", label: "CUSTOM_DND5E.ability", hint: "CUSTOM_DND5E.form.skills.ability.hint" },
      { name: "icon", type: "filePicker", label: "CUSTOM_DND5E.icon" },
      { name: "reference", type: "text", label: "CUSTOM_DND5E.reference",
        hint: "CUSTOM_DND5E.form.skills.reference.hint" },
      { name: "rollMode", type: "select", label: "CUSTOM_DND5E.rollMode", choices: "rollMode", localizeChoices: true,
        hint: "CUSTOM_DND5E.form.skills.rollMode.hint" }
    ] },
    { legend: "CUSTOM_DND5E.form.skills.pace.legend", fields: [
      { name: "pace.advantage", type: "multiSelect", label: "CUSTOM_DND5E.advantage",
        hint: "CUSTOM_DND5E.form.skills.pace.advantageHint", choices: "travelPace" },
      { name: "pace.disadvantage", type: "multiSelect", label: "CUSTOM_DND5E.disadvantage",
        hint: "CUSTOM_DND5E.form.skills.pace.disadvantageHint", choices: "travelPace" }
    ] }
  ];

  /* -------------------------------------------- */

  /**
   * Get the select options for the form.
   *
   * @returns {object} Select options
   */
  _getSelects() {
    return {
      rollMode: {
        choices: {
          default: "CUSTOM_DND5E.default",
          blindroll: "CHAT.MODES.blind",
          gmroll: "CHAT.MODES.gm",
          publicroll: "CHAT.MODES.public",
          selfroll: "CHAT.MODES.self"
        }
      },
      travelPace: Object.fromEntries(
        Object.entries(CONFIG.DND5E.travelPace ?? {}).map(([key, { label }]) => [key, label])
      )
    };
  }
}

/* -------------------------------------------- */

class SkillsForm extends ConfigForm {
  constructor() {
    super();
    this.editForm = SkillsEditForm;
    this.listTitle = "CUSTOM_DND5E.form.skills.listTitle";
    this.requiresReload = true;
    this.config = configs.skills;
  }

  /* -------------------------------------------- */

  /**
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-skills-form`,
    window: {
      title: "CUSTOM_DND5E.form.skills.title"
    }
  };
}

/* -------------------------------------------- */
/*  DEFINITION                                  */
/* -------------------------------------------- */

/**
 * Travel pace modes.
 * @type {string[]}
 */
const PACE_MODES = ["advantage", "disadvantage"];

/* -------------------------------------------- */

/**
 * Convert a pace list into a Set.
 * @param {Set<string>|string[]} value
 * @returns {Set<string>}
 */
function toPaceSet(value) {
  return new Set(value);
}

/* -------------------------------------------- */

/**
 * Convert the pace Sets on a skill entry to arrays so the entry can be stored as JSON.
 * @param {object} entry
 * @returns {object}
 */
function normalisePace(entry) {
  if ( entry?.pace ) {
    const pace = {};
    for ( const mode of PACE_MODES ) {
      if ( entry.pace[mode] !== undefined ) pace[mode] = [...entry.pace[mode]];
    }
    entry.pace = pace;
  }
  return entry;
}

/* -------------------------------------------- */

/**
 * Build stored pace data into Sets.
 * @param {object|undefined} value
 * @param {object|undefined} fallback
 * @returns {object|undefined}
 */
function buildPace(value, fallback) {
  const pace = {};
  for ( const mode of PACE_MODES ) {
    const stored = value?.[mode];
    const hasStored = stored instanceof Set || Array.isArray(stored);
    if ( hasStored ) pace[mode] = toPaceSet(stored);
    else if ( fallback?.[mode] !== undefined ) pace[mode] = toPaceSet(fallback[mode]);
  }
  const hasAny = Object.values(pace).some(set => set.size);
  return hasAny ? pace : undefined;
}

/* -------------------------------------------- */

export default {
  configKey: "skills",
  constants,
  form: SkillsForm,
  configRequiresReload: true,
  entryType: "object",
  normaliseDefault: (data, key) => {
    if ( key ) return normalisePace(data);
    Object.values(data ?? {}).forEach(normalisePace);
    return data;
  },
  entry: [
    { key: "ability" },
    { key: "fullKey" },
    { key: "icon" },
    { key: "label", localize: true },
    { key: "pace", conditional: "defined",
      transform: (v, data, key) => buildPace(v, CONFIG.CUSTOM_DND5E?.skills?.[key]?.pace) },
    { key: "reference" },
    { key: "rollMode", default: "default" }
  ]
};
