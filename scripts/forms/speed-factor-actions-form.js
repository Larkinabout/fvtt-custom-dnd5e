import { CONSTANTS, MODULE } from "../constants.js";
import { ConfigForm, createListSettingConfig } from "./config-form.js";
import { ConfigEditForm } from "./config-edit-form.js";
import { DEFAULT_ACTIONS, formatModifier, getActionGroups } from "../gameplay/speed-factor-initiative.js";

const constants = CONSTANTS.SPEED_FACTOR_INITIATIVE;

/* -------------------------------------------- */
/*  CONFIG SHIM                                 */
/* -------------------------------------------- */

/**
 * Config descriptor for the Speed Factor actions list.
 * @type {object}
 */
const actionsConfig = createListSettingConfig({
  settingKey: constants.SETTING.ACTIONS.KEY,
  uuid: constants.UUID,
  getDefaults: () => DEFAULT_ACTIONS
});

/* -------------------------------------------- */
/*  EDIT FORM                                   */
/* -------------------------------------------- */

/**
 * Editor for a single Speed Factor action.
 */
class SpeedFactorActionsEditForm extends ConfigEditForm {
  /**
   * Constructor.
   * @param {object} args
   */
  constructor(args) {
    super(args);
    this.config = actionsConfig;
    this.requiresReload = false;
  }

  /* -------------------------------------------- */

  /**
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-speed-factor-actions-edit-form`,
    window: {
      title: "CUSTOM_DND5E.speedFactorInitiative.actionsForm.edit.title"
    }
  };

  /* -------------------------------------------- */

  /**
   * @type {object[]}
   */
  static FIELDS = [
    {
      fields: [
        { name: "label", type: "text", label: "CUSTOM_DND5E.label", localizeValue: true },
        {
          name: "description",
          type: "textarea",
          label: "CUSTOM_DND5E.speedFactorInitiative.field.description.label",
          hint: "CUSTOM_DND5E.speedFactorInitiative.field.description.hint",
          localizeValue: true
        },
        {
          name: "icon",
          type: "text",
          label: "CUSTOM_DND5E.speedFactorInitiative.field.icon.label",
          hint: "CUSTOM_DND5E.speedFactorInitiative.field.icon.hint"
        },
        {
          name: "img",
          type: "filePicker",
          label: "CUSTOM_DND5E.speedFactorInitiative.field.img.label",
          hint: "CUSTOM_DND5E.speedFactorInitiative.field.img.hint"
        },
        {
          name: "isGroup",
          type: "checkbox",
          label: "CUSTOM_DND5E.speedFactorInitiative.field.isGroup.label",
          hint: "CUSTOM_DND5E.speedFactorInitiative.field.isGroup.hint"
        }
      ]
    },
    {
      legend: "CUSTOM_DND5E.speedFactorInitiative.fieldset.group",
      cssClass: "custom-dnd5e-speed-factor-group-fieldset",
      fields: [
        {
          name: "includeWeapons",
          type: "checkbox",
          label: "CUSTOM_DND5E.speedFactorInitiative.field.includeWeapons.label",
          hint: "CUSTOM_DND5E.speedFactorInitiative.field.includeWeapons.hint",
          labelClass: "custom-dnd5e-edit-label-flex2"
        },
        {
          name: "filterWeapons",
          type: "checkbox",
          label: "CUSTOM_DND5E.speedFactorInitiative.field.filterWeapons.label",
          hint: "CUSTOM_DND5E.speedFactorInitiative.field.filterWeapons.hint",
          labelClass: "custom-dnd5e-edit-label-flex2"
        },
        {
          name: "includeSpells",
          type: "checkbox",
          label: "CUSTOM_DND5E.speedFactorInitiative.field.includeSpells.label",
          hint: "CUSTOM_DND5E.speedFactorInitiative.field.includeSpells.hint",
          labelClass: "custom-dnd5e-edit-label-flex2"
        },
        {
          name: "includeSpellLevels",
          type: "checkbox",
          label: "CUSTOM_DND5E.speedFactorInitiative.field.includeSpellLevels.label",
          hint: "CUSTOM_DND5E.speedFactorInitiative.field.includeSpellLevels.hint",
          labelClass: "custom-dnd5e-edit-label-flex2"
        }
      ]
    },
    {
      legend: "CUSTOM_DND5E.speedFactorInitiative.fieldset.action",
      cssClass: "custom-dnd5e-speed-factor-action-fieldset",
      fields: [
        {
          name: "group",
          type: "select",
          choices: "group",
          localizeChoices: true,
          label: "CUSTOM_DND5E.speedFactorInitiative.field.group.label",
          hint: "CUSTOM_DND5E.speedFactorInitiative.field.group.hint",
          labelClass: "custom-dnd5e-edit-label-flex2"
        },
        {
          name: "modifier",
          type: "number",
          step: 1,
          label: "CUSTOM_DND5E.speedFactorInitiative.field.modifier.label",
          hint: "CUSTOM_DND5E.speedFactorInitiative.field.modifier.hint",
          labelClass: "custom-dnd5e-edit-label-flex2"
        }
      ]
    }
  ];

