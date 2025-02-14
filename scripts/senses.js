import { CONSTANTS } from "./constants.js";
import { Logger, c5eLoadTemplates, checkEmpty, getFlag, getSetting, registerMenu, registerSetting, resetDnd5eConfig } from "./utils.js";
import { SensesForm } from "./forms/config-form.js";

const property = "senses";
const constants = CONSTANTS.SENSES;

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
    constants.SETTING.KEY,
    {
      scope: "world",
      config: false,
      type: Object,
      default: CONFIG.CUSTOM_DND5E[property]
    }
  );
}

/* -------------------------------------------- */

/**
 * Register hooks.
 */
function registerHooks() {
  Hooks.on("renderMovementSensesConfig", addCustomSenses);
}

/* -------------------------------------------- */

/**
 * Set CONFIG.DND5E.senses
 * @param {object} data The data
 */
export function setConfig(data = null) {
  if ( checkEmpty(data) ) {
    if ( checkEmpty(CONFIG.DND5E[property]) ) {
      resetDnd5eConfig(property);
    }
    return;
  }

  const buildConfig = (keys, data) => Object.fromEntries(
    keys.filter(key => data[key].visible || data[key].visible === undefined)
      .map(key => [
        key,
        game.i18n.localize(data[key].label || data[key])
      ])
  );

  const defaultConfig = foundry.utils.deepClone(CONFIG.CUSTOM_DND5E[property]);
  const config = buildConfig(Object.keys(data), foundry.utils.mergeObject(defaultConfig, data));

  if ( config ) {
    CONFIG.DND5E[property] = config;
  }
}

/* -------------------------------------------- */

/**
 * Add custom senses to the Movement and Senses Configuration sheet.
 * @param {object} app The app
 * @param {object} html The HTML
 */
async function addCustomSenses(app, html) {
  Logger.debug("Adding custom senses...");
  const actor = app.document;
  const systemSenses = ["blindsight", "darkvision", "tremorsense", "truesight"];
  const senses = getSetting(constants.SETTING.KEY);
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
      const template = await renderTemplate(constants.TEMPLATE.CONFIG_FORM_GROUP, data);

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
