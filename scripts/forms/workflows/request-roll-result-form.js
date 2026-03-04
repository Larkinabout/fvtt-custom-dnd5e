import { CONSTANTS, MODULE } from "../../constants.js";
import { CustomDnd5eForm } from "../custom-dnd5e-form.js";
import {
  getSubActionChoices,
  getConditionChoices,
  getRollTypeChoices,
  getCounterChoices,
  getCounterChoiceLabels,
  getFilteredCounterChoiceLabels,
  getWorkflowChoices,
  COUNTER_ACTIONS,
  ACTIONS_WITH_VALUE,
  WORKFLOW_ACTIONS
} from "./workflows-edit.js";

const form = "request-roll-result";

/* -------------------------------------------- */

/**
 * Build a template-ready actions array from a raw actions object.
 *
 * @param {object} actionsObj The raw actions keyed by action ID.
 * @param {object} actionChoices The available action type choices.
 * @param {object} conditionChoices The available condition choices.
 * @param {object} rollTypeChoices The available roll type choices.
 * @param {object} counterChoices The full counter choices object.
 * @param {string} prefix The form field name prefix ("onSuccess" or "onFailure").
 * @returns {Promise<object[]>} The array of action context objects.
 */
async function buildActionContext(actionsObj, actionChoices, conditionChoices,
  rollTypeChoices, counterChoices, workflowChoices, prefix) {
  const actions = [];
  for ( const [actionId, a] of Object.entries(actionsObj) ) {
    const macroName = a.macroUuid ? (await fromUuid(a.macroUuid))?.name ?? "" : "";
    const tableName = a.tableUuid ? (await fromUuid(a.tableUuid))?.name ?? "" : "";
    const isConditionAction = ["applyCondition", "removeCondition", "toggleCondition"].includes(a.type);
    const actionType = a.type || "macro";
    actions.push({
      actionId: `${prefix}.${actionId}`,
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
      showUpdate: actionType === "actorUpdate" || actionType === "tokenUpdate",
      showCounterAction: COUNTER_ACTIONS.includes(actionType),
      counterKey: a.counterKey || "",
      actionValue: a.actionValue ?? "",
      showActionValue: ACTIONS_WITH_VALUE.includes(actionType),
      showWorkflowSelect: WORKFLOW_ACTIONS.includes(actionType),
      workflowKey: a.workflowKey || "",
      workflowChoices,
      hasResultActions: false,
      actionChoices,
      conditionChoices,
      rollTypeChoices,
      counterChoices: getFilteredCounterChoiceLabels(counterChoices, actionType)
    });
  }
  return actions;
}

/* -------------------------------------------- */

/**
 * A sub-form for managing On Success / On Failure actions within a Request Roll action.
 * @extends CustomDnd5eForm
 */
