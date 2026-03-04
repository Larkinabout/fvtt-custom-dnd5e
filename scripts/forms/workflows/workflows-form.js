import { CONSTANTS, JOURNAL_HELP_BUTTON, MODULE } from "../../constants.js";
import { deleteProperty, getSetting, setSetting } from "../../utils.js";
import { CustomDnd5eForm } from "../custom-dnd5e-form.js";
import { WorkflowsEditForm } from "./workflows-edit.js";
import { rebuild } from "../../workflows/workflows.js";

const id = CONSTANTS.WORKFLOWS.ID;
const form = `${id}-form`;

export class WorkflowsForm extends CustomDnd5eForm {
  constructor(...args) {
    super(args);
    this.headerButton = JOURNAL_HELP_BUTTON;
    this.headerButton.uuid = CONSTANTS.WORKFLOWS.UUID;
  }

  /* -------------------------------------------- */

  static DEFAULT_OPTIONS = {
    actions: {
      new: WorkflowsForm.createItem,
      edit: WorkflowsForm.edit,
      delete: WorkflowsForm.deleteItem
    },
    form: {
      handler: WorkflowsForm.submit
    },
    id: `${MODULE.ID}-${form}`,
    window: {
      title: "CUSTOM_DND5E.form.workflows.title"
    }
  };

  /* -------------------------------------------- */

  static PARTS = {
    form: {
      template: `modules/${MODULE.ID}/templates/workflows/${form}.hbs`
    }
  };

  /* -------------------------------------------- */

  /**
   * Whether the active tab is the items tab.
   * @returns {boolean} True if the active tab is the items tab.
   */
  get isItem() {
    return (this.tabGroups.primary ?? "actors") === "items";
  }

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext() {
    this.actorSetting = getSetting(CONSTANTS.WORKFLOWS.SETTING.ACTOR_WORKFLOWS.KEY) || {};
    this.itemSetting = getSetting(CONSTANTS.WORKFLOWS.SETTING.ITEM_WORKFLOWS.KEY) || {};
    return {
      activeTab: this.tabGroups.primary ?? "actors",
      enabled: getSetting(CONSTANTS.WORKFLOWS.SETTING.ENABLE.KEY) || false,
      actorTriggers: this.actorSetting,
      itemTriggers: this.itemSetting
    };
  }

  /* -------------------------------------------- */

  static async deleteItem(event, target) {
    const item = target.closest(".item");
    if ( !item ) return;

    const key = item.dataset.key;
    if ( !key ) return;

    await foundry.applications.api.DialogV2.confirm({
      window: {
        title: game.i18n.localize("CUSTOM_DND5E.form.workflows.dialog.delete.title")
      },
      content: `<p>${game.i18n.localize("CUSTOM_DND5E.form.workflows.dialog.delete.content")}</p>`,
      modal: true,
      yes: {
        label: game.i18n.localize("CUSTOM_DND5E.yes"),
        callback: async () => {
          const listItem = this.element.querySelector(`[data-key="${key}"]`);
          const deleteInput = listItem.querySelector('input[id="custom-dnd5e-delete"]');
          if ( deleteInput ) deleteInput.setAttribute("value", "true");
          listItem.classList.add("hidden");
        }
      },
      no: {
        label: game.i18n.localize("CUSTOM_DND5E.no")
      }
    });
  }

  /* -------------------------------------------- */

  static async createItem() {
    const key = foundry.utils.randomID();
    const entityType = this.isItem ? "item" : "actor";
    const setting = this.isItem ? this.itemSetting : this.actorSetting;
    const args = { workflowsForm: this, data: { key, name: "", entityType }, setting };
    await WorkflowsEditForm.open(args);
  }

  /* -------------------------------------------- */

  static async edit(event, target) {
    const item = target.closest(".item");
    if ( !item ) return;

    const key = item.dataset.key;
    if ( !key ) return;

    const entityType = this.isItem ? "item" : "actor";
    const setting = this.isItem ? this.itemSetting : this.actorSetting;
    const name = setting[key]?.name || "";
    const args = { workflowsForm: this, data: { key, name, entityType }, setting };
    await WorkflowsEditForm.open(args);
  }

  /* -------------------------------------------- */

  static async submit(event, form, formData) {
    // Get list of properties to delete
    const deleteKeys = Object.entries(formData.object)
      .filter(([key, value]) => key.split(".").pop() === "delete" && value === "true")
      .map(([key, _]) => key.split(".").slice(0, -1).join("."));

    // Delete properties from both settings (key uniqueness ensures correct removal)
    deleteKeys.forEach(deleteKey => {
      const key = deleteKey.split(".").pop();
      deleteProperty(this.actorSetting, key);
      deleteProperty(this.itemSetting, key);
    });

    // Process enabled checkbox values
    for ( const [formKey, value] of Object.entries(formData.object) ) {
      const match = formKey.match(/^([^.]+)\.enabled$/);
      if ( !match ) continue;
      const workflowKey = match[1];
      if ( this.actorSetting[workflowKey] ) this.actorSetting[workflowKey].enabled = value;
      if ( this.itemSetting[workflowKey] ) this.itemSetting[workflowKey].enabled = value;
    }

    // Rebuild settings in DOM order to preserve drag-and-drop reordering
    const reorder = (setting, tabSelector) => {
      const keys = Array.from(this.element.querySelectorAll(`${tabSelector} .custom-dnd5e-list > .item`))
        .map(li => li.dataset.key)
        .filter(key => key in setting);
      const reordered = {};
      for ( const key of keys ) reordered[key] = setting[key];
      return reordered;
    };
    this.actorSetting = reorder(this.actorSetting, '[data-tab="actors"]');
    this.itemSetting = reorder(this.itemSetting, '[data-tab="items"]');

    await Promise.all([
      setSetting(CONSTANTS.WORKFLOWS.SETTING.ENABLE.KEY, formData.object.enabled ?? false),
      setSetting(CONSTANTS.WORKFLOWS.SETTING.ACTOR_WORKFLOWS.KEY, this.actorSetting),
      setSetting(CONSTANTS.WORKFLOWS.SETTING.ITEM_WORKFLOWS.KEY, this.itemSetting)
    ]);

    rebuild();
  }
}
