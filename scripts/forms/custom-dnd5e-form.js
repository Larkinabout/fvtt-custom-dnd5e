import { JOURNAL_HELP_BUTTON, MODULE } from "../constants.js";
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
   * @param {object} [options={}]
   */
  constructor(options = {}) {
    super(options);
    this.nestable = false;
    this.nestType = "children";
    this.includeConfig = true;
  }

  /* -------------------------------------------- */

  /**
   * Set the config data from the form data.
   * @param {object} data
   * @returns {void|Promise<void>}
   */
  setConfig(data) {
    return this.config.setConfig(data);
  }

  /* -------------------------------------------- */

  /**
   * The `CONFIG.DND5E` key for the config.
   * @returns {string|undefined}
   */
  get configKey() { return this._configKey ?? this.config?.configKey; }

  set configKey(value) { this._configKey = value; }

  /* -------------------------------------------- */

  /**
   * The setting key for the stored data.
   * @returns {string|undefined}
   */
  get settingKey() { return this._settingKey ?? this.config?.constants?.SETTING?.CONFIG?.KEY; }

  set settingKey(value) { this._settingKey = value; }

  /* -------------------------------------------- */

  /**
   * The setting key for the enabled state of the custom config.
   * @returns {string|undefined}
   */
  get enableConfigKey() { return this._enableConfigKey ?? this.config?.constants?.SETTING?.ENABLE?.KEY; }

  set enableConfigKey(value) { this._enableConfigKey = value; }

  /* -------------------------------------------- */

  /**
   * The journal help button descriptor for the window header.
   * Cached on first access.
   * @returns {object|undefined}
   */
  get headerButton() {
    if ( this._headerButton ) return this._headerButton;
    const uuid = this.config?.constants?.UUID;
    if ( !uuid ) return undefined;
    this._headerButton = { ...JOURNAL_HELP_BUTTON, uuid };
    return this._headerButton;
  }

  set headerButton(value) { this._headerButton = value; }

  /* -------------------------------------------- */

  /**
   * Get the default config entry for a key.
   * @param {string|null} [key=null]
   * @returns {object}
   */
  getSettingDefault(key = null) {
    return this.config.getSettingDefault(key);
  }

  /* -------------------------------------------- */

  /**
   * Reset the config and its stored setting to defaults.
   * @returns {Promise<void>}
   */
  async resetConfigSetting() {
    return this.config.resetConfigSetting();
  }

  /* -------------------------------------------- */

  /**
   * Get the select options for resolving select/multiSelect field choices.
   * @returns {object|null}
   */
  _getSelects() {
    return null;
  }

  /* -------------------------------------------- */

  /**
   * Resolve a choices descriptor into a choices object for selectOptions.
   * @param {string|object|Function} choices
   * @param {object|null} selects Select options from `_getSelects`
   * @returns {object} Choices object
   */
  _resolveChoices(choices, selects) {
    if ( typeof choices === "string" ) {
      const select = selects?.[choices];
      return select?.choices ?? select;
    }
    if ( typeof choices === "function" ) return choices(this);
    return choices;
  }

  /* -------------------------------------------- */

  /**
   * Resolve a single field descriptor into a field context for the `field.hbs` template.
   * Shared by the edit dialog and the inline list.
   * @param {object} field
   * @param {object} entry
   * @param {string} key Entry key
   * @param {boolean} isSystem Whether the entry is a system entry
   * @param {object|null} selects Select options from `_getSelects`
   * @param {string} labelClass CSS class for the label
   * @returns {Promise<object>} Resolved field context
   */
  async _resolveField(field, entry, key, isSystem, selects, labelClass) {
    if ( field.type === "key" ) {
      return {
        type: "key",
        label: "CUSTOM_DND5E.key",
        labelClass,
        inputName: `${key}.key`,
        disabledInputName: `${key}.disabledKey`,
        value: game.i18n.localize(key),
        isSystem
      };
    }

    const resolved = {
      type: field.type,
      label: field.label,
      hint: field.hint,
      unit: field.unit,
      tooltip: field.tooltip ? game.i18n.localize(field.tooltip) : undefined,
      placeholder: field.placeholder,
      labelClass,
      customTemplate: field.template,
      inputName: `${key}.${field.name}`,
      id: `custom-dnd5e-${field.name.replace(/\./g, "-")}`,
      disabled: !!(field.disabledWhenSystem && isSystem)
    };

    let value = foundry.utils.getProperty(entry, field.name);
    if ( field.localizeValue && typeof value === "string" ) value = game.i18n.localize(value);
    resolved.value = value;

    if ( field.type === "checkbox" ) {
      resolved.checked = (field.default === true) ? value !== false : !!value;
    }

    for ( const attr of ["step", "min", "max"] ) {
      if ( field[attr] !== undefined ) resolved[attr] = String(field[attr]);
    }

    if ( field.choices !== undefined ) {
      resolved.choices = this._resolveChoices(field.choices, selects);
      resolved.localizeChoices = field.localizeChoices ?? false;
    }

    if ( field.type === "macroDrop" ) {
      const macro = value ? await fromUuid(value) : null;
      resolved.macroName = macro?.name ?? "";
    }

    if ( field.type === "checkboxGrid" ) {
      resolved.items = field.items(this).map(item => ({
        ...item,
        inputName: `${key}.${item.key}`,
        id: `custom-dnd5e-${item.key}`
      }));
      resolved.labelClass = "custom-dnd5e-edit-label-full";
    }

    return resolved;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    actions: {
      clearMacro: CustomDnd5eForm.clearMacro,
      delete: CustomDnd5eForm.deleteItem,
      new: CustomDnd5eForm.createItem,
      reset: CustomDnd5eForm.reset,
      help: CustomDnd5eForm.openHelp,
      toggleExpand: CustomDnd5eForm.toggleExpand
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
   * @param {Event} event
   * @param {HTMLElement} target
   */
  static createItem(event, target) {}

  /* -------------------------------------------- */

  /**
   * Reset the form.
   *
   * @param {Event} event
   * @param {HTMLElement} target
   */
  static reset(event, target) {}

  /* -------------------------------------------- */

  /**
   * Delete an item.
   *
   * @param {Event} event
   * @param {HTMLElement} target
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
   * @param {Event} event
   * @param {HTMLElement} target
   */
  static async openHelp(event, target) {
    const uuid = target.dataset.uuid;
    openDocument(uuid);
  }

  /* -------------------------------------------- */

  /**
   * Handle dropping a Macro onto a row element.
   *
   * @param {DragEvent} event
   * @param {HTMLElement} row Row element containing the macro drop zone
   */
  async _onDropMacro(event, row) {
    event.preventDefault();
    event.stopPropagation();
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if ( data?.type !== "Macro" ) return;
    const macro = await Macro.implementation.fromDropData(data);
    if ( !macro ) return;

    const input = row.querySelector('input[name$="macroUuid"], input[name="macroUuid"]');
    if ( input ) input.value = macro.uuid;

    const macroField = row.querySelector(".custom-dnd5e-macro-field");
    const dropArea = row.querySelector(".custom-dnd5e-macro-drop .drop-area");
    const nameElement = row.querySelector(".custom-dnd5e-macro-name");
    if ( nameElement ) nameElement.textContent = macro.name;
    if ( macroField ) macroField.classList.remove("hidden");
    if ( dropArea ) dropArea.classList.add("hidden");
  }

  /* -------------------------------------------- */

  /**
   * Clear the macro selection for a row element.
   *
   * @param {Event} event
   * @param {HTMLElement} target
   */
  static clearMacro(event, target) {
    const row = target.closest(".custom-dnd5e-action-row, .custom-dnd5e-item");
    if ( !row ) return;

    const input = row.querySelector('input[name$=".macroUuid"], input[name="macroUuid"]');
    if ( input ) input.value = "";

    const macroField = row.querySelector(".custom-dnd5e-macro-field");
    const dropArea = row.querySelector(".custom-dnd5e-macro-drop .drop-area");
    if ( macroField ) macroField.classList.add("hidden");
    if ( dropArea ) dropArea.classList.remove("hidden");
  }

  /* -------------------------------------------- */

  /**
   * Toggle expand/collapse of a collapsible item.
   *
   * @param {Event} event
   * @param {HTMLElement} target
   */
  static toggleExpand(event, target) {
    const item = target.closest(".collapsible");
    if ( !item ) return;
    item.classList.toggle("collapsed");
    const icon = target.querySelector("i");
    icon?.classList.toggle("fa-compress");
    icon?.classList.toggle("fa-expand");
  }

  /* -------------------------------------------- */

  /**
   * Handle the rendering of the form.
   *
   * @param {object} context
   * @param {object} options
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
      this._attachDragListeners(item);

      const checkbox = item.querySelector("input[type='checkbox']");
      checkbox?.addEventListener("change", this._onChangeInput.bind(this));
      if ( checkbox?.checked ) this._onToggleList(checkbox);
    });

    this.#setNestDepths();
  }

  /* -------------------------------------------- */

  /**
   * Attach drag event listeners to an item.
   *
   * @param {HTMLElement} item Item element to attach listeners to
   */
  _attachDragListeners(item) {
    const dragElement = item.querySelector(".custom-dnd5e-drag");

    item.addEventListener("dragend", this._onDragEnd.bind(this));
    item.addEventListener("dragleave", this._onDragLeave.bind(this));
    item.addEventListener("dragover", this._onDragOver.bind(this));
    item.addEventListener("drop", this._onDrop.bind(this));
    dragElement?.addEventListener("dragstart", this._onDragStart.bind(this));
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
   * @param {HTMLInputElement} checkbox
   */
  _onToggleList(checkbox) {
    const checkParent = checkbox => {
      const parent = checkbox.closest(".custom-dnd5e-list")?.closest("li");

      if ( !parent ) return;

      const parentCheckbox = parent.querySelector("input[type='checkbox']");
      parentCheckbox.checked = checkbox.checked;

      checkParent(parentCheckbox);
    };

    if ( checkbox.checked ) {
      checkParent(checkbox);
    }

    if ( !checkbox.checked ) {
      const children = checkbox.closest("li")?.querySelector(".custom-dnd5e-list");

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
   * @param {Event} event
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
   * @param {Event} event
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

    // Save old parent for cleanup after move
    const oldParentItem = this.sourceItem.parentElement?.closest(".collapsible");

    if ( !this.#insertSourceItem() ) return;

    this.#updateSourceItemKeys();
    this.#cleanupEmptyCollapsible(oldParentItem);
    this.#setNestDepths();

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
   * Clean up empty collapsible containers after a drag-out.
   *
   * @param {HTMLElement|null} parentItem Parent collapsible item to check.
   */
  #cleanupEmptyCollapsible(parentItem) {
    if ( !parentItem ) return;
    const nestedList = parentItem.querySelector(".item-description .custom-dnd5e-list");
    if ( !nestedList ) return;
    const remaining = nestedList.querySelectorAll(":scope > li");
    if ( remaining.length === 0 ) {
      const collapsibleContent = parentItem.querySelector(".item-description.collapsible-content");
      collapsibleContent?.remove();
      parentItem.classList.remove("collapsible", "collapsed");
      const toggleBtn = parentItem.querySelector('[data-action="toggleExpand"]');
      toggleBtn?.remove();
    }
  }

  /* -------------------------------------------- */

  /**
   * Set the --nest-depth CSS variable on nested item rows for indent styling.
   */
  #setNestDepths() {
    this.element.querySelectorAll(".collapsible-content .collapsible-content .item-row").forEach(row => {
      let depth = 0;
      let el = row.closest(".collapsible-content");
      while ( el ) {
        depth++;
        el = el.parentElement?.closest(".collapsible-content");
      }
      row.style.setProperty("--nest-depth", depth - 1);
    });
  }

  /* -------------------------------------------- */

  /**
   * Insert the source item based on the mouse position over the target item.
   * @returns {boolean} Whether the source item was inserted successfully
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
      case "middle": {
        let list = this.targetItem.querySelector(":scope > .item-description .custom-dnd5e-list");
        if ( !list ) {
          const description = document.createElement("div");
          description.classList.add("item-description", "collapsible-content");
          const wrapper = document.createElement("div");
          wrapper.classList.add("wrapper");
          list = document.createElement("ol");
          list.classList.add("custom-dnd5e-list", "unlist");
          wrapper.appendChild(list);
          description.appendChild(wrapper);
          this.targetItem.appendChild(description);

          this.targetItem.classList.add("collapsible");
          this.targetItem.classList.remove("collapsed");

          const controls = this.targetItem.querySelector(".item-controls");
          if ( controls && !controls.querySelector('[data-action="toggleExpand"]') ) {
            const toggleBtn = document.createElement("button");
            toggleBtn.type = "button";
            toggleBtn.setAttribute("data-action", "toggleExpand");
            toggleBtn.classList.add("unbutton", "control-button", "item-control", "always-interactive");
            toggleBtn.innerHTML = '<i class="fa-solid fa-compress" inert></i>';
            controls.prepend(toggleBtn);
          }
        }
        list.appendChild(this.sourceItem);
        break;
      }
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
    const items = this.sourceItem?.closest(":is(ul, ol)")?.querySelectorAll("li");

    items.forEach(item => {
      const key = item.dataset?.key;
      const keyParts = key?.split(".") ?? [];
      const lastKey = keyParts.pop();
      if ( !lastKey ) return;

      const parentKey = item.closest(":is(ul, ol)")?.closest("li")?.dataset?.key;

      let newKey;
      if ( parentKey ) {
        // Item is nested under a parent - use parent key + nestType + item key
        newKey = `${parentKey}.${this.nestType}.${lastKey}`;
      } else if ( keyParts.length > 0 ) {
        // Item is at root level but has a prefix (e.g., "orders.build") - preserve it
        newKey = key;
      } else {
        // Item has no prefix and no parent
        newKey = lastKey;
      }

      if ( item.dataset.key === newKey ) return;

      item.dataset.key = newKey;

      const inputs = item.querySelectorAll("input, dnd5e-checkbox");

      inputs.forEach(input => {
        if ( input.id === "custom-dnd5e-parentKey" ) {
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
   * @param {Event} event
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
   * @param {object} formData
   * @returns {object} Changed keys.
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
   * @param {object} formData
   * @returns {boolean} Whether the form data passed validation
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
   * @param {object} args
   * @returns {object} Processed form data
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

      // If setting passed, initialise property with setting data (excluding nested objects)
      if ( settingData ) {
        const existingData = foundry.utils.getProperty(settingData, propertyPath);
        if ( !foundry.utils.getProperty(processedFormData, propertyPath) && typeof existingData === "object" ) {
          const shallowData = Object.fromEntries(
            Object.entries(existingData).filter(([_, v]) => typeof v !== "object" || v === null || Array.isArray(v))
          );
          foundry.utils.setProperty(processedFormData, propertyPath, shallowData);
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
   * @param {object} args
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
   * @param {object} processedFormData
   * @param {string} settingKey
   * @param {boolean} enableConfig Whether the config is enabled
   * @param {Function} setConfig
   * @param {boolean} [requiresReload=false] Whether a reload of Foundry is required
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
        foundry.applications.settings.SettingsConfig.reloadConfirm();
      }
    } catch (err) {
      Logger.error(`Failed to save configuration: ${err.message}`, true);
    }

    this.close();
  }
}
