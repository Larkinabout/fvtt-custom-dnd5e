import { CONSTANTS } from "./constants.js";
import {
  Logger,
  c5eLoadTemplates,
  checkEmpty,
  getDefaultDnd5eConfig,
  getFlag,
  getSetting,
  registerMenu,
  registerSetting,
  resetDnd5eConfig,
  resetSetting } from "./utils.js";
import { SensesForm } from "./forms/config-form.js";

const constants = CONSTANTS.SENSES;
const configKey = "senses";

/**
 * Register settings and hooks, and load templates.
 */
export function register() {
  registerSettings();
  registerHooks();

  const templates = [constants.TEMPLATE.CONFIG_FORM_GROUP];
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
      type: SensesForm,
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
      default: true
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
 * Register hooks.
 */
function registerHooks() {
  if ( !getSetting(constants.SETTING.ENABLE.KEY) ) return;
  Hooks.on("renderMovementSensesConfig", addCustomSensesToConfig);
}

/* -------------------------------------------- */

/**
 * Get default config.
 * @param {string|null} key The key
 * @returns {object} The config data
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
 * Set CONFIG.DND5E.senses
 * @param {object} [settingData=null] The setting data
 * @returns {void}
 */
export function setConfig(settingData = null) {
  if ( !getSetting(constants.SETTING.ENABLE.KEY) ) return;
  if ( checkEmpty(settingData) ) return handleEmptyData();

  const mergedSettingData = foundry.utils.mergeObject(
    foundry.utils.mergeObject(settingData, CONFIG.DND5E[configKey], { overwrite: false }),
    getSettingDefault(),
    { overwrite: false }
  );

  const configData = buildConfig(mergedSettingData);

  Hooks.callAll("customDnd5e.setSensesConfig", configData);

  if ( configData ) {
    CONFIG.DND5E[configKey] = configData;
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
 * @param {object} settingData The setting data
 * @returns {object} The config data
 */
function buildConfig(settingData) {
  return Object.fromEntries(
    Object.keys(settingData)
      .filter(key => settingData[key].visible || settingData[key].visible === undefined)
      .map(key => [key, buildConfigEntry(settingData[key])])
  );
}

/* -------------------------------------------- */

/**
 * Build config entry.
 * @param {object} data The data
 * @returns {object} The config entry
 */
function buildConfigEntry(data) {
  return game.i18n.localize(data.label || data);
}

/* -------------------------------------------- */

/**
 * Add custom senses to the Movement and Senses Configuration sheet.
 * @param {object} app The app
 * @param {object} html The HTML
 */
async function addCustomSensesToConfig(app, html) {
  Logger.debug("Adding custom senses...");
  const actor = app.document;
  const systemSenses = ["blindsight", "darkvision", "tremorsense", "truesight"];
  const senses = getSetting(constants.SETTING.CONFIG.KEY);
  const outerElement = html.querySelector("fieldset.card");
  let lastElement = null;

  for (const [key, value] of Object.entries(senses)) {
    const existingElement = html.querySelector(`input[name$='${key}']`)?.closest(".form-group");
    if ( existingElement ) {
      if ( value.visible === "false" ) {
        existingElement.remove();
      } else {
        if ( lastElement ) {
          lastElement.insertAdjacentElement("afterend", existingElement);
        }
        lastElement = existingElement;
      }
    } else if ( value.visible && value.visible !== undefined && !systemSenses.includes(key) ) {
      const data = { label: value.label, inputName: `flags.custom-dnd5e.${key}`, inputValue: getFlag(actor, key) };
      const template = await foundry.applications.handlebars.renderTemplate(constants.TEMPLATE.CONFIG_FORM_GROUP, data);

      if ( lastElement ) {
        lastElement.insertAdjacentHTML("afterend", template);
      } else {
        outerElement.insertAdjacentHTML("afterbegin", template);
      }

      const currentElement = html.querySelector(`input[name$='${key}']`)?.closest(".form-group");
      if ( currentElement ) {
        lastElement = currentElement;
      }
    }
  }
  Logger.debug("Custom senses added");
}