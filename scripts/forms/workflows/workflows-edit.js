import { CONSTANTS, MODULE, SETTING_BY_ENTITY_TYPE } from "../../constants.js";
import { Logger, getFlag, getOperatorChoices, getSetting, setSetting, setFlag, unsetFlag } from "../../utils.js";
import { CustomDnd5eForm } from "../custom-dnd5e-form.js";
import { rebuild, ensureEventHooks } from "../../workflows/workflows.js";
import { RequestRollResultForm } from "./request-roll-result-form.js";

const id = CONSTANTS.WORKFLOWS.ID;
const form = `${id}-edit`;

/* -------------------------------------------- */
/*  Trigger Constants                      */
/* -------------------------------------------- */

export const COUNTER_TRIGGERS = [
  "counterValue", "counterValueIncrease", "counterValueDecrease",
  "checked", "unchecked", "successValue", "failureValue"
];

const TRIGGERS_WITH_VALUE = [
  "rollAttack", "rollAbilityCheck", "rollSavingThrow", "rollSkill",
  "rollToolCheck", "rollConcentration", "rollDeathSave", "rollDamage",
  "counterValue", "successValue", "failureValue"
];

const TRIGGERS_WITH_RESULT = [
  "rollAttack", "rollAbilityCheck", "rollSavingThrow", "rollSkill",
  "rollToolCheck", "rollConcentration", "rollDeathSave"
];

const ROLL_SUBTYPE_TRIGGERS = ["rollAbilityCheck", "rollSavingThrow", "rollSkill", "rollToolCheck"];

const CONDITION_TRIGGERS = ["conditionApplied", "conditionRemoved"];

const EFFECT_TRIGGERS = ["effectEnabled", "effectDisabled"];

const CHECKBOX_TRIGGERS = ["checked", "unchecked"];

const NUMERIC_COUNTER_TRIGGERS = ["counterValue", "counterValueIncrease", "counterValueDecrease"];

const SUCCESS_FAILURE_TRIGGERS = ["successValue", "failureValue"];

/* -------------------------------------------- */
/*  Action Constants                            */
/* -------------------------------------------- */

export const COUNTER_ACTIONS = ["increase", "decrease", "set", "check", "uncheck", "toggle"];

export const ACTIONS_WITH_VALUE = ["increase", "decrease", "set"];

export const WORKFLOW_ACTIONS = ["enableWorkflow", "disableWorkflow", "toggleWorkflow"];

const CHECKBOX_ACTIONS = ["check", "uncheck", "toggle"];

const CONDITION_ACTION_TYPES = ["applyCondition", "removeCondition", "toggleCondition"];

const UPDATE_ACTION_TYPES = ["actorUpdate", "tokenUpdate", "itemUpdate"];

/* -------------------------------------------- */
/*  Result/Operator Constants                   */
/* -------------------------------------------- */

const OPERATOR_VALUES = ["eq", "neq", "lt", "gt"];

const RESULTS_WITH_VALUE = ["successWithin", "failureWithin", "successBy", "failureBy"];

/* -------------------------------------------- */
/*  DOM Helpers                                 */
/* -------------------------------------------- */

/**
 * Rebuild a <select> element's options from choices.
 * Supports grouped array (with optgroups) and flat format.
 * @param {HTMLSelectElement} selectElement
 * @param {object[]|object} choices Grouped array or flat object.
 * @param {object} [options]
 * @param {boolean} [options.localize=false] Whether to localize labels.
 */
function rebuildSelectOptions(selectElement, choices, { localize = false } = {}) {
  if ( !selectElement ) return;
  const currentValue = selectElement.value;
  selectElement.innerHTML = "";

  if ( Array.isArray(choices) ) {
    const groups = new Map();
    for ( const c of choices ) {
      const groupLabel = c.group || "";
      if ( !groups.has(groupLabel) ) groups.set(groupLabel, []);
      groups.get(groupLabel).push(c);
    }
    for ( const [groupLabel, options] of groups ) {
      const parent = groupLabel
        ? selectElement.appendChild(Object.assign(document.createElement("optgroup"), { label: groupLabel }))
        : selectElement;
      for ( const c of options ) {
        const option = document.createElement("option");
        option.value = c.value;
        option.textContent = localize ? game.i18n.localize(c.label) : c.label;
        if ( c.value === currentValue ) option.selected = true;
        parent.appendChild(option);
      }
    }
  } else {
    for ( const [key, label] of Object.entries(choices) ) {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = localize ? game.i18n.localize(label) : label;
      if ( key === currentValue ) option.selected = true;
      selectElement.appendChild(option);
    }
  }
}

/* -------------------------------------------- */
/*  Choice Builders                             */
/* -------------------------------------------- */

/**
 * Build trigger event choices grouped by category.
 * @param {string} [entityType="actor"] The entity type.
 * @returns {object[]} Trigger choice objects with value, label, and group.
 */
