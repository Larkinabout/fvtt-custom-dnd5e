import { CONSTANTS, MODULE, SETTING_BY_ENTITY_TYPE, SHEET_TYPE } from "../constants.js";
import { c5eLoadTemplates, checkEmpty, getFlag, setFlag, unsetFlag, getSetting, registerMenu, registerSetting, makeDead, Logger } from "../utils.js";
import { CountersForm } from "../forms/counters-form.js";
import { CountersFormIndividual } from "../forms/counters-form-individual.js";

const constants = CONSTANTS.COUNTERS;

/**
 * Register settings and hooks, and load templates.
 */
export function register() {
  registerSettings();
  registerHooks();

  const templates = Object.values(constants.TEMPLATE);
  c5eLoadTemplates(templates);
}

/* -------------------------------------------- */

/**
 * Register settings.
 */
function registerSettings() {
  const settings = [
    constants.SETTING.CHARACTER_COUNTERS.KEY,
    constants.SETTING.NPC_COUNTERS.KEY,
    constants.SETTING.GROUP_COUNTERS.KEY,
    constants.SETTING.ITEM_COUNTERS.KEY
  ];

  settings.forEach(key => registerSetting(key, { scope: "world", config: false, type: Object }));

  registerMenu(
    constants.MENU.KEY,
    {
      hint: game.i18n.localize(constants.MENU.HINT),
      label: game.i18n.localize(constants.MENU.LABEL),
      name: game.i18n.localize(constants.MENU.NAME),
      icon: constants.MENU.ICON,
      type: CountersForm,
      restricted: true,
      scope: "world"
    }
  );

  registerSetting(
    CONSTANTS.COUNTERS.SETTING.COUNTERS.KEY,
    {
      name: game.i18n.localize(CONSTANTS.COUNTERS.SETTING.COUNTERS.NAME),
      hint: game.i18n.localize(CONSTANTS.COUNTERS.SETTING.COUNTERS.HINT),
      scope: "world",
      config: false,
      type: Boolean,
      default: true
    }
  );
  
}

/* -------------------------------------------- */

/**
 * Register hooks.
 */
function registerHooks() {
  registerItemSheetTab();
  registerGroupSheetTab();
  Hooks.on("renderActorSheetV2", addCounters);
  Hooks.on("renderItemSheet5e", addItemCounters);
  Hooks.on("renderGroupActorSheet", addGroupCounters);
  Hooks.on("dnd5e.prepareSheetContext", prepareCountersContext);
  Hooks.on("preUpdateActor", handlePreUpdateActor);
  Hooks.on("updateActor", handleUpdateActor);
  Hooks.on("updateItem", handleUpdateItem);
  Hooks.on("deleteCombat", handleDeleteCombat);
  Hooks.on("combatStart", handleCombatStart);
  Hooks.on("updateCombat", handleUpdateCombat);
  Hooks.on("dnd5e.preRestCompleted", handleRest);
  Hooks.on("dnd5e.rollAttack", handleRollAttack);
}

/* -------------------------------------------- */

/**
 * Register the counters tab on the item sheet.
 */
function registerItemSheetTab() {
  const ItemSheet5e = dnd5e.applications.item.ItemSheet5e;
  if ( !ItemSheet5e.TABS.find(t => t.tab === "counters") ) {
    ItemSheet5e.TABS.push({
      tab: "counters",
      label: "CUSTOM_DND5E.counters"
    });
  }
  ItemSheet5e.PARTS.counters = {
    tab: "counters",
    template: constants.TEMPLATE.DND5E_ITEM_GROUP,
    scrollable: [""]
  };
}

/* -------------------------------------------- */

/**
 * Register the counters tab on the group actor sheet.
 */
function registerGroupSheetTab() {
  const GroupActorSheet = dnd5e.applications.actor.GroupActorSheet;
  if ( !GroupActorSheet.TABS.find(t => t.tab === "counters") ) {
    GroupActorSheet.TABS.push({
      tab: "counters",
      label: "CUSTOM_DND5E.counters",
      icon: "fas fa-tally"
    });
  }
  GroupActorSheet.PARTS.counters = {
    tab: "counters",
    container: { classes: ["tab-body"], id: "tabs" },
    template: constants.TEMPLATE.DND5E_ITEM_GROUP,
    scrollable: [""]
  };
}

/* -------------------------------------------- */

/**
 * Prepare counter data for the counters sheet part.
 * @param {object} sheet The sheet
 * @param {string} partId The part ID
 * @param {object} context The context
 * @param {object} options The options
 */
function prepareCountersContext(sheet, partId, context, options) {
  if ( partId !== "counters" ) return;
  const docName = sheet.document?.documentName;
  if ( docName === "Item" ) {
    context.counters = mergeCounters(sheet.document, CONSTANTS.COUNTERS.SETTING.ITEM_COUNTERS.KEY);
  } else if ( docName === "Actor" && sheet.document?.type === "group" ) {
    context.counters = mergeCounters(sheet.document, CONSTANTS.COUNTERS.SETTING.GROUP_COUNTERS.KEY);
  } else {
    return;
  }
}

/* -------------------------------------------- */

