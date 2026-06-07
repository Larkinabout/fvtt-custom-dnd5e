import { CONSTANTS, MODULE } from "../constants.js";
import { getDefaultSetting, getSetting, setSetting } from "../utils.js";
import { CustomDnd5eForm } from "./custom-dnd5e-form.js";
import { ConfigEditForm } from "./config-edit-form.js";

const listClass = `${MODULE.ID}-list`;
const listClassSelector = `.${listClass}`;

/* -------------------------------------------- */

/**
 * Class representing the Config Form.
 *
 * @extends CustomDnd5eForm
 */
export class ConfigForm extends CustomDnd5eForm {
  /**
   * Constructor for ConfigForm.
   *
   * @param {object} [options={}]
   */
  constructor(options = {}) {
    super(options);
    this.editForm = ConfigEditForm;
    this.enableConfig = false;
    this.label = "CUSTOM_DND5E.label";
    this.listTitle = "CUSTOM_DND5E.label";
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    actions: {
      edit: ConfigForm.edit,
      new: ConfigForm.createItem,
      reset: ConfigForm.reset,
      validate: ConfigForm.validate
    },
    form: {
      closeOnSubmit: false,
      handler: ConfigForm.submit
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
      template: CONSTANTS.CONFIG.TEMPLATE.FORM
    }
  };

  /* -------------------------------------------- */

  /**
   * Prepare the context for rendering the form.
   *
   * @returns {Promise<object>} Context data
   */
  async _prepareContext() {
    const liveConfig = foundry.utils.deepClone(CONFIG.DND5E[this.configKey]);
    this.setting = getSetting(this.settingKey);
    if ( !this.setting ) {
      this.setting = getDefaultSetting(this.settingKey);
    }
    const data = (this.includeConfig && liveConfig)
      ? foundry.utils.mergeObject(liveConfig, this.setting)
      : this.setting;

    const labelise = data => {
      Object.entries(data).forEach(([key, value]) => {
        if ( typeof value === "string" ) {
          data[key] = { label: value };
        }

        if ( value?.children || value?.subtypes ) {
          labelise(value?.children || value?.subtypes);
        }
      });
    };

    labelise(data);

    const context = { label: this.label, listTitle: this.listTitle, items: data };
    const selects = this._getSelects();
    if ( selects ) context.selects = selects;
    if ( this.disableCreate ) context.disableCreate = this.disableCreate;
    if ( this.editInList ) context.editInList = this.editInList;

    if ( this.enableConfigKey ) {
      this.enableConfig = getSetting(this.enableConfigKey);
      context.enableConfig = this.enableConfig;
    }

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Get the select options for the form.
   *
   * @returns {object|null} Select options
   */
  _getSelects() {
    return null;
  }

  /* -------------------------------------------- */

  /**
   * Edit an item.
   *
   * @param {Event} event
   * @param {HTMLElement} target
   */
  static async edit(event, target) {
    const item = target.closest(".custom-dnd5e-item");
    if ( !item ) return;

    const key = item.dataset.key;
    if ( !key ) return;

    const args = {
      form: this,
      editForm: this.editForm,
      data: { key, enableConfig: this.enableConfig },
      setting: this.setting
    };
    await ConfigEditForm.open(args);
  }


  /* -------------------------------------------- */

  /**
   * Reset the form to its default settings.
   *
   * @returns {Promise<void>}
   */
  static async reset() {
    const reset = async () => {
      await this.resetConfigSetting();
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
   * Create a new item in the form.
   */
  static async createItem() {
    if ( this.editInList ) {
      const list = this.element.querySelector(listClassSelector);
      const scrollable = list.closest(".scrollable");

      const key = foundry.utils.randomID();

      const template = await this._getHtml({
        label: this.label,
        items: { [key]: { fullKey: key, system: false, visible: true } }
      });

      list.insertAdjacentHTML("beforeend", template);

      const item = list.querySelector(`[data-key="${key}"]`);
      this._attachDragListeners(item);

      if ( scrollable ) {
        scrollable.scrollTop = scrollable.scrollHeight;
      }
    } else {
      const args = {
        form: this,
        editForm: this.editForm,
        data: { key: foundry.utils.randomID(), system: false },
        setting: this.setting
      };

      await ConfigEditForm.open(args);
    }
  }

  /* -------------------------------------------- */

  /**
   * Get the HTML template for the form.
   *
   * @param {object} data Data to be passed to the template
   * @returns {Promise<string>} Rendered template
   */
  async _getHtml(data) {
    return await foundry.applications.handlebars.renderTemplate(CONSTANTS.CONFIG.TEMPLATE.EDIT_IN_LIST, data);
  }

  /* -------------------------------------------- */

  /**
   * Submit the form data.
   *
   * @param {Event} event
   * @param {HTMLFormElement} form
   * @param {object} formData
   */
  static async submit(event, form, formData) {
    if ( !this.validateFormData(formData) ) return;

    if ( !this.requiresReload && this.enableConfigKey ) {
      this.requiresReload = (this.enableConfig !== formData.object.enableConfig)
    }

    this.enableConfig = formData.object.enableConfig;
    await setSetting(this.enableConfigKey, this.enableConfig);
    delete formData.object.enableConfig;

    const propertiesToIgnore = ["children", "delete", "key", "parentKey"];
    const changedKeys = this.getChangedKeys(formData);
    const processedFormData = this.processFormData({
      formData,
      changedKeys,
      propertiesToIgnore,
      setting: (this.editInList) ? null : this.setting
    });


    this.updateActorKeys({ changedKeys, actorProperties: this.actorProperties });
    this.handleSubmit(
      processedFormData, this.settingKey, this.enableConfig, this.setConfig?.bind(this), this.requiresReload
    );
  }
}

/* -------------------------------------------- */

/**
 * Class representing the Id Form
 *
 * @extends ConfigForm
 */
export class IdForm extends ConfigForm {
  /**
   * Constructor for IdForm.
   */
  constructor() {
    super();
    this.label = "CUSTOM_DND5E.uuid";
  }
}

