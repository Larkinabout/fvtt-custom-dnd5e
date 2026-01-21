import { CONSTANTS, JOURNAL_HELP_BUTTON, MODULE } from "../constants.js";
import { Logger, parseBoolean, setSetting } from "../utils.js";
import { CustomDnd5eForm } from "./custom-dnd5e-form.js";

/**
 * Class representing the Config Edit Form.
 *
 * @extends CustomDnd5eForm
 */
export class ConfigEditForm extends CustomDnd5eForm {
  /**
   * Constructor for ConfigEditForm.
   *
   * @param {object} args Arguments passed to the parent class.
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
   * Get the data object containing the items (handles nested settings).
   * @returns {object} The data object.
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
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    actions: {
      reset: ConfigEditForm.reset
    },
    form: {
      handler: ConfigEditForm.submit,
      closeOnSubmit: false
    },
    id: `${MODULE.ID}-config-edit`,
    position: {
      width: 450
    },
    window: {
      title: "CUSTOM_DND5E.form.config.edit.title"
    }
  };

  /* -------------------------------------------- */

  /**
   * Get the select options for the form.
   *
   * @returns {object|null} The select options.
   */
  _getSelects() {
    return null;
  }

  /* -------------------------------------------- */

  /**
   * Prepare the context for rendering the form.
   *
   * @returns {Promise<object>} The context data.
   */
  async _prepareContext() {
    const itemsData = this._getItemsData();
    const context = {
      ...itemsData[this.key],
      key: this.key,
      selects: this._getSelects()
    };

    if ( this.system === false ) {
      context.system = false;
    }

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Handle form rendering.
   * @param {object} context The context data.
   * @param {object} options The options for rendering.
   */
  _onRender(context, options) {
    super._onRender(context, options);
  }

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

  /**
   * Submit the form data.
   *
   * @param {Event} event The form submission event.
   * @param {HTMLFormElement} form The form element.
   * @param {object} formData The form data.
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
   * @param {object} formData The form data.
   * @returns {object} The processed form data.
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
   * @param {object} formData The form data.
   * @returns {boolean} Whether the form data passed validation.
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

  /* -------------------------------------------- */

  /**
   * Open the form.
   * @param {object} args The arguments for opening the form.
   */
  static async open(args) {
    const editForm = args.editForm ?? this;
    const form = new editForm(args);
    form.render(true);
  }
}