/**
 * Set up counter interactions on the item sheet.
 * @param {object} app The app
 * @param {object} html The HTML
 * @param {object} data The data
 */
function addItemCounters(app, html, data) {
  if ( !getSetting(constants.SETTING.COUNTERS.KEY) ) return;
  const container = html.querySelector("#custom-dnd5e-counters");
  if ( !container ) return;
  const settingKey = CONSTANTS.COUNTERS.SETTING.ITEM_COUNTERS.KEY;
  const counters = mergeCounters(app.document, settingKey);
  setupCounterInteractions(app.document, counters, container, app.isEditable);
}

/* -------------------------------------------- */

/**
 * Set up counter interactions on the group actor sheet.
 * @param {object} app The app
 * @param {object} html The HTML
 * @param {object} data The data
 */
function addGroupCounters(app, html, data) {
  if ( !getSetting(constants.SETTING.COUNTERS.KEY) ) return;
  const container = html.querySelector("#custom-dnd5e-counters");
  if ( !container ) return;
  const settingKey = CONSTANTS.COUNTERS.SETTING.GROUP_COUNTERS.KEY;
  const counters = mergeCounters(app.document, settingKey);
  setupCounterInteractions(app.document, counters, container, app.isEditable);
}

/* -------------------------------------------- */

/**
 * Handle actor pre-update triggers.
 * @param {object} actor The actor
 * @param {object} data  The data
 * @param {object} options The options
 * @param {string} userId The user ID
 */
function handlePreUpdateActor(actor, data, options, userId) {
  if ( !getSetting(constants.SETTING.COUNTERS.KEY) ) return;
  if ( actor.type === "group" || !actor.isOwner ) return;
  const currentHp = foundry.utils.getProperty(data, "system.attributes.hp.value");
  const previousHp = actor.system.attributes.hp.value;
  const maxHp = actor?.system?.attributes?.hp?.effectiveMax ?? actor?.system?.attributes?.hp?.max ?? 0;
  const halfHp = maxHp * 0.5;
  if ( currentHp !== undefined && currentHp <= halfHp && previousHp > halfHp ) {
    processTriggers({ actor, triggerType: "halfHp" });
  }
}

/* -------------------------------------------- */

/**
 * Handle actor update triggers.
 * @param {object} actor The actor
 * @param {object} data  The data
 * @param {object} options The options
 * @param {string} userId The user ID
 */
function handleUpdateActor(actor, data, options, userId) {
  if ( !getSetting(constants.SETTING.COUNTERS.KEY) ) return;
  if ( !actor.isOwner ) return;
  const hp = foundry.utils.getProperty(data, "system.attributes.hp.value");
  if ( hp === 0 ) processTriggers({ actor, triggerType: "zeroHp", followUpFlag: "zeroHpCombatEnd" });
  if ( hasDataChanged(data) ) {
    processTriggers({ actor, data, triggerType: "counterValue" });
    processTriggers({ actor, data, triggerType: "successValue" });
    processTriggers({ actor, data, triggerType: "failureValue" });
    processTriggers({ actor, data, triggerType: "checked" });
    processTriggers({ actor, data, triggerType: "unchecked" });
  }
}

/* -------------------------------------------- */

/**
 * Handle item update triggers.
 * @param {object} item The item
 * @param {object} data The data
 * @param {object} options The options
 * @param {string} userId The user ID
 */
function handleUpdateItem(item, data, options, userId) {
  if ( !getSetting(constants.SETTING.COUNTERS.KEY) ) return;
  if ( !item.isOwner ) return;
  if ( hasDataChanged(data) ) {
    processTriggers({ actor: item, data, triggerType: "counterValue" });
    processTriggers({ actor: item, data, triggerType: "successValue" });
    processTriggers({ actor: item, data, triggerType: "failureValue" });
    processTriggers({ actor: item, data, triggerType: "checked" });
    processTriggers({ actor: item, data, triggerType: "unchecked" });
  }
}

/* -------------------------------------------- */

/**
 * Handle combat start triggers.
 * @param {object} combat The combat
 * @param {object} data The data
 */
function handleCombatStart(combat, data) {
  if ( !getSetting(constants.SETTING.COUNTERS.KEY) ) return;
  combat.combatants.forEach(combatant => {
    const actor = combatant.actor;
    processTriggers({ actor, triggerType: "startOfCombat" });
  });
}

/* -------------------------------------------- */

/**
 * Handle update combat triggers.
 * @param {object} combat The combat
 * @param {object} data The data
 * @param {object} options The options
 */
function handleUpdateCombat(combat, data, options) {
  if ( !getSetting(constants.SETTING.COUNTERS.KEY) ) return;

  if ( combat?.previous?.combatantId ) {
    const previousActor = combat.combatants.get(combat.previous.combatantId).actor;
    processTriggers({ actor: previousActor, triggerType: "endOfTurn" });
  }

  const actor = combat.combatant.actor;
  processTriggers({ actor, triggerType: "startOfTurn" });
}

/* -------------------------------------------- */

/**
 * Handle end of combat triggers.
 * @param {object} combat The combat
 */
