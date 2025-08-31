import { CONSTANTS } from "./constants.js";
import { updateBloodied } from "./configurations/bloodied.js";
import {
  Logger,
  getSetting,
  rotateToken,
  unrotateToken,
  tintToken,
  untintToken } from "./utils.js";

/**
 * Register hooks.
 */
export function register() {
  registerHooks();
}

/* -------------------------------------------- */

/**
 * Register hooks.
 */
function registerHooks() {
  Hooks.on("createActiveEffect", (activeEffect, options, userId) => { updateTokenEffects(true, activeEffect, userId); });
  Hooks.on("deleteActiveEffect", (activeEffect, options, userId) => { updateTokenEffects(false, activeEffect, userId); });
}

/* -------------------------------------------- */

/**
 * Triggered by the 'createActiveEffect' and 'deleteActiveEffect' hooks.
 * If the active effect is prone, bloodied, or dead, update the token effects.
 * @param {boolean} active Whether the active effect is active
 * @param {object} activeEffect The active effect
 * @param {string} userId The user ID
 */
function updateTokenEffects(active, activeEffect, userId) {
  if ( !game.user.isGM && (game.user.id !== userId || !game.user.hasPermission("TOKEN_CONFIGURE")) ) return;

  let prone = [...activeEffect.statuses].includes("prone");
  let bloodied = [...activeEffect.statuses].includes("bloodied");
  let dead = [...activeEffect.statuses].includes("dead");

  if ( !prone && !bloodied && !dead ) return;

  let tint = null;
  let rotation = null;

  const actor = activeEffect.parent;
  prone = (active && prone) || actor.effects.has("dnd5eprone000000");
  bloodied = (active && bloodied) || actor.effects.has("dnd5ebloodied000");
  dead = (active && dead) || actor.effects.has("dnd5edead0000000");

  Logger.debug("Updating token effects...", { bloodied, dead, prone });

  if ( dead ) {
    tint = getSetting(CONSTANTS.DEAD.SETTING.DEAD_TINT.KEY);
    rotation = getSetting(CONSTANTS.DEAD.SETTING.DEAD_ROTATION.KEY);
  } else {
    if ( bloodied ) { tint = getSetting(CONSTANTS.BLOODIED.SETTING.BLOODIED_TINT.KEY); }
    if ( prone ) { rotation = getSetting(CONSTANTS.PRONE.SETTING.PRONE_ROTATION.KEY); }
  }

  if ( [...activeEffect.statuses].includes("dead") && !activeEffect?.flags?.["custom-dnd5e"]?.ignore ) {
    updateBloodied(actor, null, dead);
  }

  if ( tint ) {
    actor.getActiveTokens().forEach(token => tintToken(token, tint));
  } else {
    actor.getActiveTokens().forEach(token => untintToken(token, tint));
  }

  if ( rotation ) {
    actor.getActiveTokens().forEach(token => rotateToken(token, rotation));
  } else {
    actor.getActiveTokens().forEach(token => unrotateToken(token, rotation));
  }

  Logger.debug("Token effects updated");
}
