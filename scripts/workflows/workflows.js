import { CONSTANTS, MODULE, SETTING_BY_ENTITY_TYPE, SHEET_TYPE } from "../constants.js";
import { c5eLoadTemplates, compareValues, executeMacro, getFlag, setFlag, unsetFlag, getSetting, setSetting, Logger, registerMenu, registerSetting } from "../utils.js";
import { WorkflowsForm } from "../forms/workflows/workflows-form.js";
import { WorkflowsFormEntity } from "../forms/workflows/workflows-form-entity.js";
import { counters } from "../counters/counters.js";

const constants = CONSTANTS.WORKFLOWS;
const LOG_PREFIX = "Workflows |";

/* -------------------------------------------- */
/*  Event-Indexed Registry State                */
/* -------------------------------------------- */

const eventIndex = new Map(); // EventType -> workflow[] (world actor workflows, pre-indexed)
const itemEventIndex = new Map(); // EventType -> workflow[] (world item workflows, pre-indexed)
const hookIds = new Map(); // HookName -> hookId (currently registered hooks)

/* -------------------------------------------- */
/*  Registration                                */
/* -------------------------------------------- */

/** Register settings, hooks, and templates. */
export function register() {
  registerSettings();
  Hooks.once("ready", rebuild);
  Hooks.on("renderActorSheetV2", addActorWorkflowsButton);
  Hooks.on("renderGroupActorSheet", addGroupWorkflowsButton);
  Hooks.on("renderItemSheet5e", addItemWorkflowsButton);

  const templates = Object.values(constants.TEMPLATE);
  c5eLoadTemplates(templates);
}

/* -------------------------------------------- */

/** Register settings. */
function registerSettings() {
  registerMenu(
    constants.MENU.KEY,
    {
      hint: game.i18n.localize(constants.MENU.HINT),
      label: game.i18n.localize(constants.MENU.LABEL),
      name: game.i18n.localize(constants.MENU.NAME),
      icon: constants.MENU.ICON,
      type: WorkflowsForm,
      restricted: true,
      scope: "world"
    }
  );

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
    constants.SETTING.ACTOR_WORKFLOWS.KEY,
    {
      scope: "world",
      config: false,
      type: Object,
      default: {}
    }
  );

  registerSetting(
    constants.SETTING.ITEM_WORKFLOWS.KEY,
    {
      scope: "world",
      config: false,
      type: Object,
      default: {}
    }
  );
}

/* -------------------------------------------- */
/*  Sheet Buttons                               */
/* -------------------------------------------- */

/**
 * Add a workflows button to actor sheet effects tab.
 * @param {object} app The actor sheet app.
 * @param {HTMLElement} html The rendered HTML.
 * @param {object} data The data.
 */
function addActorWorkflowsButton(app, html, data) {
  if ( !getSetting(constants.SETTING.ENABLE.KEY) ) return;

  const sheetType = SHEET_TYPE[app.constructor.name];
  if ( !sheetType || sheetType.item ) return;

  if ( !data?.editable ) return;

  const actor = app.actor;
  if ( !actor ) return;

  const tab = html.querySelector('.tab[data-tab="effects"]');
  if ( !tab ) return;

  tab.querySelector(".custom-dnd5e-workflows-button")?.remove();

  const buttonHtml = `<button type="button" class="custom-dnd5e-workflows-button">
    <i class="fas fa-bolt-lightning"></i> ${game.i18n.localize("CUSTOM_DND5E.form.workflows.title")}
  </button>`;
  tab.insertAdjacentHTML("afterbegin", buttonHtml);

  tab.querySelector(".custom-dnd5e-workflows-button").addEventListener("click", event => {
    event.preventDefault();
    new WorkflowsFormEntity(actor).render(true);
  });
}

/* -------------------------------------------- */

/**
 * Add a workflows button to group actor sheet members tab.
 * @param {object} app The group sheet app.
 * @param {HTMLElement} html The rendered HTML.
 * @param {object} data The data.
 */
function addGroupWorkflowsButton(app, html, data) {
  if ( !getSetting(constants.SETTING.ENABLE.KEY) ) return;
  if ( !data?.editable ) return;

  const actor = app.document;
  if ( !actor ) return;

  const tab = html.querySelector('.tab[data-tab="members"]');
  if ( !tab ) return;

  tab.querySelector(".custom-dnd5e-workflows-button")?.remove();

  const buttonHtml = `<button type="button" class="custom-dnd5e-workflows-button">
    <i class="fas fa-bolt-lightning"></i> ${game.i18n.localize("CUSTOM_DND5E.form.workflows.title")}
  </button>`;
  tab.insertAdjacentHTML("afterbegin", buttonHtml);

  tab.querySelector(".custom-dnd5e-workflows-button").addEventListener("click", event => {
    event.preventDefault();
    new WorkflowsFormEntity(actor).render(true);
  });
}

/* -------------------------------------------- */

/**
 * Add a workflows button to item sheet effects tab.
 * @param {object} app The item sheet app.
 * @param {HTMLElement} html The rendered HTML.
 * @param {object} data The data.
 */
function addItemWorkflowsButton(app, html, data) {
  if ( !getSetting(constants.SETTING.ENABLE.KEY) ) return;
  if ( !data?.editable ) return;

  const item = app.document;
  if ( !item ) return;

  const tab = html.querySelector('.tab[data-tab="effects"]');
  if ( !tab ) return;

  tab.querySelector(".custom-dnd5e-workflows-button")?.remove();

  const buttonHtml = `<button type="button" class="custom-dnd5e-workflows-button">
    <i class="fas fa-bolt-lightning"></i> ${game.i18n.localize("CUSTOM_DND5E.form.workflows.title")}
  </button>`;
  tab.insertAdjacentHTML("afterbegin", buttonHtml);

  tab.querySelector(".custom-dnd5e-workflows-button").addEventListener("click", event => {
    event.preventDefault();
    new WorkflowsFormEntity(item).render(true);
  });
}

/* -------------------------------------------- */
/*  Action Execution                            */
/* -------------------------------------------- */

/**
 * Coerce a string value to boolean or number if applicable.
 * @param {string} value
 * @returns {string|boolean|number}
 */
function coerceValue(value) {
  if ( value === "true" ) return true;
  if ( value === "false" ) return false;
  if ( !isNaN(Number(value)) && value !== "" ) return Number(value);
  return value;
}

/* -------------------------------------------- */

/**
 * Execute all actions in a workflow.
 * @param {object} actions The actions.
 * @param {object} options The options.
 * @param {Actor|Item} options.entity The entity.
 * @param {string} options.event The event name.
 * @param {number|null} [options.dieTotal] The die total.
 * @param {Roll[]|null} [options.rolls] The rolls.
 * @param {object|null} [options.data] Additional data.
 * @param {string|null} [options.counterKey] The counter key.
 * @param {number|null} [options.counterValue] The counter value.
 */
function executeWorkflowActions(actions, { entity, event, dieTotal = null, rolls = null, data = null, counterKey = null, counterValue = null }) {
  const actor = entity.documentName === "Item" ? entity.parent : entity;
  const actorUpdates = {};
  const tokenUpdates = {};
  const itemUpdates = {};

  for ( const action of Object.values(actions) ) {
    if ( action.type === "actorUpdate" ) {
      if ( action.updatePath && action.updateValue !== undefined ) {
        foundry.utils.setProperty(actorUpdates, action.updatePath, coerceValue(action.updateValue));
      }
    } else if ( action.type === "tokenUpdate" ) {
      if ( action.updatePath && action.updateValue !== undefined ) {
        foundry.utils.setProperty(tokenUpdates, action.updatePath, coerceValue(action.updateValue));
      }
    } else if ( action.type === "itemUpdate" ) {
      if ( entity.documentName === "Item" && action.updatePath && action.updateValue !== undefined ) {
        foundry.utils.setProperty(itemUpdates, action.updatePath, coerceValue(action.updateValue));
      }
    } else {
      handleAction(action, { entity, event, dieTotal, rolls, data, counterKey, counterValue });
    }
  }

  if ( Object.keys(actorUpdates).length ) actor?.update(actorUpdates);
  if ( Object.keys(tokenUpdates).length ) {
    const token = actor?.isToken ? actor.token : actor?.getActiveTokens()[0];
    if ( token ) token.document.update(tokenUpdates);
  }
  if ( Object.keys(itemUpdates).length && entity.documentName === "Item" ) {
    entity.update(itemUpdates);
  }
}