function handleDeleteCombat(combat) {
  if ( !getSetting(constants.SETTING.COUNTERS.KEY) ) return;
  combat.combatants.forEach(combatant => {
    const actor = combatant.actor;
    processTriggers({ actor, triggerType: "endOfCombat" });
    if ( getFlag(actor, "zeroHpCombatEnd") ) {
      processTriggers({ actor, triggerType: "zeroHpCombatEnd" });
      unsetFlag(actor, "zeroHpCombatEnd");
    }
  });
}

/* -------------------------------------------- */

/**
 * Handle rest triggers.
 * @param {object} actor The actor
 * @param {object} data  The data
 */
function handleRest(actor, data) {
  if ( !getSetting(constants.SETTING.COUNTERS.KEY) ) return;
  const restType = data.longRest ? "longRest" : "shortRest";
  processTriggers({ actor, triggerType: restType });
}

/* -------------------------------------------- */

/**
 * Handle attack roll triggers.
 * @param {object[]} rolls The rolls
 * @param {object} data The data
 */
function handleRollAttack(rolls, data) {
  if ( !getSetting(constants.SETTING.COUNTERS.KEY) ) return;
  const actor = data.subject?.actor;
  if ( !actor?.isOwner ) return;
  const dieTotal = rolls[0]?.terms[0]?.total;
  if ( dieTotal !== undefined ) {
    processTriggers({ actor, triggerType: "rollAttack", dieTotal });
    const item = data.subject?.item;
    if ( item ) {
      processTriggers({ actor: item, triggerType: "rollAttack", dieTotal });
    }
  }
}

/* -------------------------------------------- */

/**
 * Whether the counter's value has changed.
 * @param {object} data The data
 * @returns {boolean} Whether the counter's value has changed
 */
function hasDataChanged(data) {
  return Object.hasOwn(data, "flags")
        && data.flags[MODULE.ID] && !Object.hasOwn(data.flags[MODULE.ID], "-=counters");
}

/* -------------------------------------------- */

/**
 * Process the triggers for the given actor based on the trigger type.
 * @param {object} params The parameters
 * @param {Actor} params.actor The actor
 * @param {object} [params.data=null] The data
 * @param {string} params.triggerType The trigger type, e.g., 'zeroHp', 'halfHp', 'longRest'
 * @param {string} [params.followUpFlag=null] Optional: flag to set for follow-up actions (e.g., 'zeroHpCombatEnd')
 */
function processTriggers({ actor, data = null, triggerType, followUpFlag = null, dieTotal = null }) {
  const counters = getCounters(actor);
  if ( !counters ) return;

  // Iterate through each counter and check if it has an action that matches the triggerType
  for (const [counterKey, counter] of Object.entries(counters)) {
    if ( !counter.triggers ) continue;
    for (const trigger of counter.triggers) {
      if ( trigger.trigger === triggerType ) {
        handleAction(counterKey, counter, trigger, { actor, data, dieTotal });
      }
    }
  }

  // Optionally set a follow-up flag for later processing (e.g., at the end of combat)
  if ( followUpFlag ) {
    setFlag(actor, followUpFlag, true);
  }
}

/* -------------------------------------------- */

/**
 * Handle trigger actions.
 * @param {string} counterKey The counter key
 * @param {object} counter The counter
 * @param {object} trigger The trigger
 * @param {object} params Miscellaneous parameters
 * @param {Actor} params.actor The actor
 * @param {object} [params.data=null] The data
 */
function handleAction(counterKey, counter, trigger, { actor, data, dieTotal = null }) {
  // For rollAttack, compare die value using operator
  if ( trigger.trigger === "rollAttack" ) {
    if ( !compareValues(dieTotal, trigger.triggerOperator, Number(trigger.triggerValue)) ) return;
  }

  // For counterValue/successValue/failureValue, compare using operator
  const valueTriggerMap = {
    counterValue: () => getCounterValue(data, counterKey),
    successValue: () => getSuccessFailureValue(data, counterKey, "success"),
    failureValue: () => getSuccessFailureValue(data, counterKey, "failure")
  };

  if ( valueTriggerMap[trigger.trigger] ) {
    const value = valueTriggerMap[trigger.trigger]();
    if ( value === null || value === undefined ) return;
    const target = resolveTriggerValue(actor, trigger.triggerValue);
    if ( target === null || target === undefined ) return;
    if ( !compareValues(value, trigger.triggerOperator, target) ) return;
  }

  // For checked/unchecked, only fire if counter value matches
  if ( trigger.trigger === "checked" && getCounterValue(data, counterKey) !== true ) return;
  if ( trigger.trigger === "unchecked" && getCounterValue(data, counterKey) !== false ) return;

  switch (trigger.action) {
    case "check":
      checkCheckbox(actor, counterKey);
      break;
    case "uncheck":
      uncheckCheckbox(actor, counterKey);
      break;
    case "increase":
      increaseCounter(actor, counterKey, trigger, counter.type);
      break;
    case "decrease":
      decreaseCounter(actor, counterKey, trigger, counter.type);
      break;
    case "set":
      setCounter(actor, counterKey, trigger, counter.type);
      break;
    case "dead": {
      const deadActor = (actor.documentName === "Item") ? actor.actor : actor;
      if ( deadActor ) makeDead(deadActor);
      break;
    }
    case "destroy":
      destroyItem(actor);
      break;
    case "reduceQuantity":
      reduceItemQuantity(actor);
      break;
    case "macro":
      executeMacro(actor, counterKey, trigger, data);
      break;
  }
}

