import { CONSTANTS, SHEET_TYPE } from "./constants.js";
import { updateBloodied } from "./bloodied.js";
import {
  c5eLoadTemplates,
  Logger,
  getDefaultSetting,
  getSetting,
  registerMenu,
  registerSetting,
  makeDead,
  unmakeDead,
  makeUnconscious,
  unmakeUnconscious
} from "./utils.js";
import { HouseRulesForm } from "./forms/house-rules-form.js";

const constants = CONSTANTS.HOUSE_RULES;

/**
 * Register settings and hooks, and load templates.
 */
export function register() {
  registerSettings();
  registerHooks();

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
      type: HouseRulesForm,
      restricted: true,
      scope: "world"
    }
  );

  registerSetting(
    CONSTANTS.LEVEL_UP.HIT_POINTS.REROLL.MINIMUM_VALUE.SETTING.KEY,
    {
      scope: "world",
      config: false,
      type: Number,
      default: 1
    }
  );

  registerSetting(
    CONSTANTS.LEVEL_UP.HIT_POINTS.REROLL.ONCE.SETTING.KEY,
    {
      scope: "world",
      config: false,
      type: Boolean,
      default: false
    }
  );

  registerSetting(
    CONSTANTS.LEVEL_UP.HIT_POINTS.SHOW_TAKE_AVERAGE.SETTING.KEY,
    {
      scope: "world",
      config: false,
      type: Boolean,
      default: true
    }
  );

  registerSetting(
    CONSTANTS.HIT_POINTS.SETTING.ROLL_NPC_HP.KEY,
    {
      scope: "world",
      config: false,
      type: Boolean,
      default: false
    }
  );

  registerSetting(
    CONSTANTS.INITIATIVE.SETTING.REROLL_INITIATIVE_EACH_ROUND.KEY,
    {
      scope: "world",
      config: false,
      type: Boolean,
      default: false
    }
  );

  registerSetting(
    CONSTANTS.UNCONSCIOUS.SETTING.APPLY_UNCONSCIOUS.KEY,
    {
      scope: "world",
      config: false,
      type: Boolean,
      default: false
    }
  );

  registerSetting(
    CONSTANTS.DEAD.SETTING.APPLY_DEAD.KEY,
    {
      scope: "world",
      config: false,
      type: Boolean,
      default: false
    }
  );

  registerSetting(
    CONSTANTS.DEAD.SETTING.APPLY_INSTANT_DEATH.KEY,
    {
      scope: "world",
      config: false,
      type: Boolean,
      default: false
    }
  );

  registerSetting(
    CONSTANTS.DEAD.SETTING.DEAD_ROTATION.KEY,
    {
      scope: "world",
      config: false,
      type: Number
    }
  );

  registerSetting(
    CONSTANTS.DEAD.SETTING.DEAD_TINT.KEY,
    {
      scope: "world",
      config: false,
      type: String
    }
  );

  registerSetting(
    CONSTANTS.DEATH_SAVES.SETTING.DEATH_SAVES_ROLL_MODE.KEY,
    {
      scope: "world",
      config: false,
      type: String,
      default: "publicroll"
    }
  );

  registerSetting(
    CONSTANTS.DEATH_SAVES.SETTING.REMOVE_DEATH_SAVES.KEY,
    {
      scope: "world",
      config: false,
      type: Object,
      default: {
        regainHp: { success: 3, failure: 3 },
        shortRest: { success: 0, failure: 0 },
        longRest: { success: 0, failure: 0 }
      }
    }
  );

  registerSetting(
    CONSTANTS.DEATH_SAVES.SETTING.DEATH_SAVES_TARGET_VALUE.KEY,
    {
      scope: "world",
      config: false,
      type: Number,
      default: 10
    }
  );

  registerSetting(
    CONSTANTS.HIT_POINTS.SETTING.APPLY_MASSIVE_DAMAGE.KEY,
    {
      scope: "world",
      config: false,
      type: Boolean,
      default: false
    }
  );

  registerSetting(
    CONSTANTS.HIT_POINTS.SETTING.APPLY_NEGATIVE_HP.KEY,
    {
      scope: "world",
      config: false,
      type: Boolean,
      default: false
    }
  );

  registerSetting(
    CONSTANTS.HIT_POINTS.SETTING.NEGATIVE_HP_HEAL_FROM_ZERO.KEY,
    {
      scope: "world",
      config: false,
      type: Boolean,
      default: false
    }
  );

  registerSetting(
    CONSTANTS.INSPIRATION.SETTING.AWARD_INSPIRATION_DICE_VALUE.KEY,
    {
      scope: "world",
      config: false,
      type: Number
    }
  );

  registerSetting(
    CONSTANTS.INSPIRATION.SETTING.AWARD_INSPIRATION_ROLL_TYPES.KEY,
    {
      scope: "world",
      config: false,
      type: Object,
      default: {}
    }
  );

  registerSetting(
    CONSTANTS.PRONE.SETTING.PRONE_ROTATION.KEY,
    {
      scope: "world",
      config: false,
      type: Number
    }
  );

  registerSetting(
    CONSTANTS.RESTING.SETTING.USE_CAMP_SUPPLIES.KEY,
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
  Hooks.on("dnd5e.preRollClassHitPoints", setHitDiceRollFormula);
  Hooks.on("renderHitPointsFlow", modifyHitPointsFlowDialog);
  Hooks.on("combatRound", rerollInitiative);
  Hooks.on("createToken", rollNpcHp);
  Hooks.on("dnd5e.preApplyDamage", (actor, amount, updates, options) => {
    recalculateDamage(actor, amount, updates, options);
    const instantDeath = applyInstantDeath(actor, updates);
    updateHp(actor, updates);
    if ( !instantDeath ) {
      const dead = updateDead(actor, updates);
      updateBloodied(actor, updates, dead);
      if ( !dead ) {
        applyMassiveDamage(actor, updates);
        updateUnconscious(actor, updates);
      }
    }
  });
  Hooks.on("dnd5e.preRestCompleted", (actor, data) => updateDeathSaves("rest", actor, data));
  Hooks.on("dnd5e.preRollDeathSave", setDeathSavesRollMode);
  Hooks.on("dnd5e.rollAbilityCheck", (actor, roll, ability) => { awardInspiration("rollAbilityCheck", actor, roll); });
  Hooks.on("dnd5e.rollAbilitySave", (actor, roll, ability) => { awardInspiration("rollAbilitySave", actor, roll); });
  Hooks.on("dnd5e.rollAbilityTest", (actor, roll, ability) => { awardInspiration("rollAbilityTest", actor, roll); });
  Hooks.on("dnd5e.rollAttack", (item, roll, ability) => {
    awardInspiration("rollAttack", item, roll);
    // applyHighLowGround(item, roll, ability);
  });
  Hooks.on("dnd5e.rollSkill", (actor, roll, ability) => { awardInspiration("rollSkill", actor, roll); });
  Hooks.on("preUpdateActor", (actor, data, options, userId) => {
    capturePreviousData(actor, data, options, userId);
    updateDeathSaves("regainHp", actor, data, options);
  });
  Hooks.on("renderActorSheet", makeDeathSavesBlind);
  Hooks.on("renderActorSheet", updateHpMeter);
}

