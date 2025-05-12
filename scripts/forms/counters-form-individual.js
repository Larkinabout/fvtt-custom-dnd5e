import { CONSTANTS, MODULE } from "../constants.js";
import { deleteProperty, getFlag, setFlag, unsetFlag } from "../utils.js";
import { CountersForm } from "./counters-form.js";
import { CountersEditForm } from "./counters-edit.js";

const form = "counters-form-individual";

/**
 * Class representing the Individual Counters Form.
 */
export class CountersFormIndividual extends CountersForm {
  /**
   * Constructor for CountersFormIndividual.
   *
   * @param {object} entity The entity to which the counters belong.
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
      "edit": CountersFormIndividual.edit
    },
    form: {
      handler: CountersFormIndividual.submit
    },
    id: `${MODULE.ID}-${form}`,
    window: {
      title: "CUSTOM_DND5E.form.counters.title"
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
   * Get the select options for the form.
   *
   * @returns {object} The select options.
   */
  #getSelects() {
    return {
      type: {
        choices: {
          checkbox: "CUSTOM_DND5E.checkbox",
          fraction: "CUSTOM_DND5E.fraction",
          number: "CUSTOM_DND5E.number",
          successFailure: "CUSTOM_DND5E.successFailure"
        }
      }
    };
  }

  /* -------------------------------------------- */

  /**
   * Prepare the context for rendering the form.
   *
   * @returns {Promise<object>} The context data.
   */
  async _prepareContext() {
    this.counters = getFlag(this.entity, "counters") || {};
    return {
      counters: this.counters,
      selects: this.#getSelects()
    };
  }

  /* -------------------------------------------- */

  /**
   * Open the edit form.
   *
   * @param {Event} event The event that triggered the action.
   * @param {HTMLElement} target The target element.
   */
  static async edit(event, target) {
    const item = target.closest(".custom-dnd5e-item");
    if ( !item ) return;

    const key = item.dataset.key;
    if ( !key ) return;

    const label = item.querySelector("#custom-dnd5e-label").value;
    const type = item.querySelector("#custom-dnd5e-type").value;
    const actorType = this.entity.type;
    const entity = this.entity;
    const setting = this.counters;
    const args = { countersForm: this, data: { key, actorType, entity, label, type }, setting };
    await CountersEditForm.open(args);
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
    const ignore = ["actorType", "delete", "key"];

    // Get list of properties to delete
    const deleteKeys = Object.entries(formData.object)
      .filter(([key, value]) => key.split(".").pop() === "delete" && value === "true")
      .map(([key, _]) => key.split(".").slice(0, -1).join("."));

    // Delete properties from this.setting
    deleteKeys.forEach(key => {
      const setting = this.counters;
      deleteProperty(setting, key);
    });

    // Delete properties from formData
    Object.keys(formData.object).forEach(key => {
      if ( deleteKeys.includes(key.split(".").slice(0, -1)[0]) ) {
        delete formData.object[key];
      }
    });

    // Set properties in this.setting
    Object.entries(formData.object).forEach(([key, value]) => {
      if ( ignore.includes(key.split(".").pop()) ) { return; }
      foundry.utils.setProperty(this.counters, key, value);
    });

    await unsetFlag(this.entity, "counters");
    await setFlag(this.entity, "counters", this.counters);
  }
}
