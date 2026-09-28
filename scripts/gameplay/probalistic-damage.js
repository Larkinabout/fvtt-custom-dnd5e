import { CONSTANTS, MODULE } from "../constants.js";
import {
  calculateAttackBonus,
  calculateHitProbability,
  getAdvantageMode,
  getSetting,
  isKeybindingHeld,
  registerSetting
} from "../utils.js";

const constants = CONSTANTS.PROBABILISTIC_DAMAGE;

/**
 * Activity types that can use probabilistic damage.
 * @type {string[]}
 */
const ACTIVITY_TYPES = ["attack", "save"];

/**
 * Share of the damage dealt when the target succeeds on its saving throw.
 * @type {Record<string, number>}
 */
export const ON_SAVE_MULTIPLIER = { full: 1, half: 0.5, none: 0 };

/* -------------------------------------------- */

/**
 * Register setting, keybinding and hooks.
 */
export function register() {
  registerSettings();
  registerKeybindings();
  registerHooks();
}

/* -------------------------------------------- */

/**
 * Register keybindings.
 */
function registerKeybindings() {
  game.keybindings.register(MODULE.ID, constants.KEYBINDING.USE, {
    name: "CUSTOM_DND5E.keybinding.useProbabilisticDamage.name",
    hint: "CUSTOM_DND5E.keybinding.useProbabilisticDamage.hint",
    editable: [],
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL
  });
}

/* -------------------------------------------- */

/**
 * Whether the Use Probabilistic Damage key is held down.
 * @param {Event} [event]
 * @returns {boolean} Whether the key is held
 */
export function isUseKeyHeld(event) {
  return isKeybindingHeld(constants.KEYBINDING.USE, event);
}

/* -------------------------------------------- */

/**
 * Whether average damage should be used instead of rolling.
 * @param {Actor} actor
 * @returns {boolean} Whether to use average damage
 */
export function useAverageDamageFor(actor) {
  const useAverageDamage = getSetting(constants.SETTING.USE_AVERAGE_DAMAGE.KEY);
  return (actor?.type === useAverageDamage || useAverageDamage === "both");
}

/* -------------------------------------------- */

/**
 * Work out what share of an activity's damage a target is expected to take.
 * @param {Activity} activity Attack or save activity
 * @param {Actor} [target]
 * @param {Event} [event]
 * @returns {{factor: number, result: object|null}} Share of the damage, the chance, AC or DC
 *   and ability used
 */
export function getProbabilisticFactor(activity, target, event) {
  if ( activity.type === "attack" ) {
    const bonus = calculateAttackBonus(activity);
    const ac = target?.system.attributes?.ac?.value ?? 10;
    const factor = calculateHitProbability(getAdvantageMode(event), Number.isFinite(bonus) ? bonus : 0, ac);
    return { factor, result: { type: "hitChance", chance: Math.round(factor * 100), ac } };
  }

  if ( activity.type === "save" ) {
    const dc = activity.save.dc.value ?? 10;
    const { ability, bonus } = getBestSave(activity, target);
    const saveChance = calculateHitProbability("normal", bonus, dc);
    const onSave = ON_SAVE_MULTIPLIER[activity.damage.onSave] ?? 0.5;
    return {
      factor: (1 - saveChance) + (saveChance * onSave),
      result: { type: "saveChance", chance: Math.round(saveChance * 100), dc, ability }
    };
  }

  return { factor: 1, result: null };
}

/* -------------------------------------------- */

/**
 * Get the saving throw the target is best at out of those the activity allows.
 * @param {Activity} activity
 * @param {Actor} [target]
 * @returns {{ability: string, bonus: number}} Ability key and saving throw bonus
 */
export function getBestSave(activity, target) {
  const abilities = activity.save.ability.size ? Array.from(activity.save.ability) : ["dex"];
  return abilities
    .map(ability => ({ ability, bonus: target?.system.abilities?.[ability]?.save?.value ?? 0 }))
    .reduce((best, save) => (save.bonus > best.bonus ? save : best));
}

/* -------------------------------------------- */

/**
 * Register hooks.
 */
