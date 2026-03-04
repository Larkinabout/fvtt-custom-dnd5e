import { CONSTANTS, JOURNAL_HELP_BUTTON, MODULE } from "../../constants.js";
import { deleteProperty, unsetFlag, getSetting, setSetting } from "../../utils.js";
import { CustomDnd5eForm } from "../custom-dnd5e-form.js";
import { CountersEditForm } from "./counters-edit.js";

const id = CONSTANTS.COUNTERS.ID;
const form = `${id}-form`;

export class CountersForm extends CustomDnd5eForm {
  constructor(...args) {
    super(args);
    this.headerButton = JOURNAL_HELP_BUTTON;
    this.headerButton.uuid = CONSTANTS.COUNTERS.UUID;
  }

  /* -------------------------------------------- */

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

  static PARTS = {
    form: {
      template: `modules/${MODULE.ID}/templates/counters/${form}.hbs`
    }
  };

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext() {
    this.settings = {
      actor: getSetting(CONSTANTS.COUNTERS.SETTING.ACTOR_COUNTERS.KEY) || {},
      item: getSetting(CONSTANTS.COUNTERS.SETTING.ITEM_COUNTERS.KEY) || {}
    };
    return {
      activeTab: this.tabGroups.primary ?? "actors",
      counters: getSetting(CONSTANTS.COUNTERS.SETTING.COUNTERS.KEY) || false,
      settings: this.settings
    };
  }

  /* -------------------------------------------- */

  static async createItem() {
    const activeTab = this.element.querySelector(".tab.active");
    const actorType = activeTab?.dataset?.actorType;
    const key = foundry.utils.randomID();
    const setting = this.settings[actorType];
    const args = { countersForm: this, data: { key, actorType, label: "", type: "number" }, setting };
    await CountersEditForm.open(args);
  }

  /* -------------------------------------------- */

  /**
   * Copy a counter property path to the clipboard.
   * @param {Event} event
   * @param {HTMLElement} target
   */
  static async copyProperty(event, target) {
    const item = target.closest(".custom-dnd5e-item");
    if ( !item ) return;

    const key = item.dataset.key;
    if ( !key ) return;

    const activeTab = this.element.querySelector(".tab.active");
    const actorType = activeTab?.dataset?.actorType;
    const type = this.settings[actorType]?.[key]?.type;

    const property = `@flags.${MODULE.ID}.counters.${key}${(type === "successFailure") ? ".success" : ".value"}`;
    game.clipboard.copyPlainText(property);
    ui.notifications.info(game.i18n.format("CUSTOM_DND5E.form.counters.copyProperty.message", { property }));
  }

  /* -------------------------------------------- */

  static async edit(event, target) {
    const item = target.closest(".custom-dnd5e-item");
    if ( !item ) return;

    const key = item.dataset.key;
    if ( !key ) return;

    const activeTab = this.element.querySelector(".tab.active");
    const actorType = activeTab?.dataset?.actorType;
    const setting = this.settings[actorType];
    const label = setting[key]?.label || "";
    const type = setting[key]?.type || "number";
    const args = { countersForm: this, data: { key, actorType, label, type }, setting };
    await CountersEditForm.open(args);
  }

  /* -------------------------------------------- */

  static async submit(event, form, formData) {
    const ignore = ["actorType", "counters", "delete", "key"];

    const deleteKeys = Object.entries(formData.object)
      .filter(([key, value]) => key.split(".").pop() === "delete" && value === "true")
      .map(([key, _]) => key.split(".").slice(0, -1).join("."));

    deleteKeys.forEach(deleteKey => {
      const parts = deleteKey.split(".");
      const actorType = parts.slice(0, 1).join(".");
      const key = parts.pop();
      const setting = this.settings[actorType];
      deleteProperty(setting, key);
      for (const actor of game.actors) {
        unsetFlag(actor, `counters.${key}`);
      }
    });

    Object.keys(formData.object).forEach(key => {
      if ( deleteKeys.includes(key.split(".").slice(0, -1).join(".")) ) {
        delete formData.object[key];
      }
    });

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
      setSetting(CONSTANTS.COUNTERS.SETTING.ACTOR_COUNTERS.KEY, this.settings.actor),
      setSetting(CONSTANTS.COUNTERS.SETTING.ITEM_COUNTERS.KEY, this.settings.item)
    ]);
  }
}
