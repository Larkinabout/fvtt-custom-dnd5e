import {
  c5eLoadTemplates,
  checkEmpty,
  getDefaultDnd5eConfig,
  getSetting,
  registerMenu,
  registerSetting,
  resetDnd5eConfig,
  resetSetting } from "../utils.js";
import { MODULE } from "../constants.js";
import { ConfigForm } from "../forms/config-form.js";
import { ConfigEditForm } from "../forms/config-edit-form.js";
import { register as registerCustomRestDialog, getCustomRestDialog } from "../forms/custom-rest-dialog.js";
import { configs } from "./registry.js";

/* -------------------------------------------- */
/*  CONSTANTS                                   */
/* -------------------------------------------- */

export const constants = {
  ID: "rest-types",
  MENU: {
    KEY: "rest-types-menu",
    HINT: "CUSTOM_DND5E.menu.restTypes.hint",
    ICON: "fas fa-bed",
    LABEL: "CUSTOM_DND5E.menu.restTypes.label",
    NAME: "CUSTOM_DND5E.menu.restTypes.name"
  },
  SETTING: {
    ENABLE: {
      KEY: "enable-rest-types"
    },
    CONFIG: {
      KEY: "rest-types"
    }
  },
  TEMPLATE: {
    EDIT: "modules/custom-dnd5e/templates/rest-types-edit.hbs"
  },
  UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.B48iqFBddUikMMer.JournalEntryPage.rT4kYmNpV3tZbW9x"
};
export const configKey = "restTypes";

/* -------------------------------------------- */
/*  FORM CLASSES                                */
/* -------------------------------------------- */

/**
 * Per-rest-type edit form.
 * @extends ConfigEditForm
 */
class RestTypesEditForm extends ConfigEditForm {
  /**
   * Constructor for RestTypesEditForm.
   * @param {object} args
   */
  constructor(args) {
    super(args);
    this.config = configs.restTypes;
    this.requiresReload = true;
  }

  /* -------------------------------------------- */

  /**
   * Get the select options for the form.
   * @returns {object} Select options
   */
  _getSelects() {
    const activationPeriods = Object.fromEntries(
      Object.entries(CONFIG.DND5E.activityActivationTypes)
        .map(([key, value]) => [key, value.label])
    );

    const recoverPeriods = Object.fromEntries(
      Object.entries(CONFIG.DND5E.limitedUsePeriods)
        .filter(([, value]) => !value.deprecated)
        .map(([key, value]) => [key, value.label])
    );

    const recoverSpellSlotTypes = Object.fromEntries(
      Object.entries(CONFIG.DND5E.spellcasting)
        .filter(([, value]) => value.type)
        .map(([key, value]) => [key, value.label])
    );

    return { activationPeriods, recoverPeriods, recoverSpellSlotTypes };
  }

  /* -------------------------------------------- */

  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-rest-types-edit-form`,
    position: {
      height: 600
    },
    window: {
      title: "CUSTOM_DND5E.form.restTypes.edit.title"
    }
  };

  /* -------------------------------------------- */

  static PARTS = {
    form: {
      template: constants.TEMPLATE.EDIT
    }
  };
}

/* -------------------------------------------- */

/**
 * Rest types settings menu form.
 * @extends ConfigForm
 */
class RestTypesForm extends ConfigForm {
  /**
   * Constructor for RestTypesForm.
   */
  constructor() {
    super();
    this.editForm = RestTypesEditForm;
    this.listTitle = "CUSTOM_DND5E.form.restTypes.listTitle";
    this.requiresReload = true;
    this.config = configs.restTypes;
  }

  /* -------------------------------------------- */

  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-rest-types-form`,
    window: {
      title: "CUSTOM_DND5E.form.restTypes.title"
    }
  };
}

/* -------------------------------------------- */
/*  REGISTRATION                                */
/* -------------------------------------------- */

/**
 * Register settings and load templates.
 */
export function register() {
  registerCustomRestDialog();
  registerSettings();

  const templates = [
    constants.TEMPLATE.EDIT
  ];
  c5eLoadTemplates(templates);
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
      type: RestTypesForm,
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
      type: Object,
      default: normaliseDefault(getSettingDefault())
    }
  );
}

/* -------------------------------------------- */
/*  CONFIG                                      */
/* -------------------------------------------- */

/**
 * Normalise the default config.
 * @param {object} defaults Default config
 * @returns {object} Normalised default config
 */
function normaliseDefault(defaults) {
  const normalised = foundry.utils.deepClone(defaults);
  for ( const value of Object.values(normalised) ) {
    if ( value.recoverSpellSlotTypes instanceof Set ) {
      value.recoverSpellSlotTypes = [...value.recoverSpellSlotTypes];
    }
    if ( value.duration ) {
      value.durationNormal = value.duration.normal;
      value.durationGritty = value.duration.gritty;
      value.durationEpic = value.duration.epic;
      delete value.duration;
    }
    delete value.dialogClass;
  }
  return normalised;
}

