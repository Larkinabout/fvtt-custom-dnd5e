import { MODULE } from "../constants.js";
import {
  Logger,
  assignDnd5eConfig,
  c5eLoadTemplates,
  checkEmpty,
  getSetting,
  parseInteger,
  registerMenu,
  registerSetting,
  resetSetting,
  setSetting } from "../utils.js";
import { CustomDnd5eForm } from "../forms/custom-dnd5e-form.js";
import { getMaxLevel } from "../gameplay/proficiency-bonus.js";
import { configs } from "./registry.js";

/* -------------------------------------------- */
/*  CONSTANTS                                   */
/* -------------------------------------------- */

export const constants = {
  ID: "spellcasting",
  MENU: {
    KEY: "spellcasting-menu",
    HINT: "CUSTOM_DND5E.menu.spellcasting.hint",
    ICON: "fas fa-wand-sparkles",
    LABEL: "CUSTOM_DND5E.menu.spellcasting.label",
    NAME: "CUSTOM_DND5E.menu.spellcasting.name"
  },
  SETTING: {
    ENABLE: {
      KEY: "enable-spellcasting"
    },
    CONFIG: {
      KEY: "spellcasting"
    }
  },
  TEMPLATE: {
    FORM: "modules/custom-dnd5e/templates/spellcasting/spellcasting-form.hbs"
  },
  UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.B48iqFBddUikMMer.JournalEntryPage.sP3kYmNpV3tZbW2c"
};

/**
 * `CONFIG.DND5E` properties managed by this config.
 * @type {string[]}
 */
export const configKeys = ["spellLevels", "spellScrollIds", "spellcasting"];

const SPELL_LEVELS_TAB = "spellLevels";
const SLOTS_TAB_PREFIX = "slots-";

/* -------------------------------------------- */
/*  SLOT TABLES                                 */
/* -------------------------------------------- */

/**
 * Slot table handlers keyed by the spellcasting method type.
 */
const SLOT_TABLES = {
  multi: {
    getColumns: spellLevels => spellLevels.filter(level => level > 0).map(level => ({
      key: String(level),
      header: level.ordinalString(),
      min: 0
    })),
    getRowCount: table => table.length,
    prepareRows: prepareMultiRows,
    parse: parseMultiTable,
    sanitise: sanitiseMultiTable
  },
  single: {
    getColumns: () => [
      { key: "slots", header: game.i18n.localize("CUSTOM_DND5E.form.spellcasting.slots.slots"), min: 1 },
      { key: "level", header: game.i18n.localize("CUSTOM_DND5E.form.spellcasting.slots.slotLevel"), min: 1 }
    ],
    getRowCount: table => Math.max(0, ...Object.keys(table).map(Number)),
    prepareRows: prepareSingleRows,
    parse: parseSingleTable,
    sanitise: sanitiseSingleTable
  }
};

/* -------------------------------------------- */

/**
 * Prepare the rows of a table holding slots for every spell level.
 * @param {number[][]} table
 * @param {object[]} columns
 * @param {number} rowCount
 * @returns {object[]} Rows of cells with a value and placeholder
 */
function prepareMultiRows(table, columns, rowCount) {
  const rows = [];
  let above = {};

  for ( let casterLevel = 1; casterLevel <= rowCount; casterLevel++ ) {
    const stored = table[casterLevel - 1];
    const resolved = {};
    const cells = columns.map(column => {
      const inherited = above[column.key] ?? 0;
      const slots = stored?.[Number(column.key) - 1];
      resolved[column.key] = stored ? (slots ?? 0) : inherited;
      if ( !stored ) return { key: column.key, value: "", placeholder: inherited || "" };
      if ( slots ) return { key: column.key, value: slots, placeholder: "" };
      return { key: column.key, value: inherited ? 0 : "", placeholder: "" };
    });
    rows.push({ casterLevel, cells });
    above = resolved;
  }

  return rows;
}

/* -------------------------------------------- */

/**
 * Parse the cells of a table holding slots for every spell level.
 * @param {object} cells Cell values keyed by caster level then spell level
 * @param {object[]} columns
 * @returns {{table: number[][], errors: string[]}}
 */