function registerHooks() {
  Hooks.on("renderActivitySheet", addProbabilisticDamageField);
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
 * Add the Use Probabilistic Damage checkbox to the top of the Damage section of attack and save activity sheets.
 * @param {ActivitySheet} sheet
 * @param {HTMLElement} html
 */
async function addProbabilisticDamageField(sheet, html) {
  const activity = sheet.activity;
  if ( !ACTIVITY_TYPES.includes(activity?.type) ) return;
  const enable = getSetting(constants.SETTING.ENABLE.KEY);
  if ( activity.actor?.type !== enable && enable !== "both" ) return;

  if ( html.querySelector("#custom-dnd5e-use-probabilistic-damage") ) return;
  const legend = html.querySelector("[data-action='addDamagePart']")?.closest("fieldset")?.querySelector("legend");
  if ( !legend ) return;

  const useProbabilisticDamage = activity.item.getFlag("custom-dnd5e", `useProbabilisticDamage.${activity.id}`) ?? false;
  const template = await foundry.applications.handlebars.renderTemplate(
    constants.TEMPLATE.PROBABILISTIC_DAMAGE,
    { useProbabilisticDamage }
  );
  legend.insertAdjacentHTML("afterend", template);

  const checkbox = html.querySelector("#custom-dnd5e-use-probabilistic-damage");
  checkbox.addEventListener("change", handleCheckboxToggle.bind(checkbox, sheet));
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
  if ( !ACTIVITY_TYPES.includes(activity.type) ) return true;

  usageConfig.customDnd5eUseProbabilisticDamage ??= isUseKeyHeld();

  const enable = getSetting(constants.SETTING.ENABLE.KEY);
  const isEnabled = (activity.actor.type === enable || enable === "both")
    && !!activity.item.getFlag("custom-dnd5e", `useProbabilisticDamage.${activity.id}`);
  if ( !isEnabled && !usageConfig.customDnd5eUseProbabilisticDamage ) return true;
  if ( game.user.targets.size !== 1 ) return true;

  // Mob Damage handles attacks from groups of four or more
  const isMob = (activity.type === "attack") && (canvas.tokens.controlled.length >= 4)
    && getSetting(CONSTANTS.MOB_DAMAGE.SETTING.ENABLE.KEY);
  if ( isMob ) return true;

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
  const useAverageDamage = useAverageDamageFor(activity.actor);

  // Additional chat message configuration
  const messageMode = CONFIG.Dice.BasicRoll.getMessageMode();
  const speaker = ChatMessage.getSpeaker({ actor: activity.actor });

  const targets = messageConfig.data?.system?.targets ?? [];
  const target = dnd5e.dataModels.chatMessage.fields.TargetsField.resolve(targets[0] ?? {}).actor
    ?? game.user.targets.first()?.actor;
  const { factor } = getProbabilisticFactor(activity, target, usageConfig.event);

  if ( factor <= 0 ) {
    const content = activity.type === "save"
      ? game.i18n.format("CUSTOM_DND5E.probabilisticDamageNoDamage", {
        name: target?.name ?? "", item: activity.item.name
      })
      : game.i18n.format("CUSTOM_DND5E.probabilisticDamageMissed", { name: activity.actor.name });
    const messageData = { content, speaker };
    ChatMessage.applyMode(messageData, messageMode);
    ChatMessage.create(messageData);
    return;
  }

  const { rolls, damageConfig } = await evaluateProbabilisticDamage(activity, factor, { useAverageDamage });

  const newMessageConfig = {
    create: true,
    data: {
      flavor: `${activity.item.name} - ${activity.damageFlavor}`,
      speaker,
      system: { ...activity.messageSources, targets },
      type: "damage"
    },
    rollMode: messageMode
  };

  CONFIG.Dice.DamageRoll.buildPost(rolls, damageConfig, newMessageConfig);
}

/* -------------------------------------------- */

/**
 * Evaluate an activity's damage rolls with every part scaled by factor.
 * @param {Activity} activity
 * @param {number} factor Number between 0 and 1
 * @param {object} [options]
 * @param {boolean} [options.useAverageDamage=false] Use average damage instead of rolling
 * @returns {Promise<{rolls: DamageRoll[], damageConfig: object}>} Evaluated rolls and the config used to build them
 */
export async function evaluateProbabilisticDamage(activity, factor, { useAverageDamage = false } = {}) {
  const damageConfig = foundry.utils.deepClone(activity.getDamageConfig());
  for ( const roll of damageConfig.rolls ) {
    const formula = roll.parts.join(" + ");

    if ( useAverageDamage ) {
      const simplified = dnd5e.dice.simplifyRollFormula(
        Roll.defaultImplementation.replaceFormulaData(formula, roll.data)
      );
      const minRoll = await Roll.create(simplified).evaluate({ minimize: true });
      const maxRoll = await Roll.create(simplified).evaluate({ maximize: true });
      roll.parts = [Math.round(Math.floor((minRoll.total + maxRoll.total) / 2) * factor)];
    } else {
      roll.parts = [`round((${formula}) * ${factor})`];
    }
  }

  const rolls = buildRolls(damageConfig);
  await CONFIG.Dice.DamageRoll.buildEvaluate(rolls, damageConfig);
  return { rolls, damageConfig };
}

/* -------------------------------------------- */

/**
 * Build damage rolls from a damage roll configuration.
 * @param {object} config
 * @returns {DamageRoll[]} Unevaluated damage rolls
 */
function buildRolls(config) {
  return config.rolls?.map(roll => CONFIG.Dice.DamageRoll.fromConfig(roll, config)) ?? [];
}
