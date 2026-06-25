import { CONSTANTS, MODULE } from "../../constants.js";
import { getOperatorChoices } from "../../utils.js";
import { CustomDnd5eForm } from "../custom-dnd5e-form.js";
import {
  COUNTER_TRIGGERS,
  getConditionChoices,
  getConditionTriggerChoices,
  getCounterChoices,
  getCounterChoiceLabels,
  getFilteredTriggerCounterChoiceLabels,
  rebuildSelectOptions
} from "./workflows-edit.js";

const form = "trigger-conditions";

const TRIGGERS_WITH_VALUE = ["counterValue", "successValue", "failureValue"];
const CONDITION_TRIGGERS = ["conditionApplied", "conditionRemoved"];
const EFFECT_TRIGGERS = ["effectEnabled", "effectDisabled"];

/* -------------------------------------------- */

/**
 * A sub-form for managing per-trigger conditions.
 * @extends CustomDnd5eForm
 */
export class TriggerConditionsForm extends CustomDnd5eForm {
  /**
   * Constructor for TriggerConditionsForm.
   *
   * @param {object} args Arguments passed to the parent class.
   */
  constructor(args) {
    super(args);

    this.parentForm = args.parentForm;
    this.triggerId = args.triggerId;
    this.conditions = args.conditions || {};
    this.entityType = args.entityType || "actor";
    this.entity = args.entity || null;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    actions: {
      addCondition: TriggerConditionsForm.addCondition,
      deleteRow: TriggerConditionsForm.deleteRow
    },
    form: {
      handler: TriggerConditionsForm.submit,
      closeOnSubmit: false
    },
    id: `${MODULE.ID}-${form}`,
    position: {
      width: 540,
      height: 480
    },
    window: {
      title: "CUSTOM_DND5E.form.workflows.triggerConditions.title"
    }
  };

  /* -------------------------------------------- */

  /**
   * Parts of the form.
   *
   * @type {object}
   */
  static PARTS = {
    form: {
      template: CONSTANTS.WORKFLOWS.TEMPLATE.TRIGGER_CONDITIONS
    }
  };

  /* -------------------------------------------- */

  /**
   * Prepare the context for rendering the form.
   *
   * @returns {Promise<object>} Context data
   */
  async _prepareContext() {
    const triggerChoices = getConditionTriggerChoices(this.entityType);
    const conditionChoices = getConditionChoices({ wildcard: "any" });
    const operatorChoices = getOperatorChoices();
    this.counterChoices = getCounterChoices(this.entityType, this.entity);

    const conditions = [];
    for ( const [conditionId, c] of Object.entries(this.conditions) ) {
      const triggerEvent = c.event || "halfHp";
      const isValueEvent = TRIGGERS_WITH_VALUE.includes(triggerEvent);
      const isFormulaEvent = triggerEvent === "customFormula";

      conditions.push({
        triggerId: conditionId,
        event: triggerEvent,
        value: c.value ?? "",
        showCounterSelect: COUNTER_TRIGGERS.includes(triggerEvent),
        counterKey: c.counterKey || "",
        result: isValueEvent ? (c.operator || "eq") : "",
        showCondition: isValueEvent,
        showValueInput: isValueEvent && (c.operator || "eq") !== "",
        showConditionSelect: CONDITION_TRIGGERS.includes(triggerEvent),
        conditionId: c.conditionId || "",
        showEffectNameInput: EFFECT_TRIGGERS.includes(triggerEvent),
        effectName: c.effectName || "",
        showFormulaInput: isFormulaEvent,
        formula: c.formula || "",
        showRollSubtype: false,
        rollSubtype: "",
        rollSubtypeChoices: {},
        conditionChoicesForTrigger: operatorChoices,
        triggerChoices,
        conditionChoices,
        counterChoices: getFilteredTriggerCounterChoiceLabels(this.counterChoices, triggerEvent),
        hideConditionsButton: true
      });
    }

    return { conditions };
  }

  /* -------------------------------------------- */

  /**
   * Handle form rendering.
   *
   * @param {object} context The context data.
   * @param {object} options The options for rendering.
   */
  _onRender(context, options) {
    super._onRender(context, options);

    const triggerRows = this.element.querySelectorAll(".custom-dnd5e-trigger-list .item");
    triggerRows.forEach(row => this._setupTriggerRow(row));
  }

  /* -------------------------------------------- */

