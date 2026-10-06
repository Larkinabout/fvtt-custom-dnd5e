import { CONSTANTS } from "../constants.js";
import {
  c5eLoadTemplates,
  createOrStackItems,
  findAppForElement,
  findTargetTokenAt,
  getOrCreateFolder,
  getSetting,
  getTokenSourceCenter,
  Logger,
  measureDistance,
  queryGM,
  registerSetting,
  setSetting
} from "../utils.js";
import { ItemDialog } from "../applications/item-dialog.js";
import { getUnlockedName, isContainerLocked, registerContainerLock, setContainerLockData } from "./container-lock.js";
import { addCursorLabelIcon, setCursorLabelIcon, setCursorLabelPosition } from "../interface/cursor-label.js";
import { inventoryDragAppHider, registerInventoryDragHandler } from "./inventory-drag.js";
import * as DropItemsHighlight from "./drop-items-highlight.js";
import { patchVisibleTreeContents } from "../patches/visible-tree-contents.js";

const SETTING = CONSTANTS.DROP_ITEMS.SETTING;
const ACTOR_TYPE = CONSTANTS.DROP_ITEMS.ACTOR_TYPE;

const ICON_ID = "custom-dnd5e-cursor-label-drop-item";
const CONTAINER_ICON_ID = "custom-dnd5e-cursor-label-drop-container";

/* -------------------------------------------- */
/*  REGISTRATION                                */
/* -------------------------------------------- */

/**
 * Register settings, hooks, and templates.
 */
export function register() {
  registerSettings();
  c5eLoadTemplates([
    CONSTANTS.DROP_ITEMS.TEMPLATE.SHEET,
    CONSTANTS.DROP_ITEMS.TEMPLATE.HUD
  ]);
  if ( !getSetting(SETTING.ENABLE.KEY) ) return;
  registerHooks();
}

/* -------------------------------------------- */

/**
 * Register settings.
 */
function registerSettings() {
  registerSetting(SETTING.ENABLE.KEY, {
    name: game.i18n.localize(SETTING.ENABLE.NAME),
    hint: game.i18n.localize(SETTING.ENABLE.HINT),
    scope: "world",
    config: false,
    requiresReload: true,
    type: Boolean,
    default: true
  });

  registerSetting(SETTING.RANGE.KEY, {
    name: game.i18n.localize(SETTING.RANGE.NAME),
    hint: game.i18n.localize(SETTING.RANGE.HINT),
    scope: "world",
    config: false,
    type: Number,
    default: 5
  });

  registerSetting(SETTING.DROP_RANGE.KEY, {
    name: game.i18n.localize(SETTING.DROP_RANGE.NAME),
    hint: game.i18n.localize(SETTING.DROP_RANGE.HINT),
    scope: "world",
    config: false,
    type: Number,
    default: 5
  });

  registerSetting(SETTING.TOKEN_SCALE.KEY, {
    name: game.i18n.localize(SETTING.TOKEN_SCALE.NAME),
    hint: game.i18n.localize(SETTING.TOKEN_SCALE.HINT),
    scope: "world",
    config: false,
    type: Number,
    default: 1
  });

  registerSetting(SETTING.IMAGE_SHAPE.KEY, {
    name: game.i18n.localize(SETTING.IMAGE_SHAPE.NAME),
    hint: game.i18n.localize(SETTING.IMAGE_SHAPE.HINT),
    scope: "world",
    config: false,
    type: String,
    default: "none",
    choices: SETTING.IMAGE_SHAPE.CHOICES
  });

  registerSetting(SETTING.IMAGE_BORDER_COLOR.KEY, {
    name: game.i18n.localize(SETTING.IMAGE_BORDER_COLOR.NAME),
    hint: game.i18n.localize(SETTING.IMAGE_BORDER_COLOR.HINT),
    scope: "world",
    config: false,
    type: String,
    default: "#9f9275"
  });

  registerSetting(SETTING.IMAGE_BORDER_THICKNESS.KEY, {
    name: game.i18n.localize(SETTING.IMAGE_BORDER_THICKNESS.NAME),
    hint: game.i18n.localize(SETTING.IMAGE_BORDER_THICKNESS.HINT),
    scope: "world",
    config: false,
    type: Number,
    default: 0
  });

  registerSetting(SETTING.DROPPABLE_TYPES.KEY, {
    name: game.i18n.localize(SETTING.DROPPABLE_TYPES.NAME),
    hint: game.i18n.localize(SETTING.DROPPABLE_TYPES.HINT),
    scope: "world",
    config: false,
    type: Array,
    default: SETTING.DROPPABLE_TYPES.CHOICES
  });

  registerSetting(SETTING.ALLOW_PLAYER_DROPS.KEY, {
    name: game.i18n.localize(SETTING.ALLOW_PLAYER_DROPS.NAME),
    hint: game.i18n.localize(SETTING.ALLOW_PLAYER_DROPS.HINT),
    scope: "world",
    config: false,
    type: Boolean,
    default: true
  });

  registerSetting(SETTING.CHAT_NOTIFICATIONS.KEY, {
    name: game.i18n.localize(SETTING.CHAT_NOTIFICATIONS.NAME),
    hint: game.i18n.localize(SETTING.CHAT_NOTIFICATIONS.HINT),
    scope: "world",
    config: false,
    type: Boolean,
    default: true
  });

  registerSetting(SETTING.FOLDER_ID.KEY, {
    scope: "world",
    config: false,
    type: String,
    default: ""
  });
}

/* -------------------------------------------- */

/**
 * Register hooks.
 */
function registerHooks() {
  Hooks.on("dropCanvasData", onDropCanvasData);
  Hooks.on("dnd5e.getItemContextOptions", onGetItemContextOptions);
  Hooks.on("deleteToken", onDeleteToken);
  Hooks.on("deleteToken", refreshOpenSheets);
  Hooks.on("createToken", refreshOpenSheets);
  Hooks.on("moveToken", refreshOpenSheets);
  Hooks.on("stopToken", refreshOpenSheets);
  Hooks.on("updateToken", onTokenPositionChange);
  Hooks.on("refreshToken", onRefreshToken);
  Hooks.on("destroyToken", onDestroyTokenAppearance);
  patchVisibleTreeContents();
  registerContainerLock();

  Hooks.once("ready", () => {
    addCursorLabelIcon(ICON_ID, '<i class="fa-solid fa-hand-holding-box"></i>');
    addCursorLabelIcon(CONTAINER_ICON_ID, '<i class="fa-solid fa-hand-holding-box"></i>');
  });
  registerInventoryDragHandler({
    matches: ({ item }) => {
      if ( !getSetting(SETTING.ENABLE.KEY) ) return false;
      if ( !isDroppable(item) ) return false;
      if ( !game.user.isGM && !getSetting(SETTING.ALLOW_PLAYER_DROPS.KEY) ) return false;
      return true;
    },
    onStart: ({ actor }) => {
      // GMs aren't range-limited, so the highlight would be misleading.
      if ( !game.user.isGM ) {
        const sourceToken = actor.getActiveTokens?.()?.[0];
        if ( sourceToken ) {
          DropItemsHighlight.activate({
            sourceToken,
            rangeUnits: Number(getSetting(SETTING.DROP_RANGE.KEY)) || 0
          });
        }
      }
    },
    onOver: event => {
      setCursorLabelPosition(event.clientX, event.clientY);
      const showIcons = (ground, container) => {
        setCursorLabelIcon(ICON_ID, ground);
        setCursorLabelIcon(CONTAINER_ICON_ID, container);
      };

      const lootApp = findAppForElement(event.target, ".custom-dnd5e-drop-items-sheet");
      if ( lootApp?.actor?.system?.isContainer ) return showIcons(false, true);

      const view = canvas?.app?.view;
      if ( event.target !== view ) return showIcons(false, false);

      const world = canvas.stage.worldTransform.applyInverse({ x: event.clientX, y: event.clientY });
      const target = findTargetTokenAt(world.x, world.y);
      if ( target && isItemToken(target) && target.actor?.system?.isContainer ) showIcons(false, true);
      else if ( target ) showIcons(false, false);
      else showIcons(true, false);
    },
    onEnd: () => {
      setCursorLabelIcon(ICON_ID, false);
      setCursorLabelIcon(CONTAINER_ICON_ID, false);
      DropItemsHighlight.deactivate();
    }
  });
}