/* -------------------------------------------- */

/**
 * Triggered by the 'dnd5e.preRollClassHitPoints' hook.
 * If the minimum value for rerolling hit points is greater than 1, set the hit dice roll formula.
 * If the option to reroll hit points once is enabled, set the hit dice roll formula to reroll once.
 * @param {object} actor The actor
 * @param {object} item The item
 * @param {object} rollData The roll data
 * @param {object} messageData The message data
 */
export function setHitDiceRollFormula(actor, item, rollData, messageData) {
  const hitDieValue = item.system.advancement.find(adv => adv.type === "HitPoints" && adv.hitDieValue)?.hitDieValue || 1;
  const minimumValue = Math.min(
    getSetting(CONSTANTS.LEVEL_UP.HIT_POINTS.REROLL.MINIMUM_VALUE.SETTING.KEY)
      || 1, hitDieValue
  );
  if ( !minimumValue || minimumValue === 1 ) return;
  const reroll = (getSetting(CONSTANTS.LEVEL_UP.HIT_POINTS.REROLL.ONCE.SETTING.KEY)) ? "r" : "rr";
  const value = minimumValue - 1;
  const hd = item?.system?.hitDice || item?.system?.hd?.denomination;
  if ( !hd ) return;
  rollData.formula = `1${hd}${reroll}${value}`;
}

/* -------------------------------------------- */