/* -------------------------------------------- */

/**
 * Handle a single workflow action by dispatching it to the appropriate handler.
 * @param {object} action The action.
 * @param {object} options The options.
 * @param {Actor|Item} options.entity The entity.
 * @param {string} options.event The event.
 * @param {number|null} [options.dieTotal] The die total.
 * @param {Roll[]|null} [options.rolls] The rolls.
 * @param {object|null} [options.data] Additional hook data.
 * @param {string|null} [options.counterKey] The counter key.
 * @param {number|null} [options.counterValue] The counter value.
 */
function handleAction(action, { entity, event, dieTotal = null, rolls = null, data = null, counterKey = null, counterValue = null }) {
  Logger.debug(`${LOG_PREFIX} Executing action`, { entity: entity.name, event, actionType: action.type });

  // Resolve the parent actor for item-level workflows
  const actor = entity.documentName === "Item" ? entity.parent : entity;

  switch (action.type) {
    case "macro": {
      const macroArgs = { actor, item: entity.documentName === "Item" ? entity : null, event, dieTotal, rolls, data };
      if ( counterKey ) {
        const rawKey = counterKey.startsWith("counters.") ? counterKey.slice(9) : counterKey;
        const counter = counters.getCounters(entity, rawKey);
        macroArgs.counterKey = rawKey;
        macroArgs.counterName = counter?.label ? game.i18n.localize(counter.label) : rawKey;
        macroArgs.counterValue = counterValue;
      }
      executeMacro(action.macroUuid, macroArgs);
      break;
    }
    case "playSound":
      playSound(action);
      break;
    case "applyCondition":
      conditionAction(actor, action, true);
      break;
    case "removeCondition":
      conditionAction(actor, action, false);
      break;
    case "toggleCondition":
      conditionAction(actor, action);
      break;
    case "rollTable":
      rollTable(action);
      break;
    case "distributeAward":
      distributeAward();
      break;
    case "requestRoll":
      requestRoll(actor, action);
      break;
    case "actorUpdate":
      actorUpdate(actor, action);
      break;
    case "tokenUpdate":
      tokenUpdate(actor, action);
      break;
    case "increase":
    case "decrease":
    case "set":
    case "check":
    case "uncheck":
    case "toggle":
      executeCounterAction(entity, action);
      break;
    case "destroy":
      destroyItem(entity);
      break;
    case "reduceQuantity":
      reduceItemQuantity(entity);
      break;
    case "equip":
      setItemEquipped(entity, true);
      break;
    case "unequip":
      setItemEquipped(entity, false);
      break;
    case "itemUpdate":
      itemUpdate(entity, action);
      break;
    case "enableWorkflow":
    case "disableWorkflow":
    case "toggleWorkflow":
      setWorkflowEnabled(entity, action);
      break;
  }
}

/* -------------------------------------------- */

/**
 * Enable, disable, or toggle a workflow's enabled state.
 * @param {Actor|Item} entity The entity.
 * @param {object} action The action.
 */
async function setWorkflowEnabled(entity, action) {
  const targetKey = action.workflowKey;
  if ( !targetKey ) return;

  const actor = entity.documentName === "Item" ? entity.parent : entity;
  if ( !actor ) return;

  // Check entity flags first
  const entityWorkflows = getFlag(actor, "triggers") || {};
  if ( entityWorkflows[targetKey] ) {
    const current = entityWorkflows[targetKey].enabled ?? true;
    let newValue;
    if ( action.type === "enableWorkflow" ) newValue = true;
    else if ( action.type === "disableWorkflow" ) newValue = false;
    else newValue = !current;
    await actor.setFlag(MODULE.ID, `triggers.${targetKey}.enabled`, newValue);
    Logger.debug(`${LOG_PREFIX} setWorkflowEnabled (entity)`, { actor: actor.name, targetKey, newValue });
    return;
  }

  // Fall back to world settings
  for ( const settingKey of [constants.SETTING.ACTOR_WORKFLOWS.KEY, constants.SETTING.ITEM_WORKFLOWS.KEY] ) {
    const setting = getSetting(settingKey) || {};
    if ( !setting[targetKey] ) continue;
    const current = setting[targetKey].enabled ?? true;
    let newValue;
    if ( action.type === "enableWorkflow" ) newValue = true;
    else if ( action.type === "disableWorkflow" ) newValue = false;
    else newValue = !current;
    const updated = foundry.utils.deepClone(setting);
    updated[targetKey].enabled = newValue;
    await setSetting(settingKey, updated);
    rebuild();
    Logger.debug(`${LOG_PREFIX} setWorkflowEnabled (world)`, { settingKey, targetKey, newValue });
    return;
  }

  Logger.debug(`${LOG_PREFIX} setWorkflowEnabled: workflow not found`, { targetKey });
}

/* -------------------------------------------- */

/**
 * Execute a counter modification action on an entity.
 * @param {Actor|Item} entity The entity.
 * @param {object} action The action.
 */
function executeCounterAction(entity, action) {
  const key = action.counterKey;
  if ( !key ) return;

  const type = (entity.documentName === "Actor") ? entity.type : "item";
  const settingKey = SETTING_BY_ENTITY_TYPE.COUNTERS[type];
  const counterSettings = getSetting(settingKey) || {};
  const counter = counterSettings[key] || (getFlag(entity, "counters") || {})[key];
  if ( !counter ) return;

  // Prefix with "counters." so counter functions store values at counters.{key}.value
  const counterKey = `counters.${key}`;

  switch (action.type) {
    case "increase":
      if ( counter.type === "fraction" ) counters.increaseFraction(entity, counterKey, action.actionValue);
      else counters.increaseNumber(entity, counterKey, action.actionValue);
      break;
    case "decrease":
      if ( counter.type === "fraction" ) counters.decreaseFraction(entity, counterKey, action.actionValue);
      else counters.decreaseNumber(entity, counterKey, action.actionValue);
      break;
    case "set":
      if ( counter.type === "fraction" ) counters.setFraction(entity, counterKey, action.actionValue);
      else counters.setNumber(entity, counterKey, action.actionValue);
      break;
    case "check":
      counters.checkCheckbox(entity, counterKey);
      break;
    case "uncheck":
      counters.uncheckCheckbox(entity, counterKey);
      break;
    case "toggle":
      counters.toggleCheckbox(entity, counterKey);
      break;
  }
}

/* -------------------------------------------- */

/**
 * Delete an item document.
 * @param {Item} item The item.
 */
async function destroyItem(item) {
  if ( item.documentName !== "Item" ) return;
  await item.delete();
}

/* -------------------------------------------- */

/**
 * Reduce an item's quantity by one.
 * @param {Item} item The item
 */
async function reduceItemQuantity(item) {
  if ( item.documentName !== "Item" ) return;
  const quantity = item.system.quantity ?? 0;
  await item.update({ "system.quantity": Math.max(quantity - 1, 0) });
}

/* -------------------------------------------- */

/**
 * Set an item's equipped state.
 * @param {Item} item The item.
 * @param {boolean} equipped Whether to equip or unequip.
 */
