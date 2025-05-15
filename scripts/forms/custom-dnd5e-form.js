import { MODULE } from "../constants.js";
import { Logger, openDocument, setSetting } from "../utils.js";

const itemClass = `${MODULE.ID}-item`;
const itemClassSelector = `.${itemClass}`;
const listClass = `${MODULE.ID}-list`;
const listClassSelector = `.${listClass}`;

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Class representing the Custom DnD5e Form.
 */
export class CustomDnd5eForm extends HandlebarsApplicationMixin(ApplicationV2) {
  /**
   * Constructor for CustomDnd5eForm.
   *
   * @param {object} [options={}] The options for the form.
   */
  constructor(options = {}) {
    super(options);
    this.nestable = false;
    this.nestType = "children";
    this.includeConfig = true;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    actions: {
      delete: CustomDnd5eForm.deleteItem,
      new: CustomDnd5eForm.createItem,
      reset: CustomDnd5eForm.reset,
      help: CustomDnd5eForm.openHelp
    },
    classes: [`${MODULE.ID}-app`, "dnd5e2", "sheet"],
    tag: "form",
    form: {
      submitOnChange: false,
      closeOnSubmit: true
    },
    dragDrop: [{
      dragSelector: ".custom-dnd5e-drag",
      dropSelector: listClassSelector
    }],
    position: {
      width: 540,
      height: 680
    },
    scrollable: "custom-dnd5e-scrollable",
    window: {
      minimizable: true,
      resizable: true
    }
  };

  /* -------------------------------------------- */

  /**
   * Create a new item.
   *
   * @param {Event} event The event that triggered the action.
   * @param {HTMLElement} target The target element.
   */
  static createItem(event, target) {}

  /* -------------------------------------------- */

  /**
   * Reset the form.
   *
   * @param {Event} event The event that triggered the action.
   * @param {HTMLElement} target The target element.
   */
  static reset(event, target) {}

  /* -------------------------------------------- */