function getTriggerChoices(entityType = "actor") {
  const choices = [];

  if ( entityType === "actor" ) {
    const rollsGroup = game.i18n.localize("CUSTOM_DND5E.form.workflows.trigger.group.rolls");
    const hpGroup = game.i18n.localize("CUSTOM_DND5E.form.workflows.trigger.group.hitPoints");
    const combatGroup = game.i18n.localize("CUSTOM_DND5E.form.workflows.trigger.group.combat");
    const restGroup = game.i18n.localize("CUSTOM_DND5E.form.workflows.trigger.group.rest");
    const conditionsGroup = game.i18n.localize("CUSTOM_DND5E.form.workflows.trigger.group.conditions");

    choices.push(
      { value: "rollAttack", label: "CUSTOM_DND5E.form.workflows.trigger.choices.rollAttack", group: rollsGroup },
      { value: "rollAbilityCheck", label: "CUSTOM_DND5E.form.workflows.trigger.choices.rollAbilityCheck", group: rollsGroup },
      { value: "rollSavingThrow", label: "CUSTOM_DND5E.form.workflows.trigger.choices.rollSavingThrow", group: rollsGroup },
      { value: "rollSkill", label: "CUSTOM_DND5E.form.workflows.trigger.choices.rollSkill", group: rollsGroup },
      { value: "rollToolCheck", label: "CUSTOM_DND5E.form.workflows.trigger.choices.rollToolCheck", group: rollsGroup },
      { value: "rollInitiative", label: "CUSTOM_DND5E.form.workflows.trigger.choices.rollInitiative", group: rollsGroup },
      { value: "rollConcentration", label: "CUSTOM_DND5E.form.workflows.trigger.choices.rollConcentration", group: rollsGroup },
      { value: "rollDeathSave", label: "CUSTOM_DND5E.form.workflows.trigger.choices.rollDeathSave", group: rollsGroup },
      { value: "rollDamage", label: "CUSTOM_DND5E.form.workflows.trigger.choices.rollDamage", group: rollsGroup },
      { value: "zeroHp", label: "CUSTOM_DND5E.form.workflows.trigger.choices.zeroHp", group: hpGroup },
      { value: "halfHp", label: "CUSTOM_DND5E.form.workflows.trigger.choices.halfHp", group: hpGroup },
      { value: "loseHp", label: "CUSTOM_DND5E.form.workflows.trigger.choices.loseHp", group: hpGroup },
      { value: "gainHp", label: "CUSTOM_DND5E.form.workflows.trigger.choices.gainHp", group: hpGroup },
      { value: "startOfCombat", label: "CUSTOM_DND5E.startOfCombat", group: combatGroup },
      { value: "endOfCombat", label: "CUSTOM_DND5E.endOfCombat", group: combatGroup },
      { value: "startOfTurn", label: "CUSTOM_DND5E.startOfTurn", group: combatGroup },
      { value: "endOfTurn", label: "CUSTOM_DND5E.endOfTurn", group: combatGroup },
      { value: "zeroHpCombatEnd", label: "CUSTOM_DND5E.form.counters.triggers.trigger.choices.zeroHpCombatEnd", group: combatGroup },
      { value: "shortRest", label: "CUSTOM_DND5E.shortRest", group: restGroup },
      { value: "longRest", label: "CUSTOM_DND5E.longRest", group: restGroup },
      { value: "conditionApplied", label: "CUSTOM_DND5E.form.workflows.trigger.choices.conditionApplied", group: conditionsGroup },
      { value: "conditionRemoved", label: "CUSTOM_DND5E.form.workflows.trigger.choices.conditionRemoved", group: conditionsGroup }
    );

    const effectsGroup = game.i18n.localize("CUSTOM_DND5E.form.workflows.trigger.group.effects");
    choices.push(
      { value: "effectEnabled", label: "CUSTOM_DND5E.form.workflows.trigger.choices.effectEnabled", group: effectsGroup },
      { value: "effectDisabled", label: "CUSTOM_DND5E.form.workflows.trigger.choices.effectDisabled", group: effectsGroup }
    );

    const equipmentGroup = game.i18n.localize("CUSTOM_DND5E.form.workflows.trigger.group.equipment");
    choices.push(
      { value: "equip", label: "CUSTOM_DND5E.form.workflows.trigger.choices.equip", group: equipmentGroup },
      { value: "unequip", label: "CUSTOM_DND5E.form.workflows.trigger.choices.unequip", group: equipmentGroup }
    );
  }

  const countersGroup = game.i18n.localize("CUSTOM_DND5E.form.workflows.trigger.group.counters");
  choices.push(
    { value: "counterValue", label: "CUSTOM_DND5E.form.counters.triggers.trigger.choices.counterValue", group: countersGroup },
    { value: "counterValueIncrease", label: "CUSTOM_DND5E.form.counters.triggers.trigger.choices.increaseCounter", group: countersGroup },
    { value: "counterValueDecrease", label: "CUSTOM_DND5E.form.counters.triggers.trigger.choices.decreaseCounter", group: countersGroup },
    { value: "checked", label: "CUSTOM_DND5E.form.counters.triggers.trigger.choices.checkCounter", group: countersGroup },
    { value: "unchecked", label: "CUSTOM_DND5E.form.counters.triggers.trigger.choices.uncheckCounter", group: countersGroup },
    { value: "successValue", label: "CUSTOM_DND5E.form.counters.triggers.trigger.choices.successValue", group: countersGroup },
    { value: "failureValue", label: "CUSTOM_DND5E.form.counters.triggers.trigger.choices.failureValue", group: countersGroup }
  );

  if ( entityType === "item" ) {
    const rollsGroup = game.i18n.localize("CUSTOM_DND5E.form.workflows.trigger.group.rolls");
    const equipmentGroup = game.i18n.localize("CUSTOM_DND5E.form.workflows.trigger.group.equipment");
    choices.unshift(
      { value: "rollAttack", label: "CUSTOM_DND5E.form.workflows.trigger.choices.rollAttack", group: rollsGroup },
      { value: "equip", label: "CUSTOM_DND5E.form.workflows.trigger.choices.equip", group: equipmentGroup },
      { value: "unequip", label: "CUSTOM_DND5E.form.workflows.trigger.choices.unequip", group: equipmentGroup }
    );
  }

  return choices;
}

/* -------------------------------------------- */

/**
 * Build result/operator choices for roll triggers.
 * @returns {object[]} Choice objects with value, label, and group.
 */
function getResultOperatorChoices() {
  const resultGroup = game.i18n.localize("CUSTOM_DND5E.form.workflows.triggerResult.group.result");
  const marginGroup = game.i18n.localize("CUSTOM_DND5E.form.workflows.triggerResult.group.margin");
  const valueGroup = game.i18n.localize("CUSTOM_DND5E.form.workflows.triggerResult.group.value");
  return [
    { value: "", label: "CUSTOM_DND5E.form.workflows.triggerResult.choices.any", group: resultGroup },
    { value: "success", label: "CUSTOM_DND5E.form.workflows.triggerResult.choices.success", group: resultGroup },
    { value: "failure", label: "CUSTOM_DND5E.form.workflows.triggerResult.choices.failure", group: resultGroup },
    { value: "successWithin", label: "CUSTOM_DND5E.form.workflows.triggerResult.choices.successWithin", group: marginGroup },
    { value: "failureWithin", label: "CUSTOM_DND5E.form.workflows.triggerResult.choices.failureWithin", group: marginGroup },
    { value: "successBy", label: "CUSTOM_DND5E.form.workflows.triggerResult.choices.successBy", group: marginGroup },
    { value: "failureBy", label: "CUSTOM_DND5E.form.workflows.triggerResult.choices.failureBy", group: marginGroup },
    { value: "eq", label: "CUSTOM_DND5E.form.counters.triggers.triggerOperator.choices.eq", group: valueGroup },
    { value: "lt", label: "CUSTOM_DND5E.form.counters.triggers.triggerOperator.choices.lt", group: valueGroup },
    { value: "gt", label: "CUSTOM_DND5E.form.counters.triggers.triggerOperator.choices.gt", group: valueGroup },
    { value: "neq", label: "CUSTOM_DND5E.form.counters.triggers.triggerOperator.choices.neq", group: valueGroup }
  ];
}

