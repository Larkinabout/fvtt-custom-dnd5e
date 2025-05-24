import { CONSTANTS, JOURNAL_HELP_BUTTON, MODULE } from "../constants.js";
import { getSetting, setSetting } from "../utils.js";
import { CustomDnd5eForm } from "./custom-dnd5e-form.js";

/**
 * Class representing the Rolls Form.
 */
export class RollsForm extends CustomDnd5eForm {
  /**
   * Constructor for RollsForm.
   *
   * @param {...any} args The arguments for the form.
   */
  constructor(...args) {
    super(args);
    this.type = "sheet";
    this.headerButton = JOURNAL_HELP_BUTTON;
    this.headerButton.uuid = CONSTANTS.ROLLS.UUID;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    actions: {
      reset: RollsForm.reset
    },
    form: {
      handler: RollsForm.submit
    },
    id: `${MODULE.ID}-rolls-form`,
    window: {
      title: "CUSTOM_DND5E.form.rolls.title"
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
      template: CONSTANTS.ROLLS.TEMPLATE.FORM
    }
  };

  /* -------------------------------------------- */

  /**
   * Prepare the context for rendering the form.
   *
   * @returns {Promise<object>} The context data.
   */
  async _prepareContext() {
    const rolls = getSetting(CONSTANTS.ROLLS.SETTING.ROLLS.KEY);
    const weaponTypes = {};

    Object.entries(CONFIG.DND5E.weaponTypes).forEach(([key, value]) => {
      const die = rolls.weaponTypes?.[key]?.die || "1d20";
      const label = value;
      const rollMode = rolls.weaponTypes?.[key]?.rollMode || "default";
      weaponTypes[key] = { die, label, rollMode };
    });

    rolls.weaponTypes = weaponTypes;

    return {
      rolls,
      selects: {
        rollMode: {
          choices: {
            default: "CUSTOM_DND5E.default",
            blindroll: "CHAT.RollBlind",
            gmroll: "CHAT.RollPrivate",
            publicroll: "CHAT.RollPublic",
            selfroll: "CHAT.RollSelf"
          }
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
    const rolls = {};

    Object.entries(formData.object).forEach(([key, value]) => {
      if ( key.startsWith("rolls") ) {
        foundry.utils.setProperty(rolls, key, value);
      }
    });

    await setSetting(CONSTANTS.ROLLS.SETTING.ROLLS.KEY, {});
    await setSetting(CONSTANTS.ROLLS.SETTING.ROLLS.KEY, rolls.rolls);

    foundry.applications.settings.SettingsConfig.reloadConfirm();
  }
}
