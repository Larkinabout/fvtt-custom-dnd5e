import { CONSTANTS, JOURNAL_HELP_BUTTON, MODULE } from "../constants.js";
import { deleteProperty, unsetFlag, getSetting, setSetting } from "../utils.js";
import { CustomDnd5eForm } from "./custom-dnd5e-form.js";
import { CountersEditForm } from "./counters-edit.js";

const id = CONSTANTS.COUNTERS.ID;
const form = `${id}-form`;
const listClass = `${MODULE.ID}-list`;
const listClassSelector = `.${listClass}`;

/**
 * Get the select options for the counters form.
 *
 * @returns {object} An object containing the select options.
 */
function getSelects() {
  return {
    type: {
      choices: {
        checkbox: "CUSTOM_DND5E.checkbox",
        fraction: "CUSTOM_DND5E.fraction",
        number: "CUSTOM_DND5E.number",
        pips: "CUSTOM_DND5E.pips",
        successFailure: "CUSTOM_DND5E.successFailure"
      }
    }
  };
}

/* -------------------------------------------- */

/**
 * Class representing the Counters Form.
 *
 * @extends {CustomDnd5eForm}
 */
export class CountersForm extends CustomDnd5eForm {
  /**
   * Constructor for CountersForm.
   *
   * @param {...any} args Arguments to pass to the parent constructor.
   */
  constructor(...args) {
    super(args);
    this.headerButton = JOURNAL_HELP_BUTTON;
    this.headerButton.uuid = CONSTANTS.COUNTERS.UUID;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    actions: {
      new: CountersForm.createItem,
      "copy-property": CountersForm.copyProperty,
      edit: CountersForm.edit
    },
    form: {
      handler: CountersForm.submit
    },
    id: `${MODULE.ID}-${form}`,
    window: {
      title: `CUSTOM_DND5E.form.${id}.title`
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
   * Prepare the context for the form.
   *
   * @returns {Promise<object>} The context object containing settings and selects.
   */
  async _prepareContext() {
    this.settings = {
      character: getSetting(CONSTANTS.COUNTERS.SETTING.CHARACTER_COUNTERS.KEY) || {},
      group: getSetting(CONSTANTS.COUNTERS.SETTING.GROUP_COUNTERS.KEY) || {},
      item: getSetting(CONSTANTS.COUNTERS.SETTING.ITEM_COUNTERS.KEY) || {},
      npc: getSetting(CONSTANTS.COUNTERS.SETTING.NPC_COUNTERS.KEY) || {}
    };
    return {
      counters: getSetting(CONSTANTS.COUNTERS.SETTING.COUNTERS.KEY) || false,
      settings: this.settings,
      selects: getSelects()
    };
  }

  /* -------------------------------------------- */

  /**
   * Create a new item in the counters form.
   *
   * @returns {Promise<void>}
   */
  static async createItem() {
    const activeTab = this.element.querySelector(".tab.active");
    const actorType = (activeTab) ? activeTab.dataset.actorType : null;
    const list = (activeTab)
      ? activeTab.querySelector(listClassSelector)
      : this.element.querySelector(listClassSelector);
    const scrollable = list.closest(".scrollable");

    const key = foundry.utils.randomID();
    const data = {
      actorType,
      counters: { [key]: {} },
      selects: getSelects()
    };

    const template = await foundry.applications.handlebars.renderTemplate(CONSTANTS.COUNTERS.TEMPLATE.LIST, data);

    list.insertAdjacentHTML("beforeend", template);

    const item = list.querySelector(`[data-key="${key}"]`);

    if ( this.items[0] ) { item.addEventListener("dragstart", this.items[0].ondragstart); } // Fix this for empty list
    item.addEventListener("dragleave", this._onDragLeave);

    if ( scrollable ) {
      scrollable.scrollTop = scrollable.scrollHeight;
    }
  }

  /* -------------------------------------------- */

  /**
   * Copy a property to the clipboard.
   *
   * @param {Event} event The event that triggered the copy.
   * @param {HTMLElement} target The target element.
   * @returns {Promise<void>}
   */
  static async copyProperty(event, target) {
    const item = target.closest(".custom-dnd5e-item");
    if ( !item ) return;

    const key = item.dataset.key;
    if ( !key ) return;

    const type = item.querySelector("#custom-dnd5e-type").value;

    const property = `@flags.${MODULE.ID}.${key}${(type === "successFailure") ? ".success" : (type === "fraction") ? ".value" : ""}`;
    game.clipboard.copyPlainText(property);
    ui.notifications.info(game.i18n.format("CUSTOM_DND5E.form.counters.copyProperty.message", { property }));
  }

  /* -------------------------------------------- */

  /**
   * Open the edit form for a counter.
   *
   * @param {Event} event The event that triggered the edit.
   * @param {HTMLElement} target The target element.
   * @returns {Promise<void>}
   */
  static async edit(event, target) {
    const item = target.closest(".custom-dnd5e-item");
    if ( !item ) return;

    const key = item.dataset.key;
    if ( !key ) return;

    const label = item.querySelector("#custom-dnd5e-label").value;
    const type = item.querySelector("#custom-dnd5e-type").value;
    const activeTab = this.element.querySelector(".tab.active");
    const actorType = activeTab?.dataset?.actorType;
    const setting = this.settings[actorType];
    const args = { countersForm: this, data: { key, actorType, label, type }, setting };
    await CountersEditForm.open(args);
  }

  /* -------------------------------------------- */

  /**
   * Submit the form data.
   *
   * @param {Event} event The event that triggered the submit.
   * @param {HTMLFormElement} form The form element.
   * @param {object} formData The form data.
   * @returns {Promise<void>}
   */
  static async submit(event, form, formData) {
    const ignore = ["actorType", "counters", "delete", "key"];

    // Get list of properties to delete
    const deleteKeys = Object.entries(formData.object)
      .filter(([key, value]) => key.split(".").pop() === "delete" && value === "true")
      .map(([key, _]) => key.split(".").slice(0, -1).join("."));

    // Delete properties from this.setting
    deleteKeys.forEach(deleteKey => {
      const parts = deleteKey.split(".");
      const actorType = parts.slice(0, 1).join(".");
      const key = parts.pop();
      const setting = this.settings[actorType];
      deleteProperty(setting, key);
      for (const actor of game.actors) {
        unsetFlag(actor, key);
      }
    });

    // Delete properties from formData
    Object.keys(formData.object).forEach(key => {
      if ( deleteKeys.includes(key.split(".").slice(0, -1).join(".")) ) {
        delete formData.object[key];
      }
    });

    // Set properties in this.setting
    Object.entries(formData.object).forEach(([key, value]) => {
      if ( ignore.includes(key.split(".").pop()) ) { return; }
      const arr = key.split(".");
      const actorType = arr.slice(0, 1).join(".");
      const property = arr.slice(1, 3).join(".");
      const setting = this.settings[actorType];
      foundry.utils.setProperty(setting, property, value);
    });

    await Promise.all([
      setSetting(CONSTANTS.COUNTERS.SETTING.COUNTERS.KEY, formData.object.counters),
      setSetting(CONSTANTS.COUNTERS.SETTING.CHARACTER_COUNTERS.KEY, this.settings.character),
      setSetting(CONSTANTS.COUNTERS.SETTING.GROUP_COUNTERS.KEY, this.settings.group),
      setSetting(CONSTANTS.COUNTERS.SETTING.ITEM_COUNTERS.KEY, this.settings.item),
      setSetting(CONSTANTS.COUNTERS.SETTING.NPC_COUNTERS.KEY, this.settings.npc)
    ]);
  }
}
