import {
  assignDnd5eConfig,
  c5eLoadTemplates,
  checkEmpty,
  getDefaultDnd5eConfig,
  getSetting,
  registerMenu,
  registerSetting,
  resetDnd5eConfig,
  resetSetting } from "../utils.js";

/**
 * @typedef {object} ConfigEntryFieldDescriptor
 * @property {string} key Source key on the stored data.
 * @property {boolean} [localize] Pass the value through `game.i18n.localize`.
 * @property {*} [default] Fallback when the source value is undefined.
 * @property {"defined"|((data: object) => boolean)} [conditional]
 *   Whether to include the field. `"defined"` means include when the source value is not undefined.
 * @property {(value: *, data: object) => *} [transform] Transform the source value.
 * @property {boolean} [systemLabelFallback]
 *   Fall back to `CONFIG.CUSTOM_DND5E[configKey][key][field.key]` when the value is not a valid i18n key,
 *   unless the stored entry opts out via `data.system === false`.
 * @property {{entryType: "object"|"scalar", entry: *}} [children]
 *   Sub-definition for nested entries. When set, the field value is recursively shaped.
 */

/**
 * @typedef {object} ConfigScalarEntryDescriptor
 * @property {"labelOrSelf"|"key"} [source] Where to read the value from. `"labelOrSelf"` means `data.label ?? data`.
 * @property {string} [key] When `source === "key"`, the field on `data` to read.
 * @property {boolean} [localize] Pass the value through `game.i18n.localize`.
 */

/**
 * @typedef {object} ConfigDefinition
 * @property {string} configKey Key on `CONFIG.DND5E`.
 * @property {string} [hookName] Override for the derived hook name.
 * @property {object} constants Per-config constants.
 * @property {Function} form Settings menu form class.
 * @property {boolean} [enableRequiresReload] Default `true`. Reload required when the enable flag changes.
 * @property {boolean} [configRequiresReload] Default `false`. Reload when the config setting changes.
 * @property {boolean} [loadTemplates] Default `true`. Load `constants.TEMPLATE.EDIT` during register.
 * @property {"withConfig"|"defaultsOnly"} [mergeStrategy]
 *   Default `"withConfig"`.
 *   - `"withConfig"`: Merge stored data with current `CONFIG.DND5E[configKey]` then with defaults.
 *   - `"defaultsOnly"`: Skips the current config, so removed entries are not re-added.
 * @property {"object"|"scalar"} [entryType] Shape of each built entry. Not required when `buildEntry` is provided.
 * @property {ConfigEntryFieldDescriptor[]|ConfigScalarEntryDescriptor} [entry]
 *   Field list for `"object"` entries, or a single descriptor for `"scalar"` entries.
 * @property {(key: string, data: *, helpers: {buildConfig: (data: object) => object}) => *} [buildEntry]
 *   When set, the engine calls it instead of `buildObjectEntry` / `buildScalarEntry`.
 */

/* -------------------------------------------- */
/*  REGISTRATION                                */
/* -------------------------------------------- */

/**
 * Register a config's menu, settings, and templates.
 * @param {ConfigDefinition} def
 */
export function registerConfig(def) {
  registerSettingsForConfig(def);

  if ( def.loadTemplates !== false && def.constants.TEMPLATE?.EDIT ) {
    c5eLoadTemplates([def.constants.TEMPLATE.EDIT]);
  }
}

/* -------------------------------------------- */

/**
 * Register the menu and settings for a config.
 * @param {ConfigDefinition} def
 */
function registerSettingsForConfig(def) {
  const { constants, form } = def;

  registerMenu(
    constants.MENU.KEY,
    {
      hint: game.i18n.localize(constants.MENU.HINT),
      label: game.i18n.localize(constants.MENU.LABEL),
      name: game.i18n.localize(constants.MENU.NAME),
      icon: constants.MENU.ICON,
      type: form,
      restricted: true,
      scope: "world"
    }
  );

  registerSetting(
    constants.SETTING.ENABLE.KEY,
    {
      scope: "world",
      config: false,
      requiresReload: def.enableRequiresReload !== false,
      type: Boolean,
      default: false
    }
  );

  const configOptions = {
    scope: "world",
    config: false,
    type: Object,
    default: getSettingDefault(def)
  };
  if ( def.configRequiresReload ) configOptions.requiresReload = true;
  registerSetting(constants.SETTING.CONFIG.KEY, configOptions);
}

/* -------------------------------------------- */
/*  DEFAULTS & RESET                            */
/* -------------------------------------------- */

/**
 * Get the cloned default data for a config (optionally a single entry).
 * @param {ConfigDefinition} def
 * @param {string|null} [key=null]
 * @returns {object} Default config data
 */
export function getSettingDefault(def, key = null) {
  return getDefaultDnd5eConfig(def.configKey, key);
}

/* -------------------------------------------- */

/**
 * Reset both `CONFIG.DND5E[configKey]` and the stored setting to their defaults.
 * @param {ConfigDefinition} def
 */
export async function resetConfigSetting(def) {
  await resetDnd5eConfig(def.configKey);
  await resetSetting(def.constants.SETTING.CONFIG.KEY);
}

