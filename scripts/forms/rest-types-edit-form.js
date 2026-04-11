import { CONSTANTS, JOURNAL_HELP_BUTTON, MODULE } from "../constants.js";
import { ConfigEditForm } from "./config-edit-form.js";
import { getSettingDefault, resetConfigSetting, setConfig } from "../configurations/rest-types.js";

const constants = CONSTANTS.REST_TYPES;
const configKey = "restTypes";

/**
 * Class representing a form to edit rest types.
 * Extends the ConfigEditForm class.
 *
 * @class
 * @extends ConfigEditForm
 */
export class RestTypesEditForm extends ConfigEditForm {
  /**
   * Constructor for RestTypesEditForm.
   *
   * @param {object} args
   */
  constructor(args) {
    super(args);
    this.configKey = configKey;
    this.settingKey = constants.SETTING.CONFIG.KEY;
    this.getSettingDefault = getSettingDefault;
    this.resetConfigSetting = resetConfigSetting;
    this.setConfig = setConfig;
    this.headerButton = JOURNAL_HELP_BUTTON;
    this.headerButton.uuid = constants.UUID;
    this.requiresReload = true;
  }

  /* -------------------------------------------- */

  /**
   * Get the select options for the form.
   *
   * @returns {object} Select options
   */
  _getSelects() {
    const activationPeriods = Object.fromEntries(
      Object.entries(CONFIG.DND5E.activityActivationTypes)
        .map(([key, value]) => [key, value.label])
    );

    const recoverPeriods = Object.fromEntries(
      Object.entries(CONFIG.DND5E.limitedUsePeriods)
        .filter(([, value]) => !value.deprecated)
        .map(([key, value]) => [key, value.label])
    );

    const recoverSpellSlotTypes = Object.fromEntries(
      Object.entries(CONFIG.DND5E.spellcasting)
        .filter(([, value]) => value.type)
        .map(([key, value]) => [key, value.label])
    );

    return { activationPeriods, recoverPeriods, recoverSpellSlotTypes };
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-rest-types-edit-form`,
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
}
