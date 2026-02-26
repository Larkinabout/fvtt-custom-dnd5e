import { CONSTANTS } from "../constants.js";
import { c5eLoadTemplates, getSetting, registerMenu, registerSetting } from "../utils.js";
import { ActivitiesForm } from "../forms/activities-form.js";
import { MacroActivity } from "./activity-macro.js";
import { MoveActivity } from "./activity-move.js";
import { SwapActivity } from "./activity-swap.js";
import { TargetingMode } from "./targeting-mode.js";

const constants = CONSTANTS.ACTIVITIES;

/**
 * Determine targeting requirements for an activity.
 * @param {Activity} activity The activity being used
 * @returns {{ count: number, typeLabel: string } | null} Requirements, or null if no targeting needed
 */
function _getTargetingRequirements(activity) {
  const type = activity.target?.affects?.type;
  const typeLabel = type && CONFIG.DND5E.individualTargetTypes[type]
    ? game.i18n.localize(CONFIG.DND5E.individualTargetTypes[type].label)
    : game.i18n.localize(CONFIG.DND5E.individualTargetTypes.creature?.label ?? "Creature");

  // Custom activities that always need targets
  if ( activity.type === "custom-dnd5e-move" ) {
    return { count: 1, typeLabel };
  }
  if ( activity.type === "custom-dnd5e-swap" && !activity.swap?.actorUuid ) {
    return { count: 1, typeLabel };
  }

  // Standard activities with individual target data
  if ( !type || type === "self" || type === "space" ) return null;
  if ( !CONFIG.DND5E.individualTargetTypes[type] ) return null;
  if ( activity.target?.template?.type ) return null;
  const count = activity.target?.affects?.count;
  if ( !Number.isInteger(count) || count <= 0 ) return null;

  return { count, typeLabel };
}

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
      default: { macro: false, move: false, swap: false, targeting: false }
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

  if ( setting?.targeting ) {
    Hooks.on("dnd5e.preUseActivity", (activity, usageConfig, dialogConfig, messageConfig) => {
      if ( usageConfig._bypassTargeting ) return true;
      if ( !canvas.ready ) return true;

      const targeting = _getTargetingRequirements(activity);
      if ( !targeting ) return true;
      if ( game.user.targets.size >= targeting.count ) return true;

      const options = { activity, ...targeting, usageConfig, dialogConfig, messageConfig };
      TargetingMode.activate(options).then(completed => {
        if ( !completed ) return;
        activity.use({ ...usageConfig, _bypassTargeting: true }, dialogConfig, messageConfig);
      });
      return false;
    });
  }

  c5eLoadTemplates([
    constants.TEMPLATE.FORM,
    constants.TEMPLATE.MACRO_EFFECT,
    constants.TEMPLATE.MOVE_EFFECT,
    constants.TEMPLATE.SWAP_ACTIVATION,
    constants.TEMPLATE.SWAP_TARGETING,
    constants.TEMPLATE.SWAP_EFFECT
  ]);
}
