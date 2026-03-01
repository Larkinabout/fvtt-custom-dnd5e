import { CONSTANTS, SHEET_TYPE } from "../constants.js";
import { c5eLoadTemplates, getFlag, getSetting, Logger, registerMenu, registerSetting } from "../utils.js";
import { WorkflowsForm } from "../forms/workflows-form.js";
import { WorkflowsFormActor } from "../forms/workflows-form-actor.js";

const constants = CONSTANTS.WORKFLOWS;

/* -------------------------------------------- */
/*  Event-Indexed Registry State                */
/* -------------------------------------------- */

const eventIndex = new Map(); // eventType -> group[] (world groups, pre-indexed)
const hookIds = new Map(); // hookName -> hookId (currently registered hooks)

/* -------------------------------------------- */

/**
 * Register settings and hooks, and load templates.
 */
export function register() {
  registerSettings();
  Hooks.once("ready", rebuild);
  Hooks.on("renderActorSheetV2", addWorkflowsButton);

  const templates = Object.values(constants.TEMPLATE);
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
    constants.SETTING.WORKFLOWS.KEY,
    {
      scope: "world",
      config: false,
      type: Object,
      default: {}
    }
  );
}

/* -------------------------------------------- */

/**
 * Add a Workflows button to the Effects tab of actor sheets.
 * @param {object} app The application
 * @param {HTMLElement} html The rendered HTML
 * @param {object} data The render data
 */
function addWorkflowsButton(app, html, data) {
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

  tab.querySelector(".custom-dnd5e-workflows-button").addEventListener("click", (event) => {
    event.preventDefault();
    new WorkflowsFormActor(actor).render(true);
  });
}

/* -------------------------------------------- */

/**
 * Compare a value against a target using the given operator.
 * @param {number} value The current value
 * @param {string} operator The operator: "eq", "lt", "gt", "neq"
 * @param {number} target The target value
 * @returns {boolean} Whether the comparison is true
 */
function compareValues(value, operator, target) {
  const a = Number(value);
  const b = Number(target);
  if ( isNaN(a) || isNaN(b) ) return false;
  switch (operator) {
    case "lt": return a < b;
    case "gt": return a > b;
    case "neq": return a !== b;
    case "eq":
    default: return a === b;
  }
}

/* -------------------------------------------- */

/**
 * Execute an action from a trigger group.
 * @param {object} action The action configuration
 * @param {object} params The parameters
 * @param {Actor} params.actor The actor
 * @param {string} params.event The event type that fired
 * @param {number} [params.dieTotal=null] The d20/dice result
 * @param {object} [params.rolls=null] The raw roll data
 * @param {object} [params.data=null] Additional hook data
 */
function handleAction(action, { actor, event, dieTotal = null, rolls = null, data = null }) {
  Logger.debug("Handling trigger action...", { type: action.type });

  switch (action.type) {
    case "macro":
      executeMacro(actor, action, { event, dieTotal, rolls, data });
      break;
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
  }
}

/* -------------------------------------------- */

/**
 * Execute a macro from an action.
 * @param {Actor} actor The actor
 * @param {object} action The action configuration
 * @param {object} params Additional parameters
 * @param {string} params.event The event type that fired
 * @param {number} [params.dieTotal=null] The d20/dice result
 * @param {object} [params.rolls=null] The raw roll data
 * @param {object} [params.data=null] Additional hook data
 */
async function executeMacro(actor, action, { event, dieTotal = null, rolls = null, data = null }) {
  if ( !action.macroUuid ) return;

  const macro = await fromUuid(action.macroUuid);
  if ( !macro ) {
    Logger.error(`Trigger macro not found: ${action.macroUuid}`, true);
    return;
  }

  const token = actor?.isToken ? actor.token : actor?.getActiveTokens()[0];

  macro.execute({
    actor,
    token,
    event,
    dieTotal,
    rolls,
    data
  });
}

/* -------------------------------------------- */

/**
 * Play a sound from an action.
 * @param {object} action The action configuration
 */
function playSound(action) {
  if ( !action.soundPath ) return;

  const volume = action.soundVolume ?? 0.8;
  AudioHelper.play({ src: action.soundPath, volume, autoplay: true, loop: false }, true);
}

