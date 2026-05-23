import { CONSTANTS, MODULE } from "../../constants.js";
import { Logger } from "../../utils.js";
import { CustomDnd5eForm } from "../custom-dnd5e-form.js";
import { executeGive, getEligibleRecipients, isGiveable } from "../../item-interactions/give-items.js";

/**
 * Class representing the Give Item form.
 */
export class GiveItemForm extends CustomDnd5eForm {
  /**
   * Open the give form for a specific item, optionally pre-targeting a recipient.
   * @param {object} args
   * @param {Item} args.item
   * @param {Token|Actor|null} [args.recipient]
   * @param {object} [options]
   */
  constructor({ item, recipient = null } = {}, options = {}) {
    super(options);
    this.item = item;
    this.recipientToken = recipient?.document ? recipient : null;
    this.recipientActor = recipient?.actor ?? recipient ?? null;
    this._selectedTokenId = this.recipientToken?.id ?? null;
    this._sceneHookIds = {};
    this._scheduleRerender = foundry.utils.debounce(() => {
      if ( this.rendered ) this.render(false);
    }, 100);
  }

  /* -------------------------------------------- */

  /**
   * Open the form.
   * @param {object} args
   */
  static open(args) {
    new this(args).render(true);
  }

  /* -------------------------------------------- */

  static DEFAULT_OPTIONS = {
    actions: {
      selectRecipient: GiveItemForm.selectRecipient
    },
    form: {
      handler: GiveItemForm.submit,
      closeOnSubmit: true
    },
    id: `${MODULE.ID}-give-item-form`,
    position: {
      width: 480,
      height: "auto"
    },
    window: {
      resizable: false,
      title: "CUSTOM_DND5E.giveItems.form.title"
    }
  };

  /* -------------------------------------------- */

  static PARTS = {
    form: {
      template: CONSTANTS.GIVE_ITEMS.TEMPLATE.FORM
    }
  };

  /* -------------------------------------------- */

  /** @override */
  _onFirstRender(context, options) {
    super._onFirstRender?.(context, options);
    if ( this.recipientToken ) return;

    const tokenTrigger = doc => {
      const sceneId = doc?.parent?.id ?? doc?.scene?.id;
      if ( sceneId && sceneId !== canvas.scene?.id ) return;
      this._scheduleRerender();
    };

    const sightTrigger = () => this._scheduleRerender();
    this._sceneHookIds.refreshToken = Hooks.on("refreshToken", t => tokenTrigger(t?.document));
    this._sceneHookIds.createToken = Hooks.on("createToken", tokenTrigger);
    this._sceneHookIds.deleteToken = Hooks.on("deleteToken", tokenTrigger);
    this._sceneHookIds.sightRefresh = Hooks.on("sightRefresh", sightTrigger);
  }

  /* -------------------------------------------- */

  /** @override */
  async _onClose(options) {
    for ( const [name, id] of Object.entries(this._sceneHookIds) ) Hooks.off(name, id);
    this._sceneHookIds = {};
    return super._onClose?.(options);
  }

  /* -------------------------------------------- */

  async _prepareContext() {
    const item = this.item;
    const available = item?.system?.quantity ?? 1;
    const giverActor = item?.actor;

    const lockedToken = this.recipientToken;
    const recipients = lockedToken
      ? [{
        tokenId: lockedToken.id,
        actorId: lockedToken.actor.id,
        name: lockedToken.actor.name,
        img: lockedToken.actor.img,
        dispositionColor: dispositionColor(lockedToken.document.disposition),
        selected: true,
        locked: true
      }]
      : getEligibleRecipients(giverActor).map(t => ({
        tokenId: t.id,
        actorId: t.actor.id,
        name: t.actor.name,
        img: t.actor.img,
        dispositionColor: dispositionColor(t.document.disposition),
        selected: this._selectedTokenId === t.id,
        locked: false
      }));

    // Drop stale selection
    if ( !lockedToken && this._selectedTokenId
      && !recipients.some(r => r.tokenId === this._selectedTokenId) ) {
      this._selectedTokenId = null;
    }

    // Lock single recipient
    if ( !lockedToken && recipients.length === 1 ) {
      this._selectedTokenId = recipients[0].tokenId;
      recipients[0].selected = true;
      recipients[0].locked = true;
    }

    return {
      item: {
        name: item.name,
        img: item.img,
        quantity: available
      },
      recipients,
      hasRecipients: recipients.length > 0,
      showPicker: !lockedToken,
      showQuantity: available > 1,
      maxQuantity: available,
      selectedTokenId: this._selectedTokenId ?? "",
      canSubmit: recipients.length > 0 && !!this._selectedTokenId
    };
  }

  /* -------------------------------------------- */

  /**
   * Select a recipient.
   * @param {Event} event
   * @param {HTMLElement} target
   */
  static selectRecipient(event, target) {
    if ( target.classList.contains("locked") ) return;
    const cards = this.element.querySelectorAll(".custom-dnd5e-actor");
    cards.forEach(c => c.classList.remove("selected"));
    target.classList.add("selected");
    this._selectedTokenId = target.dataset.tokenId ?? null;
    const tokenInput = this.element.querySelector('input[name="recipientTokenId"]');
    if ( tokenInput ) tokenInput.value = this._selectedTokenId ?? "";
    const submit = this.element.querySelector('button[type="submit"]');
    if ( submit ) submit.disabled = !this._selectedTokenId;
  }

  /* -------------------------------------------- */

  /**
   * Handle form submission.
   * @param {SubmitEvent} event
   * @param {HTMLFormElement} form
   * @param {object} formData
   */
  static async submit(event, form, formData) {
    const data = formData.object ?? {};
    const item = this.item;
    if ( !isGiveable(item) ) return;

    let recipient = this.recipientToken ?? this.recipientActor;
    if ( !recipient ) {
      const tokenId = data.recipientTokenId || this._selectedTokenId;
      if ( !tokenId ) return;
      recipient = canvas.tokens?.get(tokenId);
    }
    if ( !recipient ) return;

    const qty = Math.max(1, Math.min(Number(data.quantity) || 1, item.system?.quantity ?? 1));

    executeGive(item, recipient, qty).catch(err => Logger.error(err));
  }
}

/* -------------------------------------------- */

/**
 * Get disposition colour.
 * @param {number} disposition
 * @returns {string|null} Disposition colour
 */
function dispositionColor(disposition) {
  const colors = CONFIG.Canvas?.dispositionColors ?? {};
  const D = CONST.TOKEN_DISPOSITIONS;
  let value;
  switch ( disposition ) {
    case D.FRIENDLY: value = colors.FRIENDLY; break;
    case D.NEUTRAL: value = colors.NEUTRAL; break;
    case D.HOSTILE: value = colors.HOSTILE; break;
    case D.SECRET: value = colors.SECRET; break;
    default: return null;
  }
  return typeof value === "number" ? new foundry.utils.Color(value).css : null;
}
