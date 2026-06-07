import { CONSTANTS } from "../constants.js";
import { configs } from "../configurations/registry.js";
import {
  Logger,
  getFlag,
  getSetting,
  rotateToken,
  unrotateToken,
  tintToken,
  untintToken,
  unsetFlag } from "../utils.js";

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
  Hooks.on("updateToken", clearRotationFlag);
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

  const isProne = [...activeEffect.statuses].includes("prone");
  const isBloodied = [...activeEffect.statuses].includes("bloodied");
  const isDead = [...activeEffect.statuses].includes("dead");

  if ( !isProne && !isBloodied && !isDead ) return;

  let tint = null;
  let rotation = null;

  const actor = activeEffect.parent;
  const prone = active ? (isProne || actor.effects.has("dnd5eprone000000"))
    : (!isProne && actor.effects.has("dnd5eprone000000"));
  const bloodied = active ? (isBloodied || actor.effects.has("dnd5ebloodied000"))
    : (!isBloodied && actor.effects.has("dnd5ebloodied000"));
  const dead = active ? (isDead || actor.effects.has("dnd5edead0000000"))
    : (!isDead && actor.effects.has("dnd5edead0000000"));

  Logger.debug("Updating token effects...", { bloodied, dead, prone });

  if ( dead ) {
    tint = getSetting(CONSTANTS.DEAD.SETTING.DEAD_TINT.KEY);
    rotation = getSetting(CONSTANTS.DEAD.SETTING.DEAD_ROTATION.KEY);
  } else {
    if ( bloodied ) { tint = getSetting(configs.bloodied.SETTING.BLOODIED_TINT.KEY); }
    if ( prone ) { rotation = getSetting(CONSTANTS.PRONE.SETTING.PRONE_ROTATION.KEY); }
  }

  if ( [...activeEffect.statuses].includes("dead") && !activeEffect?.flags?.["custom-dnd5e"]?.ignore ) {
    configs.bloodied.updateBloodied(actor, null, dead);
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

/* -------------------------------------------- */

/**
 * Clear the saved rotation flag when a token is manually rotated.
 * @param {object} tokenDocument
 * @param {object} changes
 * @param {object} options
 */
function clearRotationFlag(tokenDocument, changes, options) {
  if ( !("rotation" in changes) ) return;
  if ( options.customDnd5eRotation ) return;
  const flag = getFlag(tokenDocument, "rotation");
  if ( flag !== null ) {
    Logger.debug("Clearing rotation flag due to manual rotation", { token: tokenDocument.name });
    unsetFlag(tokenDocument, "rotation");
  }
}
