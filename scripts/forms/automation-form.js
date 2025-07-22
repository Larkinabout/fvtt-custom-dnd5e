import { CONSTANTS, JOURNAL_HELP_BUTTON, MODULE } from "../constants.js";
import { getSetting, setSetting, resetSetting } from "../utils.js";
import { CustomDnd5eForm } from "./custom-dnd5e-form.js";

/**
 * Class representing the Auotmation Form.
 */
export class AutomationForm extends CustomDnd5eForm {
  /**
   * Constructor for AutomationForm.
   *
   * @param {...any} args The arguments for the form.
   */
  constructor(...args) {
    super(args);
    this.type = "automation";
    this.headerButton = JOURNAL_HELP_BUTTON;
    this.headerButton.uuid = CONSTANTS.AUTOMATION.UUID;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    actions: {
      reset: AutomationForm.reset
    },
    form: {
      handler: AutomationForm.submit
    },
    id: `${MODULE.ID}-automation-form`,
    window: {
      title: "CUSTOM_DND5E.form.automation.title"
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
      template: CONSTANTS.AUTOMATION.TEMPLATE.FORM
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
      enableMobs: getSetting(CONSTANTS.AUTOMATION.MOBS.SETTING.ENABLE.KEY),
      useAverageDamage: getSetting(CONSTANTS.AUTOMATION.MOBS.SETTING.USE_AVERAGE_DAMAGE.KEY)
    };
  }

  /* -------------------------------------------- */

  /**
   * Reset the form to default settings.
   */
  static async reset() {
    const reset = async () => {
      await Promise.all([
        resetSetting(CONSTANTS.AUTOMATION.MOBS.SETTING.ENABLE.KEY),
        resetSetting(CONSTANTS.AUTOMATION.MOBS.SETTING.USE_AVERAGE_DAMAGE.KEY)
      ]);
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
      setSetting(CONSTANTS.AUTOMATION.MOBS.SETTING.ENABLE.KEY, formData.object.enableMobs),
      setSetting(CONSTANTS.AUTOMATION.MOBS.SETTING.USE_AVERAGE_DAMAGE.KEY, formData.object.useAverageDamage)
    ]);

    foundry.applications.settings.SettingsConfig.reloadConfirm();
  }
}
