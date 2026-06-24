import { CONSTANTS, JOURNAL_HELP_BUTTON, MODULE } from "../constants.js";
import { getSetting, setSetting, resetSetting } from "../utils.js";
import { CustomDnd5eForm } from "./custom-dnd5e-form.js";
import { getActions, getRevealRole, getSizeModifiers } from "../gameplay/speed-factor-initiative.js";
import { SpeedFactorActionsForm } from "./speed-factor-actions-form.js";
import { SpeedFactorWeaponsForm } from "./speed-factor-weapons-form.js";

const constants = CONSTANTS.SPEED_FACTOR_INITIATIVE;

/**
 * Class representing the Speed Factor Initiative form.
 */
export class SpeedFactorInitiativeForm extends CustomDnd5eForm {
  /**
   * Constructor.
   * @param {...any} args
   */
  constructor(...args) {
    super(args);
    this.headerButton = JOURNAL_HELP_BUTTON;
    this.headerButton.uuid = constants.UUID;
  }

  /* -------------------------------------------- */

  /**
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    actions: {
      openActions: SpeedFactorInitiativeForm.openActions,
      openWeapons: SpeedFactorInitiativeForm.openWeapons,
      reset: SpeedFactorInitiativeForm.reset
    },
    form: {
      handler: SpeedFactorInitiativeForm.submit
    },
    id: `${MODULE.ID}-speed-factor-initiative-form`,
    window: {
      title: "CUSTOM_DND5E.speedFactorInitiative.form.title"
    }
  };

  /* -------------------------------------------- */

  /**
   * @type {object}
   */
  static PARTS = {
    form: {
      template: constants.TEMPLATE.FORM
    }
  };

  /* -------------------------------------------- */

  /**
   * Prepare the context for rendering the form.
   * @returns {Promise<object>} Context data
   */
  async _prepareContext() {
    const sizeModifiers = getSizeModifiers();
    const sizes = Object.entries(sizeModifiers).map(([key, value]) => ({
      key,
      label: value.label,
      modifier: value.modifier
    }));

    const timeoutActionChoices = { skip: "CUSTOM_DND5E.speedFactorInitiative.form.timeoutAction.skip" };
    for ( const [key, action] of Object.entries(getActions()) ) {
      if ( action.isGroup || action.visible === false ) continue;
      timeoutActionChoices[key] = action.label ?? key;
    }

    const storedTimeoutAction = getSetting(constants.SETTING.TIMEOUT_ACTION.KEY);
    const timeoutAction = (storedTimeoutAction in timeoutActionChoices) ? storedTimeoutAction : "skip";

    return {
      enable: getSetting(constants.SETTING.ENABLE.KEY),
      revealChoices: getRevealRole(),
      gatherTimeout: getSetting(constants.SETTING.GATHER_TIMEOUT.KEY) || "",
      timeoutAction,
      sizes,
      selects: {
        revealChoices: {
          choices: {
            1: "USER.RolePlayer",
            2: "USER.RoleTrusted",
            3: "USER.RoleAssistant",
            4: "USER.RoleGamemaster"
          }
        },
        timeoutAction: {
          choices: timeoutActionChoices
        }
      }
    };
  }

  /* -------------------------------------------- */

  /**
   * Open the Speed Factor actions editor.
   */
  static openActions() {
    new SpeedFactorActionsForm().render(true);
  }

  /* -------------------------------------------- */

  /**
   * Open the Speed Factor weapons editor.
   */
  static openWeapons() {
    new SpeedFactorWeaponsForm().render(true);
  }

  /* -------------------------------------------- */

  /**
   * Reset the form to default settings.
   */
  static async reset() {
    const reset = async () => {
      await Promise.all([
        resetSetting(constants.SETTING.ENABLE.KEY),
        resetSetting(constants.SETTING.SIZE_MODIFIERS.KEY),
        resetSetting(constants.SETTING.REVEAL_CHOICES.KEY),
        resetSetting(constants.SETTING.GATHER_TIMEOUT.KEY),
        resetSetting(constants.SETTING.TIMEOUT_ACTION.KEY)
      ]);
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
   * Submit the form data.
   * @param {Event} event
   * @param {HTMLFormElement} form
   * @param {object} formData
   */
  static async submit(event, form, formData) {
    const sizeModifiers = {};
    Object.entries(formData.object).forEach(([key, value]) => {
      if ( key.startsWith("sizeModifiers.") ) {
        const sizeKey = key.split(".").slice(1).join(".");
        sizeModifiers[sizeKey] = Number(value);
      }
    });

    const timeout = Number(formData.object.gatherTimeout);
    const gatherTimeout = (Number.isFinite(timeout) && timeout > 0) ? timeout : null;

    await Promise.all([
      setSetting(constants.SETTING.ENABLE.KEY, formData.object.enable),
      setSetting(constants.SETTING.SIZE_MODIFIERS.KEY, sizeModifiers),
      setSetting(constants.SETTING.REVEAL_CHOICES.KEY, Number(formData.object.revealChoices)),
      setSetting(constants.SETTING.GATHER_TIMEOUT.KEY, gatherTimeout),
      setSetting(constants.SETTING.TIMEOUT_ACTION.KEY, formData.object.timeoutAction)
    ]);

    foundry.applications.settings.SettingsConfig.reloadConfirm();
  }
}
