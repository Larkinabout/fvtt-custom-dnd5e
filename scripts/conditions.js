import { CONSTANTS } from "./constants.js";
import { c5eLoadTemplates, checkEmpty, registerMenu, getSetting, registerSetting, resetDnd5eConfig } from "./utils.js";
import { ConditionsForm } from "./forms/config-form.js";
import { buildBloodied, registerBloodied } from "./house-rules.js";

const constants = CONSTANTS.CONDITIONS;

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
      type: ConditionsForm,
      restricted: true,
      scope: "world"
    }
  );

  registerSetting(
    constants.SETTING.KEY,
    {
      scope: "world",
      config: false,
      type: Object,
      default: getDefault()
    }
  );
}

/* -------------------------------------------- */

/**
 * Get dnd5e config.
 * @param {string|null} key The key
 * @returns {object} The conditions and status effects
 */
export function getDefaultConfig(key = null) {
  const data = buildData({
    key,
    conditionTypes: CONFIG.CUSTOM_DND5E.conditionTypes,
    statusEffects: CONFIG.CUSTOM_DND5E.coreStatusEffects
  });

  if ( !data ) return {};
  if ( key ) return data;

  Object.values(data).forEach(value => {
    value.label = game.i18n.localize(value.label);
  });

  const sortedData = Object.fromEntries(
    Object.entries(data).sort(([lId, lhs], [rId, rhs]) =>
      lhs.order || rhs.order
        ? (lhs.order ?? Infinity) - (rhs.order ?? Infinity)
        : lhs.label.localeCompare(rhs.label, game.i18n.lang)
    )
  );
  return sortedData;
}

/* -------------------------------------------- */

/**
 * Get setting default.
 *
 * @returns {object} The setting
 */
function getDefault() {
  return buildData({ conditionTypes: CONFIG.DND5E.conditionTypes, statusEffects: CONFIG.statusEffects });
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
      const conditionLabel = game.i18n.localize(value.label);
      if ( conditionLabel > bloodied.conditionType.label && !conditionTypes.bloodied ) {
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
      data[statusEffect.id].icon = statusEffect.img;
      data[statusEffect.id].label = statusEffect.name;
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
  const properties = ["conditionTypes", "statusEffects"];

  // Initialise the config object
  const config = {
    conditionTypes: {},
    statusEffects: []
  };

  // Exit if data is empty and reset config
  if ( checkEmpty(data) ) {
    properties.forEach(property => {
      const configType = (property === "conditionTypes") ? CONFIG.DND5E : CONFIG;
      if ( checkEmpty(configType[property]) ) {
        resetDnd5eConfig(property);
      }
    });
    return;
  }

  // Populate config
  Object.entries(data)
    .filter(([_, value]) => value.visible || value.visible === undefined)
    .forEach(([key, value]) => {
      const localisedLabel = game.i18n.localize(value.label ?? value);

      // Merge with default config in case their are any new properties
      value = foundry.utils.mergeObject(foundry.utils.deepClone(getDefaultConfig(key)) ?? {}, value);

      if ( value.sheet || value.pseudo ) {
        config.conditionTypes[key] = {
          icon: value.icon,
          label: localisedLabel,
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
        id: key,
        img: value.icon,
        ...(value.levels !== undefined && { levels: value.levels }),
        name: localisedLabel,
        ...(value.pseudo && { pseudo: value.pseudo }),
        ...(value.reference !== undefined && { reference: value.reference }),
        ...(value.riders !== undefined && { riders: value.riders }),
        ...(value.statuses !== undefined && { statuses: value.statuses })
      });
    });

  // Apply the config to CONFIG.DND5E
  properties.forEach(property => {
    if ( Object.keys(config[property]).length ) {
      const configType = (property === "conditionTypes") ? CONFIG.DND5E : CONFIG;
      configType[property] = config[property];
    }
  });

  // If 'Apply Bloodied' is enabled, re-register Bloodied
  registerBloodied();
}