/* -------------------------------------------- */
/*  DROP HANDLERS                               */
/* -------------------------------------------- */

/**
 * Route a canvas drop to either a container-target drop or a ground drop,
 * based on what (if anything) is under the drop point.
 * @param {Canvas} _canvas
 * @param {object} data
 * @param {DragEvent} [_event]
 * @returns {Promise<boolean|undefined>}
 */
async function onDropCanvasData(_canvas, data, _event) {
  if ( !getSetting(SETTING.ENABLE.KEY) ) return;
  if ( data?.type !== "Item" ) return;
  if ( typeof data.x !== "number" || typeof data.y !== "number" ) return;

  const target = findTargetTokenAt(data.x, data.y);
  if ( target ) {
    if ( isItemToken(target) && target.actor?.system?.isContainer ) {
      return dropOntoContainerToken(target, data);
    }
    return;
  }
  return dropOntoGround(data);
}

/* -------------------------------------------- */

/**
 * Drop an item onto a container item token, routing it into the container's
 * contents.
 * @param {Token} target
 * @param {object} data
 * @returns {Promise<boolean|undefined>}
 */
async function dropOntoContainerToken(target, data) {
  if ( target.actor.system.locked ) {
    Logger.info(game.i18n.localize("CUSTOM_DND5E.dropItems.error.containerLocked"), true, { prefix: false });
    return false;
  }
  const item = await Item.implementation.fromDropData(data);
  if ( !item || !isDroppable(item) ) return;
  if ( item.actor && !item.actor.isOwner ) return;

  let qty;
  if ( (item.system?.quantity ?? 1) > 1 && item.type !== "container" ) {
    qty = await promptQuantity(item, {
      title: game.i18n.format("CUSTOM_DND5E.dropItems.confirmAdd.title", {
        container: target.actor.name
      }),
      prompt: game.i18n.format("CUSTOM_DND5E.dropItems.promptQuantity.add", {
        item: item.name,
        container: target.actor.name
      })
    });
    if ( qty === null ) return false;
  } else {
    const confirmed = await confirmAddToContainer(item, target.actor);
    if ( !confirmed ) return false;
  }

  try {
    await addToContainer(target.actor, item, { quantity: qty });
  } catch ( err ) {
    Logger.error(err);
    ui.notifications.error(game.i18n.localize("CUSTOM_DND5E.dropItems.error.cannotDrop"));
  }
  return false;
}

/* -------------------------------------------- */

/**
 * Drop an item onto an empty canvas spot, creating a new item actor + token.
 * @param {object} data
 * @returns {Promise<boolean|undefined>}
 */
async function dropOntoGround(data) {
  const item = await Item.implementation.fromDropData(data);
  if ( !item || !isDroppable(item) ) return;

  const fromActor = item.actor ?? null;
  if ( fromActor && !fromActor.isOwner ) return;
  if ( !fromActor && !game.user.isGM ) return;
  if ( fromActor && !game.user.isGM && !getSetting(SETTING.ALLOW_PLAYER_DROPS.KEY) ) {
    Logger.info(game.i18n.localize("CUSTOM_DND5E.dropItems.error.notAllowed"), true, { prefix: false });
    return false;
  }
  if ( !isDropInRange(fromActor, data.x, data.y) ) {
    Logger.info(game.i18n.localize("CUSTOM_DND5E.dropItems.error.dropOutOfRange"), true, { prefix: false });
    return false;
  }

  const qty = await promptDropQuantity(item);
  if ( qty === null ) return false;

  await tryCreateAtPoint(item, data.x, data.y, qty);
  return false;
}

/* -------------------------------------------- */

/**
 * Prompt the user to choose a drop quantity. Returns `undefined` for items
 * that don't need a prompt (containers, single-quantity).
 * @param {Item} item
 * @returns {Promise<number|null|undefined>} Chosen qty, `null` if cancelled,
 *   `undefined` if no prompt was needed
 */
async function promptDropQuantity(item) {
  if ( (item.system?.quantity ?? 1) <= 1 || item.type === "container" ) return undefined;
  return promptQuantity(item, {
    title: game.i18n.localize("CUSTOM_DND5E.dropItems.promptQuantity.dropTitle"),
    prompt: game.i18n.format("CUSTOM_DND5E.dropItems.promptQuantity.drop", { item: item.name })
  });
}

/* -------------------------------------------- */

/**
 * Create an item actor at a point, surfacing failures as notifications.
 * @param {Item} item
 * @param {number} x
 * @param {number} y
 * @param {number|undefined} qty
 * @returns {Promise<void>}
 */
async function tryCreateAtPoint(item, x, y, qty) {
  try {
    await executeDrop({ item, x, y, fromActor: item.actor ?? null, quantity: qty });
  } catch ( err ) {
    Logger.error(err);
    ui.notifications.error(game.i18n.localize("CUSTOM_DND5E.dropItems.error.cannotDrop"));
  }
}

/* -------------------------------------------- */

/**
 * Add a 'Drop' option to the item context menu.
 * @param {Item} item
 * @param {object[]} menuItems
 */
function onGetItemContextOptions(item, menuItems) {
  menuItems.push({
    name: "CUSTOM_DND5E.dropItems.context.drop",
    icon: '<i class="fas fa-arrow-down"></i>',
    condition: () => isDroppable(item)
      && !!item.actor?.isOwner
      && (game.user.isGM || getSetting(SETTING.ALLOW_PLAYER_DROPS.KEY)),
    callback: () => beginPlacement(item).catch(err => Logger.error(err))
  });
}

/* -------------------------------------------- */
/*  HELPERS                                     */
/* -------------------------------------------- */

/**
 * Clamp a requested transfer quantity to a valid range [1, available].
 * @param {number|null|undefined} quantity
 * @param {number} available
 * @returns {number}
 */
function clampQuantity(quantity, available) {
  const n = Number(quantity);
  return Math.max(1, Math.min(Number.isFinite(n) ? n : available, available));
}

/* -------------------------------------------- */

/**
 * Resolve transfer of an item into a dropped item.
 * @param {Item} item
 * @param {number|null|undefined} quantity Requested quantity, or nullish for "all".
 * @returns {{ isContainer: boolean, available: number, qty: number, isPartialStack: boolean }}
 */
function resolveQuantityTransfer(item, quantity) {
  const isContainer = item.type === "container";
  const available = item.system?.quantity ?? 1;
  const qty = isContainer ? available : clampQuantity(quantity, available);
  const isPartialStack = !isContainer && qty < available;
  return { isContainer, available, qty, isPartialStack };
}

/* -------------------------------------------- */

/**
 * Whether an item can be dropped onto the canvas.
 * @param {Item} item
 * @returns {boolean}
 */
function isDroppable(item) {
  if ( !item ) return false;
  const allowed = getSetting(SETTING.DROPPABLE_TYPES.KEY) ?? SETTING.DROPPABLE_TYPES.CHOICES;
  if ( !allowed.includes(item.type) ) return false;
  if ( item.type === "container" ) return true;
  return (item.system?.quantity ?? 0) >= 1;
}

/* -------------------------------------------- */

/**
 * Whether a token's actor is an item actor.
 * @param {Token|TokenDocument} token
 * @returns {boolean}
 */
export function isItemToken(token) {
  const actor = token?.actor ?? token?.document?.actor;
  return actor?.type === ACTOR_TYPE;
}

/* -------------------------------------------- */

/**
 * Whether the given drop point is within the actor's allowed range.
 * GMs are exempt.
 * @param {Actor|null} fromActor
 * @param {number} x
 * @param {number} y
 * @returns {boolean}
 */
