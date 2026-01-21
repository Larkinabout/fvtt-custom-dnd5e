import { CONSTANTS, JOURNAL_HELP_BUTTON, MODULE } from "../constants.js";
import { ConfigEditForm } from "./config-edit-form.js";
import { getSettingDefault, setConfig } from "../configurations/bastions.js";

const constants = CONSTANTS.BASTIONS;

/**
 * Class representing a form to edit bastion orders.
 * Extends the ConfigEditForm class.
 *
 * @class
 * @extends ConfigEditForm
 */
export class BastionsOrdersEditForm extends ConfigEditForm {
  /**
   * Constructor for BastionsOrdersEditForm.
   *
   * @param {object} args The arguments to initialize the form.
   */
  constructor(args) {
    super(args);
    this.settingKey = constants.SETTING.CONFIG.KEY;
    this.settingProperty = "orders";
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
    id: `${MODULE.ID}-bastions-orders-edit-form`,
    window: {
      title: "CUSTOM_DND5E.form.bastions.orders.edit.title"
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
      template: constants.TEMPLATE.ORDERS_EDIT
    }
  };

  /* -------------------------------------------- */

  /**
   * Prepare the context for rendering the form.
   *
   * @returns {Promise<object>} The context data.
   */
  async _prepareContext() {
    const context = await super._prepareContext();

    if ( context.label ) {
      context.label = game.i18n.localize(context.label);
    }
    return context;
  }
}
