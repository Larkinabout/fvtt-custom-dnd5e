import { CONSTANTS, MODULE, SETTING_BY_ENTITY_TYPE, SHEET_TYPE } from "../constants.js";
import { c5eLoadTemplates, checkEmpty, getFlag, getSetting, registerMenu, registerSetting } from "../utils.js";
import { CountersForm } from "../forms/counters/counters-form.js";
import { CountersFormEntity } from "../forms/counters/counters-form-entity.js";

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
    constants.SETTING.ACTOR_COUNTERS.KEY,
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
  Hooks.on("preUpdateItem", handlePreUpdateItem);
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
    context.counters = mergeCounters(sheet.document, CONSTANTS.COUNTERS.SETTING.ACTOR_COUNTERS.KEY);
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
  const settingKey = CONSTANTS.COUNTERS.SETTING.ACTOR_COUNTERS.KEY;
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
  if ( !actor.isOwner ) return;
  captureOldCounterValues(actor, data, options);
}

/* -------------------------------------------- */

/**
 * Handle item pre-update triggers.
 * @param {object} item The item
 * @param {object} data The data
 * @param {object} options The options
 * @param {string} userId The user ID
 */
function handlePreUpdateItem(item, data, options, userId) {
  if ( !getSetting(constants.SETTING.COUNTERS.KEY) ) return;
  if ( !item.isOwner ) return;
  captureOldCounterValues(item, data, options);
}

/* -------------------------------------------- */

/**
 * Capture old counter values.
 * @param {Actor|Item} entity The entity
 * @param {object} data The data
 * @param {object} options The options
 */
function captureOldCounterValues(entity, data, options) {
  if ( !hasDataChanged(data) ) return;
  const counters = getCounters(entity);
  if ( !counters ) return;
  const previousValues = {};
  for ( const [counterKey, counter] of Object.entries(counters) ) {
    if ( !["fraction", "number", "pips"].includes(counter.type) ) continue;
    previousValues[counterKey] = counter.value ?? 0;
  }
  options.customDnd5ePreviousCounterValues = previousValues;
}

/* -------------------------------------------- */

/**
 * Whether the counter's value has changed.
 * @param {object} data The data
 * @returns {boolean} Whether the counter's value has changed
 */
export function hasDataChanged(data) {
  return Object.hasOwn(data, "flags")
        && data.flags[MODULE.ID] && !Object.hasOwn(data.flags[MODULE.ID], "-=counters");
}

/* -------------------------------------------- */

/**
 * Get the current value of a counter.
 * @param {object} data The data
 * @param {string} counterKey The counter key
 * @returns {number|null} The counter value
 */
export function getCounterValue(data, counterKey) {
  if ( counterKey.startsWith("counters.") ) {
    const key = counterKey.slice(9);
    return data.flags?.[MODULE.ID]?.counters?.[key]?.value ?? data.flags?.[MODULE.ID]?.counters?.[key] ?? null;
  }
  return data.flags?.[MODULE.ID]?.[counterKey]?.value ?? data.flags?.[MODULE.ID]?.[counterKey] ?? null;
}

/* -------------------------------------------- */

/**
 * Get the success or failure value of a success/failure counter.
 * @param {object} data The data
 * @param {string} counterKey The counter key
 * @param {string} property The property: "success" or "failure"
 * @returns {number|null} The value
 */
export function getSuccessFailureValue(data, counterKey, property) {
  if ( counterKey.startsWith("counters.") ) {
    const key = counterKey.slice(9);
    return data.flags?.[MODULE.ID]?.counters?.[key]?.[property] ?? null;
  }
  return data.flags?.[MODULE.ID]?.[counterKey]?.[property] ?? null;
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
  const actorType = entity.documentName === "Actor" ? entity.type : null;

  return {
    ...processCounters("world", worldCounters, entity, actorType),
    ...processCounters("entity", entityCounters, entity, actorType)
  };
}

/* -------------------------------------------- */

/**
 * Process counters.
 * @param {string} type The type
 * @param {object} counters The counters
 * @param {object} entity The entity
 * @param {string} actorType The actor type
 * @returns {object} The processed counters
 */
