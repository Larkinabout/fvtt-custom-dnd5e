import {
  checkEmpty,
  registerMenu as c5eRegisterMenu,
  getSetting,
  registerSetting,
  resetDnd5eConfig,
  resetSetting } from "../utils.js";
import { MODULE } from "../constants.js";
import { ConfigForm } from "../forms/config-form.js";
import { ConfigEditForm } from "../forms/config-edit-form.js";
import { configs } from "./registry.js";

/* -------------------------------------------- */
/*  CONSTANTS                                   */
/* -------------------------------------------- */

export const constants = {
  ID: "conditionEffects",
  MENU: {
    KEY: "condition-effects-menu",
    HINT: "CUSTOM_DND5E.menu.conditionEffects.hint",
    ICON: "fas fa-bolt",
    LABEL: "CUSTOM_DND5E.menu.conditionEffects.label",
    NAME: "CUSTOM_DND5E.menu.conditionEffects.name"
  },
  SETTING: {
    ENABLE: {
      KEY: "enable-condition-effects"
    },
    CONFIG: {
      KEY: "condition-effects"
    }
  },
  UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.B48iqFBddUikMMer.JournalEntryPage.GFGyxJBgpdj0hXb8"
};
export const configKey = "conditionEffects";

/* -------------------------------------------- */
/*  FORM CLASSES                                */
/* -------------------------------------------- */

/**
 * @extends ConfigEditForm
 */
class ConditionEffectsEditForm extends ConfigEditForm {
  /**
   * Constructor.
   * @param {object} args
   */
  constructor(args) {
    super(args);
    this.config = configs.conditionEffects;
  }

  /* -------------------------------------------- */

  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-condition-effects-edit`,
    window: {
      title: `CUSTOM_DND5E.form.${constants.ID}.edit.title`
    }
  };

  /* -------------------------------------------- */

  /**
   * Default CSS class applied to field labels.
   * @type {string}
   */
  static LABEL_CLASS = "custom-dnd5e-edit-label-wide";

  /* -------------------------------------------- */

  /**
   * @type {object[]}
   */
  static FIELDS = [
    { name: "name", type: "text", label: "CUSTOM_DND5E.name", localizeValue: true },
    { name: "triggers", type: "multiSelect", label: "CUSTOM_DND5E.triggers",
      hint: "CUSTOM_DND5E.conditionEffects.exhaustionHint", choices: "triggers" }
  ];

  /* -------------------------------------------- */

  /**
   * Get the select options for the form.
   * @returns {object} Select options
   */
  _getSelects() {
    const statuses = Object.fromEntries(
      CONFIG.statusEffects.map(statusEffect => [statusEffect.id, statusEffect.name])
    );
    const exhaustion = Object.fromEntries(
      [1, 2, 3, 4, 5, 6].map(n => [
        `exhaustion-${n}`,
        game.i18n.format("CUSTOM_DND5E.conditionEffects.exhaustionLevel", { n })
      ])
    );
    return { triggers: { ...statuses, ...exhaustion } };
  }
}

/* -------------------------------------------- */

/**
 * @extends ConfigForm
 */
class ConditionEffectsForm extends ConfigForm {
  /**
   * Constructor.
   */
  constructor() {
    super();
    this.editForm = ConditionEffectsEditForm;
    this.label = "CUSTOM_DND5E.name";
    this.listTitle = "CUSTOM_DND5E.form.conditionEffects.listTitle";
    this.includeConfig = false;
    this.disableCreate = true;
    this.requiresReload = false;
    this.config = configs.conditionEffects;
  }

  /* -------------------------------------------- */

  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-condition-effects-form`,
    window: {
      title: `CUSTOM_DND5E.form.${constants.ID}.title`
    }
  };

  /* -------------------------------------------- */

  /**
   * Merge stored data with current defaults.
   * @returns {Promise<object>} Context data
   */
  async _prepareContext() {
    const context = await super._prepareContext();
    context.items = foundry.utils.mergeObject(getSettingDefault(), context.items ?? {}, { inplace: false });
    return context;
  }
}

/* -------------------------------------------- */
/*  REGISTRATION                                */
/* -------------------------------------------- */

/**
 * Register settings.
 */
export function register() {
  registerSettings();
}

/* -------------------------------------------- */

/**
 * Register menu.
 */
export function registerMenu() {
  c5eRegisterMenu(
    constants.MENU.KEY,
    {
      hint: game.i18n.localize(constants.MENU.HINT),
      label: game.i18n.localize(constants.MENU.LABEL),
      name: game.i18n.localize(constants.MENU.NAME),
      icon: constants.MENU.ICON,
      type: ConditionEffectsForm,
      restricted: true,
      scope: "world"
    }
  );
}

/* -------------------------------------------- */

/**
 * Register settings.
 */
function registerSettings() {
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
      type: Object,
      default: getSettingDefault()
    }
  );
}

/* -------------------------------------------- */
/*  CONFIG                                      */
/* -------------------------------------------- */

/**
 * Get the default setting data.
 * @param {string|null} key Effect key, or null for all
 * @returns {object} Setting data
 */
export function getSettingDefault(key = null) {
  const conditionEffects = CONFIG.CUSTOM_DND5E.conditionEffects ?? {};
  const make = k => ({
    name: `CUSTOM_DND5E.conditionEffect.${k}`,
    triggers: [...(conditionEffects[k] ?? [])],
    visible: true
  });

  if ( key ) return make(key);
  return Object.fromEntries(Object.keys(conditionEffects).map(k => [k, make(k)]));
}

/* -------------------------------------------- */

/**
 * Reset config and setting to their default values.
 */
export async function resetConfigSetting() {
  await resetDnd5eConfig(configKey);
  await resetSetting(constants.SETTING.CONFIG.KEY);
}

/* -------------------------------------------- */

/**
 * Set CONFIG.DND5E.conditionEffects.
 * @param {object} [data]
 */
export function setConfig(data) {
  if ( !getSetting(constants.SETTING.ENABLE.KEY) ) return;
  data ??= getSetting(constants.SETTING.CONFIG.KEY);
  if ( checkEmpty(data) ) return;

  const conditionEffects = CONFIG.CUSTOM_DND5E.conditionEffects ?? {};

  for ( const [key, entry] of Object.entries(data) ) {
    if ( entry?.visible === false ) continue;

    const desired = new Set(entry?.triggers ?? []);
    const original = new Set(conditionEffects[key] ?? []);

    let live = CONFIG.DND5E.conditionEffects[key];
    if ( !(live instanceof Set) ) {
      live = CONFIG.DND5E.conditionEffects[key] = new Set(original);
    }

    for ( const trigger of desired ) {
      if ( !original.has(trigger) ) live.add(trigger);
    }
    for ( const trigger of original ) {
      if ( !desired.has(trigger) ) live.delete(trigger);
    }
  }

  Hooks.callAll("customDnd5e.setConditionEffectsConfig", CONFIG.DND5E.conditionEffects);
}