function isDropInRange(fromActor, x, y) {
  if ( game.user.isGM ) return true;
  if ( !fromActor ) return true;
  const range = Number(getSetting(SETTING.DROP_RANGE.KEY)) || 0;
  if ( range <= 0 ) return true;
  const fromToken = fromActor.getActiveTokens?.()?.[0];
  if ( !fromToken ) return true;
  const dropPoint = canvas.grid?.isGridless
    ? { x, y }
    : canvas.grid.getCenterPoint(canvas.grid.getOffset({ x, y }));
  const fromCenter = getTokenSourceCenter(fromToken);
  if ( !fromCenter ) return true;
  return measureDistance(fromCenter, dropPoint) <= range;
}

/* -------------------------------------------- */

/**
 * Resolve the actor folder used to organise item actors.
 * @returns {Promise<Folder|null>}
 */
async function getOrCreateDropItemsFolder() {
  const key = SETTING.FOLDER_ID.KEY;
  const storedId = getSetting(key);
  const folder = await getOrCreateFolder({
    type: "Actor",
    name: game.i18n.localize(CONSTANTS.DROP_ITEMS.FOLDER_NAME),
    storedId,
    color: "#6e00b4"
  });
  if ( folder && folder.id !== storedId ) await setSetting(key, folder.id);
  return folder;
}

/* -------------------------------------------- */
/*  PLACEMENT MODE                              */
/* -------------------------------------------- */

/**
 * Enter placement mode:
 * - Left-click drops the item.
 * - Escape cancels.
 * @param {Item} item
 * @returns {Promise<void>}
 */
async function beginPlacement(item) {
  if ( !canvas?.ready ) return;

  Logger.info(
    game.i18n.format("CUSTOM_DND5E.dropItems.placePrompt", { item: item.name }),
    true,
    { prefix: false }
  );

  const stage = canvas.app?.stage;
  if ( !stage ) return;

  inventoryDragAppHider.hide();
  if ( !game.user.isGM ) {
    const sourceToken = item.actor?.getActiveTokens?.()?.[0];
    if ( sourceToken ) {
      DropItemsHighlight.activate({
        sourceToken,
        rangeUnits: Number(getSetting(SETTING.DROP_RANGE.KEY)) || 0
      });
    }
  }

  const canvasView = canvas.app?.view;
  const previousCanvasCursor = canvasView?.style.cursor ?? "";

  const cleanup = async () => {
    stage.off("pointerdown", onPointer);
    document.removeEventListener("pointermove", onMove, true);
    document.removeEventListener("keydown", onKey, true);
    DropItemsHighlight.deactivate();
    setCursorLabelIcon(ICON_ID, false);
    if ( canvasView ) canvasView.style.cursor = previousCanvasCursor;
    await inventoryDragAppHider.restore();
  };

  const onMove = event => {
    const overCanvas = event.target === canvasView;
    setCursorLabelPosition(event.clientX, event.clientY);
    if ( !overCanvas ) {
      setCursorLabelIcon(ICON_ID, false);
      if ( canvasView ) canvasView.style.cursor = previousCanvasCursor;
      return;
    }
    const world = canvas.stage.worldTransform.applyInverse({ x: event.clientX, y: event.clientY });
    const valid = isDropInRange(item.actor ?? null, world.x, world.y);
    setCursorLabelIcon(ICON_ID, valid);
    canvasView.style.cursor = valid ? "pointer" : previousCanvasCursor;
  };

  const onPointer = async event => {
    if ( event.button !== 0 ) return;

    const pos = event.getLocalPosition?.(stage)
      ?? canvas.stage.worldTransform.applyInverse({ x: event.clientX, y: event.clientY });

    if ( !isDropInRange(item.actor ?? null, pos.x, pos.y) ) {
      Logger.info(game.i18n.localize("CUSTOM_DND5E.dropItems.error.dropOutOfRange"), true, { prefix: false });
      return;
    }

    const qty = await promptDropQuantity(item);
    if ( qty === null ) return;

    await cleanup();
    await tryCreateAtPoint(item, pos.x, pos.y, qty);
  };

  const onKey = event => {
    if ( event.key === "Escape" ) {
      event.preventDefault();
      cleanup();
    }
  };

  stage.eventMode = "static";
  stage.on("pointerdown", onPointer);
  document.addEventListener("pointermove", onMove, true);
  document.addEventListener("keydown", onKey, true);
}

/* -------------------------------------------- */
/*  DROP EXECUTION                              */
/* -------------------------------------------- */

/**
 * Execute a drop: build the actor data, create it (directly or via GM
 * socket), decrement the source actor, and post a chat message.
 * @param {object} args
 * @param {Item} args.item
 * @param {number} args.x
 * @param {number} args.y
 * @param {Actor|null} [args.fromActor]
 * @param {number} [args.quantity]
 * @returns {Promise<{actor: Actor, token: TokenDocument}|null>}
 */
export async function executeDrop({ item, x, y, fromActor = null, quantity }) {
  const scene = canvas.scene;
  if ( !scene ) return null;

  const { isContainer, available, qty, isPartialStack } = resolveQuantityTransfer(item, quantity);

  const sourceItems = [item, ...(await resolveContents(item))];

  const itemDataList = sourceItems.map((i, idx) => {
    const data = prepareItemForActor(i, idx === 0);
    if ( idx === 0 ) {
      data.system ??= {};
      data.system.quantity = qty;
    }
    return data;
  });

  const compendiumSource = item._stats?.compendiumSource ?? item.uuid;
  const locked = isContainerLocked(item);
  const folder = await getOrCreateDropItemsFolder();

  let actor;
  let tokenDoc;
  if ( game.user.isGM || game.user.hasPermission?.("ACTOR_CREATE") ) {
    ({ actor, tokenDoc } = await createItemActor({
      name: getUnlockedName(item),
      img: item.img,
      itemDataList,
      x, y,
      folder,
      droppedBy: fromActor?.uuid ?? "",
      isContainer,
      locked,
      itemUuid: compendiumSource,
      scene
    }));
  } else {
    const placed = await queryGM("dropItem", {
      itemDataList,
      name: getUnlockedName(item),
      img: item.img,
      sceneId: scene.id,
      x, y,
      isContainer,
      locked,
      droppedBy: fromActor?.uuid ?? "",
      itemUuid: compendiumSource,
      folderId: folder?.id ?? null
    });
    if ( !placed ) return null;
  }

  if ( fromActor && sourceItems.length ) {
    if ( isPartialStack ) await item.update({ "system.quantity": available - qty });
    else await removeFromSourceActor(fromActor, sourceItems);
  }

  if ( getSetting(SETTING.CHAT_NOTIFICATIONS.KEY) ) {
    postDropChat({ item, fromActor, quantity: qty });
  }

  return actor ? { actor, tokenDoc } : null;
}

/* -------------------------------------------- */

/**
 * Create the item actor with its token on the scene.
 * @param {object} args
 * @param {string} args.name
 * @param {string} args.img
 * @param {object[]} args.itemDataList
 * @param {number} args.x
 * @param {number} args.y
 * @param {Folder|null} args.folder
 * @param {string} args.droppedBy Source actor UUID
 * @param {boolean} args.isContainer
 * @param {boolean} [args.locked]
 * @param {string} args.itemUuid
 * @param {Scene} args.scene
 * @returns {Promise<{actor: Actor, tokenDoc: TokenDocument}>}
 */