/* -------------------------------------------- */

/**
 * Destroy an item.
 * @param {Item} item The item to destroy
 */
async function destroyItem(item) {
  if ( item.documentName !== "Item" ) return;
  await item.delete();
}

/* -------------------------------------------- */

/**
 * Reduce an item's quantity by 1.
 * @param {Item} item The item
 */
async function reduceItemQuantity(item) {
  if ( item.documentName !== "Item" ) return;
  const quantity = item.system.quantity ?? 0;
  await item.update({ "system.quantity": Math.max(quantity - 1, 0) });
}

/* -------------------------------------------- */

/**
 * Execute a macro from a trigger.
 * @param {Actor|Item} entity The actor or item
 * @param {string} counterKey The counter key
 * @param {object} trigger The trigger
 * @param {object} data The update data
 */
async function executeMacro(entity, counterKey, trigger, data) {
  if ( !trigger.macroUuid ) return;
  const macro = await fromUuid(trigger.macroUuid);
  if ( !macro ) {
    Logger.error(`Macro not found: ${trigger.macroUuid}`, true);
    return;
  }
  const isItem = entity.documentName === "Item";
  const actor = isItem ? entity.actor : entity;
  const token = actor?.isToken ? actor.token : actor?.getActiveTokens()[0];
  const counterValue = data ? getCounterValue(data, counterKey) : null;
  macro.execute({
    actor,
    token,
    item: isItem ? entity : null,
    counter: counterKey,
    counterValue,
    trigger: trigger.trigger,
    triggerValue: trigger.triggerValue
  });
}

/* -------------------------------------------- */

/**
 * Increase a counter by the trigger's action value.
 * @param {object} actor The actor
 * @param {string} key The counter key
 * @param {object} trigger The trigger
 * @param {string} type The counter type
 */
function increaseCounter(actor, key, trigger, type) {
  switch (type) {
    case "fraction":
      increaseFraction(actor, key, trigger.actionValue);
      break;
    case "number":
    case "pips":
      increaseNumber(actor, key, trigger.actionValue);
      break;
  }
}

/* -------------------------------------------- */

/**
 * Decrease a counter by the trigger's action value.
 * @param {object} actor The actor
 * @param {string} key The counter key
 * @param {object} trigger The trigger
 * @param {string} type The counter type
 */
function decreaseCounter(actor, key, trigger, type) {
  switch (type) {
    case "fraction":
      decreaseFraction(actor, key, trigger.actionValue);
      break;
    case "number":
    case "pips":
      decreaseNumber(actor, key, trigger.actionValue);
      break;
  }
}

/**
 * Set a counter to the trigger's action value.
 * @param {object} actor The actor
 * @param {string} key The counter key
 * @param {object} trigger The trigger
 * @param {string} type The counter type
 */
function setCounter(actor, key, trigger, type) {
  switch (type) {
    case "fraction":
      setFraction(actor, key, trigger.actionValue);
      break;
    case "number":
    case "pips":
      setNumber(actor, key, trigger.actionValue);
      break;
  }
}

/* -------------------------------------------- */

/**
 * Get the current value of a counter.
 * @param {object} data The data
 * @param {string} counterKey The counter key
 * @returns {number|null} The counter value
 */
function getCounterValue(data, counterKey) {
  const key = counterKey.startsWith("counters.") ? counterKey.slice(9) : counterKey;
  return data.flags[MODULE.ID][key]?.value ?? data.flags[MODULE.ID][key] ?? null;
}

/* -------------------------------------------- */

/**
 * Get the success or failure value of a success/failure counter.
 * @param {object} data The data
 * @param {string} counterKey The counter key
 * @param {string} property The property: "success" or "failure"
 * @returns {number|null} The value
 */
