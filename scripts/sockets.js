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
