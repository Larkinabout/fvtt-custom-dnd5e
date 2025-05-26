import { CONSTANTS, MODULE } from "../constants.js";
import { getFlag, setFlag, getSetting, setSetting } from "../utils.js";
import { CustomDnd5eForm } from "./custom-dnd5e-form.js";

/**
 * Class representing the Sheet Form.
 */
export class ActorSheetForm extends CustomDnd5eForm {
  /**
   * Constructor for ActorSheetForm.
   *
   * @param {...any} args The arguments for the form.
   */
  constructor(...args) {
    super(args);
    this.type = "actorSheet";
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    actions: {
      reset: ActorSheetForm.reset
    },
    form: {
      handler: ActorSheetForm.submit
    },
    id: `${MODULE.ID}-actor-sheet-form`,
    window: {
      title: "CUSTOM_DND5E.form.actorSheet.title"
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
      template: CONSTANTS.ACTOR_SHEET.TEMPLATE.FORM
    }
  };

  /* -------------------------------------------- */

  /**
   * Prepare the context for rendering the form.
   *
   * @returns {Promise<object>} The context data.
   */
  async _prepareContext() {
    return {
      isGM: game.user.isGM,
      autoFadeSheet: getFlag(game.user, CONSTANTS.ACTOR_SHEET.SETTING.AUTO_FADE_SHEET.KEY),
      autoMinimiseSheet: getFlag(game.user, CONSTANTS.ACTOR_SHEET.SETTING.AUTO_MINIMISE_SHEET.KEY),
      bannerImage: getSetting(CONSTANTS.ACTOR_SHEET.SETTING.BANNER_IMAGE.KEY),
      sheetScale: getFlag(game.user, CONSTANTS.ACTOR_SHEET.SETTING.SHEET_SCALE.KEY),
      showDeathSaves: getSetting(CONSTANTS.ACTOR_SHEET.SETTING.SHOW_DEATH_SAVES.KEY),
      showEncumbrance: getSetting(CONSTANTS.ACTOR_SHEET.SETTING.SHOW_ENCUMBRANCE.KEY),
      showExhaustion: getSetting(CONSTANTS.ACTOR_SHEET.SETTING.SHOW_EXHAUSTION.KEY),
      showInspiration: getSetting(CONSTANTS.ACTOR_SHEET.SETTING.SHOW_INSPIRATION.KEY),
      showLegendaryActions: getSetting(CONSTANTS.ACTOR_SHEET.SETTING.SHOW_LEGENDARY_ACTIONS.KEY),
      showLegendaryResistance: getSetting(CONSTANTS.ACTOR_SHEET.SETTING.SHOW_LEGENDARY_RESISTANCE.KEY),
      showManageCurrency: getSetting(CONSTANTS.ACTOR_SHEET.SETTING.SHOW_MANAGE_CURRENCY.KEY),
      showUseLairAction: getSetting(CONSTANTS.ACTOR_SHEET.SETTING.SHOW_USE_LAIR_ACTION.KEY)
    };
  }

  /* -------------------------------------------- */

  /**
   * Reset the form to default settings.
   */
  static async reset() {
    const reset = async () => {
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
   *
   * @param {Event} event The event that triggered the action.
   * @param {HTMLFormElement} form The form element.
   * @param {object} formData The form data.
   */
  static async submit(event, form, formData) {
    await Promise.all([
      setFlag(game.user, CONSTANTS.ACTOR_SHEET.SETTING.AUTO_FADE_SHEET.KEY, formData.object.autoFadeSheet),
      setFlag(game.user, CONSTANTS.ACTOR_SHEET.SETTING.AUTO_MINIMISE_SHEET.KEY, formData.object.autoMinimiseSheet),
      setFlag(game.user, CONSTANTS.ACTOR_SHEET.SETTING.SHEET_SCALE.KEY, formData.object.sheetScale)
    ]);

    if ( game.user.isGM ) {
      await Promise.all([
        setSetting(CONSTANTS.ACTOR_SHEET.SETTING.BANNER_IMAGE.KEY, formData.object.bannerImage),
        setSetting(CONSTANTS.ACTOR_SHEET.SETTING.SHOW_DEATH_SAVES.KEY, formData.object.showDeathSaves),
        setSetting(CONSTANTS.ACTOR_SHEET.SETTING.SHOW_ENCUMBRANCE.KEY, formData.object.showEncumbrance),
        setSetting(CONSTANTS.ACTOR_SHEET.SETTING.SHOW_EXHAUSTION.KEY, formData.object.showExhaustion),
        setSetting(CONSTANTS.ACTOR_SHEET.SETTING.SHOW_INSPIRATION.KEY, formData.object.showInspiration),
        setSetting(CONSTANTS.ACTOR_SHEET.SETTING.SHOW_LEGENDARY_ACTIONS.KEY, formData.object.showLegendaryActions),
        setSetting(CONSTANTS.ACTOR_SHEET.SETTING.SHOW_LEGENDARY_RESISTANCE.KEY,
          formData.object.showLegendaryResistance),
        setSetting(CONSTANTS.ACTOR_SHEET.SETTING.SHOW_MANAGE_CURRENCY.KEY, formData.object.showManageCurrency),
        setSetting(CONSTANTS.ACTOR_SHEET.SETTING.SHOW_USE_LAIR_ACTION.KEY, formData.object.showUseLairAction)
      ]);
    }
  }
}
