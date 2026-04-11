import { CONSTANTS, JOURNAL_HELP_BUTTON, MODULE } from "../../constants.js";
import { deleteProperty, getSetting, Logger, setSetting } from "../../utils.js";
import { CustomDnd5eForm } from "../custom-dnd5e-form.js";
import { JournalDropMixin } from "../journal-drop-mixin.js";
import { WorkflowsEditForm, getActionChoices } from "./workflows-edit.js";
import { EVENT_TO_HOOK, ITEM_EVENT_TO_HOOK, rebuild } from "../../workflows/workflows.js";

const id = CONSTANTS.WORKFLOWS.ID;
const form = `${id}-form`;

export class WorkflowsForm extends JournalDropMixin(CustomDnd5eForm) {
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

  /**
   * Validate a parsed workflow object against the expected schema.
   * @override
   * @param {*} data Parsed object
   * @returns {{valid: boolean, error: string|null}} Validation result
   */
  _validateImportSchema(data) {
    return this._validateWorkflowSchema(data);
  }

  /* -------------------------------------------- */

  /**
   * Create workflows from imported data.
   * @override
   * @param {object[]} entries Array of validated workflow data
   */
  async _createFromImport(entries) {
    return this._createWorkflowsFromImport(entries);
  }

  /* -------------------------------------------- */

  /**
   * Validate a parsed workflow object against the expected schema.
   * @param {*} data Parsed object
   * @returns {{valid: boolean, error: string|null}} Validation result
   */
  _validateWorkflowSchema(data) {
    if ( !data || typeof data !== "object" || Array.isArray(data) ) {
      return { valid: false, error: game.i18n.localize("CUSTOM_DND5E.workflowImport.error.notObject") };
    }

    if ( typeof data.name !== "string" || !data.name.trim() ) {
      return { valid: false, error: game.i18n.localize("CUSTOM_DND5E.workflowImport.error.invalidName") };
    }

    if ( data.entityType !== undefined && data.entityType !== "actor" && data.entityType !== "item" ) {
      return { valid: false, error: game.i18n.localize("CUSTOM_DND5E.workflowImport.error.invalidEntityType") };
    }

    const allowedKeys = new Set([
      "name", "enabled", "entityType", "actorTypes", "target", "triggers", "actions"
    ]);
    for ( const key of Object.keys(data) ) {
      if ( !allowedKeys.has(key) ) {
        return {
          valid: false,
          error: game.i18n.format("CUSTOM_DND5E.workflowImport.error.unknownProperty", { property: key })
        };
      }
    }

    // Validate triggers
    const isItem = data.entityType === "item";
    const validEvents = new Set(Object.keys(isItem ? ITEM_EVENT_TO_HOOK : EVENT_TO_HOOK));
    if ( data.triggers !== undefined ) {
      if ( typeof data.triggers !== "object" || data.triggers === null ) {
        return { valid: false, error: game.i18n.localize("CUSTOM_DND5E.workflowImport.error.invalidTrigger") };
      }
      for ( const trigger of Object.values(data.triggers) ) {
        if ( !trigger || typeof trigger.event !== "string" || !validEvents.has(trigger.event) ) {
          return {
            valid: false,
            error: game.i18n.format("CUSTOM_DND5E.workflowImport.error.invalidTrigger", { event: trigger?.event ?? "" })
          };
        }
      }
    }

    // Validate actions
    const validActionTypes = new Set(getActionChoices(data.entityType ?? "actor").map(c => c.value));
    if ( data.actions !== undefined ) {
      if ( typeof data.actions !== "object" || data.actions === null ) {
        return { valid: false, error: game.i18n.localize("CUSTOM_DND5E.workflowImport.error.invalidAction") };
      }
      for ( const action of Object.values(data.actions) ) {
        if ( !action || typeof action.type !== "string" || !validActionTypes.has(action.type) ) {
          return {
            valid: false,
            error: game.i18n.format("CUSTOM_DND5E.workflowImport.error.invalidAction", { type: action?.type ?? "" })
          };
        }
      }
    }

    return { valid: true, error: null };
  }

  /* -------------------------------------------- */

  /**
   * Create one or more workflows in the appropriate settings from imported data.
   * @param {object[]} workflows Array of validated workflow data
   */
  async _createWorkflowsFromImport(workflows) {
    // Group workflows by target setting key
    const byKey = {
      [CONSTANTS.WORKFLOWS.SETTING.ACTOR_WORKFLOWS.KEY]: [],
      [CONSTANTS.WORKFLOWS.SETTING.ITEM_WORKFLOWS.KEY]: []
    };
    for ( const workflow of workflows ) {
      const entityType = workflow.entityType ?? (this.isItem ? "item" : "actor");
      const isItem = entityType === "item";
      const settingKey = isItem
        ? CONSTANTS.WORKFLOWS.SETTING.ITEM_WORKFLOWS.KEY
        : CONSTANTS.WORKFLOWS.SETTING.ACTOR_WORKFLOWS.KEY;
      byKey[settingKey].push({ ...workflow, entityType });
    }

    // Update each affected setting
    const names = [];
    let switchToItem = null;
    for ( const [settingKey, newWorkflows] of Object.entries(byKey) ) {
      if ( !newWorkflows.length ) continue;

      const isItem = settingKey === CONSTANTS.WORKFLOWS.SETTING.ITEM_WORKFLOWS.KEY;
      const setting = getSetting(settingKey) || {};

      // Respect pending deletions: remove workflows marked with delete="true" in the DOM
      const tabSelector = isItem ? '[data-tab="items"]' : '[data-tab="actors"]';
      const hiddenItems = this.element.querySelectorAll(
        `${tabSelector} .custom-dnd5e-list > .item input[id="custom-dnd5e-delete"][value="true"]`
      );
      hiddenItems.forEach(input => {
        const listItem = input.closest(".item");
        if ( listItem?.dataset.key ) delete setting[listItem.dataset.key];
      });

      for ( const workflow of newWorkflows ) {
        const key = foundry.utils.randomID();
        setting[key] = workflow;
        names.push(workflow.name);
      }

      await setSetting(settingKey, setting);
      if ( switchToItem === null ) switchToItem = isItem;
    }

    // Switch to the appropriate tab if needed and re-render
    if ( switchToItem !== null && switchToItem !== this.isItem ) {
      this.tabGroups.primary = switchToItem ? "items" : "actors";
    }
    this.render(true);

    Logger.info(
      game.i18n.format("CUSTOM_DND5E.workflowImport.success", { name: names.join(", ") }),
      true
    );
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
