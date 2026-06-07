import {
  Logger,
  c5eLoadTemplates,
  checkEmpty,
  getSetting,
  registerMenu,
  registerSetting,
  resetDnd5eConfig,
  resetSetting,
  setSetting } from "../utils.js";
import { MODULE } from "../constants.js";
import { CustomDnd5eForm } from "../forms/custom-dnd5e-form.js";
import { configs } from "./registry.js";

/* -------------------------------------------- */
/*  CONSTANTS                                   */
/* -------------------------------------------- */

export const constants = {
  EQUIPPED_ITEM_WEIGHT_MODIFIER: {
    SETTING: {
      KEY: "equipped-item-weight-modifier"
    }
  },
  PROFICIENT_EQUIPPED_ITEM_WEIGHT_MODIFIER: {
    SETTING: { KEY: "proficient-equipped-item-weight-modifier"}
  },
  UNEQUIPPED_ITEM_WEIGHT_MODIFIER: {
    SETTING: {
      KEY: "unequipped-item-weight-modifier"
    }
  },
  SPEED_REDUCTION_MODE: {
    SETTING: {
      KEY: "speed-reduction-mode"
    }
  },
  SPEED_REDUCTION_MULTIPLIER_ENCUMBERED: {
    SETTING: {
      KEY: "speed-reduction-multiplier-encumbered"
    }
  },
  SPEED_REDUCTION_MULTIPLIER_HEAVILY_ENCUMBERED: {
    SETTING: {
      KEY: "speed-reduction-multiplier-heavily-encumbered"
    }
  },
  SPEED_REDUCTION_MULTIPLIER_EXCEEDING_CARRYING_CAPACITY: {
    SETTING: {
      KEY: "speed-reduction-multiplier-exceeding-carrying-capacity"
    }
  },
  SPEED_REDUCTION_MULTIPLIER_ROUNDING: {
    SETTING: {
      KEY: "speed-reduction-multiplier-rounding"
    }
  },
  ID: "encumbrance",
  MENU: {
    KEY: "encumbrance-menu",
    HINT: "CUSTOM_DND5E.menu.encumbrance.hint",
    ICON: "fas fa-weight-hanging",
    LABEL: "CUSTOM_DND5E.menu.encumbrance.label",
    NAME: "CUSTOM_DND5E.menu.encumbrance.name"
  },
  SETTING: {
    ENABLE: {
      KEY: "enable-encumbrance"
    },
    CONFIG: {
      KEY: "encumbrance"
    }
  },
  TEMPLATE: {
    FORM: "modules/custom-dnd5e/templates/encumbrance-form.hbs"
  },
  UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.B48iqFBddUikMMer.JournalEntryPage.QK8bAMxx9x9IaTHl"
};
export const configKey = "encumbrance";

/* -------------------------------------------- */
/*  FORM CLASS                                  */
/* -------------------------------------------- */

/**
 * Encumbrance settings menu form.
 * @extends CustomDnd5eForm
 */
class EncumbranceForm extends CustomDnd5eForm {
  /**
   * Constructor for EncumbranceForm.
   * @param {...any} args
   */
  constructor(...args) {
    super(args);

    this.metric = game.settings.get("dnd5e", "metricWeightUnits") || false;
    this.config = configs.encumbrance;
    this.type = "encumbrance";
  }

  /* -------------------------------------------- */

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

  /* -------------------------------------------- */

  static PARTS = {
    form: {
      template: constants.TEMPLATE.FORM
    }
  };

  /* -------------------------------------------- */

