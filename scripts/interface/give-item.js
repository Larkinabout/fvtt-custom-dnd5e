import { MODULE, CONSTANTS } from "../constants.js";
import { c5eLoadTemplates, getSetting, hideApplications, Logger, registerSetting } from "../utils.js";
import { addCursorLabelIcon, setCursorLabelIcon, setCursorLabelPosition } from "./cursor-label.js";
import { GiveItemForm } from "../forms/give-item-form.js";

const SETTING = CONSTANTS.GIVE_ITEM.SETTING;
const GIVE_ICON_ID = "custom-dnd5e-cursor-label-give-item";

/**
 * State for an in-progress drag.
 * @type {{itemUuid: string, item: Item, actorUuid: string, eligibleTokenIds: Set<string>}|null}
 */
let activeDrag = null;

/**
 * IDs of hooks registered for the duration of a drag.
 * @type {Record<string, number>}
 */
const dragSceneHookIds = {};

/**
 * Promise resolving to the function that restores hidden applications.
 * @type {Promise<Function>|null}
 */
let hiddenAppsPromise = null;

/**
 * Track pending gives keyed by request id.
 * @type {Map<string, {itemUuid: string, quantity: number, recipientActorUuid: string}>}
 */
const pendingGives = new Map();

const GIVEABLE_TYPES = new Set(["weapon", "equipment", "consumable", "tool", "loot"]);

/**
 * Register settings, hooks, and templates.
 */
export function register() {
  registerSettings();
  c5eLoadTemplates([CONSTANTS.GIVE_ITEM.TEMPLATE.FORM]);
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

  registerSetting(SETTING.REQUIRE_ACCEPTANCE.KEY, {
    name: game.i18n.localize(SETTING.REQUIRE_ACCEPTANCE.NAME),
    hint: game.i18n.localize(SETTING.REQUIRE_ACCEPTANCE.HINT),
    scope: "world",
    config: false,
    type: Array,
    default: [CONST.TOKEN_DISPOSITIONS.NEUTRAL, CONST.TOKEN_DISPOSITIONS.HOSTILE]
  });
}

/* -------------------------------------------- */

/**
 * Register hooks.
 */
function registerHooks() {
  Hooks.on("dropCanvasData", onDropCanvasData);
  Hooks.on("dnd5e.getItemContextOptions", onGetItemContextOptions);
  Hooks.once("ready", () => {
    addCursorLabelIcon(GIVE_ICON_ID, '<i class="fa-solid fa-hand-holding"></i>');
    document.addEventListener("dragstart", onDragStart, true);
    document.addEventListener("dragover", onDragOver, true);
    document.addEventListener("dragend", onDragEnd, true);
    document.addEventListener("drop", onDragEnd, true);
  });
}

/* -------------------------------------------- */

/**
 * On drag start.
 * @param {DragEvent} event
 */
function onDragStart(event) {
  if ( !getSetting(SETTING.ENABLE.KEY) ) return;
  clearActiveDrag();
  const el = event.target;
  if ( !(el instanceof HTMLElement) ) return;
  const itemEl = el.closest("[data-item-id]");
  if ( !itemEl ) return;
  if ( itemEl.dataset.activityId || itemEl.dataset.effectId ) return;
  const itemId = itemEl.dataset.itemId;
  if ( !itemId ) return;
  const actor = findContainingActor(itemEl);
  if ( !actor?.isOwner ) return;
  const item = actor.items?.get(itemId);
  if ( !item || !isGiveable(item) ) return;
  activeDrag = {
    itemUuid: item.uuid,
    item,
    actorUuid: actor.uuid,
    eligibleTokenIds: computeEligibleTokenIds(actor)
  };
  const invalidate = () => {
    if ( activeDrag ) activeDrag.eligibleTokenIds = computeEligibleTokenIds(actor);
  };
  dragSceneHookIds.refreshToken = Hooks.on("refreshToken", invalidate);
  dragSceneHookIds.sightRefresh = Hooks.on("sightRefresh", invalidate);
  dragSceneHookIds.createToken = Hooks.on("createToken", invalidate);
  dragSceneHookIds.deleteToken = Hooks.on("deleteToken", invalidate);
}

