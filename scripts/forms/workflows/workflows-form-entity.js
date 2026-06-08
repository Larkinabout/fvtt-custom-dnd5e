import { CONSTANTS, MODULE } from "../../constants.js";
import { deleteProperty, getFlag, Logger, setFlag, unsetFlag } from "../../utils.js";
import { WorkflowsForm } from "./workflows-form.js";
import { WorkflowsEditForm } from "./workflows-edit.js";
import { rebuild } from "../../workflows/workflows.js";

const form = "workflows-form-entity";

export class WorkflowsFormEntity extends WorkflowsForm {
  constructor(entity) {
    super(entity);
    this.entity = entity;
  }

  /* -------------------------------------------- */

  static DEFAULT_OPTIONS = {
    actions: {
      new: WorkflowsFormEntity.createItem,
      edit: WorkflowsFormEntity.edit
    },
    form: {
      handler: WorkflowsFormEntity.submit
    },
    id: `${MODULE.ID}-${form}`,
    window: {
      title: "CUSTOM_DND5E.form.workflows.title"
    }
  };

  /* -------------------------------------------- */

  static PARTS = {
    form: {
      template: CONSTANTS.CONFIG.TEMPLATE.SECTIONS
    }
  };

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext() {
    this.triggers = getFlag(this.entity, "triggers") || {};
    return {
      sections: [{
        listTitle: "CUSTOM_DND5E.form.workflows.listTitle",
        showNew: true,
        list: {
          items: this.triggers,
          toggleField: "enabled",
          editAction: "edit",
          showToggle: true,
          showSystem: false,
          rowActions: [{ action: "copy", icon: "fa-regular fa-clipboard", tooltip: "CUSTOM_DND5E.copyToClipboard" }]
        }
      }]
    };
  }

  /* -------------------------------------------- */

  /** Whether the entity is an item or actor.
   * @returns {string} "item" if the entity is an Item document, otherwise "actor".
   */
  get entityType() {
    return this.entity?.documentName === "Item" ? "item" : "actor";
  }

  /* -------------------------------------------- */

  static async createItem() {
    const key = foundry.utils.randomID();
    const args = {
      workflowsForm: this,
      data: { key, name: "", entity: this.entity, entityType: this.entityType },
      setting: this.triggers
    };
    await WorkflowsEditForm.open(args);
  }

  /* -------------------------------------------- */

  static async edit(event, target) {
    const item = target.closest(".item");
    if ( !item ) return;

    const key = item.dataset.key;
    if ( !key ) return;

    const name = this.triggers[key]?.name || "";
    const args = {
      workflowsForm: this,
      data: { key, name, entity: this.entity, entityType: this.entityType },
      setting: this.triggers
    };
    await WorkflowsEditForm.open(args);
  }

  /* -------------------------------------------- */

  /** @override */
  async _createFromImport(entries) {
    return this._createWorkflowsFromImport(entries);
  }

  /* -------------------------------------------- */

  /** @override */
  async _createWorkflowsFromImport(workflows) {
    const triggers = getFlag(this.entity, "triggers") || {};

    // Respect pending deletions in the DOM
    const hiddenItems = this.element.querySelectorAll(
      '.custom-dnd5e-list > .item input[id="custom-dnd5e-delete"][value="true"]'
    );
    hiddenItems.forEach(input => {
      const listItem = input.closest(".item");
      if ( listItem?.dataset.key ) delete triggers[listItem.dataset.key];
    });

    const names = [];
    for ( const workflow of workflows ) {
      const key = foundry.utils.randomID();
      const rest = { ...workflow };
      delete rest.entityType;
      triggers[key] = rest;
      names.push(workflow.name);
    }

    await unsetFlag(this.entity, "triggers");
    await setFlag(this.entity, "triggers", triggers);
    this.triggers = triggers;
    this.render(true);

    Logger.info(
      game.i18n.format("CUSTOM_DND5E.workflowImport.success", { name: names.join(", ") }),
      true
    );
  }

  /* -------------------------------------------- */

  static async submit(event, form, formData) {
    const ignore = ["delete", "key"];

    const deleteKeys = Object.entries(formData.object)
      .filter(([key, value]) => key.split(".").pop() === "delete" && value === "true")
      .map(([key, _]) => key.split(".").slice(0, -1).join("."));

    deleteKeys.forEach(key => {
      deleteProperty(this.triggers, key);
    });

    Object.keys(formData.object).forEach(key => {
      if ( deleteKeys.includes(key.split(".").slice(0, -1)[0]) ) {
        delete formData.object[key];
      }
    });

    Object.entries(formData.object).forEach(([key, value]) => {
      if ( ignore.includes(key.split(".").pop()) ) { return; }
      foundry.utils.setProperty(this.triggers, key, value);
    });

    // Rebuild in DOM order to preserve drag-and-drop reordering
    const keys = Array.from(this.element.querySelectorAll(".custom-dnd5e-list > .item"))
      .map(li => li.dataset.key)
      .filter(key => key in this.triggers);
    const reordered = {};
    for ( const key of keys ) reordered[key] = this.triggers[key];
    this.triggers = reordered;

    await unsetFlag(this.entity, "triggers");
    await setFlag(this.entity, "triggers", this.triggers);

    rebuild();
  }
}
