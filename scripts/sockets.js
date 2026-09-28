import { MODULE } from "./constants.js";
import { animations, playLocalAnimation } from "./animations.js";
import { clearLocal3dDice } from "./activities/activity-multiattack.js";
import { handleGiveItem, handleGiveItemRejected, handleGiveItemSource } from "./item-interactions/give-items.js";
import {
  handleAddToContainer,
  handleDropItem,
  handleTakeItem,
  handleConfirmTakeItem
} from "./item-interactions/drop-items.js";
import { executeRequestedRoll } from "./workflows/workflows.js";
import { handleActionChosen, handleRequestAction } from "./gameplay/speed-factor-initiative.js";

/**
 * Handle an incoming animation socket event.
 * @param {object} options The options
 */
function _onAnimation(options) {
  const { type, options: animOptions } = options;
  playLocalAnimation(type, animOptions);
}

/* -------------------------------------------- */

/**
 * Handle an incoming requestRoll socket event.
 * Only processed by non-GM clients that own the actor.
 * @param {object} data The socket data
 * @param {object} data.options The roll options
 * @param {string} data.options.actorUuid The actor UUID
 * @param {object} data.options.rollConfig The roll configuration
 */
async function _onRequestRoll(data) {
  if ( game.user.isGM ) return;
  const { actorUuid, rollConfig } = data.options;
  const actor = await fromUuid(actorUuid);
  if ( !actor?.isOwner ) return;
  executeRequestedRoll(actor, rollConfig);
}

/* -------------------------------------------- */

/**
 * Handle an incoming stopAnimations socket event.
 * @param {object} data The socket data
 */
function _onStopAnimations(data) {
  animations.stopAll();
}

/* -------------------------------------------- */

/**
 * Socket action handlers keyed by action name.
 */
const HANDLERS = {
  animation: _onAnimation,
  clear3dDice: clearLocal3dDice,
  giveItem: handleGiveItem,
  giveItemRejected: handleGiveItemRejected,
  giveItemSource: handleGiveItemSource,
  addToContainer: handleAddToContainer,
  dropItem: handleDropItem,
  takeItem: handleTakeItem,
  confirmTakeItem: handleConfirmTakeItem,
  requestRoll: _onRequestRoll,
  sfRequestAction: handleRequestAction,
  sfActionChosen: handleActionChosen,
  stopAnimations: _onStopAnimations
};

/* -------------------------------------------- */

/**
 * Register the module socket listener.
 */
export function registerSockets() {
  game.socket.on(`module.${MODULE.ID}`, data => {
    const handler = HANDLERS[data.action];
    if ( handler ) handler(data);
  });
}
