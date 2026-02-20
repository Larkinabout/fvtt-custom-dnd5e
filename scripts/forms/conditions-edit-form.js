import { CONSTANTS, JOURNAL_HELP_BUTTON, MODULE } from "../constants.js";
import { ConfigEditForm } from "./config-edit-form.js";
import { getSettingDefault, resetConfigSetting, setConfig } from "../configurations/conditions.js";

const constants = CONSTANTS.CONDITIONS;
const configKey = "conditions";

/**
 * Class representing a form to edit conditions.
 * Extends the ConfigEditForm class.
 *
 * @class
 * @extends ConfigEditForm
 */
export class ConditionsEditForm extends ConfigEditForm {
  /**
   * Constructor for ConditionsEditForm.
   *
   * @param {object} args Arguments passed to the parent class.
   */
  constructor(args) {
    super(args);
    this.configKey = configKey;
    this.settingKey = constants.SETTING.CONFIG.KEY;
    this.getSettingDefault = getSettingDefault;
    this.resetConfigSetting = resetConfigSetting;
    this.setConfig = setConfig;
    this.headerButton = JOURNAL_HELP_BUTTON;
    this.headerButton.uuid = constants.UUID;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    actions: {
      clearMacro: ConditionsEditForm.clearMacro
    },
    id: `${MODULE.ID}-conditions-edit`,
    position: {
      height: 600
    },
    window: {
      title: `CUSTOM_DND5E.form.${configKey}.edit.title`
    }
  };

  /* -------------------------------------------- */

  /**
   * Parts of the form.
   *
   * @type {object}
   */
  static PARTS = {
    form: {
      template: constants.TEMPLATE.EDIT
    }
  };

  /* -------------------------------------------- */

  /**
   * Get the select options for the form.
   *
   * @returns {object} The select options.
   */
  _getSelects() {
    const statusEffects = Object.fromEntries(
      CONFIG.statusEffects.map(statusEffect => [statusEffect.id, statusEffect.name])
    );
    return { riders: statusEffects, statuses: statusEffects };
  }

  /* -------------------------------------------- */

  /**
   * Prepare the context for rendering the form.
   *
   * @returns {Promise<object>} The context data.
   */
  async _prepareContext() {
    const context = await super._prepareContext();
    if ( context.macroUuid ) {
      const macro = await fromUuid(context.macroUuid);
      context.macroName = macro?.name ?? "";
    }
    if ( context.macroDisabledUuid ) {
      const macro = await fromUuid(context.macroDisabledUuid);
      context.macroDisabledName = macro?.name ?? "";
    }
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Handle form rendering.
   * @param {object} context The context data.
   * @param {object} options The options for rendering.
   */
  _onRender(context, options) {
    super._onRender(context, options);
    const macroDrops = this.element.querySelectorAll(".custom-dnd5e-macro-drop");
    for ( const macroDrop of macroDrops ) {
      macroDrop.addEventListener("drop", (event) => this.#onDropMacro(event));
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle dropping a Macro onto the form.
   * @param {DragEvent} event The drop event.
   */
  async #onDropMacro(event) {
    event.preventDefault();
    event.stopPropagation();
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if ( data?.type !== "Macro" ) return;
    const macro = await Macro.implementation.fromDropData(data);
    if ( !macro ) return;

    const container = event.currentTarget;
    const input = container.querySelector('input[type="hidden"]');
    if ( input ) input.value = macro.uuid;

    const macroField = container.querySelector(".custom-dnd5e-macro-field");
    const dropArea = container.querySelector(".drop-area");
    const nameEl = container.querySelector(".custom-dnd5e-macro-name");
    if ( nameEl ) nameEl.textContent = macro.name;
    if ( macroField ) macroField.classList.remove("hidden");
    if ( dropArea ) dropArea.classList.add("hidden");
  }

  /* -------------------------------------------- */

  /**
   * Clear the macro selection.
   * @param {Event} event The event that triggered the action.
   * @param {HTMLElement} target The target element.
   */
  static clearMacro(event, target) {
    const container = target.closest(".custom-dnd5e-macro-drop");
    const input = container.querySelector('input[type="hidden"]');
    if ( input ) input.value = "";

    const macroField = container.querySelector(".custom-dnd5e-macro-field");
    const dropArea = container.querySelector(".drop-area");
    if ( macroField ) macroField.classList.add("hidden");
    if ( dropArea ) dropArea.classList.remove("hidden");
  }
}