function parseMultiTable(cells, columns) {
  const table = [];
  const errors = [];
  let above = {};

  const casterLevels = Object.keys(cells).map(Number).sort((a, b) => a - b);
  for ( const casterLevel of casterLevels ) {
    const resolved = {};
    for ( const column of columns ) {
      const value = parseInteger(cells[casterLevel][column.key]);
      resolved[column.key] = (value === null) ? (above[column.key] ?? 0) : Math.max(value, 0);
    }

    const row = columns.map(column => resolved[column.key]);
    while ( row.length && !row.at(-1) ) row.pop();
    if ( row.some(slots => !slots) ) {
      errors.push(game.i18n.format("CUSTOM_DND5E.form.spellcasting.slots.gapError", { level: casterLevel }));
    }

    table.push(row);
    above = resolved;
  }

  // Caster levels past the end of the table use the last row
  while ( table.length > 1 && table.at(-1).join() === table.at(-2).join() ) table.pop();

  return { table, errors };
}

/* -------------------------------------------- */

/**
 * Sanitise a table holding slots for every spell level.
 * @param {number[][]} table
 * @returns {number[][]}
 */
function sanitiseMultiTable(table) {
  return Object.values(table ?? {}).map(row => {
    const slots = Object.values(row ?? {}).map(parseInteger);
    const end = slots.findIndex(value => !(value > 0));
    return (end === -1) ? slots : slots.slice(0, end);
  });
}

/* -------------------------------------------- */

/**
 * Prepare the rows of a table holding one slot level.
 * @param {object} table
 * @param {object[]} columns
 * @param {number} rowCount
 * @returns {object[]} Rows of cells with a value and placeholder
 */
function prepareSingleRows(table, columns, rowCount) {
  const rows = [];
  let above = {};

  for ( let casterLevel = 1; casterLevel <= rowCount; casterLevel++ ) {
    const stored = table[casterLevel];
    const cells = columns.map(column => ({
      key: column.key,
      value: stored?.[column.key] ?? "",
      placeholder: stored ? "" : (above[column.key] ?? "")
    }));
    rows.push({ casterLevel, cells });
    if ( stored ) above = stored;
  }

  return rows;
}

/* -------------------------------------------- */

/**
 * Parse the cells of a table holding one slot level.
 * @param {object} cells Cell values keyed by caster level then column
 * @returns {{table: object, errors: string[]}}
 */
function parseSingleTable(cells) {
  const table = {};
  let above = null;

  const casterLevels = Object.keys(cells).map(Number).sort((a, b) => a - b);
  for ( const casterLevel of casterLevels ) {
    const slots = parseInteger(cells[casterLevel].slots);
    const level = parseInteger(cells[casterLevel].level);
    if ( !(slots > 0) && !(level > 0) ) continue;

    const entry = {
      slots: (slots > 0) ? slots : (above?.slots ?? 1),
      level: (level > 0) ? level : (above?.level ?? 1)
    };
    if ( entry.slots === above?.slots && entry.level === above?.level ) continue;

    table[casterLevel] = entry;
    above = entry;
  }

  return { table, errors: [] };
}

/* -------------------------------------------- */

/**
 * Sanitise a table holding one slot level.
 * @param {object} table
 * @returns {object}
 */
function sanitiseSingleTable(table) {
  return Object.fromEntries(
    Object.entries(table ?? {})
      .map(([casterLevel, entry]) => [casterLevel, {
        slots: parseInteger(entry?.slots),
        level: parseInteger(entry?.level)
      }])
      .filter(([casterLevel, entry]) => Number(casterLevel) > 0 && entry.slots > 0 && entry.level > 0)
  );
}

/* -------------------------------------------- */
/*  MAIN FORM                                   */
/* -------------------------------------------- */

/**
 * Spellcasting settings menu form.
 * @extends CustomDnd5eForm
 */
class SpellcastingForm extends CustomDnd5eForm {
  /**
   * Constructor for SpellcastingForm.
   * @param {object} [options={}]
   */
  constructor(options = {}) {
    super(options);
    this.requiresReload = true;
    this.config = configs.spellcasting;
    this.pending = null;
  }

  /* -------------------------------------------- */