/* -------------------------------------------- */

/**
 * Compute the set of token ids of eligible recipients.
 * @param {Actor} giverActor
 * @returns {Set<string>}
 */
function computeEligibleTokenIds(giverActor) {
  return new Set(getEligibleRecipients(giverActor).map(t => t.id));
}

/* -------------------------------------------- */

/**
 * Clear active-drag state and its scene hooks.
 */
function clearActiveDrag() {
  activeDrag = null;
  for ( const [name, id] of Object.entries(dragSceneHookIds) ) Hooks.off(name, id);
  for ( const k of Object.keys(dragSceneHookIds) ) delete dragSceneHookIds[k];
}

/* -------------------------------------------- */

/**
 * Find containing actor.
 * @param {HTMLElement} el
 * @returns {Actor|null} Containing actor
 */
function findContainingActor(el) {
  const v2 = foundry.applications?.instances;
  if ( v2 ) {
    for ( const app of v2.values() ) {
      const root = app.element;
      if ( root?.contains?.(el) ) {
        const doc = app.document ?? app.actor ?? null;
        if ( doc?.documentName === "Actor" ) return doc;
        if ( doc?.actor ) return doc.actor;
        return null;
      }
    }
  }

  for ( const app of Object.values(ui.windows ?? {}) ) {
    const root = app.element?.[0] ?? app.element;
    if ( root?.contains?.(el) ) {
      const doc = app.document ?? app.actor ?? null;
      if ( doc?.documentName === "Actor" ) return doc;
      if ( doc?.actor ) return doc.actor;
      return null;
    }
  }
  return null;
}

/* -------------------------------------------- */

/**
 * On drag over, set visibility of applications and cursor label.
 * @param {DragEvent} event
 */
function onDragOver(event) {
  if ( !activeDrag ) return;
  const view = canvas?.app?.view;
  if ( !view ) return;
  const overCanvas = event.target === view;
  if ( overCanvas ) hideAppsForGive();
  else restoreAppsForGive();
  if ( !overCanvas ) {
    setCursorLabelIcon(GIVE_ICON_ID, false);
    return;
  }

  const world = canvas.stage.worldTransform.applyInverse({ x: event.clientX, y: event.clientY });
  const target = findTargetTokenAt(world.x, world.y);
  const eligible = !!target && activeDrag.eligibleTokenIds.has(target.id);

  setCursorLabelPosition(event.clientX, event.clientY);
  setCursorLabelIcon(GIVE_ICON_ID, eligible);
}

/* -------------------------------------------- */

/**
 * Hide applications while dragging an item.
 */
function hideAppsForGive() {
  if ( hiddenAppsPromise ) return;
  hiddenAppsPromise = hideApplications();
}

/* -------------------------------------------- */

/**
 * Restore hidden applications.
 * @returns {Promise<void>}
 */
async function restoreAppsForGive() {
  if ( !hiddenAppsPromise ) return;
  const pending = hiddenAppsPromise;
  hiddenAppsPromise = null;
  const restore = await pending;
  await restore();
}

/* -------------------------------------------- */

/**
 * On drag end, clear active drag, remove cursor label and restore hidden applications.
 */
async function onDragEnd() {
  clearActiveDrag();
  setCursorLabelIcon(GIVE_ICON_ID, false);
  await restoreAppsForGive();
}

/* -------------------------------------------- */

/**
 * Whether a token is a valid target for the given item.
 * @param {Token|null} target
 * @param {Item} item
 * @returns {boolean}
 */
function isEligibleDropTarget(target, item) {
  if ( !target?.actor || !item?.actor ) return false;
  return getEligibleRecipients(item.actor).includes(target);
}

/* -------------------------------------------- */

/**
 * Whether an item is giveable based on type and quantity.
 * @param {Item} item
 * @returns {boolean}
 */
export function isGiveable(item) {
  if ( !item || !GIVEABLE_TYPES.has(item.type) ) return false;
  return (item.system?.quantity ?? 0) >= 1;
}

/* -------------------------------------------- */

/**
 * Get eligible recipients.
 * @param {Actor} giverActor
 * @returns {Token[]} Eligible recipients
 */
