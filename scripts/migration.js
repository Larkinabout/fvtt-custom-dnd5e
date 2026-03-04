import { CONSTANTS, MODULE } from "./constants.js";
import { Logger, getFlag, getSetting, setFlag, unsetFlag, setSetting, registerSetting } from "./utils.js";
import { rebuild } from "./workflows/workflows.js";

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

  // Register legacy counter setting keys so older migrations can still read/write them
  const legacyCounterKeys = ["character-counters", "npc-counters", "group-counters"];
  legacyCounterKeys.forEach(key => registerSetting(key, { scope: "world", config: false, type: Object }));
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
  isSuccess = (!migrationVersion || foundry.utils.isNewerVersion("3.0.0", migrationVersion)) ? migrateRerollInitiative() : true;
  isSuccess = (!migrationVersion || foundry.utils.isNewerVersion("3.2.2", migrationVersion)) ? migrateRerollInitiative() : true;
  isSuccess = (!migrationVersion || foundry.utils.isNewerVersion("3.5.0", migrationVersion)) ? migrateActorCounters() : true;

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
    if ( value === true || value === "true" ) {
      await setSetting(CONSTANTS.INITIATIVE.SETTING.REROLL_INITIATIVE_EACH_ROUND.KEY, "rerollAll");
    } else if ( value === false || value === "false" || !value ) {
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

/* -------------------------------------------- */

/**
 * Counter trigger event types that reference a specific counter.
 */
const COUNTER_TRIGGERS = [
  "counterValue", "counterValueIncrease", "counterValueDecrease",
  "checked", "unchecked", "successValue", "failureValue"
];

/**
 * Counter action types that reference a specific counter.
 */
const COUNTER_ACTIONS = ["increase", "decrease", "set", "check", "uncheck"];

/**
 * Action types that support a numeric actionValue.
 */
const ACTIONS_WITH_VALUE = ["increase", "decrease", "set"];

/* -------------------------------------------- */

/**
 * Clean stale properties from all workflows in a workflows object.
 * Strips counterKey from non-counter triggers/actions and actionValue from non-numeric actions.
 *
 * @param {object} workflows The workflows object (key -> workflow).
 */
function cleanWorkflows(workflows) {
  for ( const workflow of Object.values(workflows) ) {
    for ( const trigger of Object.values(workflow.triggers || {}) ) {
      if ( !COUNTER_TRIGGERS.includes(trigger.event) ) {
        delete trigger.counterKey;
      }
    }
    for ( const action of Object.values(workflow.actions || {}) ) {
      if ( !COUNTER_ACTIONS.includes(action.type) ) {
        delete action.counterKey;
      }
      if ( !ACTIONS_WITH_VALUE.includes(action.type) ) {
        delete action.actionValue;
      }
    }
  }
}

/* -------------------------------------------- */

/**
 * Convert an old counter trigger array entry into a top-level workflow.
 *
 * Old format per trigger:
 *   { trigger, triggerOperator, triggerValue, action, actionValue, macroUuid }
 *
 * New workflow format:
 *   { name, visible, actorTypes, triggers: { id: { event, operator, value, counterKey } }, actions: { id: { type, actionValue, macroUuid, counterKey, conditionId } } }
 *
 * @param {object} oldTrigger The old trigger object
 * @param {string} counterKey The counter key
 * @param {string} counterLabel The counter label
 * @param {string[]} actorTypes The actor types this counter applies to
 * @returns {object} The new workflow object
 */
function convertOldTriggerToWorkflow(oldTrigger, counterKey, counterLabel, actorTypes) {
  const triggerId = foundry.utils.randomID();
  const actionId = foundry.utils.randomID();

  // Build trigger
  const trigger = {
    event: oldTrigger.trigger || "",
    operator: oldTrigger.triggerOperator || "",
    value: oldTrigger.triggerValue ?? ""
  };
  if ( COUNTER_TRIGGERS.includes(trigger.event) ) {
    trigger.counterKey = counterKey;
  }

  // Build action
  const action = {
    type: oldTrigger.action || "",
    actionValue: oldTrigger.actionValue ?? "",
    macroUuid: oldTrigger.macroUuid || ""
  };

  // Map legacy "dead" action to "applyCondition"
  if ( action.type === "dead" ) {
    action.type = "applyCondition";
    action.conditionId = "dead";
  }

  if ( COUNTER_ACTIONS.includes(action.type) ) {
    action.counterKey = counterKey;
  }

  return {
    name: counterLabel,
    visible: true,
    actorTypes,
    triggers: { [triggerId]: trigger },
    actions: { [actionId]: action }
  };
}

/* -------------------------------------------- */

/**
 * Migrate counter triggers on a single entity's counter flags to top-level entity workflow flags.
 * Handles the old array trigger format directly.
 *
 * @param {Actor|Item} entity The entity to migrate
 */
async function migrateEntityCounterTriggersToWorkflows(entity) {
  const counters = getFlag(entity, "counters");
  if ( !counters || typeof counters !== "object" ) return;

  const existingTriggers = foundry.utils.deepClone(getFlag(entity, "triggers") || {});
  const clone = foundry.utils.deepClone(counters);
  let changed = false;

  for ( const [counterKey, counter] of Object.entries(clone) ) {
    if ( typeof counter !== "object" || counter === null ) continue;
    if ( !Array.isArray(counter.triggers) ) continue;

    for ( const oldTrigger of counter.triggers ) {
      const workflowKey = foundry.utils.randomID();
      existingTriggers[workflowKey] = convertOldTriggerToWorkflow(
        oldTrigger, counterKey,
        game.i18n.localize(counter.label || counterKey),
        []
      );
    }

    delete counter.triggers;
    changed = true;
  }

  if ( changed ) {
    await setFlag(entity, "counters", clone);
    await unsetFlag(entity, "triggers");
    await setFlag(entity, "triggers", existingTriggers);
  }
}

/* -------------------------------------------- */

/**
 * Clean stale properties from an entity's workflow flags.
 *
 * @param {Actor|Item} entity The entity to clean.
 */
async function cleanEntityWorkflows(entity) {
  const workflows = getFlag(entity, "triggers");
  if ( !workflows || typeof workflows !== "object" ) return;

  const clone = foundry.utils.deepClone(workflows);
  cleanWorkflows(clone);

  // Only write back if the data actually changed
  if ( JSON.stringify(workflows) !== JSON.stringify(clone) ) {
    await unsetFlag(entity, "triggers");
    await setFlag(entity, "triggers", clone);
  }
}

/* -------------------------------------------- */

/**
 * Migrate character-counters, npc-counters, and group-counters into a single actor-counters setting.
 * Also converts old counter trigger arrays into top-level workflows and migrates per-entity flags.
 *
 * Old counter trigger format (array on each counter):
 *   counter.triggers = [{ trigger, triggerOperator, triggerValue, action, actionValue, macroUuid }]
 *
 * New format:
 *   - Counters merged into actor-counters with actorTypes array, triggers removed
 *   - Each old trigger becomes a top-level workflow in the workflows setting
 *
 * @returns {Promise<boolean>} Whether the migration was successful
 */
export async function migrateActorCounters() {
  try {
    Logger.debug("Migrating actor counters...");

    const oldSettings = [
      { key: "character-counters", type: "character" },
      { key: "npc-counters", type: "npc" },
      { key: "group-counters", type: "group" }
    ];

    const merged = {};
    const actorWorkflows = foundry.utils.deepClone(
      getSetting(CONSTANTS.WORKFLOWS.SETTING.ACTOR_WORKFLOWS.KEY) || {}
    );
    const itemWorkflows = foundry.utils.deepClone(
      getSetting(CONSTANTS.WORKFLOWS.SETTING.ITEM_WORKFLOWS.KEY) || {}
    );

    // Migrate actor counter settings (character, npc, group → actor-counters)
    for ( const { key, type } of oldSettings ) {
      const counters = getSetting(key);
      if ( !counters || typeof counters !== "object" ) continue;

      for ( const [counterKey, counter] of Object.entries(counters) ) {
        if ( !merged[counterKey] ) {
          merged[counterKey] = foundry.utils.deepClone(counter);
          merged[counterKey].actorTypes = [type];
        } else {
          merged[counterKey].actorTypes.push(type);
        }

        // Convert old trigger arrays to top-level workflows
        const source = merged[counterKey];
        if ( Array.isArray(source.triggers) ) {
          for ( const oldTrigger of source.triggers ) {
            const workflowKey = foundry.utils.randomID();
            actorWorkflows[workflowKey] = convertOldTriggerToWorkflow(
              oldTrigger, counterKey,
              game.i18n.localize(source.label || counterKey),
              merged[counterKey].actorTypes
            );
          }
          delete source.triggers;
        }
      }
    }

    // Migrate item counter triggers
    const itemCounters = foundry.utils.deepClone(
      getSetting(CONSTANTS.COUNTERS.SETTING.ITEM_COUNTERS.KEY)
    );
    if ( itemCounters && typeof itemCounters === "object" ) {
      let itemChanged = false;
      for ( const [counterKey, counter] of Object.entries(itemCounters) ) {
        if ( !Array.isArray(counter.triggers) ) continue;

        for ( const oldTrigger of counter.triggers ) {
          const workflowKey = foundry.utils.randomID();
          itemWorkflows[workflowKey] = convertOldTriggerToWorkflow(
            oldTrigger, counterKey,
            game.i18n.localize(counter.label || counterKey),
            []
          );
        }
        delete counter.triggers;
        itemChanged = true;
      }
      if ( itemChanged ) {
        await setSetting(CONSTANTS.COUNTERS.SETTING.ITEM_COUNTERS.KEY, itemCounters);
      }
    }

    // Migrate per-entity counter flags, clean entity-level workflows,
    // and move counter values to the counters namespace
    const migrateItem = async (item) => {
      await migrateEntityCounterTriggersToWorkflows(item);
      await cleanEntityWorkflows(item);
      await migrateEntityCounterValuesToNamespace(item, itemCounters || {});
    };

    if ( game.actors ) {
      for ( const actor of game.actors ) {
        await migrateEntityCounterTriggersToWorkflows(actor);
        await cleanEntityWorkflows(actor);
        await migrateEntityCounterValuesToNamespace(actor, merged);
        for ( const item of actor.items ) {
          await migrateItem(item);
        }
      }
    }

    if ( game.items ) {
      for ( const item of game.items ) {
        await migrateItem(item);
      }
    }

    // Clean stale properties from all world workflows
    cleanWorkflows(actorWorkflows);
    cleanWorkflows(itemWorkflows);

    // Save merged actor counters
    await setSetting(CONSTANTS.COUNTERS.SETTING.ACTOR_COUNTERS.KEY, merged);

    // Save workflows
    await setSetting(CONSTANTS.WORKFLOWS.SETTING.ACTOR_WORKFLOWS.KEY, actorWorkflows);
    await setSetting(CONSTANTS.WORKFLOWS.SETTING.ITEM_WORKFLOWS.KEY, itemWorkflows);

    // Clear old settings
    for ( const { key } of oldSettings ) {
      await setSetting(key, {});
    }

    rebuild();

    Logger.debug("Actor counters migrated.");
    return true;
  } catch (err) {
    Logger.debug(err.message, err);
    return false;
  }
}

/* -------------------------------------------- */

/**
 * Migrate a single entity's counter values to the counters namespace.
 *
 * @param {Actor|Item} entity The entity to migrate
 * @param {object} worldCounters The world counter definitions
 */
async function migrateEntityCounterValuesToNamespace(entity, worldCounters) {
  const entityCounters = getFlag(entity, "counters") || {};
  const countersClone = foundry.utils.deepClone(entityCounters);
  let changed = false;

  // Collect all counter keys: world counter keys + entity counter keys (with type)
  const allCounterKeys = new Set([
    ...Object.keys(worldCounters),
    ...Object.keys(entityCounters).filter(k => entityCounters[k]?.type !== undefined)
  ]);

  for ( const key of allCounterKeys ) {
    const counter = worldCounters[key] || entityCounters[key];
    if ( !counter || !counter.type ) continue;

    const oldFlag = getFlag(entity, key);
    if ( oldFlag === undefined || oldFlag === null ) continue;

    // Initialize the counters entry if it doesn't exist (for world counters)
    if ( !countersClone[key] ) countersClone[key] = {};

    switch ( counter.type ) {
      case "checkbox":
        if ( typeof oldFlag === "boolean" ) {
          countersClone[key].value = oldFlag;
        } else if ( typeof oldFlag === "object" && oldFlag?.value !== undefined ) {
          countersClone[key].value = oldFlag.value;
        }
        break;
      case "number":
      case "pips":
        if ( typeof oldFlag === "number" ) {
          countersClone[key].value = oldFlag;
        } else if ( typeof oldFlag === "object" ) {
          if ( oldFlag?.value !== undefined ) countersClone[key].value = oldFlag.value;
        }
        break;
      case "fraction":
        if ( typeof oldFlag === "object" ) {
          if ( oldFlag?.value !== undefined ) countersClone[key].value = oldFlag.value;
          if ( oldFlag?.max !== undefined && !countersClone[key].max ) {
            countersClone[key].max = oldFlag.max;
          }
        }
        break;
      case "successFailure":
        if ( typeof oldFlag === "object" ) {
          if ( oldFlag?.success !== undefined ) countersClone[key].success = oldFlag.success;
          if ( oldFlag?.failure !== undefined ) countersClone[key].failure = oldFlag.failure;
        }
        break;
    }

    // Remove old flag
    await unsetFlag(entity, key);
    changed = true;
  }

  if ( changed ) {
    await unsetFlag(entity, "counters");
    await setFlag(entity, "counters", countersClone);
  }
}

/* -------------------------------------------- */

/**
 * All migration functions, exposed for testing via the module API.
 */
export const migrations = {
  migrateActorCounters,
  migrateConditions,
  migrateAwardInspirationRollType,
  migrateRerollInitiative,
  migrateRollMode
};
