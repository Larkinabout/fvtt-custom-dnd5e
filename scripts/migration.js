import { CONSTANTS, MODULE } from "./constants.js";
import { Logger, getFlag, getSetting, setFlag, unsetFlag, setSetting, registerSetting } from "./utils.js";
import { configs } from "./configurations/registry.js";
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
export async function migrate() {
  if ( !game.user.isGM ) return;

  const moduleVersion = game.modules.get(MODULE.ID).version;
  const migrationVersion = getSetting(constants.VERSION.SETTING.KEY);

  if ( moduleVersion === migrationVersion ) return;

  const shouldRun = version => !migrationVersion || foundry.utils.isNewerVersion(version, migrationVersion);

  let isSuccess = true;
  if ( shouldRun("1.3.4") ) isSuccess &&= await migrateRollMode();
  if ( shouldRun("2.2.4") ) isSuccess &&= await migrateConditions();
  if ( shouldRun("2.3.0") ) isSuccess &&= await migrateAwardInspirationRollType();
  if ( shouldRun("3.0.0") ) isSuccess &&= await migrateRerollInitiative();
  if ( shouldRun("3.2.2") ) isSuccess &&= await migrateRerollInitiative();
  if ( shouldRun("3.5.0") ) isSuccess &&= await migrateActorCounters();
  if ( shouldRun("4.2.0") ) isSuccess &&= await migrateDamageTypeLabels();
  if ( shouldRun("4.2.0") ) isSuccess &&= await migrateWorkflowTriggerEvents();
  if ( shouldRun("5.1.0") ) isSuccess &&= await migrateRestTypesHitDiceFormula();
  if ( shouldRun("5.1.0") ) isSuccess &&= await migrateTokenBorderEnable();
  if ( shouldRun("5.3.0") ) isSuccess &&= await migrateCustomSensesToNamespace();
  if ( shouldRun("5.5.0") ) isSuccess &&= await migrateBloodiedThreshold();
  if ( shouldRun("5.5.0") ) isSuccess &&= await migrateArmorCalculations();
  if ( shouldRun("5.5.0") ) isSuccess &&= await migrateStaleSystemLabels();
  if ( shouldRun("5.5.0") ) isSuccess &&= await migrateConditionEffects();
  if ( shouldRun("5.5.0") ) isSuccess &&= await migrateActivitiesClearTargets();
  if ( shouldRun("5.5.0") ) isSuccess &&= await migrateConditionLevels();
  if ( shouldRun("5.5.0") ) isSuccess &&= await migrateApplyDead();
  if ( shouldRun("5.5.0") ) isSuccess &&= await migrateApplyMassiveDamage();

  if ( isSuccess ) {
    await setSetting(constants.VERSION.SETTING.KEY, moduleVersion);
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
    const conditions = foundry.utils.deepClone(getSetting(configs.conditions.SETTING.CONFIG.KEY));

    if ( !conditions ) return true;

    for (const value of Object.values(conditions)) {
      const name = value?.name ?? value?.label;
      const img = value?.img ?? value?.icon;

      value.name = name;
      value.img = img;

      delete value.label;
      delete value.icon;
    }

    await setSetting(configs.conditions.SETTING.CONFIG.KEY, conditions);
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
 * @param {string} counterKey
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
 * Migrate damage type labels from dnd5e 5.2.5 to 5.3.0.
 * @returns {Promise<boolean>} Whether the migration was successful
 */
export async function migrateDamageTypeLabels() {
  try {
    Logger.debug("Migrating damage type labels...");

    const damageTypes = getSetting(configs.damageTypes.SETTING.CONFIG.KEY);
    if ( !damageTypes || typeof damageTypes !== "object" ) return true;

    const newDamageTypes = foundry.utils.deepClone(damageTypes);
    let changed = false;

    for ( const [key, entry] of Object.entries(newDamageTypes) ) {
      if ( !entry || typeof entry.label !== "string" ) continue;
      if ( entry.system === false ) continue;
      if ( game.i18n.has(entry.label) ) continue;

      const systemDefault = CONFIG.CUSTOM_DND5E?.damageTypes?.[key]?.label;
      if ( systemDefault && game.i18n.has(systemDefault) ) {
        entry.label = systemDefault;
        changed = true;
      }
    }

    if ( changed ) {
      await setSetting(configs.damageTypes.SETTING.CONFIG.KEY, newDamageTypes);
      Logger.debug("Damage type labels migrated.");
    }

    return true;
  } catch (err) {
    Logger.error(`Failed to migrate damage type labels: ${err.message}`);
    return false;
  }
}

/* -------------------------------------------- */

/**
 * Mapping of legacy workflow trigger event keys to their new past-tense equivalents.
 * @type {Record<string, string>}
 */
const WORKFLOW_TRIGGER_RENAMES = {
  preRollAttack: "attackRoll",
  rollAttack: "attackRolled",
  rollAbilityCheck: "abilityCheckRolled",
  rollSavingThrow: "savingThrowRolled",
  rollSkill: "skillCheckRolled",
  rollToolCheck: "toolCheckRolled",
  rollConcentration: "concentrationSaveRolled",
  rollDeathSave: "deathSaveRolled",
  rollInitiative: "initiativeRolled",
  rollDamage: "damageRolled"
};

/* -------------------------------------------- */

/**
 * Apply trigger event renames to a workflows object in place.
 * @param {object} workflows Workflows
 * @returns {boolean} Whether any change was made
 */
function renameWorkflowTriggerEvents(workflows) {
  if ( !workflows || typeof workflows !== "object" ) return false;
  let changed = false;
  for ( const workflow of Object.values(workflows) ) {
    const triggers = workflow?.triggers;
    if ( !triggers || typeof triggers !== "object" ) continue;
    for ( const trigger of Object.values(triggers) ) {
      const next = WORKFLOW_TRIGGER_RENAMES[trigger?.event];
      if ( next ) {
        trigger.event = next;
        changed = true;
      }
    }
  }
  return changed;
}

/* -------------------------------------------- */

/**
 * Migrate workflow trigger event keys to their new past-tense names.
 * @returns {Promise<boolean>} Whether the migration was successful
 */
export async function migrateWorkflowTriggerEvents() {
  try {
    Logger.debug("Migrating workflow trigger event keys...");

    // World-level actor workflows
    const actorWorkflows = getSetting(CONSTANTS.WORKFLOWS.SETTING.ACTOR_WORKFLOWS.KEY);
    if ( actorWorkflows && typeof actorWorkflows === "object" ) {
      const cloned = foundry.utils.deepClone(actorWorkflows);
      if ( renameWorkflowTriggerEvents(cloned) ) {
        await setSetting(CONSTANTS.WORKFLOWS.SETTING.ACTOR_WORKFLOWS.KEY, cloned);
      }
    }

    // World-level item workflows
    const itemWorkflows = getSetting(CONSTANTS.WORKFLOWS.SETTING.ITEM_WORKFLOWS.KEY);
    if ( itemWorkflows && typeof itemWorkflows === "object" ) {
      const cloned = foundry.utils.deepClone(itemWorkflows);
      if ( renameWorkflowTriggerEvents(cloned) ) {
        await setSetting(CONSTANTS.WORKFLOWS.SETTING.ITEM_WORKFLOWS.KEY, cloned);
      }
    }

    // Per-actor and per-item flags
    if ( game.actors ) {
      for ( const actor of game.actors ) {
        const actorTriggers = getFlag(actor, "triggers");
        if ( actorTriggers && typeof actorTriggers === "object" ) {
          const cloned = foundry.utils.deepClone(actorTriggers);
          if ( renameWorkflowTriggerEvents(cloned) ) {
            await unsetFlag(actor, "triggers");
            await setFlag(actor, "triggers", cloned);
          }
        }
        for ( const item of actor.items ) {
          const itemTriggers = getFlag(item, "triggers");
          if ( !itemTriggers || typeof itemTriggers !== "object" ) continue;
          const cloned = foundry.utils.deepClone(itemTriggers);
          if ( renameWorkflowTriggerEvents(cloned) ) {
            await unsetFlag(item, "triggers");
            await setFlag(item, "triggers", cloned);
          }
        }
      }
    }

    rebuild();
    Logger.debug("Workflow trigger event keys migrated.");
    return true;
  } catch (err) {
    Logger.error(`Failed to migrate workflow trigger events: ${err.message}`);
    return false;
  }
}

/* -------------------------------------------- */

/**
 * Migrate `hitDiceFraction` values into the `hitDiceFormula` field.
 * Existing fractions are translated to `@attributes.hd.max * <fraction>`.
 * @returns {Promise<boolean>} Whether the migration was successful
 */
export async function migrateRestTypesHitDiceFormula() {
  try {
    Logger.debug("Migrating rest type Hit Dice fractions to formulas...");

    const restTypes = getSetting(configs.restTypes.SETTING.CONFIG.KEY);
    if ( !restTypes || typeof restTypes !== "object" ) return true;

    const cloned = foundry.utils.deepClone(restTypes);
    let changed = false;

    for ( const entry of Object.values(cloned) ) {
      if ( !entry || typeof entry !== "object" ) continue;
      if ( "hitDiceFraction" in entry ) {
        const fraction = entry.hitDiceFraction;
        if ( entry.hitDiceFormula === undefined
          && fraction !== null
          && fraction !== ""
          && Number(fraction) > 0 ) {
          entry.hitDiceFormula = `@attributes.hd.max * ${fraction}`;
        }
        delete entry.hitDiceFraction;
        changed = true;
      }
    }

    if ( changed ) {
      await setSetting(configs.restTypes.SETTING.CONFIG.KEY, cloned);
      Logger.debug("Rest type Hit Dice fractions migrated.");
    }
    return true;
  } catch (err) {
    Logger.error(`Failed to migrate rest type Hit Dice fractions: ${err.message}`);
    return false;
  }
}

/* -------------------------------------------- */

/**
 * Set Enable to true for the Token Border feature when Shape is set to Circle.
 * @returns {Promise<boolean>} Whether the migration was successful
 */
export async function migrateTokenBorderEnable() {
  try {
    const shape = getSetting(CONSTANTS.TOKEN.SETTING.BORDER_SHAPE.KEY);
    if ( shape !== "circle" ) return true;
    if ( getSetting(CONSTANTS.TOKEN.SETTING.BORDER_ENABLE.KEY) ) return true;
    Logger.debug("Enabling Token Border (existing shape = circle)...");
    await setSetting(CONSTANTS.TOKEN.SETTING.BORDER_ENABLE.KEY, true);
    Logger.debug("Token Border enabled.");
    return true;
  } catch (err) {
    Logger.error(`Failed to migrate Token Border enable: ${err.message}`);
    return false;
  }
}

/* -------------------------------------------- */

/**
 * Move custom sense values from `flags.custom-dnd5e.<key>` into the
 * `flags.custom-dnd5e.senses.<key>` namespace.
 * @returns {Promise<boolean>} Whether the migration was successful
 */
export async function migrateCustomSensesToNamespace() {
  try {
    Logger.debug("Migrating custom senses to the senses namespace...");

    const senses = getSetting(configs.senses.SETTING.CONFIG.KEY);
    if ( !senses || typeof senses !== "object" ) return true;

    const systemSenses = new Set(Object.keys(CONFIG.CUSTOM_DND5E?.senses ?? {}));
    const customSenseKeys = Object.keys(senses).filter(key => !systemSenses.has(key));
    if ( !customSenseKeys.length || !game.actors ) return true;

    for ( const actor of game.actors ) {
      for ( const key of customSenseKeys ) {
        const oldValue = getFlag(actor, key);
        if ( oldValue === undefined || oldValue === null ) continue;
        if ( typeof oldValue === "object" ) continue;
        await setFlag(actor, `senses.${key}`, oldValue);
        await unsetFlag(actor, key);
      }
    }

    Logger.debug("Custom senses migrated.");
    return true;
  } catch (err) {
    Logger.error(`Failed to migrate custom senses: ${err.message}`);
    return false;
  }
}

/* -------------------------------------------- */

/**
 * Convert the Bloodied threshold from a fraction of max HP to a percentage.
 * In dnd5e 6.0.0, `CONFIG.DND5E.bloodied.threshold` changed from a fraction to a
 * percentage.
 * @returns {Promise<boolean>} Whether the migration was successful
 */
export async function migrateBloodiedThreshold() {
  try {
    const bloodied = getSetting(configs.bloodied.SETTING.CONFIG.KEY);
    if ( !bloodied || typeof bloodied !== "object" ) return true;

    const threshold = Number(bloodied.threshold);
    if ( !Number.isFinite(threshold) || threshold > 1 ) return true;

    Logger.debug("Migrating Bloodied threshold to a percentage...");
    const cloned = foundry.utils.deepClone(bloodied);
    cloned.threshold = Math.round(threshold * 100);
    await setSetting(configs.bloodied.SETTING.CONFIG.KEY, cloned);
    Logger.debug("Bloodied threshold migrated.");
    return true;
  } catch (err) {
    Logger.error(`Failed to migrate Bloodied threshold: ${err.message}`);
    return false;
  }
}

/* -------------------------------------------- */

/**
 * Remove the `flat` and `default` armor class calculations.
 * Carry over a customized `default` formula to the `armored` calculation.
 * @returns {Promise<boolean>} Whether the migration was successful
 */
export async function migrateArmorCalculations() {
  try {
    const armorClasses = getSetting(configs.armorCalculations.SETTING.CONFIG.KEY);
    if ( !armorClasses || typeof armorClasses !== "object" ) return true;
    if ( !("flat" in armorClasses) && !("default" in armorClasses) ) return true;

    Logger.debug("Migrating armor class calculations...");
    const cloned = foundry.utils.deepClone(armorClasses);

    const oldDefaultFormula = "@attributes.ac.armor + @attributes.ac.dex";
    const defaultFormula = cloned.default?.formula?.trim();
    if ( defaultFormula && defaultFormula !== oldDefaultFormula && !cloned.armored?.formula ) {
      cloned.armored = { ...cloned.armored, formula: defaultFormula };
    }

    delete cloned.flat;
    delete cloned.default;

    await setSetting(configs.armorCalculations.SETTING.CONFIG.KEY, cloned);
    Logger.debug("Armor class calculations migrated.");
    return true;
  } catch (err) {
    Logger.error(`Failed to migrate armor class calculations: ${err.message}`);
    return false;
  }
}

/* -------------------------------------------- */

/**
 * Configs whose stored entries hold localization keys renamed in dnd5e 6.0.0.
 */
const STALE_LABEL_CONFIGS = [
  { id: "armorCalculations", fields: ["label"] },
  { id: "itemProperties", fields: ["label", "abbreviation"] },
  { id: "itemRarity", fields: ["label"] }
];

/* -------------------------------------------- */

/**
 * Whether a stored value is a system localization key that no longer exists.
 * @param {string} value
 * @returns {boolean} Whether the value is a stale system localization key
 */
function isStaleSystemKey(value) {
  return value.startsWith("DND5E.") && !game.i18n.has(value);
}

/* -------------------------------------------- */

/**
 * Replace stale system localization keys in stored configs with the current system defaults.
 * @returns {Promise<boolean>} Whether the migration was successful
 */
export async function migrateStaleSystemLabels() {
  try {
    for ( const { id, fields } of STALE_LABEL_CONFIGS ) {
      const config = configs[id];
      const setting = getSetting(config.SETTING.CONFIG.KEY);
      if ( !setting || typeof setting !== "object" ) continue;

      const cloned = foundry.utils.deepClone(setting);
      let changed = false;

      for ( const [key, entry] of Object.entries(cloned) ) {
        const systemDefault = CONFIG.CUSTOM_DND5E?.[config.configKey]?.[key];
        if ( systemDefault === undefined ) continue;

        if ( typeof entry === "string" ) {
          if ( isStaleSystemKey(entry) && typeof systemDefault === "string" && game.i18n.has(systemDefault) ) {
            cloned[key] = systemDefault;
            changed = true;
          }
          continue;
        }

        if ( !entry || typeof entry !== "object" || entry.system === false ) continue;

        for ( const field of fields ) {
          const value = entry[field];
          const defaultValue = (typeof systemDefault === "object") ? systemDefault?.[field] : systemDefault;
          if ( typeof value !== "string" || !isStaleSystemKey(value) ) continue;
          if ( typeof defaultValue !== "string" || !game.i18n.has(defaultValue) ) continue;
          entry[field] = defaultValue;
          changed = true;
        }
      }

      if ( changed ) {
        Logger.debug(`Migrating stale system labels for '${id}'...`);
        await setSetting(config.SETTING.CONFIG.KEY, cloned);
        Logger.debug(`Stale system labels for '${id}' migrated.`);
      }
    }
    return true;
  } catch (err) {
    Logger.error(`Failed to migrate stale system labels: ${err.message}`);
    return false;
  }
}

/* -------------------------------------------- */

/**
 * dnd5e 5.x default condition effect triggers changed in dnd5e 6.0.0.
 */
const OLD_CONDITION_EFFECT_DEFAULTS = {
  noMovement: ["exhaustion-5", "grappled", "paralyzed", "petrified", "restrained", "unconscious"],
  halfMovement: ["exhaustion-2"],
  halfHealth: ["exhaustion-4"],
  abilityCheckDisadvantage: ["poisoned", "exhaustion-1"],
  abilitySaveDisadvantage: ["exhaustion-3"],
  attackDisadvantage: ["poisoned", "exhaustion-3"]
};

/* -------------------------------------------- */

/**
 * Reset condition effect triggers that still match their dnd5e 5.x defaults.
 * @returns {Promise<boolean>} Whether the migration was successful
 */
export async function migrateConditionEffects() {
  try {
    const setting = getSetting(configs.conditionEffects.SETTING.CONFIG.KEY);
    if ( !setting || typeof setting !== "object" ) return true;

    const cloned = foundry.utils.deepClone(setting);
    let changed = false;

    for ( const [key, oldDefaults] of Object.entries(OLD_CONDITION_EFFECT_DEFAULTS) ) {
      const entry = cloned[key];
      if ( !entry || !Array.isArray(entry.triggers) ) continue;

      const stored = new Set(entry.triggers);
      const old = new Set(oldDefaults);
      if ( stored.size !== old.size || ![...stored].every(trigger => old.has(trigger)) ) continue;

      entry.triggers = [...(CONFIG.CUSTOM_DND5E?.conditionEffects?.[key] ?? [])];
      changed = true;
    }

    if ( changed ) {
      Logger.debug("Migrating condition effect triggers...");
      await setSetting(configs.conditionEffects.SETTING.CONFIG.KEY, cloned);
      Logger.debug("Condition effect triggers migrated.");
    }
    return true;
  } catch (err) {
    Logger.error(`Failed to migrate condition effect triggers: ${err.message}`);
    return false;
  }
}

/* -------------------------------------------- */

/**
 * Convert the activities `clearTargetsAfterUse` checkbox to the `clearTargets` choice.
 * @returns {Promise<boolean>} Whether the migration was successful
 */
export async function migrateActivitiesClearTargets() {
  try {
    const setting = getSetting(CONSTANTS.ACTIVITIES.SETTING.CONFIG.KEY);
    if ( !setting || typeof setting !== "object" ) return true;
    if ( !("clearTargetsAfterUse" in setting) && !("clearTargetsBeforeUse" in setting) ) return true;

    Logger.debug("Migrating activities clear targets...");
    const cloned = foundry.utils.deepClone(setting);
    cloned.clearTargets ??= cloned.clearTargetsBeforeUse ? "before"
      : cloned.clearTargetsAfterUse ? "after" : "none";
    delete cloned.clearTargetsBeforeUse;
    delete cloned.clearTargetsAfterUse;

    await setSetting(CONSTANTS.ACTIVITIES.SETTING.CONFIG.KEY, cloned);
    Logger.debug("Activities clear targets migrated.");
    return true;
  } catch (err) {
    Logger.error(`Failed to migrate activities clear targets: ${err.message}`);
    return false;
  }
}

/* -------------------------------------------- */

/**
 * Move condition levels from the module's `conditionLevel` flag to the D&D 5e system's native
 * leveled conditions introduced in dnd5e 6.0.0.
 * @returns {Promise<boolean>} Whether the migration was successful
 */
export async function migrateConditionLevels() {
  try {
    Logger.debug("Migrating condition levels...");

    const migrateActorEffects = async actor => {
      for ( const effect of Array.from(actor?.effects ?? []) ) {
        const level = effect.getFlag(MODULE.ID, "conditionLevel");
        if ( level === undefined ) continue;

        const statusId = [...(effect.statuses ?? [])][0];
        if ( !statusId ) {
          await effect.unsetFlag(MODULE.ID, "conditionLevel");
          continue;
        }

        await effect.delete();
        const isLeveled = Number.isFinite(CONFIG.DND5E.conditionTypes[statusId]?.levels);
        await actor.toggleStatusEffect(statusId, isLeveled
          ? { levels: Number(level) || 1 }
          : { active: true });
      }
    };

    for ( const actor of game.actors ?? [] ) {
      await migrateActorEffects(actor);
    }
    for ( const scene of game.scenes ?? [] ) {
      for ( const token of scene.tokens ) {
        if ( !token.actorLink && token.actor ) await migrateActorEffects(token.actor);
      }
    }

    Logger.debug("Condition levels migrated.");
    return true;
  } catch (err) {
    Logger.error(`Failed to migrate condition levels: ${err.message}`);
    return false;
  }
}

/* -------------------------------------------- */

/**
 * Convert the 'Apply Dead' checkbox to the 'Apply Status on 0 HP' choice.
 * @returns {Promise<boolean>} Whether the migration was successful
 */
export async function migrateApplyDead() {
  try {
    const value = getSetting(CONSTANTS.DEAD.SETTING.APPLY_DEAD.KEY);
    if ( ["none", "dead", "unconscious", "deadUnlessImportant"].includes(value) ) return true;

    Logger.debug("Migrating apply dead...");
    await setSetting(CONSTANTS.DEAD.SETTING.APPLY_DEAD.KEY, (value === true || value === "true") ? "dead" : "none");
    Logger.debug("Apply dead migrated.");
    return true;
  } catch (err) {
    Logger.error(`Failed to migrate apply dead: ${err.message}`);
    return false;
  }
}

/* -------------------------------------------- */

/**
 * Convert the 'Apply Massive Damage' checkbox to the actor-type choice.
 * @returns {Promise<boolean>} Whether the migration was successful
 */
export async function migrateApplyMassiveDamage() {
  try {
    const value = getSetting(CONSTANTS.HIT_POINTS.SETTING.APPLY_MASSIVE_DAMAGE.KEY);
    if ( ["neither", "character", "npc", "both"].includes(value) ) return true;

    Logger.debug("Migrating apply massive damage...");
    await setSetting(CONSTANTS.HIT_POINTS.SETTING.APPLY_MASSIVE_DAMAGE.KEY,
      (value === true || value === "true") ? "character" : "neither");
    Logger.debug("Apply massive damage migrated.");
    return true;
  } catch (err) {
    Logger.error(`Failed to migrate apply massive damage: ${err.message}`);
    return false;
  }
}

/* -------------------------------------------- */

/**
 * All migration functions, exposed for testing via the module API.
 */
export const migrations = {
  migrateActivitiesClearTargets,
  migrateApplyDead,
  migrateApplyMassiveDamage,
  migrateActorCounters,
  migrateArmorCalculations,
  migrateBloodiedThreshold,
  migrateConditionEffects,
  migrateConditionLevels,
  migrateConditions,
  migrateAwardInspirationRollType,
  migrateCustomSensesToNamespace,
  migrateDamageTypeLabels,
  migrateRerollInitiative,
  migrateRestTypesHitDiceFormula,
  migrateRollMode,
  migrateStaleSystemLabels,
  migrateTokenBorderEnable,
  migrateWorkflowTriggerEvents
};
