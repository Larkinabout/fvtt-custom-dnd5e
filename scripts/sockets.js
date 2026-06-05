import { MODULE } from "./constants.js";
import { animations } from "./utils.js";
import { MoveCanvasMode } from "./activities/move-canvas-mode.js";
import { applySwapMoves } from "./activities/activity-swap.js";
import { handleGiveItem, handleGiveItemRejected, handleGiveItemSource } from "./item-interactions/give-items.js";
import {
  handleAddToContainer,
  handleDropItem,
  handleTakeItem,
  handleConfirmTakeItem
} from "./item-interactions/drop-items.js";
import { executeRequestedRoll } from "./workflows/workflows.js";

/**
 * Handle an incoming animation socket event.
 * @param {object} options The options
 */
function _onAnimation(options) {
  const { type, options: animOptions } = options;
  const handler = animations[type];
  if ( handler ) handler(animOptions);
}

/* -------------------------------------------- */

/**
 * Handle an incoming moveToken socket event.
 * Only processed by the GM client.
 * @param {object} data
 * @param {object} data.options
 * @param {string} data.options.sceneId
 * @param {string} data.options.tokenId
 * @param {number} data.options.x Destination x coordinate
 * @param {number} data.options.y Destination y coordinate
 * @param {boolean} [data.options.isTeleport] Whether to teleport (skip animation)
 */
function _onMoveToken(data) {
  if ( !game.user.isGM ) return;
  const { sceneId, tokenId, x, y, isTeleport } = data.options;
  const scene = game.scenes.get(sceneId);
  const tokenDoc = scene?.tokens.get(tokenId);
  if ( tokenDoc ) MoveCanvasMode._moveTokenDocument(tokenDoc, x, y, { isTeleport });
}

/* -------------------------------------------- */

/**
 * Handle an incoming swapTokens socket event.
 * Only processed by the GM client.
 * @param {object} data The socket data
 * @param {object} data.options The swap options
 * @param {string} data.options.sceneId The scene id
 * @param {string} data.options.sourceTokenId The source token id
 * @param {number} data.options.sourceX The source destination x coordinate
 * @param {number} data.options.sourceY The source destination y coordinate
 * @param {string} data.options.targetTokenId The target token id
 * @param {number} data.options.targetX The target destination x coordinate
 * @param {number} data.options.targetY The target destination y coordinate
 * @param {number} data.options.sourceElevation The source destination elevation
 * @param {number} data.options.targetElevation The target destination elevation
 * @param {boolean} data.options.teleport Whether to teleport (skip animation and wall checks) or walk-animate
 */
function _onSwapTokens(data) {
  if ( !game.user.isGM ) return;
  const {
    sceneId, sourceTokenId, sourceX, sourceY, sourceElevation,
    targetTokenId, targetX, targetY, targetElevation, teleport
  } = data.options;
  const scene = game.scenes.get(sceneId);
  if ( !scene ) return;
  const sourceDoc = scene.tokens.get(sourceTokenId);
  const targetDoc = scene.tokens.get(targetTokenId);
  if ( !sourceDoc || !targetDoc ) return;
  applySwapMoves(scene, {
    sourceDoc, targetDoc,
    newSourcePos: { x: sourceX, y: sourceY },
    newTargetPos: { x: targetX, y: targetY },
    sourceElevation: targetElevation,
    targetElevation: sourceElevation,
    isTeleport: teleport
  });
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
  giveItem: handleGiveItem,
  giveItemRejected: handleGiveItemRejected,
  giveItemSource: handleGiveItemSource,
  addToContainer: handleAddToContainer,
  dropItem: handleDropItem,
  takeItem: handleTakeItem,
  confirmTakeItem: handleConfirmTakeItem,
  moveToken: _onMoveToken,
  requestRoll: _onRequestRoll,
  stopAnimations: _onStopAnimations,
  swapTokens: _onSwapTokens
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