async function setItemEquipped(item, equipped) {
  if ( item.documentName !== "Item" ) return;
  if ( !("equipped" in (item.system ?? {})) ) return;
  await item.update({ "system.equipped": equipped });
}

/* -------------------------------------------- */

/**
 * Play a sound effect from an action.
 * @param {object} action The action with sound.path and sound.volume.
 */
function playSound(action) {
  if ( !action.sound?.path ) return;

  const volume = action.sound.volume ?? 0.8;
  AudioHelper.play({ src: action.sound.path, volume, autoplay: true, loop: false }, true);
}

/* -------------------------------------------- */

/**
 * Apply, remove, or toggle a status effect on an actor.
 * @param {Actor} actor The actor
 * @param {object} action The action.
 * @param {boolean} [active] Force active state, or toggle if omitted.
 */
function conditionAction(actor, action, active) {
  if ( !action.conditionId ) return;
  if ( action.conditionId === "all" ) {
    if ( active !== false ) return;
    for ( const statusId of new Set(actor.statuses) ) {
      actor.toggleStatusEffect(statusId, { active: false });
    }
    return;
  }
  actor.toggleStatusEffect(action.conditionId, { active });
}

/* -------------------------------------------- */

/**
 * Request a roll from an actor's player or execute locally.
 * @param {Actor} actor The actor.
 * @param {object} action The action.
 */
function requestRoll(actor, action) {
  if ( !action.roll?.type ) return;

  const [category, key] = action.roll.type.split(":");
  if ( !category || !key ) return;

  const rollConfig = { category, key };
  const dc = Number(action.roll?.dc);
  if ( Number.isFinite(dc) ) rollConfig.target = dc;
  if ( action.onSuccess ) rollConfig.onSuccess = action.onSuccess;
  if ( action.onFailure ) rollConfig.onFailure = action.onFailure;

  // Find an active player owner for this actor
  const owner = game.users.find(u => u.active && !u.isGM && actor.testUserPermission(u, "OWNER"));

  if ( owner ) {
    // Socket the roll to the owner's client
    game.socket.emit(`module.${MODULE.ID}`, {
      action: "requestRoll",
      options: { actorUuid: actor.uuid, rollConfig }
    });
  } else {
    // No active player owner — execute locally (e.g., GM-owned NPC)
    executeRequestedRoll(actor, rollConfig);
  }
}

/* -------------------------------------------- */

/**
 * Execute a requested roll on an actor.
 * @param {Actor} actor The actor.
 * @param {object} rollConfig The roll config.
 */
export function executeRequestedRoll(actor, rollConfig) {
  const { category, key, target, onSuccess, onFailure } = rollConfig;
  const config = {};
  if ( Number.isFinite(target) ) config.target = target;

  const options = {};
  if ( onSuccess ) options.workflowOnSuccess = onSuccess;
  if ( onFailure ) options.workflowOnFailure = onFailure;
  if ( Object.keys(options).length ) {
    config.rolls = [{ options }];
  }

  switch (category) {
    case "save":
      actor.rollSavingThrow({ ...config, ability: key });
      break;
    case "check":
      actor.rollAbilityCheck({ ...config, ability: key });
      break;
    case "skill":
      actor.rollSkill({ ...config, skill: key });
      break;
  }
}

/* -------------------------------------------- */

/**
 * Roll on a RollTable from an action.
 * @param {object} action The action.
 */
async function rollTable(action) {
  if ( !action.tableUuid ) return;

  const table = await fromUuid(action.tableUuid);
  if ( !table ) {
    Logger.error(`Rollable table not found: ${action.tableUuid}`, true);
    return;
  }

  await table.draw();
}

/* -------------------------------------------- */

/** Open the Distribute Award form. */
function distributeAward() {
  new dnd5e.applications.Award({ award: { currency: null, xp: null, each: false } }).render({ force: true });
}

/* -------------------------------------------- */

/**
 * Update an actor document with a key/value pair.
 * @param {Actor} actor The actor.
 * @param {object} action The action.
 */
function actorUpdate(actor, action) {
  if ( !action.updatePath || action.updateValue === undefined ) return;
  actor.update({ [action.updatePath]: coerceValue(action.updateValue) });
}

/* -------------------------------------------- */

/**
 * Update an actor's token document with a key/value pair.
 * @param {Actor} actor The actor.
 * @param {object} action The action.
 */
function tokenUpdate(actor, action) {
  if ( !action.updatePath || action.updateValue === undefined ) return;
  const token = actor?.isToken ? actor.token : actor?.getActiveTokens()[0];
  if ( !token ) return;
  token.document.update({ [action.updatePath]: coerceValue(action.updateValue) });
}

/* -------------------------------------------- */

/**
 * Update an item document with a key/value pair.
 * @param {Item} item The item.
 * @param {object} action The action.
 */
function itemUpdate(item, action) {
  if ( item.documentName !== "Item" ) return;
  if ( !action.updatePath || action.updateValue === undefined ) return;
  item.update({ [action.updatePath]: coerceValue(action.updateValue) });
}

/* -------------------------------------------- */
/*  Request Roll Result Handling                */
/* -------------------------------------------- */

/**
 * Process success/failure actions after a requested roll resolves.
 * @param {D20Roll[]} rolls The rolls.
 * @param {Actor} actor The actor.
 */
function handleRequestRollResult(rolls, actor) {
  const options = rolls[0]?.options;
  if ( !options?.workflowOnSuccess && !options?.workflowOnFailure ) return;

  const dc = options.target;
  const rollTotal = rolls[0]?.total;
  if ( rollTotal == null || dc == null ) return;

  const isSuccess = rollTotal >= dc;
  const actions = isSuccess ? options.workflowOnSuccess : options.workflowOnFailure;
  if ( !actions ) return;

  Logger.debug(`${LOG_PREFIX} handleRequestRollResult`,
    { actor: actor.name, rollTotal, dc, isSuccess, actionCount: Object.keys(actions).length }
  );

  executeWorkflowActions(actions, { entity: actor });
}

/* -------------------------------------------- */
/*  Hook Handlers                               */
/* -------------------------------------------- */

/**
 * Create a handler for D20 roll hooks (actor from data.subject, dieTotal from terms[0]).
 * @param {string} eventName The event name.
 * @returns {Function} The hook handler function.
 */
function makeD20RollHandler(eventName) {
  return function(rolls, data) {
    const actor = data.subject;
    if ( !actor?.isOwner ) return;
    const dieTotal = rolls[0]?.terms[0]?.total;
    handleRequestRollResult(rolls, actor);
    processEvent(eventName, { actor, dieTotal, rolls, data });
  };
}

const handleRollAbilityCheck = makeD20RollHandler("rollAbilityCheck");
const handleRollSavingThrow = makeD20RollHandler("rollSavingThrow");
const handleRollSkill = makeD20RollHandler("rollSkill");
const handleRollToolCheck = makeD20RollHandler("rollToolCheck");
const handleRollConcentration = makeD20RollHandler("rollConcentration");
const handleRollDeathSave = makeD20RollHandler("rollDeathSave");

/* -------------------------------------------- */

/**
 * Handle attack roll triggers (actor from data.subject.actor).
 * @param {Roll[]} rolls The rolls.
 * @param {object} data The hook data.
 */
function handleRollAttack(rolls, data) {
  const actor = data?.subject?.actor;
  if ( !actor?.isOwner ) return;
  const dieTotal = rolls[0]?.terms[0]?.total;
  processEvent("rollAttack", { actor, dieTotal, rolls, data });

  // Process item-level workflows
  const item = data?.subject?.item;
  if ( item ) {
    processItemEvent("rollAttack", { item, dieTotal, rolls, data });
  }
}

/* -------------------------------------------- */

/**
 * Handle initiative roll triggers.
 * @param {Actor} actor The actor.
 * @param {Collection} combatants The combatants.
 */
