import { CONSTANTS } from "../constants.js";
import {
  c5eLoadTemplates,
  findStackableItem,
  findTargetTokenAt,
  getSetting,
  getTokenSourceCenter,
  Logger,
  measureDistance,
  queryUser,
  registerSetting
} from "../utils.js";
import { addCursorLabelIcon, setCursorLabelIcon, setCursorLabelPosition } from "../interface/cursor-label.js";
import { registerInventoryDragHandler } from "./inventory-drag.js";
import { GiveItemForm } from "../forms/item-interactions/give-item-form.js";

const SETTING = CONSTANTS.GIVE_ITEMS.SETTING;
const GIVE_ICON_ID = "custom-dnd5e-cursor-label-give-item";

const GIVEABLE_TYPES = new Set(["weapon", "equipment", "consumable", "tool", "loot", "container"]);

/* -------------------------------------------- */
/*  REGISTRATION                                */
/* -------------------------------------------- */

/**
 * Register settings, hooks, and templates.
 */
export function register() {
  registerSettings();
  c5eLoadTemplates([CONSTANTS.GIVE_ITEMS.TEMPLATE.FORM]);
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
    addCursorLabelIcon(GIVE_ICON_ID, '<i class="fa-solid fa-hand-holding-hand"></i>');
  });
  registerInventoryDragHandler({
    matches: ({ item }) => getSetting(SETTING.ENABLE.KEY) && isGiveable(item),
    onStart: ({ actor }) => {
      const state = { eligibleTokenIds: computeEligibleTokenIds(actor), hookIds: {} };
      const invalidate = () => { state.eligibleTokenIds = computeEligibleTokenIds(actor); };
      state.hookIds.refreshToken = Hooks.on("refreshToken", invalidate);
      state.hookIds.sightRefresh = Hooks.on("sightRefresh", invalidate);
      state.hookIds.createToken = Hooks.on("createToken", invalidate);
      state.hookIds.deleteToken = Hooks.on("deleteToken", invalidate);
      return state;
    },
    onOver: (event, { state, overCanvas }) => {
      if ( !overCanvas ) {
        setCursorLabelIcon(GIVE_ICON_ID, false);
        return;
      }
      const world = canvas.stage.worldTransform.applyInverse({ x: event.clientX, y: event.clientY });
      const target = findTargetTokenAt(world.x, world.y);
      setCursorLabelPosition(event.clientX, event.clientY);
      setCursorLabelIcon(GIVE_ICON_ID, !!target && state.eligibleTokenIds.has(target.id));
    },
    onEnd: ({ state }) => {
      for ( const [name, id] of Object.entries(state.hookIds) ) Hooks.off(name, id);
      setCursorLabelIcon(GIVE_ICON_ID, false);
    }
  });
}

/* -------------------------------------------- */
/*  ELIGIBILITY                                 */
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
 * Whether an item is giveable based on its type and quantity.
 * @param {Item} item
 * @returns {boolean}
 */
export function isGiveable(item) {
  if ( !item || !GIVEABLE_TYPES.has(item.type) ) return false;
  if ( item.type === "container" ) return true;
  return (item.system?.quantity ?? 0) >= 1;
}

/* -------------------------------------------- */

/**
 * Tokens eligible to receive an item from the giver, based on
 * range, visibility, disposition and type.
 * @param {Actor} giverActor
 * @returns {Token[]}
 */
