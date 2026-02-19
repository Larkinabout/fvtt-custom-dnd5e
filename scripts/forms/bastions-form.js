import { CONSTANTS, JOURNAL_HELP_BUTTON, MODULE } from "../constants.js";
import { getSetting, setSetting } from "../utils.js";
import { CustomDnd5eForm } from "./custom-dnd5e-form.js";
import { BastionsOrdersEditForm } from "./bastions-orders-edit-form.js";
import { BastionsSizesEditForm } from "./bastions-sizes-edit-form.js";
import { resetConfigSetting, setConfig, getSettingDefault } from "../configurations/bastions.js";

const constants = CONSTANTS.BASTIONS;
const listClass = `${MODULE.ID}-list`;
const listClassSelector = `.${listClass}`;

/**
 * Class representing the Bastions Form.
 * @extends CustomDnd5eForm
 */
export class BastionsForm extends CustomDnd5eForm {
  /**
   * Constructor for BastionsForm.
   * @param {...any} args The arguments for the form.
   */
  constructor(...args) {
    super(args);
    this.requiresReload = true;
    this.enableConfigKey = constants.SETTING.ENABLE.KEY;
    this.settingKey = constants.SETTING.CONFIG.KEY;
    this.resetConfigSetting = resetConfigSetting;
    this.setConfig = setConfig;
    this.headerButton = JOURNAL_HELP_BUTTON;
    this.headerButton.uuid = constants.UUID;
    this.nestType = "subtypes";
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    actions: {
      editOrder: BastionsForm.editOrder,
      editSize: BastionsForm.editSize,
      new: BastionsForm.createItem,
      reset: BastionsForm.reset,
      resetAll: BastionsForm.resetAll
    },
    form: {
      handler: BastionsForm.submit
    },
    id: `${MODULE.ID}-bastions-form`,
    window: {
      title: "CUSTOM_DND5E.form.bastions.title"
    },
    position: {
      width: 500
    },
    tabGroups: {
      primary: "sizes"
    }
  };

  /* -------------------------------------------- */

  /**
   * Parts of the form.
   * @type {object}
   */
  static PARTS = {
    form: {
      template: constants.TEMPLATE.FORM
    }
  };

  /* -------------------------------------------- */

