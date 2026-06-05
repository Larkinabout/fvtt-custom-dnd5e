import { CONSTANTS } from "../constants.js";
import { c5eLoadTemplates, getSetting, registerMenu, registerSetting } from "../utils.js";
import { ActivitiesForm } from "../forms/activities-form.js";
import { MacroActivity } from "./activity-macro.js";
import { MoveActivity } from "./activity-move.js";
import { SwapActivity } from "./activity-swap.js";
import { TargetingMode } from "./targeting-mode.js";

const constants = CONSTANTS.ACTIVITIES;

/* -------------------------------------------- */
/*  HELPERS                                     */
/* -------------------------------------------- */

/**
 * Clear the current user's targeted tokens.
 */
function _clearUserTargets() {
  if ( !canvas.ready || !game.user.targets.size ) return;
  canvas.tokens.setTargets([]);
}

/* -------------------------------------------- */

/**
 * Get the targeted tokens stored on the chat message.
 * @param {ChatMessage} [message]
 * @returns {Promise<Token[]>} List of targeted tokens
 */
export async function getTargetedTokensFromMessage(message) {
  const targetData = message?.getFlag?.("dnd5e", "targets");
  if ( !targetData?.length ) return [];
  const tokens = [];
  for ( const entry of targetData ) {
    const actor = await fromUuid(entry.uuid);
    const tokenDoc = actor?.token ?? actor?.getActiveTokens?.()[0]?.document;
    if ( tokenDoc?.object ) tokens.push(tokenDoc.object);
  }
  return tokens;
}

/* -------------------------------------------- */

/**
 * Move one or more tokens to new positions, bypassing Foundry's movement
 * pipeline. Uses `isPaste: true` to avoid movement constraints.
 * @param {Scene} scene
 * @param {Array<{tokenDoc: TokenDocument, x: number, y: number, elevation?: number}>} moves
 * @param {object} [opts]
 * @param {boolean} [opts.animate=true] Animate the move at walking speed
 * @param {boolean} [opts.stripHistory=false] Strip movement history so the
 *   move isn't tracked against combat-turn movement
 * @returns {Promise<void>}
 */
export async function applyBypassedMoves(scene, moves, { animate = true, stripHistory = false } = {}) {
  if ( !scene || !moves?.length ) return;

  const ids = new Set(moves.map(m => m.tokenDoc.id));
  const hookId = stripHistory
    ? Hooks.on("preUpdateToken", (doc, changed) => {
      if ( !ids.has(doc.id) ) return;
      delete changed._movementHistory;
    })
    : null;

  try {
    if ( animate ) {
      const instructions = {};
      for ( const m of moves ) {
        instructions[m.tokenDoc.id] = {
          waypoints: [{
            x: m.x,
            y: m.y,
            elevation: m.elevation ?? m.tokenDoc.elevation,
            action: "walk"
          }]
        };
      }
      await scene.moveTokens(instructions, { isPaste: true });
    } else {
      const updates = moves.map(m => ({
        _id: m.tokenDoc.id,
        x: m.x,
        y: m.y,
        elevation: m.elevation ?? m.tokenDoc.elevation
      }));
      await scene.updateEmbeddedDocuments("Token", updates, { animate: false, isPaste: true });
    }
  } finally {
    if ( hookId ) Hooks.off("preUpdateToken", hookId);
  }
}

/* -------------------------------------------- */

/**
 * Determine targeting requirements for an activity.
 * @param {Activity} activity Activity being used
 * @param {object} [options]
 * @param {boolean} [options.fallback=false] Fall back to 1 creature when no target type or count is set
 * @returns {{ count: number, typeLabel: string } | null} Requirements, or null if no targeting needed
 */
function _getTargetingRequirements(activity, { fallback = false } = {}) {
  const rawType = activity.target?.affects?.type;
  const labelFor = type => game.i18n.localize(
    CONFIG.DND5E.individualTargetTypes[type]?.label ?? "Creature"
  );

  // Custom activities that always need targets
  if ( activity.type === "custom-dnd5e-move" ) {
    return { count: 1, typeLabel: labelFor(rawType) };
  }
  if ( activity.type === "custom-dnd5e-swap" && !activity.swap?.actorUuid ) {
    return { count: 1, typeLabel: labelFor(rawType) };
  }

  // Standard activities with individual target data
  if ( rawType === "self" || rawType === "space" ) return null;
  if ( activity.target?.template?.type ) return null;

  let type = rawType;
  if ( !type ) {
    if ( !fallback ) return null;
    type = "creature";
  }
  if ( !CONFIG.DND5E.individualTargetTypes[type] ) return null;

  let count = activity.target?.affects?.count;
  if ( !Number.isInteger(count) || count <= 0 ) {
    if ( !fallback ) return null;
    count = 1;
  }

  return { count, typeLabel: labelFor(type) };
}

/* -------------------------------------------- */
/*  REGISTRATION                                */
/* -------------------------------------------- */

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
      default: {
        macro: false,
        move: false,
        swap: false,
        targeting: false,
        fallbackTarget: false,
        clearTargetsAfterUse: false
      }
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
    const fallback = !!setting.fallbackTarget;
    Hooks.on("dnd5e.preUseActivity", (activity, usageConfig, dialogConfig, messageConfig) => {
      if ( usageConfig._bypassTargeting ) return true;
      if ( !canvas.ready ) return true;

      const targeting = _getTargetingRequirements(activity, { fallback });
      if ( !targeting ) return true;
      if ( game.user.targets.size >= targeting.count ) return true;

      const options = { activity, ...targeting, usageConfig, dialogConfig, messageConfig };
      TargetingMode.activate(options).then(completed => {
        if ( !completed ) return;
        if ( messageConfig?.data?.flags?.dnd5e ) delete messageConfig.data.flags.dnd5e.targets;
        activity.use({ ...usageConfig, _bypassTargeting: true }, dialogConfig, messageConfig);
      });
      return false;
    });
  }

  if ( setting?.clearTargetsAfterUse ) {
    // For non-attack activities, clear immediately after use.
    // For attack activities, defer until the attack roll completes.
    Hooks.on("dnd5e.postUseActivity", activity => {
      if ( activity.type === "attack" ) return;
      _clearUserTargets();
    });
    Hooks.on("dnd5e.rollAttack", () => _clearUserTargets());
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
