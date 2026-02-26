import { CONSTANTS, MODULE, JOURNAL_HELP_BUTTON } from "../constants.js";
import { getSetting, setSetting, resetSetting } from "../utils.js";
import { CustomDnd5eForm } from "./custom-dnd5e-form.js";

const constants = CONSTANTS.ACTIVITIES;

/**
 * Class representing the Activities settings form.
 */
export class ActivitiesForm extends CustomDnd5eForm {
  /**
   * Constructor for ActivitiesForm.
   *
   * @param {...any} args The arguments for the form.
   */
  constructor(...args) {
    super(args);
    this.type = "activities";
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
      reset: ActivitiesForm.reset
    },
    form: {
      handler: ActivitiesForm.submit
    },
    id: `${MODULE.ID}-activities-form`,
    window: {
      title: "CUSTOM_DND5E.form.activities.title"
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
      template: constants.TEMPLATE.FORM
    }
  };

  /* -------------------------------------------- */

  /**
   * Prepare the context for rendering the form.
   *
   * @returns {Promise<object>} The context data.
   */
  async _prepareContext() {
    const setting = getSetting(constants.SETTING.CONFIG.KEY);
    return {
      macro: setting?.macro ?? false,
      move: setting?.move ?? false,
      swap: setting?.swap ?? false
    };
  }

  /* -------------------------------------------- */

  /**
   * Reset the form to default settings.
   */
  static async reset() {
    const reset = async () => {
      await resetSetting(constants.SETTING.CONFIG.KEY);
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
   * @param {Event} event The event
   * @param {HTMLFormElement} form The form element.
   * @param {object} formData The form data.
   */
  static async submit(event, form, formData) {
    await setSetting(constants.SETTING.CONFIG.KEY, {
      macro: formData.object.macro ?? false,
      move: formData.object.move ?? false,
      swap: formData.object.swap ?? false
    });

    foundry.applications.settings.SettingsConfig.reloadConfirm();
  }
}