function handleRollInitiative(actor, combatants) {
  if ( !actor?.isOwner ) return;
  processEvent("rollInitiative", { actor, data: { combatants } });
}

/* -------------------------------------------- */

/**
 * Handle damage roll triggers (dieTotal from rolls[0].total).
 * @param {Roll[]} rolls The rolls.
 * @param {object} data The hook data.
 */
function handleRollDamage(rolls, data) {
  const actor = data?.subject?.actor;
  if ( !actor?.isOwner ) return;
  const dieTotal = rolls[0]?.total;
  processEvent("rollDamage", { actor, dieTotal, rolls, data });
}

/* -------------------------------------------- */

/**
 * Capture previous HP and counter values before an actor update.
 * @param {Actor} actor The actor.
 * @param {object} data The update data.
 * @param {object} options The update options.
 * @param {string} userId The triggering user ID.
 */
function handlePreUpdateActor(actor, data, options, userId) {
  if ( !actor.isOwner ) return;

  const newHp = foundry.utils.getProperty(data, "system.attributes.hp.value");
  if ( newHp === undefined ) return;

  const previousHp = actor.system.attributes.hp.value;
  Logger.debug(`${LOG_PREFIX} handlePreUpdateActor: capturing HP`, { actor: actor.name, previousHp, newHp });

  options.customDnd5ePreviousHp = previousHp;

  // Set zeroHpCombatEnd flag via update data (not setFlag) to avoid mid-update conflicts
  if ( newHp === 0 && previousHp > 0 && actor.inCombat ) {
    Logger.debug(`${LOG_PREFIX} handlePreUpdateActor: setting zeroHpCombatEnd flag via update data`, { actor: actor.name });
    foundry.utils.setProperty(data, "flags.custom-dnd5e.zeroHpCombatEnd", true);
  }
}

/* -------------------------------------------- */

/**
 * Fire startOfCombat event for all combatants.
 * @param {Combat} combat The combat.
 * @param {object} data The hook data.
 */
function handleCombatStart(combat, data) {
  Logger.debug(`${LOG_PREFIX} handleCombatStart`, { combatantCount: combat.combatants.size });
  combat.combatants.forEach(combatant => {
    const actor = combatant.actor;
    if ( actor?.isOwner ) {
      processEvent("startOfCombat", { actor, data });
    }
  });
}

/* -------------------------------------------- */

/**
 * Fire endOfCombat and zeroHpCombatEnd events on combat deletion.
 * @param {Combat} combat The combat.
 */
function handleDeleteCombat(combat) {
  Logger.debug(`${LOG_PREFIX} handleDeleteCombat`, { combatantCount: combat.combatants.size });
  combat.combatants.forEach(combatant => {
    const actor = combatant.actor;
    if ( actor?.isOwner ) {
      processEvent("endOfCombat", { actor });
      const hasZeroHpFlag = getFlag(actor, "zeroHpCombatEnd");
      Logger.debug(`${LOG_PREFIX} handleDeleteCombat: zeroHpCombatEnd flag`, { actor: actor.name, hasZeroHpFlag });
      if ( hasZeroHpFlag ) {
        processEvent("zeroHpCombatEnd", { actor });
        unsetFlag(actor, "zeroHpCombatEnd");
      }
    }
  });
}

/* -------------------------------------------- */

/**
 * Fire startOfTurn and endOfTurn events on combat round advancement.
 * @param {Combat} combat The combat.
 * @param {object} data The update data.
 * @param {object} options The update options.
 */
function handleUpdateCombat(combat, data, options) {
  Logger.debug(`${LOG_PREFIX} handleUpdateCombat`, { previousCombatantId: combat?.previous?.combatantId, currentCombatant: combat.combatant?.actor?.name });
  if ( combat?.previous?.combatantId ) {
    const previousActor = combat.combatants.get(combat.previous.combatantId)?.actor;
    if ( previousActor?.isOwner ) {
      processEvent("endOfTurn", { actor: previousActor, data });
    }
  }

  const actor = combat.combatant?.actor;
  if ( actor?.isOwner ) {
    processEvent("startOfTurn", { actor, data });
  }
}

/* -------------------------------------------- */

/**
 * Handle rest completion events for an actor.
 * @param {Actor} actor The actor.
 * @param {object} result The result data.
 */
function handleRest(actor, result) {
  const restType = result.type === "long" ? "longRest" : "shortRest";
  Logger.debug(`${LOG_PREFIX} handleRest`, { actor: actor.name, restType });
  processEvent(restType, { actor, data: result });
}

/* -------------------------------------------- */

/**
 * Handle rest completion events for a group actor.
 * @param {Actor} actor The actor.
 * @param {object} config The rest config.
 */
function handleGroupRest(actor, config) {
  if ( actor.type !== "group" ) return;
  const eventType = config.type === "long" ? "longRest" : "shortRest";
  Logger.debug(`${LOG_PREFIX} handleGroupRest`, { group: actor.name, eventType });
  processEvent(eventType, { actor, data: config });
}

/* -------------------------------------------- */

/**
 * Fire HP and counter events after an actor update.
 * @param {Actor} actor The actor.
 * @param {object} data The update data.
 * @param {object} options The update options.
 * @param {string} userId The triggering user ID.
 */
function handleUpdateActor(actor, data, options, userId) {
  if ( !actor.isOwner ) return;

  // Fire HP-based events (deferred from preUpdateActor)
  const previousHp = options.customDnd5ePreviousHp;
  if ( previousHp !== undefined ) {
    const currentHp = actor.system.attributes.hp.value;
    const maxHp = actor?.system?.attributes?.hp?.effectiveMax ?? actor?.system?.attributes?.hp?.max ?? 0;
    const halfHp = maxHp * 0.5;

    Logger.debug(`${LOG_PREFIX} handleUpdateActor: HP events`, { actor: actor.name, previousHp, currentHp });

    if ( currentHp === 0 && previousHp > 0 ) {
      processEvent("zeroHp", { actor, data });
    }
    if ( currentHp <= halfHp && previousHp > halfHp ) {
      processEvent("halfHp", { actor, data });
    }
    if ( currentHp < previousHp ) {
      processEvent("loseHp", { actor, dieTotal: previousHp - currentHp, data });
    }
    if ( currentHp > previousHp ) {
      processEvent("gainHp", { actor, dieTotal: currentHp - previousHp, data });
    }
  }

  // Counter-based events
  if ( !counters.hasDataChanged(data) ) return;

  const settingKey = SETTING_BY_ENTITY_TYPE.COUNTERS[actor.type];
  if ( !settingKey ) return;
  const merged = counters.mergeCounters(actor, settingKey);
  if ( !merged ) return;

  Logger.debug(`${LOG_PREFIX} handleUpdateActor: counter events`, { actor: actor.name, counterCount: Object.keys(merged).length });
  const previousCounterValues = options.customDnd5ePreviousCounterValues;

  for ( const [counterKey, counter] of Object.entries(merged) ) {
    if ( ["fraction", "number", "pips"].includes(counter.type) ) {
      const value = counters.getCounterValue(data, counterKey);
      if ( value !== null && value !== undefined ) {
        processEvent("counterValue", { actor, data, counterKey, counterValue: value });
        if ( previousCounterValues ) {
          const oldValue = previousCounterValues[counterKey] ?? 0;
          if ( value > oldValue ) processEvent("counterValueIncrease", { actor, data, counterKey, counterValue: value });
          if ( value < oldValue ) processEvent("counterValueDecrease", { actor, data, counterKey, counterValue: value });
        }
      }
    }
    if ( counter.type === "checkbox" ) {
      const value = counters.getCounterValue(data, counterKey);
      if ( value === true ) processEvent("checked", { actor, data, counterKey, counterValue: value });
      if ( value === false ) processEvent("unchecked", { actor, data, counterKey, counterValue: value });
    }
    if ( counter.type === "successFailure" ) {
      const sv = counters.getSuccessFailureValue(data, counterKey, "success");
      if ( sv !== null ) processEvent("successValue", { actor, data, counterKey, counterValue: sv });
      const fv = counters.getSuccessFailureValue(data, counterKey, "failure");
      if ( fv !== null ) processEvent("failureValue", { actor, data, counterKey, counterValue: fv });
    }
  }
}