/* -------------------------------------------- */

/**
 * Build action type choices grouped by category.
 * @param {string} [entityType="actor"] The entity type.
 * @returns {object[]} Action choice objects with value, label, and group.
 */
export function getActionChoices(entityType = "actor") {
  const choices = [];

  const countersGroup = game.i18n.localize("CUSTOM_DND5E.form.workflows.action.group.counters");
  choices.push(
    { value: "increase", label: "CUSTOM_DND5E.increaseCounter", group: countersGroup },
    { value: "decrease", label: "CUSTOM_DND5E.decreaseCounter", group: countersGroup },
    { value: "set", label: "CUSTOM_DND5E.setCounter", group: countersGroup },
    { value: "check", label: "CUSTOM_DND5E.checkCounter", group: countersGroup },
    { value: "uncheck", label: "CUSTOM_DND5E.uncheckCounter", group: countersGroup },
    { value: "toggle", label: "CUSTOM_DND5E.toggleCounter", group: countersGroup }
  );

  const conditionsGroup = game.i18n.localize("CUSTOM_DND5E.form.workflows.action.group.conditions");
  choices.push(
    { value: "applyCondition", label: "CUSTOM_DND5E.form.workflows.action.choices.applyCondition", group: conditionsGroup },
    { value: "removeCondition", label: "CUSTOM_DND5E.form.workflows.action.choices.removeCondition", group: conditionsGroup },
    { value: "toggleCondition", label: "CUSTOM_DND5E.form.workflows.action.choices.toggleCondition", group: conditionsGroup }
  );

  const generalGroup = game.i18n.localize("CUSTOM_DND5E.form.workflows.action.group.general");
  choices.push(
    { value: "macro", label: "CUSTOM_DND5E.macro", group: generalGroup },
    { value: "actorUpdate", label: "CUSTOM_DND5E.form.workflows.action.choices.actorUpdate", group: generalGroup },
    { value: "distributeAward", label: "CUSTOM_DND5E.form.workflows.action.choices.distributeAward", group: generalGroup },
    { value: "playSound", label: "CUSTOM_DND5E.form.workflows.action.choices.playSound", group: generalGroup },
    { value: "requestRoll", label: "CUSTOM_DND5E.form.workflows.action.choices.requestRoll", group: generalGroup },
    { value: "rollTable", label: "CUSTOM_DND5E.form.workflows.action.choices.rollTable", group: generalGroup },
    { value: "tokenUpdate", label: "CUSTOM_DND5E.form.workflows.action.choices.tokenUpdate", group: generalGroup }
  );

  const workflowsGroup = game.i18n.localize("CUSTOM_DND5E.form.workflows.action.group.workflows");
  choices.push(
    { value: "enableWorkflow", label: "CUSTOM_DND5E.enableWorkflow", group: workflowsGroup },
    { value: "disableWorkflow", label: "CUSTOM_DND5E.disableWorkflow", group: workflowsGroup },
    { value: "toggleWorkflow", label: "CUSTOM_DND5E.toggleWorkflow", group: workflowsGroup }
  );

  if ( entityType === "item" ) {
    const itemsGroup = game.i18n.localize("CUSTOM_DND5E.form.workflows.action.group.items");
    choices.push(
      { value: "destroy", label: "CUSTOM_DND5E.destroyItem", group: itemsGroup },
      { value: "equip", label: "CUSTOM_DND5E.form.workflows.action.choices.equip", group: itemsGroup },
      { value: "itemUpdate", label: "CUSTOM_DND5E.form.workflows.action.choices.itemUpdate", group: itemsGroup },
      { value: "reduceQuantity", label: "CUSTOM_DND5E.reduceQuantity", group: itemsGroup },
      { value: "unequip", label: "CUSTOM_DND5E.form.workflows.action.choices.unequip", group: itemsGroup }
    );
  }

  return choices;
}

/* -------------------------------------------- */

/**
 * Build action choices excluding requestRoll.
 * @param {string} [entityType="actor"] The entity type.
 * @returns {object[]} Filtered action choice objects.
 */
export function getSubActionChoices(entityType = "actor") {
  return getActionChoices(entityType).filter(c => c.value !== "requestRoll");
}

/* -------------------------------------------- */

/**
 * Build condition choices from status effects.
 * @returns {object} Map of condition id to name.
 */
export function getConditionChoices() {
  const choices = {
    all: "CUSTOM_DND5E.form.workflows.action.condition.all"
  };
  for ( const effect of CONFIG.statusEffects ) {
    if ( effect.id ) choices[effect.id] = effect.name;
  }
  return choices;
}

/* -------------------------------------------- */

/**
 * Build subtype choices for a roll trigger event.
 * @param {string} triggerEvent The trigger event type.
 * @returns {object} Map of subtype key to label.
 */
function getRollSubtypeChoices(triggerEvent) {
  const choices = { "": game.i18n.localize("CUSTOM_DND5E.any") };
  let config;
  switch ( triggerEvent ) {
    case "rollAbilityCheck":
    case "rollSavingThrow":
      config = CONFIG.DND5E.abilities;
      break;
    case "rollSkill":
      config = CONFIG.DND5E.skills;
      break;
    case "rollToolCheck":
      config = CONFIG.DND5E.tools;
      break;
    default:
      return choices;
  }
  for ( const [key, value] of Object.entries(config) ) {
    choices[key] = value.label || key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase());
  }
  return choices;
}

/* -------------------------------------------- */

/**
 * Build roll type choices for saves, checks, and skills.
 * @returns {object} Map of roll type key to label.
 */