/**
 * Add a note to the dialog if the minimum value for rerolling hit points is greater than 1.
 * Add a note to the dialog if the option to take average hit points is disabled.
 * @param {object} app The app
 * @param {object} html The HTML
 * @param {object} data The data
 */
export function modifyHitPointsFlowDialog(app, html, data) {
  const minimumValue = getSetting(CONSTANTS.LEVEL_UP.HIT_POINTS.REROLL.MINIMUM_VALUE.SETTING.KEY);
  if ( minimumValue > 1 ) {
    const rerollOnce = getSetting(CONSTANTS.LEVEL_UP.HIT_POINTS.REROLL.ONCE.SETTING.KEY);
    const note = (rerollOnce) ? "CUSTOM_DND5E.dialog.levelUpHitPointsRerollOnce.note" : "CUSTOM_DND5E.dialog.levelUpHitPointsRerollForever.note";
    const h3 = html.querySelector("form h3");
    const p = document.createElement("p");
    p.classList.add("custom-dnd5e-advice", "notes", "hp-note");
    p.textContent = game.i18n.format(note, { minimumValue });
    h3.after(p);
  }

  if ( !getSetting(CONSTANTS.LEVEL_UP.HIT_POINTS.SHOW_TAKE_AVERAGE.SETTING.KEY) ) {
    const averageLabel = html.querySelector(".averageLabel") ?? html.querySelector(".average-label");

    if ( averageLabel ) {
      averageLabel.innerHTML = "";
    }
  }
}

/* -------------------------------------------- */

/**
 * If 'Apply Negative HP' is enabled, set the min HP value in the schema to undefined.
 * This will allow HP to go below 0.
 */
export function registerNegativeHp() {
  if ( !getSetting(CONSTANTS.DEAD.SETTING.APPLY_INSTANT_DEATH.KEY)
        && !getSetting(CONSTANTS.HIT_POINTS.SETTING.APPLY_NEGATIVE_HP.KEY) ) return;

  Logger.debug("Registering Negative HP...");

  dnd5e.dataModels.actor.CharacterData.schema.fields.attributes.fields.hp.fields.value.min = undefined;

  Logger.debug("Negative HP registered");
}

/* -------------------------------------------- */

/**
 * Reroll Initiative.
 * Triggered by the 'combatRound' hook.
 * If 'Reroll Initiative Each Round' is enabled, reset and reroll initiative each round.
 * @param {object} combat The combat
 * @param {object} data The data
 * @param {object} options The options
 */
export async function rerollInitiative(combat, data, options) {
  if ( !getSetting(CONSTANTS.INITIATIVE.SETTING.REROLL_INITIATIVE_EACH_ROUND.KEY) || data.turn !== 0 ) return;

  await combat.resetAll();
  await combat.rollAll();
  combat.update({ turn: 0 });
}


/**
 * Applies high ground or low ground modifiers to a given roll.
 * @param {object} item The item being used in the roll.
 * @param {object} roll The roll object to which the modifiers will be applied.
 * @param {string} ability The ability score being used for the roll.
 */
export function applyHighLowGround(item, roll, ability) {

}

/* -------------------------------------------- */

/**
 * Triggered by the 'dnd5e.rollAbilityCheck', 'dnd5e.rollAbilitySave', 'dnd5e.rollAbilityTest', 'dnd5e.rollAttack',
 * and 'dnd5e.rollSkill' hooks.
 * If the roll matches the 'Award Inspiration D20 Value', award inspiration to the actor.
 * If the actor already has inspiration, do not award it again.
 * @param {string} rollType The roll type: rollAbilityCheck, rollAbilitySave, rollAbilityTest, rollAttack, rollSkill
 * @param {object} roll The roll
 * @param {object} data The data
 */
