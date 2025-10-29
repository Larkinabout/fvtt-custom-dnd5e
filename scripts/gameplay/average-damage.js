import { CONSTANTS } from "../constants.js";
import { calculateAttackBonus, calculateHitProbability, getAdvantageMode, getSetting, registerSetting } from "../utils.js";

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
  Hooks.on("renderAttackSheet", addAverageDamageField);
  Hooks.on("renderDamageSheet", addAverageDamageField);
  Hooks.on("dnd5e.preRollDamageV2", checkAverageDamageRoll);
  Hooks.on("customDnd5e.rollAverageDamage", rollAverageDamage);
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
 * Adds the average damage field to the attack sheet UI.
 * @param {object} sheet The attack sheet instance.
 * @param {HTMLElement} html The HTML element of the sheet.
 */
async function addAverageDamageField(sheet, html) {
  const enable = getSetting(constants.SETTING.ENABLE.KEY);
  if ( sheet.activity.actor.type !== enable && enable !== "both" ) return;
  if ( sheet.activity.type !== "attack" ) return;

  const activity = sheet.activity;
  const item = activity.item;
  const useAverageDamage = item.getFlag("custom-dnd5e", `useAverageDamage.${sheet.activity.id}`) ?? false;
  const context = { useAverageDamage };

  const template = await foundry.applications.handlebars.renderTemplate(
    constants.TEMPLATE.AVERAGE_DAMAGE,
    context
  );
  const baseDamageFormGroup = html.querySelector("[name='damage.includeBase']").closest(".form-group");
  baseDamageFormGroup.insertAdjacentHTML("beforebegin", template);

  const useAverageDamageCheckbox = html.querySelector("#custom-dnd5e-use-average-damage");
  useAverageDamageCheckbox.addEventListener("change", handleCheckboxToggle.bind(useAverageDamageCheckbox, sheet));
}

/* -------------------------------------------- */

/**
 * Handle the toggle of the Use Average Damage checkbox.
 * @param {object} sheet The attack sheet
 */
function handleCheckboxToggle(sheet) {
  const activity = sheet.activity;
  const item = activity.item;
  item.setFlag("custom-dnd5e", `useAverageDamage.${activity.id}`, this.checked);
}

/* -------------------------------------------- */

/**
 * Checks if a average damage roll should be performed.
 * @param {object} activity The activity being used.
 * @param {object} usageConfig Configuration info for the activation.
 * @param {object} dialogConfig Configuration info for the usage dialog.
 * @param {object} messageConfig Configuration info for the created chat message.
 * @returns {boolean|undefined} Returns true to allow the default roll, false to prevent it.
 */
function checkAverageDamageRoll(activity, usageConfig, dialogConfig, messageConfig) {
  const enable = getSetting(constants.SETTING.ENABLE.KEY);
  if ( activity.actor.type !== enable && enable !== "both" ) return true;
  if ( !activity.item.getFlag("custom-dnd5e", `useAverageDamage.${activity.id}`) ) return true;
  if ( game.user.targets.size !== 1 ) return true;
  if ( canvas.tokens.controlled.length >= 4 && getSetting(CONSTANTS.MOB_DAMAGE.SETTING.ENABLE.KEY) ) return true;

  Hooks.callAll("customDnd5e.rollAverageDamage", activity, usageConfig, dialogConfig, messageConfig);
  return false;
}

/* -------------------------------------------- */

/**
 * Roll average damage.
 * @param {object} activity Activity being used.
 * @param {object} usageConfig Configuration info for the activation.
 * @param {object} dialogConfig Configuration info for the usage dialog.
 * @param {object} messageConfig Configuration info for the created chat message.
 */
async function rollAverageDamage(activity, usageConfig, dialogConfig, messageConfig) {
  let useAverageDamage = getSetting(constants.SETTING.USE_AVERAGE_DAMAGE.KEY);
  useAverageDamage = (activity.actor.type === useAverageDamage || useAverageDamage === "both");

  // Additional chat message configuration
  const rollMode = game.settings.get("core", "rollMode");
  const speaker = ChatMessage.getSpeaker({ actor: activity.actor });

  // Prepare damage rolls
  const damageConfig = foundry.utils.deepClone(activity.getDamageConfig());
  for ( const roll of damageConfig.rolls ) {
    const formula = dnd5e.dice.simplifyRollFormula(
      Roll.defaultImplementation.replaceFormulaData(roll.parts.join(" + "), roll.data)
    );

    const minRoll = Roll.create(formula).evaluate({ minimize: true });
    const maxRoll = Roll.create(formula).evaluate({ maximize: true });
    roll.parts = [Math.round(Math.floor(((await minRoll).total + (await maxRoll).total) / 2))];
  }
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
