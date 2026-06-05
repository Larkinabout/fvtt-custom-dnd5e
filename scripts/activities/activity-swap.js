import { CONSTANTS, MODULE } from "../constants.js";
import { addHelpButton, Logger } from "../utils.js";
import { applyBypassedMoves, getTargetedTokensFromMessage } from "./activities.js";

const constants = CONSTANTS.ACTIVITIES;

/* -------------------------------------------- */
/*  DATA MODEL                                  */
/* -------------------------------------------- */

/**
 * Data model for a swap activity.
 */
class BaseSwapActivityData extends dnd5e.dataModels.activity.BaseActivityData {
  /** @inheritDoc */
  static defineSchema() {
    const { BooleanField, SchemaField, StringField } = foundry.data.fields;
    return {
      ...super.defineSchema(),
      swap: new SchemaField({
        maxSize: new StringField({ initial: "" }),
        actorUuid: new StringField(),
        isTeleport: new BooleanField({ initial: true }),
        autoExecute: new BooleanField({ initial: true })
      })
    };
  }
}

/* -------------------------------------------- */
/*  ACTIVITY SHEET                              */
/* -------------------------------------------- */

/**
 * Sheet for the swap activity.
 */
class SwapActivitySheet extends dnd5e.applications.activity.ActivitySheet {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    classes: ["custom-dnd5e-swap-activity"],
    actions: {
      clearActor: SwapActivitySheet.clearActor
    }
  };

  /* -------------------------------------------- */

  /** @inheritDoc */
  static PARTS = {
    ...super.PARTS,
    activation: {
      template: constants.TEMPLATE.SWAP_ACTIVATION,
      templates: [
        ...super.PARTS.activation.templates,
        constants.TEMPLATE.SWAP_TARGETING
      ]
    },
    effect: {
      template: constants.TEMPLATE.SWAP_EFFECT,
      templates: super.PARTS.effect.templates
    }
  };

  /* -------------------------------------------- */
  /*  RENDERING                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareActivationContext(context, options) {
    context = await super._prepareActivationContext(context, options);

    // Resolve actor name from UUID
    if ( context.source.swap.actorUuid ) {
      const actor = await fromUuid(context.source.swap.actorUuid);
      context.actorName = actor?.name ?? "";
    }

    // Build size choices from CONFIG.DND5E.actorSizes
    const sizeChoices = { "": game.i18n.localize("CUSTOM_DND5E.activities.swap.noRestriction") };
    for ( const [key, value] of Object.entries(CONFIG.DND5E.actorSizes) ) {
      sizeChoices[key] = value.label;
    }
    context.sizeChoices = sizeChoices;
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onRender(context, options) {
    super._onRender(context, options);
    addHelpButton(this.element, constants.PAGE_UUID.SWAP);
    const actorDrop = this.element.querySelector(".custom-dnd5e-actor-drop");
    if ( actorDrop ) {
      actorDrop.addEventListener("drop", event => this.#onDropActor(event));
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle dropping an Actor onto the sheet.
   * @param {DragEvent} event Drag event
   */
  async #onDropActor(event) {
    event.preventDefault();
    event.stopPropagation();
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if ( data?.type !== "Actor" ) return;
    const actor = await Actor.implementation.fromDropData(data);
    if ( !actor ) return;
    await this.activity.update({ "swap.actorUuid": actor.uuid });
  }

  /* -------------------------------------------- */

  /**
   * Clear the actor selection.
   * @param {Event} event Event
   * @param {HTMLElement} target Target HTML element
   */
  static clearActor(event, target) {
    this.activity.update({ "swap.actorUuid": "" });
  }
}

/* -------------------------------------------- */
/*  ACTIVITY                                    */
/* -------------------------------------------- */

/**
 * Activity that swaps the caster's token position with a target token.
 */