export function awardInspiration(rollType, roll, data) {
  Logger.debug("Triggering Award Inspiration...");

  const actor = (rollType === "rollAttack") ? data.subject.actor : data.subject;

  if ( actor.type === "npc" || !getSetting(CONSTANTS.INSPIRATION.SETTING.AWARD_INSPIRATION_ROLL_TYPES.KEY)?.[rollType] ) return;

  const awardInspirationDieTotal = getSetting(CONSTANTS.INSPIRATION.SETTING.AWARD_INSPIRATION_DICE_VALUE.KEY);
  const diceTotal = roll[0].terms[0].total;

  if ( awardInspirationDieTotal === diceTotal ) {
    Logger.debug("Awarding Inspiration...", { awardInspirationDieTotal, diceTotal });

    let message = "CUSTOM_DND5E.message.awardInspiration";

    if ( actor.system.attributes.inspiration ) {
      message = "CUSTOM_DND5E.message.awardInspirationAlready";
    } else {
      actor.update({ "system.attributes.inspiration": true });
    }

    ChatMessage.create({
      content: game.i18n.format(message, { name: actor.name, value: awardInspirationDieTotal })
    });

    Logger.debug("Inspiration awarded");
  }
}

/* -------------------------------------------- */

/**
 * Triggered by the 'renderActorSheet' hook.
 * If the 'Death Saves Roll Mode' is set to 'blindroll', remove the success and failure pips from the death saves tray.
 * This will prevent players from seeing the results of their death saves.
 * @param {object} app The app
 * @param {object} html The HTML
 * @param {object} data The data
 */
function makeDeathSavesBlind(app, html, data) {
  if ( getSetting(CONSTANTS.DEATH_SAVES.SETTING.DEATH_SAVES_ROLL_MODE.KEY) !== "blindroll" || game.user.isGM ) return;

  Logger.debug("Making death saves blind...");

  const sheetType = SHEET_TYPE[app.constructor.name];

  if ( !sheetType ) return;

  if ( sheetType.character ) {
    if ( sheetType.legacy ) {
      html.querySelector(".death-saves .counter-value")?.remove();
    } else {
      const pips = html.querySelectorAll(".death-saves .pips");

      if ( pips ) {
        pips.forEach(p => p.remove());
      }
    }
  }

  Logger.debug("Made death saves blind");
}

/* -------------------------------------------- */

/**
 * Triggered by 'dnd5e.preRollDeathSave' hook.
 * If the 'Death Saves Roll Mode' is set, set the roll mode and target value for the death saves roll.
 * @param {object} config The config
 * @param {object} dialog The dialog
 * @param {object} message The message
 */
function setDeathSavesRollMode(config, dialog, message) {
  Logger.debug("Setting death saves roll mode...");

  const rollMode = getSetting(CONSTANTS.DEATH_SAVES.SETTING.DEATH_SAVES_ROLL_MODE.KEY);
  const targetValue = getSetting(CONSTANTS.DEATH_SAVES.SETTING.DEATH_SAVES_TARGET_VALUE.KEY);

  if ( rollMode ) message.rollMode = rollMode;
  if ( targetValue ) config.target = targetValue;

  Logger.debug("Death saves roll mode set");
}

/* -------------------------------------------- */

/**
 * Triggered by the 'dnd5e.preApplyDamage' hook.
 * If 'Apply Negative HP' or 'Apply Instant Death' is enabled, recalculate damage to apply a negative value to HP.
 * If 'Heal from 0 HP' is enabled, recalculate healing to increase HP from zero instead of the negative value.
 * @param {object} actor The actor
 * @param {number} amount The damage amount
 * @param {object} updates The properties to update
 * @param {object} options The options
 */
function recalculateDamage(actor, amount, updates, options) {
  if ( !getSetting(CONSTANTS.HIT_POINTS.SETTING.APPLY_NEGATIVE_HP.KEY)
        && !getSetting(CONSTANTS.DEAD.SETTING.APPLY_INSTANT_DEATH.KEY) ) return;

  Logger.debug("Recalculating damage...");

  const isDelta = options.isDelta ?? false;
  const hpMax = actor?.system?.attributes?.hp?.effectiveMax ?? actor?.system?.attributes?.hp?.max ?? 0;
  const hpTemp = actor?.system?.attributes?.hp?.temp ?? 0;
  const hpValue = actor?.system?.attributes?.hp?.value ?? 0;
  const healFromZero = getSetting(CONSTANTS.HIT_POINTS.SETTING.NEGATIVE_HP_HEAL_FROM_ZERO.KEY);
  const startHp = (healFromZero && amount < 0 && hpValue < 0) ? 0 : hpValue;

  let newHpValue = updates["system.attributes.hp.value"];

  if ( amount > 0 ) {
    newHpValue = hpValue - Math.max(amount - hpTemp, 0);
  } else {
    let healing = Math.abs(amount);
    if ( hpValue < 0 && healFromZero && !isDelta ) {
      healing = healing - Math.abs(hpValue);
    }
    newHpValue = Math.min(startHp + healing, hpMax);
  }

  updates["system.attributes.hp.value"] = newHpValue;

  Logger.debug("Damage recalculated");
}

