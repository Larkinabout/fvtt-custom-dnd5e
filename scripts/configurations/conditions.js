import {
  Logger,
  c5eLoadTemplates,
  checkEmpty,
  executeMacro,
  registerMenu as c5eRegisterMenu,
  getSetting,
  registerSetting,
  resetDnd5eConfig,
  resetSetting } from "../utils.js";
import { MODULE } from "../constants.js";
import { ConfigForm } from "../forms/config-form.js";
import { ConfigEditForm } from "../forms/config-edit-form.js";
import { buildBloodied } from "./bloodied.js";
import { configs } from "./registry.js";

/* -------------------------------------------- */
/*  CONSTANTS                                   */
/* -------------------------------------------- */

export const constants = {
  MENU: {
    KEY: "conditions-menu",
    HINT: "CUSTOM_DND5E.menu.conditions.hint",
    ICON: "fas fa-skull",
    LABEL: "CUSTOM_DND5E.menu.conditions.label",
    NAME: "CUSTOM_DND5E.menu.conditions.name"
  },
  SETTING: {
    ENABLE: {
      KEY: "enable-conditions"
    },
    CONFIG: {
      KEY: "conditions"
    }
  },
  TEMPLATE: {
    EDIT: "modules/custom-dnd5e/templates/conditions-edit.hbs",
    FORM: "modules/custom-dnd5e/templates/config-form.hbs",
    LIST: "modules/custom-dnd5e/templates/config-list.hbs"
  },
  UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.B48iqFBddUikMMer.JournalEntryPage.DOx3PrYi19dFzcA1"
};
export const configKey = "conditionTypes";

/* -------------------------------------------- */
/*  FORM CLASSES                                */
/* -------------------------------------------- */

/**
 * Per-condition edit form.
 * @extends ConfigEditForm
 */
class ConditionsEditForm extends ConfigEditForm {
  /**
   * Constructor for ConditionsEditForm.
   * @param {object} args Arguments passed to the parent class.
   */
  constructor(args) {
    super(args);
    this.config = configs.conditions;
  }

  /* -------------------------------------------- */

  static DEFAULT_OPTIONS = {
    actions: {
      clearMacro: ConditionsEditForm.clearMacro
    },
    id: `${MODULE.ID}-conditions-edit`,
    position: {
      height: 600
    },
    window: {
      title: "CUSTOM_DND5E.form.conditions.edit.title"
    }
  };

  /* -------------------------------------------- */

  static PARTS = {
    form: {
      template: constants.TEMPLATE.EDIT
    }
  };

  /* -------------------------------------------- */

  /**
   * Get the select options for the form.
   * @returns {object} Select options
   */
  _getSelects() {
    const statusEffects = Object.fromEntries(
      CONFIG.statusEffects.map(statusEffect => [statusEffect.id, statusEffect.name])
    );
    return { riders: statusEffects, statuses: statusEffects };
  }

  /* -------------------------------------------- */

