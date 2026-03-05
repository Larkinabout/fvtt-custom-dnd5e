import { CONSTANTS, MODULE, SETTING_BY_ENTITY_TYPE } from "../../constants.js";
import { getFlag, setFlag, unsetFlag, getSetting, setSetting, Logger } from "../../utils.js";
import { CustomDnd5eForm } from "../custom-dnd5e-form.js";
import { WorkflowsEditForm, COUNTER_TRIGGERS, COUNTER_ACTIONS } from "../workflows/workflows-edit.js";
import { rebuild, ensureEventHooks } from "../../workflows/workflows.js";

const id = CONSTANTS.COUNTERS.ID;
const form = `${id}-edit`;

/**
 * Get the workflows setting key for the given entity type.
 * @param {string} actorType The actor type
 * @returns {string} The workflows setting key
 */
function workflowsSettingKey(actorType) {
  return actorType === "item"
    ? CONSTANTS.WORKFLOWS.SETTING.ITEM_WORKFLOWS.KEY
    : CONSTANTS.WORKFLOWS.SETTING.ACTOR_WORKFLOWS.KEY;
}

/* -------------------------------------------- */

export class CountersEditForm extends CustomDnd5eForm {
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

  static DEFAULT_OPTIONS = {
    actions: {
      newWorkflow: CountersEditForm.newWorkflow,
      editWorkflow: CountersEditForm.editWorkflow,
      deleteWorkflow: CountersEditForm.deleteWorkflow
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

  static PARTS = {
    form: {
      template: `modules/${MODULE.ID}/templates/counters/${form}.hbs`
    }
  };

  /* -------------------------------------------- */

  #getSelects() {
    return {
      type: {
        choices: {
          checkbox: "CUSTOM_DND5E.checkbox",
          fraction: "CUSTOM_DND5E.fraction",
          number: "CUSTOM_DND5E.number",
          pips: "CUSTOM_DND5E.pips",
          successFailure: "CUSTOM_DND5E.successFailure"
        }
      },
      role: {
        choices: {
          1: "USER.RolePlayer",
          2: "USER.RoleTrusted",
          3: "USER.RoleAssistant",
          4: "USER.RoleGamemaster"
        }
      }
    };
  }

  /* -------------------------------------------- */

  /**
   * Check whether a workflow references the given counter key in any trigger or action.
   * @param {object} workflow The workflow
   * @param {string} counterKey The counter key
   * @returns {boolean} Whether the workflow references the counter key
   */
  #workflowReferencesCounter(workflow, counterKey) {
    const triggers = Object.values(workflow.triggers || {});
    const actions = Object.values(workflow.actions || {});
    return triggers.some(t => COUNTER_TRIGGERS.includes(t.event) && t.counterKey === counterKey)
      || actions.some(a => COUNTER_ACTIONS.includes(a.type) && a.counterKey === counterKey);
  }

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext() {
    const type = this.setting[this.key]?.type || this.type;

    // Build workflows list filtered to those referencing this counter
    const allWorkflows = this.entity
      ? (getFlag(this.entity, "triggers") || {})
      : (getSetting(workflowsSettingKey(this.actorType)) || {});
    const workflows = [];

    for ( const [workflowKey, workflow] of Object.entries(allWorkflows) ) {
      if ( this.#workflowReferencesCounter(workflow, this.key) ) {
        workflows.push({
          workflowKey,
          name: workflow.name || workflowKey
        });
      }
    }

    const counterData = this.setting[this.key];

    return {
      activeTab: this.tabGroups.primary ?? "options",
      key: this.key,
      label: counterData?.label || this.label,
      viewRole: counterData?.viewRole || 1,
      editRole: counterData?.editRole || 1,
      max: counterData?.max,
      type,
      workflows,
      selects: this.#getSelects(),
      isActorCounter: this.actorType === "actor",
      isEntity: !!this.entity,
      actorTypes: {
        character: counterData?.actorTypes ? counterData.actorTypes.includes("character") : true,
        npc: counterData?.actorTypes ? counterData.actorTypes.includes("npc") : true,
        group: counterData?.actorTypes ? counterData.actorTypes.includes("group") : false
      }
    };
  }

