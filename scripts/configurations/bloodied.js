import {
  Logger,
  c5eLoadTemplates,
  checkEmpty,
  getSetting,
  registerMenu,
  registerSetting,
  resetDnd5eConfig,
  resetSetting,
  setSetting,
  makeBloodied,
  unmakeBloodied } from "../utils.js";
import { MODULE } from "../constants.js";
import { CustomDnd5eForm } from "../forms/custom-dnd5e-form.js";
import { configs } from "./registry.js";

/* -------------------------------------------- */
/*  CONSTANTS                                   */
/* -------------------------------------------- */

export const constants = {
  ID: "bloodied",
  MENU: {
    KEY: "bloodied-menu",
    HINT: "CUSTOM_DND5E.menu.bloodied.hint",
    ICON: "fas fa-droplet",
    LABEL: "CUSTOM_DND5E.menu.bloodied.label",
    NAME: "CUSTOM_DND5E.menu.bloodied.name"
  },
  SETTING: {
    APPLY_BLOODIED: {
      KEY: "apply-bloodied"
    },
    BLOODIED_ICON: {
      KEY: "bloodied-icon"
    },
    BLOODIED_STATUS: {
      KEY: "bloodied-status"
    },
    BLOODIED_TINT: {
      KEY: "bloodied-tint"
    },
    CONFIG: {
      KEY: "bloodied"
    },
    ENABLE: {
      KEY: "enable-bloodied"
    },
    REMOVE_BLOODIED_ON_DEAD: {
      KEY: "remove-bloodied-on-dead"
    }
  },
  TEMPLATE: {
    FORM: "modules/custom-dnd5e/templates/bloodied-form.hbs"
  },
  ICON: "modules/custom-dnd5e/media/icons/bloodied.svg",
  CONDITION_UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.ngr8w6WBycK59brj.JournalEntryPage.sV0ZCKxwh4n4ZU1P",
  UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.B48iqFBddUikMMer.JournalEntryPage.GjOBdXwapcYvUihc"
};
export const configKey = "bloodied";

/* -------------------------------------------- */
/*  FORM CLASS                                  */
/* -------------------------------------------- */

/**
 * Bloodied settings menu form.
 * @extends CustomDnd5eForm
 */
class BloodiedForm extends CustomDnd5eForm {
  /**
   * Constructor for BloodiedForm.
   * @param {...any} args
   */
  constructor(...args) {
    super(args);

    this.config = configs.bloodied;
    this.type = "bloodied";
  }

  /* -------------------------------------------- */

  static DEFAULT_OPTIONS = {
    actions: {
      reset: BloodiedForm.reset
    },
    form: {
      handler: BloodiedForm.submit
    },
    id: `${MODULE.ID}-bloodied-form`,
    window: {
      title: `CUSTOM_DND5E.form.${constants.ID}.title`
    }
  };

  static PARTS = {
    form: {
      template: constants.TEMPLATE.FORM
    }
  };

  /* -------------------------------------------- */

  /**
   * Prepare the context for rendering the form.
   * @returns {Promise<object>} Context data
   */
  async _prepareContext() {
    this.setting = getSetting(this.settingKey) || foundry.utils.deepClone(CONFIG.DND5E.bloodied);
    const context = foundry.utils.deepClone(this.setting);
    context.applyBloodied = getSetting(constants.SETTING.APPLY_BLOODIED.KEY);
    context.bloodiedStatus = getSetting(constants.SETTING.BLOODIED_STATUS.KEY) || "player";
    context.bloodiedTint = getSetting(constants.SETTING.BLOODIED_TINT.KEY);
    context.removeBloodiedOnDead = getSetting(constants.SETTING.REMOVE_BLOODIED_ON_DEAD.KEY);
    context.reference = this.setting.reference || constants.CONDITION_UUID;
    context.selects = this.#getSelects();

    if ( this.enableConfigKey ) {
      context.enableConfig = getSetting(this.enableConfigKey);
    }

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Get the select options for the form.
   * @returns {object} Select options
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
        resetSetting(constants.SETTING.APPLY_BLOODIED.KEY),
        resetSetting(constants.SETTING.BLOODIED_STATUS.KEY),
        resetSetting(constants.SETTING.BLOODIED_TINT.KEY),
        resetSetting(constants.SETTING.REMOVE_BLOODIED_ON_DEAD.KEY)
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
      setSetting(constants.SETTING.BLOODIED_TINT.KEY, formData.object.bloodiedTint),
      setSetting(constants.SETTING.REMOVE_BLOODIED_ON_DEAD.KEY, formData.object.removeBloodiedOnDead)
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
      type: BloodiedForm,
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
      default: CONFIG.CUSTOM_DND5E.bloodied
    }
  );

  registerSetting(
    constants.SETTING.APPLY_BLOODIED.KEY,
    {
      scope: "world",
      config: false,
      type: Boolean,
      default: false,
      requiresReload: true
    }
  );

  registerSetting(
    constants.SETTING.BLOODIED_STATUS.KEY,
    {
      scope: "world",
      config: false,
      type: String,
      default: "player"
    }
  );

  registerSetting(
    constants.SETTING.BLOODIED_TINT.KEY,
    {
      scope: "world",
      config: false,
      type: String,
      default: "#ff0000"
    }
  );

  registerSetting(
    constants.SETTING.REMOVE_BLOODIED_ON_DEAD.KEY,
    {
      scope: "world",
      config: false,
      type: Boolean,
      default: false,
      requiresReload: true
    }
  );
}

/* -------------------------------------------- */
/*  CONFIG                                      */
/* -------------------------------------------- */

