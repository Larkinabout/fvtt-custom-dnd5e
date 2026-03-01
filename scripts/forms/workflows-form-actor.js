import { MODULE } from "../constants.js";
import { deleteProperty, getFlag, setFlag, unsetFlag } from "../utils.js";
import { WorkflowsForm } from "./workflows-form.js";
import { WorkflowsEditForm } from "./workflows-edit.js";
import { rebuild } from "../workflows/workflows.js";

const form = "workflows-form-actor";

/**
 * Class representing the Actor Workflows Form.
 */
export class WorkflowsFormActor extends WorkflowsForm {
  /**
   * Constructor for WorkflowsFormActor.
   *
   * @param {object} entity The entity to which the workflows belong.
   */
  constructor(entity) {
    super(entity);
    this.entity = entity;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    actions: {
      new: WorkflowsFormActor.createItem,
      edit: WorkflowsFormActor.edit
    },
    form: {
      handler: WorkflowsFormActor.submit
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
   * Prepare the context for rendering the form.
   *
   * @returns {Promise<object>} The context data.
   */
  async _prepareContext() {
    this.triggers = getFlag(this.entity, "triggers") || {};
    return {
      triggers: this.triggers
    };
  }

  /* -------------------------------------------- */

  /**
   * Create a new trigger item.
   *
   * @returns {Promise<void>}
   */
  static async createItem() {
    const key = foundry.utils.randomID();
    const entity = this.entity;
    const setting = this.triggers;
    const args = { workflowsForm: this, data: { key, label: "", entity }, setting };
    await WorkflowsEditForm.open(args);
  }

  /* -------------------------------------------- */

  /**
   * Open the edit form.
   *
   * @param {Event} event The event that triggered the action.
   * @param {HTMLElement} target The target element.
   */
  static async edit(event, target) {
    const item = target.closest(".item");
    if ( !item ) return;

    const key = item.dataset.key;
    if ( !key ) return;

    const label = this.triggers[key]?.label || "";
    const entity = this.entity;
    const setting = this.triggers;
    const args = { workflowsForm: this, data: { key, label, entity }, setting };
    await WorkflowsEditForm.open(args);
  }

  /* -------------------------------------------- */

  /**
   * Submit the form data.
   *
   * @param {Event} event The event that triggered the action.
   * @param {HTMLFormElement} form The form element.
   * @param {object} formData The form data.
   */
  static async submit(event, form, formData) {
    const ignore = ["delete", "key"];

    // Get list of properties to delete
    const deleteKeys = Object.entries(formData.object)
      .filter(([key, value]) => key.split(".").pop() === "delete" && value === "true")
      .map(([key, _]) => key.split(".").slice(0, -1).join("."));

    // Delete properties from this.triggers
    deleteKeys.forEach(key => {
      deleteProperty(this.triggers, key);
    });

    // Delete properties from formData
    Object.keys(formData.object).forEach(key => {
      if ( deleteKeys.includes(key.split(".").slice(0, -1)[0]) ) {
        delete formData.object[key];
      }
    });

    // Set properties in this.triggers
    Object.entries(formData.object).forEach(([key, value]) => {
      if ( ignore.includes(key.split(".").pop()) ) { return; }
      foundry.utils.setProperty(this.triggers, key, value);
    });

    await unsetFlag(this.entity, "triggers");
    await setFlag(this.entity, "triggers", this.triggers);

    rebuild();
  }
}