async function createItemActor({
  name, img, itemDataList, x, y, folder, droppedBy, isContainer, locked, itemUuid, scene
}) {
  const resolvedImg = img || CONSTANTS.DROP_ITEMS.DEFAULT_ICON;
  const tokenScale = Number(getSetting(SETTING.TOKEN_SCALE.KEY)) || 1;
  const actorData = {
    name,
    type: ACTOR_TYPE,
    img: resolvedImg,
    folder: folder?.id ?? null,
    items: itemDataList,
    system: {
      droppedBy: droppedBy ?? "",
      droppedAt: Date.now(),
      itemUuid: itemUuid ?? "",
      isContainer: !!isContainer,
      locked: !!locked
    },
    prototypeToken: {
      name,
      texture: { src: resolvedImg, scaleX: tokenScale, scaleY: tokenScale },
      actorLink: true,
      disposition: CONST.TOKEN_DISPOSITIONS.NEUTRAL,
      displayBars: CONST.TOKEN_DISPLAY_MODES.NONE,
      displayName: CONST.TOKEN_DISPLAY_MODES.NONE,
      sight: { enabled: false },
      lockRotation: true,
      width: 1,
      height: 1
    },
    ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER }
  };

  const actor = await Actor.implementation.create(actorData, { keepId: false });
  if ( !actor ) throw new Error("Failed to create item actor.");

  const tokenData = await actor.getTokenDocument({}, { parent: scene });
  const position = CONFIG.Token.objectClass._getDropActorPosition(tokenData, { x, y }, { snap: true });
  tokenData.updateSource({ ...position, sight: { enabled: false } });

  const [tokenDoc] = await scene.createEmbeddedDocuments("Token", [tokenData.toObject()]);
  return { actor, tokenDoc };
}

/* -------------------------------------------- */

/**
 * Prepare the item for creation on the item actor.
 * @param {Item} item
 * @param {boolean} isRoot Whether this is the root item
 * @returns {object}
 */
function prepareItemForActor(item, isRoot) {
  const data = item.toObject();
  delete data.ownership;
  delete data.folder;
  delete data.sort;
  if ( isRoot && data.system ) data.system.container = null;
  if ( isRoot ) setContainerLockData(data, false);
  return data;
}

/* -------------------------------------------- */

/**
 * Resolve all descendants of a container item.
 * @param {Item} item
 * @returns {Promise<Item[]>}
 */
async function resolveContents(item) {
  if ( item?.type !== "container" ) return [];
  const contents = item.system?.allContainedItems;
  const resolved = contents instanceof Promise ? await contents : contents;
  return resolved ? Array.from(resolved) : [];
}

/* -------------------------------------------- */

/**
 * Remove dropped items from the source actor.
 * @param {Actor} actor
 * @param {Item[]} items
 * @returns {Promise<void>}
 */
async function removeFromSourceActor(actor, items) {
  const ordered = [...items].sort((a, b) => (a.type === "container") - (b.type === "container"));
  const ids = ordered.map(i => i.id).filter(Boolean);
  if ( !ids.length ) return;
  await actor.deleteEmbeddedDocuments("Item", ids);
}

/* -------------------------------------------- */

/**
 * Post a dropped item message to chat.
 * @param {object} args
 * @param {Item} args.item
 * @param {Actor|null} args.fromActor
 * @param {number} args.quantity
 */
function postDropChat({ item, fromActor, quantity }) {
  if ( !fromActor ) return;
  const qty = quantity > 1 ? `${quantity}× ` : "";
  const content = game.i18n.format("CUSTOM_DND5E.dropItems.chat.dropped", {
    actor: fromActor.name, qty, item: item.name
  });
  postChat({ speaker: ChatMessage.getSpeaker({ actor: fromActor }), content });
}

/* -------------------------------------------- */

/**
 * Post a message to chat.
 * @param {object} args
 * @param {object} [args.speaker]
 * @param {string} args.content
 * @returns {Promise<ChatMessage>} Created message
 */
function postChat({ speaker, content }) {
  const chatData = {
    speaker,
    content: `<p>${content}</p>`,
    flags: { "custom-dnd5e": { source: "dropItems" } }
  };
  if ( game.user.isGM ) ChatMessage.applyMode(chatData);
  return ChatMessage.create(chatData);
}

/* -------------------------------------------- */
/*  ADD TO CONTAINER                            */
/* -------------------------------------------- */

/**
 * Prompt the user to confirm adding an item to a container.
 * @param {Item} item
 * @param {Actor} itemActor
 * @returns {Promise<boolean>}
 */
async function confirmAddToContainer(item, itemActor) {
  const qty = (item.system?.quantity ?? 1) > 1 ? `${item.system.quantity}× ` : "";
  return ItemDialog.confirm({
    title: game.i18n.format("CUSTOM_DND5E.dropItems.confirmAdd.title", { container: itemActor.name }),
    content: `<p>${game.i18n.format("CUSTOM_DND5E.dropItems.confirmAdd.content", {
      qty,
      item: item.name,
      container: itemActor.name
    })}</p>`
  });
}

/* -------------------------------------------- */

/**
 * Prompt for a quantity. Returns the full amount without a dialog for
 * containers and single-quantity items.
 * @param {Item} item
 * @param {object} args
 * @param {string} args.title
 * @param {string} args.prompt
 * @param {string} [args.warning]
 * @returns {Promise<number|null>}
 */
export async function promptQuantity(item, { title, prompt, warning } = {}) {
  const available = item?.system?.quantity ?? 1;
  if ( item?.type === "container" || available <= 1 ) return available;
  return ItemDialog.quantity({ title, prompt, max: available, warning });
}

/* -------------------------------------------- */

/**
 * Add an item to the contents of a container item actor.
 * Routes through the GM via socket when user doesn't own the item actor.
 * @param {Actor} itemActor
 * @param {Item} sourceItem
 * @param {object} [opts]
 * @param {number} [opts.quantity] Quantity to transfer
 * @returns {Promise<void>}
 */
export async function addToContainer(itemActor, sourceItem, { quantity } = {}) {
  if ( !itemActor || itemActor.type !== ACTOR_TYPE ) return;
  if ( !sourceItem ) return;
  if ( sourceItem.actor && !sourceItem.actor.isOwner ) return;
  if ( sourceItem.actor?.id === itemActor.id ) return;
  if ( !isDroppable(sourceItem) ) {
    Logger.info(game.i18n.localize("CUSTOM_DND5E.dropItems.error.cannotDrop"), true, { prefix: false });
    return;
  }

  if ( itemActor.system?.locked ) {
    Logger.info(game.i18n.localize("CUSTOM_DND5E.dropItems.error.containerLocked"), true, { prefix: false });
    return;
  }

  const root = Array.from(itemActor.items).find(i => !i.system?.container);
  if ( !root || root.type !== "container" ) {
    Logger.info(game.i18n.localize("CUSTOM_DND5E.dropItems.error.notContainer"), true, { prefix: false });
    return;
  }

  const { available, qty, isPartialStack } = resolveQuantityTransfer(sourceItem, quantity);

  const sourceItems = [sourceItem, ...(await resolveContents(sourceItem))];
  const itemDataList = sourceItems.map((i, idx) => {
    const data = prepareItemForActor(i, false);
    if ( idx === 0 ) {
      data.system ??= {};
      data.system.container = root.id;
      data.system.quantity = qty;
    }
    return data;
  });

  // Loot actor is GM-owned, so non-GMs reuqest for the GM to add the item and only take the itemfrom the
  // actor once it has been added.
  if ( game.user.isGM ) {
    await applyAddToContainer(itemActor.uuid, itemDataList);
  } else {
    const added = await queryGM("addToContainer", { itemActorUuid: itemActor.uuid, itemDataList });
    if ( !added ) return;
  }

  if ( sourceItem.actor ) {
    if ( isPartialStack ) {
      await sourceItem.update({ "system.quantity": available - qty });
    } else {
      await removeFromSourceActor(sourceItem.actor, sourceItems);
    }
  }

  if ( getSetting(SETTING.CHAT_NOTIFICATIONS.KEY) ) {
    postAddChat({
      sourceItem,
      fromActor: sourceItem.actor ?? null,
      itemActor,
      quantity: qty
    });
  }
}

/* -------------------------------------------- */

/**
 * Populate an empty item actor with a dropped item.
 * @param {Actor} itemActor
 * @param {Item} sourceItem
 * @param {object} [opts]
 * @param {number} [opts.quantity]
 * @returns {Promise<void>}
 */