function getSuccessFailureValue(data, counterKey, property) {
  const key = counterKey.startsWith("counters.") ? counterKey.slice(9) : counterKey;
  return data.flags[MODULE.ID][key]?.[property] ?? null;
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
 * Add counters to the sheet.
 * @param {object} app The app
 * @param {object} html The HTML
 * @param {object} data The data
 */
async function addCounters(app, html, data) {
  if ( !getSetting(constants.SETTING.COUNTERS.KEY) ) return;

  const sheetType = SHEET_TYPE[app.constructor.name];
  if ( !sheetType ) return;

  const entity = sheetType.item ? app : app.actor;
  const counters = mergeCounters(entity, sheetType.countersSetting);

  if ( !data?.editable && checkEmpty(counters) ) return;

  renderCountersTab(sheetType, html);
  const container = await insertCounters(sheetType, counters, app, html, data);

  if ( !Object.keys(counters).length ) {
    container.classList?.add("empty");
  }

  setupCounterInteractions(entity, counters, container, data.editable);
}

/* -------------------------------------------- */

/**
 * Merge world and entity counters.
 * @param {object} entity The entity
 * @param {string} settingKey The setting key
 * @returns {object} The merged counters
 */
export function mergeCounters(entity, settingKey) {
  if ( entity.document ) entity = entity.document;
  const worldCounters = game.settings.get(MODULE.ID, settingKey) ?? {};
  const entityCounters = getFlag(entity, "counters") ?? {};

  return {
    ...processCounters("world", worldCounters, entity),
    ...processCounters("entity", entityCounters, entity)
  };
}

/* -------------------------------------------- */

/**
 * Process counters.
 * @param {string} type The type
 * @param {object} counters The counters
 * @param {object} entity The entity
 * @returns {object} The processed counters
 */
function processCounters(type, counters, entity) {
  return Object.entries(foundry.utils.deepClone(counters))
    .filter(([_, counter]) => counter.visible && game.user.role >= (counter.viewRole ?? 1))
    .reduce((acc, [key, counter]) => {
      counter.property = (type === "entity" && ["checkbox", "number", "pips"].includes(counter.type)) ? `${key}.value` : key;
      counter.canEdit = (!counter.editRole || game.user.role >= counter.editRole);
      if ( ["checkbox", "number", "pips"].includes(counter.type) ) {
        counter.value = entity.getFlag(MODULE.ID, counter.property);
      }
      if ( counter.type === "pips" ) {
        counter.max = resolveMax(entity, counter.max) ?? entity.getFlag(MODULE.ID, `${key}.max`) ?? 0;
        counter.pips = Array.fromRange(counter.max, 1).map(n => ({
          n,
          filled: (counter.value ?? 0) >= n,
          canEdit: counter.canEdit
        }));
      }
      if ( counter.type === "fraction" ) {
        counter.value = entity.getFlag(MODULE.ID, `${key}.value`) ?? 0;
        counter.canEditMax = (!counter.max && counter.canEdit);
        counter.max = resolveMax(entity, counter.max) ?? entity.getFlag(MODULE.ID, `${key}.max`) ?? 0;
      }
      if ( counter.type === "successFailure" ) {
        counter.success = entity.getFlag(MODULE.ID, `${key}.success`) ?? 0;
        counter.failure = entity.getFlag(MODULE.ID, `${key}.failure`) ?? 0;
      }
      acc[(type === "entity" ? `counters.${key}` : key)] = counter;
      return acc;
    }, {});
}

/* -------------------------------------------- */

/**
 * Render the counter tab for sheet with navigation tabs, e.g., items and groups.
 * @param {object} sheetType The sheet type
 * @param {object} html The HTML
 */
function renderCountersTab(sheetType, html) {
  if ( sheetType.group || sheetType.item ) {
    const nav = html.querySelector("nav.sheet-tabs.tabs") ?? html.querySelector("nav.sheet-navigation.tabs");
    if ( !nav ) return;
    const existingTab = nav.querySelector("[data-tab='custom-dnd5e-counters']");
    if ( existingTab ) return;
    const navItem = document.createElement("a");
    navItem.setAttribute("data-tab", "custom-dnd5e-counters");
    if ( nav.classList.contains("sheet-tabs") ) {
      navItem.setAttribute("data-action", "tab");
      navItem.setAttribute("data-group", "primary");
      const span = document.createElement("span");
      span.textContent = game.i18n.localize("CUSTOM_DND5E.counters");
      navItem.appendChild(span);
    } else {
      navItem.classList.add("item");
      navItem.textContent = game.i18n.localize("CUSTOM_DND5E.counters");
    }
    nav.appendChild(navItem);
  }
}

/* -------------------------------------------- */

/**
 * Insert counters template into the HTML.
 * @param {object} sheetType The sheet type
 * @param {object} counters The counters
 * @param {object} app The app
 * @param {object} html The HTML
 * @param {object} data The data
 * @returns {HTMLElement} The container element
 */
async function insertCounters(sheetType, counters, app, html, data) {
  const context = { editable: data.editable, counters };
  if ( app?._tabs?.[0]?.active === "custom-dnd5e-counters" ) {
    context.active = " active";
  }
  const element = html.querySelector(sheetType.insert.class);
  const existing = element.querySelector("#custom-dnd5e-counters");
  if ( existing ) {
    context.active = existing.classList.contains("active") ? " active" : "";
    existing.remove();
  }
  const template = await foundry.applications.handlebars.renderTemplate(sheetType.template, context);
  element.insertAdjacentHTML(sheetType.insert.position, template);
  return element.querySelector("#custom-dnd5e-counters");
}

/* -------------------------------------------- */

/**
 * Setup counter click and key interactions.
 * @param {object} entity The entity, e.g., actor, item
 * @param {object} counters The counters
 * @param {HTMLElement} container The container DOM element for the counters
 * @param {boolean} editable Whether the sheet is editable
 */
export function setupCounterInteractions(entity, counters, container, editable) {
  if ( !container ) return;

  // If sheet is set to editable, add the config button
  if ( editable ) {
    const configButton = container.querySelector("#custom-dnd5e-counters-edit-button");
    configButton?.addEventListener("click", () => openForm(entity));
  }

  if ( entity.document ) entity = entity.document;

  Object.entries(counters).forEach(([key, counter]) => {
    if ( !counter.canEdit ) return;

    const counterElement = container.querySelector(`[data-id="${key}"]`);
    if ( !counterElement ) return;
    const links = counterElement.querySelectorAll(".custom-dnd5e-counters-link");
    const inputs = counterElement.querySelectorAll("input");

    switch (counter.type) {
      case "fraction":
        links[0].addEventListener("click", () => increaseFraction(entity, counter.property));
        links[0].addEventListener("contextmenu", () => decreaseFraction(entity, counter.property));
        inputs.forEach(input => {
          input.addEventListener("click", selectInputContent);
          if ( input.dataset?.input === "value" ) {
            input.addEventListener("keyup", () => checkValue(input, entity, counter.property), true);
          }
        });
        break;
      case "number":
        links[0].addEventListener("click", () => { increaseNumber(entity, counter.property); });
        links[0].addEventListener("contextmenu", () => decreaseNumber(entity, counter.property));
        inputs.forEach(input => {
          input.addEventListener("click", selectInputContent);
          if ( input.dataset?.input === "value" ) {
            input.addEventListener("keyup", () => checkValue(input, entity, key), true);
          }
        });
        break;
      case "pips":
        counterElement.querySelectorAll(".pip").forEach(pip => {
          pip.addEventListener("click", () => togglePip(entity, counter.property, Number(pip.dataset.n)));
        });
        break;
      case "successFailure":
        links.forEach(link => {
          if ( link.dataset?.input === "success" ) {
            link.addEventListener("click", () => increaseSuccess(entity, counter.property));
            link.addEventListener("contextmenu", () => decreaseSuccess(entity, counter.property));
          } else if ( link.dataset?.input === "failure" ) {
            link.addEventListener("click", () => increaseFailure(entity, counter.property));
            link.addEventListener("contextmenu", () => decreaseFailure(entity, counter.property));
          }
        });
        inputs.forEach(input => {
          input.addEventListener("click", selectInputContent);
        });
    }
  });
}

/* -------------------------------------------- */

/**
 * Open the individual counters form.
 * @param {object} entity The entity
 */
export function openForm(entity) {
  const form = new CountersFormIndividual(entity);
  form.render(true);
}

/* -------------------------------------------- */

/**
 * Select content of an input element.
 * @param {object} event The event
 */
function selectInputContent(event) {
  const input = event.target;
  input.select();
  input.focus();
}

/* -------------------------------------------- */

/**
 * Check input value against max.
 * @param {object} input The input element
 * @param {object} entity The entity: actor or item
 * @param {string} key The counter key
 */
function checkValue(input, entity, key) {
  const max = Number(getMax(entity, key) ?? entity.getFlag(MODULE.ID, `${key}.max`));
  if ( max && Number(input.value) > max ) {
    input.value = max;
    ui.notifications.info(game.i18n.localize("CUSTOM_DND5E.reachedCounterLimit"));
  }
}

/* -------------------------------------------- */

/**
 * Check checkbox counter.
 * @param {object} entity The entity: actor or item
 * @param {string} counterKey The counter key
 */
export function checkCheckbox(entity, counterKey) {
  counterKey = (counterKey.startsWith("counters.")) ? `${counterKey}.value` : counterKey;
  entity.setFlag(MODULE.ID, counterKey, true);
}

/* -------------------------------------------- */

/**
 * Uncheck checkbox counter
 * @param {object} entity The entity: actor or item
 * @param {string} counterKey The counter key
 */
export function uncheckCheckbox(entity, counterKey) {
  counterKey = (counterKey.startsWith("counters.")) ? `${counterKey}.value` : counterKey;
  entity.setFlag(MODULE.ID, counterKey, false);
}

/* -------------------------------------------- */

/**
 * Toggle checkbox counter.
 * @param {object} entity The entity: actor or item
 * @param {string} counterKey The counter key
 */
export function toggleCheckbox(entity, counterKey) {
  counterKey = (counterKey.startsWith("counters.")) ? `${counterKey}.value` : counterKey;
  const flag = entity.getFlag(MODULE.ID, counterKey);
  entity.setFlag(MODULE.ID, counterKey, !flag);
}

/* -------------------------------------------- */

/**
 * Toggle a pip on a pips counter.
 * @param {object} entity The entity: actor or item
 * @param {string} counterKey The counter key
 * @param {number} n The pip number to toggle
 */
export function togglePip(entity, counterKey, n) {
  const currentValue = entity.getFlag(MODULE.ID, counterKey) ?? 0;
  const max = getMax(entity, counterKey);
  const newValue = (currentValue === n) ? n - 1 : n;
  if ( max && newValue > max ) return;
  entity.setFlag(MODULE.ID, counterKey, newValue);
}

/* -------------------------------------------- */

/**
 * Decrease fraction counter.
 * @param {object} entity The entity: actor or item
 * @param {string} counterKey The counter key
 * @param {number} actionValue The action value
 */
export function decreaseFraction(entity, counterKey, actionValue = 1) {
  const oldValue = entity.getFlag(MODULE.ID, `${counterKey}.value`) ?? 0;
  const newValue = Math.max(oldValue - actionValue, 0);
  if ( oldValue > 0 ) {
    entity.setFlag(MODULE.ID, `${counterKey}.value`, newValue);
  }
}

/* -------------------------------------------- */

/**
 * Increase fraction counter.
 * @param {object} entity The entity: actor or item
 * @param {string} counterKey The counter key
 * @param {number} actionValue The action value
 */
export function increaseFraction(entity, counterKey, actionValue = 1) {
  modifyFraction(entity, counterKey, actionValue);
}

/* -------------------------------------------- */

/**
 * Set fraction counter.
 * @param {object} entity The entity: actor or item
 * @param {string} counterKey The counter key
 * @param {number} actionValue The action value
 */
export function setFraction(entity, counterKey, actionValue = 0) {
  entity.setFlag(MODULE.ID, `${counterKey}.value`, actionValue);
}

/* -------------------------------------------- */

/**
 * Modify fraction counter.
 * @param {object} entity The entity: actor or item
 * @param {string} counterKey The counter key
 * @param {number} actionValue The action value
 */
export function modifyFraction(entity, counterKey, actionValue = 1) {
  const oldValue = entity.getFlag(MODULE.ID, `${counterKey}.value`) ?? 0;
  const maxValue = getMax(entity, counterKey) ?? entity.getFlag(MODULE.ID, `${counterKey}.max`);
  const newValue = oldValue + actionValue;

  if ( newValue >= 0 && (!maxValue || newValue <= maxValue) ) {
    entity.setFlag(MODULE.ID, `${counterKey}.value`, newValue);
  } else {
    if ( newValue >= 0 && oldValue < maxValue ) {
      entity.setFlag(MODULE.ID, `${counterKey}.value`, maxValue);
    }
    ui.notifications.info(game.i18n.localize("CUSTOM_DND5E.reachedCounterLimit"));
  }
}

/* -------------------------------------------- */

/**
 * Decrease number counter.
 * @param {object} entity The entity: actor or item
 * @param {string} counterKey The counter key
 * @param {number} actionValue The action value
 */
export function decreaseNumber(entity, counterKey, actionValue = 1) {
  const oldValue = entity.getFlag(MODULE.ID, counterKey) ?? 0;
  const newValue = Math.max(oldValue - actionValue, 0);
  if ( oldValue > 0 ) {
    entity.setFlag(MODULE.ID, counterKey, newValue);
  }
}

/* -------------------------------------------- */

/**
 * Increase number counter.
 * @param {object} entity The entity: actor or item
 * @param {string} counterKey The counter key
 * @param {number} actionValue The action value
 */
export function increaseNumber(entity, counterKey, actionValue = 1) {
  modifyNumber(entity, counterKey, actionValue);
}

/* -------------------------------------------- */

/**
 * Set number counter.
 * @param {object} entity The entity: actor or item
 * @param {string} counterKey The counter key
 * @param {number} actionValue The action value
 */
export function setNumber(entity, counterKey, actionValue = 0) {
  entity.setFlag(MODULE.ID, counterKey, actionValue);
}

/* -------------------------------------------- */

/**
 * Modify number counter.
 * @param {object} entity The entity: actor or item
 * @param {string} counterKey The counter key
 * @param {number} actionValue The action value
 */
export function modifyNumber(entity, counterKey, actionValue = 1) {
  const originalKey = counterKey;
  counterKey = (counterKey.startsWith("counters.")) ? `${counterKey}.value` : counterKey;
  const oldValue = entity.getFlag(MODULE.ID, counterKey) ?? 0;
  const maxValue = getMax(entity, counterKey) ?? entity.getFlag(MODULE.ID, `${originalKey}.max`);
  const newValue = oldValue + actionValue;

  if ( newValue >= 0 && (!maxValue || newValue <= maxValue) ) {
    entity.setFlag(MODULE.ID, counterKey, newValue);
  } else {
    if ( newValue >= 0 && oldValue < maxValue ) {
      entity.setFlag(MODULE.ID, counterKey, maxValue);
    }
    ui.notifications.info(game.i18n.localize("CUSTOM_DND5E.reachedCounterLimit"));
  }
}

/* -------------------------------------------- */

/**
 * Decrease success on success/failure counter.
 * @param {object} entity The entity: actor or item
 * @param {string} counterKey The counter key
 * @param {number} actionValue The action value
 */
export function decreaseSuccess(entity, counterKey, actionValue = 1) {
  const oldValue = entity.getFlag(MODULE.ID, `${counterKey}.success`) ?? 0;
  const newValue = Math.max(oldValue - actionValue, 0);
  if ( oldValue > 0 ) {
    entity.setFlag(MODULE.ID, `${counterKey}.success`, newValue);
  }
}

/* -------------------------------------------- */

/**
 * Increase success on success/failure counter.
 * @param {object} entity The entity: actor or item
 * @param {string} counterKey The counter key
 * @param {number} actionValue The action value
 */
export function increaseSuccess(entity, counterKey, actionValue = 1) {
  modifySuccess(entity, counterKey, actionValue);
}

/* -------------------------------------------- */

/**
 * Modify success on success/failure counter.
 * @param {object} entity The entity: actor or item
 * @param {string} counterKey The counter key
 * @param {number} actionValue The action value
 */
export function modifySuccess(entity, counterKey, actionValue = 1) {
  const oldValue = entity.getFlag(MODULE.ID, `${counterKey}.success`) ?? 0;
  const maxValue = getMax(entity, counterKey) ?? entity.getFlag(MODULE.ID, `${counterKey}.max`);
  const newValue = (maxValue) ? Math.min(oldValue + actionValue, maxValue) : oldValue + actionValue;

  if ( newValue >= 0 && (!maxValue || newValue <= maxValue) ) {
    entity.setFlag(MODULE.ID, `${counterKey}.success`, newValue);
  } else {
    if ( newValue >= 0 && oldValue < maxValue ) {
      entity.setFlag(MODULE.ID, `${counterKey}.success`, maxValue);
    }
    ui.notifications.info(game.i18n.localize("CUSTOM_DND5E.reachedCounterLimit"));
  }
}

/* -------------------------------------------- */

/**
 * Decrease failure on success/failure counter.
 * @param {object} entity The entity: actor or item
 * @param {string} counterKey The counter key
 * @param {number} actionValue The action value
 */
export function decreaseFailure(entity, counterKey, actionValue = 1) {
  const oldValue = entity.getFlag(MODULE.ID, `${counterKey}.failure`) ?? 0;
  const newValue = Math.max(oldValue - actionValue, 0);
  if ( oldValue > 0 ) {
    entity.setFlag(MODULE.ID, `${counterKey}.failure`, newValue);
  }
}

/* -------------------------------------------- */

/**
 * Increase failure on success/failure counter.
 * @param {object} entity The entity: actor or item
 * @param {string} counterKey The counter key
 * @param {number} actionValue The action value
 */
export function increaseFailure(entity, counterKey, actionValue = 1) {
  modifyFailure(entity, counterKey, actionValue);
}

/* -------------------------------------------- */

/**
 * Modify failure on success/failure counter.
 * @param {object} entity The entity: actor or item
 * @param {string} counterKey The counter key
 * @param {number} actionValue The action value
 */
export function modifyFailure(entity, counterKey, actionValue = 1) {
  const oldValue = entity.getFlag(MODULE.ID, `${counterKey}.failure`) ?? 0;
  const maxValue = getMax(entity, counterKey) || entity.getFlag(MODULE.ID, `${counterKey}.max`);
  const newValue = (maxValue) ? Math.min(oldValue + actionValue, maxValue) : oldValue + actionValue;

  if ( newValue >= 0 && (!maxValue || newValue <= maxValue) ) {
    entity.setFlag(MODULE.ID, `${counterKey}.failure`, newValue);
  } else {
    if ( newValue >= 0 && oldValue < maxValue ) {
      entity.setFlag(MODULE.ID, `${counterKey}.failure`, maxValue);
    }
    ui.notifications.info(game.i18n.localize("CUSTOM_DND5E.reachedCounterLimit"));
  }
}

/* -------------------------------------------- */

/**
 * Get counter setting by the entity.
 * @param {object} entity The entity: actor or item
 * @param {string} key The counter key
 * @returns {object} The counter setting
 */
function getCounters(entity, key = null) {
  const type = (entity.documentName === "Actor") ? entity.type : "item";
  const settingKey = SETTING_BY_ENTITY_TYPE.COUNTERS[type];

  if ( !getSetting(settingKey) ) {
    return null;
  }

  if ( !key ) {
    return mergeCounters(entity, settingKey);
  }

  if ( key.startsWith("counters.") ) {
    return getFlag(entity, key);
  }

  return getSetting(settingKey)[key];
}

/* -------------------------------------------- */

/**
 * Resolve a max value, handling attribute paths (e.g. @scale.monk.ki-points).
 * @param {object} entity The entity: actor or item
 * @param {number|string} max The max value or attribute path
 * @returns {number|null} The resolved max value
 */
/**
 * Resolve a trigger value, handling attribute paths (e.g. @abilities.str.mod).
 * @param {object} entity The entity: actor or item
 * @param {number|string} value The trigger value or attribute path
 * @returns {number|null} The resolved trigger value
 */
function resolveTriggerValue(entity, value) {
  if ( typeof value === "string" && value.startsWith("@") ) {
    return foundry.utils.getProperty(entity.system, value.substring(1)) ?? null;
  }
  return value;
}

/* -------------------------------------------- */

/**
 * Resolve a max value, handling attribute paths (e.g. @scale.monk.ki-points).
 * @param {object} entity The entity: actor or item
 * @param {number|string} max The max value or attribute path
 * @returns {number|null} The resolved max value
 */
function resolveMax(entity, max) {
  if ( typeof max === "string" && max.startsWith("@") ) {
    return foundry.utils.getProperty(entity.system, max.substring(1)) ?? null;
  }
  return max || null;
}

/* -------------------------------------------- */

/**
 * Get the counter's max value.
 * @param {object} entity The entity: actor or item
 * @param {string} key The counter key
 * @returns {number|null} The max value
 */
function getMax(entity, key) {
  const setting = getCounters(entity, key);
  return resolveMax(entity, setting?.max);
}
