import { CONSTANTS } from "../constants.js";
import { getSetting, registerSetting } from "../utils.js";

const constants = CONSTANTS.AVERAGE_DAMAGE;

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
  Hooks.on("dnd5e.preRollDamageV2", checkAverageDamageRoll);
  Hooks.on("customDnd5e.rollAverageDamage", rollAverageDamage);
}

/* -------------------------------------------- */

/**
 * Register settings.
 */
function registerSettings() {
  registerSetting(
    constants.SETTING.USE.KEY,
    {
      scope: "world",
      config: false,
      type: String,
      default: "neither"
    }
  );
}


/* -------------------------------------------- */

/**
 * Checks if an average damage roll should be performed.
 * @param {object} config Configuration information for the roll.
 * @param {object} usageConfig Configuration info for the activation.
 * @param {object} dialogConfig Configuration info for the usage dialog.
 * @param {object} messageConfig Configuration info for the created chat message.
 * @returns {boolean|undefined} Returns true to allow the default roll, false to prevent it.
 */
function checkAverageDamageRoll(config, usageConfig, dialogConfig, messageConfig) {
  const activity = config.subject;
  const useAverageDamage = getSetting(constants.SETTING.USE.KEY);
  if ( activity.actor?.type !== useAverageDamage && useAverageDamage !== "both" ) return true;
  if ( canvas.tokens.controlled.length >= 4 && getSetting(CONSTANTS.MOB_DAMAGE.SETTING.ENABLE.KEY) ) return true;

  Hooks.callAll("customDnd5e.rollAverageDamage", config, usageConfig, dialogConfig, messageConfig);
  return false;
}

/* -------------------------------------------- */

/**
 * Roll average damage.
 * @param {object} config Configuration information for the roll.
 * @param {object} usageConfig Configuration info for the activation.
 * @param {object} dialogConfig Configuration info for the usage dialog.
 * @param {object} messageConfig Configuration info for the created chat message.
 */
async function rollAverageDamage(config, usageConfig, dialogConfig, messageConfig) {
  const activity = config.subject;
  const isCritical = config.isCritical;

  // Damage config
  const damageConfig = foundry.utils.deepClone(activity.getDamageConfig());
  damageConfig.isCritical = isCritical;
  damageConfig.critical ??= {};
  damageConfig.critical.multiplyNumeric ??= game.settings.get("dnd5e", "criticalDamageModifiers");
  damageConfig.critical.powerfulCritical ??= game.settings.get("dnd5e", "criticalDamageMaxDice");

  // Message config
  const rollMode = game.settings.get("core", "rollMode");
  const speaker = ChatMessage.getSpeaker({ actor: activity.actor });
  const newMessageConfig = {
    create: true,
    data: {
      flavor: `${activity.item.name} - ${activity.damageFlavor}`,
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

  // Roll damage using average values
  const rolls = buildRolls(damageConfig);
  for ( const roll of rolls ) {
    const formula = dnd5e.dice.simplifyRollFormula(
      Roll.defaultImplementation.replaceFormulaData(roll.formula, roll)
    );

    const minRoll = Roll.create(formula).evaluate({ minimize: true });
    const maxRoll = Roll.create(formula).evaluate({ maximize: true });

    const result = Math.round(Math.floor(((await minRoll).total + (await maxRoll).total) / 2));
    const nt = new NumericTerm({ number: result});
    roll._formula = result.toString();
    roll.terms = [nt];
  }

  await CONFIG.Dice.DamageRoll.buildEvaluate(rolls, damageConfig );
  CONFIG.Dice.DamageRoll.buildPost(rolls, damageConfig, newMessageConfig);
}

/* -------------------------------------------- */

/**
 * Build a roll from the provided configuration objects.
 * @param {object} config Roll configuration data.
 * @returns {Array} Array of built roll objects.
 */
function buildRolls(config) {
  const advantageMode = CONFIG.Dice.DamageRoll;
  return config.rolls?.map((roll, index) => {
    roll.options.critical = config.critical;
    roll.options.isCritical = config.isCritical;
    return advantageMode.fromConfig(roll, config);
  }) ?? [];
}