export class RequestRollResultForm extends CustomDnd5eForm {
  /**
   * Constructor for RequestRollResultForm.
   *
   * @param {object} args Arguments passed to the parent class.
   */
  constructor(args) {
    super(args);

    this.parentForm = args.parentForm;
    this.actionId = args.actionId;
    this.onSuccessActions = args.onSuccess || {};
    this.onFailureActions = args.onFailure || {};
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
      addAction: RequestRollResultForm.addAction,
      deleteRow: RequestRollResultForm.deleteRow,
      clearTable: RequestRollResultForm.clearTable
    },
    form: {
      handler: RequestRollResultForm.submit,
      closeOnSubmit: false
    },
    id: `${MODULE.ID}-${form}`,
    position: {
      width: 540,
      height: 480
    },
    window: {
      title: "CUSTOM_DND5E.form.workflows.resultActions.title"
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
      template: CONSTANTS.WORKFLOWS.TEMPLATE.REQUEST_ROLL_RESULT
    }
  };

  /* -------------------------------------------- */

  /**
   * Prepare the context for rendering the form.
   *
   * @returns {Promise<object>} The context data.
   */
  async _prepareContext() {
    const actionChoices = getSubActionChoices(this.entityType);
    const conditionChoices = getConditionChoices();
    const rollTypeChoices = getRollTypeChoices();
    this.counterChoices = getCounterChoices(this.entityType, this.entity);
    const workflowChoices = getWorkflowChoices(this.entityType, this.entity, this.parentForm?.setting);

    const onSuccessActions = await buildActionContext(
      this.onSuccessActions, actionChoices, conditionChoices, rollTypeChoices, this.counterChoices, workflowChoices, "onSuccess"
    );
    const onFailureActions = await buildActionContext(
      this.onFailureActions, actionChoices, conditionChoices, rollTypeChoices, this.counterChoices, workflowChoices, "onFailure"
    );

    return { onSuccessActions, onFailureActions };
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

    const actionRows = this.element.querySelectorAll(".custom-dnd5e-action-list .item");
    actionRows.forEach(row => this._setupActionRow(row));
  }

  /* -------------------------------------------- */

  /**
   * Set up event listeners for an action row.
   *
   * @param {HTMLElement} row The action row element.
   */
  _setupActionRow(row) {
    const typeSelect = row.querySelector(".custom-dnd5e-action-type");
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
    const conditionTypes = ["applyCondition", "removeCondition", "toggleCondition"];

    if ( typeSelect ) {
      const counterSelect = row.querySelector(".custom-dnd5e-counter-select");
      const updateVisibility = () => {
        macroGroup?.classList.toggle("hidden", typeSelect.value !== "macro");
        soundGroup?.classList.toggle("hidden", typeSelect.value !== "playSound");
        conditionGroup?.classList.toggle("hidden", !conditionTypes.includes(typeSelect.value));
        rollTypeGroup?.classList.toggle("hidden", typeSelect.value !== "requestRoll");
        tableGroup?.classList.toggle("hidden", typeSelect.value !== "rollTable");
        updateGroup?.classList.toggle("hidden", typeSelect.value !== "actorUpdate" && typeSelect.value !== "tokenUpdate");
        counterActionGroup?.classList.toggle("hidden", !COUNTER_ACTIONS.includes(typeSelect.value));
        actionValueGroup?.classList.toggle("hidden", !ACTIONS_WITH_VALUE.includes(typeSelect.value));
        workflowGroup?.classList.toggle("hidden", !WORKFLOW_ACTIONS.includes(typeSelect.value));

        if ( counterSelect && this.counterChoices ) {
          const currentValue = counterSelect.value;
          const filtered = getFilteredCounterChoiceLabels(this.counterChoices, typeSelect.value);
          counterSelect.innerHTML = "";
          for ( const [key, label] of Object.entries(filtered) ) {
            const option = document.createElement("option");
            option.value = key;
            option.textContent = label;
            if ( key === currentValue ) option.selected = true;
            counterSelect.appendChild(option);
          }
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

  /**
   * Handle dropping a PlaylistSound onto an action row.
   *
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
   * Handle dropping a RollTable onto an action row.
   *
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

  /**
   * Add a new action row to the On Success or On Failure list.
   *
   * @param {Event} event The event that triggered the action.
   * @param {HTMLElement} target The target element.
   */
  static async addAction(event, target) {
    const resultType = target.dataset.resultType;
    const actionId = foundry.utils.randomID();
    const prefixedId = `${resultType}.${actionId}`;
    const context = {
      actionId: prefixedId,
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
      workflowChoices: getWorkflowChoices(this.entityType, this.entity, this.parentForm?.setting),
      hasResultActions: false,
      actionChoices: getSubActionChoices(this.entityType),
      conditionChoices: getConditionChoices(),
      rollTypeChoices: getRollTypeChoices(),
      counterChoices: getCounterChoiceLabels(getCounterChoices(this.entityType, this.entity))
    };

    const html = await foundry.applications.handlebars.renderTemplate(
      CONSTANTS.WORKFLOWS.TEMPLATE.ACTION_ROW, context
    );

    const listClass = resultType === "onSuccess" ? ".custom-dnd5e-on-success-list" : ".custom-dnd5e-on-failure-list";
    const list = this.element.querySelector(listClass);
    list.insertAdjacentHTML("beforeend", html);

    const newRow = list.querySelector(`[data-key="${prefixedId}"]`);
    if ( newRow ) {
      this._setupActionRow(newRow);
      this._attachDragListeners(newRow);
    }
  }

  /* -------------------------------------------- */

  /**
   * Delete an action row.
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
   * Clear the rollable table selection in an action row.
   *
   * @param {Event} event The event that triggered the action.
   * @param {HTMLElement} target The target element.
   */
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

  /**
   * Parse action entries from formData for a given prefix (onSuccess or onFailure).
   *
   * @param {object} data The form data object.
   * @param {string} prefix The prefix to parse ("onSuccess" or "onFailure").
   * @returns {object} Parsed actions keyed by action ID.
   */
  static #parseActions(data, prefix) {
    const parsed = {};
    const pattern = new RegExp(`^actions\\.${prefix}\\.([^.]+)\\.(.+)$`);
    for ( const [key, value] of Object.entries(data) ) {
      const match = key.match(pattern);
      if ( !match ) continue;
      const [, actionId, prop] = match;
      if ( !parsed[actionId] ) parsed[actionId] = {};
      foundry.utils.setProperty(parsed[actionId], prop, value);
    }

    // Strip type-irrelevant properties from actions
    for ( const action of Object.values(parsed) ) {
      if ( !COUNTER_ACTIONS.includes(action.type) ) delete action.counterKey;
      if ( action.type !== "macro" ) delete action.macroUuid;
      if ( action.type !== "playSound" ) delete action.sound;
      if ( !["applyCondition", "removeCondition", "toggleCondition"].includes(action.type) ) delete action.conditionId;
      if ( action.type !== "requestRoll" ) delete action.roll;
      if ( action.type !== "rollTable" ) delete action.tableUuid;
      if ( !["actorUpdate", "tokenUpdate", "itemUpdate"].includes(action.type) ) { delete action.updatePath; delete action.updateValue; }
      if ( !ACTIONS_WITH_VALUE.includes(action.type) ) delete action.actionValue;
      if ( !WORKFLOW_ACTIONS.includes(action.type) ) delete action.workflowKey;
    }

    // Coerce numeric fields
    for ( const action of Object.values(parsed) ) {
      if ( action.sound?.volume !== undefined ) action.sound.volume = Number(action.sound.volume);
      if ( action.actionValue !== undefined && action.actionValue !== "" ) action.actionValue = Number(action.actionValue);
    }

    return parsed;
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

    const onSuccess = RequestRollResultForm.#parseActions(data, "onSuccess");
    const onFailure = RequestRollResultForm.#parseActions(data, "onFailure");

    // Store results back on the parent form
    this.parentForm._requestRollResults[this.actionId] = { onSuccess, onFailure };

    // Update the edit icon to reflect whether result actions exist
    const hasResults = Object.keys(onSuccess).length > 0 || Object.keys(onFailure).length > 0;
    const row = this.parentForm.element.querySelector(`.item[data-key="${this.actionId}"]`);
    const icon = row?.querySelector('[data-action="editResult"] i');
    icon?.classList.toggle("active", hasResults);

    this.close();
  }

  /* -------------------------------------------- */

  /**
   * Open the form.
   *
   * @param {object} args The arguments for opening the form.
   */
  static async open(args) {
    const form = new RequestRollResultForm(args);
    form.render(true);
  }
}
