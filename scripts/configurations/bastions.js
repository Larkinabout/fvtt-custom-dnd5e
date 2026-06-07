import { MODULE } from "../constants.js";
import {
  c5eLoadTemplates,
  checkEmpty,
  getSetting,
  registerMenu,
  registerSetting,
  resetDnd5eConfig,
  setSetting } from "../utils.js";
import { CustomDnd5eForm } from "../forms/custom-dnd5e-form.js";
import { ConfigEditForm } from "../forms/config-edit-form.js";
import { configs } from "./registry.js";

const listClass = `${MODULE.ID}-list`;
const listClassSelector = `.${listClass}`;

/* -------------------------------------------- */
/*  CONSTANTS                                   */
/* -------------------------------------------- */

export const constants = {
  ID: "bastions",
  MENU: {
    KEY: "bastions-menu",
    HINT: "CUSTOM_DND5E.menu.bastions.hint",
    ICON: "fas fa-chess-rook",
    LABEL: "CUSTOM_DND5E.menu.bastions.label",
    NAME: "CUSTOM_DND5E.menu.bastions.name"
  },
  SETTING: {
    ENABLE: {
      KEY: "enable-bastions"
    },
    CONFIG: {
      KEY: "bastions"
    }
  },
  TEMPLATE: {
    FORM: "modules/custom-dnd5e/templates/bastions/bastions-form.hbs",
    SIZES_LIST: "modules/custom-dnd5e/templates/bastions/bastions-sizes-list.hbs",
    SIZES_EDIT: "modules/custom-dnd5e/templates/bastions/bastions-sizes-edit.hbs",
    TYPES_LIST: "modules/custom-dnd5e/templates/bastions/bastions-types-list.hbs",
    ORDERS_LIST: "modules/custom-dnd5e/templates/bastions/bastions-orders-list.hbs",
    ORDERS_EDIT: "modules/custom-dnd5e/templates/bastions/bastions-orders-edit.hbs"
  },
  UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.B48iqFBddUikMMer.JournalEntryPage.qR7xKmNpL2vYbW4c"
};
export const configKey = "facilities";

/* -------------------------------------------- */
/*  EDIT FORMS                                  */
/* -------------------------------------------- */

/**
 * Per-order edit form for bastions.
 * @extends ConfigEditForm
 */
class BastionsOrdersEditForm extends ConfigEditForm {
  /**
   * Constructor for BastionsOrdersEditForm.
   * @param {object} args
   */
  constructor(args) {
    super(args);
    this.settingProperty = "orders";
    this.config = configs.bastions;
    this.requiresReload = true;
  }

  /* -------------------------------------------- */

  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-bastions-orders-edit-form`,
    window: {
      title: `CUSTOM_DND5E.form.${constants.ID}.orders.edit.title`
    }
  };

  /* -------------------------------------------- */

  static PARTS = {
    form: {
      template: constants.TEMPLATE.ORDERS_EDIT
    }
  };

  /* -------------------------------------------- */

  /**
   * Prepare the context for rendering the form.
   * @returns {Promise<object>} Context data
   */
  async _prepareContext() {
    const context = await super._prepareContext();

    if ( context.label ) {
      context.label = game.i18n.localize(context.label);
    }
    return context;
  }
}

/* -------------------------------------------- */

/**
 * Per-size edit form for bastions.
 * @extends ConfigEditForm
 */
class BastionsSizesEditForm extends ConfigEditForm {
  /**
   * Constructor for BastionsSizesEditForm.
   * @param {object} args
   */
  constructor(args) {
    super(args);
    this.settingProperty = "sizes";
    this.config = configs.bastions;
    this.requiresReload = true;
  }

  /* -------------------------------------------- */

  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-bastions-sizes-edit-form`,
    window: {
      title: `CUSTOM_DND5E.form.${constants.ID}.sizes.edit.title`
    }
  };

  /* -------------------------------------------- */

  static PARTS = {
    form: {
      template: constants.TEMPLATE.SIZES_EDIT
    }
  };

  /* -------------------------------------------- */

  /**
   * Prepare the context for rendering the form.
   * @returns {Promise<object>} Context data
   */
  async _prepareContext() {
    const context = await super._prepareContext();

    if ( context.label ) {
      context.label = game.i18n.localize(context.label);
    }
    return context;
  }
}

/* -------------------------------------------- */
/*  MAIN FORM                                   */
/* -------------------------------------------- */

/**
 * Bastions settings menu form.
 * @extends CustomDnd5eForm
 */
class BastionsForm extends CustomDnd5eForm {
  /**
   * Constructor for BastionsForm.
   * @param {...any} args
   */
  constructor(...args) {
    super(args);
    this.requiresReload = true;
    this.config = configs.bastions;
    this.nestType = "subtypes";
  }

  /* -------------------------------------------- */

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
      title: `CUSTOM_DND5E.form.${constants.ID}.title`
    },
    position: {
      width: 600
    },
    tabGroups: {
      primary: "sizes"
    }
  };

  /* -------------------------------------------- */

  static PARTS = {
    form: {
      template: constants.TEMPLATE.FORM
    }
  };

  /* -------------------------------------------- */

  /**
   * Prepare the context for the form.
   * @returns {Promise<object>} Context data
   */
  async _prepareContext() {
    this.setting = getSetting(this.settingKey);
    if ( !this.setting || Object.keys(this.setting).length === 0 ) {
      this.setting = this.config.getSettingDefault();
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
   * @returns {object} Prepared sizes data
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
   * @returns {object} Prepared types data
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
   * @returns {object} Prepared orders data
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
   * @returns {object} Prepared advancement data
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
   * @param {Event} event
   * @param {HTMLElement} target
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
   * @param {Event} event
   * @param {HTMLElement} target
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
      const defaults = this.config.getSettingDefault();
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
   * @param {Event} event
   * @param {HTMLFormElement} form
   * @param {object} formData
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

    this.handleSubmit(
      processedFormData, this.settingKey, this.enableConfig, this.setConfig?.bind(this), this.requiresReload
    );
  }
}