function processCounters(type, counters, entity, actorType) {
  return Object.entries(foundry.utils.deepClone(counters))
    .filter(([_, counter]) => {
      if ( !counter.visible || game.user.role < (counter.viewRole ?? 1) ) return false;
      if ( type === "world" && actorType && counter.actorTypes?.length ) {
        if ( !counter.actorTypes.includes(actorType) ) return false;
      }
      return true;
    })
    .reduce((acc, [key, counter]) => {
      const flagKey = `counters.${key}`;
      counter.property = ["checkbox", "number", "pips"].includes(counter.type) ? `${flagKey}.value` : flagKey;
      counter.canEdit = (!counter.editRole || game.user.role >= counter.editRole);
      if ( ["checkbox", "number", "pips"].includes(counter.type) ) {
        counter.value = entity.getFlag(MODULE.ID, counter.property);
      }
      if ( counter.type === "pips" ) {
        counter.max = resolveMax(entity, counter.max) ?? entity.getFlag(MODULE.ID, `${flagKey}.max`) ?? 0;
        counter.pips = Array.fromRange(counter.max, 1).map(n => ({
          n,
          filled: (counter.value ?? 0) >= n,
          canEdit: counter.canEdit
        }));
      }
      if ( counter.type === "fraction" ) {
        counter.value = entity.getFlag(MODULE.ID, `${flagKey}.value`) ?? 0;
        counter.canEditMax = (!counter.max && counter.canEdit);
        counter.max = resolveMax(entity, counter.max) ?? entity.getFlag(MODULE.ID, `${flagKey}.max`) ?? 0;
      }
      if ( counter.type === "successFailure" ) {
        counter.success = entity.getFlag(MODULE.ID, `${flagKey}.success`) ?? 0;
        counter.failure = entity.getFlag(MODULE.ID, `${flagKey}.failure`) ?? 0;
      }
      acc[flagKey] = counter;
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
 * Open the entity counters form.
 * @param {object} entity The entity
 */
export function openForm(entity) {
  const form = new CountersFormEntity(entity);
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
  if ( !counterKey.startsWith("counters.") ) counterKey = `counters.${counterKey}`;
  if ( !counterKey.endsWith(".value") ) counterKey = `${counterKey}.value`;
  entity.setFlag(MODULE.ID, counterKey, true);
}

/* -------------------------------------------- */

/**
 * Uncheck checkbox counter
 * @param {object} entity The entity: actor or item
 * @param {string} counterKey The counter key
 */
export function uncheckCheckbox(entity, counterKey) {
  if ( !counterKey.startsWith("counters.") ) counterKey = `counters.${counterKey}`;
  if ( !counterKey.endsWith(".value") ) counterKey = `${counterKey}.value`;
  entity.setFlag(MODULE.ID, counterKey, false);
}

/* -------------------------------------------- */

/**
 * Toggle checkbox counter.
 * @param {object} entity The entity: actor or item
 * @param {string} counterKey The counter key
 */
export function toggleCheckbox(entity, counterKey) {
  if ( !counterKey.startsWith("counters.") ) counterKey = `counters.${counterKey}`;
  if ( !counterKey.endsWith(".value") ) counterKey = `${counterKey}.value`;
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
  if ( !counterKey.startsWith("counters.") ) counterKey = `counters.${counterKey}`;
  const baseKey = counterKey;
  if ( !counterKey.endsWith(".value") ) counterKey = `${counterKey}.value`;
  const currentValue = entity.getFlag(MODULE.ID, counterKey) ?? 0;
  const max = getMax(entity, baseKey);
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
  if ( !counterKey.startsWith("counters.") ) counterKey = `counters.${counterKey}`;
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
  if ( !counterKey.startsWith("counters.") ) counterKey = `counters.${counterKey}`;
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
  if ( !counterKey.startsWith("counters.") ) counterKey = `counters.${counterKey}`;
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
  if ( !counterKey.startsWith("counters.") ) counterKey = `counters.${counterKey}`;
  if ( !counterKey.endsWith(".value") ) counterKey = `${counterKey}.value`;
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
  if ( !counterKey.startsWith("counters.") ) counterKey = `counters.${counterKey}`;
  if ( !counterKey.endsWith(".value") ) counterKey = `${counterKey}.value`;
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
  if ( !counterKey.startsWith("counters.") ) counterKey = `counters.${counterKey}`;
  const baseKey = counterKey.endsWith(".value") ? counterKey.slice(0, -6) : counterKey;
  if ( !counterKey.endsWith(".value") ) counterKey = `${counterKey}.value`;
  const oldValue = entity.getFlag(MODULE.ID, counterKey) ?? 0;
  const maxValue = getMax(entity, baseKey) ?? entity.getFlag(MODULE.ID, `${baseKey}.max`);
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
  if ( !counterKey.startsWith("counters.") ) counterKey = `counters.${counterKey}`;
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
  if ( !counterKey.startsWith("counters.") ) counterKey = `counters.${counterKey}`;
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
  if ( !counterKey.startsWith("counters.") ) counterKey = `counters.${counterKey}`;
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
  if ( !counterKey.startsWith("counters.") ) counterKey = `counters.${counterKey}`;
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

  let rawKey = key.startsWith("counters.") ? key.slice(9) : key;
  // Strip value/success/failure suffix to get the base counter key
  for ( const suffix of [".value", ".success", ".failure"] ) {
    if ( rawKey.endsWith(suffix) ) { rawKey = rawKey.slice(0, -suffix.length); break; }
  }
  return getSetting(settingKey)[rawKey] || getFlag(entity, `counters.${rawKey}`);
}

/* -------------------------------------------- */

/**
 * Resolve a trigger value, handling attribute paths (e.g. @abilities.str.mod).
 * @param {object} entity The entity: actor or item
 * @param {number|string} value The trigger value or attribute path
 * @returns {number|null} The resolved trigger value
 */
export function resolveTriggerValue(entity, value) {
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

/* -------------------------------------------- */

export const counters = {
  mergeCounters,
  checkCheckbox,
  uncheckCheckbox,
  increaseFraction,
  decreaseFraction,
  setFraction,
  increaseNumber,
  decreaseNumber,
  setNumber,
  hasDataChanged,
  getCounterValue,
  getCounters,
  getSuccessFailureValue,
  resolveTriggerValue
};