/* -------------------------------------------- */

/**
 * Apply, remove, or toggle a condition on an actor.
 * @param {Actor} actor The actor
 * @param {object} action The action configuration
 * @param {boolean} [active] True to apply, false to remove, undefined to toggle
 */
function conditionAction(actor, action, active) {
  if ( !action.conditionId ) return;
  actor.toggleStatusEffect(action.conditionId, { active });
}

/* -------------------------------------------- */

/**
 * Request a roll (saving throw, ability check, or skill check) from an actor.
 * @param {Actor} actor The actor
 * @param {object} action The action configuration
 */
function requestRoll(actor, action) {
  if ( !action.rollType ) return;

  const [category, key] = action.rollType.split(":");
  if ( !category || !key ) return;

  const config = {};
  const dc = Number(action.rollDc);
  if ( Number.isFinite(dc) ) config.target = dc;

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
 * Draw from a rollable table.
 * @param {object} action The action configuration
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

/**
 * Open the dnd5e Distribute Award form.
 */
function distributeAward() {
  new dnd5e.applications.Award({ award: { currency: null, xp: null, each: false } }).render({ force: true });
}

/* -------------------------------------------- */

/**
 * Update an actor property from an action.
 * @param {Actor} actor The actor
 * @param {object} action The action configuration
 */
function actorUpdate(actor, action) {
  if ( !action.updatePath || action.updateValue === undefined ) return;

  let value = action.updateValue;
  if ( value === "true" ) value = true;
  else if ( value === "false" ) value = false;
  else if ( !isNaN(Number(value)) && value !== "" ) value = Number(value);

  actor.update({ [action.updatePath]: value });
}

/* -------------------------------------------- */

/**
 * Update a token property from an action.
 * @param {Actor} actor The actor
 * @param {object} action The action configuration
 */
function tokenUpdate(actor, action) {
  if ( !action.updatePath || action.updateValue === undefined ) return;

  const token = actor?.isToken ? actor.token : actor?.getActiveTokens()[0];
  if ( !token ) return;

  let value = action.updateValue;
  if ( value === "true" ) value = true;
  else if ( value === "false" ) value = false;
  else if ( !isNaN(Number(value)) && value !== "" ) value = Number(value);

  token.document.update({ [action.updatePath]: value });
}

/* -------------------------------------------- */
/*  Hook Handlers                               */
/* -------------------------------------------- */

/**
 * Handle attack roll triggers.
 * Triggered by the 'dnd5e.rollAttack' hook.
 * @param {D20Roll[]} rolls The resulting rolls
 * @param {object} data The hook data
 * @param {Activity} data.subject Activity that performed the attack
 */
function handleRollAttack(rolls, data) {
  const actor = data?.subject?.actor;
  if ( !actor?.isOwner ) return;
  const dieTotal = rolls[0]?.terms[0]?.total;
  processEvent("rollAttack", { actor, dieTotal, rolls, data });
}

/* -------------------------------------------- */

/**
 * Handle ability check triggers.
 * Triggered by the 'dnd5e.rollAbilityCheck' hook.
 * @param {D20Roll[]} rolls The resulting rolls
 * @param {object} data The hook data
 * @param {string} data.ability ID of the ability that was rolled
 * @param {Actor5e} data.subject Actor for which the roll was performed
 */
function handleRollAbilityCheck(rolls, data) {
  const actor = data.subject;
  if ( !actor?.isOwner ) return;
  const dieTotal = rolls[0]?.terms[0]?.total;
  processEvent("rollAbilityCheck", { actor, dieTotal, rolls, data });
}

/* -------------------------------------------- */

/**
 * Handle saving throw triggers.
 * Triggered by the 'dnd5e.rollSavingThrow' hook.
 * @param {D20Roll[]} rolls The resulting rolls
 * @param {object} data The hook data
 * @param {string} data.ability ID of the ability that was rolled
 * @param {Actor5e} data.subject Actor for which the roll was performed
 */
function handleRollSavingThrow(rolls, data) {
  const actor = data.subject;
  if ( !actor?.isOwner ) return;
  const dieTotal = rolls[0]?.terms[0]?.total;
  processEvent("rollSavingThrow", { actor, dieTotal, rolls, data });
}

/* -------------------------------------------- */

/**
 * Handle skill check triggers.
 * Triggered by the 'dnd5e.rollSkill' hook.
 * @param {D20Roll[]} rolls The resulting rolls
 * @param {object} data The hook data
 * @param {string} data.skill ID of the skill that was rolled
 * @param {Actor5e} data.subject Actor for which the roll was performed
 */
function handleRollSkill(rolls, data) {
  const actor = data.subject;
  if ( !actor?.isOwner ) return;
  const dieTotal = rolls[0]?.terms[0]?.total;
  processEvent("rollSkill", { actor, dieTotal, rolls, data });
}

/* -------------------------------------------- */

/**
 * Handle tool check triggers.
 * Triggered by the 'dnd5e.rollToolCheck' hook.
 * @param {D20Roll[]} rolls The resulting rolls
 * @param {object} data The hook data
 * @param {string} data.tool ID of the tool that was rolled
 * @param {Actor5e} data.subject Actor for which the roll was performed
 */
function handleRollToolCheck(rolls, data) {
  const actor = data.subject;
  if ( !actor?.isOwner ) return;
  const dieTotal = rolls[0]?.terms[0]?.total;
  processEvent("rollToolCheck", { actor, dieTotal, rolls, data });
}

/* -------------------------------------------- */

/**
 * Handle initiative roll triggers.
 * Triggered by the 'dnd5e.rollInitiative' hook.
 * @param {Actor5e} actor The actor that rolled initiative
 * @param {Combatant[]} combatants The associated combatants
 */
function handleRollInitiative(actor, combatants) {
  if ( !actor?.isOwner ) return;
  processEvent("rollInitiative", { actor, data: { combatants } });
}

/* -------------------------------------------- */

/**
 * Handle concentration roll triggers.
 * Triggered by the 'dnd5e.rollConcentration' hook.
 * @param {D20Roll[]} rolls The resulting rolls
 * @param {object} data The hook data
 * @param {Actor5e} data.subject Actor for which the roll was performed
 */
function handleRollConcentration(rolls, data) {
  const actor = data.subject;
  if ( !actor?.isOwner ) return;
  const dieTotal = rolls[0]?.terms[0]?.total;
  processEvent("rollConcentration", { actor, dieTotal, rolls, data });
}

/* -------------------------------------------- */

/**
 * Handle death save triggers.
 * Triggered by the 'dnd5e.postRollDeathSave' hook.
 * @param {D20Roll[]} rolls The resulting rolls
 * @param {object} data The hook data
 * @param {Actor5e} data.subject Actor for which the death save was rolled
 */
function handleRollDeathSave(rolls, data) {
  const actor = data.subject;
  if ( !actor?.isOwner ) return;
  const dieTotal = rolls[0]?.terms[0]?.total;
  processEvent("rollDeathSave", { actor, dieTotal, rolls, data });
}

/* -------------------------------------------- */

/**
 * Handle damage roll triggers.
 * Triggered by the 'dnd5e.rollDamage' hook.
 * @param {DamageRoll[]} rolls The resulting rolls
 * @param {object} data The hook data
 * @param {Activity} data.subject Activity that performed the roll
 */
function handleRollDamage(rolls, data) {
  const actor = data?.subject?.actor;
  if ( !actor?.isOwner ) return;
  const dieTotal = rolls[0]?.total;
  processEvent("rollDamage", { actor, dieTotal, rolls, data });
}

/* -------------------------------------------- */

/**
 * Handle preUpdateActor for HP-based triggers.
 * @param {Actor} actor The actor
 * @param {object} data The data
 * @param {object} options The options
 * @param {string} userId The user ID
 */
function handlePreUpdateActor(actor, data, options, userId) {
  if ( !actor.isOwner ) return;

  const currentHp = foundry.utils.getProperty(data, "system.attributes.hp.value");
  if ( currentHp === undefined ) return;

  const previousHp = actor.system.attributes.hp.value;
  const maxHp = actor?.system?.attributes?.hp?.effectiveMax ?? actor?.system?.attributes?.hp?.max ?? 0;
  const halfHp = maxHp * 0.5;

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

/* -------------------------------------------- */

/**
 * Handle combat start triggers.
 * @param {Combat} combat The combat
 * @param {object} data The data
 */
function handleCombatStart(combat, data) {
  combat.combatants.forEach(combatant => {
    const actor = combatant.actor;
    if ( actor?.isOwner ) {
      processEvent("startOfCombat", { actor, data });
    }
  });
}

/* -------------------------------------------- */

/**
 * Handle end of combat triggers.
 * @param {Combat} combat The combat
 */
function handleDeleteCombat(combat) {
  combat.combatants.forEach(combatant => {
    const actor = combatant.actor;
    if ( actor?.isOwner ) {
      processEvent("endOfCombat", { actor });
    }
  });
}

/* -------------------------------------------- */

/**
 * Handle update combat triggers (start/end of turn).
 * @param {Combat} combat The combat
 * @param {object} data The data
 * @param {object} options The options
 */
function handleUpdateCombat(combat, data, options) {
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
 * Handle rest triggers.
 * @param {Actor} actor The actor
 * @param {object} data The data
 */
function handleRest(actor, data) {
  const restType = data.longRest ? "longRest" : "shortRest";
  processEvent(restType, { actor, data });
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
  zeroHp: "preUpdateActor",
  halfHp: "preUpdateActor",
  loseHp: "preUpdateActor",
  gainHp: "preUpdateActor",
  startOfCombat: "combatStart",
  endOfCombat: "deleteCombat",
  startOfTurn: "updateCombat",
  endOfTurn: "updateCombat",
  shortRest: "dnd5e.preRestCompleted",
  longRest: "dnd5e.preRestCompleted"
};

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
  "dnd5e.preRestCompleted": handleRest
};

/* -------------------------------------------- */
/*  Event-Indexed Registry                      */
/* -------------------------------------------- */

/**
 * Check if any trigger condition in a group matches the current event.
 * Uses OR logic: any matching trigger condition is sufficient.
 * @param {object} group The trigger group
 * @param {string} event The event key
 * @param {number} dieTotal The die result
 * @returns {boolean} Whether any trigger condition matches
 */
function groupMatchesEvent(group, event, dieTotal) {
  const triggers = group.triggers || {};
  for ( const trigger of Object.values(triggers) ) {
    if ( trigger.event !== event ) continue;

    // If no value condition, the trigger matches on event alone
    if ( trigger.value === undefined || trigger.value === "" || trigger.value === null ) {
      return true;
    }

    // Check value condition
    if ( compareValues(dieTotal, trigger.operator, Number(trigger.value)) ) {
      return true;
    }
  }
  return false;
}

/* -------------------------------------------- */

/**
 * Process triggers for a given event.
 * Looks up world groups from the event index (O(1)) and per-actor groups from the actor flag.
 * For each group: OR logic on trigger conditions, then execute ALL actions.
 * @param {string} event The event key (e.g., "rollAttack")
 * @param {object} params The parameters
 * @param {Actor} params.actor The actor
 * @param {number} [params.dieTotal] The d20/dice result
 * @param {object} [params.rolls] The raw roll data
 * @param {object} [params.data] Additional hook data
 */
function processEvent(event, { actor, dieTotal = null, rolls = null, data = null }) {
  if ( !actor ) return;

  Logger.debug("Processing triggers...", { actor: actor.name, event, dieTotal });

  // World groups: O(1) lookup from pre-indexed map
  const worldGroups = eventIndex.get(event) || [];

  // Per-actor groups: small set, filter by event
  const actorGroupsObj = (actor?.documentName === "Actor") ? (getFlag(actor, "triggers") || {}) : {};
  const actorGroups = Object.values(actorGroupsObj).filter(g => {
    if ( !g.visible && g.visible !== undefined ) return false;
    // Check if any trigger in this group matches the event
    const triggers = g.triggers || {};
    return Object.values(triggers).some(t => t.event === event);
  });

  const combined = [...worldGroups, ...actorGroups];
  if ( !combined.length ) return;

  for ( const group of combined ) {
    // Check actor type filter (only for world groups that have actorTypes set)
    if ( group.actorTypes?.length && !group.actorTypes.includes(actor.type) ) continue;

    // OR logic: check if any trigger condition in this group matches
    if ( !groupMatchesEvent(group, event, dieTotal) ) continue;

    // Execute ALL actions in the group
    const actions = group.actions || {};
    for ( const action of Object.values(actions) ) {
      handleAction(action, { actor, event, dieTotal, rolls, data });
    }
  }

  Logger.debug("Triggers processed");
}

/* -------------------------------------------- */

/**
 * Rebuild the event index and synchronize hooks.
 * Called on ready and when trigger settings change.
 */
export function rebuild() {
  eventIndex.clear();

  // If disabled, unregister all hooks and return
  if ( !getSetting(constants.SETTING.ENABLE.KEY) ) {
    for ( const [hookName, hookId] of hookIds ) {
      Hooks.off(hookName, hookId);
    }
    hookIds.clear();
    Logger.debug("Triggers disabled, all hooks unregistered");
    return;
  }

  // Index visible world groups by event type (deduplicated per group)
  const worldGroups = getSetting(constants.SETTING.WORKFLOWS.KEY) || {};
  for ( const group of Object.values(worldGroups) ) {
    if ( !group.visible && group.visible !== undefined ) continue;
    const triggers = group.triggers || {};

    // Collect unique event types for this group
    const events = new Set();
    for ( const trigger of Object.values(triggers) ) {
      if ( trigger.event ) events.add(trigger.event);
    }

    // Index the group under each unique event type
    for ( const event of events ) {
      if ( !eventIndex.has(event) ) {
        eventIndex.set(event, []);
      }
      eventIndex.get(event).push(group);
    }
  }

  // Collect active event types from world groups
  const activeEvents = new Set(eventIndex.keys());

  // Scan game.actors for per-actor trigger events
  if ( game.actors ) {
    for ( const actor of game.actors ) {
      const actorGroups = getFlag(actor, "triggers");
      if ( !actorGroups ) continue;
      for ( const group of Object.values(actorGroups) ) {
        if ( !group.visible && group.visible !== undefined ) continue;
        const triggers = group.triggers || {};
        for ( const trigger of Object.values(triggers) ) {
          if ( trigger.event ) activeEvents.add(trigger.event);
        }
      }
    }
  }

  syncHooks(activeEvents);
  Logger.debug("Triggers rebuilt", { activeEvents: [...activeEvents], hookCount: hookIds.size });
}

/* -------------------------------------------- */

/**
 * Synchronize registered Foundry hooks with the set of active events.
 * Unregisters hooks no longer needed, registers new ones.
 * @param {Set<string>} activeEvents Set of active event type keys
 */
function syncHooks(activeEvents) {
  // Determine which Foundry hooks are needed
  const neededHooks = new Set();
  for ( const event of activeEvents ) {
    const hookName = EVENT_TO_HOOK[event];
    if ( hookName ) neededHooks.add(hookName);
  }

  // Unregister hooks no longer needed
  for ( const [hookName, hookId] of hookIds ) {
    if ( !neededHooks.has(hookName) ) {
      Hooks.off(hookName, hookId);
      hookIds.delete(hookName);
    }
  }

  // Register new hooks
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
 * Conservative add-only hook registration for per-actor trigger saves.
 * Registers hooks for events not already registered. Does not remove hooks.
 * Cleanup happens on the next rebuild() call.
 * @param {object} groups The per-actor trigger groups object
 */
export function ensureEventHooks(groups) {
  if ( !getSetting(constants.SETTING.ENABLE.KEY) ) return;
  if ( !groups ) return;

  for ( const group of Object.values(groups) ) {
    if ( !group.visible && group.visible !== undefined ) continue;
    const triggers = group.triggers || {};

    for ( const trigger of Object.values(triggers) ) {
      if ( !trigger.event ) continue;

      const hookName = EVENT_TO_HOOK[trigger.event];
      if ( !hookName || hookIds.has(hookName) ) continue;

      const handler = HOOK_HANDLERS[hookName];
      if ( handler ) {
        const id = Hooks.on(hookName, handler);
        hookIds.set(hookName, id);
      }
    }
  }
}
