import { MODULE } from "../constants.js";
import { c5eLoadTemplates } from "../utils.js";

const TEMPLATE = `modules/${MODULE.ID}/templates/custom-rest-dialog.hbs`;

let ShortRestDialogClass;
let CustomRestDialog;

/**
 * Register the custom rest dialog class.
 */
export function register() {
  ShortRestDialogClass = CONFIG.DND5E.restTypes.short.dialogClass;
  const { BooleanField } = foundry.data.fields;

  CustomRestDialog = class CustomRestDialog extends ShortRestDialogClass {
    /** @override */
    static DEFAULT_OPTIONS = {
      classes: ["custom-rest"]
    };

    /* -------------------------------------------- */

    /** @inheritDoc */
    static PARTS = {
      ...super.PARTS,
      content: {
        template: TEMPLATE
      }
    };

    /* -------------------------------------------- */

    /** @inheritDoc */
    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      const restConfig = CONFIG.DND5E.restTypes[this.config.type];

      // Rest info hint
      if ( restConfig?.hint ) {
        context.hint = restConfig.hint;
      } else {
        const type = this.config.type?.capitalize();
        const variant = context.isGroup ? "Group" : "Normal";
        const defaultKey = `DND5E.REST.${type}.Hint.${variant}`;
        if ( game.i18n.has(defaultKey) ) {
          context.hint = game.i18n.localize(defaultKey);
        }
      }

      // Remove hit dice if not enabled
      if ( !restConfig?.hitDice ) {
        delete context.hitDice;
        delete context.autoRoll;
      }

      // Bastion turn (from LongRestDialog)
      const { enabled } = game.settings.get("dnd5e", "bastionConfiguration");
      if ( game.user.isGM && context.isGroup && enabled && restConfig?.advanceBastionTurn ) {
        context.fields.unshift({
          field: new BooleanField({ label: game.i18n.localize("DND5E.Bastion.Action.BastionTurn") }),
          input: context.inputs.createCheckboxInput,
          name: "advanceBastionTurn",
          value: context.config.advanceBastionTurn
        });
      }

      return context;
    }
  };

  c5eLoadTemplates([TEMPLATE]);
}

/* -------------------------------------------- */

/**
 * Get the CustomRestDialog class.
 * @returns {typeof CustomRestDialog} CustomRestDialog class
 */
export function getCustomRestDialog() {
  return CustomRestDialog;
}
