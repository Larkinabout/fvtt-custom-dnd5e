import { CONSTANTS, JOURNAL_HELP_BUTTON, MODULE } from "../constants.js";
import { ConfigEditForm } from "./config-edit-form.js";
import { getDefaultConfig, setConfig } from "../conditions.js";

const constants = CONSTANTS.CONDITIONS;
const configKey = "conditions";

/**
 * Class representing a form to edit conditions.
 * Extends the ConfigEditForm class.
 *
 * @class
 * @extends ConfigEditForm
 */
export class ConditionsEditForm extends ConfigEditForm {
  /**
   * Constructor for ConditionsEditForm.
   *
   * @param {object} args Arguments passed to the parent class.
   */
  constructor(args) {
    super(args);
    this.configKey = configKey;
    this.settingKey = constants.SETTING.CONFIG.KE;
    this.getDefaultConfig = getDefaultConfig;
    this.setConfig = setConfig;
    this.headerButton = JOURNAL_HELP_BUTTON;
    this.headerButton.uuid = constants.UUID;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-conditions-edit`,
    position: {
      height: 600
    },
    window: {
      title: `CUSTOM_DND5E.form.${configKey}.edit.title`
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
      template: constants.TEMPLATE.EDIT
    }
  };

  /* -------------------------------------------- */

  /**
   * Get the select options for the form.
   *
   * @returns {object} The select options.
   */
  _getSelects() {
    const statusEffects = Object.fromEntries(
      CONFIG.statusEffects.map(statusEffect => [statusEffect.id, statusEffect.name])
    );
    return { riders: statusEffects, statuses: statusEffects };
  }

  /* -------------------------------------------- */

  /**
   * Validate the form data.
   *
   * @param {object} formData The form data.
   * @returns {boolean} Whether the form data passed validation.
   */
  validateFormData(formData) {
    if ( !newKey.match(/^[0-9a-zA-Z]+$/) ) {
      Logger.error(`Key '${newKey}' must only contain alphanumeric characters`, true);
      return false;
    }

    return super.validateFormData(formData);
  }
}
