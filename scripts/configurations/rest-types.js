import {
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
  ID: "restTypes",
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
   * @param {object} args
   */
  constructor(args) {
    super(args);
    this.config = configs.restTypes;
    this.requiresReload = true;
  }

  /* -------------------------------------------- */

  /**
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-rest-types-edit-form`,
    window: {
      title: `CUSTOM_DND5E.form.${constants.ID}.edit.title`
    }
  };

  /* -------------------------------------------- */

  /**
   * @type {object[]}
   */
  static FIELDS = [
    {
      legend: "CUSTOM_DND5E.general",
      fields: [
        { name: "label", type: "text", label: "CUSTOM_DND5E.label", localizeValue: true,
          labelClass: "custom-dnd5e-edit-label-flex2" },
        { name: "icon", type: "text", label: "CUSTOM_DND5E.icon", placeholder: "fa-solid fa-bench-tree",
          labelClass: "custom-dnd5e-edit-label-flex2" },
        { name: "hint", type: "textarea", label: "CUSTOM_DND5E.restHint.label", hint: "CUSTOM_DND5E.restHint.hint",
          labelClass: "custom-dnd5e-edit-label-flex2" }
      ]
    },
    {
      legend: "CUSTOM_DND5E.durationMinutes",
      fields: [
        { name: "durationGritty", type: "number", label: "CUSTOM_DND5E.gritty", step: 1, min: 0,
          labelClass: "custom-dnd5e-edit-label-flex2" },
        { name: "durationNormal", type: "number", label: "CUSTOM_DND5E.normal", step: 1, min: 0,
          labelClass: "custom-dnd5e-edit-label-flex2" },
        { name: "durationEpic", type: "number", label: "CUSTOM_DND5E.epic", step: 1, min: 0,
          labelClass: "custom-dnd5e-edit-label-flex2" }
      ]
    },
    {
      legend: "CUSTOM_DND5E.restBehaviour",
      fields: [
        { name: "newDay", type: "checkbox", label: "CUSTOM_DND5E.newDay.label",
          hint: "CUSTOM_DND5E.newDay.hint", labelClass: "custom-dnd5e-edit-label-flex2" },
        { name: "advanceBastionTurn", type: "checkbox", label: "CUSTOM_DND5E.advanceBastionTurn.label",
          hint: "CUSTOM_DND5E.advanceBastionTurn.hint", labelClass: "custom-dnd5e-edit-label-flex2" },
        { name: "exhaustionDelta", type: "number", label: "CUSTOM_DND5E.exhaustionDelta.label",
          hint: "CUSTOM_DND5E.exhaustionDelta.hint", step: 1, labelClass: "custom-dnd5e-edit-label-flex2" }
      ]
    },
    {
      legend: "CUSTOM_DND5E.spellSlots",
      fields: [
        { name: "recoverSpellSlotTypes", type: "multiSelect", label: "CUSTOM_DND5E.recoverSpellSlotTypes.label",
          hint: "CUSTOM_DND5E.recoverSpellSlotTypes.hint", choices: "recoverSpellSlotTypes",
          labelClass: "custom-dnd5e-edit-label-flex2" },
        { name: "spellSlotRecovery", type: "select", label: "CUSTOM_DND5E.recoveryMethod.label",
          hint: "CUSTOM_DND5E.recoveryMethod.hint", choices: "spellSlotRecoveryMethods", localizeChoices: true,
          labelClass: "custom-dnd5e-edit-label-flex2" },
        { name: "spellSlotFraction", type: "number", label: "CUSTOM_DND5E.spellSlotFraction.label",
          hint: "CUSTOM_DND5E.spellSlotFraction.hint", step: 0.05, min: 0, max: 1,
          labelClass: "custom-dnd5e-edit-label-flex2" },
        { name: "spellSlotCount", type: "number", label: "CUSTOM_DND5E.spellSlotCount.label",
          hint: "CUSTOM_DND5E.spellSlotCount.hint", step: 1, min: 0,
          labelClass: "custom-dnd5e-edit-label-flex2" }
      ]
    },
    {
      legend: "DND5E.HitPoints",
      fields: [
        { name: "recoverHitPoints", type: "checkbox", label: "CUSTOM_DND5E.recoverHitPoints",
          labelClass: "custom-dnd5e-edit-label-flex2" },
        { name: "hitPointsFraction", type: "number", label: "CUSTOM_DND5E.hitPointsFraction.label",
          hint: "CUSTOM_DND5E.hitPointsFraction.hint", step: 0.05, min: 0, max: 1,
          labelClass: "custom-dnd5e-edit-label-flex2" }
      ]
    },
    {
      legend: "DND5E.HitDice",
      fields: [
        { name: "hitDice", type: "checkbox", label: "CUSTOM_DND5E.spendHitDice.label",
          hint: "CUSTOM_DND5E.spendHitDice.hint" },
        { name: "recoverHitDice", type: "checkbox", label: "CUSTOM_DND5E.recoverHitDice",
          labelClass: "custom-dnd5e-edit-label-flex2" },
        { name: "hitDiceFormula", type: "text", label: "CUSTOM_DND5E.hitDiceFormula.label",
          hint: "CUSTOM_DND5E.hitDiceFormula.hint", placeholder: "@attributes.hd.max * 0.5",
          labelClass: "custom-dnd5e-edit-label-flex2" },
        { name: "hitDiceRoundUp", type: "checkbox", label: "CUSTOM_DND5E.hitDiceRoundUp.label",
          hint: "CUSTOM_DND5E.hitDiceRoundUp.hint", labelClass: "custom-dnd5e-edit-label-flex2" }
      ]
    },
    {
      legend: "CUSTOM_DND5E.temporaryHitPoints",
      fields: [
        { name: "recoverTemp", type: "checkbox", label: "CUSTOM_DND5E.removeTemp",
          labelClass: "custom-dnd5e-edit-label-flex2" },
        { name: "recoverTempMax", type: "checkbox", label: "CUSTOM_DND5E.removeTempMax",
          labelClass: "custom-dnd5e-edit-label-flex2" }
      ]
    },
    {
      legend: "CUSTOM_DND5E.periods",
      fields: [
        { name: "recoverPeriods", type: "multiSelect", label: "CUSTOM_DND5E.recoverPeriods.label",
          hint: "CUSTOM_DND5E.recoverPeriods.hint", choices: "recoverPeriods",
          labelClass: "custom-dnd5e-edit-label-flex2" },
        { name: "activationPeriods", type: "multiSelect", label: "CUSTOM_DND5E.activationPeriods.label",
          hint: "CUSTOM_DND5E.activationPeriods.hint", choices: "activationPeriods",
          labelClass: "custom-dnd5e-edit-label-flex2" }
      ]
    }
  ];

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

    const spellSlotRecoveryMethods = {
      fraction: "CUSTOM_DND5E.recoveryMethod.fraction",
      fixed: "CUSTOM_DND5E.recoveryMethod.fixed"
    };

    return { activationPeriods, recoverPeriods, recoverSpellSlotTypes, spellSlotRecoveryMethods };
  }

  /* -------------------------------------------- */

  /**
   * Toggle the spell slot recovery input shown for the selected recovery method.
   * @param {object} context
   * @param {object} options Rendering options
   */
  _onRender(context, options) {
    super._onRender(context, options);

    const select = this.element.querySelector("#custom-dnd5e-spellSlotRecovery");
    if ( !select ) return;

    const fractionGroup = this.element.querySelector("#custom-dnd5e-spellSlotFraction")?.closest(".form-group");
    const countGroup = this.element.querySelector("#custom-dnd5e-spellSlotCount")?.closest(".form-group");

    const toggle = () => {
      const fixed = select.value === "fixed";
      fractionGroup?.classList.toggle("hidden", fixed);
      countGroup?.classList.toggle("hidden", !fixed);
    };

    toggle();
    select.addEventListener("change", toggle);
  }

}

