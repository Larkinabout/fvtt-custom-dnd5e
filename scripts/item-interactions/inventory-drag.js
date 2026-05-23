import { CONSTANTS } from "../constants.js";
import { createAppHider, Logger, resolveOwnedItemFromDragEvent } from "../utils.js";

/**
 * Shared singleton appHider used by all inventory-drag workflows.
 * Hides every open application while a drag is over the canvas, except
 * item actor sheets.
 * @type {{hide: () => void, restore: () => Promise<void>}}
 */
export const inventoryDragAppHider = createAppHider({
  exclude: app => app?.document?.type === CONSTANTS.DROP_ITEMS.ACTOR_TYPE
});

/**
 * @typedef {object} InventoryDragHandler
 * @property {(context: {item: Item, actor: Actor}) => boolean} [matches]
 * @property {(context: {item: Item, actor: Actor}) => any} [onStart]
 * @property {(event: DragEvent, context: {item: Item, actor: Actor, state: any, overCanvas: boolean}) => void} [onOver]
 * @property {(context: {item: Item, actor: Actor, state: any}) => void|Promise<void>} [onEnd]
 */

/** @type {InventoryDragHandler[]} */
const handlers = [];

/** @type {{item: Item, actor: Actor, handlers: {handler: InventoryDragHandler, state: any}[]}|null} */
let active = null;

/* -------------------------------------------- */

/**
 * Register a handler with the coordinator.
 * @param {InventoryDragHandler} handler
 */
export function registerInventoryDragHandler(handler) {
  handlers.push(handler);
}

/* -------------------------------------------- */

/**
 * Register drag event listeners on ready.
 */
export function register() {
  Hooks.once("ready", () => {
    document.addEventListener("dragstart", onDragStart, true);
    document.addEventListener("dragover", onDragOver, true);
    document.addEventListener("dragend", onDragEnd, true);
    document.addEventListener("drop", onDragEnd, true);
  });
}

/* -------------------------------------------- */

/**
 * Match registered handlers against the dragged item; for each match,
 * capture its `onStart` return value as the drag's active state.
 * @param {DragEvent} event
 */
function onDragStart(event) {
  active = null;
  if ( !handlers.length ) return;
  const resolved = resolveOwnedItemFromDragEvent(event);
  if ( !resolved ) return;

  const matched = [];
  for ( const handler of handlers ) {
    if ( handler.matches && !handler.matches(resolved) ) continue;
    const state = handler.onStart?.(resolved) ?? null;
    matched.push({ handler, state });
  }
  if ( !matched.length ) return;
  active = { ...resolved, handlers: matched };
}

/* -------------------------------------------- */

/**
 * Forward each pointer move to active handlers.
 * While the cursor is over the canvas, hide every open application,
 * except item actor sheets, so the canvas is fully visible.
 * @param {DragEvent} event
 */
function onDragOver(event) {
  if ( !active ) return;
  const view = canvas?.app?.view;
  const overCanvas = !!view && event.target === view;
  if ( overCanvas ) inventoryDragAppHider.hide();
  else inventoryDragAppHider.restore();

  for ( const { handler, state } of active.handlers ) {
    handler.onOver?.(event, { item: active.item, actor: active.actor, state, overCanvas });
  }
}

/* -------------------------------------------- */

/**
 * Tear down active handlers and restore any applications that were hidden.
 * @returns {Promise<void>}
 */
async function onDragEnd() {
  if ( !active ) return;
  const ending = active;
  active = null;
  for ( const { handler, state } of ending.handlers ) {
    try {
      await handler.onEnd?.({ item: ending.item, actor: ending.actor, state });
    } catch ( err ) {
      Logger.error(err);
    }
  }
  await inventoryDragAppHider.restore();
}
