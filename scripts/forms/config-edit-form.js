import { CONSTANTS, MODULE } from "../constants.js";
import { Logger, parseBoolean, setSetting } from "../utils.js";
import { CustomDnd5eForm } from "./custom-dnd5e-form.js";

/* -------------------------------------------- */
/*  TYPE DEFINITIONS                            */
/* -------------------------------------------- */

/**
 * @typedef {object} EditFieldDescriptor
 * @property {string} name Property path relative to the entry (e.g. "label", "reduction.rolls").
 *   The input name is always `${key}.${name}`.
 * @property {"text"|"number"|"checkbox"|"select"|"multiSelect"|"filePicker"|
 *   "colorPicker"|"textarea"|"checkboxGrid"|"macroDrop"} type
 * @property {string} label Label i18n key or literal string.
 * @property {boolean} [localizeValue] Text only. Whether to localize the value.
 * @property {string} [hint] Hint i18n key.
 * @property {string} [tooltip] Tooltip i18n key applied to the label.
 * @property {string} [placeholder] Placeholder for text and number inputs.
 * @property {string|number} [step] Number only. The step attribute ("any" allowed).
 * @property {number} [min] Number only. The min attribute.
 * @property {number} [max] Number only. The max attribute.
 * @property {boolean} [default] Checkbox only. `true` checks the box unless the value is
 *   explicitly `false`; otherwise the box is checked when the value is truthy.
 * @property {boolean} [disabledWhenSystem] Disable the input for system entries.
 * @property {string|object|Function} [choices] Select/multiSelect only. A key into
 *   `_getSelects()`, a plain choices object, or a function of the form returning one.
 * @property {boolean} [localizeChoices] Select only. Whether to localize the choice labels.
 * @property {Function} [condition] Omit the field when `({ key, entry, form }) => boolean` returns false.
 * @property {Function} [items] Checkbox Grid only. A function of the form returning
 *   `[{ key, label, checked }]`. Inputs are named `${key}.${item.key}`.
 * @property {string} [labelClass] CSS class override for the label.
 * @property {string} [template] Path to a preloaded partial rendered in place of the built-in control.
 */

/**
 * @typedef {object} EditFieldGroup
 * @property {string} legend Legend i18n key for the fieldset.
 * @property {EditFieldDescriptor[]} fields Field descriptors within the fieldset.
 * @property {string} [labelClass] CSS class default for labels within the group.
 */

/**
 * Class representing the Config Edit Form.
 *
 * @extends CustomDnd5eForm
 */
export class ConfigEditForm extends CustomDnd5eForm {
  /* -------------------------------------------- */
  /*  STATIC PROPERTIES                           */
  /* -------------------------------------------- */

  /**
   * Field descriptors rendered by the config-edit template. Either a flat array of
   * field descriptors or an array of groups. When null, the subclass supplies its own
   * template via PARTS.
   * @type {EditFieldDescriptor[]|EditFieldGroup[]|null}
   */
  static FIELDS = null;