/* -------------------------------------------- */

/**
 * Fire equip/counter events after an item update.
 * @param {Item} item The item.
 * @param {object} data The update data.
 * @param {object} options The update options.
 * @param {string} userId The triggering user ID.
 */
function handleUpdateItem(item, data, options, userId) {
  if ( !item.isOwner ) return;

  // Check for equipped state changes
  if ( foundry.utils.hasProperty(data, "system.equipped") ) {
    const event = data.system.equipped ? "equip" : "unequip";
    processItemEvent(event, { item, data });
    const actor = item.parent;
    if ( actor?.documentName === "Actor" ) {
      processEvent(event, { actor });
    }
  }

  // Counter changes
  if ( !counters.hasDataChanged(data) ) return;

  const merged = counters.mergeCounters(item, SETTING_BY_ENTITY_TYPE.COUNTERS.item);
  if ( !merged ) return;

  Logger.debug(`${LOG_PREFIX} handleUpdateItem`, { item: item.name, counterCount: Object.keys(merged).length });
  const previousCounterValues = options.customDnd5ePreviousCounterValues;

  for ( const [counterKey, counter] of Object.entries(merged) ) {
    if ( ["fraction", "number", "pips"].includes(counter.type) ) {
      const value = counters.getCounterValue(data, counterKey);
      if ( value !== null && value !== undefined ) {
        processItemEvent("counterValue", { item, data, counterKey, counterValue: value });
        if ( previousCounterValues ) {
          const oldValue = previousCounterValues[counterKey] ?? 0;
          if ( value > oldValue ) processItemEvent("counterValueIncrease", { item, data, counterKey, counterValue: value });
          if ( value < oldValue ) processItemEvent("counterValueDecrease", { item, data, counterKey, counterValue: value });
        }
      }
    }
    if ( counter.type === "checkbox" ) {
      const value = counters.getCounterValue(data, counterKey);
      if ( value === true ) processItemEvent("checked", { item, data, counterKey, counterValue: value });
      if ( value === false ) processItemEvent("unchecked", { item, data, counterKey, counterValue: value });
    }
    if ( counter.type === "successFailure" ) {
      const sv = counters.getSuccessFailureValue(data, counterKey, "success");
      if ( sv !== null ) processItemEvent("successValue", { item, data, counterKey, counterValue: sv });
      const fv = counters.getSuccessFailureValue(data, counterKey, "failure");
      if ( fv !== null ) processItemEvent("failureValue", { item, data, counterKey, counterValue: fv });
    }
  }
}

/* -------------------------------------------- */

/**
 * Resolve the Actor targeted by an ActiveEffect.
 * Uses the built-in target getter which handles effects on Actors directly
 * and transfer effects on Items owned by Actors.
 * @param {ActiveEffect} effect The active effect.
 * @returns {Actor|null} The target actor, or null.
 */
function getEffectActor(effect) {
  const target = effect.target;
  return (target?.documentName === "Actor") ? target : null;
}

/**
 * Handle active effect creation — fire condition and effect events.
 * @param {ActiveEffect} effect The created effect.
 * @param {object} options Hook options.
 * @param {string} userId The triggering user ID.
 */
function handleCreateActiveEffect(effect, options, userId) {
  const actor = getEffectActor(effect);
  if ( !actor || !actor.isOwner ) return;
  // Fire condition events for status effects
  for ( const statusId of effect.statuses ) {
    processEvent("conditionApplied", { actor, conditionId: statusId });
  }
  // Fire effect event if effect is not disabled
  if ( !effect.disabled && effect.name ) {
    processEvent("effectEnabled", { actor, effectName: effect.name });
  }
}

/**
 * Handle active effect deletion — fire condition and effect events.
 * @param {ActiveEffect} effect The deleted effect.
 * @param {object} options Hook options.
 * @param {string} userId The triggering user ID.
 */
function handleDeleteActiveEffect(effect, options, userId) {
  const actor = getEffectActor(effect);
  if ( !actor || !actor.isOwner ) return;
  // Fire condition events for status effects
  for ( const statusId of effect.statuses ) {
    processEvent("conditionRemoved", { actor, conditionId: statusId });
  }
  // Fire effect event if effect was not disabled
  if ( !effect.disabled && effect.name ) {
    processEvent("effectDisabled", { actor, effectName: effect.name });
  }
}

/**
 * Handle active effect update — fire effect enabled/disabled on toggle.
 * @param {ActiveEffect} effect The effect.
 * @param {object} changes The changes.
 * @param {object} options Hook options.
 * @param {string} userId The triggering user ID.
 */
function handleUpdateActiveEffect(effect, changes, options, userId) {
  if ( !("disabled" in (changes ?? {})) ) return;
  const actor = getEffectActor(effect);
  if ( !actor || !actor.isOwner ) return;
  if ( !effect.name ) return;
  const eventName = changes.disabled ? "effectDisabled" : "effectEnabled";
  processEvent(eventName, { actor, effectName: effect.name });
}

/* -------------------------------------------- */
/*  Event-to-Hook Mapping                       */
/* -------------------------------------------- */

const EVENT_TO_HOOK = {
  rollAttack: "dnd5e.rollAttack",
  rollAbilityCheck: "dnd5e.rollAbilityCheck",
  rollSavingThrow: "dnd5e.rollSavingThrow",
  rollSkill: "dnd5e.rollSkill",
  rollToolCheck: "dnd5e.rollToolCheck",
  rollInitiative: "dnd5e.rollInitiative",
  rollConcentration: "dnd5e.rollConcentration",
  rollDeathSave: "dnd5e.postRollDeathSave",
  rollDamage: "dnd5e.rollDamage",
  zeroHp: "updateActor",
  halfHp: "updateActor",
  loseHp: "updateActor",
  gainHp: "updateActor",
  startOfCombat: "combatStart",
  endOfCombat: "deleteCombat",
  zeroHpCombatEnd: "deleteCombat",
  startOfTurn: "updateCombat",
  endOfTurn: "updateCombat",
  shortRest: "dnd5e.restCompleted",
  longRest: "dnd5e.restCompleted",
  counterValue: "updateActor",
  counterValueIncrease: "updateActor",
  counterValueDecrease: "updateActor",
  checked: "updateActor",
  unchecked: "updateActor",
  successValue: "updateActor",
  failureValue: "updateActor",
  conditionApplied: "createActiveEffect",
  conditionRemoved: "deleteActiveEffect",
  effectEnabled: "createActiveEffect",
  effectDisabled: "deleteActiveEffect",
  equip: "updateItem",
  unequip: "updateItem"
};

/** Mapping from item counter events to the item hook. */
const ITEM_EVENT_TO_HOOK = {
  counterValue: "updateItem",
  counterValueIncrease: "updateItem",
  counterValueDecrease: "updateItem",
  checked: "updateItem",
  unchecked: "updateItem",
  successValue: "updateItem",
  failureValue: "updateItem",
  rollAttack: "dnd5e.rollAttack",
  equip: "updateItem",
  unequip: "updateItem"
};

/** Mapping from requestRoll category to the event key used for hook registration. */
const ROLL_CATEGORY_TO_EVENT = {
  save: "rollSavingThrow",
  check: "rollAbilityCheck",
  skill: "rollSkill"
};

