import { CONSTANTS } from "../constants.js";
import { hideApplications, Logger } from "../utils.js";
import { MoveCanvasMode } from "./move-canvas-mode.js";

const constants = CONSTANTS.ACTIVITIES;

/* -------------------------------------------- */
/*  Data Model                                  */
/* -------------------------------------------- */

/**
 * Data model for a move activity.
 */
class BaseMoveActivityData extends dnd5e.dataModels.activity.BaseActivityData {
  /** @inheritDoc */
  static defineSchema() {
    const { BooleanField, NumberField, SchemaField, StringField } = foundry.data.fields;
    return {
      ...super.defineSchema(),
      move: new SchemaField({
        direction: new StringField({ initial: "push" }),
        distanceMin: new NumberField({ initial: 0, min: 0, integer: true }),
        distanceMax: new NumberField({ initial: 5, min: 0, integer: true }),
        autoExecute: new BooleanField({ initial: true })
      })
    };
  }
}

/* -------------------------------------------- */
/*  Activity Sheet                              */
/* -------------------------------------------- */

/**
 * Sheet for the move activity.
 */
class MoveActivitySheet extends dnd5e.applications.activity.ActivitySheet {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    classes: ["custom-dnd5e-move-activity"]
  };

  /* -------------------------------------------- */

  /** @inheritDoc */
  static PARTS = {
    ...super.PARTS,
    effect: {
      template: constants.TEMPLATE.MOVE_EFFECT,
      templates: super.PARTS.effect.templates
    }
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareEffectContext(context, options) {
    context = await super._prepareEffectContext(context, options);
    context.directionChoices = {
      push: game.i18n.localize("CUSTOM_DND5E.activities.move.direction.push"),
      pull: game.i18n.localize("CUSTOM_DND5E.activities.move.direction.pull"),
      pushOrPull: game.i18n.localize("CUSTOM_DND5E.activities.move.direction.pushOrPull"),
      any: game.i18n.localize("CUSTOM_DND5E.activities.move.direction.any")
    };
    return context;
  }
}

/* -------------------------------------------- */
/*  Activity                                    */
/* -------------------------------------------- */

/**
 * Activity that moves a target token on the canvas.
 */
