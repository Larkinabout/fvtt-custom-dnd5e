import { CONSTANTS } from "../constants.js";
import {
  animations,
  getFlag,
  setFlag,
  unsetFlag,
  getSetting,
  registerSetting,
  getActorOwnerIds
} from "../utils.js";

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

  registerSetting(
    constants.SETTING.EXHAUSTION_REQUEST_SAVING_THROW.KEY,
    {
      scope: "world",
      config: false,
      type: Boolean,
      default: false
    }
  );

  registerSetting(
    constants.SETTING.EXHAUSTION_SAVING_THROW_DC.KEY,
    {
      scope: "world",
      config: false,
      type: Number,
      default: 15
    }
  );

  registerSetting(
    constants.SETTING.EXHAUSTION_SAVING_THROW_DC_SCALING.KEY,
    {
      scope: "world",
      config: false,
      type: Boolean,
      default: false
    }
  );

  registerSetting(
    constants.SETTING.EXHAUSTION_ANIMATION.KEY,
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
  Hooks.on("dnd5e.rollSavingThrow", handleExhaustionSaveResult);
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
  if ( !actor.isOwner || actor.type !== "character" ) return;
  const hp = foundry.utils.getProperty(data, "system.attributes.hp.value");
  const previousHp = options.customDnd5e?.hp?.value;

  const applyOnZeroHp = getSetting(constants.SETTING.APPLY_EXHAUSTION_ON_ZERO_HP.KEY);
  if ( applyOnZeroHp && hp <= 0 && previousHp > 0 && game.user.id === userId ) {
    const requestSave = getSetting(constants.SETTING.EXHAUSTION_REQUEST_SAVING_THROW.KEY);
    if ( requestSave ) {
      await createExhaustionSaveCard(actor);
    } else {
      await applyExhaustionZeroHp(actor);
    }
  }

  const applyOnCombatEnd = getSetting(constants.SETTING.APPLY_EXHAUSTION_ON_COMBAT_END.KEY);
  if ( applyOnCombatEnd && hp <= 0 && previousHp > 0 && actor.inCombat ) {
    if ( game.user.id === userId ) {
      await setExhaustionZeroHpCombatEnd(actor);
    }
  }
}

/* -------------------------------------------- */

/**
 * Handle end of combat triggers.
 * @param {object} combat The combat
 * @param {object} options The options
 * @param {string} userId The user ID
 */
function handleDeleteCombat(combat, options, userId) {
  if ( game.user.id !== userId ) return;
  const requestSave = getSetting(constants.SETTING.EXHAUSTION_REQUEST_SAVING_THROW.KEY);
  combat.combatants.forEach(combatant => {
    const actor = combatant.actor;
    if ( !actor || actor.type !== "character" ) return;
    if ( getFlag(actor, "exhaustionZeroHpCombatEnd") ) {
      if ( requestSave ) {
        createExhaustionSaveCard(actor);
      } else {
        applyExhaustionZeroHp(actor);
      }
      unsetFlag(actor, "exhaustionZeroHpCombatEnd");
    }
  });
}

/* -------------------------------------------- */

/**
 * Play the exhaustion animation for the actor's owners.
 * @param {object} actor The actor
 */
function playExhaustionAnimation(actor) {
  if ( !getSetting(constants.SETTING.EXHAUSTION_ANIMATION.KEY) ) return;
  const userIds = getActorOwnerIds(actor);
  animations.vignetteScreen({ intensity: 0.8, duration: 2500, userIds });
  setTimeout(() => animations.blurScreen({ intensity: 5, duration: 1500, userIds }), 400);
  setTimeout(() => animations.swayScreen({ intensity: 1, duration: 2000, userIds }), 300);
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
  playExhaustionAnimation(actor);
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
 * Get the effective DC for the exhaustion saving throw.
 * If scaling is enabled, add the actor's current exhaustion level to the base DC.
 * @param {object} actor The actor
 * @returns {number} The effective DC
 */
function getExhaustionDc(actor) {
  const baseDc = getSetting(constants.SETTING.EXHAUSTION_SAVING_THROW_DC.KEY) || 15;
  const scaling = getSetting(constants.SETTING.EXHAUSTION_SAVING_THROW_DC_SCALING.KEY);
  if ( scaling ) {
    const currentExhaustion = actor?.system?.attributes?.exhaustion || 0;
    return baseDc + currentExhaustion;
  }
  return baseDc;
}

/* -------------------------------------------- */

/**
 * Create a chat message with a button to make a CON save against the exhaustion DC.
 * Sets a pending flag on the actor so the result can be handled when the save is rolled.
 * @param {object} actor The actor
 * @returns {Promise<ChatMessage>} The created chat message
 */
async function createExhaustionSaveCard(actor) {
  await actor.setFlag("custom-dnd5e", "pendingExhaustionSave", true);

  const dc = getExhaustionDc(actor);
  const dataset = { ability: "con", dc: String(dc), type: "save" };
  let label = game.i18n.format("EDITOR.DND5E.Inline.DC", {
    dc,
    check: game.i18n.localize(CONFIG.DND5E.abilities.con.label)
  });
  label = game.i18n.format("EDITOR.DND5E.Inline.SaveLong", { save: label });
  const content = await foundry.applications.handlebars.renderTemplate(
    CONSTANTS.MESSAGE.TEMPLATE.ROLL_REQUEST_CARD,
    {
      buttonLabel: `<i class="fas fa-shield-heart"></i>${label}`,
      hiddenLabel: `<i class="fas fa-shield-heart"></i>${label}`,
      description: game.i18n.format("CUSTOM_DND5E.message.exhaustionSave", { name: actor.name }),
      dataset: { ...dataset, action: "rollRequest" }
    }
  );
  const speaker = ChatMessage.getSpeaker({ user: game.user });
  const flags = { "custom-dnd5e": { source: "exhaustion" } };
  return await ChatMessage.create({ content, speaker, flags });
}

/* -------------------------------------------- */

/**
 * Triggered by the 'dnd5e.rollSavingThrow' hook.
 * If the actor has the 'pendingExhaustionSave' flag and fails a CON save, apply exhaustion.
 * @param {D20Roll[]} rolls The resulting rolls
 * @param {object} data The hook data
 */
async function handleExhaustionSaveResult(rolls, data) {
  const actor = data.subject;
  if ( !actor?.getFlag("custom-dnd5e", "pendingExhaustionSave") ) return;
  if ( data.ability !== "con" ) return;

  // Trace back from the save card to the originating request card
  const requestCard = rolls[0]?.parent?.getOriginatingMessage()
    ?? game.messages.get(rolls[0]?.options?.originatingMessage);

  if ( requestCard?.flags?.["custom-dnd5e"]?.source !== "exhaustion" ) return;

  // Clear the flag regardless of result
  await actor.unsetFlag("custom-dnd5e", "pendingExhaustionSave");

  const dc = getExhaustionDc(actor);
  const total = rolls[0]?.total;
  if ( total === undefined || total >= dc ) return;

  // Save failed — apply exhaustion
  await applyExhaustionZeroHp(actor);
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