export function getRollTypeChoices() {
  const choices = {};
  const savingThrowLabel = game.i18n.localize("CUSTOM_DND5E.savingThrow");
  const checkLabel = game.i18n.localize("CUSTOM_DND5E.check");

  for ( const [key, ability] of Object.entries(CONFIG.DND5E.abilities) ) {
    choices[`save:${key}`] = `${ability.label} ${savingThrowLabel}`;
    choices[`check:${key}`] = `${ability.label} ${checkLabel}`;
  }

  for ( const [key, skill] of Object.entries(CONFIG.DND5E.skills) ) {
    choices[`skill:${key}`] = skill.label;
  }

  return choices;
}

/* -------------------------------------------- */
/*  Counter Choices                             */
/* -------------------------------------------- */

/**
 * Build counter choices from world and entity-level counters.
 * @param {string} [entityType="actor"] The entity type.
 * @param {Actor|Item|null} [entity=null] Optional entity for entity-level counters.
 * @returns {object} Map of counter key to label and type.
 */
export function getCounterChoices(entityType = "actor", entity = null) {
  const choices = {};
  const settingKey = entityType === "item"
    ? SETTING_BY_ENTITY_TYPE.COUNTERS.item
    : CONSTANTS.COUNTERS.SETTING.ACTOR_COUNTERS.KEY;
  const counters = getSetting(settingKey) || {};
  for ( const [key, counter] of Object.entries(counters) ) {
    if ( !choices[key] ) {
      choices[key] = {
        label: game.i18n.localize(counter.label) || key,
        type: counter.type || "number"
      };
    }
  }

  if ( entity ) {
    const entityCounters = getFlag(entity, "counters") || {};
    for ( const [key, counter] of Object.entries(entityCounters) ) {
      if ( !counter.type ) continue;
      if ( !choices[key] ) {
        choices[key] = {
          label: game.i18n.localize(counter.label) || key,
          type: counter.type || "number"
        };
      }
    }
  }

  return choices;
}

/**
 * Extract labels from counter choices.
 * @param {object} counterChoices Counter choices map.
 * @returns {object} Map of counter key to label string.
 */
export function getCounterChoiceLabels(counterChoices) {
  const labels = {};
  for ( const [key, data] of Object.entries(counterChoices) ) {
    labels[key] = data.label;
  }
  return labels;
}

/**
 * Filter counter choice labels by action type compatibility.
 * @param {object} counterChoices Counter choices map.
 * @param {string} actionType The action type.
 * @returns {object} Filtered map of counter key to label.
 */
export function getFilteredCounterChoiceLabels(counterChoices, actionType) {
  const labels = {};
  for ( const [key, data] of Object.entries(counterChoices) ) {
    if ( CHECKBOX_ACTIONS.includes(actionType) && data.type !== "checkbox" ) continue;
    if ( ACTIONS_WITH_VALUE.includes(actionType) && data.type === "checkbox" ) continue;
    labels[key] = data.label;
  }
  return labels;
}

/**
 * Filter counter choice labels by trigger event compatibility.
 * @param {object} counterChoices Counter choices map.
 * @param {string} triggerEvent The trigger event type.
 * @returns {object} Filtered map of counter key to label.
 */
function getFilteredTriggerCounterChoiceLabels(counterChoices, triggerEvent) {
  const labels = {};
  const isCheckbox = CHECKBOX_TRIGGERS.includes(triggerEvent);
  const isNumeric = NUMERIC_COUNTER_TRIGGERS.includes(triggerEvent);
  const isSuccessFailure = SUCCESS_FAILURE_TRIGGERS.includes(triggerEvent);
  for ( const [key, data] of Object.entries(counterChoices) ) {
    if ( isCheckbox && data.type !== "checkbox" ) continue;
    if ( isNumeric && (data.type === "checkbox" || data.type === "successFailure") ) continue;
    if ( isSuccessFailure && data.type !== "successFailure" ) continue;
    labels[key] = data.label;
  }
  return labels;
}

/* -------------------------------------------- */
/*  Workflow Choices                            */
/* -------------------------------------------- */

/**
 * Build a dropdown of target workflows for enable/disable/toggle actions.
 * @param {string} entityType The entity type.
 * @param {Actor|Item|null} entity Optional entity for entity-level workflows.
 * @param {object|null} setting Optional world-level setting object.
 * @returns {object} Map of workflow key to name.
 */
export function getWorkflowChoices(entityType, entity, setting) {
  const choices = {};
  const workflows = entity
    ? (getFlag(entity, "triggers") || {})
    : (setting || {});
  for ( const [key, group] of Object.entries(workflows) ) {
    if ( group.name ) choices[key] = group.name;
  }
  return choices;
}

/* -------------------------------------------- */
/*  WorkflowsEditForm                          */
/* -------------------------------------------- */

export class WorkflowsEditForm extends CustomDnd5eForm {
  constructor(args) {
    super(args);

    this.workflowsForm = args.workflowsForm;
    this.setting = args.setting;
    this.key = args.data.key;
    this.name = args.data.name;
    this.entity = args.data.entity;
    this.entityType = args.data.entityType || "actor";
    this._requestRollResults = {};

    this.headerButton = {
      icon: "fa-passport",
      tooltip: "CUSTOM_DND5E.form.workflows.copyId.tooltip",
      action: "copyId",
      uuid: this.key
    };
  }

  /* -------------------------------------------- */

  static DEFAULT_OPTIONS = {
    actions: {
      addTrigger: WorkflowsEditForm.addTrigger,
      addAction: WorkflowsEditForm.addAction,
      copyId: WorkflowsEditForm.copyId,
      deleteRow: WorkflowsEditForm.deleteRow,
      clearTable: WorkflowsEditForm.clearTable,
      editResult: WorkflowsEditForm.editResult
    },
    form: {
      handler: WorkflowsEditForm.submit,
      closeOnSubmit: false
    },
    id: `${MODULE.ID}-${form}`,
    window: {
      title: "CUSTOM_DND5E.form.workflows.edit.title"
    }
  };

  /* -------------------------------------------- */