export class MoveActivity extends dnd5e.documents.activity.ActivityMixin(BaseMoveActivityData) {
  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "CUSTOM_DND5E.activities.move"];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(
    foundry.utils.mergeObject(super.metadata, {
      type: "custom-dnd5e-move",
      img: "modules/custom-dnd5e/media/icons/activity/move.svg",
      title: "CUSTOM_DND5E.activities.move.title",
      hint: "CUSTOM_DND5E.activities.move.hint",
      sheetClass: MoveActivitySheet,
      usage: {
        actions: {
          pushToken: MoveActivity.#pushToken,
          pullToken: MoveActivity.#pullToken,
          moveToken: MoveActivity.#moveToken
        }
      }
    }, { inplace: false })
  );

  /* -------------------------------------------- */
  /*  Activation                                  */
  /* -------------------------------------------- */

  /** @override */
  async use(usage = {}, dialog = {}, message = {}) {
    const actor = this.item?.parent;
    const sourceToken = actor?.isToken ? actor.token?.object : actor?.getActiveTokens()[0];

    if ( !sourceToken ) {
      Logger.error(game.i18n.localize("CUSTOM_DND5E.activities.move.noSourceToken"), true);
      return;
    }

    if ( !game.user.targets.size ) {
      Logger.error(game.i18n.localize("CUSTOM_DND5E.activities.move.noTarget"), true);
      return;
    }

    return super.use(usage, dialog, message);
  }

  /* -------------------------------------------- */

  /** @override */
  _usageChatButtons(message) {
    if ( this.move.autoExecute ) return super._usageChatButtons(message);

    const buttons = [];
    if ( this.move.direction === "pushOrPull" ) {
      buttons.push({
        label: game.i18n.localize("CUSTOM_DND5E.activities.move.direction.push"),
        icon: '<i class="fa-solid fa-arrow-up-from-line" inert></i>',
        dataset: { action: "pushToken" }
      });
      buttons.push({
        label: game.i18n.localize("CUSTOM_DND5E.activities.move.direction.pull"),
        icon: '<i class="fa-solid fa-arrow-down-to-line" inert></i>',
        dataset: { action: "pullToken" }
      });
    } else {
      buttons.push({
        label: game.i18n.localize("CUSTOM_DND5E.activities.move.moveToken"),
        icon: '<i class="fa-solid fa-arrows-up-down-left-right" inert></i>',
        dataset: { action: "moveToken" }
      });
    }
    return [...buttons, ...super._usageChatButtons(message)];
  }

  /* -------------------------------------------- */

  /** @override */
  async _triggerSubsequentActions(config, results) {
    if ( this.move.autoExecute ) {
      await this.startMoveMode({ direction: this.move.direction, config, results });
    }
  }

  /* -------------------------------------------- */
  /*  Move Execution                              */
  /* -------------------------------------------- */

  /**
   * Start the canvas move mode for this activity.
   * @param {object} [options={}]
   * @param {string} [options.direction] The movement direction override
   * @param {object} [options.config] The activity usage config
   * @param {object} [options.results] The activity usage results
   * @param {ChatMessage5e} [options.message] The message
   * @returns {Promise<void>}
   */
  async startMoveMode({ direction, config, results, message } = {}) {
    const dir = direction ?? this.move.direction;
    const actor = this.item?.parent;
    const sourceToken = actor?.isToken ? actor.token?.object : actor?.getActiveTokens()[0];

    if ( !sourceToken ) {
      Logger.error(game.i18n.localize("CUSTOM_DND5E.activities.move.noSourceToken"), true);
      return;
    }

    const chatMessage = message ?? results?.message;
    const targetData = chatMessage?.getFlag?.("dnd5e", "targets");
    let targetTokens = [];

    if ( targetData?.length ) {
      for ( const t of targetData ) {
        const scene = game.scenes.get(t.sceneId);
        const tokenDoc = scene?.tokens.get(t.tokenId);
        if ( tokenDoc?.object ) targetTokens.push(tokenDoc.object);
      }
    }

    if ( !targetTokens.length ) {
      targetTokens = Array.from(game.user.targets);
    }

    if ( !targetTokens.length ) {
      Logger.error(game.i18n.localize("CUSTOM_DND5E.activities.move.noTarget"), true);
      return;
    }

    const restoreApplications = await hideApplications();

    for ( const targetToken of targetTokens ) {
      await MoveCanvasMode.activate({
        sourceToken,
        targetToken,
        direction: dir,
        distanceMin: this.move.distanceMin,
        distanceMax: this.move.distanceMax
      });
    }

    await restoreApplications();
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle pushing the target token from a chat card button.
   * @this {MoveActivity}
   * @param {PointerEvent} event The event
   * @param {HTMLElement} target The target element
   * @param {ChatMessage5e} message The message
   */
  static #pushToken(event, target, message) {
    this.startMoveMode({ direction: "push", message });
  }

  /**
   * Handle pulling the target token from a chat card button.
   * @this {MoveActivity}
   * @param {PointerEvent} event The event
   * @param {HTMLElement} target The target element
   * @param {ChatMessage5e} message The message
   */
  static #pullToken(event, target, message) {
    this.startMoveMode({ direction: "pull", message });
  }

  /**
   * Handle moving the target token from a chat card button.
   * @this {MoveActivity}
   * @param {PointerEvent} event The event
   * @param {HTMLElement} target The target element
   * @param {ChatMessage5e} message The message
   */
  static #moveToken(event, target, message) {
    this.startMoveMode({ direction: this.move.direction, message });
  }
}