export async function populateEmptyItemActor(itemActor, sourceItem, { quantity } = {}) {
  if ( !game.user.isGM ) return;
  if ( !itemActor || itemActor.type !== ACTOR_TYPE ) return;
  if ( itemActor.items.size > 0 ) return;
  if ( !sourceItem ) return;
  if ( sourceItem.actor && !sourceItem.actor.isOwner ) return;
  if ( !isDroppable(sourceItem) ) {
    Logger.info(game.i18n.localize("CUSTOM_DND5E.dropItems.error.cannotDrop"), true, { prefix: false });
    return;
  }

  const { isContainer, available, qty, isPartialStack } = resolveQuantityTransfer(sourceItem, quantity);

  const sourceItems = [sourceItem, ...(await resolveContents(sourceItem))];
  const itemDataList = sourceItems.map((i, idx) => {
    const data = prepareItemForActor(i, idx === 0);
    if ( idx === 0 ) {
      data.system ??= {};
      data.system.quantity = qty;
    }
    return data;
  });

  const compendiumSource = sourceItem._stats?.compendiumSource ?? sourceItem.uuid;
  await itemActor.update({
    name: getUnlockedName(sourceItem),
    img: sourceItem.img,
    "prototypeToken.name": getUnlockedName(sourceItem),
    "prototypeToken.texture.src": sourceItem.img,
    "system.isContainer": isContainer,
    "system.locked": !!itemActor.system.locked || isContainerLocked(sourceItem),
    "system.itemUuid": compendiumSource,
    "system.droppedAt": Date.now()
  });
  await itemActor.createEmbeddedDocuments("Item", itemDataList, { keepId: true });

  if ( sourceItem.actor ) {
    if ( isPartialStack ) await sourceItem.update({ "system.quantity": available - qty });
    else await removeFromSourceActor(sourceItem.actor, sourceItems);
  }
}

/* -------------------------------------------- */

/**
 * Add items to a container item actor.
 * Run on the active GM's client.
 * @param {object} data
 * @param {string} data.itemActorUuid
 * @param {object[]} data.itemDataList Items to add
 * @returns {Promise<boolean>} Whether the items were added
 */
export async function onAddToContainerQuery({ itemActorUuid, itemDataList }) {
  return applyAddToContainer(itemActorUuid, itemDataList);
}

/* -------------------------------------------- */

/**
 * Apply the embedded-item creation locally.
 * Caller must already have the permission to create on the loot actor.
 * @param {string} itemActorUuid
 * @param {object[]} itemDataList
 * @returns {Promise<boolean>} Whether the items were added
 */
async function applyAddToContainer(itemActorUuid, itemDataList) {
  const itemActor = await fromUuid(itemActorUuid);
  if ( !itemActor || itemActor.type !== ACTOR_TYPE ) return false;
  try {
    await createOrStackItems(itemActor, itemDataList);
    return true;
  } catch ( err ) {
    Logger.error(err);
    return false;
  }
}

/* -------------------------------------------- */

/**
 * Post a chat message announcing that an item was placed into a loot container.
 * @param {object} args
 * @param {Item} args.sourceItem
 * @param {Actor|null} args.fromActor
 * @param {Actor} args.itemActor
 * @param {number} args.quantity
 */
function postAddChat({ sourceItem, fromActor, itemActor, quantity }) {
  const qty = quantity > 1 ? `${quantity}× ` : "";
  const content = fromActor
    ? game.i18n.format("CUSTOM_DND5E.dropItems.chat.addedToContainer", {
      actor: fromActor.name, qty, item: sourceItem.name, container: itemActor.name
    })
    : game.i18n.format("CUSTOM_DND5E.dropItems.chat.addedToContainerAnon", {
      qty, item: sourceItem.name, container: itemActor.name
    });
  postChat({
    speaker: fromActor ? ChatMessage.getSpeaker({ actor: fromActor }) : ChatMessage.getSpeaker(),
    content
  });
}

/* -------------------------------------------- */
/*  TAKE                                        */
/* -------------------------------------------- */

/**
 * Resolve the actor that will take an item for the current user.
 * Prefers the controlled non-item token, then the user's assigned character,
 * then any owned character.
 * @returns {Actor|null}
 */
export function resolveTakerActor() {
  const controlled = canvas.tokens?.controlled?.find(t => t.actor && t.actor.type !== ACTOR_TYPE);
  if ( controlled?.actor ) return controlled.actor;
  if ( game.user.character ) return game.user.character;
  const owned = game.actors?.find(a => a.type === "character" && a.isOwner);
  return owned ?? null;
}

/* -------------------------------------------- */

/**
 * Return the list of actors eligible to take the item token:
 * - For players, their owned characters within range on the active scene.
 * - For GMs, any non-item token within range on the active scene.
 * @param {Token|TokenDocument} itemToken
 * @returns {Actor[]}
 */
export function getEligibleTakers(itemToken) {
  const tokenObj = itemToken?.object ?? itemToken;
  const lootDoc = itemToken?.document ?? itemToken;
  const itemActorId = lootDoc?.actorId;
  const tokens = canvas.tokens?.placeables ?? [];
  const range = Number(getSetting(SETTING.RANGE.KEY)) || 0;

  const candidates = tokens.filter(t => {
    if ( !t.actor || t.actor.id === itemActorId ) return false;
    if ( t.actor.type === ACTOR_TYPE ) return false;
    if ( !game.user.isGM && !t.actor.testUserPermission(game.user, "OWNER") ) return false;
    return true;
  });

  // De-dupe by the token's actor uuid.
  const byActor = new Map();
  for ( const t of candidates ) {
    if ( range > 0 && tokenObj ) {
      const itemTokenCenter = getTokenSourceCenter(tokenObj);
      const takerActorCenter = getTokenSourceCenter(t);
      if ( !itemTokenCenter || !takerActorCenter ) continue;
      if ( measureDistance(itemTokenCenter, takerActorCenter) > range ) continue;
    }
    if ( !byActor.has(t.actor.uuid) ) byActor.set(t.actor.uuid, t.actor);
  }
  return Array.from(byActor.values());
}

/* -------------------------------------------- */

/**
 * Check whether an actor is within range to take the given item.
 * @param {Token} itemToken
 * @param {Actor} takerActor
 * @returns {boolean}
 */
export function isTakerActorInRange(itemToken, takerActor) {
  const range = Number(getSetting(SETTING.RANGE.KEY)) || 0;
  if ( range <= 0 ) return true;
  const takerTokens = takerActor?.getActiveTokens?.() ?? [];
  if ( !takerTokens.length ) return true; // No token placed: skip range check.
  const itemTokenCenter = getTokenSourceCenter(itemToken);
  if ( !itemTokenCenter ) return true;
  return takerTokens.some(token => {
    const takerActorCenter = getTokenSourceCenter(token);
    if ( !takerActorCenter ) return false;
    return measureDistance(takerActorCenter, itemTokenCenter) <= range;
  });
}

/* -------------------------------------------- */

/**
 * Take a dropped item.
 * Routes through the GM client when the user doesn't own the item actor.
 * @param {Token|TokenDocument} token
 * @param {object} [opts]
 * @param {Actor} [opts.takerActor]
 * @param {string[]} [opts.itemIds] Specific item ids; defaults to all
 * @param {boolean|string[]|object} [opts.currency] Currency to transfer:
 *   - `true` for every denomination
 *   - an array of denomination keys (e.g. `["gp"]`)
 *   - or an object of amounts keyed by denomination (e.g. `{gp: 5}`)
 * @param {boolean} [opts.skipOverrideConfirm] Caller has already confirmed
 *   the lock/affix override; skip the in-`takeItem` confirm dialog
 * @param {number} [opts.quantity] Partial-stack quantity for a single-item take
 * @returns {Promise<void>}
 */