  /* -------------------------------------------- */

  /**
   * Toggle the Group fieldset for groups and the Action fieldset for non-groups.
   * @param {object} context
   * @param {object} options
   */
  _onRender(context, options) {
    super._onRender(context, options);
    const checkbox = this.element.querySelector('[name$=".isGroup"]');
    const groupFieldset = this.element.querySelector(".custom-dnd5e-speed-factor-group-fieldset");
    const actionFieldset = this.element.querySelector(".custom-dnd5e-speed-factor-action-fieldset");
    const toggle = () => {
      const isGroup = !!checkbox?.checked;
      groupFieldset?.classList.toggle("hidden", !isGroup);
      actionFieldset?.classList.toggle("hidden", isGroup);
    };
    checkbox?.addEventListener("change", toggle);
    toggle();
  }

  /* -------------------------------------------- */

  /**
   * Get select options for groups.
   * @returns {object} Select options
   */
  _getSelects() {
    const choices = { "": "CUSTOM_DND5E.none" };
    for ( const group of getActionGroups() ) {
      if ( group.key !== this.key ) choices[group.key] = group.label;
    }
    return { group: { choices } };
  }

  /* -------------------------------------------- */

  /**
   * Merge the submitted fields into the existing entry.
   * @param {object} formData
   * @returns {object} Processed form data
   */
  processFormData(formData) {
    const processed = super.processFormData(formData);
    const existing = this.setting?.[this.key];
    if ( existing && processed[this.key] ) {
      processed[this.key] = { ...existing, ...processed[this.key] };
    }
    return processed;
  }
}

/* -------------------------------------------- */
/*  LIST FORM                                   */
/* -------------------------------------------- */

/**
 * Editor for Speed Factor actions.
 */
export class SpeedFactorActionsForm extends ConfigForm {
  /**
   * Constructor.
   */
  constructor() {
    super();
    this.config = actionsConfig;
    this.editForm = SpeedFactorActionsEditForm;
    this.includeConfig = false;
    this.label = "CUSTOM_DND5E.label";
    this.listTitle = "CUSTOM_DND5E.speedFactorInitiative.actionsForm.listTitle";
  }

  /* -------------------------------------------- */

  /**
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-speed-factor-actions-form`,
    window: {
      title: "CUSTOM_DND5E.speedFactorInitiative.actionsForm.title"
    }
  };

  /* -------------------------------------------- */

  /**
   * @type {object}
   */
  static PARTS = {
    form: {
      template: constants.TEMPLATE.ACTIONS_FORM
    }
  };

  /* -------------------------------------------- */

  /**
   * Append each action's modifier to its displayed label.
   * @returns {Promise<object>} Context data
   */
  async _prepareContext() {
    const context = await super._prepareContext();
    context.items = foundry.utils.deepClone(context.items ?? {});
    for ( const item of Object.values(context.items) ) {
      item.system = false;
      const base = game.i18n.localize(item.label ?? "");
      if ( item.isGroup ) {
        item.label = `${base} (${game.i18n.localize("CUSTOM_DND5E.speedFactorInitiative.group.label")})`;
      } else {
        item.label = `${base} (${formatModifier(Number(item.modifier ?? 0))})`;
      }
    }
    return context;
  }
}
