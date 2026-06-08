import { MODULE, CONSTANTS } from "./constants.js";
import { c5eLoadTemplates, Logger, getSetting, setSetting, registerMenu, showImportDialog } from "./utils.js";
import { DebugForm } from "./forms/debug-form.js";
import { getConfigKeys } from "./configurations/registry.js";

const constants = CONSTANTS.DEBUG;

/**
 * Register settings and load templates.
 */
export function register() {
  registerSettings();

  const templates = [
    constants.TEMPLATE.FORM,
    constants.TEMPLATE.IMPORT_DIALOG
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
      type: DebugForm,
      restricted: true,
      scope: "world"
    }
  );
}

/* -------------------------------------------- */

/**
 * Serialise a CONFIG.DND5E value for JSON export.
 * @param {string} key
 * @param {*} value
 * @returns {*} JSON-serialisable value
 */
function serialiseConfigValue(key, value) {
  if ( key === "validProperties" ) return convertSetsToArrays(value);
  if ( key === "restTypes" ) {
    return Object.fromEntries(Object.entries(value ?? {}).map(([k, v]) => [k, {
      ...v,
      ...(v.dialogClass && { dialogClass: v.dialogClass.name }),
      ...(v.recoverSpellSlotTypes instanceof Set && { recoverSpellSlotTypes: [...v.recoverSpellSlotTypes] })
    }]));
  }
  return value;
}

/* -------------------------------------------- */

/**
 * Exports data to JSON file.
 */
export async function exportData() {
  const configDnd5e = {};
  for ( const key of getConfigKeys() ) {
    configDnd5e[key] = serialiseConfigValue(key, CONFIG.DND5E[key]);
  }

  const data = {
    customDnd5eVersion: game.modules.get(MODULE.ID).version,
    dnd5eVersion: game.system.version,
    foundryVttVersion: game.version,
    setting: Object.fromEntries(
      [...game.settings.settings]
        .filter(setting => setting[0].includes(MODULE.ID))
        .map(setting => [setting[1].key, getSetting(setting[1].key)])
    ),
    config: {
      statusEffects: CONFIG.statusEffects
    },
    configDnd5e
  };

  saveDataToFile(JSON.stringify(data, null, 2), "text/json", `${MODULE.ID}.json`);
}

/* -------------------------------------------- */

/**
 * Import data from JSON file.
 *
 * @returns {Promise<boolean>} Whether the import was successful
 */
export async function importData() {
  return showImportDialog(constants.TEMPLATE.IMPORT_DIALOG, {}, processImport);
}

/* -------------------------------------------- */

/**
 * Process the import file.
 * @param {File} file File to import
 * @returns {Promise<boolean>} Whether the process succeeded
 */
async function processImport(file) {
  const json = await readTextFromFile(file);
  const jsonData = JSON.parse(json);
  jsonData.configDnd5e.validProperties = convertArraysToSets(jsonData.configDnd5e.validProperties);
  const currentVersion = game.modules.get(MODULE.ID).version.split(".").slice(0, 2).join(".");
  const fileVersion = jsonData.customDnd5eVersion.split(".").slice(0, 2).join(".");
  if ( fileVersion !== currentVersion ) {
    Logger.error(game.i18n.format("CUSTOM_DND5E.dialog.importData.differentVersion", { fileVersion, currentVersion }), true);
    return false;
  }
  try {
    await Promise.all([
      overwriteSettings(jsonData.setting),
      overwriteConfig(jsonData.config),
      overwriteConfigDnd5e(jsonData.configDnd5e)
    ]);
  } catch(error) {
    Logger.error(`An error occurred while importing data: ${error.message}`);
    return false;
  }

  // Rerender settings window to update values
  Object.values(ui.windows).find(app => app.id === "client-settings")?.render(true);

  return true;
}

/* -------------------------------------------- */

/**
 * Overwrite the module's settings.
 * @param {object} setting
 */
async function overwriteSettings(setting) {
  if ( !setting ) {
    Logger.info(game.i18n.localize("CUSTOM_DND5E.dialog.importData.settingsNotFound"), true);
    return;
  }

  await Promise.all(
    Object.entries(setting).map(([key, value]) => setSetting(key, value))
  );

  Logger.info(game.i18n.localize("CUSTOM_DND5E.dialog.importData.settingsImported"), true);
}

/* -------------------------------------------- */

/**
 * Overwrite properties in CONFIG.
 * @param {object} config
 */
async function overwriteConfig(config) {
  if ( !config ) return;

  Object.entries(config).forEach(([key, value]) => {
    CONFIG[key] = value;
  });
}

/* -------------------------------------------- */

/**
 * Overwrite properties in CONFIG.DND5E.
 * @param {object} configDnd5e
 */
async function overwriteConfigDnd5e(configDnd5e) {
  if ( !configDnd5e ) {
    Logger.info(game.i18n.localize("CUSTOM_DND5E.dialog.importData.configNotFound"), true);
    return;
  }

  Object.entries(configDnd5e).forEach(([key, value]) => {
    CONFIG.DND5E[key] = value;
  });

  Logger.info(game.i18n.localize("CUSTOM_DND5E.dialog.importData.configImported"), true);
}

/* -------------------------------------------- */

/**
 * Convert sets to arrays for export to JSON.
 * @param {object} obj Object containing the sets
 * @returns {object} Object with the sets converted to arrays
 */
function convertSetsToArrays(obj) {
  if ( obj instanceof Set ) {
    return [...obj]; // Convert Set to array
  }

  if ( Array.isArray(obj) ) {
    return obj.map(item => convertSetsToArrays(item)); // Recursively convert inside arrays
  }

  if ( typeof obj === "object" && obj !== null ) {
    // Recursively convert inside objects
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [key, convertSetsToArrays(value)])
    );
  }

  return obj;
}

/* -------------------------------------------- */

/**
 * Convert arrays to sets.
 * @param {object} obj The object containing the arrays
 * @returns {object} The object with the arrays converted to sets
 */
function convertArraysToSets(obj) {
  if ( Array.isArray(obj) ) {
    return new Set(obj); // Convert array to Set
  }

  if ( typeof obj === "object" && obj !== null ) {
    // Recursively convert inside objects
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [key, convertArraysToSets(value)])
    );
  }

  return obj;
}
