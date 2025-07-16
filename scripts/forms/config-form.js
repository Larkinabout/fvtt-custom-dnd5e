import { CONSTANTS, JOURNAL_HELP_BUTTON, MODULE } from "../constants.js";
import { Logger, getDefaultSetting, getSetting, setSetting } from "../utils.js";
import { CustomDnd5eForm } from "./custom-dnd5e-form.js";
import { ConfigEditForm } from "./config-edit-form.js";
import { AbilitiesEditForm } from "./abilities-edit-form.js";
import { ActivationCostsEditForm } from "./activation-costs-edit-form.js";
import { ActorSizesEditForm } from "./actor-sizes-edit-form.js";
import { ArmorCalculationsEditForm } from "./armor-calculations-edit-form.js";
import { ConditionsEditForm } from "./conditions-edit-form.js";
import { CreatureTypesEditForm } from "./creature-types-edit-form.js";
import { CurrencyEditForm } from "./currency-edit-form.js";
import { DamageTypesEditForm } from "./damage-types-edit-form.js";
import { ItemPropertiesEditForm } from "./item-properties-edit-form.js";
import { SkillsEditForm } from "./skills-edit-form.js";
import { SpellSchoolsEditForm } from "./spell-schools-edit-form.js";
import { ToolsEditForm } from "./tools-edit-form.js";
import { resetConfigSetting as resetAbilities, setConfig as setAbilities } from "../abilities.js";
import { resetConfigSetting as resetActivationCosts, setConfig as setActivationCosts } from "../activation-costs.js";
import { resetConfigSetting as resetArmorCalculations, setConfig as setArmorCalculations } from "../armor-calculations.js";
import { resetConfigSetting as resetArmorIds, setConfig as setArmorIds } from "../armor-ids.js";
import { resetConfigSetting as resetActorSizes, setConfig as setActorSizes } from "../actor-sizes.js";
import { resetConfigSetting as resetConsumableTypes, setConfig as setConsumableTypes } from "../consumable-types.js";
import { resetConfigSetting as resetConditions, setConfig as setConditions } from "../conditions.js";
import { resetConfigSetting as resetCreatureTypes, setConfig as setCreatureTypes } from "../creature-types.js";
import { resetConfigSetting as resetCurrency, setConfig as setCurrency } from "../currency.js";
import { resetConfigSetting as resetDamageTypes, setConfig as setDamageTypes } from "../damage-types.js";
import { resetConfigSetting as resetItemActionTypes, setConfig as setItemActionTypes } from "../item-action-types.js";
import { resetConfigSetting as resetItemActivationCostTypes, setConfig as setItemActivationCostTypes } from "../item-activation-cost-types.js";
import { resetConfigSetting as resetItemProperties, setConfig as setItemProperties } from "../item-properties.js";
import { resetConfigSetting as resetItemRarity, setConfig as setItemRarity } from "../item-rarity.js";
import { resetConfigSetting as resetLanguages, setConfig as setLanguages } from "../languages.js";
import { resetConfigSetting as resetSenses, setConfig as setSenses } from "../senses.js";
import { resetConfigSetting as resetSkills, setConfig as setSkills } from "../skills.js";
import { resetConfigSetting as resetSpellSchools, setConfig as setSpellSchools } from "../spell-schools.js";
import { resetConfigSetting as resetTools, setConfig as setTools } from "../tools.js";
import { resetConfigSetting as resetWeaponIds, setConfig as setWeaponIds } from "../weapon-ids.js";

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
   * @param {object} [options={}] The options for the form.
   */
  constructor(options = {}) {
    super(options);
    this.editForm = ConfigEditForm;
    this.enableConfig = false;
    this.label = "CUSTOM_DND5E.label";
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
   * @returns {Promise<object>} The context data.
   */
  async _prepareContext() {
    this.config = foundry.utils.deepClone(CONFIG.DND5E[this.configKey]);
    this.setting = getSetting(this.settingKey);
    if ( !this.setting ) {
      this.setting = getDefaultSetting(this.settingKey);
    }
    const data = (this.includeConfig && this.config)
      ? foundry.utils.mergeObject(this.config, this.setting)
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

    const context = { label: this.label, items: data };
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
   * @returns {object|null} The select options.
   */
  _getSelects() {
    return null;
  }

  /* -------------------------------------------- */

  /**
   * Edit an item.
   *
   * @param {Event} event The event that triggered the edit.
   * @param {HTMLElement} target The target element.
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
      const dragElement = item.querySelector(".custom-dnd5e-drag");

      item.addEventListener("dragend", this._onDragEnd.bind(this));
      item.addEventListener("dragleave", this._onDragLeave.bind(this));
      item.addEventListener("dragover", this._onDragOver.bind(this));
      item.addEventListener("drop", this._onDrop.bind(this));
      dragElement.addEventListener("dragstart", this._onDragStart.bind(this));

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
   * @param {object} data The data to be passed to the template.
   * @returns {Promise<string>} The rendered template.
   */
  async _getHtml(data) {
    const template = await foundry.applications.handlebars.renderTemplate(CONSTANTS.CONFIG.TEMPLATE.EDIT_IN_LIST, data);
    return template;
  }

  /* -------------------------------------------- */

  /**
   * Submit the form data.
   *
   * @param {Event} event The form submission event.
   * @param {HTMLFormElement} form The form element.
   * @param {object} formData The form data.
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
    this.handleSubmit(processedFormData, this.settingKey, this.enableConfig, this.setConfig, this.requiresReload);
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

/* -------------------------------------------- */

/**
 * Class representing the Abilities Form.
 *
 * @extends ConfigForm
 */
export class AbilitiesForm extends ConfigForm {
  /**
   * Constructor for AbilitiesForm.
   */
  constructor() {
    super();
    this.editForm = AbilitiesEditForm;
    this.requiresReload = true;
    this.enableConfigKey = CONSTANTS.ABILITIES.SETTING.ENABLE.KEY;
    this.settingKey = CONSTANTS.ABILITIES.SETTING.CONFIG.KEY;
    this.resetConfigSetting = resetAbilities;
    this.setConfig = setAbilities;
    this.configKey = "abilities";
    this.headerButton = JOURNAL_HELP_BUTTON;
    this.headerButton.uuid = CONSTANTS.ABILITIES.UUID;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-abilities-form`,
    window: {
      title: "CUSTOM_DND5E.form.abilities.title"
    }
  };
}

/* -------------------------------------------- */

/**
 * Class representing the Activation Costs Form.
 *
 * @extends ConfigForm
 */
export class ActivationCostsForm extends ConfigForm {
  /**
   * Constructor for ActivationCostsForm.
   */
  constructor() {
    super();
    this.editForm = ActivationCostsEditForm;
    this.requiresReload = false;
    this.enableConfigKey = CONSTANTS.ACTIVATION_COSTS.SETTING.ENABLE.KEY;
    this.settingKey = CONSTANTS.ACTIVATION_COSTS.SETTING.CONFIG.KEY;
    this.resetConfigSetting = resetActivationCosts;
    this.setConfig = setActivationCosts;
    this.configKey = "activityActivationTypes";
    this.headerButton = JOURNAL_HELP_BUTTON;
    this.headerButton.uuid = CONSTANTS.ACTIVATION_COSTS.UUID;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-activation-costs-form`,
    window: {
      title: "CUSTOM_DND5E.form.activityActivationTypes.title"
    }
  };
}

/* -------------------------------------------- */

/**
 * Class representing the Actor Sizes Form.
 *
 * @extends ConfigForm
 */
export class ActorSizesForm extends ConfigForm {
  /**
   * Constructor for ActorSizesForm.
   */
  constructor() {
    super();
    this.editForm = ActorSizesEditForm;
    this.requiresReload = false;
    this.enableConfigKey = CONSTANTS.ACTOR_SIZES.SETTING.ENABLE.KEY;
    this.settingKey = CONSTANTS.ACTOR_SIZES.SETTING.CONFIG.KEY;
    this.resetConfigSetting = resetActorSizes;
    this.setConfig = setActorSizes;
    this.configKey = "actorSizes";
    this.headerButton = JOURNAL_HELP_BUTTON;
    this.headerButton.uuid = CONSTANTS.ACTOR_SIZES.UUID;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-actor-sizes-form`,
    window: {
      title: "CUSTOM_DND5E.form.actorSizes.title"
    }
  };
}

/* -------------------------------------------- */

/**
 * Class representing the Armor Calculations Form.
 *
 * @extends ConfigForm
 */
export class ArmorCalculationsForm extends ConfigForm {
  /**
   * Constructor for ArmorCalculationsForm.
   */
  constructor() {
    super();
    this.editForm = ArmorCalculationsEditForm;
    this.requiresReload = false;
    this.enableConfigKey = CONSTANTS.ARMOR_CALCULATIONS.SETTING.ENABLE.KEY;
    this.settingKey = CONSTANTS.ARMOR_CALCULATIONS.SETTING.CONFIG.KEY;
    this.resetConfigSetting = resetArmorCalculations;
    this.setConfig = setArmorCalculations;
    this.configKey = "armorClasses";
    this.headerButton = JOURNAL_HELP_BUTTON;
    this.headerButton.uuid = CONSTANTS.ARMOR_CALCULATIONS.UUID;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-armor-calculations-form`,
    window: {
      title: "CUSTOM_DND5E.form.armorClasses.title"
    }
  };
}

/* -------------------------------------------- */

/**
 * Class representing the Armor IDs Form.
 *
 * @extends IdForm
 */
export class ArmorIdsForm extends IdForm {
  /**
   * Constructor for ArmorIdsForm.
   */
  constructor() {
    super();
    this.editInList = true;
    this.requiresReload = true;
    this.enableConfigKey = CONSTANTS.ARMOR_IDS.SETTING.ENABLE.KEY;
    this.settingKey = CONSTANTS.ARMOR_IDS.SETTING.CONFIG.KEY;
    this.resetConfigSetting = resetArmorIds;
    this.setConfig = setArmorIds;
    this.configKey = "armorIds";
    this.headerButton = JOURNAL_HELP_BUTTON;
    this.headerButton.uuid = CONSTANTS.ARMOR_IDS.UUID;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-armor-ids-form`,
    window: {
      title: "CUSTOM_DND5E.form.armorIds.title"
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
      template: CONSTANTS.ARMOR_IDS.TEMPLATE.FORM
    }
  };

  /* -------------------------------------------- */

  /**
   * Get the HTML template for the form.
   *
   * @param {object} data The data to be passed to the template.
   * @returns {Promise<string>} The rendered template.
   */
  async _getHtml(data) {
    const template = await foundry.applications.handlebars.renderTemplate(CONSTANTS.ARMOR_IDS.TEMPLATE.LIST, data);
    return template;
  }
}

/* -------------------------------------------- */

/**
 * Class representing the Consumable Types Form.
 *
 * @extends ConfigForm
 */
export class ConsumableTypesForm extends ConfigForm {
  /**
   * Constructor for ConsumableTypesForm.
   */
  constructor() {
    super();
    this.editInList = true;
    this.nestable = true;
    this.nestType = "subtypes";
    this.requiresReload = false;
    this.enableConfigKey = CONSTANTS.CONSUMABLE_TYPES.SETTING.ENABLE.KEY;
    this.settingKey = CONSTANTS.CONSUMABLE_TYPES.SETTING.CONFIG.KEY;
    this.resetConfigSetting = resetConsumableTypes;
    this.setConfig = setConsumableTypes;
    this.configKey = "consumableTypes";
    this.headerButton = JOURNAL_HELP_BUTTON;
    this.headerButton.uuid = CONSTANTS.CONSUMABLE_TYPES.UUID;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-consumable-types-form`,
    window: {
      title: "CUSTOM_DND5E.form.consumableTypes.title"
    }
  };
}

/* -------------------------------------------- */

/**
 * Class representing the Conditions Form.
 *
 * @extends ConfigForm
 */
export class ConditionsForm extends ConfigForm {
  /**
   * Constructor for ConditionsForm.
   */
  constructor() {
    super();
    this.editForm = ConditionsEditForm;
    this.label = "CUSTOM_DND5E.name";
    this.includeConfig = false;
    this.requiresReload = false;
    this.enableConfigKey = CONSTANTS.CONDITIONS.SETTING.ENABLE.KEY;
    this.settingKey = CONSTANTS.CONDITIONS.SETTING.CONFIG.KEY;
    this.resetConfigSetting = resetConditions;
    this.setConfig = setConditions;
    this.configKey = "conditions";
    this.headerButton = JOURNAL_HELP_BUTTON;
    this.headerButton.uuid = CONSTANTS.CONDITIONS.UUID;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-conditions-form`,
    window: {
      title: "CUSTOM_DND5E.form.conditions.title"
    }
  };
}

/* -------------------------------------------- */

/**
 * Class representing the Creature Types Form.
 *
 * @extends ConfigForm
 */
export class CreatureTypesForm extends ConfigForm {
  /**
   * Constructor for CreatureTypesForm.
   */
  constructor() {
    super();
    this.editForm = CreatureTypesEditForm;
    this.requiresReload = false;
    this.enableConfigKey = CONSTANTS.CREATURE_TYPES.SETTING.ENABLE.KEY;
    this.settingKey = CONSTANTS.CREATURE_TYPES.SETTING.CONFIG.KEY;
    this.resetConfigSetting = resetCreatureTypes;
    this.setConfig = setCreatureTypes;
    this.configKey = "creatureTypes";
    this.actorProperties = ["system.traits.di.value", "system.traits.dr.value", "system.traits.dv.value"];
    this.headerButton = JOURNAL_HELP_BUTTON;
    this.headerButton.uuid = CONSTANTS.CREATURE_TYPES.UUID;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-damage-types-form`,
    window: {
      title: "CUSTOM_DND5E.form.damageTypes.title"
    }
  };
}

/* -------------------------------------------- */

/**
 * Class representing the Currency Form.
 *
 * @extends ConfigForm
 */
export class CurrencyForm extends ConfigForm {
  /**
   * Constructor for CurrencyForm.
   */
  constructor() {
    super();
    this.disableCreate = true;
    this.editForm = CurrencyEditForm;
    this.requiresReload = true;
    this.enableConfigKey = CONSTANTS.CURRENCY.SETTING.ENABLE.KEY;
    this.settingKey = CONSTANTS.CURRENCY.SETTING.CONFIG.KEY;
    this.resetConfigSetting = resetCurrency;
    this.setConfig = setCurrency;
    this.configKey = "currencies";
    this.headerButton = JOURNAL_HELP_BUTTON;
    this.headerButton.uuid = CONSTANTS.CURRENCY.UUID;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-currency-form`,
    window: {
      title: "CUSTOM_DND5E.form.currencies.title"
    }
  };
}

/* -------------------------------------------- */

/**
 * Class representing the Damage Types Form.
 *
 * @extends ConfigForm
 */
export class DamageTypesForm extends ConfigForm {
  /**
   * Constructor for DamageTypesForm.
   */
  constructor() {
    super();
    this.editForm = DamageTypesEditForm;
    this.requiresReload = false;
    this.enableConfigKey = CONSTANTS.DAMAGE_TYPES.SETTING.ENABLE.KEY;
    this.settingKey = CONSTANTS.DAMAGE_TYPES.SETTING.CONFIG.KEY;
    this.resetConfigSetting = resetDamageTypes;
    this.setConfig = setDamageTypes;
    this.configKey = "damageTypes";
    this.actorProperties = ["system.traits.di.value", "system.traits.dr.value", "system.traits.dv.value"];
    this.headerButton = JOURNAL_HELP_BUTTON;
    this.headerButton.uuid = CONSTANTS.DAMAGE_TYPES.UUID;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-damage-types-form`,
    window: {
      title: "CUSTOM_DND5E.form.damageTypes.title"
    }
  };
}

/* -------------------------------------------- */

/**
 * Class representing the Item Action Types Form.
 *
 * @extends ConfigForm
 */
export class ItemActionTypesForm extends ConfigForm {
  /**
   * Constructor for ItemActionTypesForm.
   */
  constructor() {
    super();
    this.requiresReload = false;
    this.enableConfigKey = CONSTANTS.ITEM_ACTION_TYPES.SETTING.ENABLE.KEY;
    this.settingKey = CONSTANTS.ITEM_ACTION_TYPES.SETTING.CONFIG.KEY;
    this.resetConfigSetting = resetItemActionTypes;
    this.setConfig = setItemActionTypes;
    this.configKey = "itemActionTypes";
    this.headerButton = JOURNAL_HELP_BUTTON;
    this.headerButton.uuid = CONSTANTS.ITEM_ACTION_TYPES.UUID;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-item-action-types-form`,
    window: {
      title: "CUSTOM_DND5E.form.itemActionTypes.title"
    }
  };
}

/* -------------------------------------------- */

/**
 * Class representing the Item Activation Cost Types Form.
 *
 * @extends ConfigForm
 */
export class ItemActivationCostTypesForm extends ConfigForm {
  /**
   * Constructor for ItemActivationCostTypesForm.
   */
  constructor() {
    super();
    this.requiresReload = false;
    this.enableConfigKey = CONSTANTS.ITEM_ACTIVATION_COST_TYPES.SETTING.ENABLE.KEY;
    this.settingKey = CONSTANTS.ITEM_ACTIVATION_COST_TYPES.SETTING.CONFIG.KEY;
    this.resetConfigSetting = resetItemActivationCostTypes;
    this.setConfig = setItemActivationCostTypes;
    this.configKey = "abilityActivationTypes";
    this.headerButton = JOURNAL_HELP_BUTTON;
    this.headerButton.uuid = CONSTANTS.ITEM_ACTIVATION_COST_TYPES.UUID;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-item-activation-cost-types-form`,
    window: {
      title: "CUSTOM_DND5E.form.itemActivationCostTypes.title"
    }
  };
}

/* -------------------------------------------- */

/**
 * Class representing the Item Properties form.
 *
 * @extends ConfigForm
 */
export class ItemPropertiesForm extends ConfigForm {
  /**
   * Constructor for ItemPropertiesForm.
   */
  constructor() {
    super();
    this.editForm = ItemPropertiesEditForm;
    this.requiresReload = false;
    this.enableConfigKey = CONSTANTS.ITEM_PROPERTIES.SETTING.ENABLE.KEY;
    this.settingKey = CONSTANTS.ITEM_PROPERTIES.SETTING.CONFIG.KEY;
    this.resetConfigSetting = resetItemProperties;
    this.setConfig = setItemProperties;
    this.configKey = "itemProperties";
    this.configKeys = ["itemProperties", "validProperties"];
    this.headerButton = JOURNAL_HELP_BUTTON;
    this.headerButton.uuid = CONSTANTS.ITEM_PROPERTIES.UUID;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-item-properties-form`,
    window: {
      title: "CUSTOM_DND5E.form.itemProperties.title"
    }
  };
}

/* -------------------------------------------- */

/**
 * Class representing the Item Rarity Form.
 * @extends ConfigForm
 */
export class ItemRarityForm extends ConfigForm {
  /**
   * Constructor for ItemRarityForm.
   */
  constructor() {
    super();
    this.editInList = true;
    this.requiresReload = false;
    this.enableConfigKey = CONSTANTS.ITEM_RARITY.SETTING.ENABLE.KEY;
    this.settingKey = CONSTANTS.ITEM_RARITY.SETTING.CONFIG.KEY;
    this.resetConfigSetting = resetItemRarity;
    this.setConfig = setItemRarity;
    this.configKey = "itemRarity";
    this.headerButton = JOURNAL_HELP_BUTTON;
    this.headerButton.uuid = CONSTANTS.ITEM_RARITY.UUID;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-item-rarity-form`,
    window: {
      title: "CUSTOM_DND5E.form.itemRarity.title"
    }
  };
}

/* -------------------------------------------- */

/**
 * Class representing the Languages Form.
 * @extends ConfigForm
 */
export class LanguagesForm extends ConfigForm {
  /**
   * Constructor for LanguagesForm.
   */
  constructor() {
    super();
    this.editInList = true;
    this.nestable = true;
    this.requiresReload = false;
    this.enableConfigKey = CONSTANTS.LANGUAGES.SETTING.ENABLE.KEY;
    this.settingKey = CONSTANTS.LANGUAGES.SETTING.CONFIG.KEY;
    this.resetConfigSetting = resetLanguages;
    this.setConfig = setLanguages;
    this.configKey = "languages";
    this.headerButton = JOURNAL_HELP_BUTTON;
    this.headerButton.uuid = CONSTANTS.LANGUAGES.UUID;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-languages-form`,
    window: {
      title: "CUSTOM_DND5E.form.languages.title"
    }
  };
}

/* -------------------------------------------- */

/**
 * Class representing the Senses Form.
 * @extends ConfigForm
 */
export class SensesForm extends ConfigForm {
  /**
   * Constructor for SensesForm.
   */
  constructor() {
    super();
    this.editInList = true;
    this.requiresReload = false;
    this.enableConfigKey = CONSTANTS.SENSES.SETTING.ENABLE.KEY;
    this.settingKey = CONSTANTS.SENSES.SETTING.CONFIG.KEY;
    this.resetConfigSetting = resetSenses;
    // This.setConfig = setSenses // Temporarily removed until custom senses is supported in the dnd5e system
    this.setConfig = null;
    this.configKey = "senses";
    this.headerButton = JOURNAL_HELP_BUTTON;
    this.headerButton.uuid = CONSTANTS.SENSES.UUID;
    this.includeConfig = false;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-senses-form`,
    window: {
      title: "CUSTOM_DND5E.form.senses.title"
    }
  };
}

/* -------------------------------------------- */

/**
 * Class representing the Skills Form.
 * @extends ConfigForm
 */
export class SkillsForm extends ConfigForm {
  /**
   * Constructor for SkillsForm.
   */
  constructor() {
    super();
    this.editForm = SkillsEditForm;
    this.requiresReload = true;
    this.enableConfigKey = CONSTANTS.SKILLS.SETTING.ENABLE.KEY;
    this.settingKey = CONSTANTS.SKILLS.SETTING.CONFIG.KEY;
    this.resetConfigSetting = resetSkills;
    this.setConfig = setSkills;
    this.configKey = "skills";
    this.headerButton = JOURNAL_HELP_BUTTON;
    this.headerButton.uuid = CONSTANTS.SKILLS.UUID;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-skills-form`,
    window: {
      title: "CUSTOM_DND5E.form.skills.title"
    }
  };
}

/* -------------------------------------------- */

/**
 * Class representing the Spell Schools Form.
 * @extends ConfigForm
 */
export class SpellSchoolsForm extends ConfigForm {
  /**
   * Constructor for SpellSchoolsForm.
   */
  constructor() {
    super();
    this.editForm = SpellSchoolsEditForm;
    this.requiresReload = false;
    this.enableConfigKey = CONSTANTS.SPELL_SCHOOLS.SETTING.ENABLE.KEY;
    this.settingKey = CONSTANTS.SPELL_SCHOOLS.SETTING.CONFIG.KEY;
    this.resetConfigSetting = resetSpellSchools;
    this.setConfig = setSpellSchools;
    this.configKey = "spellSchools";
    this.headerButton = JOURNAL_HELP_BUTTON;
    this.headerButton.uuid = CONSTANTS.SPELL_SCHOOLS.UUID;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-spell-schools-form`,
    window: {
      title: "CUSTOM_DND5E.form.spellSchools.title"
    }
  };
}

/* -------------------------------------------- */

/**
 * Class representing the Tool IDs Form.
 *
 * @extends IdForm
 */
export class ToolsForm extends IdForm {
  /**
   * Constructor for ToolsForm.
   */
  constructor() {
    super();
    this.editForm = ToolsEditForm;
    this.editInList = false;
    this.requiresReload = true;
    this.enableConfigKey = CONSTANTS.TOOLS.SETTING.ENABLE.KEY;
    this.settingKey = CONSTANTS.TOOLS.SETTING.CONFIG.KEY;
    this.resetConfigSetting = resetTools;
    this.setConfig = setTools;
    this.configKey = "tools";
    this.headerButton = JOURNAL_HELP_BUTTON;
    this.headerButton.uuid = CONSTANTS.TOOLS.UUID;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-tools-form`,
    window: {
      title: "CUSTOM_DND5E.form.tools.title"
    }
  };
}

/* -------------------------------------------- */

/**
 * Class representing the Weapon IDs Form.
 *
 * @extends IdForm
 */
export class WeaponIdsForm extends IdForm {
  /**
   * Constructor for WeaponIdsForm.
   */
  constructor() {
    super();
    this.editInList = true;
    this.requiresReload = true;
    this.enableConfigKey = CONSTANTS.WEAPON_IDS.SETTING.ENABLE.KEY;
    this.settingKey = CONSTANTS.WEAPON_IDS.SETTING.CONFIG.KEY;
    this.resetConfigSetting = resetWeaponIds;
    this.setConfig = setWeaponIds;
    this.configKey = "weaponIds";
    this.headerButton = JOURNAL_HELP_BUTTON;
    this.headerButton.uuid = CONSTANTS.WEAPON_IDS.UUID;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-weapon-ids-form`,
    window: {
      title: "CUSTOM_DND5E.form.weaponIds.title"
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
      template: CONSTANTS.WEAPON_IDS.TEMPLATE.FORM
    }
  };

  /* -------------------------------------------- */

  /**
   * Get the HTML template for the form.
   *
   * @param {object} data The data to be passed to the template.
   * @returns {Promise<string>} The rendered template.
   */
  async _getHtml(data) {
    const template = await foundry.applications.handlebars.renderTemplate(CONSTANTS.WEAPON_IDS.TEMPLATE.LIST, data);
    return template;
  }
}