  /**
   * Prepare the context for the form.
   * @returns {Promise<object>} The context object.
   */
  async _prepareContext() {
    this.setting = getSetting(this.settingKey);
    if ( !this.setting || Object.keys(this.setting).length === 0 ) {
      this.setting = getSettingDefault();
    }

    // Ensure setting has the expected structure
    this.setting = foundry.utils.mergeObject({
      advancement: { basic: {}, special: {} },
      orders: {},
      sizes: {},
      types: { basic: { subtypes: {} }, special: { subtypes: {} } }
    }, this.setting);

    const context = {
      sizes: this._prepareSizes(),
      types: this._prepareTypes(),
      orders: this._prepareOrders(),
      advancement: this._prepareAdvancement(),
      activeTab: this.tabGroups.primary ?? "sizes"
    };

    if ( this.enableConfigKey ) {
      this.enableConfig = getSetting(this.enableConfigKey);
      context.enableConfig = this.enableConfig;
    }

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare sizes data for the template.
   * @returns {object} The prepared sizes data.
   */
  _prepareSizes() {
    const sizes = {};
    const settingSizes = this.setting.sizes ?? {};
    const defaultSizes = CONFIG.CUSTOM_DND5E.facilities?.sizes ?? {};

    const allSizes = foundry.utils.mergeObject(
      foundry.utils.deepClone(settingSizes),
      defaultSizes,
      { overwrite: false }
    );

    Object.entries(allSizes).forEach(([key, value]) => {
      sizes[key] = {
        key,
        label: game.i18n.localize(value.label ?? value),
        days: value.days ?? 0,
        squares: value.squares ?? 0,
        value: value.value ?? 0,
        visible: value.visible !== false,
        system: defaultSizes[key] !== undefined
      };
    });

    return sizes;
  }

  /* -------------------------------------------- */

  /**
   * Prepare types data for the template.
   * @returns {object} The prepared types data.
   */
  _prepareTypes() {
    const types = {};
    const settingTypes = this.setting.types ?? {};
    const defaultTypes = CONFIG.CUSTOM_DND5E.facilities?.types ?? {};

    const allTypes = foundry.utils.mergeObject(
      foundry.utils.deepClone(settingTypes),
      defaultTypes,
      { overwrite: false }
    );

    Object.entries(allTypes).forEach(([key, value]) => {
      const subtypes = {};
      const valueSubtypes = value.subtypes ?? {};

      Object.entries(valueSubtypes).forEach(([subKey, subValue]) => {
        subtypes[subKey] = {
          key: subKey,
          label: game.i18n.localize(typeof subValue === "string" ? subValue : subValue.label ?? subValue),
          visible: typeof subValue === "string" ? true : subValue.visible !== false,
          system: defaultTypes[key]?.subtypes?.[subKey] !== undefined
        };
      });

      types[key] = {
        key,
        label: game.i18n.localize(value.label ?? value),
        visible: value.visible !== false,
        system: defaultTypes[key] !== undefined,
        subtypes
      };
    });

    return types;
  }

  /* -------------------------------------------- */

  /**
   * Prepare orders data for the template.
   * @returns {object} The prepared orders data.
   */
  _prepareOrders() {
    const orders = {};
    const settingOrders = this.setting.orders ?? {};
    const defaultOrders = CONFIG.CUSTOM_DND5E.facilities?.orders ?? {};

    const allOrders = foundry.utils.mergeObject(
      foundry.utils.deepClone(settingOrders),
      defaultOrders,
      { overwrite: false }
    );

    Object.entries(allOrders).forEach(([key, value]) => {
      orders[key] = {
        key,
        label: game.i18n.localize(value.label ?? value),
        icon: value.icon ?? "",
        duration: value.duration,
        basic: value.basic ?? false,
        hidden: value.hidden ?? false,
        visible: value.visible !== false,
        system: defaultOrders[key] !== undefined
      };
    });

    return orders;
  }

  /* -------------------------------------------- */

  /**
   * Prepare advancement data for the template.
   * @returns {object} The prepared advancement data.
   */
  _prepareAdvancement() {
    const advancement = {
      basic: [],
      special: []
    };

    const settingAdvancement = this.setting.advancement ?? {};
    const defaultAdvancement = CONFIG.CUSTOM_DND5E.facilities?.advancement ?? {};

    const allAdvancement = foundry.utils.mergeObject(
      foundry.utils.deepClone(settingAdvancement),
      defaultAdvancement,
      { overwrite: false }
    );

    // Convert basic advancement to array format for template
    if ( allAdvancement.basic ) {
      Object.entries(allAdvancement.basic).forEach(([level, count]) => {
        advancement.basic.push({ level: parseInt(level), count });
      });
    }

    // Convert special advancement to array format for template
    if ( allAdvancement.special ) {
      Object.entries(allAdvancement.special).forEach(([level, count]) => {
        advancement.special.push({ level: parseInt(level), count });
      });
    }

    return advancement;
  }

  /* -------------------------------------------- */

  /**
   * Create a new item in the form.
   */
  static async createItem() {
    const activeTab = this.element.querySelector(".tab.active");
    const tabType = activeTab?.dataset?.tab;

    if ( !tabType ) return;

    const list = activeTab.querySelector(listClassSelector);
    if ( !list ) return;

    const scrollable = list.closest(".scrollable");
    const key = foundry.utils.randomID();

    let template;
    let data;

    switch ( tabType ) {
      case "sizes": {
        const args = {
          form: this,
          editForm: BastionsSizesEditForm,
          data: { key, system: false },
          setting: this.setting
        };
        await BastionsSizesEditForm.open(args);
        return;
      }
      case "types":
        data = { types: { [key]: { key, label: "", visible: true, system: false } } };
        template = await foundry.applications.handlebars.renderTemplate(constants.TEMPLATE.TYPES_LIST, data);
        break;
      case "orders": {
        const args = {
          form: this,
          editForm: BastionsOrdersEditForm,
          data: { key, system: false },
          setting: this.setting
        };
        await BastionsOrdersEditForm.open(args);
        return;
      }
      default:
        return;
    }

    if ( template ) {
      list.insertAdjacentHTML("beforeend", template);

      const item = list.querySelector(`[data-key="${tabType}.${key}"]`);
      this._attachDragListeners(item);

      if ( scrollable ) {
        scrollable.scrollTop = scrollable.scrollHeight;
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Edit an order item.
   *
   * @param {Event} event The event that triggered the edit.
   * @param {HTMLElement} target The target element.
   */
  static async editOrder(event, target) {
    const item = target.closest(".custom-dnd5e-item");
    if ( !item ) return;

    const dataKey = item.dataset.key;
    if ( !dataKey ) return;

    // Extract the order key from the full path (e.g., "orders.test" -> "test")
    const key = dataKey.split(".").pop();

    const defaultOrders = CONFIG.CUSTOM_DND5E.facilities?.orders ?? {};
    const settingWithDefaults = foundry.utils.deepClone(this.setting);
    settingWithDefaults.orders = foundry.utils.mergeObject(
      settingWithDefaults.orders ?? {},
      defaultOrders,
      { overwrite: false }
    );

    const args = {
      form: this,
      editForm: BastionsOrdersEditForm,
      data: { key, system: defaultOrders[key] !== undefined },
      setting: settingWithDefaults
    };
    await BastionsOrdersEditForm.open(args);
  }

  /* -------------------------------------------- */

  /**
   * Edit a size item.
   *
   * @param {Event} event The event that triggered the edit.
   * @param {HTMLElement} target The target element.
   */
  static async editSize(event, target) {
    const item = target.closest(".custom-dnd5e-item");
    if ( !item ) return;

    const dataKey = item.dataset.key;
    if ( !dataKey ) return;

    // Extract the size key from the full path (e.g., "sizes.cramped" -> "cramped")
    const key = dataKey.split(".").pop();

    const defaultSizes = CONFIG.CUSTOM_DND5E.facilities?.sizes ?? {};
    const settingWithDefaults = foundry.utils.deepClone(this.setting);
    settingWithDefaults.sizes = foundry.utils.mergeObject(
      settingWithDefaults.sizes ?? {},
      defaultSizes,
      { overwrite: false }
    );

    const args = {
      form: this,
      editForm: BastionsSizesEditForm,
      data: { key, system: defaultSizes[key] !== undefined },
      setting: settingWithDefaults
    };
    await BastionsSizesEditForm.open(args);
  }

  /* -------------------------------------------- */

  /**
   * Reset the current section to default settings.
   */
  static async reset() {
    const activeTab = this.element.querySelector(".tab.active");
    const section = activeTab?.dataset?.tab;
    if ( !section ) return;

    const reset = async () => {
      const defaults = getSettingDefault();
      const currentSetting = foundry.utils.deepClone(this.setting);

      // Replace only the current section with defaults
      currentSetting[section] = defaults[section];

      await setSetting(this.settingKey, currentSetting);
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
   * Reset the form to default settings.
   */
  static async resetAll() {
    const reset = async () => {
      await this.resetConfigSetting();
      this.render(true);
    };

    await foundry.applications.api.DialogV2.confirm({
      window: {
        title: game.i18n.localize("CUSTOM_DND5E.dialog.resetAll.title")
      },
      content: `<p>${game.i18n.localize("CUSTOM_DND5E.dialog.resetAll.content")}</p>`,
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
   * @param {Event} event The form submission event.
   * @param {HTMLFormElement} form The form element.
   * @param {object} formData The form data.
   */
  static async submit(event, form, formData) {
    if ( !this.validateFormData(formData) ) return;

    // Handle enableConfig
    if ( this.enableConfigKey ) {
      const newEnableConfig = formData.object.enableConfig;
      if ( this.enableConfig !== newEnableConfig ) {
        this.requiresReload = true;
      }
      this.enableConfig = newEnableConfig;
      await setSetting(this.enableConfigKey, this.enableConfig);
    }
    delete formData.object.enableConfig;

    // Use the same pattern as ConfigForm
    const propertiesToIgnore = ["children", "delete", "key", "parentKey"];
    const changedKeys = this.getChangedKeys(formData);
    const processedFormData = this.processFormData({
      formData,
      changedKeys,
      propertiesToIgnore,
      setting: this.setting
    });

    this.handleSubmit(processedFormData, this.settingKey, this.enableConfig, this.setConfig, this.requiresReload);
  }
}
