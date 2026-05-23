import { CONSTANTS } from "../constants.js";
import { Logger } from "../utils.js";
import { isItemToken, openSheet, takeItem } from "../item-interactions/drop-items.js";

/**
 * Replace the Item Token HUD.
 */
export function registerItemTokenHUD() {
  CONFIG.Token.hudClass = ItemTokenHUD;
}

/* -------------------------------------------- */

/**
 * ItemTokenHUD class.
 */
export class ItemTokenHUD extends foundry.applications.hud.TokenHUD {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    actions: {
      view: ItemTokenHUD.#onView,
      take: ItemTokenHUD.#onTake,
      toggleLock: ItemTokenHUD.#onToggleLock,
      toggleAffix: ItemTokenHUD.#onToggleAffix
    }
  };

  /* -------------------------------------------- */

  /**
   * Whether this HUD is for an item actor token.
   * @type {boolean}
   */
  get isItemHUD() {
    return isItemToken(this.object);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _configureRenderParts(options) {
    if ( !this.isItemHUD ) return super._configureRenderParts(options);
    return {
      hud: { root: true, template: CONSTANTS.DROP_ITEMS.TEMPLATE.HUD, templates: [] }
    };
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    if ( !this.isItemHUD ) return context;

    const actor = this.actor;
    const isContainer = !!actor?.system?.isContainer;
    const locked = !!actor?.system?.locked;
    const affixed = !!actor?.system?.affixed;
    return foundry.utils.mergeObject(context, {
      isLoot: true,
      isContainer,
      containerLocked: locked,
      containerAffixed: affixed,
      viewLabel: isContainer ? "CUSTOM_DND5E.dropItems.hud.open" : "CUSTOM_DND5E.dropItems.hud.view",
      takeLabel: "CUSTOM_DND5E.dropItems.hud.take",
      lockLabel: locked
        ? "CUSTOM_DND5E.dropItems.hud.unlockContainer"
        : "CUSTOM_DND5E.dropItems.hud.lockContainer",
      affixLabel: affixed
        ? "CUSTOM_DND5E.dropItems.hud.unaffixContainer"
        : "CUSTOM_DND5E.dropItems.hud.affixContainer"
    });
  }

  /* -------------------------------------------- */

  /**
   * Open the actor sheet.
   * @this {ItemTokenHUD}
   */
  static #onView() {
    openSheet(this.object);
  }

  /* -------------------------------------------- */

  /**
   * Take the item.
   * @this {ItemTokenHUD}
   */
  static #onTake() {
    takeItem(this.object).catch(err => Logger.error(err));
  }

  /* -------------------------------------------- */

  /**
   * Toggle the locked state.
   * @this {ItemTokenHUD}
   */
  static async #onToggleLock() {
    if ( !game.user.isGM ) return;
    const actor = this.actor;
    if ( !actor?.system?.isContainer ) return;
    await actor.update({ "system.locked": !actor.system.locked });
    this.render(true);
  }

  /* -------------------------------------------- */

  /**
   * Toggle the affixed state.
   * @this {ItemTokenHUD}
   */
  static async #onToggleAffix() {
    if ( !game.user.isGM ) return;
    const actor = this.actor;
    if ( !actor?.system?.isContainer ) return;
    await actor.update({ "system.affixed": !actor.system.affixed });
    this.render(true);
  }
}
