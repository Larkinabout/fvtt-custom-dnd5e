import { CONSTANTS } from "../constants.js";
import { Logger } from "../utils.js";

const constants = CONSTANTS.ACTIVITIES;

/* -------------------------------------------- */
/*  Data Model                                  */
/* -------------------------------------------- */

/**
 * Data model for a macro activity.
 */
class BaseMacroActivityData extends dnd5e.dataModels.activity.BaseActivityData {
  /** @inheritDoc */
  static defineSchema() {
    const { BooleanField, SchemaField, StringField } = foundry.data.fields;
    return {
      ...super.defineSchema(),
      macro: new SchemaField({
        uuid: new StringField(),
        autoExecute: new BooleanField({ initial: true })
      })
    };
  }
}

/* -------------------------------------------- */
/*  Activity Sheet                              */
/* -------------------------------------------- */

/**
 * Sheet for the macro activity.
 */
class MacroActivitySheet extends dnd5e.applications.activity.ActivitySheet {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    classes: ["custom-dnd5e-macro-activity"],
    actions: {
      clearMacro: MacroActivitySheet.clearMacro
    }
  };

  /* -------------------------------------------- */

  /** @inheritDoc */
  static PARTS = {
    ...super.PARTS,
    effect: {
      template: constants.TEMPLATE.MACRO_EFFECT,
      templates: super.PARTS.effect.templates
    }
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareEffectContext(context, options) {
    context = await super._prepareEffectContext(context, options);
    if ( context.source.macro.uuid ) {
      const macro = await fromUuid(context.source.macro.uuid);
      context.macroName = macro?.name ?? "";
    }
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onRender(context, options) {
    super._onRender(context, options);
    const macroDrop = this.element.querySelector(".custom-dnd5e-macro-drop");
    if ( macroDrop ) {
      macroDrop.addEventListener("drop", event => this.#onDropMacro(event));
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle dropping a Macro onto the sheet.
   * @param {DragEvent} event The event
   */
  async #onDropMacro(event) {
    event.preventDefault();
    event.stopPropagation();
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if ( data?.type !== "Macro" ) return;
    const macro = await Macro.implementation.fromDropData(data);
    if ( !macro ) return;
    await this.activity.update({ "macro.uuid": macro.uuid });
  }

  /* -------------------------------------------- */

  /**
   * Clear the macro selection.
   * @param {Event} event The event
   * @param {HTMLElement} target The target element
   */
  static clearMacro(event, target) {
    this.activity.update({ "macro.uuid": "" });
  }
}

/* -------------------------------------------- */
/*  Activity                                    */
/* -------------------------------------------- */

/**
 * Activity that executes a macro.
 */
export class MacroActivity extends dnd5e.documents.activity.ActivityMixin(BaseMacroActivityData) {
  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "CUSTOM_DND5E.activities.macro"];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(
    foundry.utils.mergeObject(super.metadata, {
      type: "custom-dnd5e-macro",
      img: "modules/custom-dnd5e/media/icons/activity/macro.svg",
      title: "CUSTOM_DND5E.activities.macro.title",
      hint: "CUSTOM_DND5E.activities.macro.hint",
      sheetClass: MacroActivitySheet,
      usage: {
        actions: {
          executeMacro: MacroActivity.#executeMacro
        }
      }
    }, { inplace: false })
  );

  /* -------------------------------------------- */
  /*  Activation                                  */
  /* -------------------------------------------- */

  /** @override */
  _usageChatButtons(message) {
    if ( !this.macro.autoExecute && this.macro.uuid ) {
      const macro = fromUuidSync(this.macro.uuid);
      return [{
        label: macro?.name ?? game.i18n.localize("CUSTOM_DND5E.activities.macro.runMacro"),
        icon: '<i class="fa-solid fa-terminal" inert></i>',
        dataset: { action: "executeMacro" }
      }, ...super._usageChatButtons(message)];
    }
    return super._usageChatButtons(message);
  }

  /* -------------------------------------------- */

  /** @override */
  async _triggerSubsequentActions(config, results) {
    if ( this.macro.autoExecute ) await this.executeMacro({ config, results });
  }

  /* -------------------------------------------- */
  /*  Macro Execution                             */
  /* -------------------------------------------- */

  /**
   * Execute the macro attached to this activity.
   * @param {object} [options={}]
   * @param {object} [options.config] The activity usage config
   * @param {object} [options.results] The activity usage results
   * @param {ChatMessage5e} [options.message] The message
   * @returns {Promise<void>}
   */
  async executeMacro({ config, results, message } = {}) {
    if ( !this.macro.uuid ) return;
    const macro = await fromUuid(this.macro.uuid);
    if ( !macro ) {
      Logger.error(game.i18n.localize("CUSTOM_DND5E.macroNotFound"), true);
      return;
    }
    const actor = this.item?.parent;
    const token = actor?.isToken ? actor.token : actor?.getActiveTokens()[0];
    const chatMessage = message ?? results?.message;
    const targets = chatMessage?.getFlag?.("dnd5e", "targets") ?? Array.from(game.user?.targets ?? []);
    macro.execute({ actor, token, item: this.item, activity: this, targets, config, message: chatMessage });
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle executing the macro from a chat card button.
   * @this {MacroActivity}
   * @param {PointerEvent} event The event
   * @param {HTMLElement} target The target element
   * @param {ChatMessage5e} message The message
   */
  static #executeMacro(event, target, message) {
    this.executeMacro({ message });
  }
}
