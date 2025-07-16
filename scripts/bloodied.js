import { CONSTANTS } from "./constants.js";
import {
  Logger,
  c5eLoadTemplates,
  checkEmpty,
  getSetting,
  registerMenu,
  registerSetting,
  resetDnd5eConfig,
  setSetting,
  makeBloodied,
  unmakeBloodied } from "./utils.js";
import { BloodiedForm } from "./forms/bloodied-form.js";

const constants = CONSTANTS.BLOODIED;
const configKey = "bloodied";

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
    CONSTANTS.BLOODIED.SETTING.APPLY_BLOODIED.KEY,
    {
      scope: "world",
      config: false,
      type: Boolean,
      default: false,
      requiresReload: true
    }
  );

  registerSetting(
    CONSTANTS.BLOODIED.SETTING.BLOODIED_STATUS.KEY,
    {
      scope: "world",
      config: false,
      type: String,
      default: "player"
    }
  );

  registerSetting(
    CONSTANTS.BLOODIED.SETTING.BLOODIED_TINT.KEY,
    {
      scope: "world",
      config: false,
      type: String,
      default: "#ff0000"
    }
  );

  registerSetting(
    CONSTANTS.BLOODIED.SETTING.REMOVE_BLOODIED_ON_DEAD.KEY,
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

/**
 * Set CONFIG.DND5E.encumbrance.
 * @param {object} [settingData=null] The setting data
 */
export async function setConfig(settingData = null) {
  if ( !getSetting(constants.SETTING.ENABLE.KEY) ) return;
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

/**
 * Override the Bloodied setting in the system and update related settings.
 * @param {boolean} applyBloodied Whether to apply the Bloodied override.
 * @param {string} bloodiedStatus The status to set for Bloodied if not applying the override.
 */
export function overrideBloodied(applyBloodied, bloodiedStatus) {
  if ( applyBloodied ) {
    game.settings.set("dnd5e", "bloodied", "none");
  } else {
    game.settings.set("dnd5e", "bloodied", bloodiedStatus);
  }
  setSetting(CONSTANTS.BLOODIED.SETTING.APPLY_BLOODIED.KEY, applyBloodied);
  setSetting(CONSTANTS.BLOODIED.SETTING.BLOODIED_STATUS.KEY, bloodiedStatus);
}

/* -------------------------------------------- */

/**
 * If the system version is 3.3.1 or newer, set the core Bloodied setting to 'none'.
 * Add the Bloodied condition to CONFIG.DND5E.conditionTypes.
 * Add the Bloodied status effect to CONFIG.statusEffects.
 */
export function registerBloodied() {
  if ( !getSetting(CONSTANTS.BLOODIED.SETTING.APPLY_BLOODIED.KEY)
    || !getSetting(CONSTANTS.BLOODIED.SETTING.BLOODIED_STATUS.KEY) === "none" ) return;

  Logger.debug("Registering Bloodied...");

  if ( foundry.utils.isNewerVersion(game.system.version, "3.3.1") ) {
    const coreBloodied = game.settings.get("dnd5e", "bloodied");
    if ( coreBloodied !== "none" ) {
      game.settings.set("dnd5e", "bloodied", "none");
    }
  }

  const bloodied = buildBloodied();

  // Add bloodied to CONFIG.statusEffects
  CONFIG.statusEffects.push(bloodied.statusEffect);

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
 *
 * @returns {object} The Bloodied data
 */
export function buildBloodied() {
  const bloodied = getSetting(CONSTANTS.BLOODIED.SETTING.CONFIG.KEY);
  const name = game.i18n.localize(
    bloodied?.name
    ?? CONFIG.DND5E.bloodied.name
    ?? "CUSTOM_DND5E.bloodied");
  const img = bloodied.img ?? CONSTANTS.BLOODIED.ICON;

  return {
    conditionType: {
      img,
      name,
      reference: CONSTANTS.BLOODIED.CONDITION_UUID
    },
    statusEffect: {
      _id: "dnd5ebloodied000",
      id: "bloodied",
      img,
      name,
      reference: CONSTANTS.BLOODIED.CONDITION_UUID
    }
  };
}

/* -------------------------------------------- */

/**
 * Triggered by the 'dnd5e.preApplyDamage' hook.
 * If 'Apply Bloodied' is enabled, apply or remove the Bloodied condition and other token effects
 * based on the HP change.
 * If the actor is dead and 'Remove Bloodied on Dead' is enabled, remove the Bloodied condition.
 * @param {object} actor The actor
 * @param {object} updates The updates
 * @param {boolean} dead Whether or not the actor is dead
 * @returns {boolean} Whether the Bloodied condition was updated
 */
export function updateBloodied(actor, updates, dead) {
  if ( !getSetting(CONSTANTS.BLOODIED.SETTING.APPLY_BLOODIED.KEY) ) return false;
  const bloodiedStatus = getSetting(CONSTANTS.BLOODIED.SETTING.BLOODIED_STATUS.KEY);
  if ( (bloodiedStatus === "player" && actor.type !== "character") || bloodiedStatus === "none" ) return false;

  Logger.debug("Updating Bloodied...");

  const currentHp = foundry.utils.getProperty(updates, "system.attributes.hp.value") ?? actor?.system?.attributes?.hp?.value;
  const maxHp = foundry.utils.getProperty(updates, "updates.system.attributes.hp.effectiveMax")
    ?? actor?.system?.attributes?.hp?.effectiveMax
    ?? foundry.utils.getProperty(updates, "updates.system.attributes.hp.max")
    ?? actor?.system?.attributes?.hp?.max;

  if ( typeof currentHp === "undefined" ) return null;

  const halfHp = Math.ceil(maxHp * 0.5);

  if ( currentHp <= halfHp
        && !actor.effects.has("dnd5ebloodied000")
        && !(dead && getSetting(CONSTANTS.BLOODIED.SETTING.REMOVE_BLOODIED_ON_DEAD.KEY)) ) {
    makeBloodied(actor);
    Logger.debug("Bloodied updated", { bloodied: true });
    return true;
  } else if ( (currentHp > halfHp && actor.effects.has("dnd5ebloodied000"))
        || (dead && getSetting(CONSTANTS.BLOODIED.SETTING.REMOVE_BLOODIED_ON_DEAD.KEY)) ) {
    unmakeBloodied(actor);
    Logger.debug("Bloodied updated", { bloodied: false });
    return false;
  }

  Logger.debug("Bloodied not updated");
  return false;
}
