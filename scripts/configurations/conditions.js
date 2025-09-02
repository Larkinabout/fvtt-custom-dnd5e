import { CONSTANTS } from "../constants.js";
import {
  Logger,
  c5eLoadTemplates,
  checkEmpty,
  registerMenu as c5eRegisterMenu,
  getSetting,
  registerSetting,
  resetDnd5eConfig,
  resetSetting } from "../utils.js";
import { ConditionsForm } from "../forms/config-form.js";
import { buildBloodied, registerBloodied } from "./bloodied.js";

const constants = CONSTANTS.CONDITIONS;
const configKey = "conditionTypes";

/**
 * Register settings and load templates.
 */
export function register() {
  registerSettings();

  const templates = [
    constants.TEMPLATE.EDIT
  ];
  c5eLoadTemplates(templates);
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

/**
 * Get dnd5e config.
 * @param {string|null} key The key
 * @returns {object} The conditions and status effects
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
 * Build setting data.
 * @param {object} config The config data
 * @returns {object} The setting data
 */
function buildData(config) {
  let data = foundry.utils.deepClone(
    (config.key)
      ? { [config.key]: config.conditionTypes[config.key] }
      : config.conditionTypes) ?? {};

  if ( !config.key && getSetting(CONSTANTS.BLOODIED.SETTING.APPLY_BLOODIED.KEY) ) {
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
 * @param {object} data The data
 */
export function setConfig(data = null) {
  if ( !getSetting(constants.SETTING.ENABLE.KEY) ) return;

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
          img: value?.img ?? value?.icon,
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
        img: value?.img ?? value?.icon,
        ...(value.levels !== undefined && { levels: value.levels }),
        name: localisedName,
        ...(value.order !== undefined && { order: value.order }),
        ...(value.pseudo && { pseudo: value.pseudo }),
        ...(value.reference !== undefined && { reference: value.reference }),
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

  // If 'Apply Bloodied' is enabled, re-register Bloodied
  registerBloodied();
}
