import { CONSTANTS, MODULE } from "../constants.js";

/**
 * Patch Actors._getVisibleTreeContents to hide item actors from the Actors sidebar for players.
 */
export function patchVisibleTreeContents() {
  libWrapper.register(
    MODULE.ID,
    "foundry.documents.collections.Actors.prototype._getVisibleTreeContents",
    getVisibleTreeContentsPatch,
    "WRAPPER"
  );
}

/* -------------------------------------------- */

/**
 * Exclude item actors from the Actors sidebar for players.
 * @param {Function} wrapped
 * @param {...any} args
 * @returns {Actor[]} Actors to list in the sidebar
 */
function getVisibleTreeContentsPatch(wrapped, ...args) {
  const actors = wrapped(...args);
  if ( game.user.isGM ) return actors;
  return actors.filter(actor => actor.type !== CONSTANTS.DROP_ITEMS.ACTOR_TYPE);
}