export function getEligibleRecipients(giverActor) {
  const tokens = canvas.tokens?.placeables ?? [];
  const giverToken = giverActor?.getActiveTokens()?.[0] ?? null;

  const SECRET = CONST.TOKEN_DISPOSITIONS.SECRET;
  const base = tokens.filter(t => {
    if ( !t.actor || t.actor.id === giverActor?.id ) return false;
    if ( t.actor.type !== "character" && t.actor.type !== "npc" ) return false;
    if ( t.document.disposition === SECRET ) return false;
    return true;
  });

  let filtered = base.filter(t =>
    canvas.visibility?.testVisibility?.(t.center, { object: t, tolerance: 2 }) ?? true
  );

  const range = Number(getSetting(SETTING.RANGE.KEY)) || 0;
  if ( range > 0 && giverToken ) {
    const giverCenter = getTokenSourceCenter(giverToken);
    if ( giverCenter ) {
      filtered = filtered.filter(t => {
        const targetCenter = getTokenSourceCenter(t);
        if ( !targetCenter ) return false;
        return measureDistance(giverCenter, targetCenter) <= range;
      });
    }
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
/*  DROP HANDLERS                               */
/* -------------------------------------------- */

/**
 * Open the give form when a giveable item is dropped on an
 * eligible recipient token.
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
 * Add 'Give' option to context menu.
 * @param {Item} item
 * @param {object[]} menuItems
 */
function onGetItemContextOptions(item, menuItems) {
  menuItems.push({
    name: "CUSTOM_DND5E.giveItems.context.give",
    icon: '<i class="fas fa-hand-holding-hand"></i>',
    condition: () => isGiveable(item) && !!item.actor?.isOwner,
    callback: () => GiveItemForm.open({ item })
  });
}

/* -------------------------------------------- */
/*  EXECUTE GIVE                                */
/* -------------------------------------------- */

/**
 * Request for the recipient actor's owner, or an active GM if no owner is connected, to take an item.
 * If they accept, the item is removed from the giving actor and the transer is posted to chat.
 * @param {Item} item
 * @param {Token|Actor} recipient Token (preferred) or Actor
 * @param {number} quantity
 * @returns {Promise<void>}
 */
export async function executeGive(item, recipient, quantity) {
  if ( !item?.actor || !recipient ) return;
  const recipientActor = recipient.actor ?? recipient;
  if ( !recipientActor ) return;
  const giverActor = item.actor;
  const isContainer = item.type === "container";
  const available = item.system?.quantity ?? 1;
  const qty = isContainer ? available : Math.max(1, Math.min(Number(quantity) || 1, available));

  const ownerUser = game.users.find(u =>
    u.active && !u.isGM && recipientActor.testUserPermission(u, "OWNER")
  );
  const targetUser = ownerUser ?? game.users.activeGM;
  if ( !targetUser ) {
    Logger.error(
      game.i18n.format("CUSTOM_DND5E.giveItems.error.noActiveOwner", { name: recipientActor.name }),
      true,
      { prefix: false }
    );
    return;
  }

  const [itemData, ...contents] = isContainer
    ? await Item.implementation.createWithContents([item])
    : [item.toObject()];

  const data = {
    giverActorUuid: giverActor.uuid,
    recipientActorUuid: recipientActor.uuid,
    itemData,
    contents,
    quantity: qty,
    requiresAcceptance: requiresAcceptance(recipient, giverActor)
  };
  const result = targetUser.isSelf
    ? await onGiveItemQuery(data)
    : await queryUser(targetUser, "giveItem", data);

  if ( !result ) return;
  if ( !result.accepted ) {
    ui.notifications.warn(game.i18n.format("CUSTOM_DND5E.giveItems.rejected", {
      recipient: recipientActor.name,
      item: item.name
    }));
    return;
  }

  await removeGivenItem(item, recipientActor, qty);
}

/* -------------------------------------------- */
/*  RECIPIENT                                   */
/* -------------------------------------------- */

/**
 * Give an item to another actor, asking the owner to accept it if needed.
 * Run on the recipient actor's owner's client, or the GM's if no owner is connected.
 * @param {object} data
 * @param {string} data.giverActorUuid
 * @param {string} data.recipientActorUuid
 * @param {object} data.itemData Item being given
 * @param {object[]} [data.contents] Items inside the container
 * @param {number} data.quantity
 * @param {boolean} data.requiresAcceptance Whether the owner must accept the item first
 * @returns {Promise<{accepted: boolean}>} Whether the item was accepted and added
 */
export async function onGiveItemQuery({
  giverActorUuid, recipientActorUuid, itemData, contents = [], quantity, requiresAcceptance
}) {
  const recipient = await fromUuid(recipientActorUuid);
  if ( !recipient || (!recipient.testUserPermission(game.user, "OWNER") && !game.user.isGM) ) {
    return { accepted: false };
  }

  if ( requiresAcceptance ) {
    const giver = await fromUuid(giverActorUuid);
    const accepted = await confirmGiveAcceptance({ giver, recipient, itemData, quantity });
    if ( !accepted ) return { accepted: false };
  }

  return { accepted: await applyItemToRecipient(recipient, itemData, quantity, contents) };
}

/* -------------------------------------------- */

/**
 * Show the acceptance dialog to the recipient actor's owner.
 * @param {object} args
 * @param {Actor|null} args.giver
 * @param {Actor} args.recipient
 * @param {object} args.itemData
 * @param {number} args.quantity
 * @returns {Promise<boolean>}
 */
async function confirmGiveAcceptance({ giver, recipient, itemData, quantity }) {
  return foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("CUSTOM_DND5E.giveItems.accept.title") },
    content: `<p>${game.i18n.format("CUSTOM_DND5E.giveItems.accept.content", {
      giver: giver?.name ?? game.i18n.localize("CUSTOM_DND5E.unknown"),
      qty: quantity > 1 ? `${quantity}× ` : "",
      item: itemData.name,
      recipient: recipient.name
    })}</p>`,
    modal: true,
    yes: { label: game.i18n.localize("CUSTOM_DND5E.accept") },
    no: { label: game.i18n.localize("CUSTOM_DND5E.reject") }
  });
}