/* -------------------------------------------- */

/**
 * Triggered by the 'preCreateToken' hook.
 * If 'Roll NPC HP' is enabled, roll NPC HP when a token is created.
 * @param {object} token The token
 * @param {object} data The data
 * @param {string} userId The user ID
 */
async function rollNpcHp(token, data, userId) {
  if ( game.user.id !== userId ) return;

  const actor = token?.actor;

  if ( actor?.type !== "npc" ) return;
  if ( !getSetting(CONSTANTS.HIT_POINTS.SETTING.ROLL_NPC_HP.KEY) ) return;

  Logger.debug("Rolling NPC HP...", token);

  const formula = actor.system.attributes.hp.formula;

  if ( !formula ) return;

  const r = Roll.create(formula);
  await r.evaluate();

  if ( !r.total ) return;

  actor.update({ "system.attributes.hp": { value: r.total, max: r.total } }, { isRest: true });

  Logger.debug("NPC HP rolled", { token, hp: r.total });
}

/* -------------------------------------------- */

/**
 * Triggered by the 'dnd5e.preApplyDamage' hook.
 * If 'Apply Dead' is enabled, apply or remove the Dead condition and other token effects based on the HP change.
 * @param {object} actor The actor
 * @param {object} updates The updates
 * @returns {boolean} Whether the Dead condition was updated
 */
function updateDead(actor, updates) {
  if ( actor.type !== "npc" ) return false;
  if ( !getSetting(CONSTANTS.DEAD.SETTING.APPLY_DEAD.KEY) ) return false;

  Logger.debug("Updating Dead...");

  const currentHp = foundry.utils.getProperty(updates, "system.attributes.hp.value");
  const maxHp = actor?.system?.attributes?.hp?.effectiveMax ?? actor?.system?.attributes?.hp?.max ?? 0;

  if ( typeof currentHp === "undefined" ) return null;

  if ( maxHp === 0 ) {
    Logger.debug("Dead not updated. Max HP is 0.");
    return false;
  } else if ( currentHp <= 0 ) {
    makeDead(actor, updates);
    Logger.debug("Dead updated", { dead: true });
    return true;
  } else {
    unmakeDead(actor, updates);
    Logger.debug("Dead updated", { dead: false });
    return false;
  }
}

/* -------------------------------------------- */

/**
 * Triggered by the 'dnd5e.preApplyDamage' hook.
 * If 'Apply Unconscious' is enabled, apply or remove the Unconscious condition based on the HP change.
 * @param {object} actor The actor
 * @param {object} updates The updates
 * @returns {boolean} Whether the Unconscious condition was updated
 */
function updateUnconscious(actor, updates) {
  if ( actor.type !== "character" ) return false;
  if ( !getSetting(CONSTANTS.UNCONSCIOUS.SETTING.APPLY_UNCONSCIOUS.KEY) ) return false;

  Logger.debug("Updating Unconscious...");

  const currentHp = foundry.utils.getProperty(updates, "system.attributes.hp.value");
  const maxHp = actor?.system?.attributes?.hp?.effectiveMax ?? actor?.system?.attributes?.hp?.max ?? 0;

  if ( typeof currentHp === "undefined" ) return null;

  if ( maxHp === 0 ) {
    Logger.debug("Unconscious not updated. Max HP is 0.");
    return false;
  } else if ( currentHp <= 0 ) {
    makeUnconscious(actor, updates);
    Logger.debug("Unconscious updated", { unconscious: true });
    return true;
  } else {
    unmakeUnconscious(actor, updates);
    Logger.debug("Unconscious updated", { unconscious: false });
    return false;
  }
}

/* -------------------------------------------- */

/**
 * Triggered by the 'updateActor' hook.
 * If 'Remove Death Saves' is enabled, update the death saves based on the source of the update.
 * @param {string} source The source of the update: regainHp or rest
 * @param {object} actor The actor
 * @param {object} data The data
 * @param {object} options The options
 */