export function getEligibleRecipients(giverActor) {
  const tokens = canvas.tokens?.placeables ?? [];
  const giverToken = giverActor?.getActiveTokens()?.[0] ?? null;
  const isGM = game.user.isGM;

  const SECRET = CONST.TOKEN_DISPOSITIONS.SECRET;
  const base = tokens.filter(t => {
    if ( !t.actor || t.actor.id === giverActor?.id ) return false;
    if ( t.actor.type !== "character" && t.actor.type !== "npc" ) return false;
    if ( t.document.disposition === SECRET ) return false;
    if ( !isGM && t.actor.testUserPermission(game.user, "OWNER") ) return false;
    return true;
  });

  let filtered = base.filter(t =>
    canvas.visibility?.testVisibility?.(t.center, { object: t, tolerance: 2 }) ?? true
  );

  const range = Number(getSetting(SETTING.RANGE.KEY)) || 0;
  if ( range > 0 && giverToken ) {
    filtered = filtered.filter(t => {
      const path = canvas.grid.measurePath([
        { x: giverToken.center.x, y: giverToken.center.y },
        { x: t.center.x, y: t.center.y }
      ]);
      return (path?.distance ?? Infinity) <= range;
    });
  }

  return filtered;
}

/* -------------------------------------------- */

/**
 * Whether acceptance is required from the recipient.
 * @param {Token|TokenDocument} recipientToken
 * @param {Actor} [giverActor]
 * @returns {boolean}
 */
export function requiresAcceptance(recipientToken, giverActor) {
  const doc = recipientToken?.document ?? recipientToken;
  const recipientActor = doc?.actor ?? recipientToken?.actor ?? recipientToken;
  if ( !recipientActor ) return false;
  const list = getSetting(SETTING.REQUIRE_ACCEPTANCE.KEY) ?? [];
  const giverType = giverActor?.type;
  const recipientType = recipientActor.type;

  if ( giverType === "character" && recipientType === "character" && list.includes("pcToPc") ) return true;
  if ( giverType === "character" && recipientType === "npc" && list.includes("pcToNpc") ) return true;
  if ( giverType === "npc" && recipientType === "character" && list.includes("npcToPc") ) return true;

  if ( recipientType !== "npc" ) return false;
  const dispositions = list.filter(v => typeof v === "number" || /^-?\d+$/.test(v)).map(Number);
  return dispositions.includes(Number(doc.disposition));
}

/* -------------------------------------------- */

/**
 * On drop canvas data.
 * @param {Canvas} canvas
 * @param {object} data
 * @param {DragEvent} event
 * @returns {boolean|undefined}
 */
async function onDropCanvasData(canvas, data, event) {
  if ( !getSetting(SETTING.ENABLE.KEY) ) return;
  if ( data?.type !== "Item" ) return;

  const item = await Item.implementation.fromDropData(data);
  if ( !item || !item.actor || !item.actor.isOwner ) return;
  if ( !isGiveable(item) ) return;

  const target = findTargetTokenAt(data.x, data.y);
  if ( !isEligibleDropTarget(target, item) ) return;

  GiveItemForm.open({ item, recipient: target });
  return false;
}

/* -------------------------------------------- */

/**
 * Find the topmost token at the given canvas coordinates.
 * @param {number} x
 * @param {number} y
 * @returns {Token|null}
 */
function findTargetTokenAt(x, y) {
  if ( !canvas?.tokens?.quadtree ) return null;
  const rect = new PIXI.Rectangle(x, y, 0, 0);
  const collisionTest = ({ t }) => t.visible && t.renderable && t.interactive
    && t.hitArea?.contains(x - t.x, y - t.y);
  const matches = [...canvas.tokens.quadtree.getObjects(rect, { collisionTest })]
    .sort((a, b) => a._lastSortedIndex - b._lastSortedIndex);
  return matches.at(0) ?? null;
}

/* -------------------------------------------- */

/**
 * Add 'Give...' option to context menu.
 * @param {Item} item
 * @param {object[]} menuItems
 */
