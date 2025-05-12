import { CONSTANTS, JOURNAL_HELP_BUTTON, MODULE } from "../constants.js";
import { ConfigEditForm } from "./config-edit-form.js";
import { setConfig, getSettingDefault } from "../item-properties.js";

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
      selects: this._getSelects(),
      itemTypes: this._getItemTypes()
    };

    if ( this.system === false ) {
      context.system = false;
    }

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Get the item types.
   * @returns {Array} The item types
   */
  _getItemTypes() {
    return Object.keys(CONFIG.DND5E.validProperties).map(key => {
      let label = game.i18n.localize(`CUSTOM_DND5E.${key}`);
      if ( label === `CUSTOM_DND5E.${key}` ) {
        label = key.charAt(0).toUpperCase() + key.slice(1);
      }
      return {
        key,
        label,
        checked: !!this.setting[this.key][key]
      };
    }
    );
  }
}
