import { CONSTANTS, MODULE } from "../constants.js";
import { Logger } from "../utils.js";
import {
  addToContainer,
  getEligibleTakers,
  takeItem,
  populateEmptyItemActor,
  promptQuantity
} from "../item-interactions/drop-items.js";
import { ItemDialog } from "../applications/item-dialog.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

/**
 * Register the ItemActorSheet as the default sheet for item actors.
 */
export function registerItemActorSheet() {
  foundry.applications.apps.DocumentSheetConfig.registerSheet(Actor, MODULE.ID, ItemActorSheet, {
    types: [CONSTANTS.DROP_ITEMS.ACTOR_TYPE],
    makeDefault: true,
    label: "CUSTOM_DND5E.dropItems.form.title"
  });
}

/* -------------------------------------------- */

/**
 * Sheet for the item actor.
 */
export class ItemActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: [`${MODULE.ID}-loot-sheet`, `${MODULE.ID}-app`, "dnd5e2", "sheet"],
    position: { width: 560, height: "auto" },
    window: {
      resizable: true,
      icon: "fa-solid fa-treasure-chest"
    },
    actions: {
      takeAll: ItemActorSheet.#onTakeAll,
      takeContents: ItemActorSheet.#onTakeContents,
      takeItem: ItemActorSheet.#onTakeItem,
      openItem: ItemActorSheet.#onOpenItem,
      selectTaker: ItemActorSheet.#onSelectTaker,
      toggleLock: ItemActorSheet.#onToggleLock,
      toggleAffix: ItemActorSheet.#onToggleAffix,
      removeItem: ItemActorSheet.#onRemoveItem
    },
    actorSheet: { managePrototype: false }
  };

  /* -------------------------------------------- */

  static PARTS = {
    body: {
      template: CONSTANTS.DROP_ITEMS.TEMPLATE.SHEET
    }
  };

  /* -------------------------------------------- */

  /** @type {string|null} */
  _selectedActorId = null;

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(_options) {
    const actor = this.actor;
    const items = Array.from(actor.items);
    const root = items.find(i => !i.system?.container) ?? items[0] ?? null;
    const isContainer = root?.type === "container";
    const contents = isContainer
      ? items
        .filter(i => i.id !== root.id && i.system?.container === root.id)
        .map(i => itemRow(i))
        .sort((a, b) => a.name.localeCompare(b.name))
      : [];
    const token = this.#getToken();
    const isOnCanvas = !!token;
    const eligible = token ? getEligibleTakers(token) : [];

    if ( !this._selectedActorId && eligible.length === 1 ) {
      this._selectedActorId = eligible[0].id;
    } else if ( this._selectedActorId && !eligible.some(a => a.id === this._selectedActorId) ) {
      this._selectedActorId = null;
    }

    const takerActors = eligible.map(a => ({
      id: a.id,
      name: a.name,
      img: a.img,
      selected: a.id === this._selectedActorId,
      locked: eligible.length === 1
    }));

    const buttonLabel = isContainer
      ? "CUSTOM_DND5E.dropItems.form.takeContainer"
      : "CUSTOM_DND5E.dropItems.form.take";
    const isLocked = !!actor.system?.locked;
    const isAffixed = !!actor.system?.affixed;
    const canToggleLock = isContainer && game.user.isGM;
    const canToggleAffix = isContainer && game.user.isGM;
    const hideContents = isLocked && !game.user.isGM;
    const showContents = isContainer && !hideContents;
    const showTakeContents = showContents && contents.length > 0;
    const showTakeAll = isOnCanvas && !!root && (!isAffixed || game.user.isGM);
    const showFooter = showTakeAll || (isOnCanvas && showTakeContents);
    const canOpenRoot = !isLocked || game.user.isGM;
    const canRemove = !isOnCanvas && game.user.isGM;

    return {
      root: root ? itemRow(root) : null,
      hasRoot: !!root,
      isContainer,
      contents,
      hasContents: showContents && contents.length > 0,
      showContents,
      takerActors,
      hasTakeWithActors: takerActors.length > 0,
      showTakeWithSection: isOnCanvas,
      takerActorName: takerActors.length === 1 ? takerActors[0].name : null,
      selectedActorId: this._selectedActorId ?? "",
      canTake: !!this._selectedActorId,
      buttonLabel,
      isEmpty: !root && game.user.isGM,
      showFooter,
      showTakeAll,
      showTakeContents,
      canOpenRoot,
      canRemove,
      isLocked,
      canToggleLock,
      lockTooltip: isLocked
        ? "CUSTOM_DND5E.dropItems.hud.unlockContainer"
        : "CUSTOM_DND5E.dropItems.hud.lockContainer",
      isAffixed,
      canToggleAffix,
      showAffixIndicator: isContainer && isAffixed,
      affixTooltip: isAffixed
        ? "CUSTOM_DND5E.dropItems.hud.unaffixContainer"
        : "CUSTOM_DND5E.dropItems.hud.affixContainer"
    };
  }

  /* -------------------------------------------- */

  /**
   * Suppress auto-disable so non-owners can still click Take.
   * @override
   */
  _toggleDisabled(_disabled) {}

  /* -------------------------------------------- */

  /**
   * Clamp the window height to 95% of the viewport.
   * @override
   */
  setPosition(position = {}) {
    if ( typeof position.height === "number" ) {
      const max = Math.floor((window.innerHeight ?? 1080) * 0.95);
      if ( position.height > max ) position.height = max;
    }
    return super.setPosition(position);
  }

  /* -------------------------------------------- */

  /**
   * Reset the stored height to "auto" before each render.
   * @override
   */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    if ( !this._userResized ) this.position.height = "auto";
  }

  /* -------------------------------------------- */

  /**
   * Track when user resizes the window.
   * @override
   */
  _onResize(event) {
    super._onResize?.(event);
    this._userResized = true;
  }

  /* -------------------------------------------- */

  /**
   * Allow item drops from any user, not just owners.
   * @override
   */
  _canDragDrop(_selector) {
    return true;
  }

  /* -------------------------------------------- */

  /**
   * Handle item drops: populate an empty actor, add to a container, or reject.
   * @param {DragEvent} event
   * @override
   */
  async _onDrop(event) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if ( data?.type !== "Item" ) return;
    const item = await Item.implementation.fromDropData(data);
    if ( !item ) return;

    if ( this.actor.items.size === 0 ) {
      if ( !game.user.isGM ) return;
      const quantity = await promptQuantity(item, {
        title: game.i18n.localize("CUSTOM_DND5E.dropItems.populate.title"),
        prompt: game.i18n.format("CUSTOM_DND5E.dropItems.promptQuantity.drop", { item: item.name })
      });
      if ( quantity === null ) return;
      try {
        await populateEmptyItemActor(this.actor, item, { quantity });
      } catch ( err ) {
        Logger.error(err);
      }
      return;
    }

    if ( !this.actor?.system?.isContainer ) {
      Logger.info(game.i18n.localize("CUSTOM_DND5E.dropItems.error.notContainer"), true, { prefix: false });
      return;
    }

    const quantity = await promptQuantity(item, {
      title: game.i18n.format("CUSTOM_DND5E.dropItems.confirmAdd.title", { container: this.actor.name }),
      prompt: game.i18n.format("CUSTOM_DND5E.dropItems.promptQuantity.add", {
        item: item.name, container: this.actor.name
      })
    });
    if ( quantity === null ) return;
    try {
      await addToContainer(this.actor, item, { quantity });
    } catch ( err ) {
      Logger.error(err);
    }
  }

  /* -------------------------------------------- */

  /**
   * Resolve the taker actor from id.
   * @returns {Actor|null}
   */
  #takerActor() {
    if ( !this._selectedActorId ) return null;
    return game.actors?.get(this._selectedActorId) ?? null;
  }

  /* -------------------------------------------- */

  /**
   * Take the root item and all contents.
   * @this {ItemActorSheet}
   */
  static async #onTakeAll() {
    const token = this.#getToken();
    const takerActor = this.#takerActor();
    if ( !token || !takerActor ) return;
    await takeItem(token, { takerActor: takerActor });
  }

  /* -------------------------------------------- */

  /**
   * Take the contents of a container.
   * @this {ItemActorSheet}
   */
  static async #onTakeContents() {
    const token = this.#getToken();
    const takerActor = this.#takerActor();
    if ( !token || !takerActor ) return;
    let rootId = null;
    const itemIds = [];
    for ( const item of this.actor.items ) {
      if ( !item.system?.container ) rootId = item.id;
      else itemIds.push(item.id);
    }
    if ( !rootId || !itemIds.length ) return;
    await takeItem(token, { takerActor: takerActor, itemIds });
  }

  /* -------------------------------------------- */

  /**
   * Take a single item.
   * @this {ItemActorSheet}
   * @param {Event} _event
   * @param {HTMLElement} target
   */
  static async #onTakeItem(_event, target) {
    const itemId = target?.dataset?.itemId;
    if ( !itemId ) return;
    const item = this.actor.items.get(itemId);
    if ( !item ) return;

    const ids = [itemId];
    if ( item.type === "container" ) collectChildIds(this.actor, itemId, ids);

    const token = this.#getToken();
    const takerActor = this.#takerActor();
    if ( !token || !takerActor ) return;

    const isStackable = (item.system?.quantity ?? 1) > 1 && item.type !== "container";
    const overrideMerged = isStackable && !!this.actor.system?.locked && game.user.isGM;
    let quantity;
    if ( isStackable ) {
      quantity = await promptQuantity(item, {
        title: overrideMerged
          ? game.i18n.localize("CUSTOM_DND5E.dropItems.confirmOverrideLock.title")
          : game.i18n.format("CUSTOM_DND5E.dropItems.promptQuantity.takeTitle", {
            item: item.name
          }),
        prompt: game.i18n.format("CUSTOM_DND5E.dropItems.promptQuantity.take", {
          item: item.name
        }),
        warning: overrideMerged
          ? game.i18n.localize("CUSTOM_DND5E.dropItems.confirmOverrideLock.content")
          : null
      });
      if ( quantity === null ) return;
    }

    await takeItem(token, {
      takerActor: takerActor, itemIds: ids, quantity,
      skipOverrideConfirm: overrideMerged
    });
  }

  /* -------------------------------------------- */

  /**
   * Open the item sheet.
   * @this {ItemActorSheet}
   * @param {Event} _event
   * @param {HTMLElement} target
   */
  static async #onOpenItem(_event, target) {
    const itemId = target?.dataset?.itemId;
    if ( !itemId ) return;
    if ( this.actor?.system?.locked && !game.user.isGM ) return;
    const item = this.actor.items.get(itemId);
    item?.sheet?.render(true);
  }

  /* -------------------------------------------- */

  /**
   * Select a taker.
   * @this {ItemActorSheet}
   * @param {Event} _event
   * @param {HTMLElement} target
   */
  static #onSelectTaker(_event, target) {
    if ( target.classList.contains("locked") ) return;
    const actorId = target.dataset?.actorId ?? null;
    if ( !actorId ) return;
    this._selectedActorId = actorId;
    this.render(false);
  }

  /* -------------------------------------------- */

  /**
   * Toggle the locked state of the container. GM-only.
   * @this {ItemActorSheet}
   */
  static async #onToggleLock() {
    if ( !game.user.isGM ) return;
    if ( !this.actor?.system?.isContainer ) return;
    await this.actor.update({ "system.locked": !this.actor.system.locked });
  }

  /* -------------------------------------------- */

  /**
   * Toggle the affixed state of the container. GM-only.
   * @this {ItemActorSheet}
   */
  static async #onToggleAffix() {
    if ( !game.user.isGM ) return;
    if ( !this.actor?.system?.isContainer ) return;
    await this.actor.update({ "system.affixed": !this.actor.system.affixed });
  }

  /* -------------------------------------------- */

  /**
   * Remove the item from an item actor when it's not on the canvas.
   * @this {ItemActorSheet}
   * @param {Event} _event
   * @param {HTMLElement} target
   */
  static async #onRemoveItem(_event, target) {
    if ( !game.user.isGM ) return;
    const itemId = target?.dataset?.itemId;
    if ( !itemId ) return;
    const item = this.actor.items.get(itemId);
    if ( !item ) return;

    const ok = await ItemDialog.confirm({
      title: game.i18n.localize("CUSTOM_DND5E.dropItems.confirmRemove.title"),
      content: `<p>${game.i18n.format("CUSTOM_DND5E.dropItems.confirmRemove.content", {
        item: item.name
      })}</p>`
    });
    if ( !ok ) return;

    const ids = [itemId];
    if ( item.type === "container" ) collectChildIds(this.actor, itemId, ids);
    await this.actor.deleteEmbeddedDocuments("Item", ids);

    const stillHasRoot = Array.from(this.actor.items).some(i => !i.system?.container);
    if ( !stillHasRoot && this.actor.system?.isContainer ) {
      await this.actor.update({ "system.isContainer": false, "system.itemUuid": "" });
    }
  }

  /* -------------------------------------------- */

  /**
   * Get token for item actor.
   * @returns {TokenDocument|null}
   */
  #getToken() {
    if ( this.token ) return this.token;
    const token = this.actor?.getActiveTokens?.()?.[0];
    return token?.document ?? null;
  }
}

/* -------------------------------------------- */

/**
 * Build a display row for an item.
 * @param {Item} item
 * @returns {object}
 */
function itemRow(item) {
  const quantity = item.system?.quantity;
  return {
    id: item.id,
    name: item.name,
    img: item.img,
    quantity: quantity ?? null,
    showQuantity: Number.isFinite(quantity) && quantity > 1,
    isContainer: item.type === "container"
  };
}

/* -------------------------------------------- */

/**
 * Recursively collect all ids for items inside a container.
 * @param {Actor} actor
 * @param {string} containerId
 * @param {string[]} out
 */
function collectChildIds(actor, containerId, out) {
  for ( const child of actor.items ) {
    if ( child.system?.container !== containerId ) continue;
    out.push(child.id);
    if ( child.type === "container" ) collectChildIds(actor, child.id, out);
  }
}
