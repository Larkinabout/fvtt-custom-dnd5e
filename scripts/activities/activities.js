import { CONSTANTS } from "../constants.js";
import { c5eLoadTemplates, getSetting, registerMenu, registerSetting } from "../utils.js";
import { ActivitiesForm } from "../forms/activities-form.js";
import { MacroActivity } from "./activity-macro.js";
import { MoveActivity } from "./activity-move.js";
import { SwapActivity } from "./activity-swap.js";

const constants = CONSTANTS.ACTIVITIES;

/**
 * Register settings and load templates.
 */
export function register() {
  registerSetting(
    constants.SETTING.CONFIG.KEY,
    {
      scope: "world",
      config: false,
      type: Object,
      default: { macro: false, move: false, swap: false }
    }
  );

  registerMenu(
    constants.MENU.KEY,
    {
      hint: game.i18n.localize(constants.MENU.HINT),
      label: game.i18n.localize(constants.MENU.LABEL),
      name: game.i18n.localize(constants.MENU.NAME),
      icon: constants.MENU.ICON,
      type: ActivitiesForm,
      restricted: true,
      scope: "world"
    }
  );

  const setting = getSetting(constants.SETTING.CONFIG.KEY);

  if ( setting?.macro ) {
    CONFIG.DND5E.activityTypes["custom-dnd5e-macro"] = {
      documentClass: MacroActivity
    };
  }

  if ( setting?.move ) {
    CONFIG.DND5E.activityTypes["custom-dnd5e-move"] = {
      documentClass: MoveActivity
    };
  }

  if ( setting?.swap ) {
    CONFIG.DND5E.activityTypes["custom-dnd5e-swap"] = {
      documentClass: SwapActivity
    };
  }

  const templates = [constants.TEMPLATE.FORM, constants.TEMPLATE.MACRO_EFFECT, constants.TEMPLATE.MOVE_EFFECT, constants.TEMPLATE.SWAP_ACTIVATION, constants.TEMPLATE.SWAP_TARGETING, constants.TEMPLATE.SWAP_EFFECT];
  c5eLoadTemplates(templates);
}