  static DEFAULT_OPTIONS = {
    actions: {
      addSpellLevel: SpellcastingForm.addSpellLevel,
      removeSpellLevel: SpellcastingForm.removeSpellLevel,
      reset: SpellcastingForm.reset,
      resetAll: SpellcastingForm.resetAll
    },
    form: {
      handler: SpellcastingForm.submit
    },
    id: `${MODULE.ID}-spellcasting-form`,
    window: {
      title: `CUSTOM_DND5E.form.${constants.ID}.title`
    },
    position: {
      width: 680
    },
    tabGroups: {
      primary: SPELL_LEVELS_TAB
    }
  };

  /* -------------------------------------------- */

  static PARTS = {
    form: {
      template: constants.TEMPLATE.FORM
    }
  };

  /* -------------------------------------------- */
  /*  RENDER CONTEXT                              */
  /* -------------------------------------------- */

  /**
   * Prepare the context for the form.
   * @returns {Promise<object>} Context data
   */
  async _prepareContext() {
    this.setting = this.pending ?? getStoredSetting();

    const spellLevels = this._prepareSpellLevels();
    const slotTables = this._prepareSlotTables(spellLevels.map(row => row.level));

    const context = {
      activeTab: this.tabGroups.primary ?? SPELL_LEVELS_TAB,
      spellLevelsTab: SPELL_LEVELS_TAB,
      spellLevels,
      slotTables,
      tabs: [
        { id: SPELL_LEVELS_TAB, icon: "fa-solid fa-layer-group", label: "CUSTOM_DND5E.form.spellcasting.spellLevels.tab" },
        ...slotTables.map(table => ({ id: table.tab, icon: "fa-solid fa-table-cells", label: table.tabLabel }))
      ]
    };

    if ( this.enableConfigKey ) {
      this.enableConfig = this.pendingEnableConfig ?? getSetting(this.enableConfigKey);
      context.enableConfig = this.enableConfig;
    }

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare the spell level rows. Only the highest level can be removed.
   * @returns {object[]} Spell level rows
   */
  _prepareSpellLevels() {
    const defaults = CONFIG.CUSTOM_DND5E.spellLevels ?? {};
    const levels = getContiguousLevels(this.setting.spellLevels);
    const highest = levels.at(-1);

    return levels.map(level => ({
      level,
      levelLabel: game.i18n.format("CUSTOM_DND5E.form.spellcasting.levelLabel", { value: level }),
      label: game.i18n.localize(this.setting.spellLevels[level]?.label ?? ""),
      removable: (level === highest) && !(level in defaults)
    }));
  }

  /* -------------------------------------------- */

  /**
   * Prepare a slot table for each spellcasting method that grants slots.
   * @param {number[]} spellLevels
   * @returns {object[]} Slot tables
   */
  _prepareSlotTables(spellLevels) {
    return getSlotMethods().map(({ key, type, label }) => {
      const handler = SLOT_TABLES[type];
      const table = this.setting.spellcasting?.[key]?.table ?? getDefaultTable(key, type);
      const columns = handler.getColumns(spellLevels);
      const rowCount = Math.max(getMaxLevel(), handler.getRowCount(table));
      const rows = handler.prepareRows(table, columns, rowCount);

      const minimums = Object.fromEntries(columns.map(column => [column.key, column.min]));
      for ( const row of rows ) {
        row.label = game.i18n.format("CUSTOM_DND5E.form.spellcasting.levelLabel", { value: row.casterLevel });
        for ( const cell of row.cells ) {
          cell.name = `spellcasting.${key}.table.${row.casterLevel}.${cell.key}`;
          cell.min = minimums[cell.key];
        }
      }

      return {
        key,
        type,
        tab: `${SLOTS_TAB_PREFIX}${key}`,
        tabLabel: game.i18n.format("CUSTOM_DND5E.form.spellcasting.slots.tab", { method: label }),
        hint: `CUSTOM_DND5E.form.spellcasting.slots.hint.${type}`,
        columns,
        rows
      };
    });
  }

  /* -------------------------------------------- */
  /*  FORM DATA                                   */
  /* -------------------------------------------- */

  /**
   * Parse the form data into the shape of the stored setting.
   * @param {object} formObject
   * @returns {{setting: object, errors: string[]}}
   */
  _parseFormData(formObject) {
    const data = foundry.utils.expandObject(formObject);
    const setting = foundry.utils.deepClone(this.setting);
    const errors = [];

    const defaults = CONFIG.CUSTOM_DND5E.spellLevels ?? {};
    setting.spellLevels = {};
    for ( const [level, entry] of Object.entries(data.spellLevels ?? {}) ) {
      const label = String(entry.label ?? "").trim();
      const isDefault = (level in defaults) && (!label || label === game.i18n.localize(defaults[level]));
      setting.spellLevels[level] = { label: isDefault ? defaults[level] : label };
      if ( !isDefault && !label ) {
        errors.push(game.i18n.format("CUSTOM_DND5E.form.spellcasting.spellLevels.labelError", { level }));
      }
    }

    const spellLevels = getContiguousLevels(setting.spellLevels);
    setting.spellcasting ??= {};
    for ( const { key, type } of getSlotMethods() ) {
      const cells = data.spellcasting?.[key]?.table;
      if ( !cells ) continue;
      const handler = SLOT_TABLES[type];
      const parsed = handler.parse(cells, handler.getColumns(spellLevels));
      setting.spellcasting[key] = { ...setting.spellcasting[key], table: parsed.table };
      errors.push(...parsed.errors);
    }

    return { setting, errors };
  }

  /* -------------------------------------------- */

  /**
   * Keep unsaved changes so that the form can be rendered again without losing them.
   */
  _capturePending() {
    const formData = new foundry.applications.ux.FormDataExtended(this.form);
    this.pendingEnableConfig = formData.object.enableConfig;
    this.pending = this._parseFormData(formData.object).setting;
  }

  /* -------------------------------------------- */
  /*  ACTIONS                                     */
  /* -------------------------------------------- */

  /**
   * Add a spell level above the highest level.
   */
  static async addSpellLevel() {
    this._capturePending();
    const level = getContiguousLevels(this.pending.spellLevels).length;
    this.pending.spellLevels[level] = {
      label: game.i18n.format("CUSTOM_DND5E.form.spellcasting.spellLevels.newLabel", { ordinal: level.ordinalString() })
    };
    this.render(true);
  }

  /* -------------------------------------------- */

  /**
   * Remove the highest added spell level.
   * @param {Event} event
   * @param {HTMLElement} target
   */
  static async removeSpellLevel(event, target) {
    const level = target.closest("[data-level]")?.dataset.level;
    if ( level === undefined ) return;
    this._capturePending();
    delete this.pending.spellLevels[level];
    this.render(true);
  }

  /* -------------------------------------------- */

  /**
   * Reset the current tab to its default.
   */
  static async reset() {
    const tab = this.tabGroups.primary ?? SPELL_LEVELS_TAB;

    const reset = async () => {
      this._capturePending();
      const defaults = getSettingDefault();
      if ( tab === SPELL_LEVELS_TAB ) {
        this.pending.spellLevels = defaults.spellLevels;
      } else {
        const method = tab.slice(SLOTS_TAB_PREFIX.length);
        this.pending.spellcasting[method] = defaults.spellcasting[method];
      }
      this.render(true);
    };

    await foundry.applications.api.DialogV2.confirm({
      window: {
        title: game.i18n.localize("CUSTOM_DND5E.dialog.reset.title")
      },
      content: `<p>${game.i18n.localize("CUSTOM_DND5E.dialog.reset.content")}</p>`,
      modal: true,
      yes: {
        label: game.i18n.localize("CUSTOM_DND5E.yes"),
        callback: async () => {
          reset();
        }
      },
      no: {
        label: game.i18n.localize("CUSTOM_DND5E.no")
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * Reset every tab to its default.
   */
  static async resetAll() {
    const reset = async () => {
      this._capturePending();
      this.pending = getSettingDefault();
      this.render(true);
    };

    await foundry.applications.api.DialogV2.confirm({
      window: {
        title: game.i18n.localize("CUSTOM_DND5E.dialog.resetAll.title")
      },
      content: `<p>${game.i18n.localize("CUSTOM_DND5E.dialog.resetAll.content")}</p>`,
      modal: true,
      yes: {
        label: game.i18n.localize("CUSTOM_DND5E.yes"),
        callback: async () => {
          reset();
        }
      },
      no: {
        label: game.i18n.localize("CUSTOM_DND5E.no")
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * Submit the form data.
   * @param {Event} event
   * @param {HTMLFormElement} form
   * @param {object} formData
   */
  static async submit(event, form, formData) {
    const { setting, errors } = this._parseFormData(formData.object);
    if ( errors.length ) {
      Logger.error(errors[0], true);
      return;
    }

    this.enableConfig = formData.object.enableConfig;
    await setSetting(this.enableConfigKey, this.enableConfig);

    this.handleSubmit(setting, this.settingKey, this.enableConfig, null, this.requiresReload);
  }
}

/* -------------------------------------------- */
/*  REGISTRATION                                */
/* -------------------------------------------- */

/**
 * Register settings, hooks and templates.
 */
export function register() {
  registerSettings();
  Hooks.once("i18nInit", setSpellLevelTranslations);
  c5eLoadTemplates([constants.TEMPLATE.FORM]);
}

/* -------------------------------------------- */

/**
 * Register settings.
 */
function registerSettings() {
  registerMenu(
    constants.MENU.KEY,
    {
      hint: game.i18n.localize(constants.MENU.HINT),
      label: game.i18n.localize(constants.MENU.LABEL),
      name: game.i18n.localize(constants.MENU.NAME),
      icon: constants.MENU.ICON,
      type: SpellcastingForm,
      restricted: true,
      scope: "world"
    }
  );

  registerSetting(
    constants.SETTING.ENABLE.KEY,
    {
      scope: "world",
      config: false,
      requiresReload: true,
      type: Boolean,
      default: false
    }
  );

  registerSetting(
    constants.SETTING.CONFIG.KEY,
    {
      scope: "world",
      config: false,
      requiresReload: true,
      type: Object,
      default: getSettingDefault()
    }
  );
}

/* -------------------------------------------- */
/*  DEFAULTS & RESET                            */
/* -------------------------------------------- */

/**
 * Get the spell levels that count up from 0 without a gap.
 * @param {object} spellLevels
 * @returns {number[]}
 */
function getContiguousLevels(spellLevels) {
  const levels = [];
  while ( spellLevels?.[levels.length] !== undefined ) levels.push(levels.length);
  return levels;
}

/* -------------------------------------------- */

/**
 * Get the spellcasting methods that grant slots from a table.
 * @returns {{key: string, type: string, label: string}[]}
 */
function getSlotMethods() {
  return Object.entries(CONFIG.DND5E.spellcasting)
    .filter(([, method]) => method.type in SLOT_TABLES)
    .map(([key, method]) => ({ key, type: method.type, label: game.i18n.localize(method.label) }));
}

/* -------------------------------------------- */

/**
 * Get the default slot table for a spellcasting method.
 * @param {string} key
 * @param {string} type
 * @returns {number[][]|object}
 */
function getDefaultTable(key, type) {
  const method = CONFIG.CUSTOM_DND5E.spellcasting?.[key] ?? CONFIG.DND5E.spellcasting[key]?.toObject?.();
  return foundry.utils.deepClone(method?.table) ?? ((type === "multi") ? [] : {});
}

/* -------------------------------------------- */

/**
 * Get the default setting data.
 * @param {string|null} [key=null]
 * @returns {object} Default setting data
 */
export function getSettingDefault(key = null) {
  const spellLevels = Object.fromEntries(
    Object.entries(CONFIG.CUSTOM_DND5E.spellLevels ?? {}).map(([level, label]) => [level, { label }])
  );

  const spellcasting = Object.fromEntries(
    Object.entries(CONFIG.CUSTOM_DND5E.spellcasting ?? {})
      .filter(([, method]) => method.type in SLOT_TABLES)
      .map(([methodKey, method]) => [methodKey, { table: foundry.utils.deepClone(method.table) }])
  );

  const defaults = { spellLevels, spellcasting };
  return key ? foundry.utils.getProperty(defaults, key) : defaults;
}

/* -------------------------------------------- */

/**
 * Get the stored setting with any missing sections filled from the defaults.
 * @returns {object}
 */
function getStoredSetting() {
  const stored = foundry.utils.deepClone(getSetting(constants.SETTING.CONFIG.KEY)) ?? {};
  const defaults = getSettingDefault();
  return {
    ...stored,
    spellLevels: checkEmpty(stored.spellLevels) ? defaults.spellLevels : stored.spellLevels,
    spellcasting: { ...defaults.spellcasting, ...stored.spellcasting }
  };
}

/* -------------------------------------------- */

/**
 * Reset the stored setting to its default.
 */
export async function resetConfigSetting() {
  await resetSetting(constants.SETTING.CONFIG.KEY);
}

/* -------------------------------------------- */
/*  CONFIG                                      */
/* -------------------------------------------- */

/**
 * Set the spellcasting configs.
 * @param {object} [settingData=null]
 * @returns {void}
 */
export function setConfig(settingData) {
  if ( !getSetting(constants.SETTING.ENABLE.KEY) ) return;
  settingData ??= getSetting(constants.SETTING.CONFIG.KEY);
  if ( checkEmpty(settingData) ) return;

  setSpellLevels(settingData.spellLevels);
  setSpellcastingMethods(settingData.spellcasting);
}

/* -------------------------------------------- */

/**
 * Set CONFIG.DND5E.spellLevels.
 * @param {object} spellLevels
 */
function setSpellLevels(spellLevels) {
  if ( checkEmpty(spellLevels) ) return;

  const defaults = CONFIG.CUSTOM_DND5E.spellLevels ?? {};
  const merged = { ...Object.fromEntries(Object.entries(defaults).map(([level, label]) => [level, { label }])) };
  for ( const [level, entry] of Object.entries(spellLevels) ) {
    if ( entry?.label ) merged[level] = entry;
  }

  const levels = getContiguousLevels(merged);
  assignDnd5eConfig("spellLevels", Object.fromEntries(levels.map(level => [level, merged[level].label])));

  const scrollIds = CONFIG.DND5E.spellScrollIds;
  const highestScroll = Math.max(...Object.keys(scrollIds ?? {}).map(Number));
  if ( !Number.isFinite(highestScroll) ) return;
  for ( const level of levels ) scrollIds[level] ??= scrollIds[highestScroll];
}

/* -------------------------------------------- */

/**
 * Apply stored data to the methods in CONFIG.DND5E.spellcasting.
 * @param {object} methods Stored data by spellcasting method
 */
function setSpellcastingMethods(methods) {
  if ( checkEmpty(methods) ) return;

  for ( const [key, data] of Object.entries(methods) ) {
    const method = CONFIG.DND5E.spellcasting[key];
    if ( !method ) continue;

    if ( method instanceof foundry.abstract.DataModel ) {
      Logger.error(`Spellcasting method '${key}' was not customised because the system has already built it`);
      continue;
    }

    const handler = SLOT_TABLES[method.type];
    if ( handler && data?.table ) method.table = handler.sanitise(data.table);
  }
}

/* -------------------------------------------- */

/**
 * Add translations the system looks up by spell level for levels that were added or renamed.
 */
function setSpellLevelTranslations() {
  if ( !getSetting(constants.SETTING.ENABLE.KEY) ) return;

  const stored = getSetting(constants.SETTING.CONFIG.KEY)?.spellLevels ?? {};
  const defaults = CONFIG.CUSTOM_DND5E.spellLevels ?? {};
  const multiMethods = Object.entries(CONFIG.DND5E.spellcasting)
    .filter(([, method]) => method.type === "multi")
    .map(([key]) => key);

  for ( const [level, label] of Object.entries(CONFIG.DND5E.spellLevels) ) {
    const renamed = (stored[level]?.label !== undefined) && (stored[level].label !== defaults[level]);
    const keys = [`DND5E.SpellLevel${level}`];
    if ( Number(level) > 0 ) keys.push(...multiMethods.map(key => `DND5E.SPELLCASTING.SLOTS.${key}${level}`));

    for ( const key of keys ) {
      if ( renamed || !game.i18n.has(key) ) foundry.utils.setProperty(game.i18n.translations, key, label);
    }
  }
}