/* -------------------------------------------- */

/**
 * Rest types settings menu form.
 * @extends ConfigForm
 */
class RestTypesForm extends ConfigForm {
  constructor() {
    super();
    this.editForm = RestTypesEditForm;
    this.listTitle = `CUSTOM_DND5E.form.${constants.ID}.listTitle`;
    this.requiresReload = true;
    this.config = configs.restTypes;
  }

  /* -------------------------------------------- */

  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-rest-types-form`,
    window: {
      title: `CUSTOM_DND5E.form.${constants.ID}.title`
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
}

/* -------------------------------------------- */

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
 * @param {string|null} key
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
    ...(data.spellSlotRecovery !== undefined && { spellSlotRecovery: data.spellSlotRecovery }),
    ...(data.spellSlotFraction !== undefined && { spellSlotFraction: Number(data.spellSlotFraction) }),
    ...(data.spellSlotCount !== undefined && { spellSlotCount: Number(data.spellSlotCount) }),
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
  registerSpellSlotRecoveryHook(configData);
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
 * Register hook to apply partial recovery to Spell Slots.
 *
 * Two methods are supported per rest type:
 * - "fraction" recovers a fraction of each level's maximum (at least one slot)
 * - "fixed" recovers a flat number of slots for every level.
 * @param {object} configData
 */
function registerSpellSlotRecoveryHook(configData) {
  const hasPartialRecovery = Object.values(configData).some(r =>
    (r.spellSlotRecovery === "fixed")
      ? r.spellSlotCount > 0
      : (r.spellSlotFraction !== undefined && r.spellSlotFraction !== 1)
  );
  if ( !hasPartialRecovery ) return;

  const id = Hooks.on("dnd5e.preRestCompleted", (actor, result, config) => {
    const restType = CONFIG.DND5E.restTypes[config.type];
    if ( !restType?.recoverSpellSlotTypes?.size ) return;

    const method = restType.spellSlotRecovery ?? "fraction";
    if ( method === "fixed" ) {
      if ( !(restType.spellSlotCount > 0) ) return;
    } else if ( restType.spellSlotFraction === undefined || restType.spellSlotFraction >= 1 ) {
      return;
    }

    const spells = actor.system.spells;
    if ( !spells ) return;

    for ( const [key, slot] of Object.entries(spells) ) {
      if ( !restType.recoverSpellSlotTypes.has(slot.type) ) continue;
      if ( !slot.max ) continue;
      const recovered = (method === "fixed")
        ? restType.spellSlotCount
        : Math.max(1, Math.floor(slot.max * restType.spellSlotFraction));
      result.updateData[`system.spells.${key}.value`] = Math.min(slot.max, slot.value + recovered);
    }
  });
  hookIds.set("dnd5e.preRestCompleted.spells", id);
}
