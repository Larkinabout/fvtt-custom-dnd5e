import { CONSTANTS, MODULE } from "../constants.js";
import { importData, exportData } from "../debug.js";
import { getSetting, setSetting } from "../utils.js";
import { CustomDnd5eForm } from "./custom-dnd5e-form.js";

/**
 * Class representing the Debug Form.
 */
export class DebugForm extends CustomDnd5eForm {
  /**
   * Constructor for DebugForm.
   *
   * @param {...any} args The arguments for the form.
   */
  constructor(...args) {
    super(args);
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    actions: {
      export: DebugForm.export,
      import: DebugForm.import
    },
    form: {
      handler: DebugForm.submit
    },
    id: `${MODULE.ID}-debug-form`,
    window: {
      title: CONSTANTS.DEBUG.FORM.TITLE
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
      template: CONSTANTS.DEBUG.TEMPLATE.FORM
    }
  };

  /* -------------------------------------------- */

  /**
   * Prepare the context for rendering the form.
   *
   * @returns {Promise<object>} The context data.
   */
  async _prepareContext() {
    return { debug: getSetting(CONSTANTS.DEBUG.SETTING.KEY) };
  }

  /* -------------------------------------------- */

  /**
   * Export the debug data.
   */
  static async export() {
    await exportData();
  }

  /* -------------------------------------------- */

  /**
   * Import the debug data.
   */
  static async import() {
    await importData();
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
    setSetting(CONSTANTS.DEBUG.SETTING.KEY, formData.object.debug);
  }
}