  /* -------------------------------------------- */

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);

    const typeSelect = this.element.querySelector("#custom-dnd5e-type");
    const maxGroup = this.element.querySelector("#custom-dnd5e-max")?.closest(".form-group");
    if ( typeSelect && maxGroup ) {
      typeSelect.addEventListener("change", () => {
        maxGroup.classList.toggle("hidden", typeSelect.value === "checkbox");
      });
    }
  }

  /* -------------------------------------------- */
  /*  Workflow Actions                             */
  /* -------------------------------------------- */

  static async newWorkflow() {
    const key = foundry.utils.randomID();
    const setting = this.entity
      ? (getFlag(this.entity, "triggers") || {})
      : (getSetting(workflowsSettingKey(this.actorType)) || {});

    const args = {
      workflowsForm: this,
      setting,
      data: {
        key,
        name: "",
        entity: this.entity,
        entityType: this.actorType
      }
    };
    await WorkflowsEditForm.open(args);
  }

  /* -------------------------------------------- */

  static async editWorkflow(event, target) {
    const item = target.closest(".item");
    if ( !item ) return;

    const key = item.dataset.key;
    if ( !key ) return;

    const setting = this.entity
      ? (getFlag(this.entity, "triggers") || {})
      : (getSetting(workflowsSettingKey(this.actorType)) || {});

    const name = setting[key]?.name || "";
    const args = {
      workflowsForm: this,
      setting,
      data: {
        key,
        name,
        entity: this.entity,
        entityType: this.actorType
      }
    };
    await WorkflowsEditForm.open(args);
  }

  /* -------------------------------------------- */

  static async deleteWorkflow(event, target) {
    const item = target.closest(".item");
    if ( !item ) return;

    const workflowKey = item.dataset.key;
    if ( !workflowKey ) return;

    await foundry.applications.api.DialogV2.confirm({
      window: {
        title: game.i18n.localize("CUSTOM_DND5E.dialog.delete.title")
      },
      content: `<p>${game.i18n.localize("CUSTOM_DND5E.dialog.delete.content")}</p>`,
      modal: true,
      yes: {
        label: game.i18n.localize("CUSTOM_DND5E.yes"),
        callback: async () => {
          if ( this.entity ) {
            const setting = getFlag(this.entity, "triggers") || {};
            delete setting[workflowKey];
            await unsetFlag(this.entity, "triggers");
            await setFlag(this.entity, "triggers", setting);
            ensureEventHooks(setting, this.actorType);
          } else {
            const setting = getSetting(workflowsSettingKey(this.actorType)) || {};
            delete setting[workflowKey];
            await setSetting(workflowsSettingKey(this.actorType), setting);
            rebuild();
          }
          this.render(true);
        }
      },
      no: {
        label: game.i18n.localize("CUSTOM_DND5E.no")
      }
    });
  }

  /* -------------------------------------------- */
  /*  Submit                                      */
  /* -------------------------------------------- */

  static async submit(event, form, formData) {
    const data = formData.object;
    const oldKey = this.key;
    const newKey = data[`${this.key}.key`];

    if ( oldKey !== newKey ) {
      if ( this.setting[newKey] ) {
        Logger.error(`Key '${newKey}' already exists`, true);
        return;
      }
    }

    const ints = ["editRole", "viewRole"];

    Object.entries(data).forEach(([key, value]) => {
      if ( key.split(".").pop() === "key" ) return;
      if ( key.includes(".actorTypes.") ) return;
      if ( ints.includes(key.split(".").pop()) ) { value = parseInt(value); }
      foundry.utils.setProperty(this.setting, key, value);
    });

    // Strip max for checkbox counters
    if ( this.setting[this.key]?.type === "checkbox" ) {
      delete this.setting[this.key].max;
    }

    // Build actorTypes array from checkboxes
    if ( this.actorType === "actor" && !this.entity ) {
      const actorTypes = [];
      if ( data[`${this.key}.actorTypes.character`] ) actorTypes.push("character");
      if ( data[`${this.key}.actorTypes.npc`] ) actorTypes.push("npc");
      if ( data[`${this.key}.actorTypes.group`] ) actorTypes.push("group");
      this.setting[this.key].actorTypes = actorTypes;
    }

    // Handle key rename
    if ( oldKey !== newKey ) {
      this.setting[newKey] = foundry.utils.deepClone(this.setting[oldKey]);

      const reordered = Object.fromEntries(
        Object.keys(this.setting).map(key => [
          (key === oldKey) ? newKey : key,
          foundry.utils.deepClone(this.setting[key])
        ])
      );

      this.setting = reordered;

      if ( this.entity ) {
        const flag = getFlag(this.entity, `counters.${oldKey}`);
        if ( typeof flag !== "undefined" ) {
          await setFlag(this.entity, `counters.${newKey}`, flag);
          await unsetFlag(this.entity, `counters.${oldKey}`);
        }
      } else {
        for ( const actor of game.actors ) {
          const flag = getFlag(actor, `counters.${oldKey}`);
          if ( typeof flag !== "undefined" ) {
            await setFlag(actor, `counters.${newKey}`, flag);
            await unsetFlag(actor, `counters.${oldKey}`);
          }
        }
      }

      this.key = newKey;
    }

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

  static async open(args) {
    const form = new CountersEditForm(args);
    form.render(true);
  }
}
