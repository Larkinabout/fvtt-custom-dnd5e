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
 * @param {number} data.options.sourceElevation The source destination elevation
 * @param {number} data.options.targetElevation The target destination elevation
 * @param {boolean} data.options.teleport Whether to use displace action to bypass wall collision
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
  const action = teleport ? "displace" : undefined;
  const animate = !teleport;
  sourceDoc.move({ x: sourceX, y: sourceY, elevation: sourceElevation, action }, { animate });
  targetDoc.move({ x: targetX, y: targetY, elevation: targetElevation, action }, { animate });
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
