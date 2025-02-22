import { CONSTANTS, JOURNAL_HELP_BUTTON, MODULE } from "../constants.js";
import { ConfigEditForm } from "./config-edit-form.js";
import { setConfig, getDefaultConfig } from "../abilities.js";

const constants = CONSTANTS.ABILITIES;
const configKey = "abilities";

/**
 * Class representing a form to edit abilities.
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
    id: `${MODULE.ID}-abilities-edit-form`,
    position: {
      height: 480
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
}
