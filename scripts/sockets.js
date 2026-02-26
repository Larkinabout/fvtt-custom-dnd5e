import { MODULE } from "./constants.js";
import { animations } from "./utils.js";
import { MoveCanvasMode } from "./activities/move-canvas-mode.js";

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
 * @param {object} data The socket data
 * @param {object} data.options The move options
 * @param {string} data.options.sceneId The scene id
 * @param {string} data.options.tokenId The token id
 * @param {number} data.options.x The destination x coordinate
 * @param {number} data.options.y The destination y coordinate
 */
function _onMoveToken(data) {
  if ( !game.user.isGM ) return;
  const { sceneId, tokenId, x, y } = data.options;
  const scene = game.scenes.get(sceneId);
  const tokenDoc = scene?.tokens.get(tokenId);
  if ( tokenDoc ) MoveCanvasMode._moveTokenDocument(tokenDoc, x, y);
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
 * @param {boolean} data.options.animate Whether to animate the movement
 */
function _onSwapTokens(data) {
  if ( !game.user.isGM ) return;
  const { sceneId, sourceTokenId, sourceX, sourceY, targetTokenId, targetX, targetY, animate } = data.options;
  const scene = game.scenes.get(sceneId);
  if ( !scene ) return;
  scene.updateEmbeddedDocuments("Token", [
    { _id: sourceTokenId, x: sourceX, y: sourceY },
    { _id: targetTokenId, x: targetX, y: targetY }
  ], { animate });
}

/* -------------------------------------------- */

/**
 * Socket action handlers keyed by action name.
 */
const HANDLERS = {
  animation: _onAnimation,
  moveToken: _onMoveToken,
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
