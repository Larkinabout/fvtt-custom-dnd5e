import { CONSTANTS, JOURNAL_HELP_BUTTON, MODULE, SHEET_TYPE } from "../constants.js";
import { getFlag, setFlag, getSetting, setSetting } from "../utils.js";
import { CustomDnd5eForm } from "./custom-dnd5e-form.js";

/**
 * Class representing the Actor Sheet Form.
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
    this.headerButton = JOURNAL_HELP_BUTTON;
    this.headerButton.uuid = CONSTANTS.ACTOR_SHEET.UUID;
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
      autoDetachActorSheet: getFlag(game.user, CONSTANTS.ACTOR_SHEET.SETTING.AUTO_DETACH_ACTOR_SHEET.KEY),
      openSingleActorSheet: getFlag(game.user, CONSTANTS.ACTOR_SHEET.SETTING.OPEN_SINGLE_ACTOR_SHEET.KEY),
      openActorSheetOnSelect: getFlag(game.user, CONSTANTS.ACTOR_SHEET.SETTING.OPEN_ACTOR_SHEET_ON_SELECT.KEY),
      openDetachShowControls: getFlag(game.user, CONSTANTS.ACTOR_SHEET.SETTING.OPEN_DETACH_SHOW_CONTROLS.KEY),
      openDetachActorTypes: ActorSheetForm.getActorTypeChoices(),
      autoFadeSheet: getFlag(game.user, CONSTANTS.ACTOR_SHEET.SETTING.AUTO_FADE_SHEET.KEY),
      autoMinimiseSheet: getFlag(game.user, CONSTANTS.ACTOR_SHEET.SETTING.AUTO_MINIMISE_SHEET.KEY),
      bannerImage: getSetting(CONSTANTS.ACTOR_SHEET.SETTING.BANNER_IMAGE.KEY),
      sheetScale: getFlag(game.user, CONSTANTS.ACTOR_SHEET.SETTING.SHEET_SCALE.KEY),
      showDeathSaves: getSetting(CONSTANTS.ACTOR_SHEET.SETTING.SHOW_DEATH_SAVES.KEY),
      showEncumbrance: getSetting(CONSTANTS.ACTOR_SHEET.SETTING.SHOW_ENCUMBRANCE.KEY),
      showExhaustion: getSetting(CONSTANTS.ACTOR_SHEET.SETTING.SHOW_EXHAUSTION.KEY),
      showInspiration: getSetting(CONSTANTS.ACTOR_SHEET.SETTING.SHOW_INSPIRATION.KEY),
      showJumpDistance: getSetting(CONSTANTS.ACTOR_SHEET.SETTING.SHOW_JUMP_DISTANCE.KEY),
      showLegendaryActions: getSetting(CONSTANTS.ACTOR_SHEET.SETTING.SHOW_LEGENDARY_ACTIONS.KEY),
      showLegendaryResistance: getSetting(CONSTANTS.ACTOR_SHEET.SETTING.SHOW_LEGENDARY_RESISTANCE.KEY),
      showManageCurrency: getSetting(CONSTANTS.ACTOR_SHEET.SETTING.SHOW_MANAGE_CURRENCY.KEY),
      showTokenDisposition: getSetting(CONSTANTS.ACTOR_SHEET.SETTING.SHOW_TOKEN_DISPOSITION.KEY),
      showUseLairAction: getSetting(CONSTANTS.ACTOR_SHEET.SETTING.SHOW_USE_LAIR_ACTION.KEY)
    };
  }

  /* -------------------------------------------- */

  /**
   * Get the actor-type choices for the auto-detach filter.
   * An unset or empty filter falls back to the default selection.
   *
   * @returns {Array<{key: string, label: string, checked: boolean}>} Actor type choices.
   */
  static getActorTypeChoices() {
    const setting = CONSTANTS.ACTOR_SHEET.SETTING.OPEN_DETACH_ACTOR_TYPES;
    const included = getFlag(game.user, setting.KEY);
    const selected = Array.isArray(included) && included.length > 0 ? included : setting.DEFAULT;
    const types = (game.documentTypes?.Actor ?? []).filter(type => type !== CONST.BASE_DOCUMENT_TYPE);
    return types.map(type => {
      const label = CONFIG.Actor?.typeLabels?.[type];
      return {
        key: type,
        label: label ? game.i18n.localize(label) : type,
        checked: selected.includes(type)
      };
    });
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
    const includedActorTypes = formData.object.openDetachActorTypes ?? [];
    await Promise.all([
      setFlag(game.user, CONSTANTS.ACTOR_SHEET.SETTING.AUTO_DETACH_ACTOR_SHEET.KEY,
        formData.object.autoDetachActorSheet),
      setFlag(game.user, CONSTANTS.ACTOR_SHEET.SETTING.OPEN_SINGLE_ACTOR_SHEET.KEY,
        formData.object.openSingleActorSheet),
      setFlag(game.user, CONSTANTS.ACTOR_SHEET.SETTING.OPEN_ACTOR_SHEET_ON_SELECT.KEY,
        formData.object.openActorSheetOnSelect),
      setFlag(game.user, CONSTANTS.ACTOR_SHEET.SETTING.OPEN_DETACH_SHOW_CONTROLS.KEY,
        formData.object.openDetachShowControls),
      setFlag(game.user, CONSTANTS.ACTOR_SHEET.SETTING.OPEN_DETACH_ACTOR_TYPES.KEY, includedActorTypes),
      setFlag(game.user, CONSTANTS.ACTOR_SHEET.SETTING.AUTO_FADE_SHEET.KEY, formData.object.autoFadeSheet),
      setFlag(game.user, CONSTANTS.ACTOR_SHEET.SETTING.AUTO_MINIMISE_SHEET.KEY, formData.object.autoMinimiseSheet),
      setFlag(game.user, CONSTANTS.ACTOR_SHEET.SETTING.SHEET_SCALE.KEY, formData.object.sheetScale)
    ]);

    ui.controls?.render({ reset: true });

    if ( game.user.isGM ) {
      await Promise.all([
        setSetting(CONSTANTS.ACTOR_SHEET.SETTING.BANNER_IMAGE.KEY, formData.object.bannerImage),
        setSetting(CONSTANTS.ACTOR_SHEET.SETTING.SHOW_DEATH_SAVES.KEY, formData.object.showDeathSaves),
        setSetting(CONSTANTS.ACTOR_SHEET.SETTING.SHOW_ENCUMBRANCE.KEY, formData.object.showEncumbrance),
        setSetting(CONSTANTS.ACTOR_SHEET.SETTING.SHOW_EXHAUSTION.KEY, formData.object.showExhaustion),
        setSetting(CONSTANTS.ACTOR_SHEET.SETTING.SHOW_INSPIRATION.KEY, formData.object.showInspiration),
        setSetting(CONSTANTS.ACTOR_SHEET.SETTING.SHOW_JUMP_DISTANCE.KEY, formData.object.showJumpDistance),
        setSetting(CONSTANTS.ACTOR_SHEET.SETTING.SHOW_LEGENDARY_ACTIONS.KEY, formData.object.showLegendaryActions),
        setSetting(CONSTANTS.ACTOR_SHEET.SETTING.SHOW_LEGENDARY_RESISTANCE.KEY,
          formData.object.showLegendaryResistance),
        setSetting(CONSTANTS.ACTOR_SHEET.SETTING.SHOW_MANAGE_CURRENCY.KEY, formData.object.showManageCurrency),
        setSetting(CONSTANTS.ACTOR_SHEET.SETTING.SHOW_TOKEN_DISPOSITION.KEY, formData.object.showTokenDisposition),
        setSetting(CONSTANTS.ACTOR_SHEET.SETTING.SHOW_USE_LAIR_ACTION.KEY, formData.object.showUseLairAction)
      ]);
    }

    for ( const app of foundry.applications.instances.values() ) {
      if ( SHEET_TYPE[app.constructor.name]?.character ) app.render();
    }
  }
}