/* -------------------------------------------- */

/**
 * Get default config.
 * @param {string|null} key Key
 * @returns {object} Config data
 */
export function getSettingDefault(key = null) {
  return getDefaultDnd5eConfig(configKey, key);
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
 * Set CONFIG.DND5E.restTypes.
 * @param {object} [settingData=null]
 * @returns {void}
 */
export function setConfig(settingData) {
  if ( !getSetting(constants.SETTING.ENABLE.KEY) ) return;
  settingData ??= getSetting(constants.SETTING.CONFIG.KEY);
  if ( checkEmpty(settingData) ) return handleEmptyData();

  const mergedSettingData = foundry.utils.mergeObject(
    foundry.utils.mergeObject(settingData, normaliseDefault(CONFIG.DND5E[configKey]), { overwrite: false }),
    normaliseDefault(getSettingDefault()),
    { overwrite: false }
  );

  const configData = buildConfig(mergedSettingData);

  Hooks.callAll("customDnd5e.setRestTypesConfig", configData);

  if ( configData ) {
    CONFIG.DND5E[configKey] = configData;
    registerHooks(configData);
  }
}

/* -------------------------------------------- */

/**
 * Handle empty data.
 */
function handleEmptyData() {
  if ( checkEmpty(CONFIG.DND5E[configKey]) ) {
    resetDnd5eConfig(configKey);
  }
}

/* -------------------------------------------- */

/**
 * Build config.
 * @param {object} settingData
 * @returns {object} Config data
 */
function buildConfig(settingData) {
  return Object.fromEntries(
    Object.keys(settingData)
      .filter(key => settingData[key].visible || settingData[key].visible === undefined)
      .map(key => [key, buildConfigEntry(key, settingData[key])])
  );
}

/* -------------------------------------------- */

/**
 * Register a dynamic rest result chat message translation.
 * @param {string} key
 * @param {string} label
 * @returns {string} Translation key
 */
function registerRestResultMessage(key, label) {
  const translationKey = `CUSTOM_DND5E.restResult.${key}`;
  foundry.utils.setProperty(game.i18n.translations, translationKey, `{name} takes a ${label}.`);
  return translationKey;
}

/* -------------------------------------------- */

/**
 * Build config entry.
 * @param {string} key
 * @param {object} data
 * @returns {object} Config entry
 */
function buildConfigEntry(key, data) {
  const originalConfig = CONFIG.CUSTOM_DND5E[configKey]?.[key];

  return {
    label: game.i18n.localize(data.label),
    icon: data.icon,
    duration: {
      normal: Number(data.durationNormal) || originalConfig?.duration?.normal || 0,
      gritty: Number(data.durationGritty) || originalConfig?.duration?.gritty || 0,
      epic: Number(data.durationEpic) || originalConfig?.duration?.epic || 0
    },
    chat: registerRestResultMessage(key, game.i18n.localize(data.label)),
    dialogClass: getCustomRestDialog(),
    hitDice: data.hitDice ?? originalConfig?.hitDice ?? (key === "short"),
    newDay: data.newDay ?? originalConfig?.newDay ?? false,
    ...(data.hint !== undefined && { hint: data.hint }),
    ...(data.advanceBastionTurn !== undefined && { advanceBastionTurn: data.advanceBastionTurn }),
    ...(data.activationPeriods !== undefined && { activationPeriods: data.activationPeriods }),
    ...(data.recoverPeriods !== undefined && { recoverPeriods: data.recoverPeriods }),
    ...(data.recoverSpellSlotTypes !== undefined && { recoverSpellSlotTypes: new Set(data.recoverSpellSlotTypes) }),
    ...(data.spellSlotFraction !== undefined && { spellSlotFraction: Number(data.spellSlotFraction) }),
    ...(data.exhaustionDelta !== undefined && { exhaustionDelta: Number(data.exhaustionDelta) }),
    ...(data.recoverHitDice !== undefined && { recoverHitDice: data.recoverHitDice }),
    ...(data.hitDiceFormula !== undefined && data.hitDiceFormula !== "" && { hitDiceFormula: String(data.hitDiceFormula) }),
    ...(data.hitDiceRoundUp !== undefined && { hitDiceRoundUp: !!data.hitDiceRoundUp }),
    ...(data.recoverHitPoints !== undefined && { recoverHitPoints: data.recoverHitPoints }),
    ...(data.hitPointsFraction !== undefined && { hitPointsFraction: Number(data.hitPointsFraction) }),
    ...(data.recoverTemp !== undefined && { recoverTemp: data.recoverTemp }),
    ...(data.recoverTempMax !== undefined && { recoverTempMax: data.recoverTempMax })
  };
}

/* -------------------------------------------- */
/*  REST HOOKS                                  */
/* -------------------------------------------- */

const hookIds = new Map();

/**
 * Register hooks for custom rest type behaviour.
 * @param {object} configData
 */
function registerHooks(configData) {
  unregisterHooks();
  registerHitDiceRecoveryHooks(configData);
  registerHitPointsFractionHook(configData);
  registerSpellSlotFractionHook(configData);
}

/* -------------------------------------------- */

/**
 * Unregister all previously registered hooks.
 */
function unregisterHooks() {
  for ( const [hookName, hookId] of hookIds ) {
    Hooks.off(hookName, hookId);
  }
  hookIds.clear();
}

/* -------------------------------------------- */

/**
 * Register hooks to override Hit Dice recovery.
 * @param {object} configData
 */
function registerHitDiceRecoveryHooks(configData) {
  for ( const [type, restType] of Object.entries(configData) ) {
    if ( !restType.hitDiceFormula ) continue;
    const hookName = `dnd5e.${type}Rest`;
    const id = Hooks.on(hookName, (actor, config) => {
      const recovered = evaluateHitDiceFormula(restType.hitDiceFormula, actor, restType.hitDiceRoundUp);
      if ( recovered === null ) return;
      const hd = actor?.system?.attributes?.hd;
      const max = (hd?.spent ?? hd?.max ?? recovered);
      config.maxHitDice = Math.max(0, Math.min(recovered, max));
    });
    hookIds.set(hookName, id);
  }
}

/* -------------------------------------------- */

/**
 * Evaluate a Hit Dice recovery formula against an actor's roll data.
 * @param {string} formula
 * @param {Actor} actor
 * @param {boolean} roundUp Whether to round the result up
 * @returns {number|null} Number of HD to recover
 */
function evaluateHitDiceFormula(formula, actor, roundUp) {
  try {
    const rollData = actor?.getRollData() ?? {};
    const result = new Roll(formula, rollData).evaluateSync({ strict: false }).total;
    if ( !Number.isFinite(result) ) return null;
    return roundUp ? Math.ceil(result) : Math.floor(result);
  } catch {
    return null;
  }
}

/* -------------------------------------------- */

/**
 * Register hooks to apply fractional recovery to Hit Points.
 * @param {object} configData
 */
function registerHitPointsFractionHook(configData) {
  const hasHpFraction = Object.values(configData).some(r =>
    r.hitPointsFraction !== undefined && r.hitPointsFraction !== 1
  );
  if ( !hasHpFraction ) return;

  const id = Hooks.on("dnd5e.preRestCompleted", (actor, result, config) => {
    const restType = CONFIG.DND5E.restTypes[config.type];
    if ( !restType?.recoverHitPoints ) return;
    if ( restType.hitPointsFraction === undefined || restType.hitPointsFraction >= 1 ) return;
    const hp = actor.system.attributes?.hp;
    if ( !hp ) return;
    const max = hp.effectiveMax ?? hp.max;
    const recovered = Math.min(Math.floor(max * restType.hitPointsFraction), max - hp.value);
    result.updateData["system.attributes.hp.value"] = hp.value + recovered;
    result.deltas.hitPoints = recovered;
  });
  hookIds.set("dnd5e.preRestCompleted.hp", id);
}

/* -------------------------------------------- */

/**
 * Register hook to apply fractional recovery to Spell Slots.
 * @param {object} configData
 */
function registerSpellSlotFractionHook(configData) {
  const hasSpellFraction = Object.values(configData).some(r =>
    r.spellSlotFraction !== undefined && r.spellSlotFraction !== 1
  );
  if ( !hasSpellFraction ) return;

  const id = Hooks.on("dnd5e.preRestCompleted", (actor, result, config) => {
    const restType = CONFIG.DND5E.restTypes[config.type];
    if ( !restType?.recoverSpellSlotTypes?.size ) return;
    if ( restType.spellSlotFraction === undefined || restType.spellSlotFraction >= 1 ) return;
    const spells = actor.system.spells;
    if ( !spells ) return;
    for ( const [key, slot] of Object.entries(spells) ) {
      if ( !restType.recoverSpellSlotTypes.has(slot.type) ) continue;
      if ( !slot.max ) continue;
      const recovered = Math.max(1, Math.floor(slot.max * restType.spellSlotFraction));
      result.updateData[`system.spells.${key}.value`] = Math.min(slot.max, slot.value + recovered);
    }
  });
  hookIds.set("dnd5e.preRestCompleted.spells", id);
}