  static PARTS = {
    form: {
      template: `modules/${MODULE.ID}/templates/workflows/${form}.hbs`
    }
  };

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext() {
    const group = this.setting[this.key] || {};
    const triggerChoices = getTriggerChoices(this.entityType);
    const actionChoices = getActionChoices(this.entityType);
    const conditionChoices = getConditionChoices();
    const rollTypeChoices = getRollTypeChoices();
    const operatorChoices = getOperatorChoices();
    const resultOperatorChoices = getResultOperatorChoices();
    this.counterChoices = getCounterChoices(this.entityType, this.entity);
    const workflowChoices = getWorkflowChoices(this.entityType, this.entity, this.setting);
    // Build triggers array
    const triggersObj = group.triggers || {};
    const triggers = [];
    for ( const [triggerId, t] of Object.entries(triggersObj) ) {
      const triggerEvent = t.event || "rollAttack";
      const isResultEvent = TRIGGERS_WITH_RESULT.includes(triggerEvent);
      const isValueEvent = TRIGGERS_WITH_VALUE.includes(triggerEvent);

      // Derive combined select value from either result or operator
      const result = isResultEvent
        ? (t.result || t.operator || "")
        : isValueEvent
          ? (t.operator || "eq")
          : "";

      triggers.push({
        triggerId,
        event: triggerEvent,
        value: t.value ?? "",
        showCounterSelect: COUNTER_TRIGGERS.includes(triggerEvent),
        counterKey: t.counterKey || "",
        result,
        showCondition: isValueEvent,
        showValueInput: OPERATOR_VALUES.includes(result) || RESULTS_WITH_VALUE.includes(result),
        showConditionSelect: CONDITION_TRIGGERS.includes(triggerEvent),
        conditionId: t.conditionId || "",
        showEffectNameInput: EFFECT_TRIGGERS.includes(triggerEvent),
        effectName: t.effectName || "",
        showRollSubtype: ROLL_SUBTYPE_TRIGGERS.includes(triggerEvent),
        rollSubtype: t.rollSubtype || "",
        rollSubtypeChoices: getRollSubtypeChoices(triggerEvent),
        conditionChoicesForTrigger: isResultEvent ? resultOperatorChoices : operatorChoices,
        triggerChoices,
        conditionChoices,
        counterChoices: getFilteredTriggerCounterChoiceLabels(this.counterChoices, triggerEvent)
      });
    }

    // Build actions array
    const actionsObj = group.actions || {};
    const actions = [];
    for ( const [actionId, a] of Object.entries(actionsObj) ) {
      const macroName = a.macroUuid ? (await fromUuid(a.macroUuid))?.name ?? "" : "";
      const tableName = a.tableUuid ? (await fromUuid(a.tableUuid))?.name ?? "" : "";
      const isConditionAction = CONDITION_ACTION_TYPES.includes(a.type);
      const actionType = a.type || "macro";

      // Populate _requestRollResults from saved data on initial load
      if ( a.onSuccess && !this._requestRollResults[actionId]?.onSuccess ) {
        this._requestRollResults[actionId] ??= {};
        this._requestRollResults[actionId].onSuccess = a.onSuccess;
      }
      if ( a.onFailure && !this._requestRollResults[actionId]?.onFailure ) {
        this._requestRollResults[actionId] ??= {};
        this._requestRollResults[actionId].onFailure = a.onFailure;
      }

      const onSuccessData = this._requestRollResults[actionId]?.onSuccess || a.onSuccess || {};
      const onFailureData = this._requestRollResults[actionId]?.onFailure || a.onFailure || {};

      actions.push({
        actionId,
        type: actionType,
        macroUuid: a.macroUuid || "",
        macroName,
        sound: { path: a.sound?.path || "", volume: a.sound?.volume ?? 0.8 },
        conditionId: a.conditionId || "",
        showCondition: isConditionAction,
        roll: { type: a.roll?.type || "", dc: a.roll?.dc ?? "" },
        showRollType: actionType === "requestRoll",
        tableUuid: a.tableUuid || "",
        tableName,
        updatePath: a.updatePath || "",
        updateValue: a.updateValue || "",
        showUpdate: UPDATE_ACTION_TYPES.includes(actionType),
        showCounterAction: COUNTER_ACTIONS.includes(actionType),
        counterKey: a.counterKey || "",
        actionValue: a.actionValue ?? "",
        showActionValue: ACTIONS_WITH_VALUE.includes(actionType),
        showWorkflowSelect: WORKFLOW_ACTIONS.includes(actionType),
        workflowKey: a.workflowKey || "",
        workflowChoices,
        hasResultActions: Object.keys(onSuccessData).length > 0 || Object.keys(onFailureData).length > 0,
        actionChoices,
        conditionChoices,
        rollTypeChoices,
        counterChoices: getFilteredCounterChoiceLabels(this.counterChoices, actionType)
      });
    }

    return {
      key: this.key,
      name: group.name || "",
      isActor: !!this.entity,
      isItem: this.entityType === "item",
      isGroup: !!(this.entity && this.entity.type === "group"),
      target: group.target || "group",
      actorTypes: {
        character: group.actorTypes ? group.actorTypes.includes("character") : true,
        npc: group.actorTypes ? group.actorTypes.includes("npc") : true,
        group: group.actorTypes ? group.actorTypes.includes("group") : false
      },
      triggers,
      actions
    };
  }

