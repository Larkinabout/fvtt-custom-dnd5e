import { CONSTANTS, MODULE } from "../constants.js";
import { getSetting, setSetting } from "../utils.js";
import { CustomDnd5eForm } from "./custom-dnd5e-form.js";

/**
 * Class representing the Item Sheet Form.
 */
export class ItemSheetForm extends CustomDnd5eForm {
  /**
   * Constructor for ItemSheetForm.
   *
   * @param {...any} args The arguments for the form.
   */
  constructor(...args) {
    super(args);
    this.type = "itemSheet";
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    actions: {
      reset: ItemSheetForm.reset
    },
    form: {
      handler: ItemSheetForm.submit
    },
    id: `${MODULE.ID}-item-sheet-form`,
    window: {
      title: "CUSTOM_DND5E.form.itemSheet.title"
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
      template: CONSTANTS.ITEM_SHEET.TEMPLATE.FORM
    }
  };

  /* -------------------------------------------- */

  /**
   * Prepare the context for rendering the form.
   *
   * @returns {Promise<object>} The context data.
   */
  async _prepareContext() {
    return {
      toggleIdentifiedRole: getSetting(CONSTANTS.ITEM_SHEET.SETTING.TOGGLE_IDENTIFIED_ROLE.KEY),
      selects: this.#getSelects()
    };
  }

  #getSelects() {
    return { 
      role: {
        choices: {
          1: "USER.RolePlayer",
          2: "USER.RoleTrusted",
          3: "USER.RoleAssistant",
          4: "USER.RoleGamemaster"
        }
      }
    };
  }

  /* -------------------------------------------- */

  /**
   * Reset the form to default settings.
   */
  static async reset() {
    const reset = async () => {
      this.render(true);
    };

    await foundry.applications.api.DialogV2.confirm({
      window: {
        title: game.i18n.localize("CUSTOM_DND5E.dialog.reset.title")
      },
      content: `<p>${game.i18n.localize("CUSTOM_DND5E.dialog.reset.content")}</p>`,
      modal: true,
      yes: {
        label: game.i18n.localize("CUSTOM_DND5E.yes"),
        callback: async () => {
          reset();
        }
      },
      no: {
        label: game.i18n.localize("CUSTOM_DND5E.no")
      }
    });
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
    await Promise.all([
      setSetting(CONSTANTS.ITEM_SHEET.SETTING.TOGGLE_IDENTIFIED_ROLE.KEY, formData.object.toggleIdentifiedRole)
    ]);
  }
}