const HP_EVENTS = ["zeroHp", "halfHp", "loseHp", "gainHp", "zeroHpCombatEnd"];
const REST_EVENTS = ["shortRest", "longRest"];

const HOOK_HANDLERS = {
  "dnd5e.rollAttack": handleRollAttack,
  "dnd5e.rollAbilityCheck": handleRollAbilityCheck,
  "dnd5e.rollSavingThrow": handleRollSavingThrow,
  "dnd5e.rollSkill": handleRollSkill,
  "dnd5e.rollToolCheck": handleRollToolCheck,
  "dnd5e.rollInitiative": handleRollInitiative,
  "dnd5e.rollConcentration": handleRollConcentration,
  "dnd5e.postRollDeathSave": handleRollDeathSave,
  "dnd5e.rollDamage": handleRollDamage,
  preUpdateActor: handlePreUpdateActor,
  combatStart: handleCombatStart,
  deleteCombat: handleDeleteCombat,
  updateCombat: handleUpdateCombat,
  "dnd5e.restCompleted": handleRest,
  "dnd5e.longRest": handleGroupRest,
  "dnd5e.shortRest": handleGroupRest,
  updateActor: handleUpdateActor,
  updateItem: handleUpdateItem,
  createActiveEffect: handleCreateActiveEffect,
  deleteActiveEffect: handleDeleteActiveEffect,
  updateActiveEffect: handleUpdateActiveEffect
};

/* -------------------------------------------- */
/*  Event-Indexed Registry                      */
/* -------------------------------------------- */

/**
 * Test whether a workflow's triggers match a given event.
 * @param {object} workflow The workflow.
 * @param {string} event The event name.
 * @param {object} [options] The options.
 * @param {number|null} [options.dieTotal] The die total.
 * @param {Roll[]|null} [options.rolls] The rolls.
 * @param {string|null} [options.counterKey] The counter key.
 * @param {number|null} [options.counterValue] The counter value.
 * @param {string|null} [options.conditionId] The condition ID.
 * @param {Actor|null} [options.actor] The actor.6a6
 * @param {string|null} [options.rollSubtype] The roll subtype key.
 * @param {string|null} [options.effectName] The effect name.
 * @returns {boolean} Whether any trigger matched.
 */
function workflowMatchesEvent(workflow, event, {
  dieTotal = null, rolls = null, counterKey = null, counterValue = null,
  conditionId = null, actor = null, rollSubtype = null, effectName = null
} = {}) {
  const triggers = workflow.triggers || {};
  for ( const trigger of Object.values(triggers) ) {
    if ( trigger.event !== event ) continue;

    // Roll subtype triggers must match the specific ability/skill/tool
    if ( trigger.rollSubtype && trigger.rollSubtype !== rollSubtype ) continue;

    // Condition triggers must match the conditionId
    if ( trigger.conditionId && trigger.conditionId !== conditionId ) continue;

    // Effect triggers must match the effectName (case-insensitive)
    if ( trigger.effectName && (!effectName || trigger.effectName.toLowerCase() !== effectName.toLowerCase()) ) {
      continue;
    }

    // Counter triggers must match the counterKey (normalize both to raw key for comparison)
    if ( trigger.counterKey ) {
      const rawTrigger = trigger.counterKey.startsWith("counters.") ? trigger.counterKey.slice(9) : trigger.counterKey;
      const rawCounter = counterKey?.startsWith("counters.") ? counterKey.slice(9) : counterKey;
      if ( rawTrigger !== rawCounter ) {
        Logger.debug(`${LOG_PREFIX} workflowMatchesEvent: counterKey mismatch`, { expected: trigger.counterKey, actual: counterKey });
        continue;
      }
    }

    // Check success/failure result filter
    if ( trigger.result === "success" || trigger.result === "failure" ) {
      const rollTotal = rolls?.[0]?.total;
      const dc = rolls?.[0]?.options?.target;
      if ( rollTotal == null || dc == null ) continue;
      const isSuccess = rollTotal >= dc;
      if ( trigger.result === "success" && !isSuccess ) continue;
      if ( trigger.result === "failure" && isSuccess ) continue;
    }

    // Check margin-based result filters (within N / by N or more)
    if ( ["successWithin", "failureWithin", "successBy", "failureBy"].includes(trigger.result) ) {
      const rollTotal = rolls?.[0]?.total;
      const dc = rolls?.[0]?.options?.target;
      if ( rollTotal == null || dc == null ) continue;
      const isSuccess = rollTotal >= dc;
      const isSuccessResult = trigger.result === "successWithin" || trigger.result === "successBy";
      if ( isSuccessResult && !isSuccess ) continue;
      if ( !isSuccessResult && isSuccess ) continue;
      const margin = Math.abs(rollTotal - dc);
      const threshold = Number(trigger.value);
      if ( isNaN(threshold) ) continue;
      const isWithin = trigger.result === "successWithin" || trigger.result === "failureWithin";
      if ( isWithin && margin > threshold ) continue;
      if ( !isWithin && margin < threshold ) continue;
      Logger.debug(`${LOG_PREFIX} workflowMatchesEvent: matched (margin)`, { event, rollTotal, dc, margin, threshold, result: trigger.result });
      return true;
    }

    // If no value condition, the trigger matches on event alone
    if ( trigger.value === undefined || trigger.value === "" || trigger.value === null ) {
      Logger.debug(`${LOG_PREFIX} workflowMatchesEvent: matched (no value condition)`, { event, triggerEvent: trigger.event });
      return true;
    }

    // Determine actual value for comparison
    const isCounterValueTrigger = ["counterValue", "successValue", "failureValue"].includes(trigger.event);
    const actualValue = isCounterValueTrigger ? counterValue : dieTotal;
    const targetValue = (typeof trigger.value === "string" && trigger.value.startsWith("@"))
      ? counters.resolveTriggerValue(actor, trigger.value) : Number(trigger.value);

    const result = compareValues(actualValue, trigger.operator, targetValue);
    Logger.debug(`${LOG_PREFIX} workflowMatchesEvent: value comparison`, { event, actualValue, operator: trigger.operator, targetValue, result });
    if ( result ) {
      return true;
    }
  }
  return false;
}

/* -------------------------------------------- */

/**
 * Process a workflow event against world and actor-level workflows.
 * @param {string} event The event name.
 * @param {object} options The options.
 * @param {Actor} options.actor The actor.
 * @param {number|null} [options.dieTotal] The die total.
 * @param {Roll[]|null} [options.rolls] The rolls.
 * @param {object|null} [options.data] Additional hook data.
 * @param {string|null} [options.counterKey] The counter key.
 * @param {number|null} [options.counterValue] The counter value.
 * @param {string|null} [options.conditionId] The condition ID.
 * @param {string|null} [options.effectName] The effect name.
 */