  /* -------------------------------------------- */

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);

    // Toggle target group visibility when Groups checkbox changes (world-level only)
    const groupsCheckbox = this.element.querySelector('dnd5e-checkbox[name="actorTypes.group"]');
    const targetGroup = this.element.querySelector(".custom-dnd5e-target-group");
    if ( groupsCheckbox && targetGroup ) {
      groupsCheckbox.addEventListener("change", () => {
        targetGroup.classList.toggle("hidden", !groupsCheckbox.checked);
      });
    }

    const triggerRows = this.element.querySelectorAll(".custom-dnd5e-trigger-list .item");
    triggerRows.forEach(row => this._setupTriggerRow(row));

    const actionRows = this.element.querySelectorAll(".custom-dnd5e-action-list .item");
    actionRows.forEach(row => this._setupActionRow(row));
  }

  /* -------------------------------------------- */
  /*  Row Setup                                   */
  /* -------------------------------------------- */

  /**
   * Configure event listeners and visibility for a trigger row.
   * @param {HTMLElement} row The trigger row element.
   */
  _setupTriggerRow(row) {
    const eventSelect = row.querySelector(".custom-dnd5e-trigger-event");
    const triggerFields = row.querySelector(".custom-dnd5e-trigger-fields");
    const counterGroup = row.querySelector(".custom-dnd5e-counter-trigger-group");
    const conditionGroup = row.querySelector(".custom-dnd5e-trigger-condition-group");
    const conditionTriggerGroup = row.querySelector(".custom-dnd5e-condition-trigger-group");
    const rollSubtypeGroup = row.querySelector(".custom-dnd5e-roll-subtype-group");
    const effectTriggerGroup = row.querySelector(".custom-dnd5e-effect-trigger-group");
    const rollSubtypeSelect = row.querySelector(".custom-dnd5e-roll-subtype-select");
    const resultSelect = row.querySelector(".custom-dnd5e-trigger-result");
    const valueInput = row.querySelector(".custom-dnd5e-trigger-value");

    if ( eventSelect ) {
      const counterSelect = row.querySelector(".custom-dnd5e-counter-select");

      const rebuildConditionChoices = () => {
        const isResultEvent = TRIGGERS_WITH_RESULT.includes(eventSelect.value);
        const choices = isResultEvent ? getResultOperatorChoices() : getOperatorChoices();
        rebuildSelectOptions(resultSelect, choices, { localize: true });
      };

      const rebuildRollSubtypeChoices = () => {
        rebuildSelectOptions(rollSubtypeSelect, getRollSubtypeChoices(eventSelect.value));
      };

      const updateVisibility = () => {
        const isValueEvent = TRIGGERS_WITH_VALUE.includes(eventSelect.value);
        const isCounterEvent = COUNTER_TRIGGERS.includes(eventSelect.value);
        const isConditionEvent = CONDITION_TRIGGERS.includes(eventSelect.value);
        const isEffectEvent = EFFECT_TRIGGERS.includes(eventSelect.value);
        const isRollSubtypeEvent = ROLL_SUBTYPE_TRIGGERS.includes(eventSelect.value);

        counterGroup?.classList.toggle("hidden", !isCounterEvent);
        conditionGroup?.classList.toggle("hidden", !isValueEvent);
        conditionTriggerGroup?.classList.toggle("hidden", !isConditionEvent);
        effectTriggerGroup?.classList.toggle("hidden", !isEffectEvent);
        rollSubtypeGroup?.classList.toggle("hidden", !isRollSubtypeEvent);
        valueInput?.classList.toggle("hidden", !OPERATOR_VALUES.includes(resultSelect?.value) && !RESULTS_WITH_VALUE.includes(resultSelect?.value));

        // Hide the wrapper when no child group is visible
        triggerFields?.classList.toggle("hidden",
          ![counterGroup, conditionGroup, conditionTriggerGroup, rollSubtypeGroup, effectTriggerGroup]
            .some(g => g && !g.classList.contains("hidden"))
        );

        // Rebuild counter select options filtered by trigger event
        if ( this.counterChoices ) {
          const filtered = getFilteredTriggerCounterChoiceLabels(this.counterChoices, eventSelect.value);
          rebuildSelectOptions(counterSelect, filtered);
        }
      };

      eventSelect.addEventListener("change", () => {
        rebuildConditionChoices();
        rebuildRollSubtypeChoices();
        updateVisibility();
      });
      resultSelect?.addEventListener("change", updateVisibility);
      updateVisibility();
    }
  }

  /* -------------------------------------------- */

  /**
   * Configure event listeners and visibility for an action row.
   * @param {HTMLElement} row The action row element.
   */
  _setupActionRow(row) {
    const typeSelect = row.querySelector(".custom-dnd5e-action-type");
    const actionFields = row.querySelector(".custom-dnd5e-action-fields");
    const macroGroup = row.querySelector(".custom-dnd5e-macro-group");
    const soundGroup = row.querySelector(".custom-dnd5e-sound-group");
    const conditionGroup = row.querySelector(".custom-dnd5e-condition-group");
    const rollTypeGroup = row.querySelector(".custom-dnd5e-roll-type-group");
    const tableGroup = row.querySelector(".custom-dnd5e-table-group");
    const updateGroup = row.querySelector(".custom-dnd5e-update-group");
    const counterActionGroup = row.querySelector(".custom-dnd5e-counter-action-group");
    const actionValueGroup = row.querySelector(".custom-dnd5e-action-value-group");
    const workflowGroup = row.querySelector(".custom-dnd5e-workflow-group");
    const macroDrop = row.querySelector(".custom-dnd5e-macro-drop");

    if ( typeSelect ) {
      const counterSelect = row.querySelector(".custom-dnd5e-counter-select");
      const updateVisibility = () => {
        macroGroup?.classList.toggle("hidden", typeSelect.value !== "macro");
        soundGroup?.classList.toggle("hidden", typeSelect.value !== "playSound");
        conditionGroup?.classList.toggle("hidden", !CONDITION_ACTION_TYPES.includes(typeSelect.value));
        rollTypeGroup?.classList.toggle("hidden", typeSelect.value !== "requestRoll");
        tableGroup?.classList.toggle("hidden", typeSelect.value !== "rollTable");
        updateGroup?.classList.toggle("hidden", !UPDATE_ACTION_TYPES.includes(typeSelect.value));
        counterActionGroup?.classList.toggle("hidden", !COUNTER_ACTIONS.includes(typeSelect.value));
        actionValueGroup?.classList.toggle("hidden", !ACTIONS_WITH_VALUE.includes(typeSelect.value));
        workflowGroup?.classList.toggle("hidden", !WORKFLOW_ACTIONS.includes(typeSelect.value));

        // Hide the wrapper when no child group is visible
        actionFields?.classList.toggle("hidden",
          ![macroGroup, soundGroup, conditionGroup, rollTypeGroup, tableGroup, updateGroup, counterActionGroup, workflowGroup]
            .some(g => g && !g.classList.contains("hidden"))
        );

        // Rebuild counter select options filtered by action type
        if ( this.counterChoices ) {
          rebuildSelectOptions(counterSelect, getFilteredCounterChoiceLabels(this.counterChoices, typeSelect.value));
        }
      };
      typeSelect.addEventListener("change", updateVisibility);
      updateVisibility();
    }

    if ( macroDrop ) {
      macroDrop.addEventListener("drop", event => this._onDropMacro(event, row));
    }

    const soundDrop = row.querySelector(".custom-dnd5e-sound-drop");
    if ( soundDrop ) {
      soundDrop.addEventListener("drop", event => this._onDropSound(event, row));
    }

    const tableDrop = row.querySelector(".custom-dnd5e-table-drop");
    if ( tableDrop ) {
      tableDrop.addEventListener("drop", event => this._onDropTable(event, row));
    }
  }

  /* -------------------------------------------- */
  /*  Drop Handlers                               */
  /* -------------------------------------------- */

  /**
   * Handle dropping a playlist sound onto a row.
   * @param {DragEvent} event The drop event.
   * @param {HTMLElement} row The action row element.
   */
  async _onDropSound(event, row) {
    event.preventDefault();
    event.stopPropagation();
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if ( data?.type !== "PlaylistSound" ) return;
    const sound = await fromUuid(data.uuid);
    if ( !sound ) return;

    const pathInput = row.querySelector('input[name$=".sound.path"]');
    const volumeInput = row.querySelector('input[name$=".sound.volume"]');
    if ( pathInput ) pathInput.value = sound.path;
    if ( volumeInput ) volumeInput.value = sound.volume;
  }

  /* -------------------------------------------- */

  /**
   * Handle dropping a roll table onto a row.
   * @param {DragEvent} event The drop event.
   * @param {HTMLElement} row The action row element.
   */
  async _onDropTable(event, row) {
    event.preventDefault();
    event.stopPropagation();
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if ( data?.type !== "RollTable" ) return;
    const table = await RollTable.implementation.fromDropData(data);
    if ( !table ) return;

    const input = row.querySelector('input[name$=".tableUuid"]');
    if ( input ) input.value = table.uuid;

    const tableField = row.querySelector(".custom-dnd5e-table-field");
    const dropArea = row.querySelector(".custom-dnd5e-table-drop .drop-area");
    const nameEl = row.querySelector(".custom-dnd5e-table-name");
    if ( nameEl ) nameEl.textContent = table.name;
    if ( tableField ) tableField.classList.remove("hidden");
    if ( dropArea ) dropArea.classList.add("hidden");
  }

  /* -------------------------------------------- */
  /*  Actions                                     */
  /* -------------------------------------------- */

  /**
   * Add a new trigger row to the form.
   * @param {Event} event The triggering event.
   * @param {HTMLElement} target The clicked element.
   */
  static async addTrigger(event, target) {
    const triggerId = foundry.utils.randomID();
    const context = {
      triggerId,
      event: "rollAttack",
      value: "",
      showCounterSelect: false,
      counterKey: "",
      result: "",
      showCondition: true,
      showValueInput: false,
      showConditionSelect: false,
      conditionId: "",
      showEffectNameInput: false,
      effectName: "",
      showRollSubtype: false,
      rollSubtype: "",
      rollSubtypeChoices: getRollSubtypeChoices("rollAttack"),
      conditionChoicesForTrigger: getResultOperatorChoices(),
      triggerChoices: getTriggerChoices(this.entityType),
      conditionChoices: getConditionChoices(),
      counterChoices: getCounterChoiceLabels(getCounterChoices(this.entityType, this.entity))
    };

    const html = await foundry.applications.handlebars.renderTemplate(
      CONSTANTS.WORKFLOWS.TEMPLATE.TRIGGER_ROW, context
    );

    const list = this.element.querySelector(".custom-dnd5e-trigger-list");
    list.insertAdjacentHTML("beforeend", html);

    const newRow = list.querySelector(`[data-key="${triggerId}"]`);
    if ( newRow ) {
      this._setupTriggerRow(newRow);
      this._attachDragListeners(newRow);
    }
  }

  /* -------------------------------------------- */

  /**
   * Add a new action row to the form.
   * @param {Event} event The triggering event.
   * @param {HTMLElement} target The clicked element.
   */
  static async addAction(event, target) {
    const actionId = foundry.utils.randomID();
    const context = {
      actionId,
      type: "macro",
      macroUuid: "",
      macroName: "",
      sound: { path: "", volume: 0.8 },
      conditionId: "",
      showCondition: false,
      roll: { type: "", dc: "" },
      showRollType: false,
      tableUuid: "",
      tableName: "",
      updatePath: "",
      updateValue: "",
      showUpdate: false,
      showCounterAction: false,
      counterKey: "",
      actionValue: "",
      showActionValue: false,
      showWorkflowSelect: false,
      workflowKey: "",
      workflowChoices: getWorkflowChoices(this.entityType, this.entity, this.setting),
      hasResultActions: false,
      actionChoices: getActionChoices(this.entityType),
      conditionChoices: getConditionChoices(),
      rollTypeChoices: getRollTypeChoices(),
      counterChoices: getCounterChoiceLabels(getCounterChoices(this.entityType, this.entity))
    };

    const html = await foundry.applications.handlebars.renderTemplate(
      CONSTANTS.WORKFLOWS.TEMPLATE.ACTION_ROW, context
    );

    const list = this.element.querySelector(".custom-dnd5e-action-list");
    list.insertAdjacentHTML("beforeend", html);

    const newRow = list.querySelector(`[data-key="${actionId}"]`);
    if ( newRow ) {
      this._setupActionRow(newRow);
      this._attachDragListeners(newRow);
    }
  }

  /* -------------------------------------------- */

  static deleteRow(event, target) {
    const row = target.closest(".item");
    if ( row ) row.remove();
  }

  /* -------------------------------------------- */

  /**
   * Open the result editor for a requestRoll action.
   * @param {Event} event The triggering event.
   * @param {HTMLElement} target The clicked element.
   */
  static editResult(event, target) {
    const row = target.closest(".item");
    const actionId = row.dataset.key;
    const existing = this._requestRollResults[actionId] || {};

    RequestRollResultForm.open({
      parentForm: this,
      actionId,
      onSuccess: existing.onSuccess || {},
      onFailure: existing.onFailure || {},
      entityType: this.entityType,
      entity: this.entity
    });
  }

  /* -------------------------------------------- */

  static clearTable(event, target) {
    const row = target.closest(".custom-dnd5e-action-row");
    if ( !row ) return;

    const input = row.querySelector('input[name$=".tableUuid"]');
    if ( input ) input.value = "";

    const tableField = row.querySelector(".custom-dnd5e-table-field");
    const dropArea = row.querySelector(".custom-dnd5e-table-drop .drop-area");
    if ( tableField ) tableField.classList.add("hidden");
    if ( dropArea ) dropArea.classList.remove("hidden");
  }

  /* -------------------------------------------- */

  static copyId(event, target) {
    game.clipboard.copyPlainText(this.key);
    ui.notifications.info(game.i18n.format("CUSTOM_DND5E.form.workflows.copyId.message", { id: this.key }));
  }

  /* -------------------------------------------- */
  /*  Submit                                      */
  /* -------------------------------------------- */

  static async submit(event, form, formData) {
    const data = formData.object;

    // Validate name
    const workflowName = data.name?.trim();
    if ( !workflowName ) {
      Logger.error(game.i18n.localize("CUSTOM_DND5E.form.workflows.validation.nameRequired"), true);
      return;
    }

    const duplicate = Object.entries(this.setting)
      .some(([key, value]) => key !== this.key && value.name === workflowName);
    if ( duplicate ) {
      Logger.error(game.i18n.format("CUSTOM_DND5E.form.workflows.validation.nameUnique", { name: workflowName }), true);
      return;
    }

    // Build the group object
    const group = {
      name: workflowName,
      visible: this.setting[this.key]?.visible ?? true,
      enabled: this.setting[this.key]?.enabled ?? true,
      triggers: {},
      actions: {}
    };

    if ( !this.entity ) {
      group.actorTypes = [];
      if ( data["actorTypes.character"] ) group.actorTypes.push("character");
      if ( data["actorTypes.npc"] ) group.actorTypes.push("npc");
      if ( data["actorTypes.group"] ) group.actorTypes.push("group");
    }

    if ( data.target ) {
      group.target = data.target;
    }

    // Parse triggers
    for ( const [key, value] of Object.entries(data) ) {
      const match = key.match(/^triggers\.([^.]+)\.(.+)$/);
      if ( !match ) continue;
      const [, triggerId, prop] = match;
      if ( !group.triggers[triggerId] ) group.triggers[triggerId] = {};
      group.triggers[triggerId][prop] = value;
    }

    // Parse actions
    for ( const [key, value] of Object.entries(data) ) {
      const match = key.match(/^actions\.([^.]+)\.(.+)$/);
      if ( !match ) continue;
      const [, actionId, prop] = match;
      if ( !group.actions[actionId] ) group.actions[actionId] = {};
      foundry.utils.setProperty(group.actions[actionId], prop, value);
    }

    // Strip counterKey from non-counter triggers and translate combined condition select
    for ( const trigger of Object.values(group.triggers) ) {
      if ( !COUNTER_TRIGGERS.includes(trigger.event) ) delete trigger.counterKey;
      if ( !CONDITION_TRIGGERS.includes(trigger.event) ) delete trigger.conditionId;
      if ( !EFFECT_TRIGGERS.includes(trigger.event) ) delete trigger.effectName;
      if ( !ROLL_SUBTYPE_TRIGGERS.includes(trigger.event) || !trigger.rollSubtype ) delete trigger.rollSubtype;
      if ( !TRIGGERS_WITH_VALUE.includes(trigger.event) ) {
        // Non-value event → clear all condition fields
        delete trigger.result;
        delete trigger.operator;
        delete trigger.value;
      } else if ( OPERATOR_VALUES.includes(trigger.result) ) {
        // Operator selected in condition select → move to operator field
        trigger.operator = trigger.result;
        delete trigger.result;
      } else if ( RESULTS_WITH_VALUE.includes(trigger.result) ) {
        // Within result → keep result and value, clear operator
        delete trigger.operator;
      } else if ( trigger.result ) {
        // Success/Failure → clear operator and value
        delete trigger.operator;
        delete trigger.value;
      } else {
        // Any Result → clear all condition fields
        delete trigger.result;
        delete trigger.operator;
        delete trigger.value;
      }
    }
    for ( const action of Object.values(group.actions) ) {
      if ( !COUNTER_ACTIONS.includes(action.type) ) delete action.counterKey;
      if ( action.type !== "macro" ) delete action.macroUuid;
      if ( action.type !== "playSound" ) delete action.sound;
      if ( !CONDITION_ACTION_TYPES.includes(action.type) ) delete action.conditionId;
      if ( action.type !== "requestRoll" ) delete action.roll;
      if ( action.type !== "rollTable" ) delete action.tableUuid;
      if ( !UPDATE_ACTION_TYPES.includes(action.type) ) { delete action.updatePath; delete action.updateValue; }
      if ( !ACTIONS_WITH_VALUE.includes(action.type) ) delete action.actionValue;
      if ( !WORKFLOW_ACTIONS.includes(action.type) ) delete action.workflowKey;
    }

    // Coerce numeric fields
    for ( const action of Object.values(group.actions) ) {
      if ( action.sound?.volume !== undefined ) action.sound.volume = Number(action.sound.volume);
      if ( action.actionValue !== undefined && action.actionValue !== "" ) action.actionValue = Number(action.actionValue);
    }

    // Merge sub-action data (On Success / On Failure)
    for ( const [actionId, results] of Object.entries(this._requestRollResults) ) {
      if ( !group.actions[actionId] ) continue;
      if ( results.onSuccess && Object.keys(results.onSuccess).length ) {
        group.actions[actionId].onSuccess = results.onSuccess;
      }
      if ( results.onFailure && Object.keys(results.onFailure).length ) {
        group.actions[actionId].onFailure = results.onFailure;
      }
    }

    this.setting[this.key] = group;

    if ( this.entity ) {
      await unsetFlag(this.entity, "triggers");
      await setFlag(this.entity, "triggers", this.setting);
      ensureEventHooks(this.setting);
    } else {
      const settingKey = this.entityType === "item"
        ? CONSTANTS.WORKFLOWS.SETTING.ITEM_WORKFLOWS.KEY
        : CONSTANTS.WORKFLOWS.SETTING.ACTOR_WORKFLOWS.KEY;
      await setSetting(settingKey, this.setting);
      rebuild();
    }

    this.close();
    this.workflowsForm.render(true);
  }

  /* -------------------------------------------- */

  static async open(args) {
    const form = new WorkflowsEditForm(args);
    form.render(true);
  }
}
