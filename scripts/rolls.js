import { CONSTANTS } from "./constants.js";
import { c5eLoadTemplates, getDieParts, getSetting, registerMenu, registerSetting } from "./utils.js";
import { RollsForm } from "./forms/rolls-form.js";

const constants = CONSTANTS.ROLLS;

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
      type: RollsForm,
      restricted: true,
      scope: "world",
      requiresReload: true
    }
  );

  registerSetting(
    constants.SETTING.ROLLS.KEY,
    {
      scope: "world",
      config: false,
      type: Object,
      default: {
        ability: { die: "1d20", rollMode: "default" },
        attack: { die: "1d20", rollMode: "default" },
        concentration: { die: "1d20", rollMode: "default" },
        initiative: { die: "1d20", rollMode: "default" },
        savingThrow: { die: "1d20", rollMode: "default" },
        skill: { die: "1d20", rollMode: "default" },
        tool: { die: "1d20", rollMode: "default" }
      }
    }
  );
}

/* -------------------------------------------- */

/**
 * Register hooks.
 */
function registerHooks() {
  Hooks.on("dnd5e.preRollV2", (config, dialog, message) => {
    const hookNames = config.hookNames;
    const rolls = getSetting(constants.SETTING.ROLLS.KEY);

    let roll = null;
    let rollMode = null;

    if ( hookNames.includes("concentration") ) {
      roll = rolls.concentration;
    } else if ( hookNames.includes("initiativeDialog") ) {
      roll = rolls.initiative;
    } else if ( hookNames.includes("attack") ) {
      const weaponType = config?.subject?.item?.system?.type?.value;
      roll = (rolls.weaponTypes?.[weaponType]?.die)
        ? rolls.weaponTypes[weaponType]
        : rolls.attack;
      rollMode = (rolls.weaponTypes?.[weaponType]?.rollMode && rolls.weaponTypes?.[weaponType]?.rollMode !== "default")
        ? rolls.weaponTypes[weaponType].rollMode
        : rolls.attack.rollMode;
    } else if ( hookNames.includes("skill") ) {
      roll = rolls.skill;
      rollMode = CONFIG.DND5E?.skills[config.skill]?.rollMode;
    } else if ( hookNames.includes("tool") ) {
      roll = rolls.tool;
    } else if ( hookNames.includes("AbilityCheck") ) {
      roll = rolls.ability;
      rollMode = CONFIG.DND5E?.abilities[config.ability]?.rollMode;
    } else if ( hookNames.includes("SavingThrow") ) {
      roll = rolls.savingThrow;
      rollMode = CONFIG.DND5E?.abilities[config.ability]?.rollMode;
    }

    if ( !roll ) return;

    const dieParts = getDieParts(roll.die);
    if ( roll.die !== "1d20" && dieParts ) {
      config.rolls[0].options.customDie = roll.die;
      config.rolls[0].options.criticalSuccess = dieParts.number * dieParts.faces;
      config.rolls[0].options.criticalFailure = dieParts.number;
    }

    const rollModes = ["publicroll", "gmroll", "blindroll", "selfroll"];
    if ( rollModes.includes(rollMode) ) {
      message.rollMode = rollMode;
    } else if ( rollModes.includes(roll.rollMode) ) {
      message.rollMode = roll.rollMode;
    }
  });
}

/* -------------------------------------------- */

/**
 * Check if custom roll settings are applied.
 *
 * @returns {boolean} Whether custom roll settings are applied
 */
export function isCustomRoll() {
  const rolls = getSetting(constants.SETTING.ROLLS.KEY);

  if ( !rolls ) return false;

  const customRolls = [
    rolls.ability?.die,
    rolls.attack?.die,
    rolls.concentration?.die,
    rolls.initiative?.die,
    rolls.savingThrow?.die,
    rolls.skill?.die,
    rolls.tool?.die,
    ...Object.values(rolls.weaponTypes ?? {}).map(weaponType => weaponType?.die)
  ];

  return customRolls.some(die => die && die !== "1d20");
}