/**
 * Set CONFIG.DND5E.bloodied.
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

  if ( config ) {
    CONFIG.DND5E[configKey] = config;
  }
}

/* -------------------------------------------- */
/*  BLOODIED LIFECYCLE                          */
/* -------------------------------------------- */

/**
 * Override the Bloodied setting in the system and update related settings.
 * @param {boolean} applyBloodied Whether to apply the Bloodied override.
 * @param {string} bloodiedStatus Status to set for Bloodied if not applying the override.
 */
export function overrideBloodied(applyBloodied, bloodiedStatus) {
  if ( applyBloodied ) {
    game.settings.set("dnd5e", "bloodied", "none");
  } else {
    game.settings.set("dnd5e", "bloodied", bloodiedStatus);
  }
  setSetting(constants.SETTING.APPLY_BLOODIED.KEY, applyBloodied);
  setSetting(constants.SETTING.BLOODIED_STATUS.KEY, bloodiedStatus);
}

/* -------------------------------------------- */

/**
 * If the system version is 3.3.1 or newer, set the core Bloodied setting to 'none'.
 * Add the Bloodied condition to CONFIG.DND5E.conditionTypes.
 * Add the Bloodied status effect to CONFIG.statusEffects.
 */
export function addBloodiedCondition() {
  if ( !getSetting(constants.SETTING.APPLY_BLOODIED.KEY)
    || getSetting(constants.SETTING.BLOODIED_STATUS.KEY) === "none" ) return;

  Logger.debug("Registering Bloodied...");

  if ( foundry.utils.isNewerVersion(game.system.version, "3.3.1") ) {
    const coreBloodied = game.settings.get("dnd5e", "bloodied");
    if ( coreBloodied !== "none" ) {
      game.settings.set("dnd5e", "bloodied", "none");
    }
  }

  const bloodied = buildBloodied();

  if ( !CONFIG.statusEffects.some(e => e.id === "bloodied") ) {
    CONFIG.statusEffects.push(bloodied.statusEffect);
  }

  const conditionTypes = {};

  Object.entries(CONFIG.DND5E.conditionTypes).forEach(([key, value]) => {
    const conditionName = game.i18n.localize(value.name);
    if ( conditionName > bloodied.conditionType.name
        && !conditionTypes.bloodied
        && !CONFIG.DND5E.conditionTypes.bloodied ) {
      conditionTypes.bloodied = bloodied.conditionType;
    }
    conditionTypes[key] = (key === "bloodied") ? bloodied.conditionType : value;
  });

  CONFIG.DND5E.conditionTypes = conditionTypes;

  Logger.debug("Bloodied registered");
}

/* -------------------------------------------- */

/**
 * Build Bloodied data.
 * @returns {object} Bloodied data
 */
export function buildBloodied() {
  const bloodied = getSetting(constants.SETTING.CONFIG.KEY);
  const name = game.i18n.localize(
    bloodied?.name
    ?? CONFIG.DND5E.bloodied.name
    ?? "CUSTOM_DND5E.bloodied");
  const img = bloodied.img ?? constants.ICON;
  const reference = bloodied?.reference || constants.CONDITION_UUID;

  return {
    conditionType: {
      img,
      name,
      reference
    },
    statusEffect: {
      _id: "dnd5ebloodied000",
      id: "bloodied",
      img,
      name,
      reference
    }
  };
}

/* -------------------------------------------- */

/**
 * Triggered by the 'dnd5e.preApplyDamage' hook.
 * If 'Apply Bloodied' is enabled, apply or remove the Bloodied condition and other token effects
 * based on the HP change.
 * If the actor is dead and 'Remove Bloodied on Dead' is enabled, remove the Bloodied condition.
 * @param {object} actor
 * @param {object} updates
 * @param {boolean} dead Whether or not the actor is dead
 * @returns {boolean} Whether the Bloodied condition was updated
 */
export function updateBloodied(actor, updates, dead) {
  if ( !getSetting(constants.SETTING.APPLY_BLOODIED.KEY) ) return false;
  const bloodiedStatus = getSetting(constants.SETTING.BLOODIED_STATUS.KEY);
  if ( (bloodiedStatus === "player" && actor.type !== "character") || bloodiedStatus === "none" ) return false;

  Logger.debug("Updating Bloodied...");

  const currentHp = foundry.utils.getProperty(updates, "system.attributes.hp.value") ?? actor?.system?.attributes?.hp?.value;
  const maxHp = foundry.utils.getProperty(updates, "updates.system.attributes.hp.effectiveMax")
    ?? actor?.system?.attributes?.hp?.effectiveMax
    ?? foundry.utils.getProperty(updates, "updates.system.attributes.hp.max")
    ?? actor?.system?.attributes?.hp?.max;

  if ( typeof currentHp === "undefined" ) return null;

  const halfHp = Math.ceil(maxHp * 0.5);

  if ( maxHp <= 1 ) {
    Logger.debug("Bloodied not updated. Max HP is 1 or less.");
    return false;
  } else if ( currentHp <= halfHp
        && !actor.effects.has("dnd5ebloodied000")
        && !(dead && getSetting(constants.SETTING.REMOVE_BLOODIED_ON_DEAD.KEY)) ) {
    makeBloodied(actor);
    Logger.debug("Bloodied updated", { bloodied: true });
    return true;
  } else if ( (currentHp > halfHp && actor.effects.has("dnd5ebloodied000"))
        || (dead && getSetting(constants.SETTING.REMOVE_BLOODIED_ON_DEAD.KEY)) ) {
    unmakeBloodied(actor);
    Logger.debug("Bloodied updated", { bloodied: false });
    return false;
  }

  Logger.debug("Bloodied not updated");
  return false;
}
