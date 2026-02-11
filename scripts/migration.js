import { CONSTANTS, MODULE } from "./constants.js";
import { Logger, getSetting, setSetting, registerSetting } from "./utils.js";

const constants = CONSTANTS.MIGRATION;

/**
 * Register settings.
 */
export function register() {
  registerSettings();
}

/* -------------------------------------------- */

/**
 * Register settings.
 */
function registerSettings() {
  registerSetting(
    constants.VERSION.SETTING.KEY,
    {
      scope: "world",
      config: false,
      type: String
    }
  );
}

/* -------------------------------------------- */

/**
 * Run migrations between module versions.
 */
export function migrate() {
  if ( !game.user.isGM ) return;

  const moduleVersion = game.modules.get(MODULE.ID).version;
  const migrationVersion = getSetting(constants.VERSION.SETTING.KEY);

  if ( moduleVersion === migrationVersion ) return;

  let isSuccess = true;
  isSuccess = (!migrationVersion || foundry.utils.isNewerVersion("1.3.4", migrationVersion)) ? migrateRollMode() : true;
  isSuccess = (!migrationVersion || foundry.utils.isNewerVersion("2.2.4", migrationVersion)) ? migrateConditions() : true;
  isSuccess = (!migrationVersion || foundry.utils.isNewerVersion("2.3.0", migrationVersion)) ? migrateAwardInspirationRollType() : true;
  isSuccess = (!migrationVersion || foundry.utils.isNewerVersion("2.4.0", migrationVersion)) ? migrateRerollInitiative() : true;

  if ( isSuccess ) {
    setSetting(constants.VERSION.SETTING.KEY, moduleVersion);
  }
}

/* -------------------------------------------- */

/**
 * Migrate roll mode settings.
 *
 * @returns {Promise<boolean>} Whether the migration was successful
 */
export async function migrateRollMode() {
  try {
    const rolls = [...game.settings.storage.get("world")]
      .find(setting => setting.key === "custom-dnd5e.rolls")?.value;
    if ( rolls ) {
      const newRolls = foundry.utils.deepClone(rolls);
      Object.entries(newRolls).forEach(([key, roll]) => {
        if ( key !== "weaponTypes" && roll.rollMode && roll.rollMode === "publicroll" ) {
          roll.rollMode = "default";
        } else if ( key === "weaponTypes" ) {
          const weaponTypes = roll;
          Object.values(weaponTypes).forEach(weaponType => {
            if ( weaponType.rollMode && weaponType.rollMode === "publicroll" ) {
              weaponType.rollMode = "default";
            }
          });
        }
      });

      await setSetting(CONSTANTS.ROLLS.SETTING.ROLLS.KEY, {});
      await setSetting(CONSTANTS.ROLLS.SETTING.ROLLS.KEY, newRolls);
    }
    return true;
  } catch (err) {
    Logger.debug(err.message, err);
    return false;
  }
}

/* -------------------------------------------- */

/**
 * Migrate award inspiration roll type settings.
 * @returns {Promise<boolean>} Whether the migration was successful
 */
export async function migrateAwardInspirationRollType() {
  const rollTypes = getSetting(CONSTANTS.INSPIRATION.SETTING.AWARD_INSPIRATION_ROLL_TYPES.KEY);
  if ( !rollTypes ) return true;
  const newRollTypes = foundry.utils.deepClone(rollTypes);

  if ( newRollTypes.rollAbilitySave ) {
    newRollTypes.rollSavingThrow = newRollTypes.rollAbilitySave;
    delete newRollTypes.rollAbilitySave;
  }

  if ( newRollTypes.rollAbilityTest ) {
    newRollTypes.rollAbilityCheck = newRollTypes.rollAbilityTest;
    delete newRollTypes.rollAbilityTest;
  }

  await setSetting(CONSTANTS.INSPIRATION.SETTING.AWARD_INSPIRATION_ROLL_TYPES.KEY, newRollTypes);
  return true;
}

/* -------------------------------------------- */

/**
 * Migrate reroll initiative setting from Boolean to String.
 * @returns {Promise<boolean>} Whether the migration was successful
 */
export async function migrateRerollInitiative() {
  try {
    const value = getSetting(CONSTANTS.INITIATIVE.SETTING.REROLL_INITIATIVE_EACH_ROUND.KEY);
    if ( value === true ) {
      await setSetting(CONSTANTS.INITIATIVE.SETTING.REROLL_INITIATIVE_EACH_ROUND.KEY, "rerollAll");
    } else if ( value === false || !value ) {
      await setSetting(CONSTANTS.INITIATIVE.SETTING.REROLL_INITIATIVE_EACH_ROUND.KEY, "off");
    }
    return true;
  } catch (err) {
    Logger.debug(err.message, err);
    return false;
  }
}

/* -------------------------------------------- */

/**
 * Migrate condition settings to use 'name' and 'img' properties instead of 'label' and 'icon'.
 * @returns {Promise<boolean>} Whether the migration was successful
 */
export async function migrateConditions() {
  try {
    Logger.debug("Migrating conditions...");
    const conditions = foundry.utils.deepClone(getSetting(CONSTANTS.CONDITIONS.SETTING.CONFIG.KEY));

    if ( !conditions ) return true;

    for (const value of Object.values(conditions)) {
      const name = value?.name ?? value?.label;
      const img = value?.img ?? value?.icon;

      value.name = name;
      value.img = img;

      delete value.label;
      delete value.icon;
    }

    await setSetting(CONSTANTS.CONDITIONS.SETTING.CONFIG.KEY, conditions);
    Logger.debug("Conditions migrated.");
    return true;
  } catch (err) {
    Logger.debug(err.message, err);
    return false;
  }
}
