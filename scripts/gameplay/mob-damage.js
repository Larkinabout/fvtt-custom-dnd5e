import { CONSTANTS } from "../constants.js";
import { calculateAttackBonus, calculateHitProbability, getAdvantageMode, getSetting, registerSetting } from "../utils.js";

const constants = CONSTANTS.MOB_DAMAGE;

/* -------------------------------------------- */

/**
 * Register setting and hooks.
 */
export function register() {
  registerSettings();
  registerHooks();
}

/* -------------------------------------------- */

/**
 * Register hooks.
 */
function registerHooks() {
  Hooks.on("dnd5e.preUseActivity", checkMobRoll);
  Hooks.on("customDnd5e.rollMobDamage", rollMobDamage);
}

/* -------------------------------------------- */

/**
 * Register settings.
 */
function registerSettings() {
  registerSetting(
    constants.SETTING.ENABLE.KEY,
    {
      scope: "world",
      config: false,
      type: Boolean,
      default: false
    }
  );

  registerSetting(
    constants.SETTING.USE_AVERAGE_DAMAGE.KEY,
    {
      scope: "world",
      config: false,
      type: Boolean,
      default: true
    }
  );
}

/* -------------------------------------------- */

/**
 * Checks if a mob roll should be performed.
 * @param {object} activity The activity being used.
 * @param {object} usageConfig Configuration info for the activation.
 * @param {object} dialogConfig Configuration info for the usage dialog.
 * @param {object} messageConfig Configuration info for the created chat message.
 * @returns {boolean|undefined} Returns true to allow the default roll, false to prevent it.
 */
function checkMobRoll(activity, usageConfig, dialogConfig, messageConfig) {
  if ( !getSetting(constants.SETTING.ENABLE.KEY) ) return true;
  if ( activity.type !== "attack" ) return true;
  if ( game.user.targets.size !== 1 ) return true;

  const controlledTokens = canvas.tokens.controlled;
  if ( controlledTokens.length < 4 ) return true;

  const itemName = activity.item?.name;
  const labels = activity.item?.labels;

  let mobTokens = [];
  for (const token of controlledTokens) {
    const matchingItem = token.actor.items.find(
      item => item.name === itemName
      && item.labels?.activation === labels?.activation
      && item.labels?.damage === labels?.damage
      && item.labels?.damageTypes === labels?.damageTypes
      && item.labels?.toHit === labels?.toHit

    );
    if ( matchingItem ) {
      mobTokens.push(token);
    }
  }

  if ( mobTokens.length < 4 || mobTokens.length > 10 ) return true;

  Hooks.callAll("customDnd5e.rollMobDamage", mobTokens, activity, usageConfig, dialogConfig, messageConfig);
  return false;
}

/* -------------------------------------------- */

/**
 * Rolls mob damage.
 * @param {Array<Token>} mobTokens Tokens in the mob.
 * @param {object} activity Activity being used.
 * @param {object} usageConfig Configuration info for the activation.
 * @param {object} dialogConfig Configuration info for the usage dialog.
 * @param {object} messageConfig Configuration info for the created chat message.
 */
async function rollMobDamage(mobTokens, activity, usageConfig, dialogConfig, messageConfig) {
  const useAverageDamage = getSetting(constants.SETTING.USE_AVERAGE_DAMAGE.KEY);

  // Additional chat message configuration
  const rollMode = game.settings.get("core", "rollMode");
  const speaker = ChatMessage.getSpeaker({ actor: activity.actor });
  speaker.alias = `${activity.actor.name} ${game.i18n.localize("CUSTOM_DND5E.mob")}`;

  // Get number of successes
  const attackBonus = calculateAttackBonus(activity);
  const targetAc = messageConfig.data?.flags?.dnd5e?.targets[0]?.ac ?? 10;
  const advantageMode = getAdvantageMode(usageConfig.event);
  const outOf = mobTokens.length;
  const successes = calculateSuccesses(advantageMode, attackBonus, targetAc, outOf) ?? 0;

  if ( successes === 0 ) {
    const content = `The ${activity.actor.name} Mob missed its target.`;
    ChatMessage.create({ content, rollMode, speaker });
    return;
  }

  // Prepare damage rolls
  const damageConfig = foundry.utils.deepClone(activity.getDamageConfig());
  for ( const roll of damageConfig.rolls ) {
    const formula = dnd5e.dice.simplifyRollFormula(
      Roll.defaultImplementation.replaceFormulaData(roll.parts.join(" + "), roll.data)
    );

    if ( useAverageDamage ) {
      const minRoll = Roll.create(formula).evaluate({ minimize: true });
      const maxRoll = Roll.create(formula).evaluate({ maximize: true });
      roll.parts = [Math.floor(((await minRoll).total + (await maxRoll).total) / 2)];
    }
  }

  const damageRollsOriginal = foundry.utils.deepClone(damageConfig.rolls);
  for ( let i = 1; i < successes; i++ ) {
    damageConfig.rolls.push(...damageRollsOriginal);
  }


  const newMessageConfig = {
    create: true,
    data: {
      flavor: `${activity.item.name} - Mob ${activity.damageFlavor}`,
      flags: {
        dnd5e: {
          ...activity.messageFlags,
          messageType: "roll",
          roll: { type: "damage" }
        }
      },
      speaker
    },
    rollMode
  };

  // Evaluate and post the damage rolls to chat
  const rolls = buildRolls(damageConfig);
  await CONFIG.Dice.DamageRoll.buildEvaluate(rolls, damageConfig );
  CONFIG.Dice.DamageRoll.buildPost(rolls, damageConfig, newMessageConfig);
}

/* -------------------------------------------- */

/**
 * Calculates the number of successful hits.
 * @param {string} advantageMode The advantage mode ("normal", "advantage", or "disadvantage").
 * @param {number} bonus The bonus to the roll.
 * @param {number} targetNumber The target number to roll including the bonus.
 * @param {number} outOf The number of attackers in the mob.
 * @returns {number|null} The number of successful hits.
 */
function calculateSuccesses(advantageMode, bonus, targetNumber, outOf) {
  const probability = calculateHitProbability(advantageMode, bonus, targetNumber) ?? 0;
  const expectedSuccesses = probability * outOf;
  return Number(expectedSuccesses.toFixed(0));
}

/* -------------------------------------------- */

/**
 * Build a roll from the provided configuration objects.
 * @param {object} config Roll configuration data.
 * @returns {Array} Array of built roll objects.
 */
function buildRolls(config) {
  const advantageMode = CONFIG.Dice.DamageRoll;
  return config.rolls?.map((roll, index) =>
    advantageMode.fromConfig(roll, config)
  ) ?? [];
}