/* -------------------------------------------- */
/*  REGISTRATION                                */
/* -------------------------------------------- */

/**
 * Register settings and load templates.
 */
export function register() {
  registerSettings();

  const templates = [
    constants.TEMPLATE.FORM,
    constants.TEMPLATE.SIZES_LIST,
    constants.TEMPLATE.SIZES_EDIT,
    constants.TEMPLATE.TYPES_LIST,
    constants.TEMPLATE.ORDERS_LIST,
    constants.TEMPLATE.ORDERS_EDIT
  ];
  c5eLoadTemplates(templates);
}

/* -------------------------------------------- */

/**
 * Register settings.
 */
function registerSettings() {
  registerMenu(
    constants.MENU.KEY,
    {
      hint: game.i18n.localize(constants.MENU.HINT),
      label: game.i18n.localize(constants.MENU.LABEL),
      name: game.i18n.localize(constants.MENU.NAME),
      icon: constants.MENU.ICON,
      type: BastionsForm,
      restricted: true,
      scope: "world"
    }
  );

  registerSetting(
    constants.SETTING.ENABLE.KEY,
    {
      scope: "world",
      config: false,
      requiresReload: true,
      type: Boolean,
      default: false
    }
  );

  registerSetting(
    constants.SETTING.CONFIG.KEY,
    {
      scope: "world",
      config: false,
      type: Object,
      default: getSettingDefault()
    }
  );
}

/* -------------------------------------------- */
/*  CONFIG                                      */
/* -------------------------------------------- */

/**
 * Normalize config by transforming string subtypes to objects.
 * @param {object} config
 * @returns {object} Normalized config
 */
function normalizeConfig(config) {
  if ( !config?.types ) return config;

  for ( const [typeKey, typeValue] of Object.entries(config.types) ) {
    if ( typeValue.subtypes ) {
      const transformedSubtypes = {};
      for ( const [subKey, subValue] of Object.entries(typeValue.subtypes) ) {
        transformedSubtypes[subKey] = typeof subValue === "string"
          ? { label: subValue, visible: true }
          : subValue;
      }
      config.types[typeKey].subtypes = transformedSubtypes;
    }
  }

  return config;
}

/* -------------------------------------------- */

/**
 * Get default config.
 * @param {string} [key=null] Optional key to get a specific default value.
 * @returns {object} Config data
 */
export function getSettingDefault(key = null) {
  const config = normalizeConfig(foundry.utils.deepClone(CONFIG.CUSTOM_DND5E[configKey]) ?? {});

  if ( key ) {
    return foundry.utils.getProperty(config, key);
  }

  return config;
}

/* -------------------------------------------- */

/**
 * Reset config and setting to their default values.
 */
export async function resetConfigSetting() {
  await resetDnd5eConfig(configKey);
  await game.settings.set(MODULE.ID, constants.SETTING.CONFIG.KEY, getSettingDefault());
}

/* -------------------------------------------- */

/**
 * Set CONFIG.DND5E.facilities.
 * @param {object} [settingData=null]
 * @returns {void}
 */
export function setConfig(settingData) {
  if ( !getSetting(constants.SETTING.ENABLE.KEY) ) return;
  settingData ??= getSetting(constants.SETTING.CONFIG.KEY);
  if ( checkEmpty(settingData) ) {
    if ( checkEmpty(CONFIG.DND5E[configKey]) ) {
      resetDnd5eConfig(configKey);
    }
    return;
  }

  const config = foundry.utils.mergeObject(
    foundry.utils.mergeObject(
      settingData,
      normalizeConfig(foundry.utils.deepClone(CONFIG.DND5E[configKey])),
      { overwrite: false }),
    getSettingDefault(),
    { overwrite: false }
  );

  if ( config ) {
    // Process sizes
    if ( config.sizes ) {
      config.sizes = Object.fromEntries(
        Object.entries(config.sizes)
          .filter(([_, value]) => value.visible !== false)
          .map(([key, value]) => [key, {
            label: game.i18n.localize(value.label),
            days: value.days,
            squares: value.squares,
            value: value.value
          }])
      );
    }

    // Process orders
    if ( config.orders ) {
      config.orders = Object.fromEntries(
        Object.entries(config.orders)
          .filter(([_, value]) => value.visible !== false)
          .map(([key, value]) => [key, {
            label: game.i18n.localize(value.label),
            icon: value.icon,
            ...(value.duration !== undefined && { duration: value.duration }),
            ...(value.basic !== undefined && { basic: value.basic }),
            ...(value.hidden !== undefined && { hidden: value.hidden })
          }])
      );
    }

    // Process types
    if ( config.types ) {
      config.types = Object.fromEntries(
        Object.entries(config.types)
          .filter(([_, value]) => value.visible !== false)
          .map(([key, value]) => {
            const subtypes = value.subtypes
              ? Object.fromEntries(
                Object.entries(value.subtypes)
                  .filter(([_, subValue]) => {
                    if ( typeof subValue === "string" ) return true;
                    return subValue.visible !== false;
                  })
                  .map(([subKey, subValue]) => [
                    subKey,
                    typeof subValue === "string" ? game.i18n.localize(subValue) : game.i18n.localize(subValue.label)
                  ])
              )
              : {};
            return [key, {
              label: game.i18n.localize(value.label),
              subtypes
            }];
          })
      );
    }

    CONFIG.DND5E[configKey] = config;
  }
}
