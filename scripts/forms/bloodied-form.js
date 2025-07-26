import { CONSTANTS, JOURNAL_HELP_BUTTON, MODULE } from "../constants.js";
import { getSetting, setSetting, resetSetting } from "../utils.js";
import { CustomDnd5eForm } from "./custom-dnd5e-form.js";
import { overrideBloodied, setConfig } from "../configurations/bloodied.js";

/**
 * Class representing the Bloodied Form.
 */
export class BloodiedForm extends CustomDnd5eForm {
  /**
   * Constructor for BloodiedForm.
   *
   * @param {...any} args The arguments for the form.
   */
  constructor(...args) {
    super(args);

    this.enableConfigKey = CONSTANTS.BLOODIED.SETTING.ENABLE.KEY;
    this.settingKey = CONSTANTS.BLOODIED.SETTING.CONFIG.KEY;
    this.setConfig = setConfig;
    this.type = "bloodied";
    this.headerButton = JOURNAL_HELP_BUTTON;
    this.headerButton.uuid = CONSTANTS.BLOODIED.UUID;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    actions: {
      reset: BloodiedForm.reset
    },
    form: {
      handler: BloodiedForm.submit
    },
    id: `${MODULE.ID}-bloodied-form`,
    window: {
      title: "CUSTOM_DND5E.form.bloodied.title"
    }
  };

  static PARTS = {
    form: {
      template: CONSTANTS.BLOODIED.TEMPLATE.FORM
    }
  };

  /* -------------------------------------------- */

  /**
   * Prepare the context for rendering the form.
   *
   * @returns {Promise<object>} The context data.
   */
  async _prepareContext() {
    this.setting = getSetting(this.settingKey) || foundry.utils.deepClone(CONFIG.DND5E.bloodied);
    const context = foundry.utils.deepClone(this.setting);
    context.applyBloodied = getSetting(CONSTANTS.BLOODIED.SETTING.APPLY_BLOODIED.KEY);
    context.bloodiedStatus = getSetting(CONSTANTS.BLOODIED.SETTING.BLOODIED_STATUS.KEY) || "player";
    context.bloodiedTint = getSetting(CONSTANTS.BLOODIED.SETTING.BLOODIED_TINT.KEY);
    context.removeBloodiedOnDead = getSetting(CONSTANTS.BLOODIED.SETTING.REMOVE_BLOODIED_ON_DEAD.KEY);
    context.selects = this.#getSelects();

    if ( this.enableConfigKey ) {
      context.enableConfig = getSetting(this.enableConfigKey);
    }

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Get the select options for the form.
   *
   * @returns {object} The select options.
   */
  #getSelects() {
    return {
      status: {
        choices: {
          all: "SETTINGS.DND5E.BLOODIED.All",
          player: "SETTINGS.DND5E.BLOODIED.Player",
          none: "SETTINGS.DND5E.BLOODIED.None"
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
      await Promise.all([
        setSetting(this.settingKey, CONFIG.CUSTOM_DND5E[this.type]),
        resetSetting(CONSTANTS.BLOODIED.SETTING.APPLY_BLOODIED.KEY),
        resetSetting(CONSTANTS.BLOODIED.SETTING.BLOODIED_STATUS.KEY),
        resetSetting(CONSTANTS.BLOODIED.SETTING.BLOODIED_TINT.KEY),
        resetSetting(CONSTANTS.BLOODIED.SETTING.REMOVE_BLOODIED_ON_DEAD.KEY),
      ]);
      this.setConfig(CONFIG.CUSTOM_DND5E[this.type]);
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
    const ignore = ["enableConfig", "applyBloodied", "bloodiedStatus", "bloodiedTint"];

    this.enableConfig = formData.object.enableConfig;
    await setSetting(this.enableConfigKey, this.enableConfig);
    delete formData.object.enableConfig;

    Object.entries(formData.object).forEach(([key, value]) => {
      if ( ignore.includes(key) ) return;

      foundry.utils.setProperty(this.setting, key, value);
    });

    await Promise.all([
      setSetting(this.settingKey, this.setting),
      overrideBloodied(formData.object.applyBloodied, formData.object.bloodiedStatus),
      setSetting(CONSTANTS.BLOODIED.SETTING.BLOODIED_TINT.KEY, formData.object.bloodiedTint),
      setSetting(CONSTANTS.BLOODIED.SETTING.REMOVE_BLOODIED_ON_DEAD.KEY, formData.object.removeBloodiedOnDead)
    ]);

    this.setConfig(this.setting);

    SettingsConfig.reloadConfirm();
  }
}
