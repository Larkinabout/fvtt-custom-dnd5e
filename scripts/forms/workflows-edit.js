import { CONSTANTS, MODULE } from "../constants.js";
import { Logger, setFlag, unsetFlag, setSetting } from "../utils.js";
import { CustomDnd5eForm } from "./custom-dnd5e-form.js";
import { rebuild, ensureEventHooks } from "../workflows/workflows.js";

const id = CONSTANTS.WORKFLOWS.ID;
const form = `${id}-edit`;

/* -------------------------------------------- */

/**
 * Get the trigger choices for the triggers edit form.
 *
 * @returns {object} An object containing the trigger choices.
 */
function getTriggerChoices() {
  return {
    rollAttack: "CUSTOM_DND5E.form.workflows.trigger.choices.rollAttack",
    rollAbilityCheck: "CUSTOM_DND5E.form.workflows.trigger.choices.rollAbilityCheck",
    rollSavingThrow: "CUSTOM_DND5E.form.workflows.trigger.choices.rollSavingThrow",
    rollSkill: "CUSTOM_DND5E.form.workflows.trigger.choices.rollSkill",
    rollToolCheck: "CUSTOM_DND5E.form.workflows.trigger.choices.rollToolCheck",
    rollInitiative: "CUSTOM_DND5E.form.workflows.trigger.choices.rollInitiative",
    rollConcentration: "CUSTOM_DND5E.form.workflows.trigger.choices.rollConcentration",
    rollDeathSave: "CUSTOM_DND5E.form.workflows.trigger.choices.rollDeathSave",
    rollDamage: "CUSTOM_DND5E.form.workflows.trigger.choices.rollDamage",
    zeroHp: "CUSTOM_DND5E.form.workflows.trigger.choices.zeroHp",
    halfHp: "CUSTOM_DND5E.form.workflows.trigger.choices.halfHp",
    loseHp: "CUSTOM_DND5E.form.workflows.trigger.choices.loseHp",
    gainHp: "CUSTOM_DND5E.form.workflows.trigger.choices.gainHp",
    startOfCombat: "CUSTOM_DND5E.startOfCombat",
    endOfCombat: "CUSTOM_DND5E.endOfCombat",
    startOfTurn: "CUSTOM_DND5E.startOfTurn",
    endOfTurn: "CUSTOM_DND5E.endOfTurn",
    shortRest: "CUSTOM_DND5E.shortRest",
    longRest: "CUSTOM_DND5E.longRest"
  };
}

/* -------------------------------------------- */

/**
 * Get the action choices for the triggers edit form.
 *
 * @returns {object} An object containing the action choices.
 */
function getActionChoices() {
  return {
    macro: "CUSTOM_DND5E.macro",
    playSound: "CUSTOM_DND5E.form.workflows.action.choices.playSound",
    applyCondition: "CUSTOM_DND5E.form.workflows.action.choices.applyCondition",
    removeCondition: "CUSTOM_DND5E.form.workflows.action.choices.removeCondition",
    toggleCondition: "CUSTOM_DND5E.form.workflows.action.choices.toggleCondition",
    rollTable: "CUSTOM_DND5E.form.workflows.action.choices.rollTable",
    distributeAward: "CUSTOM_DND5E.form.workflows.action.choices.distributeAward",
    requestRoll: "CUSTOM_DND5E.form.workflows.action.choices.requestRoll",
    actorUpdate: "CUSTOM_DND5E.form.workflows.action.choices.actorUpdate",
    tokenUpdate: "CUSTOM_DND5E.form.workflows.action.choices.tokenUpdate"
  };
}

/* -------------------------------------------- */

/**
 * Get the condition choices from CONFIG.statusEffects.
 *
 * @returns {object} An object containing the condition choices.
 */
function getConditionChoices() {
  const choices = {};
  for ( const effect of CONFIG.statusEffects ) {
    if ( effect.id ) choices[effect.id] = effect.name;
  }
  return choices;
}

/* -------------------------------------------- */