function processEvent(event, {
  actor,
  dieTotal = null,
  rolls = null,
  data = null,
  counterKey = null,
  counterValue = null,
  conditionId = null,
  effectName = null
}) {
  if ( !actor ) return;

  // Derive roll subtype from hook data (ability/skill/tool)
  const rollSubtype = data?.ability || data?.skill || data?.tool || null;

  Logger.debug(`${LOG_PREFIX} processEvent`, { actor: actor.name, event, dieTotal, counterKey, counterValue, rollSubtype });

  // World workflows
  const worldWorkflows = eventIndex.get(event) || [];

  // Per-actor workflows
  const actorWorkflowsObj = (actor?.documentName === "Actor") ? (getFlag(actor, "triggers") || {}) : {};
  Logger.debug(`${LOG_PREFIX} Entity workflows found`, { actor: actor.name, count: Object.keys(actorWorkflowsObj).length, keys: Object.keys(actorWorkflowsObj) });
  const actorWorkflows = Object.values(actorWorkflowsObj).filter(g => {
    if ( !g.visible && g.visible !== undefined ) return false;
    if ( g.enabled === false ) return false;
    // Check if any trigger in this workflow matches the event
    const triggers = g.triggers || {};
    return Object.values(triggers).some(t => t.event === event);
  });
  Logger.debug(`${LOG_PREFIX} Entity workflows matching event`, { event, matchCount: actorWorkflows.length });

  const combined = [...worldWorkflows, ...actorWorkflows];
  if ( !combined.length ) return;

  for ( const workflow of combined ) {
    // Check actor type filter (only for world workflows that have actorTypes set)
    if ( workflow.actorTypes?.length && !workflow.actorTypes.includes(actor.type) ) continue;

    // OR logic: check if any trigger condition in this workflow matches
    const matches = workflowMatchesEvent(
      workflow, event, { dieTotal, rolls, counterKey, counterValue, conditionId, actor, rollSubtype, effectName }
    );
    Logger.debug(`${LOG_PREFIX} Workflow match result`, { name: workflow.name, event, matches });
    if ( !matches ) continue;

    // Execute ALL actions in the workflow — resolve group members if target is "members"
    const actions = workflow.actions || {};
    if ( workflow.target === "members" && actor.type === "group" && actor.system?.members ) {
      for ( const { actor: memberActor } of actor.system.members ) {
        if ( !memberActor ) continue;
        executeWorkflowActions(actions, { entity: memberActor, event, dieTotal, rolls, data, counterKey, counterValue });
      }
    } else {
      executeWorkflowActions(actions, { entity: actor, event, dieTotal, rolls, data, counterKey, counterValue });
    }
  }

  Logger.debug(`${LOG_PREFIX} processEvent complete`);
}

/* -------------------------------------------- */

/**
 * Process a workflow event against world and item-level workflows.
 * @param {string} event The event name.
 * @param {object} options The options.
 * @param {Item} options.item The item.
 * @param {object|null} [options.data] Additional hook data.
 * @param {string|null} [options.counterKey] The counter key.
 * @param {number|null} [options.counterValue] The counter value.
 * @param {number|null} [options.dieTotal] The die total.
 * @param {Roll[]|null} [options.rolls] The rolls.
 * @param {string|null} [options.rollSubtype] The roll subtype.
 */
function processItemEvent(event, { item, data = null, counterKey = null, counterValue = null,
  dieTotal = null, rolls = null, rollSubtype = null }) {
  if ( !item ) return;

  Logger.debug(`${LOG_PREFIX} processItemEvent`, { item: item.name, event, counterKey, counterValue });

  // World item workflows
  const worldWorkflows = itemEventIndex.get(event) || [];

  // Per-item workflows from flags
  const itemWorkflowsObj = getFlag(item, "triggers") || {};
  const itemWorkflows = Object.values(itemWorkflowsObj).filter(g => {
    if ( !g.visible && g.visible !== undefined ) return false;
    if ( g.enabled === false ) return false;
    const triggers = g.triggers || {};
    return Object.values(triggers).some(t => t.event === event);
  });

  const combined = [...worldWorkflows, ...itemWorkflows];
  if ( !combined.length ) return;

  for ( const workflow of combined ) {
    // OR logic: check if any trigger condition in this workflow matches
    if ( !workflowMatchesEvent(workflow, event, {
      counterKey,
      counterValue,
      actor: item,
      dieTotal,
      rolls,
      rollSubtype
    }) ) continue;

    // Execute ALL actions in the workflow
    const actions = workflow.actions || {};
    executeWorkflowActions(actions, { entity: item, event, data, counterKey, counterValue });
  }

  Logger.debug(`${LOG_PREFIX} processItemEvent complete`);
}

/* -------------------------------------------- */

/**
 * Collect hook events needed for requestRoll result handling.
 * @param {object} workflows The workflows.
 * @returns {Set<string>} Event names that need hooks.
 */
function collectRequestRollEvents(workflows) {
  const events = new Set();
  for ( const workflow of Object.values(workflows) ) {
    if ( !workflow.visible && workflow.visible !== undefined ) continue;
    if ( workflow.enabled === false ) continue;
    const actions = workflow.actions || {};
    for ( const action of Object.values(actions) ) {
      if ( action.type !== "requestRoll" ) continue;
      if ( !action.onSuccess && !action.onFailure ) continue;
      if ( !action.roll?.type ) continue;
      const [category] = action.roll.type.split(":");
      const event = ROLL_CATEGORY_TO_EVENT[category];
      if ( event ) events.add(event);
    }
  }
  return events;
}

/* -------------------------------------------- */

/**
 * Index visible workflows into a Map keyed by trigger event type.
 * @param {object} workflows The workflows.
 * @param {Map} index The target event index map.
 */
function indexWorkflows(workflows, index) {
  for ( const workflow of Object.values(workflows) ) {
    if ( !workflow.visible && workflow.visible !== undefined ) continue;
    if ( workflow.enabled === false ) continue;
    const triggers = workflow.triggers || {};
    const events = new Set();
    for ( const trigger of Object.values(triggers) ) {
      if ( trigger.event ) events.add(trigger.event);
    }
    for ( const event of events ) {
      if ( !index.has(event) ) index.set(event, []);
      index.get(event).push(workflow);
    }
  }
}

/* -------------------------------------------- */

/** Rebuild the event index and synchronize hooks. */
export function rebuild() {
  Logger.debug(`${LOG_PREFIX} rebuild`);
  eventIndex.clear();
  itemEventIndex.clear();

  if ( !getSetting(constants.SETTING.ENABLE.KEY) ) {
    for ( const [hookName, hookId] of hookIds ) {
      Hooks.off(hookName, hookId);
    }
    hookIds.clear();
    return;
  }

  const worldWorkflows = getSetting(constants.SETTING.ACTOR_WORKFLOWS.KEY) || {};
  indexWorkflows(worldWorkflows, eventIndex);

  const worldItemWorkflows = getSetting(constants.SETTING.ITEM_WORKFLOWS.KEY) || {};
  indexWorkflows(worldItemWorkflows, itemEventIndex);

  // Collect active event types from world workflows
  const activeEvents = new Set(eventIndex.keys());

  // Add item event hooks
  const activeItemEvents = new Set(itemEventIndex.keys());

  // Scan game.actors for per-actor trigger events
  if ( game.actors ) {
    for ( const actor of game.actors ) {
      const actorWorkflows = getFlag(actor, "triggers");
      if ( !actorWorkflows ) continue;
      for ( const workflow of Object.values(actorWorkflows) ) {
        if ( !workflow.visible && workflow.visible !== undefined ) continue;
        if ( workflow.enabled === false ) continue;
        const triggers = workflow.triggers || {};
        for ( const trigger of Object.values(triggers) ) {
          if ( trigger.event ) activeEvents.add(trigger.event);
        }
      }
    }
  }

  // Ensure roll hooks are registered for requestRoll actions with onSuccess/onFailure
  // so handleRequestRollResult can fire after the requested roll completes.
  for ( const event of collectRequestRollEvents(worldWorkflows) ) {
    activeEvents.add(event);
  }
  if ( game.actors ) {
    for ( const actor of game.actors ) {
      const actorWorkflows = getFlag(actor, "triggers");
      if ( actorWorkflows ) {
        for ( const event of collectRequestRollEvents(actorWorkflows) ) {
          activeEvents.add(event);
        }
      }
    }
  }

  syncHooks(activeEvents, activeItemEvents);
}

/* -------------------------------------------- */

/**
 * Synchronize registered hooks to match the active event set.
 * @param {Set<string>} activeEvents The actor active events.
 * @param {Set<string>} [activeItemEvents] The active item events.
 */