  /**
   * Handle rendering the form and attaching event listeners.
   * @param {object} context
   * @param {object} options
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
   * @returns {Promise<object>} Context data
   */
  async _prepareContext() {
    this.setting = getSetting(this.settingKey) || foundry.utils.deepClone(CONFIG.DND5E.encumbrance);
    const context = foundry.utils.deepClone(this.setting);
    context.metric = this.metric;
    context.equippedItemWeightModifier =
      getSetting(constants.EQUIPPED_ITEM_WEIGHT_MODIFIER.SETTING.KEY);
    context.proficientEquippedItemWeightModifier =
      getSetting(constants.PROFICIENT_EQUIPPED_ITEM_WEIGHT_MODIFIER.SETTING.KEY);
    context.unequippedItemWeightModifier =
      getSetting(constants.UNEQUIPPED_ITEM_WEIGHT_MODIFIER.SETTING.KEY);
    context.speedReductionMode =
      getSetting(constants.SPEED_REDUCTION_MODE.SETTING.KEY);
    context.speedReductionMultiplierEncumbered =
      getSetting(constants.SPEED_REDUCTION_MULTIPLIER_ENCUMBERED.SETTING.KEY);
    context.speedReductionMultiplierHeavilyEncumbered =
      getSetting(constants.SPEED_REDUCTION_MULTIPLIER_HEAVILY_ENCUMBERED.SETTING.KEY);
    context.speedReductionMultiplierExceedingCarryingCapacity =
      getSetting(constants.SPEED_REDUCTION_MULTIPLIER_EXCEEDING_CARRYING_CAPACITY.SETTING.KEY);
    context.speedReductionMultiplierRounding =
      getSetting(constants.SPEED_REDUCTION_MULTIPLIER_ROUNDING.SETTING.KEY);

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
        resetSetting(constants.EQUIPPED_ITEM_WEIGHT_MODIFIER.SETTING.KEY),
        resetSetting(constants.PROFICIENT_EQUIPPED_ITEM_WEIGHT_MODIFIER.SETTING.KEY),
        resetSetting(constants.UNEQUIPPED_ITEM_WEIGHT_MODIFIER.SETTING.KEY),
        resetSetting(constants.SPEED_REDUCTION_MODE.SETTING.KEY),
        resetSetting(constants.SPEED_REDUCTION_MULTIPLIER_ENCUMBERED.SETTING.KEY),
        resetSetting(constants.SPEED_REDUCTION_MULTIPLIER_HEAVILY_ENCUMBERED.SETTING.KEY),
        resetSetting(constants.SPEED_REDUCTION_MULTIPLIER_EXCEEDING_CARRYING_CAPACITY.SETTING.KEY),
        resetSetting(constants.SPEED_REDUCTION_MULTIPLIER_ROUNDING.SETTING.KEY)
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
   * @param {Event} event
   * @param {HTMLFormElement} form
   * @param {object} formData
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
      setSetting(constants.EQUIPPED_ITEM_WEIGHT_MODIFIER.SETTING.KEY,
        formData.object.equippedItemWeightModifier),
      setSetting(constants.PROFICIENT_EQUIPPED_ITEM_WEIGHT_MODIFIER.SETTING.KEY,
        formData.object.proficientEquippedItemWeightModifier),
      setSetting(constants.UNEQUIPPED_ITEM_WEIGHT_MODIFIER.SETTING.KEY,
        formData.object.unequippedItemWeightModifier),
      setSetting(constants.SPEED_REDUCTION_MODE.SETTING.KEY,
        formData.object.speedReductionMode),
      setSetting(constants.SPEED_REDUCTION_MULTIPLIER_ENCUMBERED.SETTING.KEY,
        formData.object.speedReductionMultiplierEncumbered),
      setSetting(constants.SPEED_REDUCTION_MULTIPLIER_HEAVILY_ENCUMBERED.SETTING.KEY,
        formData.object.speedReductionMultiplierHeavilyEncumbered),
      setSetting(constants.SPEED_REDUCTION_MULTIPLIER_EXCEEDING_CARRYING_CAPACITY.SETTING.KEY,
        formData.object.speedReductionMultiplierExceedingCarryingCapacity),
      setSetting(constants.SPEED_REDUCTION_MULTIPLIER_ROUNDING.SETTING.KEY,
        formData.object.speedReductionMultiplierRounding)
    ]);

    this.setConfig(this.setting);

    foundry.applications.settings.SettingsConfig.reloadConfirm();
  }
}

/* -------------------------------------------- */
/*  REGISTRATION                                */
/* -------------------------------------------- */

/**
 * Register settings and load templates.
 */
export function register() {
  // Return if the Variant Encumbrance + Midi module is active
  if ( game.modules.get("variant-encumbrance-dnd5e")?.active ) {
    Logger.debug("Variant Encumbrance + Midi is active. Skipping registration.");
    return;
  }

  registerSettings();

  const templates = [constants.TEMPLATE.FORM];
  c5eLoadTemplates(templates);
}

