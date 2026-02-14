import { CONSTANTS, MODULE, SETTING_BY_ENTITY_TYPE } from "../constants.js";
import { getFlag, setFlag, unsetFlag, setSetting, Logger } from "../utils.js";
import { CustomDnd5eForm } from "./custom-dnd5e-form.js";

const id = CONSTANTS.COUNTERS.ID;
const form = `${id}-edit`;
const listClass = `${MODULE.ID}-list`;
const listClassSelector = `.${listClass}`;

/* -------------------------------------------- */

/**
 * Class representing the Counters Edit Form.
 * @extends CustomDnd5eForm
 */
export class CountersEditForm extends CustomDnd5eForm {
  /**
   * Constructor for CountersEditForm.
   *
   * @param {object} args Arguments passed to the parent class.
   */
  constructor(args) {
    super(args);

    this.countersForm = args.countersForm;
    this.setting = args.setting;
    this.counters = args.data.counters;
    this.key = args.data.key;
    this.actorType = args.data.actorType;
    this.entity = args.data.entity;
    this.label = args.data.label;
    this.type = args.data.type;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    actions: {
      clearMacro: CountersEditForm.clearMacro,
      new: CountersEditForm.createItem
    },
    form: {
      handler: CountersEditForm.submit,
      closeOnSubmit: false
    },
    id: `${MODULE.ID}-${form}`,
    window: {
      title: `CUSTOM_DND5E.form.${id}.edit.title`
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
   * Get select options for the form.
   *
   * @param {string} type The type of the form.
   * @returns {object} The select options.
   */
  #getSelects(type) {
    const triggerChoices = {};

    if ( type === "checkbox" ) {
      triggerChoices.checked = "CUSTOM_DND5E.form.counters.triggers.trigger.choices.checked";
      triggerChoices.unchecked = "CUSTOM_DND5E.form.counters.triggers.trigger.choices.unchecked";
    } else if ( type === "successFailure" ) {
      triggerChoices.successValue = "CUSTOM_DND5E.form.counters.triggers.trigger.choices.successValue";
      triggerChoices.failureValue = "CUSTOM_DND5E.form.counters.triggers.trigger.choices.failureValue";
    } else {
      triggerChoices.counterValue = "CUSTOM_DND5E.form.counters.triggers.trigger.choices.counterValue";
    }

    triggerChoices.zeroHp = "CUSTOM_DND5E.form.counters.triggers.trigger.choices.zeroHp";
    triggerChoices.zeroHpCombatEnd = "CUSTOM_DND5E.form.counters.triggers.trigger.choices.zeroHpCombatEnd";
    triggerChoices.halfHp = "CUSTOM_DND5E.form.counters.triggers.trigger.choices.halfHp";
    triggerChoices.shortRest = "CUSTOM_DND5E.shortRest";
    triggerChoices.longRest = "CUSTOM_DND5E.longRest";
    triggerChoices.startOfCombat = "CUSTOM_DND5E.startOfCombat";
    triggerChoices.endOfCombat = "CUSTOM_DND5E.endOfCombat";
    triggerChoices.startOfTurn = "CUSTOM_DND5E.startOfTurn";
    triggerChoices.endOfTurn = "CUSTOM_DND5E.endOfTurn";
    triggerChoices.rollAttack = "CUSTOM_DND5E.form.counters.triggers.trigger.choices.rollAttack";

    const actionChoices = {};

    if ( type !== "checkbox" ) {
      actionChoices.increase = "CUSTOM_DND5E.increase";
      actionChoices.decrease = "CUSTOM_DND5E.decrease";
      actionChoices.set = "CUSTOM_DND5E.set";
      actionChoices.dead = "CUSTOM_DND5E.dead";
    } else {
      actionChoices.check = "CUSTOM_DND5E.check";
      actionChoices.uncheck = "CUSTOM_DND5E.uncheck";
    }
    actionChoices.macro = "CUSTOM_DND5E.macro";

    return {
      role: {
        choices: {
          1: "USER.RolePlayer",
          2: "USER.RoleTrusted",
          3: "USER.RoleAssistant",
          4: "USER.RoleGamemaster"
        }
      },
      trigger: {
        choices: triggerChoices
      },
      action: {
        choices: actionChoices
      },
      triggerOperator: {
        choices: {
          eq: "CUSTOM_DND5E.form.counters.triggers.triggerOperator.choices.eq",
          lt: "CUSTOM_DND5E.form.counters.triggers.triggerOperator.choices.lt",
          gt: "CUSTOM_DND5E.form.counters.triggers.triggerOperator.choices.gt",
          neq: "CUSTOM_DND5E.form.counters.triggers.triggerOperator.choices.neq"
        }
      }
    };
  }

  /* -------------------------------------------- */

  /**
   * Prepare the context for rendering the form.
   *
   * @returns {Promise<object>} The context data.
   */
  async _prepareContext() {
    const type = this.setting[this.key]?.type || this.type;

    return {
      key: this.key,
      viewRole: this.setting[this.key]?.viewRole || 1,
      editRole: this.setting[this.key]?.editRole || 1,
      max: this.setting[this.key]?.max,
      type: this.setting[this.key]?.type || this.type,
      triggers: await this.#resolveTriggersContext(this.setting[this.key]?.triggers || []),
      selects: this.#getSelects(type)
    };
  }

  /* -------------------------------------------- */

  /**
   * Resolve macro names for triggers that have a macroUuid.
   *
   * @param {object[]} triggers The triggers array.
   * @returns {Promise<object[]>} The triggers with macroName resolved.
   */
  async #resolveTriggersContext(triggers) {
    return Promise.all(triggers.map(async (trigger) => {
      if ( !trigger.macroUuid ) return trigger;
      const macro = await fromUuid(trigger.macroUuid);
      return { ...trigger, macroName: macro?.name ?? "" };
    }));
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

    this.items.forEach(item => {
      this.#setupTriggerItem(item);
    });
  }