/**
 * Get the roll type choices for the Request Roll action.
 * Builds compound keys from CONFIG.DND5E.abilities (saves + checks) and CONFIG.DND5E.skills.
 *
 * @returns {object} An object containing the roll type choices.
 */
function getRollTypeChoices() {
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

/**
 * Get the operator choices.
 *
 * @returns {object} An object containing the operator choices.
 */
function getOperatorChoices() {
  return {
    eq: "CUSTOM_DND5E.form.counters.triggers.triggerOperator.choices.eq",
    lt: "CUSTOM_DND5E.form.counters.triggers.triggerOperator.choices.lt",
    gt: "CUSTOM_DND5E.form.counters.triggers.triggerOperator.choices.gt",
    neq: "CUSTOM_DND5E.form.counters.triggers.triggerOperator.choices.neq"
  };
}

/* -------------------------------------------- */

/**
 * Events that support value/operator conditions.
 */
const TRIGGERS_WITH_VALUE = [
  "rollAttack", "rollAbilityCheck", "rollSavingThrow", "rollSkill",
  "rollToolCheck", "rollConcentration", "rollDeathSave", "rollDamage"
];

/* -------------------------------------------- */

/**
 * Class representing the Workflows Edit Form.
 * @extends CustomDnd5eForm
 */
export class WorkflowsEditForm extends CustomDnd5eForm {
  /**
   * Constructor for WorkflowsEditForm.
   *
   * @param {object} args Arguments passed to the parent class.
   */
  constructor(args) {
    super(args);

    this.workflowsForm = args.workflowsForm;
    this.setting = args.setting;
    this.key = args.data.key;
    this.label = args.data.label;
    this.entity = args.data.entity;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    actions: {
      addTrigger: WorkflowsEditForm.addTrigger,
      addAction: WorkflowsEditForm.addAction,
      deleteRow: WorkflowsEditForm.deleteRow,
      clearMacro: WorkflowsEditForm.clearMacro,
      clearTable: WorkflowsEditForm.clearTable
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

  /**
   * Parts of the form.
   *
   * @type {object}
   */
  static PARTS = {
    form: {
      template: `modules/${MODULE.ID}/templates/${form}.hbs`
    }
  };

  /* -------------------------------------------- */

  /**
   * Prepare the context for rendering the form.
   *
   * @returns {Promise<object>} The context data.
   */
  async _prepareContext() {
    const group = this.setting[this.key] || {};
    const triggerChoices = getTriggerChoices();
    const actionChoices = getActionChoices();
    const conditionChoices = getConditionChoices();
    const rollTypeChoices = getRollTypeChoices();
    const operatorChoices = getOperatorChoices();

    // Build triggers array from group.triggers
    const triggersObj = group.triggers || {};
    const triggers = [];
    for ( const [triggerId, t] of Object.entries(triggersObj) ) {
      triggers.push({
        triggerId,
        event: t.event || "rollAttack",
        operator: t.operator || "eq",
        value: t.value ?? "",
        showValue: TRIGGERS_WITH_VALUE.includes(t.event || "rollAttack"),
        triggerChoices,
        operatorChoices
      });
    }

    // Build actions array from group.actions
    const actionsObj = group.actions || {};
    const actions = [];
    for ( const [actionId, a] of Object.entries(actionsObj) ) {
      const macroName = a.macroUuid ? (await fromUuid(a.macroUuid))?.name ?? "" : "";
      const tableName = a.tableUuid ? (await fromUuid(a.tableUuid))?.name ?? "" : "";
      const isConditionAction = ["applyCondition", "removeCondition", "toggleCondition"].includes(a.type);
      actions.push({
        actionId,
        type: a.type || "macro",
        macroUuid: a.macroUuid || "",
        macroName,
        soundPath: a.soundPath || "",
        soundVolume: a.soundVolume ?? 0.8,
        conditionId: a.conditionId || "",
        showCondition: isConditionAction,
        rollType: a.rollType || "",
        rollDc: a.rollDc ?? "",
        showRollType: a.type === "requestRoll",
        tableUuid: a.tableUuid || "",
        tableName,
        updatePath: a.updatePath || "",
        updateValue: a.updateValue || "",
        showUpdate: a.type === "actorUpdate" || a.type === "tokenUpdate",
        actionChoices,
        conditionChoices,
        rollTypeChoices
      });
    }

    return {
      key: this.key,
      label: group.label || "",
      isActor: !!this.entity,
      actorTypes: {
        character: group.actorTypes ? group.actorTypes.includes("character") : true,
        npc: group.actorTypes ? group.actorTypes.includes("npc") : true
      },
      triggers,
      actions
    };
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

    // Setup existing trigger rows
    const triggerRows = this.element.querySelectorAll(".custom-dnd5e-trigger-list .item");
    triggerRows.forEach(row => this._setupTriggerRow(row));

    // Setup existing action rows
    const actionRows = this.element.querySelectorAll(".custom-dnd5e-action-list .item");
    actionRows.forEach(row => this._setupActionRow(row));
  }

  /* -------------------------------------------- */

  /**
   * Set up event listeners for a trigger row.
   *
   * @param {HTMLElement} row The trigger row element.
   */
  _setupTriggerRow(row) {
    const eventSelect = row.querySelector(".custom-dnd5e-trigger-event");
    const triggerFields = row.querySelector(".custom-dnd5e-trigger-fields");

    if ( eventSelect && triggerFields ) {
      const updateVisibility = () => {
        triggerFields.classList.toggle("hidden", !TRIGGERS_WITH_VALUE.includes(eventSelect.value));
      };
      eventSelect.addEventListener("change", updateVisibility);
      updateVisibility();
    }
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
    const macroDrop = row.querySelector(".custom-dnd5e-macro-drop");
    const conditionTypes = ["applyCondition", "removeCondition", "toggleCondition"];

    if ( typeSelect ) {
      const updateVisibility = () => {
        macroGroup?.classList.toggle("hidden", typeSelect.value !== "macro");
        soundGroup?.classList.toggle("hidden", typeSelect.value !== "playSound");
        conditionGroup?.classList.toggle("hidden", !conditionTypes.includes(typeSelect.value));
        rollTypeGroup?.classList.toggle("hidden", typeSelect.value !== "requestRoll");
        tableGroup?.classList.toggle("hidden", typeSelect.value !== "rollTable");
        updateGroup?.classList.toggle("hidden", typeSelect.value !== "actorUpdate" && typeSelect.value !== "tokenUpdate");
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
   * Handle dropping a Macro onto an action row.
   *
   * @param {DragEvent} event The drop event.
   * @param {HTMLElement} row The action row element.
   */
  async _onDropMacro(event, row) {
    event.preventDefault();
    event.stopPropagation();
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if ( data?.type !== "Macro" ) return;
    const macro = await Macro.implementation.fromDropData(data);
    if ( !macro ) return;

    const input = row.querySelector('input[name$=".macroUuid"]');
    if ( input ) input.value = macro.uuid;

    const macroField = row.querySelector(".custom-dnd5e-macro-field");
    const dropArea = row.querySelector(".custom-dnd5e-macro-drop .drop-area");
    const nameEl = row.querySelector(".custom-dnd5e-macro-name");
    if ( nameEl ) nameEl.textContent = macro.name;
    if ( macroField ) macroField.classList.remove("hidden");
    if ( dropArea ) dropArea.classList.add("hidden");
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

    const pathInput = row.querySelector('input[name$=".soundPath"]');
    const volumeInput = row.querySelector('input[name$=".soundVolume"]');
    if ( pathInput ) pathInput.value = sound.path;
    if ( volumeInput ) volumeInput.value = sound.volume;
  }

  /* -------------------------------------------- */

  /**
   * Add a new trigger row.
   *
   * @param {Event} event The event that triggered the action.
   * @param {HTMLElement} target The target element.
   */
  static async addTrigger(event, target) {
    const triggerId = foundry.utils.randomID();
    const context = {
      triggerId,
      event: "rollAttack",
      operator: "eq",
      value: "",
      showValue: true,
      triggerChoices: getTriggerChoices(),
      operatorChoices: getOperatorChoices()
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
   * Add a new action row.
   *
   * @param {Event} event The event that triggered the action.
   * @param {HTMLElement} target The target element.
   */
  static async addAction(event, target) {
    const actionId = foundry.utils.randomID();
    const context = {
      actionId,
      type: "macro",
      macroUuid: "",
      macroName: "",
      soundPath: "",
      soundVolume: 0.8,
      conditionId: "",
      showCondition: false,
      rollType: "",
      rollDc: "",
      showRollType: false,
      tableUuid: "",
      tableName: "",
      updatePath: "",
      updateValue: "",
      showUpdate: false,
      actionChoices: getActionChoices(),
      conditionChoices: getConditionChoices(),
      rollTypeChoices: getRollTypeChoices()
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

  /**
   * Delete a trigger or action row.
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
   * Clear the macro selection in an action row.
   *
   * @param {Event} event The event that triggered the action.
   * @param {HTMLElement} target The target element.
   */
  static clearMacro(event, target) {
    const row = target.closest(".custom-dnd5e-action-row");
    if ( !row ) return;

    const input = row.querySelector('input[name$=".macroUuid"]');
    if ( input ) input.value = "";

    const macroField = row.querySelector(".custom-dnd5e-macro-field");
    const dropArea = row.querySelector(".custom-dnd5e-macro-drop .drop-area");
    if ( macroField ) macroField.classList.add("hidden");
    if ( dropArea ) dropArea.classList.remove("hidden");
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
   * Submit the form data.
   *
   * @param {Event} event The form submission event.
   * @param {HTMLFormElement} form The form element.
   * @param {object} formData The form data.
   */
  static async submit(event, form, formData) {
    const data = formData.object;

    // Validate name is not empty
    const name = data.label?.trim();
    if ( !name ) {
      Logger.error(game.i18n.localize("CUSTOM_DND5E.form.workflows.validation.nameRequired"), true);
      return;
    }

    // Validate name is unique
    const duplicate = Object.entries(this.setting)
      .some(([key, value]) => key !== this.key && value.label === name);
    if ( duplicate ) {
      Logger.error(game.i18n.format("CUSTOM_DND5E.form.workflows.validation.nameUnique", { name }), true);
      return;
    }

    // Build the group object
    const group = {
      label: name,
      visible: this.setting[this.key]?.visible ?? true,
      actorTypes: [],
      triggers: {},
      actions: {}
    };

    // Handle actorTypes checkboxes
    if ( data["actorTypes.character"] ) group.actorTypes.push("character");
    if ( data["actorTypes.npc"] ) group.actorTypes.push("npc");

    // Parse triggers from formData
    for ( const [key, value] of Object.entries(data) ) {
      const match = key.match(/^triggers\.([^.]+)\.(.+)$/);
      if ( !match ) continue;
      const [, triggerId, prop] = match;
      if ( !group.triggers[triggerId] ) group.triggers[triggerId] = {};
      group.triggers[triggerId][prop] = value;
    }

    // Parse actions from formData
    for ( const [key, value] of Object.entries(data) ) {
      const match = key.match(/^actions\.([^.]+)\.(.+)$/);
      if ( !match ) continue;
      const [, actionId, prop] = match;
      if ( !group.actions[actionId] ) group.actions[actionId] = {};
      group.actions[actionId][prop] = value;
    }

    // Coerce soundVolume to number
    for ( const action of Object.values(group.actions) ) {
      if ( action.soundVolume !== undefined ) action.soundVolume = Number(action.soundVolume);
    }

    this.setting[this.key] = group;

    if ( this.entity ) {
      await unsetFlag(this.entity, "triggers");
      await setFlag(this.entity, "triggers", this.setting);
      ensureEventHooks(this.setting);
    } else {
      await setSetting(CONSTANTS.WORKFLOWS.SETTING.WORKFLOWS.KEY, this.setting);
      rebuild();
    }

    this.close();
    this.workflowsForm.render(true);
  }

  /* -------------------------------------------- */

  /**
   * Open the form.
   *
   * @param {object} args The arguments for opening the form.
   */
  static async open(args) {
    const form = new WorkflowsEditForm(args);
    form.render(true);
  }
}
