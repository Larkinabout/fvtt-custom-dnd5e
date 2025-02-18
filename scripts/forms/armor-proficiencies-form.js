import { CONSTANTS, JOURNAL_HELP_BUTTON, MODULE } from "../constants.js";
import { getSetting, setSetting } from "../utils.js";
import { ConfigForm } from "./config-form.js";
import { getDnd5eConfig, setConfig } from "../armor-proficiencies.js";

/**
 * Class representing the Armor Proficiencies Form.
 *
 * @extends ConfigForm
 */
export class ArmorProficienciesForm extends ConfigForm {
  /**
   * Constructor for ArmorProficienciesForm.
   *
   * @param {...any} args Arguments passed to the parent class.
   */
  constructor(...args) {
    super(args);
    this.editInList = true;
    this.nestable = true;
    this.enableConfigKey = CONSTANTS.ARMOR_PROFICIENCIES.SETTING.ENABLE.KEY;
    this.settingKey = CONSTANTS.ARMOR_PROFICIENCIES.SETTING.CONFIG.KEY;
    this.dnd5eConfig = getDnd5eConfig();
    this.setting = getSetting(this.settingKey) || this.dnd5eConfig;
    this.setConfig = setConfig;
    this.headerButton = JOURNAL_HELP_BUTTON;
    this.headerButton.uuid = CONSTANTS.ARMOR_PROFICIENCIES.UUID;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    actions: {
      reset: ArmorProficienciesForm.reset
    },
    id: `${MODULE.ID}-armor-proficiencies-form`,
    window: {
      title: "CUSTOM_DND5E.form.armorProficiencies.title"
    }
  };

  /* -------------------------------------------- */

  /**
   * Prepare the context for rendering the form.
   *
   * @returns {Promise<object>} The context data.
   */
  async _prepareContext() {
    this.setting = getSetting(this.settingKey) || this.dnd5eConfig;

    const labelise = data => {
      Object.entries(data).forEach(([key, value]) => {
        if ( typeof value === "string" ) {
          data[key] = { label: value };
        }

        if ( value.children ) {
          labelise(value.children);
        }
      });
    };

    labelise(this.setting);

    return { editInList: this.editInList, items: this.setting };
  }

  /* -------------------------------------------- */

  /**
   * Reset the form to its default settings.
   *
   * @returns {Promise<void>}
   */
  static async reset() {
    const reset = async () => {
      await setSetting(this.settingKey, this.dnd5eConfig);
      setConfig(this.dnd5eConfig);
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
}
