import { CONSTANTS, JOURNAL_HELP_BUTTON, MODULE } from "../constants.js";
import { setSetting, Logger } from "../utils.js";
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
    this.form = args.form;
    this.key = args.data.key;
    this.system = args.data.system;
    this.setting = args.setting;
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
    const context = {
      ...this.setting[this.key],
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
      this.setting[this.key] = this.getDefaultConfig(this.key);
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
    const oldKey = this.key;
    const newKey = formData.object[`${this.key}.key`];

    if ( !newKey.match(/^[0-9a-zA-Z]+$/) ) {
      Logger.error(`Key '${newKey}' must only contain alphanumeric characters`, true);
      return;
    }

    if ( oldKey !== newKey ) {
      if ( this.setting[newKey] ) {
        Logger.error(`Key '${newKey}' already exists`, true);
        return;
      }
    }

    // Set properties in this.setting
    Object.entries(formData.object).forEach(([key, value]) => {
      if ( key.split(".").pop() === "key" ) return;
      if ( value === "false" ) {
        value = false;
      } else if ( value === "true" ) {
        value = true;
      }
      foundry.utils.setProperty(this.setting, key, value);
    });

    // Create new key and delete old key while keeping order of counters
    if ( oldKey !== newKey ) {
      this.setting[newKey] = foundry.utils.deepClone(this.setting[oldKey]);

      const data = Object.fromEntries(
        Object.keys(this.setting).map(key => [
          (key === oldKey) ? newKey : key,
          foundry.utils.deepClone(this.setting[key])
        ])
      );

      this.setting = data;

      this.key = newKey;
    }

    await setSetting(this.settingKey, this.setting);

    this.close();

    this.form.render(true);
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

/* -------------------------------------------- */

/**
 * Class representing the Abilities Form.
 *
 * @extends ConfigEditForm
 */
/**
 * Class representing a form to edit abilities configuration.
 * Extends the ConfigEditForm class.
 *
 * @class
 * @extends ConfigEditForm
 */
export class AbilitiesEditForm extends ConfigEditForm {
  /**
   * Constructor for AbilitiesEditForm.
   *
   * @param {object} args The arguments to initialize the form.
   */
  constructor(args) {
    super(args);
    this.requiresReload = true;
    this.settingKey = CONSTANTS.ABILITIES.SETTING.KEY;
    this.setConfig = setAbilities;
    this.getDefaultConfig = getDefaultAbilities;
    this.configKey = "abilities";
    this.headerButton = JOURNAL_HELP_BUTTON;
    this.headerButton.uuid = CONSTANTS.ABILITIES.UUID;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-abilities-edit-form`,
    window: {
      title: "CUSTOM_DND5E.form.abilities.edit.title"
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
      template: CONSTANTS.ABILITIES.TEMPLATE.EDIT
    }
  };

  /* -------------------------------------------- */

  /**
   * Get the select options for the form.
   *
   * @returns {object} The select options.
   */
  _getSelects() {
    return {
      rollMode: {
        choices: {
          default: "CUSTOM_DND5E.default",
          blindroll: "CHAT.RollBlind",
          gmroll: "CHAT.RollPrivate",
          publicroll: "CHAT.RollPublic",
          selfroll: "CHAT.RollSelf"
        }
      },
      type: {
        choices: {
          mental: "CUSTOM_DND5E.mental",
          physical: "CUSTOM_DND5E.physical"
        }
      }
    };
  }

  /* -------------------------------------------- */

  /**
   * Get the HTML template for the form.
   *
   * @param {object} data The data to be passed to the template.
   * @returns {Promise<string>} The rendered template.
   */
  async _getHtml(data) {
    const selects = this._getSelects();
    if ( selects ) data.selects = selects;

    const template = await renderTemplate(CONSTANTS.ABILITIES.TEMPLATE.EDIT, data);
    return template;
  }
}
