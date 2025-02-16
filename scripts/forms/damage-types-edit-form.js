import { CONSTANTS, JOURNAL_HELP_BUTTON, MODULE } from "../constants.js";
import { ConfigEditForm } from "./config-edit-form.js";
import { setConfig, getDefaultConfig } from "../damage-types.js";

const constants = CONSTANTS.DAMAGE_TYPES;
const configKey = "damageTypes";

/**
 * Class representing a form to edit damage types.
 * Extends the ConfigEditForm class.
 *
 * @class
 * @extends ConfigEditForm
 */
export class DamageTypesEditForm extends ConfigEditForm {
  /**
   * Constructor for DamageTypesEditForm.
   *
   * @param {object} args The arguments to initialize the form.
   */
  constructor(args) {
    super(args);
    this.configKey = configKey;
    this.settingKey = constants.SETTING.KEY;
    this.getDefaultConfig = getDefaultConfig;
    this.setConfig = setConfig;
    this.headerButton = JOURNAL_HELP_BUTTON;
    this.headerButton.uuid = constants.UUID;
    this.requiresReload = true;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-damage-types-edit-form`,
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
}