  /**
   * Delete an item.
   *
   * @param {Event} event The event that triggered the action.
   * @param {HTMLElement} target The target element.
   */
  static async deleteItem(event, target) {
    const item = target.closest(".custom-dnd5e-item");
    if ( !item ) return;

    const key = item.dataset.key;
    if ( !key ) return;

    const del = async key => {
      const listItem = this.element.querySelector(`[data-key="${key}"]`);
      const deleteInputs = listItem.querySelectorAll('input[id="custom-dnd5e-delete"]');

      // Set delete input to true against list item and all nested list items
      deleteInputs.forEach(input => {
        input.setAttribute("value", "true");
      });

      listItem.classList.add("hidden");
    };

    await foundry.applications.api.DialogV2.confirm({
      window: {
        title: game.i18n.localize("CUSTOM_DND5E.dialog.delete.title")
      },
      content: `<p>${game.i18n.localize("CUSTOM_DND5E.dialog.delete.content")}</p>`,
      modal: true,
      yes: {
        label: game.i18n.localize("CUSTOM_DND5E.yes"),
        callback: async () => {
          del(key);
        }
      },
      no: {
        label: game.i18n.localize("CUSTOM_DND5E.no")
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * Open the help document.
   *
   * @param {Event} event The event that triggered the action.
   * @param {HTMLElement} target The target element.
   */
  static async openHelp(event, target) {
    const uuid = target.dataset.uuid;
    openDocument(uuid);
  }

  /* -------------------------------------------- */

  /**
   * Handle the rendering of the form.
   *
   * @param {object} context The context for rendering.
   * @param {object} options The options for rendering.
   */
  _onRender(context, options) {
    if ( this.headerButton ) {
      const windowHeader = this.element.querySelector(".window-header");
      const existingButton = windowHeader.querySelector(`[data-action="${this.headerButton.action}"]`);

      if ( !existingButton ) {
        const closeButton = windowHeader.querySelector('[data-action="close"]');
        const button = document.createElement("button");
        button.setAttribute("type", "button");
        button.setAttribute("class", `header-control icon fa-solid ${this.headerButton.icon}`);
        button.setAttribute("data-tooltip", this.headerButton.tooltip);
        button.setAttribute("aria-label", this.headerButton.tooltip);
        button.setAttribute("data-action", this.headerButton.action);
        button.setAttribute("data-uuid", this.headerButton.uuid);
        windowHeader.insertBefore(button, closeButton);
      }
    }

    this.items = Array.from(this.element.querySelectorAll(itemClassSelector));

    this.items.forEach(item => {
      // This.#dragDrop.forEach((d) => d.bind(item))
      item.addEventListener("dragstart", this._onDragStart.bind(this));
      item.addEventListener("dragleave", this._onDragLeave.bind(this));
      item.addEventListener("dragend", this._onDragEnd.bind(this));
      item.addEventListener("dragover", this._onDragOver.bind(this));
      item.addEventListener("drop", this._onDrop.bind(this));

      const checkbox = item.querySelector("input[type='checkbox']");
      checkbox?.addEventListener("change", this._onChangeInput.bind(this));
      if ( checkbox?.checked ) this._onToggleList(checkbox);
    });
  }

  /* -------------------------------------------- */

  /**
   * Handle input change events.
   *
   * @param {Event} event The event that triggered the action.
   */
  async _onChangeInput(event) {
    if ( event.target.id === "custom-dnd5e-visible" ) this._onToggleList(event.target);
  }

  /* -------------------------------------------- */

  /**
   * Toggle the visibility of a list based on a checkbox.
   *
   * @param {HTMLInputElement} checkbox The checkbox element.
   */
  _onToggleList(checkbox) {
    const checkParent = checkbox => {
      const parent = checkbox.closest("ul").closest("li");

      if ( !parent ) return;

      const parentCheckbox = parent.querySelector("input[type='checkbox']");
      parentCheckbox.checked = checkbox.checked;

      checkParent(parentCheckbox);
    };

    if ( checkbox.checked ) {
      checkParent(checkbox);
    }

    if ( !checkbox.checked ) {
      const children = checkbox.closest("li")?.querySelector("ul");

      if ( !children ) return;

      for (const child of children.querySelectorAll("input[type='checkbox']")) {
        child.checked = checkbox.checked;
      }
    }
  }

  /* -------------------------------------------- */

  /** @override */
  _canDragStart(selector) {
    return true;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _canDragDrop(selector) {
    return true;
  }

  /* -------------------------------------------- */

  /** @override */
  _onDragStart(event) {
    this.items = Array.from(event.target.closest(listClassSelector).querySelectorAll(itemClassSelector));
    if ( !this.items ) return;
    this.sourceItem = event.target.closest("li");
    this.sourceIndex = this.items.findIndex(item => item.dataset.key === this.sourceItem.dataset.key);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/html", this.sourceItem.innerHTML);
    this.sourceItem.style.opacity = "0.5";
  }

  /* -------------------------------------------- */

  /** @override */
  _onDragOver(event) {
    if ( !this.sourceItem ) return;

    this.targetItem?.classList.remove(`drag-${this.mousePos}`);

    this.#getDragElement(event);
    this.targetItem?.classList.add(`drag-${this.mousePos}`);
  }

  /* -------------------------------------------- */

  /**
   * Handle drag leave events.
   *
   * @param {Event} event The event that triggered the action.
   */
  _onDragLeave(event) {
    if ( !this.sourceItem ) return;

    this.targetItem?.classList.remove(`drag-${this.mousePos}`);

    this.#getDragElement(event);
    this.targetItem?.classList.remove(`drag-${this.mousePos}`);
  }

  /* -------------------------------------------- */

  /**
   * Handle drag end events.
   *
   * @param {Event} event The event that triggered the action.
   */
  _onDragEnd(event) {
    if ( !this.sourceItem ) return;
    this.sourceItem?.style.removeProperty("opacity");
    this.targetItem?.classList.remove(`drag-${this.mousePos}`);
    this.sourceItem = null;
    this.targetItem = null;
  }

  /** @override */
  _onDrop(event) {
    if ( !this.sourceItem ) return;

    this.#cleanupDragStyles();
    this.#getDragElement(event);

    if ( !this.targetItem ) return;

    if ( !this.#insertSourceItem() ) return;

    this.#updateSourceItemKeys();

    this.sourceItem = null;
    this.targetItem = null;
  }

  /* -------------------------------------------- */

  /**
   * Cleanup the drag styles after a drop event.
   */
  #cleanupDragStyles() {
    this.sourceItem?.style.removeProperty("opacity");
    this.targetItem?.classList.remove(`drag-${this.mousePos}`);
  }

  /* -------------------------------------------- */

  /**
   * Insert the source item based on the mouse position over the target item.
   * @returns {boolean} Whether the source item was inserted successfully.
   */
  #insertSourceItem() {
    if ( this.sourceItem === this.targetItem ) return false;

    this.targetItemIndex = this.items.findIndex(
      item => item.dataset.key === this.targetItem.dataset.key
    );

    switch ( this.mousePos ) {
      case "top":
        this.targetItem.before(this.sourceItem);
        break;
      case "bottom":
        this.targetItem.after(this.sourceItem);
        break;
      case "middle":
        let list = this.targetItem.querySelector("ul");
        if ( !list ) {
          list = document.createElement("ul");
          list.classList.add("custom-dnd5e-list", "flexcol");
          this.targetItem.appendChild(list);
        }
        list.appendChild(this.sourceItem);
        break;
      default:
        return false;
    }

    return true;
  }

  /* -------------------------------------------- */

  /**
   * Update the keys of the source item and its children.
   */
  #updateSourceItemKeys() {
    const items = this.sourceItem?.closest("ul").querySelectorAll("li");

    items.forEach(item => {
      const key = item.dataset?.key;
      if ( !key ) return;

      const parentKey = item.closest("ul")?.closest("li")?.dataset?.key;

      const newKey = parentKey ? `${parentKey}.${this.nestType}.${key}` : key;

      if ( item.dataset.key === newKey ) return;

      item.dataset.key = newKey;

      const inputs = item.querySelectorAll("input, dnd5e-checkbox");

      inputs.forEach(input => {
        if ( input.id === "parentKey" ) {
          input.value = parentKey;
        }

        if ( input.name ) {
          const inputName = input.name.split(".").pop();
          input.name = `${newKey}.${inputName}`;
        }
      });
    });
  }

  /* -------------------------------------------- */

  /**
   * Get the drag element based on the event.
   *
   * @param {Event} event The event that triggered the action.
   */
  #getDragElement(event) {
    const yPct = (event.clientY - event.target.getBoundingClientRect().top)
      / event.target.getBoundingClientRect().height;
    this.targetItem = event.target.closest("li");
    const topPct = (this.nestable) ? 0.25 : 0.5;
    const bottomPct = (this.nestable) ? 0.75 : 0.5;
    if ( yPct < topPct ) {
      this.mousePos = "top";
    } else if ( yPct >= bottomPct ) {
      this.mousePos = "bottom";
    } else {
      this.mousePos = (this.nestable) ? "middle" : "bottom";
    }
  }

  /* -------------------------------------------- */

  /**
   * Get the changed keys from the form data.
   *
   * @param {object} formData The form data.
   * @returns {object} The changed keys.
   */
  getChangedKeys(formData) {
    const changedKeys = {};

    for (const [key, value] of Object.entries(formData.object).filter(([property]) => property.endsWith("key"))) {
      const keyPart = key.split(".").slice(-2, -1)[0];
      if ( keyPart !== value ) { changedKeys[keyPart] = value; }
    }

    return changedKeys;
  }

  /* -------------------------------------------- */

  /**
   * Validate the form data.
   *
   * @param {object} formData The form data.
   * @returns {boolean} Whether the form data passed validation.
   */
  validateFormData(formData) {
    const keys = {};

    Object.keys(formData.object)
      .filter(key => key.split(".").slice(1, 2).pop() === "key")
      .forEach(key => {
        const num = keys[formData.object[key]] ?? 0;
        keys[formData.object[key]] = num + 1;
      });

    const duplicates = [];
    Object.entries(keys).forEach(([key, value]) => {
      if ( value > 1 ) {
        duplicates.push(key);
      }
    });

    if ( duplicates.length === 1 ) {
      Logger.error(`Key '${duplicates.pop()}' already exists`, true);
      return false;
    } else if ( duplicates.length > 1 ) {
      const keyString = duplicates.join(", ");
      Logger.error(`Keys '${keyString}' already exist`, true);
      return false;
    }

    return true;
  }

  /* -------------------------------------------- */

  /**
   * Process the form data for storing into settings.
   *
   * @param {object} args The arguments.
   * @returns {object} The processed form data.
   */
  processFormData(args) {
    const { formData, changedKeys, propertiesToIgnore, setting } = args;
    const processedFormData = {};
    const settingData = setting ? foundry.utils.deepClone(setting) : null;

    // Helper function to set properties
    const setProperty = ([key, value]) => {
      const keyParts = key.split(".");

      // Replace original key with new key
      keyParts.forEach((part, index) => {
        if ( changedKeys[part] ) {
          keyParts[index] = changedKeys[part];
        }
      });

      const lastProperty = keyParts.pop();
      const propertyPath = keyParts.join(".");

      // Don't set ignored properties or any properties where the associated 'delete' property is true
      if ( propertiesToIgnore.includes(lastProperty) || formData.object[`${propertyPath}.delete`] === "true" ) return;

      if ( lastProperty === "system" ) {
        value = (value === "true"); // Convert value to boolean
        if ( value ) return; // Don't set the 'system' value if it is true
      }

      // If setting passed, initialise property with setting data
      if ( settingData ) {
        if ( !processedFormData[propertyPath] && typeof settingData[propertyPath] === "object" ) {
          foundry.utils.setProperty(processedFormData, propertyPath, settingData[propertyPath] ?? {});
        }
      }

      foundry.utils.setProperty(processedFormData, `${propertyPath}.${lastProperty}`, value);
    };

    // Process the form data
    for (const entry of Object.entries(formData.object)) {
      setProperty(entry);
    }

    return processedFormData;
  }

  /* -------------------------------------------- */

  /**
   * Update the properties for all actors to the changed keys.
   *
   * @param {object} args The arguments.
   */
  updateActorKeys(args) {
    const { changedKeys, actorProperties } = args;

    if ( Object.keys(changedKeys).length && actorProperties ) {
      game.actors.forEach(actor => {
        const updateData = {};
        let requiresUpdate = false;
        this.actorProperties.forEach(property => {
          const oldData = foundry.utils.getProperty(actor, property);
          if ( !Array.isArray(oldData) && !(oldData instanceof Set) ) return;
          const newData = [];
          oldData.forEach(value => {
            if ( changedKeys[value] ) {
              requiresUpdate = true;
            }
            newData.push((changedKeys[value] || value));
          });
          updateData[property] = newData;
        });
        if ( requiresUpdate ) {
          actor.update(updateData);
        }
      });
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle the form submission.
   *
   * @param {object} processedFormData The processed form data.
   * @param {string} settingKey The setting key.
   * @param {boolean} enableConfig Whether the config is enabled.
   * @param {Function} setConfig The function to set the config.
   * @param {boolean} [requiresReload=false] Whether a reload is required.
   */
  async handleSubmit(processedFormData, settingKey, enableConfig, setConfig, requiresReload = false) {
    try {
      const settingData = foundry.utils.deepClone(processedFormData);
      await setSetting(settingKey, {});
      await setSetting(settingKey, settingData);
      if ( enableConfig && setConfig ) {
        const configData = foundry.utils.deepClone(processedFormData);
        setConfig(configData);
      }

      if ( requiresReload ) {
        SettingsConfig.reloadConfirm();
      }
    } catch (err) {
      Logger.error(`Failed to save configuration: ${err.message}`, true);
    }

    this.close();
  }
}
