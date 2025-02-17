import { CONSTANTS } from "./constants.js";
import {
  Logger,
  getFlag,
  setFlag,
  unsetFlag,
  getSetting,
  registerSetting
} from "./utils.js";

const constants = CONSTANTS.EXHAUSTION;

/**
 * Register settings and hooks.
 */
export function register() {
  registerSettings();
  registerHooks();
}

/* -------------------------------------------- */

/**
 * Register settings.
 */
function registerSettings() {
  registerSetting(
    constants.SETTING.APPLY_EXHAUSTION_ON_ZERO_HP.KEY,
    {
      scope: "world",
      config: false,
      type: Boolean,
      default: false
    }
  );

  registerSetting(
    constants.SETTING.APPLY_EXHAUSTION_ON_COMBAT_END.KEY,
    {
      scope: "world",
      config: false,
      type: Boolean,
      default: false
    }
  );
}

/* -------------------------------------------- */

/**
 * Register hooks.
 */
function registerHooks() {
  Hooks.on("updateActor", handleUpdateActor);
  Hooks.on("deleteCombat", handleDeleteCombat);
}

/* -------------------------------------------- */

/**
 * Handle actor update triggers.
 * @param {object} actor The actor
 * @param {object} data  The data
 * @param {object} options The options
 * @param {string} userId The user ID
 */
async function handleUpdateActor(actor, data, options, userId) {
  if ( !actor.isOwner ) return;
  const hp = foundry.utils.getProperty(data, "system.attributes.hp.value");
  const previousHp = options.customDnd5e?.hp?.value;
  if ( getSetting(constants.SETTING.APPLY_EXHAUSTION_ON_ZERO_HP.KEY) && hp <= 0 && previousHp > 0 ) {
    await applyExhaustionZeroHp(actor);
  }

  if ( getSetting(constants.SETTING.APPLY_EXHAUSTION_ON_COMBAT_END.KEY) && hp <= 0 && previousHp > 0 ) {
    await setExhaustionZeroHpCombatEnd(actor);
  }
}

/* -------------------------------------------- */

/**
 * Handle end of combat triggers.
 * @param {object} combat The combat
 */
function handleDeleteCombat(combat) {
  combat.combatants.forEach(combatant => {
    const actor = combatant.actor;
    if ( getFlag(actor, "exhaustionZeroHpCombatEnd") ) {
      applyExhaustionZeroHp(actor);
      unsetFlag(actor, "exhaustionZeroHpCombatEnd");
    }
  });
}

/* -------------------------------------------- */

/**
 * Apply exhaustion when actor's HP reaches zero.
 * @param {object} actor The actor
 */
async function applyExhaustionZeroHp(actor) {
  const currentExhaustion = actor?.system?.attributes?.exhaustion;
  const newExhaustion = currentExhaustion + 1;
  const maxExhaustion = CONFIG?.DND5E?.conditionTypes?.exhaustion?.levels;
  if ( newExhaustion > maxExhaustion ) return;
  actor.update({ "system.attributes.exhaustion": newExhaustion });
  createExhaustionMessage(actor, newExhaustion, maxExhaustion);
}

/* -------------------------------------------- */

/**
 * Set a flag to apply exhaustion at the end of combat when actor's HP reaches zero.
 * @param {object} actor The actor
 */
async function setExhaustionZeroHpCombatEnd(actor) {
  await setFlag(actor, "exhaustionZeroHpCombatEnd", true);
}

/* -------------------------------------------- */

/**
 * Create a chat message indicating the actor's new exhaustion level.
 * @param {object} actor The actor
 * @param {number} newExhaustion The new exhaustion level
 * @param {number} maxExhaustion The maximum exhaustion level
 */
function createExhaustionMessage(actor, newExhaustion, maxExhaustion) {
  const message = (newExhaustion === maxExhaustion) ? "CUSTOM_DND5E.message.exhaustionDied" : "CUSTOM_DND5E.message.exhaustion";
  ChatMessage.create({
    content: game.i18n.format(message, { name: actor.name })
  });
}