  /**
   * Configure event listeners and visibility for a condition trigger row.
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
    const formulaGroup = row.querySelector(".custom-dnd5e-formula-trigger-group");
    const resultSelect = row.querySelector(".custom-dnd5e-trigger-result");
    const valueInput = row.querySelector(".custom-dnd5e-trigger-value");

    if ( eventSelect ) {
      const counterSelect = row.querySelector(".custom-dnd5e-counter-select");
      const OPERATOR_VALUES = ["eq", "neq", "lt", "gt"];

      const updateVisibility = () => {
        const isValueEvent = TRIGGERS_WITH_VALUE.includes(eventSelect.value);
        const isCounterEvent = COUNTER_TRIGGERS.includes(eventSelect.value);
        const isConditionEvent = CONDITION_TRIGGERS.includes(eventSelect.value);
        const isEffectEvent = EFFECT_TRIGGERS.includes(eventSelect.value);
        const isFormulaEvent = eventSelect.value === "customFormula";

        counterGroup?.classList.toggle("hidden", !isCounterEvent);
        conditionGroup?.classList.toggle("hidden", !isValueEvent);
        conditionTriggerGroup?.classList.toggle("hidden", !isConditionEvent);
        effectTriggerGroup?.classList.toggle("hidden", !isEffectEvent);
        formulaGroup?.classList.toggle("hidden", !isFormulaEvent);
        rollSubtypeGroup?.classList.toggle("hidden", true);
        valueInput?.classList.toggle("hidden", !OPERATOR_VALUES.includes(resultSelect?.value));

        triggerFields?.classList.toggle("hidden",
          ![counterGroup, conditionGroup, conditionTriggerGroup, effectTriggerGroup, formulaGroup]
            .some(g => g && !g.classList.contains("hidden"))
        );

        if ( this.counterChoices ) {
          const filtered = getFilteredTriggerCounterChoiceLabels(this.counterChoices, eventSelect.value);
          rebuildSelectOptions(counterSelect, filtered);
        }
      };

      eventSelect.addEventListener("change", updateVisibility);
      resultSelect?.addEventListener("change", updateVisibility);
      updateVisibility();
    }
  }

  /* -------------------------------------------- */

  /**
   * Add a new condition row.
   *
   * @param {Event} event The event that triggered the action.
   * @param {HTMLElement} target The target element.
   */
  static async addCondition(event, target) {
    const conditionId = foundry.utils.randomID();
    const triggerChoices = getConditionTriggerChoices(this.entityType);
    const conditionChoices = getConditionChoices({ wildcard: "any" });
    const operatorChoices = getOperatorChoices();
    const counterChoices = getCounterChoices(this.entityType, this.entity);

    const context = {
      triggerId: conditionId,
      event: "halfHp",
      value: "",
      showCounterSelect: false,
      counterKey: "",
      result: "",
      showCondition: false,
      showValueInput: false,
      showConditionSelect: false,
      conditionId: "",
      showEffectNameInput: false,
      effectName: "",
      showFormulaInput: false,
      formula: "",
      showRollSubtype: false,
      rollSubtype: "",
      rollSubtypeChoices: {},
      conditionChoicesForTrigger: operatorChoices,
      triggerChoices,
      conditionChoices,
      counterChoices: getCounterChoiceLabels(counterChoices),
      hideConditionsButton: true
    };

    const html = await foundry.applications.handlebars.renderTemplate(
      CONSTANTS.WORKFLOWS.TEMPLATE.TRIGGER_ROW, context
    );

    const list = this.element.querySelector(".custom-dnd5e-trigger-list");
    list.insertAdjacentHTML("beforeend", html);

    const newRow = list.querySelector(`[data-key="${conditionId}"]`);
    if ( newRow ) {
      this._setupTriggerRow(newRow);
      this._attachDragListeners(newRow);
    }
  }

  /* -------------------------------------------- */

  /**
   * Delete a condition row.
   *
   * @param {Event} event The event that triggered the action.
   * @param {HTMLElement} target The target element.
   */
  static deleteRow(event, target) {
    const row = target.closest(".item");
    if ( row ) row.remove();
  }

  /* -------------------------------------------- */

  /**
   * Submit the form data.
   *
   * @param {Event} event The form submission event.
   * @param {HTMLFormElement} form The form element.
   * @param {object} formData The form data.
   */
  static async submit(event, form, formData) {
    const data = formData.object;
    const OPERATOR_VALUES = ["eq", "neq", "lt", "gt"];

    // Parse conditions from form data
    const conditions = {};
    for ( const [key, value] of Object.entries(data) ) {
      const match = key.match(/^triggers\.([^.]+)\.(.+)$/);
      if ( !match ) continue;
      const [, conditionId, prop] = match;
      if ( !conditions[conditionId] ) conditions[conditionId] = {};
      conditions[conditionId][prop] = value;
    }

    // Clean up condition data
    for ( const condition of Object.values(conditions) ) {
      if ( !COUNTER_TRIGGERS.includes(condition.event) ) delete condition.counterKey;
      if ( !CONDITION_TRIGGERS.includes(condition.event) ) delete condition.conditionId;
      if ( !EFFECT_TRIGGERS.includes(condition.event) ) delete condition.effectName;
      if ( condition.event !== "customFormula" ) delete condition.formula;
      delete condition.rollSubtype;
      if ( !TRIGGERS_WITH_VALUE.includes(condition.event) ) {
        delete condition.result;
        delete condition.operator;
        delete condition.value;
      } else if ( OPERATOR_VALUES.includes(condition.result) ) {
        condition.operator = condition.result;
        delete condition.result;
      } else {
        delete condition.result;
        delete condition.operator;
        delete condition.value;
      }
    }

    // Store results back on the parent form
    this.parentForm._triggerConditions[this.triggerId] = conditions;

    // Update the edit icon to reflect whether conditions exist
    const hasConditions = Object.keys(conditions).length > 0;
    const row = this.parentForm.element.querySelector(`.item[data-key="${this.triggerId}"]`);
    const icon = row?.querySelector('[data-action="editConditions"] i');
    icon?.classList.toggle("active", hasConditions);

    this.close();
  }

  /* -------------------------------------------- */

  /**
   * Open the form.
   *
   * @param {object} args The arguments for opening the form.
   */
  static async open(args) {
    const form = new TriggerConditionsForm(args);
    form.render(true);
  }
}