export async function takeItem(token, { takerActor, itemIds, quantity, currency, skipOverrideConfirm } = {}) {
  const doc = token?.document ?? token;
  const itemActor = doc?.actor;
  if ( !itemActor || itemActor.type !== ACTOR_TYPE ) return;

  if ( !await confirmTakeOverrides(itemActor, { itemIds, currency, skipOverrideConfirm }) ) return;

  takerActor ??= resolveTakerActor();
  if ( !takerActor ) {
    Logger.info(game.i18n.localize("CUSTOM_DND5E.dropItems.error.noActor"), true, { prefix: false });
    return;
  }

  if ( !isTakerActorInRange(token.object ?? token, takerActor) ) {
    Logger.info(
      game.i18n.format("CUSTOM_DND5E.dropItems.error.outOfRange", { actor: takerActor.name }),
      true,
      { prefix: false }
    );
    return;
  }

  if ( !Array.isArray(itemIds) && !currency && !Number.isFinite(quantity) ) {
    const items = Array.from(itemActor.items);
    const root = items.length === 1 ? items[0] : null;
    if ( root && root.type !== "container" && (root.system?.quantity ?? 1) > 1 ) {
      const chosen = await promptQuantity(root, {
        title: game.i18n.format("CUSTOM_DND5E.dropItems.promptQuantity.takeTitle", { item: root.name }),
        prompt: game.i18n.format("CUSTOM_DND5E.dropItems.promptQuantity.take", { item: root.name })
      });
      if ( chosen === null ) return;
      quantity = chosen;
    }
  }

  const data = {
    itemActorUuid: itemActor.uuid,
    tokenUuid: doc.uuid,
    takerActorUuid: takerActor.uuid,
    itemIds: itemIds ?? null,
    currency: currency ?? null,
    quantity: Number.isFinite(quantity) ? quantity : null
  };
  const result = game.user.isGM
    ? await onTakeItemQuery(data, { user: game.user })
    : await queryGM("takeItem", data);

  if ( !result ) return;
  if ( result.error ) {
    ui.notifications.warn(game.i18n.localize(result.error));
    return;
  }
  postTakeChat(result);
}

/* -------------------------------------------- */

/**
 * Confirm any lock/affix overrides required to take from this item actor.
 * Non-GMs are blocked outright; GMs see a confirmation dialog.
 * - Locked blocks taking contents, not the container.
 * - Affixed blocks taking the container, not contents.
 * @param {Actor} itemActor
 * @param {object} opts
 * @param {string[]} [opts.itemIds]
 * @param {boolean} [opts.currency]
 * @param {boolean} [opts.skipOverrideConfirm]
 * @returns {Promise<boolean>} Whether the take should proceed
 */
async function confirmTakeOverrides(itemActor, { itemIds, currency, skipOverrideConfirm } = {}) {
  const takingContents = !!itemIds?.length || !!currency;
  const takingContainer = !Array.isArray(itemIds) && !currency;

  const overrideLock = itemActor.system?.locked && takingContents;
  if ( overrideLock ) {
    if ( !game.user.isGM ) {
      Logger.info(game.i18n.localize("CUSTOM_DND5E.dropItems.error.containerLocked"), true, { prefix: false });
      return false;
    }
    if ( !skipOverrideConfirm ) {
      const ok = await ItemDialog.confirm({
        title: game.i18n.localize("CUSTOM_DND5E.dropItems.confirmOverrideLock.title"),
        content: `<p>${game.i18n.localize("CUSTOM_DND5E.dropItems.confirmOverrideLock.content")}</p>`
      });
      if ( !ok ) return false;
    }
  }

  const overrideAffix = itemActor.system?.affixed && takingContainer;
  if ( overrideAffix ) {
    if ( !game.user.isGM ) {
      Logger.info(game.i18n.localize("CUSTOM_DND5E.dropItems.error.containerAffixed"), true, { prefix: false });
      return false;
    }
    const ok = await ItemDialog.confirm({
      title: game.i18n.localize("CUSTOM_DND5E.dropItems.confirmOverrideAffix.title"),
      content: `<p>${game.i18n.localize("CUSTOM_DND5E.dropItems.confirmOverrideAffix.content")}</p>`
    });
    if ( !ok ) return false;
  }

  return true;
}

/* -------------------------------------------- */
/*  QUERY HANDLERS                              */
/* -------------------------------------------- */

/**
 * Add items and currency on the taker and remove from the item actor.
 * Run on the GM's client.
 * @param {object} data
 * @param {object} context
 * @param {User} context.user
 * @returns {Promise<object>} What was taken, or error
 */
export async function onTakeItemQuery(data, { user }) {
  const { tokenUuid } = data;

  const ctx = await resolveTakeContext(data, user);
  if ( ctx.error ) return { error: ctx.error };
  const {
    itemActor, takerActor, itemsToTransfer, rootItem, available, partialQty, isPartial,
    containerRoot, currencyToTake
  } = ctx;

  if ( itemsToTransfer.length ) {
    const transferred = await transferItemsToTaker({
      takerActor, itemsToTransfer, rootItem, partialQty, locked: !!itemActor.system?.locked
    });
    if ( !transferred ) return { error: "CUSTOM_DND5E.dropItems.error.takeFailed" };
  }

  let currencyTransferred = false;
  if ( currencyToTake ) {
    currencyTransferred = await transferCurrencyToTaker({ takerActor, currency: currencyToTake });
    if ( !currencyTransferred ) return { error: "CUSTOM_DND5E.dropItems.error.takeFailed" };
  }

  if ( currencyTransferred ) await deductItemActorCurrency(containerRoot, currencyToTake);

  if ( itemsToTransfer.length ) {
    await consumeFromItemActor({
      itemActor, itemsToTransfer, rootItem, available, partialQty, isPartial, tokenUuid
    });
  }

  return {
    takerActorName: takerActor.name,
    lootName: itemActor.name,
    singletonName: itemsToTransfer.length === 1 ? itemsToTransfer[0].name : null,
    containerInTransfer: itemsToTransfer.some(i => i.type === "container"),
    itemCount: itemsToTransfer.length,
    takenQty: partialQty ?? itemsToTransfer.reduce((s, i) => s + (i.system?.quantity ?? 1), 0),
    takenCurrency: currencyTransferred ? formatCurrency(currencyToTake) : null
  };
}

/* -------------------------------------------- */

/**
 * Resolve what is being taken, checking the user owns the taker and the loot is not locked or affixed.
 * @param {object} data
 * @param {User} user
 * @returns {Promise<object>} Take context or error
 */
async function resolveTakeContext(data, user) {
  const { itemActorUuid, takerActorUuid, itemIds, currency, quantity } = data;
  const itemActor = await fromUuid(itemActorUuid);
  const takerActor = await fromUuid(takerActorUuid);
  if ( !itemActor || itemActor.type !== ACTOR_TYPE || !takerActor?.testUserPermission(user, "OWNER") ) {
    return { error: "CUSTOM_DND5E.dropItems.error.takeFailed" };
  }

  const takingContainer = !Array.isArray(itemIds) && !currency;

  if ( !user.isGM ) {
    if ( itemActor.system?.locked && !takingContainer ) {
      return { error: "CUSTOM_DND5E.dropItems.error.containerLocked" };
    }
    if ( itemActor.system?.affixed && takingContainer ) {
      return { error: "CUSTOM_DND5E.dropItems.error.containerAffixed" };
    }
  }

  const itemsToTransfer = Array.isArray(itemIds)
    ? itemActor.items.filter(i => itemIds.includes(i.id))
    : Array.from(itemActor.items);

  const containerRoot = Array.from(itemActor.items).find(i => !i.system?.container);
  const currencyToTake = currency && containerRoot?.type === "container"
    ? takeCurrency(containerRoot.system?.currency, currency)
    : null;

  if ( !itemsToTransfer.length && !currencyToTake ) return { error: "CUSTOM_DND5E.dropItems.form.empty" };

  const rootItem = itemsToTransfer.find(i => i.type !== "container") ?? itemsToTransfer[0] ?? null;
  const available = rootItem?.system?.quantity ?? 1;
  const partialQty = (itemsToTransfer.length === 1 && rootItem?.type !== "container"
    && Number.isFinite(quantity))
    ? clampQuantity(quantity, available)
    : null;
  const isPartial = partialQty !== null && partialQty < available;

  return {
    itemActor, takerActor, itemsToTransfer, rootItem, available, partialQty, isPartial,
    containerRoot, currencyToTake
  };
}

/* -------------------------------------------- */