function updateDeathSaves(source, actor, data, options) {
  if ( actor.type !== "character" ) return;

  const removeDeathSaves = getSetting(CONSTANTS.DEATH_SAVES.SETTING.REMOVE_DEATH_SAVES.KEY);
  const defaultRemoveDeathSaves = getDefaultSetting(CONSTANTS.DEATH_SAVES.SETTING.REMOVE_DEATH_SAVES.KEY);

  Logger.debug("Updating Death Saves...");

  const updateDeathSavesByType = type => {
    const currentValue = actor.system.attributes.death[type];

    if ( typeof currentValue === "undefined" ) return;

    if ( source === "regainHp" && !options.isRest && removeDeathSaves.regainHp[type] < 3 && foundry.utils.hasProperty(data, "system.attributes.hp.value") ) {
      const previousHp = options.customDnd5e.hp.value;
      const previousDeathValue = options.customDnd5e.death[type];
      const newDeathValue = (previousHp === 0)
        ? Math.max(previousDeathValue - removeDeathSaves.regainHp[type], 0)
        : previousDeathValue;
      foundry.utils.setProperty(data, `system.attributes.death.${type}`, newDeathValue);
    } else if ( source === "rest" ) {
      const restType = (data?.longRest) ? "longRest" : "shortRest";

      if ( removeDeathSaves[restType][type]
           && removeDeathSaves[restType][type] !== defaultRemoveDeathSaves[restType][type] ) {
        const currentDeathValue = actor.system.attributes.death[type];
        const newDeathValue = Math.max(currentDeathValue - removeDeathSaves[restType][type], 0);
        data.updateData[`system.attributes.death.${type}`] = newDeathValue;
      }
    }
  };

  updateDeathSavesByType("success");
  updateDeathSavesByType("failure");

  Logger.debug("Death Saves updated");
}

/* -------------------------------------------- */

/**
 * Triggered by the 'dnd5e.preApplyDamage' hook.
 * If 'Apply Negative HP' is disabled and HP is below 0, set HP to 0.
 * This will happen where 'Apply Instant Death' is enabled as negative HP is used to initially calculate
 * whether Instant Death applies.
 * @param {object} actor The actor
 * @param {object} updates The updates
 */
function updateHp(actor, updates) {
  if ( getSetting(CONSTANTS.HIT_POINTS.SETTING.APPLY_NEGATIVE_HP.KEY) ) return;

  Logger.debug("Updating HP...");

  const currentHp = foundry.utils.getProperty(updates, "system.attributes.hp.value");

  if ( typeof currentHp === "undefined" ) return;

  if ( currentHp < 0 ) {
    updates["system.attributes.hp.value"] = 0;
  }

  Logger.debug("HP updated");
}

/* -------------------------------------------- */

/**
 * Triggered by the 'renderActorSheet' hook.
 * If the current HP is negative, update the HP meter to show a red bar.
 * This will indicate that the character is below 0 HP.
 * @param {object} app The app
 * @param {object} html The HTML
 * @param {object} data The data
 */
function updateHpMeter(app, html, data) {
  const sheetType = SHEET_TYPE[app.constructor.name];

  if ( !sheetType || sheetType.legacy || !sheetType.character ) return;

  Logger.debug("Updating HP meter...");

  const actor = app.actor;
  const hpValue = actor.system.attributes.hp.value;
  const hpMax = actor?.system?.attributes?.hp?.effectiveMax ?? actor?.system?.attributes?.hp?.max ?? 0;

  if ( hpValue >= 0 ) return;

  const meter = html.querySelector(".meter.hit-points");
  meter.classList.add("negative");

  const progress = html.querySelector(".progress.hit-points");
  const pct = Math.abs(hpValue / hpMax) * 100;
  progress.style = `--bar-percentage: ${pct}%;`;

  Logger.debug("HP meter updated");
}

/* -------------------------------------------- */

/**
 * Triggered by the 'updateActor' hook and called by the 'recalculateDamage' function.
 * If HP is below 0 and the absolute value is greater than or equal to max HP, apply Instant Death
 * @param {object} actor The actor
 * @param {object} updates The updates
 * @returns {boolean} Whether instant death is applied
 */
