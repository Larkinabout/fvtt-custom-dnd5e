import { CONSTANTS, JOURNAL_HELP_BUTTON, MODULE } from "../constants.js";
import { getSetting, setSetting, resetSetting } from "../utils.js";
import { CustomDnd5eForm } from "./custom-dnd5e-form.js";
import { setConfig } from "../encumbrance.js";

/**
 * Class representing the Encumbrance Form.
 */
export class EncumbranceForm extends CustomDnd5eForm {
  /**
   * Constructor for EncumbranceForm.
   *
   * @param {...any} args The arguments for the form.
   */
  constructor(...args) {
    super(args);

    this.metric = game.settings.get("dnd5e", "metricWeightUnits") || false;
    this.settingKey = CONSTANTS.ENCUMBRANCE.SETTING.KEY;
    this.setConfig = setConfig;
    this.type = "encumbrance";
    this.headerButton = JOURNAL_HELP_BUTTON;
    this.headerButton.uuid = CONSTANTS.ENCUMBRANCE.UUID;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    actions: {
      reset: EncumbranceForm.reset
    },
    form: {
      handler: EncumbranceForm.submit
    },
    id: `${MODULE.ID}-encumbrance-form`,
    window: {
      title: "CUSTOM_DND5E.form.encumbrance.title"
    }
  };

  static PARTS = {
    form: {
      template: CONSTANTS.ENCUMBRANCE.TEMPLATE.FORM
    }
  };

  /* -------------------------------------------- */

  /**
   * Prepare the context for rendering the form.
   *
   * @returns {Promise<object>} The context data.
   */
  async _prepareContext() {
    this.setting = getSetting(this.settingKey) || foundry.utils.deepClone(CONFIG.DND5E.encumbrance);
    const context = this.setting;
    context.metric = this.metric;
    context.equippedItemWeightModifier =
      getSetting(CONSTANTS.ENCUMBRANCE.EQUIPPED_ITEM_WEIGHT_MODIFIER.SETTING.KEY);
    context.proficientEquippedItemWeightModifier =
      getSetting(CONSTANTS.ENCUMBRANCE.PROFICIENT_EQUIPPED_ITEM_WEIGHT_MODIFIER.SETTING.KEY);
    context.unequippedItemWeightModifier =
      getSetting(CONSTANTS.ENCUMBRANCE.UNEQUIPPED_ITEM_WEIGHT_MODIFIER.SETTING.KEY);

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Reset the form to default settings.
   */
  static async reset() {
    const reset = async () => {
      await Promise.all([
        setSetting(this.settingKey, CONFIG.CUSTOM_DND5E[this.type]),
        resetSetting(CONSTANTS.ENCUMBRANCE.EQUIPPED_ITEM_WEIGHT_MODIFIER.SETTING.KEY),
        resetSetting(CONSTANTS.ENCUMBRANCE.PROFICIENT_EQUIPPED_ITEM_WEIGHT_MODIFIER.SETTING.KEY),
        resetSetting(CONSTANTS.ENCUMBRANCE.UNEQUIPPED_ITEM_WEIGHT_MODIFIER.SETTING.KEY)
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
    const ignore = ["equippedItemWeightModifier", "proficientEquippedItemWeightModifier", "unequippedItemWeightModifier"];

    Object.entries(formData.object).forEach(([key, value]) => {
      if ( ignore.includes(key) ) return;

      foundry.utils.setProperty(this.setting, key, value);
    });

    await Promise.all([
      setSetting(this.settingKey, this.setting),
      setSetting(CONSTANTS.ENCUMBRANCE.EQUIPPED_ITEM_WEIGHT_MODIFIER.SETTING.KEY,
        formData.object.equippedItemWeightModifier),
      setSetting(CONSTANTS.ENCUMBRANCE.PROFICIENT_EQUIPPED_ITEM_WEIGHT_MODIFIER.SETTING.KEY,
        formData.object.proficientEquippedItemWeightModifier),
      setSetting(CONSTANTS.ENCUMBRANCE.UNEQUIPPED_ITEM_WEIGHT_MODIFIER.SETTING.KEY,
        formData.object.unequippedItemWeightModifier)
    ]);

    this.setConfig(this.setting);
  }
}