/* -------------------------------------------- */

/**
 * Create the item on the recipient (or stack onto an existing match).
 * @param {Actor} recipient
 * @param {object} itemData
 * @param {number} quantity
 * @param {object[]} [contents] Items inside the container
 * @returns {Promise<boolean>} Whether the apply succeeded
 */
async function applyItemToRecipient(recipient, itemData, quantity, contents = []) {
  try {
    const create = foundry.utils.deepClone(itemData);
    foundry.utils.setProperty(create, "system.quantity", quantity);

    const isContainer = create.type === "container";
    const existing = isContainer ? null : findStackableItem(recipient, create);

    if ( !isContainer ) delete create._id;
    const compendiumSource = create._stats?.compendiumSource;
    delete create._stats;
    if ( compendiumSource ) create._stats = { compendiumSource };
    delete create.ownership;
    delete create.folder;
    delete create.sort;

    if ( existing ) {
      await existing.update({ "system.quantity": (existing.system?.quantity ?? 0) + quantity });
    } else if ( isContainer ) {
      await recipient.createEmbeddedDocuments("Item", [create, ...contents], { keepId: true });
    } else {
      await recipient.createEmbeddedDocuments("Item", [create]);
    }
    return true;
  } catch ( err ) {
    Logger.error(err);
    ui.notifications.error(game.i18n.format("CUSTOM_DND5E.giveItems.error.createFailed", {
      item: itemData.name,
      recipient: recipient.name
    }));
    return false;
  }
}

/* -------------------------------------------- */
/*  GIVER                                       */
/* -------------------------------------------- */

/**
 * Remove the given quantity or item from the giving actor and post the tranfer to chat.
 * @param {Item} item
 * @param {Actor} recipient
 * @param {number} quantity
 * @returns {Promise<void>}
 */
async function removeGivenItem(item, recipient, quantity) {
  if ( !item?.actor?.isOwner ) return;

  try {
    const current = item.system?.quantity ?? 1;
    if ( item.type === "container" ) await item.delete({ deleteContents: true });
    else if ( current - quantity <= 0 ) await item.delete();
    else await item.update({ "system.quantity": current - quantity });
  } catch ( err ) {
    Logger.error(err);
    ui.notifications.error(game.i18n.format("CUSTOM_DND5E.giveItems.error.sourceFailed", {
      item: item.name
    }));
    return;
  }

  postGiveChat({ item, recipient, quantity });
}

/* -------------------------------------------- */

/**
 * Post a chat message announcing the give.
 * @param {object} args
 * @param {Item} args.item
 * @param {Actor|null} args.recipient
 * @param {number} args.quantity
 */
function postGiveChat({ item, recipient, quantity }) {
  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: item.actor }),
    whisper: ChatMessage.getWhisperRecipients("GM"),
    content: `<p>${game.i18n.format("CUSTOM_DND5E.giveItems.chat", {
      giver: item.actor.name,
      qty: quantity > 1 ? `${quantity}× ` : "",
      item: item.name,
      recipient: recipient?.name ?? game.i18n.localize("CUSTOM_DND5E.unknown")
    })}</p>`,
    flags: { "custom-dnd5e": { source: "give-item" } }
  });
}