/* -------------------------------------------- */

/**
 * Register settings.
 */
function registerSettings() {
  registerMenu(
    constants.MENU.KEY,
    {
      hint: game.i18n.localize(constants.MENU.HINT),
      label: game.i18n.localize(constants.MENU.LABEL),
      name: game.i18n.localize(constants.MENU.NAME),
      icon: constants.MENU.ICON,
      type: EncumbranceForm,
      restricted: true,
      scope: "world"
    }
  );

  registerSetting(
    constants.SETTING.ENABLE.KEY,
    {
      scope: "world",
      config: false,
      requiresReload: true,
      type: Boolean,
      default: false
    }
  );

  registerSetting(
    constants.SETTING.CONFIG.KEY,
    {
      scope: "world",
      config: false,
      type: Object,
      default: CONFIG.CUSTOM_DND5E.encumbrance
    }
  );

  registerSetting(
    constants.EQUIPPED_ITEM_WEIGHT_MODIFIER.SETTING.KEY,
    {
      scope: "world",
      config: false,
      type: Number,
      default: 1
    }
  );

  registerSetting(
    constants.PROFICIENT_EQUIPPED_ITEM_WEIGHT_MODIFIER.SETTING.KEY,
    {
      scope: "world",
      config: false,
      type: Number,
      default: 1
    }
  );

  registerSetting(
    constants.UNEQUIPPED_ITEM_WEIGHT_MODIFIER.SETTING.KEY,
    {
      scope: "world",
      config: false,
      type: Number,
      default: 1
    }
  );

  registerSetting(
    constants.SPEED_REDUCTION_MODE.SETTING.KEY,
    {
      scope: "world",
      config: false,
      requiresReload: true,
      type: String,
      default: "flat"
    }
  );

  registerSetting(
    constants.SPEED_REDUCTION_MULTIPLIER_ENCUMBERED.SETTING.KEY,
    {
      scope: "world",
      config: false,
      type: Number,
      default: 0.67
    }
  );

  registerSetting(
    constants.SPEED_REDUCTION_MULTIPLIER_HEAVILY_ENCUMBERED.SETTING.KEY,
    {
      scope: "world",
      config: false,
      type: Number,
      default: 0.33
    }
  );

  registerSetting(
    constants.SPEED_REDUCTION_MULTIPLIER_EXCEEDING_CARRYING_CAPACITY.SETTING.KEY,
    {
      scope: "world",
      config: false,
      type: Number,
      default: 0
    }
  );

  registerSetting(
    constants.SPEED_REDUCTION_MULTIPLIER_ROUNDING.SETTING.KEY,
    {
      scope: "world",
      config: false,
      type: Number,
      default: 5
    }
  );
}

/* -------------------------------------------- */
/*  CONFIG                                      */
/* -------------------------------------------- */

/**
 * Set CONFIG.DND5E.encumbrance.
 * @param {object} [settingData=null]
 */
export async function setConfig(settingData) {
  if ( !getSetting(constants.SETTING.ENABLE.KEY) ) return;
  settingData ??= getSetting(constants.SETTING.CONFIG.KEY);
  if ( checkEmpty(settingData) ) {
    if ( checkEmpty(CONFIG.DND5E[configKey]) ) {
      resetDnd5eConfig(configKey);
    }
    return;
  }

  const defaultConfig = foundry.utils.deepClone(CONFIG.CUSTOM_DND5E[configKey]);
  const config = foundry.utils.mergeObject(defaultConfig, settingData);

  if ( config?.effects?.encumbered?.name ) {
    config.effects.encumbered.name = game.i18n.localize(config.effects.encumbered.name);
  }

  if ( config?.effects?.exceedingCarryingCapacity?.name ) {
    config.effects.exceedingCarryingCapacity.name = game.i18n.localize(config.effects.exceedingCarryingCapacity.name);
  }

  if ( config?.effects?.heavilyEncumbered?.name ) {
    config.effects.heavilyEncumbered.name = game.i18n.localize(config.effects.heavilyEncumbered.name);
  }

  if ( config ) {
    CONFIG.DND5E[configKey] = config;
  }
}
