import { CONSTANTS, JOURNAL_HELP_BUTTON, MODULE } from "../constants.js";
import { ConfigEditForm } from "./config-edit-form.js";
import { setConfig, getDefaultConfig } from "../item-properties.js";

const constants = CONSTANTS.ITEM_PROPERTIES;
const configKey = "itemProperties";

/**
 * Class representing a form to edit item properties.
 * Extends the ConfigEditForm class.
 *
 * @class
 * @extends ConfigEditForm
 */
export class ItemPropertiesEditForm extends ConfigEditForm {
  /**
   * Constructor for ItemPropertiesEditForm.
   *
   * @param {object} args The arguments to initialize the form.
   */
  constructor(args) {
    super(args);
    this.configKey = configKey;
    this.settingKey = constants.SETTING.CONFIG.KEY;
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
    id: `${MODULE.ID}-item-properties-edit-form`,
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