export class SwapActivity extends dnd5e.documents.activity.ActivityMixin(BaseSwapActivityData) {
  /* -------------------------------------------- */
  /*  MODEL CONFIGURATION                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "CUSTOM_DND5E.activities.swap"];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(
    foundry.utils.mergeObject(super.metadata, {
      type: "custom-dnd5e-swap",
      img: "modules/custom-dnd5e/media/icons/activity/swap.svg",
      title: "CUSTOM_DND5E.activities.swap.title",
      hint: "CUSTOM_DND5E.activities.swap.hint",
      sheetClass: SwapActivitySheet,
      usage: {
        actions: {
          swapToken: SwapActivity.#swapToken
        }
      }
    }, { inplace: false })
  );

  /* -------------------------------------------- */
  /*  ACTIVATION                                  */
  /* -------------------------------------------- */

  /** @override */
  async use(usage = {}, dialog = {}, message = {}) {
    const actor = this.item?.parent;
    const sourceToken = actor?.isToken ? actor.token?.object : actor?.getActiveTokens()[0];

    if ( !sourceToken ) {
      Logger.error(game.i18n.localize("CUSTOM_DND5E.activities.swap.noSourceToken"), true, { prefix: false });
      return;
    }

    return super.use(usage, dialog, message);
  }

  /* -------------------------------------------- */

  /** @override */
  _usageChatButtons(message) {
    if ( this.swap.autoExecute ) return super._usageChatButtons(message);

    return [{
      label: game.i18n.localize("CUSTOM_DND5E.activities.swap.swapButton"),
      icon: '<i class="fa-solid fa-arrow-right-arrow-left" inert></i>',
      dataset: { action: "swapToken" }
    }, ...super._usageChatButtons(message)];
  }

  /* -------------------------------------------- */

  /** @override */
  async _triggerSubsequentActions(config, results) {
    if ( this.swap.autoExecute ) {
      await this.executeSwap({ config, results });
    }
  }

  /* -------------------------------------------- */
  /*  SWAP EXECUTION                              */
  /* -------------------------------------------- */