  /**
   * Prepare the context for rendering the form.
   * @returns {Promise<object>} Context data
   */
  async _prepareContext() {
    const context = await super._prepareContext();
    if ( context.macroUuid ) {
      const macro = await fromUuid(context.macroUuid);
      context.macroName = macro?.name ?? "";
    }
    if ( context.macroDisabledUuid ) {
      const macro = await fromUuid(context.macroDisabledUuid);
      context.macroDisabledName = macro?.name ?? "";
    }
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Handle form rendering.
   * @param {object} context
   * @param {object} options
   */
  _onRender(context, options) {
    super._onRender(context, options);
    const macroDrops = this.element.querySelectorAll(".custom-dnd5e-macro-drop");
    for ( const macroDrop of macroDrops ) {
      macroDrop.addEventListener("drop", (event) => this.#onDropMacro(event));
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle dropping a Macro onto the form.
   * @param {DragEvent} event
   */
  async #onDropMacro(event) {
    event.preventDefault();
    event.stopPropagation();
    const container = event.currentTarget;
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if ( data?.type !== "Macro" ) return;
    const macro = await Macro.implementation.fromDropData(data);
    if ( !macro ) return;

    const input = container.querySelector('input[type="hidden"]');
    if ( input ) input.value = macro.uuid;

    const macroField = container.querySelector(".custom-dnd5e-macro-field");
    const dropArea = container.querySelector(".drop-area");
    const nameEl = container.querySelector(".custom-dnd5e-macro-name");
    if ( nameEl ) nameEl.textContent = macro.name;
    if ( macroField ) macroField.classList.remove("hidden");
    if ( dropArea ) dropArea.classList.add("hidden");
  }

  /* -------------------------------------------- */

  /**
   * Clear the macro selection.
   * @param {Event} event
   * @param {HTMLElement} target
   */
  static clearMacro(event, target) {
    const container = target.closest(".custom-dnd5e-macro-drop");
    const input = container.querySelector('input[type="hidden"]');
    if ( input ) input.value = "";

    const macroField = container.querySelector(".custom-dnd5e-macro-field");
    const dropArea = container.querySelector(".drop-area");
    if ( macroField ) macroField.classList.add("hidden");
    if ( dropArea ) dropArea.classList.remove("hidden");
  }
}

/* -------------------------------------------- */

/**
 * Conditions settings menu form.
 * @extends ConfigForm
 */
class ConditionsForm extends ConfigForm {
  /**
   * Constructor for ConditionsForm.
   */
  constructor() {
    super();
    this.editForm = ConditionsEditForm;
    this.label = "CUSTOM_DND5E.name";
    this.listTitle = "CUSTOM_DND5E.form.conditions.listTitle";
    this.includeConfig = false;
    this.requiresReload = false;
    this.config = configs.conditions;
  }

  /* -------------------------------------------- */

  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-conditions-form`,
    window: {
      title: `CUSTOM_DND5E.form.${constants.ID}.title`
    }
  };

  /* -------------------------------------------- */

  async _prepareContext() {
    const context = await super._prepareContext();
    context.items = mergeConfig(context.items);
    return context;
  }
}

/* -------------------------------------------- */
/*  REGISTRATION                                */
/* -------------------------------------------- */

/**
 * Register settings and load templates.
 */
export function register() {
  registerSettings();

  Hooks.on("preCreateActiveEffect", applyOverlay);
  Hooks.on("createActiveEffect", executeConditionMacro);
  Hooks.on("deleteActiveEffect", executeConditionDisabledMacro);

  const templates = [
    constants.TEMPLATE.EDIT
  ];
  c5eLoadTemplates(templates);
}

/* -------------------------------------------- */

/**
 * Apply overlay flag to active effects for conditions configured as overlays.
 * @param {ActiveEffect} effect
 */
function applyOverlay(effect) {
  if ( !getSetting(constants.SETTING.ENABLE.KEY) ) return;
  const statusId = [...(effect.statuses || [])][0];
  if ( !statusId ) return;
  const statusEffect = CONFIG.statusEffects.find(e => e.id === statusId);
  if ( statusEffect?.overlay ) {
    effect.updateSource({ "flags.core.overlay": true });
  }
}

/* -------------------------------------------- */

/**
 * Execute a macro when a condition with a configured macro is applied.
 * @param {ActiveEffect} effect
 * @param {object} options
 * @param {string} userId
 */
async function executeConditionMacro(effect, options, userId) {
  if ( !getSetting(constants.SETTING.ENABLE.KEY) ) return;
  if ( game.user.id !== userId ) return;

  const statusId = [...(effect.statuses || [])][0];
  if ( !statusId ) return;

  const conditionsData = getSetting(constants.SETTING.CONFIG.KEY);
  const conditionConfig = conditionsData?.[statusId];
  if ( !conditionConfig?.macroUuid ) return;

  const actor = effect.parent;
  executeMacro(conditionConfig.macroUuid, {
    actor,
    condition: statusId,
    conditionName: game.i18n.localize(conditionConfig.name),
    effect
  });
}

/* -------------------------------------------- */

/**
 * Execute a macro when a condition with a configured disabled macro is removed.
 * @param {ActiveEffect} effect
 * @param {object} options
 * @param {string} userId
 */
async function executeConditionDisabledMacro(effect, options, userId) {
  if ( !getSetting(constants.SETTING.ENABLE.KEY) ) return;
  if ( game.user.id !== userId ) return;

  const statusId = [...(effect.statuses || [])][0];
  if ( !statusId ) return;

  const conditionsData = getSetting(constants.SETTING.CONFIG.KEY);
  const conditionConfig = conditionsData?.[statusId];
  if ( !conditionConfig?.macroDisabledUuid ) return;

  const actor = effect.parent;
  executeMacro(conditionConfig.macroDisabledUuid, {
    actor,
    condition: statusId,
    conditionName: game.i18n.localize(conditionConfig.name),
    effect
  });
}

/* -------------------------------------------- */

/**
 * Register the conditions menu in Foundry's settings UI.
 */
export function registerMenu() {
  c5eRegisterMenu(
    constants.MENU.KEY,
    {
      hint: game.i18n.localize(constants.MENU.HINT),
      label: game.i18n.localize(constants.MENU.LABEL),
      name: game.i18n.localize(constants.MENU.NAME),
      icon: constants.MENU.ICON,
      type: ConditionsForm,
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
 * Get dnd5e config.
 * @param {string|null} key
 * @returns {object} Conditions and status effects
 */
export function getSettingDefault(key = null) {
  const data = buildData({
    key,
    conditionTypes: CONFIG.CUSTOM_DND5E.conditionTypes,
    statusEffects: CONFIG.CUSTOM_DND5E.coreStatusEffects
  });

  if ( !data ) return {};
  if ( key ) return data;

  Object.values(data).forEach(value => {
    value.name = game.i18n.localize(value?.name ?? value?.label);
  });

  const sortedData = Object.fromEntries(
    Object.entries(data).sort(([lId, lhs], [rId, rhs]) =>
      lhs.order || rhs.order
        ? (lhs.order ?? Infinity) - (rhs.order ?? Infinity)
        : lhs.name.localeCompare(rhs.name, game.i18n.lang)
    )
  );
  return sortedData;
}

/* -------------------------------------------- */

/**
 * Reset config and setting to their default values.
 */
export async function resetConfigSetting() {
  await resetDnd5eConfig(configKey);
  CONFIG.statusEffects = foundry.utils.deepClone(CONFIG.CUSTOM_DND5E.coreStatusEffects);
  Logger.debug("Config 'CONFIG.statusEffects' reset to default");
  await resetSetting(constants.SETTING.CONFIG.KEY);
}

/* -------------------------------------------- */

/**
 * Merge data with CONFIG and setting defaults to include conditions from other modules.
 * @param {object} data Setting data
 * @returns {object} Merged data
 */
export function mergeConfig(data) {
  const conditionTypes = foundry.utils.deepClone(CONFIG.DND5E.conditionTypes);
  Object.values(conditionTypes).forEach(v => { if ( !v.pseudo ) v.sheet = true; });
  data = foundry.utils.mergeObject(data, conditionTypes, { overwrite: false });
  CONFIG.statusEffects.forEach(e => {
    if ( data[e.id] ) foundry.utils.mergeObject(data[e.id], e, { overwrite: false });
  });
  data = foundry.utils.mergeObject(data, getSettingDefault(), { overwrite: false });
  return data;
}

/* -------------------------------------------- */

/**
 * Build setting data.
 * @param {object} config Config data
 * @returns {object} Setting data
 */
function buildData(config) {
  let data = foundry.utils.deepClone(
    (config.key)
      ? { [config.key]: config.conditionTypes[config.key] }
      : config.conditionTypes) ?? {};

  if ( !config.key && getSetting(configs.bloodied.SETTING.APPLY_BLOODIED.KEY) ) {
    const bloodied = buildBloodied();

    const conditionTypes = {};

    Object.entries(data).forEach(([key, value]) => {
      const conditionName = game.i18n.localize(value?.name ?? value?.label);
      if ( conditionName > bloodied.conditionType.name && !conditionTypes.bloodied ) {
        conditionTypes.bloodied = bloodied.conditionType;
        conditionTypes.bloodied.sheet = true;
      }
      conditionTypes[key] = value;
    });

    data = conditionTypes;
  }

  const setStatusEffect = (data, statusEffect) => {
    if ( data[statusEffect.id] ) {
      foundry.utils.mergeObject(data[statusEffect.id], statusEffect);
      if ( !data[statusEffect.id].pseudo ) data[statusEffect.id].sheet = true;
    } else {
      data[statusEffect.id] = statusEffect;
      data[statusEffect.id].img = statusEffect?.img ?? statusEffect?.icon;
      data[statusEffect.id].name = statusEffect?.name ?? statusEffect?.label;
    }
  };

  if ( config.key ) {
    const statusEffect = config.statusEffects.filter(statusEffect => statusEffect.id === config.key);

    if ( statusEffect.length ) {
      setStatusEffect(data, statusEffect[0]);
    }
  } else {
    config.statusEffects.forEach(statusEffect => {
      setStatusEffect(data, statusEffect);
    });
  }

  return (config.key) ? data[config.key] : data;
}

/* -------------------------------------------- */

/**
 * Set CONFIG.DND5E.conditionTypes and CONFIG.statusEffects.
 * @param {object} data
 */
export function setConfig(data) {
  if ( !getSetting(constants.SETTING.ENABLE.KEY) ) return;
  data ??= getSetting(constants.SETTING.CONFIG.KEY);

  const properties = ["conditionTypes", "statusEffects"];

  if ( checkEmpty(data) ) {
    properties.forEach(property => {
      const configType = (property === "conditionTypes") ? CONFIG.DND5E : CONFIG;
      if ( checkEmpty(configType[property]) ) {
        resetDnd5eConfig(property);
      }
    });
    return;
  }

  data = mergeConfig(data);

  // Initialise the config object
  const config = {
    conditionTypes: {},
    statusEffects: []
  };

  // Populate config
  Object.entries(data)
    .filter(([_, value]) => value.visible || value.visible === undefined)
    .forEach(([key, value]) => {
      const localisedName = game.i18n.localize(value?.name ?? value?.label ?? value);

      // Merge with default config in case their are any new properties
      value = foundry.utils.mergeObject(foundry.utils.deepClone(getSettingDefault(key)) ?? {}, value);

      if ( value.sheet || value.pseudo ) {
        config.conditionTypes[key] = {
          img: value?.img ?? value?.icon ?? "icons/svg/hazard.svg",
          name: localisedName,
          ...(value.levels && { levels: value.levels }),
          ...(value.pseudo && { pseudo: value.pseudo }),
          ...(value.reduction !== undefined && { reduction: value.reduction }),
          ...(value.reference !== undefined && { reference: value.reference }),
          ...(value.riders !== undefined && { riders: value.riders }),
          ...(value.special !== undefined && { special: value.special }),
          ...(value.statuses !== undefined && { statuses: value.statuses })
        };
      }

      config.statusEffects.push({
        ...(value.hud === false && { hud: value.hud }),
        _id: dnd5e.utils.staticID(`dnd5e${key}`),
        ...(value.coverBonus !== undefined && { coverBonus: value.coverBonus }),
        ...(value.exclusiveGroup !== undefined && { exclusiveGroup: value.exclusiveGroup }),
        id: key,
        img: value?.img ?? value?.icon ?? "icons/svg/hazard.svg",
        ...(value.levels !== undefined && { levels: value.levels }),
        name: localisedName,
        ...(value.order !== undefined && { order: value.order }),
        ...(value.pseudo && { pseudo: value.pseudo }),
        ...(value.reference !== undefined && { reference: value.reference }),
        ...(value.overlay && { overlay: value.overlay }),
        ...(value.riders !== undefined && { riders: value.riders }),
        ...(value.statuses !== undefined && { statuses: value.statuses })
      });
    });

  // Apply the config to CONFIG.DND5E
  properties.forEach(property => {
    const hookLabel = property.charAt(0).toUpperCase() + property.slice(1);
    Hooks.callAll(`customDnd5e.set${hookLabel}Config`, config[property]);

    if ( Object.keys(config[property]).length ) {
      const configType = (property === "conditionTypes") ? CONFIG.DND5E : CONFIG;
      configType[property] = config[property];
    }
  });
}