/**
 * Create copies of the selected items on the taker actor.
 * @param {object} args
 * @param {Actor} args.takerActor
 * @param {Item[]} args.itemsToTransfer
 * @param {Item} args.rootItem
 * @param {number|null} args.partialQty
 * @param {boolean} [args.locked] Whether to lock the container
 * @returns {Promise<boolean>} Whether the create succeeded
 */
async function transferItemsToTaker({ takerActor, itemsToTransfer, rootItem, partialQty, locked = false }) {
  const transferIds = new Set(itemsToTransfer.map(i => i.id));
  const createData = itemsToTransfer.map(i => {
    const data = i.toObject();
    delete data.ownership;
    delete data.folder;
    delete data.sort;

    if ( locked && (i.type === "container") && !i.system?.container ) setContainerLockData(data, true);

    if ( data.system?.container && !transferIds.has(data.system.container) ) {
      data.system.container = null;
    }

    if ( partialQty !== null && i.id === rootItem.id ) {
      data.system ??= {};
      data.system.quantity = partialQty;
    }
    return data;
  });

  try {
    await createOrStackItems(takerActor, createData);
    return true;
  } catch ( err ) {
    Logger.error(err);
    return false;
  }
}

/* -------------------------------------------- */

/**
 * Remove the taken items from the source item actor, then clean up the
 * item actor and token if it has been emptied.
 * @param {object} args
 * @param {Actor} args.itemActor
 * @param {Item[]} args.itemsToTransfer
 * @param {Item} args.rootItem
 * @param {number} args.available
 * @param {number|null} args.partialQty
 * @param {boolean} args.isPartial
 * @param {string} args.tokenUuid
 * @returns {Promise<void>}
 */
async function consumeFromItemActor({
  itemActor, itemsToTransfer, rootItem, available, partialQty, isPartial, tokenUuid
}) {
  try {
    if ( isPartial ) {
      await rootItem.update({ "system.quantity": available - partialQty });
    } else {
      await itemActor.deleteEmbeddedDocuments("Item", itemsToTransfer.map(i => i.id));
    }
  } catch ( err ) {
    Logger.error(err);
  }

  if ( itemActor.items.size > 0 ) return;

  const tokenDoc = await fromUuid(tokenUuid);
  if ( tokenDoc ) await tokenDoc.delete();
  else await itemActor.delete();
}

/* -------------------------------------------- */
/*  CURRENCY                                    */
/* -------------------------------------------- */

/**
 * Reduce a currency object to its positive denominations.
 * @param {object|null|undefined} currency
 * @returns {object|null} Positive amounts keyed by denomination, or null if empty
 */
function sanitizeCurrency(currency) {
  if ( !currency ) return null;
  const result = {};
  for ( const key of Object.keys(CONFIG.DND5E.currencies) ) {
    const amount = Number(currency[key]) || 0;
    if ( amount > 0 ) result[key] = amount;
  }
  return Object.keys(result).length ? result : null;
}

/* -------------------------------------------- */

/**
 * Resolve the subset of a container's currency to transfer.
 * @param {object|null|undefined} currency Source currency amounts
 * @param {boolean|string[]|object} request Currency to take:
 *   - `true` for every denomination
 *   - an array of denomination keys (e.g. `["gp"]`)
 *   - or an object of amounts keyed by denomination (e.g. `{gp: 5}`)
 * @returns {object|null} Positive amounts keyed by denomination, or null
 */
function takeCurrency(currency, request) {
  const sanitized = sanitizeCurrency(currency);
  if ( !sanitized ) return null;
  if ( request === true ) return sanitized;

  const result = {};
  if ( Array.isArray(request) ) {
    for ( const key of request ) {
      if ( sanitized[key] ) result[key] = sanitized[key];
    }
  } else if ( request && typeof request === "object" ) {
    for ( const [key, amount] of Object.entries(request) ) {
      const available = sanitized[key] ?? 0;
      const take = Math.min(Math.max(0, Math.floor(Number(amount) || 0)), available);
      if ( take > 0 ) result[key] = take;
    }
  } else {
    return null;
  }
  return Object.keys(result).length ? result : null;
}

/* -------------------------------------------- */

/**
 * Format a currency object as a localised, comma-separated string.
 * @param {object|null} currency
 * @returns {string}
 */
function formatCurrency(currency) {
  if ( !currency ) return "";
  const parts = [];
  for ( const [key, config] of Object.entries(CONFIG.DND5E.currencies) ) {
    const amount = Number(currency[key]) || 0;
    if ( amount <= 0 ) continue;
    parts.push(`${amount} ${game.i18n.localize(config.abbreviation)}`);
  }
  return parts.join(", ");
}

/* -------------------------------------------- */

/**
 * Add the given currency to the taker actor.
 * @param {object} args
 * @param {Actor} args.takerActor
 * @param {object} args.currency Positive amounts keyed by denomination
 * @returns {Promise<boolean>} Whether the update succeeded
 */
async function transferCurrencyToTaker({ takerActor, currency }) {
  try {
    const updates = {};
    for ( const [key, amount] of Object.entries(currency) ) {
      const current = Number(takerActor.system?.currency?.[key]) || 0;
      updates[`system.currency.${key}`] = current + amount;
    }
    await takerActor.update(updates);
    return true;
  } catch ( err ) {
    Logger.error(err);
    return false;
  }
}

/* -------------------------------------------- */

/**
 * Deduct the taken amounts from the container item.
 * @param {Item|null} containerItem
 * @param {object|null} currencyTaken Positive amounts keyed by denomination
 * @returns {Promise<void>}
 */
async function deductItemActorCurrency(containerItem, currencyTaken) {
  if ( !containerItem || !currencyTaken ) return;
  try {
    const updates = {};
    for ( const [key, amount] of Object.entries(currencyTaken) ) {
      const current = Number(containerItem.system?.currency?.[key]) || 0;
      updates[`system.currency.${key}`] = Math.max(0, current - amount);
    }
    await containerItem.update(updates);
  } catch ( err ) {
    Logger.error(err);
  }
}

/* -------------------------------------------- */

/**
 * Post a chat message saying what the taker picked up, if chat notifications are enabled.
 * @param {object} result
 */
function postTakeChat(result) {
  const {
    takerActorName, lootName, singletonName, containerInTransfer, itemCount, takenQty, takenCurrency
  } = result;

  if ( !getSetting(SETTING.CHAT_NOTIFICATIONS.KEY) ) return;

  let qty = "";
  let item = null;
  let itemIsGeneric = false;
  if ( itemCount > 0 ) {
    if ( containerInTransfer ) {
      item = lootName;
    } else if ( itemCount === 1 && singletonName ) {
      qty = takenQty > 1 ? `${takenQty}× ` : "";
      item = singletonName;
    } else {
      item = game.i18n.format("CUSTOM_DND5E.dropItems.chat.containerContents", { container: lootName });
      itemIsGeneric = true;
    }
  }

  let content;
  if ( item && takenCurrency && !itemIsGeneric ) {
    content = game.i18n.format("CUSTOM_DND5E.dropItems.chat.pickedUpWithCurrency", {
      actor: takerActorName, qty, item, currency: takenCurrency
    });
  } else if ( item ) {
    content = game.i18n.format("CUSTOM_DND5E.dropItems.chat.pickedUp", {
      actor: takerActorName, qty, item
    });
  } else if ( takenCurrency ) {
    content = game.i18n.format("CUSTOM_DND5E.dropItems.chat.pickedUp", {
      actor: takerActorName, qty: "", item: takenCurrency
    });
  } else {
    return;
  }

  postChat({ content });
}

/* -------------------------------------------- */

/**
 * Create the item actor and place its token in the scene.
 * Run on the GM's client.
 * @param {object} data
 * @returns {Promise<boolean>} Whether the item was placed
 */
export async function onDropItemQuery(data) {
  const { itemDataList, name, img, sceneId, x, y, isContainer, locked, droppedBy, itemUuid, folderId } = data;
  const scene = game.scenes.get(sceneId);
  if ( !scene ) return false;
  const folder = folderId ? game.folders.get(folderId) : await getOrCreateDropItemsFolder();
  await createItemActor({
    name, img, itemDataList, x, y, folder, droppedBy, isContainer, locked, itemUuid, scene
  });
  return true;
}