  /**
   * Default CSS class applied to field labels.
   * @type {string|null}
   */
  static LABEL_CLASS = null;

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    actions: {
      clearMacro: ConfigEditForm.clearMacro,
      reset: ConfigEditForm.reset
    },
    form: {
      handler: ConfigEditForm.submit,
      closeOnSubmit: false
    },
    id: `${MODULE.ID}-config-edit`,
    position: {
      width: 450,
      height: "auto"
    },
    window: {
      title: "CUSTOM_DND5E.form.config.edit.title"
    }
  };

  /* -------------------------------------------- */

  /**
   * The default template requires FIELDS to be supplied by the subclass.
   * Otherwise, subclass should override with its own template.
   * @type {object}
   */
  static PARTS = {
    form: {
      template: CONSTANTS.CONFIG.TEMPLATE.EDIT
    }
  };

  /* -------------------------------------------- */
  /*  INITIALIZATION                              */
  /* -------------------------------------------- */

  /**
   * Constructor for ConfigEditForm.
   *
   * @param {object} args
   */
  constructor(args) {
    super(args);
    this.editForm = args.editForm ?? ConfigEditForm;
    this.configForm = args.form;
    this.key = args.data.key;
    this.system = args.data.system;
    this.setting = args.setting;
    this.settingProperty = null; // Set in subclass for nested settings (e.g., "orders")
  }

  /* -------------------------------------------- */

  /**
   * Open the form.
   * @param {object} args
   */
  static async open(args) {
    const editForm = args.editForm ?? this;
    const form = new editForm(args);
    form.render(true);
  }

  /* -------------------------------------------- */
  /*  DATA                                        */
  /* -------------------------------------------- */

  /**
   * Get the data object containing the items (handles nested settings).
   * @returns {object} Data object
   */
  _getItemsData() {
    if ( this.settingProperty ) {
      if ( !this.setting[this.settingProperty] ) {
        this.setting[this.settingProperty] = {};
      }
      return this.setting[this.settingProperty];
    }
    return this.setting;
  }

  /* -------------------------------------------- */

  /**
   * Get the select options for the form.
   *
   * @returns {object|null} Select options
   */
  _getSelects() {
    return null;
  }

  /* -------------------------------------------- */
  /*  RENDER CONTEXT                              */
  /* -------------------------------------------- */

  /**
   * Prepare the context for rendering the form.
   *
   * @returns {Promise<object>} Context data
   */
  async _prepareContext() {
    const itemsData = this._getItemsData();
    const entry = itemsData[this.key] ?? {};
    const context = {
      ...entry,
      key: this.key,
      selects: this._getSelects()
    };

    if ( this.system === false ) {
      context.system = false;
    }

    if ( this.constructor.FIELDS ) {
      context.groups = await this._resolveFields(this.constructor.FIELDS, entry, context);
    }

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Resolve the FIELDS descriptors into groups of field contexts.
   * @param {EditFieldDescriptor[]|EditFieldGroup[]} fields Field or group descriptors
   * @param {object} entry
   * @param {object} context
   * @returns {Promise<object[]>} Groups of resolved field contexts
   */
  async _resolveFields(fields, entry, context) {
    const groups = fields[0]?.fields ? fields : [{ fields }];
    const isSystem = context.system !== false;
    const resolvedGroups = [];

    for ( const [index, group] of groups.entries() ) {
      const descriptors = (index === 0) ? [{ type: "key" }, ...group.fields] : group.fields;
      const resolvedFields = [];
      for ( const field of descriptors ) {
        if ( field.condition && !field.condition({ key: this.key, entry, form: this }) ) continue;
        resolvedFields.push(await this._resolveField(field, entry, group, isSystem, context.selects));
      }
      resolvedGroups.push({ legend: group.legend, fields: resolvedFields });
    }

    return resolvedGroups;
  }

  /* -------------------------------------------- */

  /**
   * Resolve a single field descriptor into a field context.
   * @param {EditFieldDescriptor} field
   * @param {object} entry
   * @param {EditFieldGroup} group
   * @param {boolean} isSystem Whether the entry is a system entry
   * @param {object|null} selects Select options from _getSelects
   * @returns {Promise<object>} Resolved field context
   */
  async _resolveField(field, entry, group, isSystem, selects) {
    const labelClass = field.labelClass ?? group.labelClass ?? this.constructor.LABEL_CLASS
      ?? "custom-dnd5e-edit-label";

    if ( field.type === "key" ) {
      return {
        type: "key",
        label: "CUSTOM_DND5E.key",
        labelClass,
        inputName: `${this.key}.key`,
        disabledInputName: `${this.key}.disabledKey`,
        value: game.i18n.localize(this.key),
        isSystem
      };
    }

    const resolved = {
      type: field.type,
      label: field.label,
      hint: field.hint,
      tooltip: field.tooltip ? game.i18n.localize(field.tooltip) : undefined,
      placeholder: field.placeholder,
      labelClass,
      customTemplate: field.template,
      inputName: `${this.key}.${field.name}`,
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
        inputName: `${this.key}.${item.key}`,
        id: `custom-dnd5e-${item.key}`
      }));
      resolved.labelClass = "custom-dnd5e-edit-label-full";
    }

    return resolved;
  }

  /* -------------------------------------------- */

  /**
   * Resolve a choices descriptor into a choices object for selectOptions.
   * @param {string|object|Function} choices
   * @param {object|null} selects Select options from _getSelects
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
  /*  MACRO DROP                                  */
  /* -------------------------------------------- */

  /**
   * Handle form rendering.
   * @param {object} context
   * @param {object} options Rendering options
   */
  _onRender(context, options) {
    super._onRender(context, options);
    const macroDrops = this.element.querySelectorAll(".custom-dnd5e-macro-drop");
    for ( const macroDrop of macroDrops ) {
      macroDrop.addEventListener("drop", event => this._onDropMacro(event));
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle dropping a Macro onto a macro drop zone.
   * @param {DragEvent} event
   */
  async _onDropMacro(event) {
    event.preventDefault();
    event.stopPropagation();
    const container = event.currentTarget;
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if ( data?.type !== "Macro" ) return;
    const macro = await Macro.implementation.fromDropData(data);
    if ( !macro ) return;

    const input = container.querySelector('input[type="hidden"]');
    if ( input ) input.value = macro.uuid;

    const macroField = container.querySelector(".custom-dnd5e-macro-field");
    const dropArea = container.querySelector(".drop-area");
    const nameEl = container.querySelector(".custom-dnd5e-macro-name");
    if ( nameEl ) nameEl.textContent = macro.name;
    if ( macroField ) macroField.classList.remove("hidden");
    if ( dropArea ) dropArea.classList.add("hidden");
  }

  /* -------------------------------------------- */

  /**
   * Clear the macro selection in a macro drop zone.
   * @param {Event} event
   * @param {HTMLElement} target
   */
  static clearMacro(event, target) {
    const container = target.closest(".custom-dnd5e-macro-drop");
    const input = container.querySelector('input[type="hidden"]');
    if ( input ) input.value = "";

    const macroField = container.querySelector(".custom-dnd5e-macro-field");
    const dropArea = container.querySelector(".drop-area");
    if ( macroField ) macroField.classList.add("hidden");
    if ( dropArea ) dropArea.classList.remove("hidden");
  }

  /* -------------------------------------------- */
  /*  RESET                                       */
  /* -------------------------------------------- */

  /**
   * Reset the form to its default settings.
   *
   * @returns {Promise<void>}
   */
  static async reset() {
    const reset = async () => {
      const itemsData = this._getItemsData();
      itemsData[this.key] = this.getSettingDefault(this.key);
      await setSetting(this.settingKey, this.setting);
      this.setConfig(this.setting);
      this.render(true);
    };

    await foundry.applications.api.DialogV2.confirm({
      window: {
        title: game.i18n.localize("CUSTOM_DND5E.dialog.reset.title")
      },
      content: `<p>${game.i18n.localize("CUSTOM_DND5E.dialog.reset.content")}</p>`,
      modal: true,
      yes: {
        label: game.i18n.localize("CUSTOM_DND5E.yes"),
        callback: async () => {
          reset();
        }
      },
      no: {
        label: game.i18n.localize("CUSTOM_DND5E.no")
      }
    });
  }

  /* -------------------------------------------- */
  /*  FORM SUBMISSION                             */
  /* -------------------------------------------- */

  /**
   * Submit the form data.
   *
   * @param {Event} event
   * @param {HTMLFormElement} form
   * @param {object} formData
   */
  static async submit(event, form, formData) {
    if ( !this.validateFormData(formData) ) return;

    const oldKey = this.key;
    const newKey = formData.object[`${this.key}.key`];

    let settingData = foundry.utils.deepClone(this.setting);
    const processedFormData = this.processFormData(formData);

    // Get the target object (nested property or root)
    let targetData = this.settingProperty ? settingData[this.settingProperty] : settingData;
    if ( this.settingProperty && !targetData ) {
      settingData[this.settingProperty] = {};
      targetData = settingData[this.settingProperty];
    }

    if ( !targetData[oldKey] || oldKey === newKey ) {
      // Add new item or update existing one
      targetData[newKey] = processedFormData[oldKey];
    } else {
      // Rebuild object to preserve order while replacing old key with new key
      const updatedData = Object.fromEntries(
        Object.entries(targetData).map(([key, value]) => [
          (key === oldKey) ? newKey : key,
          (key === oldKey) ? processedFormData[key] : foundry.utils.deepClone(value)
        ])
      );
      if ( this.settingProperty ) {
        settingData[this.settingProperty] = updatedData;
      } else {
        settingData = updatedData;
      }
    }

    await setSetting(this.settingKey, settingData);
    this.close();
    this.configForm.render(true);
  }

  /* -------------------------------------------- */

  /**
   * Process form data, converting boolean values and structuring nested properties.
   *
   * @param {object} formData
   * @returns {object} Processed form data
   */
  processFormData(formData) {
    const processedFormData = {};

    Object.entries(formData.object).forEach(([key, value]) => {
      if ( key.endsWith(".key") ) return;
      foundry.utils.setProperty(processedFormData, key, parseBoolean(value));
    });

    return processedFormData;
  }

  /* -------------------------------------------- */

  /**
   * Validate the form data.
   *
   * @param {object} formData
   * @returns {boolean} Whether the form data passed validation
   */
  validateFormData(formData) {
    const newKey = formData.object[`${this.key}.key`];
    const itemsData = this._getItemsData();

    if ( !newKey.match(/^[0-9a-zA-Z]+$/) ) {
      Logger.error(`Key '${newKey}' must only contain alphanumeric characters`, true);
      return false;
    }

    if ( this.key !== newKey && itemsData[newKey] ) {
      Logger.error(`Key '${newKey}' already exists`, true);
      return false;
    }

    return true;
  }
}