/* -------------------------------------------- */
/*  CONFIG ASSIGNMENT                           */
/* -------------------------------------------- */

/**
 * Apply stored data to `CONFIG.DND5E[configKey]` and call the config hook.
 * When `settingData` is omitted, the engine reads the current stored value from the setting.
 * @param {ConfigDefinition} def
 * @param {object} [settingData]
 * @returns {void}
 */
export function setConfig(def, settingData) {
  if ( !getSetting(def.constants.SETTING.ENABLE.KEY) ) return;
  const data = settingData ?? getSetting(def.constants.SETTING.CONFIG.KEY);
  if ( checkEmpty(data) ) return handleEmptyData(def);

  const merged = mergeSettingData(def, data);
  const configData = buildConfig(def, merged);

  Hooks.callAll(getHookName(def), configData);

  if ( configData ) {
    assignDnd5eConfig(def.configKey, configData);
  }
}

/* -------------------------------------------- */

/**
 * Reset `CONFIG.DND5E[configKey]` to defaults if it is currently empty.
 * @param {ConfigDefinition} def
 */
function handleEmptyData(def) {
  if ( checkEmpty(CONFIG.DND5E[def.configKey]) ) {
    resetDnd5eConfig(def.configKey);
  }
}

/* -------------------------------------------- */

/**
 * Merge stored data with current config and/or defaults according to the merge strategy.
 * @param {ConfigDefinition} def
 * @param {object} settingData
 * @returns {object} Merged data
 */
function mergeSettingData(def, settingData) {
  const defaults = getSettingDefault(def);

  if ( def.mergeStrategy === "defaultsOnly" ) {
    return foundry.utils.mergeObject(settingData, defaults, { overwrite: false });
  }

  return foundry.utils.mergeObject(
    foundry.utils.mergeObject(settingData, CONFIG.DND5E[def.configKey], { overwrite: false }),
    defaults,
    { overwrite: false }
  );
}

/* -------------------------------------------- */
/*  ENTRY BUILDING                              */
/* -------------------------------------------- */

/**
 * Build the config object from merged setting data. Filters out hidden entries.
 * @param {ConfigDefinition} def
 * @param {object} settingData
 * @returns {object} Config data
 */
function buildConfig(def, settingData) {
  return Object.fromEntries(
    Object.keys(settingData)
      .filter(key => settingData[key]?.visible || settingData[key]?.visible === undefined)
      .map(key => [key, buildEntry(def, key, settingData[key])])
  );
}

/* -------------------------------------------- */

/**
 * Build a single entry for the config.
 * @param {ConfigDefinition} def
 * @param {string} key
 * @param {object|string} data
 * @returns {object|string}
 */
function buildEntry(def, key, data) {
  if ( def.buildEntry ) {
    return def.buildEntry(key, data, {
      buildConfig: childData => buildConfig(def, childData)
    });
  }
  if ( def.entryType === "scalar" ) return buildScalarEntry(def, data);
  return buildObjectEntry(def, key, data);
}

/* -------------------------------------------- */

/**
 * Build an object entry by walking the field descriptor list.
 * @param {ConfigDefinition} def
 * @param {string} key
 * @param {object} data
 * @returns {object}
 */
function buildObjectEntry(def, key, data) {
  const result = {};

  for ( const field of def.entry ) {
    let value = data?.[field.key];

    if ( field.conditional ) {
      const include = field.conditional === "defined"
        ? value !== undefined
        : field.conditional(data);
      if ( !include ) continue;
    }

    if ( value === undefined && field.default !== undefined ) value = field.default;

    if ( field.systemLabelFallback && data?.system !== false ) {
      if ( typeof value !== "string" || !game.i18n.has(value) ) {
        value = CONFIG.CUSTOM_DND5E[def.configKey]?.[key]?.[field.key] ?? value;
      }
    }

    if ( field.children ) value = buildConfig(field.children, value);

    if ( field.transform ) value = field.transform(value, data);

    if ( field.localize && typeof value === "string" ) value = game.i18n.localize(value);

    result[field.key] = value;
  }

  return result;
}

/* -------------------------------------------- */

/**
 * Build a scalar entry.
 * @param {ConfigDefinition} def
 * @param {object|string} data
 * @returns {string} Scalar entry
 */
function buildScalarEntry(def, data) {
  const desc = def.entry;
  let value;
  if ( desc.source === "labelOrSelf" ) {
    value = data?.label || data;
  } else if ( desc.key ) {
    value = data?.[desc.key];
  } else {
    value = data;
  }
  if ( desc.localize && typeof value === "string" ) value = game.i18n.localize(value);
  return value;
}

/* -------------------------------------------- */
/*  HOOK NAMING                                 */
/* -------------------------------------------- */

/**
 * Resolve the config hook name.
 * Uses `def.hookName` if set, otherwise derives it.
 * @param {ConfigDefinition} def
 * @returns {string} Hook name
 */
function getHookName(def) {
  if ( def.hookName ) return def.hookName;
  const pascal = def.configKey.charAt(0).toUpperCase() + def.configKey.slice(1);
  return `customDnd5e.set${pascal}Config`;
}