/* -------------------------------------------- */
/*  CLEANUP                                     */
/* -------------------------------------------- */

/**
 * Delete the item actor when its token is removed from a scene.
 * When the removal is an undo of the original drop, the contents are first returned to
 * the actor the item was dropped from.
 * Only runs on the GM client to avoid duplicate deletes.
 * @param {TokenDocument} tokenDoc
 * @param {object} options
 * @param {string} userId
 */
async function onDeleteToken(tokenDoc, options, userId) {
  if ( !game.user.isGM ) return;
  if ( !isItemToken(tokenDoc) ) return;
  const actorId = tokenDoc.actorId;
  if ( !actorId ) return;
  const worldActor = game.actors?.get(actorId);
  if ( !worldActor ) return;
  if ( options?.isUndo && game.user.id === userId ) {
    await returnDroppedItemsToSource(worldActor);
  }
  await worldActor.delete().catch(err => Logger.error(err));
}

/* -------------------------------------------- */

/**
 * Return a dropped item actor's contents to the actor it was dropped from.
 * @param {Actor} itemActor
 * @returns {Promise<void>}
 */
async function returnDroppedItemsToSource(itemActor) {
  const sourceUuid = itemActor.system?.droppedBy;
  if ( !sourceUuid ) return;
  const sourceActor = await fromUuid(sourceUuid);
  if ( !sourceActor ) return;

  const itemsToTransfer = Array.from(itemActor.items);
  if ( !itemsToTransfer.length ) return;

  const rootItem = itemsToTransfer.find(i => i.type !== "container") ?? itemsToTransfer[0];
  const transferred = await transferItemsToTaker({
    takerActor: sourceActor,
    itemsToTransfer,
    rootItem,
    partialQty: null,
    locked: !!itemActor.system?.locked
  });
  if ( !transferred ) return;

  if ( getSetting(SETTING.CHAT_NOTIFICATIONS.KEY) ) {
    postReturnChat({ itemActor, sourceActor, quantity: rootItem?.system?.quantity ?? 1 });
  }
}

/* -------------------------------------------- */

/**
 * Post a chat message announcing that a dropped item was returned to its
 * source actor after an undo.
 * @param {object} args
 * @param {Actor} args.itemActor
 * @param {Actor} args.sourceActor
 * @param {number} args.quantity
 */
function postReturnChat({ itemActor, sourceActor, quantity }) {
  const qty = quantity > 1 ? `${quantity}× ` : "";
  const content = game.i18n.format("CUSTOM_DND5E.dropItems.chat.returned", {
    actor: sourceActor.name, qty, item: itemActor.name
  });
  postChat({ speaker: ChatMessage.getSpeaker({ actor: sourceActor }), content });
}

/* -------------------------------------------- */
/*  TOKEN APPEARANCE                            */
/* -------------------------------------------- */

/**
 * Force full grid hit testing for item tokens. When the item icon smaller
 * than its grid square, hit-testing can fall back to the smaller bounds,
 * so clicks near the edges miss.
 * @param {Token} token
 */
function onRefreshToken(token) {
  if ( !isItemToken(token) ) return;
  if ( token.shape ) token.hitArea = token.shape;
  if ( token.mesh ) {
    token.mesh.eventMode = "none";
    token.mesh.interactive = false;
  }
  applyItemTokenAppearance(token);
}

/* -------------------------------------------- */

/**
 * Apply mask/border to an item token.
 * @param {Token} token
 */
function applyItemTokenAppearance(token) {
  clearItemTokenAppearance(token);

  const shape = getSetting(SETTING.IMAGE_SHAPE.KEY) || "none";
  const borderThickness = Math.max(0, Number(getSetting(SETTING.IMAGE_BORDER_THICKNESS.KEY)) || 0);
  if ( shape === "none" && borderThickness <= 0 ) return;

  const mesh = token.mesh;
  if ( !mesh ) return;

  const center = token.center;
  const w = token.w;
  const h = token.h;
  const tokenScale = Number(getSetting(SETTING.TOKEN_SCALE.KEY)) || 1;
  const halfW = (w / 2) * tokenScale;
  const halfH = (h / 2) * tokenScale;
  const radius = Math.min(halfW, halfH);

  if ( shape !== "none" ) {
    const mask = new PIXI.Graphics();
    mask.beginFill(0xFFFFFF);
    if ( shape === "circle" ) mask.drawCircle(center.x, center.y, radius);
    else mask.drawRect(center.x - halfW, center.y - halfH, halfW * 2, halfH * 2);
    mask.endFill();
    mask.renderable = false;
    canvas.primary.addChild(mask);
    mesh.mask = mask;
    token._customDnd5eMask = mask;
  }

  if ( borderThickness > 0 && shape !== "none" ) {
    const border = new PIXI.Graphics();
    const colorHex = Color.from(getSetting(SETTING.IMAGE_BORDER_COLOR.KEY) || "#9f9275").valueOf();
    border.lineStyle({ width: borderThickness, color: colorHex, alignment: 0.5, join: PIXI.LINE_JOIN.ROUND });
    if ( shape === "circle" ) border.drawCircle(center.x, center.y, radius);
    else border.drawRect(center.x - halfW, center.y - halfH, halfW * 2, halfH * 2);
    border.elevation = mesh.elevation;
    border.sortLayer = mesh.sortLayer ?? 700;
    border.sort = (mesh.sort || 0) + 1;
    border.zIndex = mesh.zIndex || 0;
    border.visible = mesh.visible;
    canvas.primary.addChild(border);
    canvas.primary.sortDirty = true;
    token._customDnd5eImageBorder = border;
  }
}

/* -------------------------------------------- */

/**
 * Clear mask/border applied to an item token.
 * @param {Token} token
 */
function clearItemTokenAppearance(token) {
  const prevMask = token._customDnd5eMask;
  if ( prevMask ) {
    if ( token.mesh && token.mesh.mask === prevMask ) token.mesh.mask = null;
    if ( !prevMask.destroyed ) prevMask.destroy();
    token._customDnd5eMask = null;
  }
  const prevBorder = token._customDnd5eImageBorder;
  if ( prevBorder ) {
    if ( !prevBorder.destroyed ) prevBorder.destroy();
    token._customDnd5eImageBorder = null;
  }
}

/* -------------------------------------------- */

/**
 * Clean up the mask/border when the token is destroyed.
 * @param {Token} token
 */
function onDestroyTokenAppearance(token) {
  if ( !isItemToken(token) ) return;
  clearItemTokenAppearance(token);
}

/* -------------------------------------------- */
/*  SHEET SYNC                                  */
/* -------------------------------------------- */

let pendingRefresh = false;

/**
 * Re-render every open item actor sheet so the 'Take With' list reflects
 * current token positions. Multiple per-event triggers in the same frame
 * coalesce via {@link pendingRefresh} into a single render.
 */
function refreshOpenSheets() {
  if ( pendingRefresh ) return;
  pendingRefresh = true;
  requestAnimationFrame(() => {
    pendingRefresh = false;
    for ( const app of foundry.applications.instances.values() ) {
      if ( app?.document?.type === ACTOR_TYPE && app.rendered ) app.render({ force: true });
    }
  });
}

/* -------------------------------------------- */

/**
 * Refrehsh every open item actor sheet when a token's position changes.
 * @param {TokenDocument} _doc
 * @param {object} change
 */
function onTokenPositionChange(_doc, change) {
  if ( !("x" in change) && !("y" in change) ) return;
  refreshOpenSheets();
}

/* -------------------------------------------- */

/**
 * Open the loot actor's sheet, used by HUD "View"/"Open" buttons.
 * @param {Token|TokenDocument} token
 */
export function openSheet(token) {
  const doc = token?.document ?? token;
  const actor = doc?.actor;
  if ( !actor ) return;
  actor.sheet?.render(true);
}

