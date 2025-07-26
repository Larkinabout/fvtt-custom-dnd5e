import { CONSTANTS } from "./constants.js";
import {
  registerHooks as registerMobsHooks,
  registerSettings as registerMobsSettings
} from "./mobs.js";
import {
  registerMenu
} from "./utils.js";
import { AutomationForm } from "./forms/automation-form.js";

const constants = CONSTANTS.AUTOMATION;

/**
 * Register settings and hooks, and load templates.
 */
export function register() {
  registerSettings();
  registerHooks();
}

/**
 * Register hooks.
 */
function registerHooks() {
  registerMobsHooks();
}

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
      type: AutomationForm,
      restricted: true,
      scope: "world"
    }
  );

  registerMobsSettings();
}