function onGetItemContextOptions(item, menuItems) {
  menuItems.push({
    name: "CUSTOM_DND5E.giveItem.context.give",
    icon: '<i class="fas fa-hand-holding" style="position: relative; top: -3px;"></i>',
    condition: () => isGiveable(item) && !!item.actor?.isOwner,
    callback: () => GiveItemForm.open({ item })
  });
}

/* -------------------------------------------- */

/**
 * Execute the give.
 * Routes the payload to the recipient's owning user if active, else to an active GM.
 * @param {Item} item
 * @param {Token|Actor} recipient The recipient Token (preferred) or Actor.
 * @param {number} quantity
 * @returns {Promise<void>}
 */
export async function executeGive(item, recipient, quantity) {
  if ( !item?.actor || !recipient ) return;
  const recipientActor = recipient.actor ?? recipient;
  if ( !recipientActor ) return;
  const giverActor = item.actor;
  const available = item.system?.quantity ?? 1;
  const qty = Math.max(1, Math.min(Number(quantity) || 1, available));

  const ownerUser = game.users.find(u =>
    u.active && !u.isGM && recipientActor.testUserPermission(u, "OWNER")
  );
  const targetUser = ownerUser ?? game.users.activeGM;
  if ( !targetUser ) {
    Logger.error(
      game.i18n.format("CUSTOM_DND5E.giveItem.error.noActiveOwner", { name: recipientActor.name }),
      true
    );
    return;
  }

  const requestId = foundry.utils.randomID(16);
  pendingGives.set(requestId, {
    itemUuid: item.uuid,
    quantity: qty,
    recipientActorUuid: recipientActor.uuid
  });
  // Delete request after a minute to avoid keep stale/orphaned requests.
  setTimeout(() => pendingGives.delete(requestId), 60_000);

  const payload = {
    giverActorUuid: giverActor.uuid,
    giverUserId: game.user.id,
    recipientActorUuid: recipientActor.uuid,
    itemUuid: item.uuid,
    itemData: item.toObject(),
    quantity: qty,
    requiresAcceptance: requiresAcceptance(recipient, giverActor),
    requestId
  };

  const message = { action: "giveItem", target: targetUser.id, payload };
  if ( targetUser.id === game.user.id ) {
    await handleGiveItem(message);
  } else {
    game.socket.emit(`module.${MODULE.ID}`, message);
  }
}

/* -------------------------------------------- */
/*  Socket handlers                             */
/* -------------------------------------------- */

/**
 * Find an existing item on the recipient that should stack with the incoming item.
 * @param {Actor} actor
 * @param {object} itemData
 * @returns {Item|null} Stackable item
 */
function findStackableItem(actor, itemData) {
  const name = itemData.name;
  const type = itemData.type;
  const sourceId = itemData._stats?.compendiumSource ?? null;
  return actor.items.find(existing => {
    if ( existing.type !== type ) return false;
    if ( existing.name !== name ) return false;
    const existingSource = existing._stats?.compendiumSource ?? null;
    if ( sourceId && existingSource && sourceId !== existingSource ) return false;
    return existing.system?.quantity !== undefined;
  }) ?? null;
}

/* -------------------------------------------- */

/**
 * Handle the recipient side of the transfer.
 * @param {object} data
 */
