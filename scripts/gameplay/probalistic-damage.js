import { CONSTANTS } from "../constants.js";
import { calculateAttackBonus, calculateHitProbability, getAdvantageMode, getSetting, registerSetting } from "../utils.js";

const constants = CONSTANTS.PROBABILISTIC_DAMAGE;

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
  Hooks.on("renderAttackSheet", addProbabilisticDamageField);
  Hooks.on("dnd5e.preUseActivity", checkProbalisticDamageRoll);
  Hooks.on("customDnd5e.rollProbalisticDamage", rollProbalisticDamage);
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
      type: String,
      default: "neither"
    }
  );

  registerSetting(
    constants.SETTING.USE_AVERAGE_DAMAGE.KEY,
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
 * Adds the probabilistic damage field to the attack sheet UI.
 * @param {object} sheet The attack sheet instance.
 * @param {HTMLElement} html The HTML element of the sheet.
 */
async function addProbabilisticDamageField(sheet, html) {
  const enable = getSetting(constants.SETTING.ENABLE.KEY);
  if ( sheet.activity.actor.type !== enable && enable !== "both" ) return;
  if ( sheet.activity.type !== "attack" ) return;

  const activity = sheet.activity;
  const item = activity.item;
  const useProbabilisticDamage = item.getFlag("custom-dnd5e", `useProbabilisticDamage.${sheet.activity.id}`) ?? false;
  const context = { useProbabilisticDamage };

  const template = await renderTemplate(
    constants.TEMPLATE.PROBABILISTIC_DAMAGE,
    context
  );
  const baseDamageFormGroup = html.querySelector("[name='damage.includeBase']").closest(".form-group");
  baseDamageFormGroup.insertAdjacentHTML("beforebegin", template);

  const useProbabilisticDamageCheckbox = html.querySelector("#custom-dnd5e-use-probabilistic-damage");
  useProbabilisticDamageCheckbox.addEventListener("change", handleCheckboxToggle.bind(useProbabilisticDamageCheckbox, sheet));
}

/* -------------------------------------------- */

/**
 * Handle the toggle of the Use Probabilistic Damage checkbox.
 * @param {object} sheet The attack sheet
 */
function handleCheckboxToggle(sheet) {
  const activity = sheet.activity;
  const item = activity.item;
  item.setFlag("custom-dnd5e", `useProbabilisticDamage.${activity.id}`, this.checked);
}

/* -------------------------------------------- */

/**
 * Checks if a probabilistic damage roll should be performed.
 * @param {object} activity The activity being used.
 * @param {object} usageConfig Configuration info for the activation.
 * @param {object} dialogConfig Configuration info for the usage dialog.
 * @param {object} messageConfig Configuration info for the created chat message.
 * @returns {boolean|undefined} Returns true to allow the default roll, false to prevent it.
 */
function checkProbalisticDamageRoll(activity, usageConfig, dialogConfig, messageConfig) {
  const enable = getSetting(constants.SETTING.ENABLE.KEY);
  if ( activity.actor.type !== enable && enable !== "both" ) return true;
  if ( !activity.item.getFlag("custom-dnd5e", `useProbabilisticDamage.${activity.id}`) ) return true;
  if ( activity.type !== "attack" ) return true;
  if ( game.user.targets.size !== 1 ) return true;
  if ( canvas.tokens.controlled.length >= 4 && getSetting(CONSTANTS.MOB_DAMAGE.SETTING.ENABLE.KEY) ) return true;

  Hooks.callAll("customDnd5e.rollProbalisticDamage", activity, usageConfig, dialogConfig, messageConfig);
  return false;
}

/* -------------------------------------------- */

/**
 * Roll probabilistic damage.
 * @param {object} activity Activity being used.
 * @param {object} usageConfig Configuration info for the activation.
 * @param {object} dialogConfig Configuration info for the usage dialog.
 * @param {object} messageConfig Configuration info for the created chat message.
 */
async function rollProbalisticDamage(activity, usageConfig, dialogConfig, messageConfig) {
  let useAverageDamage = getSetting(constants.SETTING.USE_AVERAGE_DAMAGE.KEY);
  useAverageDamage = (activity.actor.type === useAverageDamage || useAverageDamage === "both");

  // Additional chat message configuration
  const rollMode = game.settings.get("core", "rollMode");
  const speaker = ChatMessage.getSpeaker({ actor: activity.actor });

  // Get hit probability
  const attackBonus = calculateAttackBonus(activity);
  const targetNumber = messageConfig.data?.flags?.dnd5e?.targets[0]?.ac ?? 10;
  const advantageMode = getAdvantageMode(usageConfig.event);
  const probability = calculateHitProbability(advantageMode, attackBonus, targetNumber) ?? 0;

  if ( probability === 0 ) {
    const content = `${activity.actor.name} missed its target.`;
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
      roll.parts = [Math.round(Math.floor(((await minRoll).total + (await maxRoll).total) / 2) * probability)];
    } else {
      roll.parts = [`round((${roll.parts[0]}) * ${probability})`];
    }
  }

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

  // Evaluate and post the damage rolls to chat
  const rolls = buildRolls(damageConfig);
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
  return config.rolls?.map((roll, index) =>
    advantageMode.fromConfig(roll, config)
  ) ?? [];
}