function syncHooks(activeEvents, activeItemEvents = new Set()) {
  const neededHooks = new Set();
  for ( const event of activeEvents ) {
    const hookName = EVENT_TO_HOOK[event];
    if ( hookName ) neededHooks.add(hookName);
  }
  for ( const event of activeItemEvents ) {
    const hookName = ITEM_EVENT_TO_HOOK[event];
    if ( hookName ) neededHooks.add(hookName);
  }

  // HP events and zeroHpCombatEnd require preUpdateActor to capture previous HP / set flag
  if ( HP_EVENTS.some(e => activeEvents.has(e)) ) {
    neededHooks.add("preUpdateActor");
  }

  // Rest events also require dnd5e.longRest/shortRest hooks for group actors
  if ( REST_EVENTS.some(e => activeEvents.has(e)) ) {
    neededHooks.add("dnd5e.longRest");
    neededHooks.add("dnd5e.shortRest");
  }

  // Effect events also require updateActiveEffect for enable/disable toggle
  const EFFECT_EVENTS = ["effectEnabled", "effectDisabled"];
  if ( EFFECT_EVENTS.some(e => activeEvents.has(e)) ) {
    neededHooks.add("updateActiveEffect");
  }

  for ( const [hookName, hookId] of hookIds ) {
    if ( !neededHooks.has(hookName) ) {
      Hooks.off(hookName, hookId);
      hookIds.delete(hookName);
    }
  }

  for ( const hookName of neededHooks ) {
    if ( !hookIds.has(hookName) ) {
      const handler = HOOK_HANDLERS[hookName];
      if ( handler ) {
        const id = Hooks.on(hookName, handler);
        hookIds.set(hookName, id);
      }
    }
  }
}

/* -------------------------------------------- */

/**
 * Ensure hooks are registered for all events in the given workflows.
 * @param {object} workflows The workflows.
 */
export function ensureEventHooks(workflows) {
  if ( !getSetting(constants.SETTING.ENABLE.KEY) ) return;
  if ( !workflows ) return;

  for ( const workflow of Object.values(workflows) ) {
    if ( !workflow.visible && workflow.visible !== undefined ) continue;
    if ( workflow.enabled === false ) continue;
    const triggers = workflow.triggers || {};

    for ( const trigger of Object.values(triggers) ) {
      if ( !trigger.event ) continue;

      const hookName = EVENT_TO_HOOK[trigger.event];
      if ( !hookName ) continue;

      if ( !hookIds.has(hookName) ) {
        const handler = HOOK_HANDLERS[hookName];
        if ( handler ) {
          const id = Hooks.on(hookName, handler);
          hookIds.set(hookName, id);
        }
      }

      if ( HP_EVENTS.includes(trigger.event) && !hookIds.has("preUpdateActor") ) {
        const preUpdateHandler = HOOK_HANDLERS.preUpdateActor;
        if ( preUpdateHandler ) {
          const id = Hooks.on("preUpdateActor", preUpdateHandler);
          hookIds.set("preUpdateActor", id);
        }
      }

      if ( REST_EVENTS.includes(trigger.event) ) {
        for ( const hookName of ["dnd5e.longRest", "dnd5e.shortRest"] ) {
          if ( !hookIds.has(hookName) ) {
            const handler = HOOK_HANDLERS[hookName];
            if ( handler ) {
              const id = Hooks.on(hookName, handler);
              hookIds.set(hookName, id);
            }
          }
        }
      }

      const EFFECT_EVENTS = ["effectEnabled", "effectDisabled"];
      if ( EFFECT_EVENTS.includes(trigger.event) && !hookIds.has("updateActiveEffect") ) {
        const updateEffectHandler = HOOK_HANDLERS.updateActiveEffect;
        if ( updateEffectHandler ) {
          const id = Hooks.on("updateActiveEffect", updateEffectHandler);
          hookIds.set("updateActiveEffect", id);
        }
      }
    }
  }

  for ( const event of collectRequestRollEvents(workflows) ) {
    const hookName = EVENT_TO_HOOK[event];
    if ( !hookName || hookIds.has(hookName) ) continue;
    const handler = HOOK_HANDLERS[hookName];
    if ( handler ) {
      const id = Hooks.on(hookName, handler);
      hookIds.set(hookName, id);
    }
  }
}

/* -------------------------------------------- */
/*  Public API                                  */
/* -------------------------------------------- */

/**
 * Find a workflow by key or name.
 * @param {string} identifier The workflow key or name.
 * @param {object} [options] Search options.
 * @param {Actor|Item|null} [options.entity] The entity.
 * @returns {object|null} The matching workflow or null.
 */
function findWorkflow(identifier, { entity = null } = {}) {
  // Search world actor workflows
  const worldActorWorkflows = getSetting(constants.SETTING.ACTOR_WORKFLOWS.KEY) || {};
  if ( worldActorWorkflows[identifier] ) return worldActorWorkflows[identifier];
  for ( const workflow of Object.values(worldActorWorkflows) ) {
    if ( workflow.name === identifier ) return workflow;
  }

  // Search world item workflows
  const worldItemWorkflows = getSetting(constants.SETTING.ITEM_WORKFLOWS.KEY) || {};
  if ( worldItemWorkflows[identifier] ) return worldItemWorkflows[identifier];
  for ( const workflow of Object.values(worldItemWorkflows) ) {
    if ( workflow.name === identifier ) return workflow;
  }

  // Search entity-level workflows
  if ( entity ) {
    const entityWorkflows = getFlag(entity, "triggers") || {};
    if ( entityWorkflows[identifier] ) return entityWorkflows[identifier];
    for ( const workflow of Object.values(entityWorkflows) ) {
      if ( workflow.name === identifier ) return workflow;
    }
  }

  return null;
}

/* -------------------------------------------- */

/**
 * Execute a workflow's actions on an entity.
 * @param {string} identifier The workflow key or name.
 * @param {Actor|Item} entity The entity.
 * @param {object} [options] The options.
 * @param {string} [options.event] The event name.
 * @returns {boolean} Whether the workflow was found and executed.
 */
function executeWorkflow(identifier, entity, { event = "macro" } = {}) {
  const workflow = findWorkflow(identifier, { entity });
  if ( !workflow ) {
    Logger.error(`${LOG_PREFIX} Workflow "${identifier}" not found`, true);
    return false;
  }

  const actions = workflow.actions || {};
  if ( workflow.target === "members" && entity.type === "group" && entity.system?.members ) {
    for ( const { actor: memberActor } of entity.system.members ) {
      if ( !memberActor ) continue;
      executeWorkflowActions(actions, { entity: memberActor, event });
    }
  } else {
    executeWorkflowActions(actions, { entity, event });
  }

  return true;
}

/* -------------------------------------------- */

/**
 * Get all workflow names from world and entity-level workflows.
 * @param {object} [options] The options.
 * @param {Actor|Item|null} [options.entity] The entity.
 * @returns {string[]} Array of workflow names.
 */
function getWorkflowNames({ entity = null } = {}) {
  const names = [];

  const worldActorWorkflows = getSetting(constants.SETTING.ACTOR_WORKFLOWS.KEY) || {};
  for ( const workflow of Object.values(worldActorWorkflows) ) {
    if ( workflow.name ) names.push(workflow.name);
  }

  const worldItemWorkflows = getSetting(constants.SETTING.ITEM_WORKFLOWS.KEY) || {};
  for ( const workflow of Object.values(worldItemWorkflows) ) {
    if ( workflow.name ) names.push(workflow.name);
  }

  if ( entity ) {
    const entityWorkflows = getFlag(entity, "triggers") || {};
    for ( const workflow of Object.values(entityWorkflows) ) {
      if ( workflow.name ) names.push(workflow.name);
    }
  }

  return names;
}

/* -------------------------------------------- */

/** Public API. */
export const workflows = {
  executeWorkflow,
  getWorkflowNames
};