function applyInstantDeath(actor, updates) {
  if ( actor.type !== "character" || !getSetting(CONSTANTS.DEAD.SETTING.APPLY_INSTANT_DEATH.KEY) ) return false;

  Logger.debug("Updating Instant Death...");

  const previousHp = actor?.system?.attributes?.hp?.value;
  const currentHp = foundry.utils.getProperty(updates, "system.attributes.hp.value");
  const maxHp = actor?.system?.attributes?.hp?.effectiveMax ?? actor?.system?.attributes?.hp?.max ?? 0;

  if ( previousHp < 0 && Math.abs(previousHp) >= maxHp ) return true;

  if ( currentHp < 0 && Math.abs(currentHp) >= maxHp ) {
    const tokenEffects = makeDead(actor, updates);
    ChatMessage.create({
      content: game.i18n.format("CUSTOM_DND5E.message.instantDeath", { name: actor.name })
    });

    updateBloodied(actor, updates, true);

    return tokenEffects;
  }

  Logger.debug("Instant Death updated...");

  return false;
}

/* -------------------------------------------- */

/**
 * Triggered by the 'updateActor' hook and called by the 'recalculateDamage' function.
 * If the difference between the previous HP and the current HP is greater than or equal to half the max HP,
 * create a massive damage card.
 * @param {object} actor The actor
 * @param {object} updates The updates
 * @returns {boolean} Whether massive damage is applied
 */
function applyMassiveDamage(actor, updates) {
  if ( actor.type !== "character"|| !getSetting(CONSTANTS.HIT_POINTS.SETTING.APPLY_MASSIVE_DAMAGE.KEY) ) return false;

  Logger.debug("Updating Massive Damage...");

  const previousHp = actor?.system?.attributes?.hp?.value;
  const currentHp = foundry.utils.getProperty(updates, "system.attributes.hp.value");

  if ( previousHp <= currentHp ) return;

  const diffHp = previousHp - currentHp;
  const maxHp = actor?.system?.attributes?.hp?.effectiveMax ?? actor?.system?.attributes?.hp?.max ?? 0;
  const halfMaxHp = Math.floor(maxHp / 2);

  if ( diffHp >= halfMaxHp ) {
    createMassiveDamageCard(actor, updates);
    Logger.debug("Massive Death updated", { massiveDamage: true });
    return true;
  }

  Logger.debug("Massive Death updated", { massiveDamage: false });
  return false;
}

/* -------------------------------------------- */

/**
 * Triggered by the 'preUpdateActor' hook.
 * Capture the previous HP and death save values for use in other functions.
 * @param {object} actor The actor
 * @param {object} data The data
 * @param {object} options The options
 * @param {string} userId The user ID
 */
function capturePreviousData(actor, data, options, userId) {
  if ( game.user.id !== userId || !actor.isOwner ) return;

  Logger.debug("Capturing previous data...");

  options.customDnd5e = {
    hp: {
      value: actor.system?.attributes?.hp?.value
    },
    death: {
      success: actor.system?.attributes?.death?.success,
      failure: actor.system?.attributes?.death?.failure
    }
  };

  Logger.debug("Previous data captured", { previousData: options.customDnd5e });
}

/* -------------------------------------------- */

/**
 * Triggered by the 'applyMassiveDamage' function.
 * Create a chat message with a button to make a CON save against a DC of 15.
 * @param {object} actor The actor
 * @param {object} data The data
 * @returns {Promise<void>} The created chat message
 */
async function createMassiveDamageCard(actor, data) {
  const dataset = { ability: "con", dc: "15", type: "save" };
  let label = game.i18n.format("EDITOR.DND5E.Inline.DC", { dc: 15, check: game.i18n.localize(CONFIG.DND5E.abilities.con.label) });
  label = game.i18n.format("EDITOR.DND5E.Inline.SaveLong", { save: label });
  const MessageClass = getDocumentClass("ChatMessage");
  const chatData = {
    user: game.user.id,
    style: CONST.CHAT_MESSAGE_STYLES.OTHER,
    content: await foundry.applications.handlebars.renderTemplate(CONSTANTS.MESSAGE.TEMPLATE.ROLL_REQUEST_CARD, {
      buttonLabel: `<i class="fas fa-shield-heart"></i>${label}`,
      hiddenLabel: `<i class="fas fa-shield-heart"></i>${label}`,
      description: game.i18n.format("CUSTOM_DND5E.message.massiveDamage", { name: actor.name }),
      dataset: { ...dataset, action: "rollRequest" }
    }),
    speaker: MessageClass.getSpeaker({ user: game.user })
  };
  return MessageClass.create(chatData);
}