  /**
   * Execute the token position swap.
   * @param {object} [options={}] Options
   * @param {object} [options.config] Activity usage config
   * @param {object} [options.results] Activity usage results
   * @param {ChatMessage5e} [options.message] Chat message
   * @returns {Promise<void>}
   */
  async executeSwap({ config, results, message } = {}) {
    const actor = this.item?.parent;
    const sourceToken = actor?.isToken ? actor.token?.object : actor?.getActiveTokens()[0];

    if ( !sourceToken ) {
      Logger.error(game.i18n.localize("CUSTOM_DND5E.activities.swap.noSourceToken"), true, { prefix: false });
      return;
    }

    // Resolve target from message flags or user targets
    const chatMessage = message ?? results?.message;
    let targetToken;

    // Try message target data first
    const messageTokens = await getTargetedTokensFromMessage(chatMessage);
    if ( messageTokens.length ) targetToken = messageTokens[0];

    // Fall back to designated actor
    if ( !targetToken && this.swap.actorUuid ) {
      const targetActor = await fromUuid(this.swap.actorUuid);
      if ( !targetActor ) {
        Logger.error(game.i18n.localize("CUSTOM_DND5E.activities.swap.actorNotFound"), true, { prefix: false });
        return;
      }
      const tokens = targetActor.getActiveTokens();
      if ( !tokens.length ) {
        Logger.error(game.i18n.format("CUSTOM_DND5E.activities.swap.actorNotOnCanvas", {
          name: targetActor.name
        }), true, { prefix: false });
        return;
      }
      if ( tokens.length === 1 ) {
        targetToken = tokens[0];
      } else {
        targetToken = Array.from(game.user.targets).find(t => t.actor?.uuid === targetActor.uuid);
        if ( !targetToken ) {
          Logger.error(game.i18n.format("CUSTOM_DND5E.activities.swap.multipleTokens", {
            name: targetActor.name
          }), true, { prefix: false });
          return;
        }
      }
    }

    // Fall back to user targets
    if ( !targetToken && game.user.targets.size ) {
      targetToken = Array.from(game.user.targets)[0];
    }

    if ( !targetToken ) {
      Logger.error(game.i18n.localize("CUSTOM_DND5E.activities.swap.noTarget"), true, { prefix: false });
      return;
    }

    const targetName = targetToken.document.name;

    // Validate range
    const rangeValue = this.range?.value;
    const rangeUnits = this.range?.units;
    if ( rangeValue && rangeUnits && (rangeUnits in CONFIG.DND5E.movementUnits) ) {
      const distance = canvas.grid.measurePath([sourceToken.center, targetToken.center]).distance;
      if ( distance > rangeValue ) {
        Logger.error(game.i18n.format("CUSTOM_DND5E.activities.swap.outOfRange", {
          name: targetName, range: rangeValue
        }), true, { prefix: false });
        return;
      }
    }

    // Validate target type
    const affectsType = this.target?.affects?.type;
    if ( affectsType && !["self", "any", "creature", "creatureOrObject"].includes(affectsType) ) {
      const sourceDisposition = sourceToken.document.disposition;
      const targetDisposition = targetToken.document.disposition;
      const isSameDisposition = sourceDisposition === targetDisposition;
      let mismatch = false;
      if ( affectsType === "ally" && !isSameDisposition ) mismatch = true;
      else if ( affectsType === "willing" && !isSameDisposition ) mismatch = true;
      else if ( affectsType === "enemy" && isSameDisposition ) mismatch = true;
      if ( mismatch ) {
        const typeLabel = game.i18n.localize(
          CONFIG.DND5E.individualTargetTypes[affectsType]?.label ?? affectsType
        ).toLowerCase();
        const article = /^[aeiou]/i.test(typeLabel) ? "an" : "a";
        Logger.error(game.i18n.format("CUSTOM_DND5E.activities.swap.targetTypeMismatch", {
          name: targetName, type: `${article} ${typeLabel}`
        }), true, { prefix: false });
        return;
      }
    }

    // Validate size
    if ( this.swap.maxSize ) {
      const targetSize = targetToken.actor?.system?.traits?.size;
      const sizeKeys = Object.keys(CONFIG.DND5E.actorSizes);
      const maxIndex = CONFIG.DND5E.actorSizes[this.swap.maxSize]?.numerical
        ?? sizeKeys.indexOf(this.swap.maxSize);
      const targetIndex = CONFIG.DND5E.actorSizes[targetSize]?.numerical
        ?? sizeKeys.indexOf(targetSize);
      if ( targetIndex > maxIndex ) {
        Logger.error(game.i18n.format("CUSTOM_DND5E.activities.swap.sizeTooLarge", {
          name: targetName
        }), true, { prefix: false });
        return;
      }
    }

    const sourceDoc = sourceToken.document;
    const targetDoc = targetToken.document;
    const sourceElevation = sourceDoc.elevation;
    const targetElevation = targetDoc.elevation;

    let newSourcePos;
    let newTargetPos;

    if ( canvas.grid.type === CONST.GRID_TYPES.SQUARE ) {
      // Square grid: align each token's "center square" to the other.
      // For odd-sized tokens (1x1, 3x3, 5x5), the center square is the middle square.
      // For even-sized tokens (2x2, 4x4), the center square is the top-left of the central area.
      const gridSize = canvas.grid.size;
      const sourceOffsetX = Math.floor((sourceDoc.width - 1) / 2) * gridSize;
      const sourceOffsetY = Math.floor((sourceDoc.height - 1) / 2) * gridSize;
      const targetOffsetX = Math.floor((targetDoc.width - 1) / 2) * gridSize;
      const targetOffsetY = Math.floor((targetDoc.height - 1) / 2) * gridSize;

      const sourceCenterSquare = { x: sourceDoc.x + sourceOffsetX, y: sourceDoc.y + sourceOffsetY };
      const targetCenterSquare = { x: targetDoc.x + targetOffsetX, y: targetDoc.y + targetOffsetY };

      newSourcePos = { x: targetCenterSquare.x - sourceOffsetX, y: targetCenterSquare.y - sourceOffsetY };
      newTargetPos = { x: sourceCenterSquare.x - targetOffsetX, y: sourceCenterSquare.y - targetOffsetY };
    } else {
      // TODO: Hex snapping causes drifting on round trips
      const sourceCenter = sourceToken.center;
      const targetCenter = targetToken.center;
      newSourcePos = sourceDoc.getSnappedPosition({
        x: targetCenter.x - (sourceToken.w / 2),
        y: targetCenter.y - (sourceToken.h / 2)
      });
      newTargetPos = targetDoc.getSnappedPosition({
        x: sourceCenter.x - (targetToken.w / 2),
        y: sourceCenter.y - (targetToken.h / 2)
      });
    }

    // Check if user can modify both tokens
    const canModifyBoth = sourceDoc.canUserModify(game.user, "update")
      && targetDoc.canUserModify(game.user, "update");

    if ( canModifyBoth ) {
      await applySwapMoves(canvas.scene, {
        sourceDoc, targetDoc, newSourcePos, newTargetPos,
        sourceElevation, targetElevation, isTeleport: this.swap.isTeleport
      });
    } else {
      game.socket.emit(`module.${MODULE.ID}`, {
        action: "swapTokens",
        options: {
          sceneId: canvas.scene.id,
          sourceTokenId: sourceDoc.id,
          sourceX: newSourcePos.x,
          sourceY: newSourcePos.y,
          sourceElevation: targetElevation,
          targetTokenId: targetDoc.id,
          targetX: newTargetPos.x,
          targetY: newTargetPos.y,
          targetElevation: sourceElevation,
          teleport: this.swap.isTeleport
        }
      });
    }
  }

