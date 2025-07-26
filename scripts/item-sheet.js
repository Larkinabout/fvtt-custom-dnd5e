import { CONSTANTS, SHEET_TYPE } from "./constants.js";
import { c5eLoadTemplates, getFlag, getSetting, registerMenu, registerSetting } from "./utils.js";
import { ItemSheetForm } from "./forms/item-sheet-form.js";

const constants = CONSTANTS.ITEM_SHEET;

/**
 * Register settings and hooks, and load templates.
 */
export function register() {
  registerSettings();
  registerHooks();

  const templates = [constants.TEMPLATE.FORM];
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
      type: ItemSheetForm,
      restricted: true,
      scope: "world"
    }
  );

  registerSetting(
    constants.SETTING.TOGGLE_IDENTIFIED_ROLE.KEY,
    {
      scope: "world",
      config: false,
      type: String,
      default: true
    }
  );
}

/* -------------------------------------------- */

/**
 * Register hooks.
 */
function registerHooks() {
  Hooks.on("renderItemSheet5e", (app, html, data, options) => {
    const role = getSetting(constants.SETTING.TOGGLE_IDENTIFIED_ROLE.KEY);
    if ( game.user.role < role ) {
      removeIdentified(html);
    }
  });
}

/* -------------------------------------------- */

/**
 * Remove the Identified/Unidenfitied button from the item sheet.
 * @param {object} html The HTML
 */
function removeIdentified(html) {
  const element = html[0].querySelector("[data-property='system.identified']");
  element?.remove();
}