export async function handleGiveItem(data) {
  if ( data.target !== game.user.id ) return;

  const {
    recipientActorUuid, itemData, quantity, giverUserId, requiresAcceptance: needsAccept, giverActorUuid
  } = data.payload;

  const recipient = await fromUuid(recipientActorUuid);
  if ( !recipient || (!recipient.testUserPermission(game.user, "OWNER") && !game.user.isGM) ) return;

  if ( needsAccept ) {
    const giver = await fromUuid(giverActorUuid);
    const accepted = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("CUSTOM_DND5E.giveItem.accept.title") },
      content: `<p>${game.i18n.format("CUSTOM_DND5E.giveItem.accept.content", {
        giver: giver?.name ?? game.i18n.localize("CUSTOM_DND5E.unknown"),
        qty: quantity > 1 ? `${quantity}× ` : "",
        item: itemData.name,
        recipient: recipient.name
      })}</p>`,
      modal: true,
      yes: { label: game.i18n.localize("CUSTOM_DND5E.accept") },
      no: { label: game.i18n.localize("CUSTOM_DND5E.reject") }
    });
    if ( !accepted ) {
      const rejectMessage = {
        action: "giveItemRejected",
        target: giverUserId,
        payload: data.payload
      };
      if ( giverUserId === game.user.id ) await handleGiveItemRejected(rejectMessage);
      else game.socket.emit(`module.${MODULE.ID}`, rejectMessage);
      return;
    }
  }

  try {
    const create = foundry.utils.deepClone(itemData);
    foundry.utils.setProperty(create, "system.quantity", quantity);

    const existing = findStackableItem(recipient, create);

    delete create._id;
    const compendiumSource = create._stats?.compendiumSource;
    delete create._stats;
    if ( compendiumSource ) create._stats = { compendiumSource };
    delete create.ownership;
    delete create.folder;
    delete create.sort;

    if ( existing ) {
      const newQty = (existing.system?.quantity ?? 0) + quantity;
      await existing.update({ "system.quantity": newQty });
    } else {
      await recipient.createEmbeddedDocuments("Item", [create]);
    }
  } catch ( err ) {
    Logger.error(err);
    ui.notifications.error(game.i18n.format("CUSTOM_DND5E.giveItem.error.createFailed", {
      item: itemData.name,
      recipient: recipient.name
    }));

    const rejectMessage = { action: "giveItemRejected", target: giverUserId, payload: data.payload };
    if ( giverUserId === game.user.id ) await handleGiveItemRejected(rejectMessage);
    else game.socket.emit(`module.${MODULE.ID}`, rejectMessage);
    return;
  }

  const sourceMessage = { action: "giveItemSource", target: giverUserId, payload: data.payload };
  if ( giverUserId === game.user.id ) {
    await handleGiveItemSource(sourceMessage);
  } else {
    game.socket.emit(`module.${MODULE.ID}`, sourceMessage);
  }
}

/* -------------------------------------------- */

/**
 * Notify the giver that the item was rejected.
 * @param {object} data
 */
export async function handleGiveItemRejected(data) {
  if ( data.target !== game.user.id ) return;
  const { itemData, recipientActorUuid, requestId } = data.payload;
  if ( requestId ) pendingGives.delete(requestId);
  const recipient = await fromUuid(recipientActorUuid);
  ui.notifications.warn(game.i18n.format("CUSTOM_DND5E.giveItem.rejected", {
    recipient: recipient?.name ?? game.i18n.localize("CUSTOM_DND5E.unknown"),
    item: itemData.name
  }));
}

/* -------------------------------------------- */

/**
 * Handle the giver side of the transfer.
 * @param {object} data
 */
export async function handleGiveItemSource(data) {
  if ( data.target !== game.user.id ) return;
  const { itemUuid, quantity, recipientActorUuid, requestId } = data.payload;

  const pending = requestId ? pendingGives.get(requestId) : null;
  if ( !pending
    || pending.itemUuid !== itemUuid
    || pending.quantity !== quantity
    || pending.recipientActorUuid !== recipientActorUuid ) return;
  pendingGives.delete(requestId);

  const item = await fromUuid(itemUuid);
  if ( !item?.actor?.isOwner ) return;

  try {
    const current = item.system?.quantity ?? 1;
    if ( current - quantity <= 0 ) await item.delete();
    else await item.update({ "system.quantity": current - quantity });
  } catch ( err ) {
    Logger.error(err);
    ui.notifications.error(game.i18n.format("CUSTOM_DND5E.giveItem.error.sourceFailed", {
      item: item.name
    }));
    return;
  }

  const recipient = await fromUuid(recipientActorUuid);
  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: item.actor }),
    whisper: ChatMessage.getWhisperRecipients("GM"),
    content: `<p>${game.i18n.format("CUSTOM_DND5E.giveItem.chat", {
      giver: item.actor.name,
      qty: quantity > 1 ? `${quantity}× ` : "",
      item: item.name,
      recipient: recipient?.name ?? game.i18n.localize("CUSTOM_DND5E.unknown")
    })}</p>`,
    flags: { "custom-dnd5e": { source: "give-item" } }
  });
}
