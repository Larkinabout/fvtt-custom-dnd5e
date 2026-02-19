import { CONSTANTS, JOURNAL_HELP_BUTTON, MODULE } from "../constants.js";
import { getSetting, setSetting, resetSetting } from "../utils.js";
import { CustomDnd5eForm } from "./custom-dnd5e-form.js";
import { setConfig } from "../configurations/encumbrance.js";

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
    this.enableConfigKey = CONSTANTS.ENCUMBRANCE.SETTING.ENABLE.KEY;
    this.settingKey = CONSTANTS.ENCUMBRANCE.SETTING.CONFIG.KEY;
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
   * Handle rendering the form and attaching event listeners.
   *
   * @param {object} context The rendering context.
   * @param {object} options The rendering options.
   */
  _onRender(context, options) {
    super._onRender(context, options);

    const modeSelect = this.element.querySelector("#custom-dnd5e-speed-reduction-mode");
    const flatElements = this.element.querySelectorAll(".speed-reduction-flat");
    const multiplierElements = this.element.querySelectorAll(".speed-reduction-multiplier");

    modeSelect?.addEventListener("change", () => {
      flatElements.forEach(el => el.classList.toggle("hidden", modeSelect.value !== "flat"));
      multiplierElements.forEach(el => el.classList.toggle("hidden", modeSelect.value !== "multiplier"));
    });
  }

  /* -------------------------------------------- */

  /**
   * Prepare the context for rendering the form.
   *
   * @returns {Promise<object>} The context data.
   */
  async _prepareContext() {
    this.setting = getSetting(this.settingKey) || foundry.utils.deepClone(CONFIG.DND5E.encumbrance);
    const context = foundry.utils.deepClone(this.setting);
    context.metric = this.metric;
    context.equippedItemWeightModifier =
      getSetting(CONSTANTS.ENCUMBRANCE.EQUIPPED_ITEM_WEIGHT_MODIFIER.SETTING.KEY);
    context.proficientEquippedItemWeightModifier =
      getSetting(CONSTANTS.ENCUMBRANCE.PROFICIENT_EQUIPPED_ITEM_WEIGHT_MODIFIER.SETTING.KEY);
    context.unequippedItemWeightModifier =
      getSetting(CONSTANTS.ENCUMBRANCE.UNEQUIPPED_ITEM_WEIGHT_MODIFIER.SETTING.KEY);
    context.speedReductionMode =
      getSetting(CONSTANTS.ENCUMBRANCE.SPEED_REDUCTION_MODE.SETTING.KEY);
    context.speedReductionMultiplierEncumbered =
      getSetting(CONSTANTS.ENCUMBRANCE.SPEED_REDUCTION_MULTIPLIER_ENCUMBERED.SETTING.KEY);
    context.speedReductionMultiplierHeavilyEncumbered =
      getSetting(CONSTANTS.ENCUMBRANCE.SPEED_REDUCTION_MULTIPLIER_HEAVILY_ENCUMBERED.SETTING.KEY);
    context.speedReductionMultiplierExceedingCarryingCapacity =
      getSetting(CONSTANTS.ENCUMBRANCE.SPEED_REDUCTION_MULTIPLIER_EXCEEDING_CARRYING_CAPACITY.SETTING.KEY);
    context.speedReductionMultiplierRounding =
      getSetting(CONSTANTS.ENCUMBRANCE.SPEED_REDUCTION_MULTIPLIER_ROUNDING.SETTING.KEY);

    if ( this.enableConfigKey ) {
      context.enableConfig = getSetting(this.enableConfigKey);
    }

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
        resetSetting(CONSTANTS.ENCUMBRANCE.UNEQUIPPED_ITEM_WEIGHT_MODIFIER.SETTING.KEY),
        resetSetting(CONSTANTS.ENCUMBRANCE.SPEED_REDUCTION_MODE.SETTING.KEY),
        resetSetting(CONSTANTS.ENCUMBRANCE.SPEED_REDUCTION_MULTIPLIER_ENCUMBERED.SETTING.KEY),
        resetSetting(CONSTANTS.ENCUMBRANCE.SPEED_REDUCTION_MULTIPLIER_HEAVILY_ENCUMBERED.SETTING.KEY),
        resetSetting(CONSTANTS.ENCUMBRANCE.SPEED_REDUCTION_MULTIPLIER_EXCEEDING_CARRYING_CAPACITY.SETTING.KEY),
        resetSetting(CONSTANTS.ENCUMBRANCE.SPEED_REDUCTION_MULTIPLIER_ROUNDING.SETTING.KEY)
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
    const ignore = ["enableConfig", "equippedItemWeightModifier", "metric", "partId", "proficientEquippedItemWeightModifier", "speedReductionMode", "speedReductionMultiplierEncumbered", "speedReductionMultiplierExceedingCarryingCapacity", "speedReductionMultiplierHeavilyEncumbered", "speedReductionMultiplierRounding", "unequippedItemWeightModifier"];

    this.enableConfig = formData.object.enableConfig;
    await setSetting(this.enableConfigKey, this.enableConfig);
    delete formData.object.enableConfig;

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
        formData.object.unequippedItemWeightModifier),
      setSetting(CONSTANTS.ENCUMBRANCE.SPEED_REDUCTION_MODE.SETTING.KEY,
        formData.object.speedReductionMode),
      setSetting(CONSTANTS.ENCUMBRANCE.SPEED_REDUCTION_MULTIPLIER_ENCUMBERED.SETTING.KEY,
        formData.object.speedReductionMultiplierEncumbered),
      setSetting(CONSTANTS.ENCUMBRANCE.SPEED_REDUCTION_MULTIPLIER_HEAVILY_ENCUMBERED.SETTING.KEY,
        formData.object.speedReductionMultiplierHeavilyEncumbered),
      setSetting(CONSTANTS.ENCUMBRANCE.SPEED_REDUCTION_MULTIPLIER_EXCEEDING_CARRYING_CAPACITY.SETTING.KEY,
        formData.object.speedReductionMultiplierExceedingCarryingCapacity),
      setSetting(CONSTANTS.ENCUMBRANCE.SPEED_REDUCTION_MULTIPLIER_ROUNDING.SETTING.KEY,
        formData.object.speedReductionMultiplierRounding)
    ]);

    this.setConfig(this.setting);

    foundry.applications.settings.SettingsConfig.reloadConfirm();
  }
}