  /* -------------------------------------------- */

  /**
   * Set up event listeners and element references for a trigger item.
   *
   * @param {HTMLElement} item The trigger list item element.
   */
  #setupTriggerItem(item) {
    const el = {};
    el.trigger = item.querySelector("#custom-dnd5e-trigger");
    el.triggerValueGroup = item.querySelector("#custom-dnd5e-trigger-value").closest(".form-group");
    el.trigger.addEventListener("change", () => { this.#onChangeTrigger(el); });

    el.action = item.querySelector("#custom-dnd5e-action");
    el.actionIncrease = el.action.querySelector("#custom-dnd5e-increase");
    el.actionDecrease = el.action.querySelector("#custom-dnd5e-decrease");
    el.actionSet = el.action.querySelector("#custom-dnd5e-set-to");
    el.actionCheck = el.action.querySelector('option[value="check"]');
    el.actionUncheck = el.action.querySelector('option[value="uncheck"]');
    el.actionMacro = el.action.querySelector('option[value="macro"]');
    el.actionValueGroup = item.querySelector("#custom-dnd5e-action-value").closest(".form-group");
    el.macroGroup = item.querySelector(".custom-dnd5e-macro-drop")?.closest(".form-group");
    el.action.addEventListener("change", () => { this.#onChangeAction(el); });

    const macroDrop = item.querySelector(".custom-dnd5e-macro-drop");
    if ( macroDrop ) {
      macroDrop.addEventListener("drop", (event) => this.#onDropMacro(event, item));
    }

    this.#onChangeTrigger(el);
    this.#onChangeAction(el);
  }

  /* -------------------------------------------- */

  /**
   * Create a new item.
   */
  static async createItem() {
    const list = this.element.querySelector(listClassSelector);
    const scrollable = list.closest(".scrollable");

    const key = foundry.utils.randomID();
    const type = this.setting[this.key]?.type || this.type;
    const trigger = (type === "checkbox") ? "zeroHp" : (type === "successFailure") ? "successValue" : "counterValue";
    const action = (type === "checkbox") ? "check" : "dead";

    const template = await this._getHtml({
      type,
      triggers: [{ action, trigger, key, type }],
      selects: this.#getSelects(type)
    });

    list.insertAdjacentHTML("beforeend", template);

    const item = list.querySelector(`[data-key="${key}"]`);
    const dragElement = item.querySelector(".custom-dnd5e-drag");

    item.addEventListener("dragend", this._onDragEnd.bind(this));
    item.addEventListener("dragleave", this._onDragLeave.bind(this));
    item.addEventListener("dragover", this._onDragOver.bind(this));
    item.addEventListener("drop", this._onDrop.bind(this));
    dragElement.addEventListener("dragstart", this._onDragStart.bind(this));

    this.#setupTriggerItem(item);

    if ( scrollable ) {
      scrollable.scrollTop = scrollable.scrollHeight;
    }
  }

  /* -------------------------------------------- */

  /**
   * Get the HTML template for the form.
   *
   * @param {object} data The data to be passed to the template.
   * @returns {Promise<string>} The rendered template.
   */
  async _getHtml(data) {
    const template = await foundry.applications.handlebars.renderTemplate(CONSTANTS.COUNTERS.TEMPLATE.TRIGGERS_LIST, data);
    return template;
  }

  /* -------------------------------------------- */

  /**
   * Handle trigger change event.
   *
   * @param {object} el The element.
   */
  #onChangeTrigger(el) {
    const showTriggerValue = ["counterValue", "successValue", "failureValue", "rollAttack"];
    const macroTriggers = ["counterValue", "successValue", "failureValue", "checked", "unchecked"];
    const valueTriggers = ["counterValue", "successValue", "failureValue"];

    if ( showTriggerValue.includes(el.trigger.value) ) {
      el.triggerValueGroup?.classList.remove("hidden");
    } else {
      el.triggerValueGroup?.classList.add("hidden");
    }

    if ( valueTriggers.includes(el.trigger.value) ) {
      el.actionIncrease?.classList.add("hidden");
      el.actionDecrease?.classList.add("hidden");
      el.actionSet?.classList.add("hidden");
      const hiddenActions = ["increase", "decrease", "set"];
      if ( hiddenActions.includes(el.action.value) ) {
        const type = this.setting[this.key]?.type || this.type;
        el.action.value = (type === "checkbox") ? "check" : "dead";
      }
    } else {
      el.actionIncrease?.classList.remove("hidden");
      el.actionDecrease?.classList.remove("hidden");
      el.actionSet?.classList.remove("hidden");
    }

    if ( macroTriggers.includes(el.trigger.value) ) {
      el.actionMacro?.classList.remove("hidden");
    } else {
      el.actionMacro?.classList.add("hidden");
      if ( el.action.value === "macro" ) {
        const type = this.setting[this.key]?.type || this.type;
        el.action.value = (type === "checkbox") ? "check" : "dead";
        this.#onChangeAction(el);
      }
    }

    if ( el.trigger.value === "checked" ) {
      el.actionCheck?.classList.add("hidden");
      el.actionUncheck?.classList.remove("hidden");
      if ( el.action.value === "check" ) {
        el.action.value = "uncheck";
      }
    } else if ( el.trigger.value === "unchecked" ) {
      el.actionUncheck?.classList.add("hidden");
      el.actionCheck?.classList.remove("hidden");
      if ( el.action.value === "uncheck" ) {
        el.action.value = "check";
      }
    } else {
      el.actionCheck?.classList.remove("hidden");
      el.actionUncheck?.classList.remove("hidden");
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle action change event.
   * @param {object} el The element.
   */
  #onChangeAction(el) {
    const showActionValue = ["increase", "decrease", "set"];
    if ( showActionValue.includes(el.action.value) ) {
      el.actionValueGroup?.classList.remove("hidden");
    } else {
      el.actionValueGroup?.classList.add("hidden");
    }

    if ( el.action.value === "macro" ) {
      el.macroGroup?.classList.remove("hidden");
    } else {
      el.macroGroup?.classList.add("hidden");
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle dropping a Macro onto a trigger item.
   *
   * @param {DragEvent} event The drop event.
   * @param {HTMLElement} item The trigger list item element.
   */
  async #onDropMacro(event, item) {
    event.preventDefault();
    event.stopPropagation();
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if ( data?.type !== "Macro" ) return;
    const macro = await Macro.implementation.fromDropData(data);
    if ( !macro ) return;

    const input = item.querySelector('input[name="macroUuid"]');
    if ( input ) input.value = macro.uuid;

    const macroField = item.querySelector(".custom-dnd5e-macro-field");
    const dropArea = item.querySelector(".custom-dnd5e-macro-drop .drop-area");
    const nameEl = item.querySelector(".custom-dnd5e-macro-name");
    if ( nameEl ) nameEl.textContent = macro.name;
    if ( macroField ) macroField.classList.remove("hidden");
    if ( dropArea ) dropArea.classList.add("hidden");
  }

  /* -------------------------------------------- */

  /**
   * Clear the macro selection for a trigger item.
   *
   * @param {Event} event The event that triggered the action.
   * @param {HTMLElement} target The target element.
   */
  static clearMacro(event, target) {
    const item = target.closest(".custom-dnd5e-item");
    if ( !item ) return;

    const input = item.querySelector('input[name="macroUuid"]');
    if ( input ) input.value = "";

    const macroField = item.querySelector(".custom-dnd5e-macro-field");
    const dropArea = item.querySelector(".custom-dnd5e-macro-drop .drop-area");
    if ( macroField ) macroField.classList.add("hidden");
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
    const oldKey = this.key;
    const newKey = formData.object[`${this.key}.key`];

    if ( oldKey !== newKey ) {
      if ( this.setting[newKey] ) {
        Logger.error(`Key '${newKey}' already exists`, true);
        return;
      }
    }

    const ints = ["editRole", "viewRole"];
    const triggerProperties = ["action", "actionValue", "delete", "macroUuid", "trigger", "triggerOperator", "triggerValue"];

    // Ensure trigger properties are arrays if at least one exists
    if ( formData.object.action ) {
      triggerProperties.forEach(property => {
        if ( !Array.isArray(formData.object[property]) ) {
          formData.object[property] = [formData.object[property]];
        }
      });
    }

    // Set properties in this.setting
    Object.entries(formData.object).forEach(([key, value]) => {
      if ( Array.isArray(value) || key.split(".").pop() === "key" ) return;
      if ( ints.includes(key.split(".").pop()) ) { value = parseInt(value); }
      foundry.utils.setProperty(this.setting, key, value);
    });

    // Create new key and delete old key while keeping order of counters
    if ( oldKey !== newKey ) {
      this.setting[newKey] = foundry.utils.deepClone(this.setting[oldKey]);

      const data = Object.fromEntries(
        Object.keys(this.setting).map(key => [
          (key === oldKey) ? newKey : key,
          foundry.utils.deepClone(this.setting[key])
        ])
      );

      this.setting = data;

      if ( this.entity ) {
        // Update the entity with the new key and delete the old key
        const flag = getFlag(this.entity, oldKey);
        await setFlag(this.entity, newKey, flag);
        await unsetFlag(this.entity, oldKey);
      } else {
        // Update all actors with the new key and delete the old key
        for ( const actor of game.actors ) {
          const flag = getFlag(actor, oldKey);
          if ( typeof flag !== "undefined" ) {
            await setFlag(actor, newKey, flag);
            await unsetFlag(actor, oldKey);
          }
        }
      }

      this.key = newKey;
    }

    // Map triggers into objects
    if ( formData.object.action ) {
      const triggers = formData.object.action.map((_, index) => ({
        action: formData.object.action[index],
        actionValue: formData.object.actionValue[index],
        macroUuid: formData.object.macroUuid[index],
        trigger: formData.object.trigger[index],
        triggerOperator: formData.object.triggerOperator[index],
        triggerValue: formData.object.triggerValue[index]
      })).filter((_, index) => formData.object.delete[index] !== "true");

      this.setting[this.key].triggers = triggers;
    }

    this.setting[this.key].label = this.label;
    this.setting[this.key].type = this.type;

    if ( this.entity ) {
      await unsetFlag(this.entity, "counters");
      await setFlag(this.entity, "counters", this.setting);
    } else {
      await setSetting(SETTING_BY_ENTITY_TYPE.COUNTERS[this.actorType], this.setting);
    }

    this.close();

    this.countersForm.render(true);
  }

  /* -------------------------------------------- */

  /**
   * Open the form.
   *
   * @param {object} args The arguments for opening the form.
   */
  static async open(args) {
    const form = new CountersEditForm(args);
    form.render(true);
  }
}
