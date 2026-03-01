import { CONSTANTS, JOURNAL_HELP_BUTTON, MODULE } from "../constants.js";
import { deleteProperty, getSetting, setSetting } from "../utils.js";
import { CustomDnd5eForm } from "./custom-dnd5e-form.js";
import { WorkflowsEditForm } from "./workflows-edit.js";
import { rebuild } from "../workflows/workflows.js";

const id = CONSTANTS.WORKFLOWS.ID;
const form = `${id}-form`;

/**
 * Class representing the Workflows Form.
 *
 * @extends {CustomDnd5eForm}
 */
export class WorkflowsForm extends CustomDnd5eForm {
  /**
   * Constructor for WorkflowsForm.
   *
   * @param {...any} args Arguments to pass to the parent constructor.
   */
  constructor(...args) {
    super(args);
    this.headerButton = JOURNAL_HELP_BUTTON;
    this.headerButton.uuid = CONSTANTS.WORKFLOWS.UUID;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    actions: {
      new: WorkflowsForm.createItem,
      edit: WorkflowsForm.edit,
      delete: WorkflowsForm.deleteItem
    },
    form: {
      handler: WorkflowsForm.submit
    },
    id: `${MODULE.ID}-${form}`,
    window: {
      title: "CUSTOM_DND5E.form.workflows.title"
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
      template: `modules/${MODULE.ID}/templates/${form}.hbs`
    }
  };

  /* -------------------------------------------- */

  /**
   * Prepare the context for the form.
   *
   * @returns {Promise<object>} The context object.
   */
  async _prepareContext() {
    this.setting = getSetting(CONSTANTS.WORKFLOWS.SETTING.WORKFLOWS.KEY) || {};
    return {
      enabled: getSetting(CONSTANTS.WORKFLOWS.SETTING.ENABLE.KEY) || false,
      triggers: this.setting
    };
  }

  /* -------------------------------------------- */

  /**
   * Delete a workflow item.
   *
   * @param {Event} event The event that triggered the action.
   * @param {HTMLElement} target The target element.
   */
  static async deleteItem(event, target) {
    const item = target.closest(".item");
    if ( !item ) return;

    const key = item.dataset.key;
    if ( !key ) return;

    await foundry.applications.api.DialogV2.confirm({
      window: {
        title: game.i18n.localize("CUSTOM_DND5E.form.workflows.dialog.delete.title")
      },
      content: `<p>${game.i18n.localize("CUSTOM_DND5E.form.workflows.dialog.delete.content")}</p>`,
      modal: true,
      yes: {
        label: game.i18n.localize("CUSTOM_DND5E.yes"),
        callback: async () => {
          const listItem = this.element.querySelector(`[data-key="${key}"]`);
          const deleteInput = listItem.querySelector('input[id="custom-dnd5e-delete"]');
          if ( deleteInput ) deleteInput.setAttribute("value", "true");
          listItem.classList.add("hidden");
        }
      },
      no: {
        label: game.i18n.localize("CUSTOM_DND5E.no")
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * Create a new trigger item.
   *
   * @returns {Promise<void>}
   */
  static async createItem() {
    const key = foundry.utils.randomID();
    const args = { workflowsForm: this, data: { key, label: "" }, setting: this.setting };
    await WorkflowsEditForm.open(args);
  }

  /* -------------------------------------------- */

  /**
   * Open the edit form for a trigger.
   *
   * @param {Event} event The event that triggered the edit.
   * @param {HTMLElement} target The target element.
   * @returns {Promise<void>}
   */
  static async edit(event, target) {
    const item = target.closest(".item");
    if ( !item ) return;

    const key = item.dataset.key;
    if ( !key ) return;

    const label = this.setting[key]?.label || "";
    const args = { workflowsForm: this, data: { key, label }, setting: this.setting };
    await WorkflowsEditForm.open(args);
  }

  /* -------------------------------------------- */

  /**
   * Submit the form data.
   *
   * @param {Event} event The event that triggered the submit.
   * @param {HTMLFormElement} form The form element.
   * @param {object} formData The form data.
   * @returns {Promise<void>}
   */
  static async submit(event, form, formData) {
    // Get list of properties to delete
    const deleteKeys = Object.entries(formData.object)
      .filter(([key, value]) => key.split(".").pop() === "delete" && value === "true")
      .map(([key, _]) => key.split(".").slice(0, -1).join("."));

    // Delete properties from this.setting
    deleteKeys.forEach(deleteKey => {
      const key = deleteKey.split(".").pop();
      deleteProperty(this.setting, key);
    });

    await Promise.all([
      setSetting(CONSTANTS.WORKFLOWS.SETTING.ENABLE.KEY, formData.object.enabled ?? false),
      setSetting(CONSTANTS.WORKFLOWS.SETTING.WORKFLOWS.KEY, this.setting)
    ]);

    rebuild();
  }
}