  /* -------------------------------------------- */
  /*  EVENT LISTENERS AND HANDLERS                */
  /* -------------------------------------------- */

  /**
   * Handle swapping tokens from a chat card button.
   * @this {SwapActivity}
   * @param {PointerEvent} event Pointer event
   * @param {HTMLElement} target TTarget HTML element
   * @param {ChatMessage5e} message Chat message
   */
  static #swapToken(event, target, message) {
    this.executeSwap({ message });
  }
}

/* -------------------------------------------- */
/*  SHARED HELPERS                              */
/* -------------------------------------------- */

/**
 * Swap two tokens' positions on a scene.
 * @param {Scene} scene
 * @param {object} args
 * @param {TokenDocument} args.sourceDoc
 * @param {TokenDocument} args.targetDoc
 * @param {{x: number, y: number}} args.newSourcePos
 * @param {{x: number, y: number}} args.newTargetPos
 * @param {number} args.sourceElevation
 * @param {number} args.targetElevation
 * @param {boolean} args.isTeleport Whether to teleport (skip animation)
 * @returns {Promise<boolean>} Whether the swap completed
 */
export async function applySwapMoves(scene, {
  sourceDoc, targetDoc, newSourcePos, newTargetPos, sourceElevation, targetElevation, isTeleport
}) {
  if ( !isTeleport ) {
    const sourceObj = sourceDoc.object;
    const targetObj = targetDoc.object;
    if ( sourceObj && targetObj ) {
      const sourceBlocked = sourceObj.checkCollision(targetObj.center, { type: "move" });
      const targetBlocked = targetObj.checkCollision(sourceObj.center, { type: "move" });
      if ( sourceBlocked || targetBlocked ) {
        Logger.info(game.i18n.localize("CUSTOM_DND5E.activities.swap.pathBlocked"), true, { prefix: false });
        return false;
      }
    }
  }

  await applyBypassedMoves(scene, [
    { tokenDoc: sourceDoc, x: newSourcePos.x, y: newSourcePos.y, elevation: targetElevation },
    { tokenDoc: targetDoc, x: newTargetPos.x, y: newTargetPos.y, elevation: sourceElevation }
  ], { animate: !isTeleport });
  return true;
}
