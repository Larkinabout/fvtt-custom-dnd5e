import { CONSTANTS, JOURNAL_HELP_BUTTON, MODULE } from "../constants.js";
import { ConfigEditForm } from "./config-edit-form.js";
import { setConfig, getSettingDefault } from "../configurations/tools.js";

const constants = CONSTANTS.TOOLS;
const configKey = "tools";

/**
 * Class representing a form to edit tools.
 * Extends the ConfigEditForm class.
 *
 * @class
 * @extends ConfigEditForm
 */
export class ToolsEditForm extends ConfigEditForm {
  /**
   * Constructor for ToolsEditForm.
   *
   * @param {object} args The arguments to initialize the form.
   */
  constructor(args) {
    super(args);
    this.configKey = configKey;
    this.settingKey = constants.SETTING.CONFIG.KEY;
    this.getSettingDefault = getSettingDefault;
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
    id: `${MODULE.ID}-tools-edit-form`,
    position: {
      height: 250
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
}
