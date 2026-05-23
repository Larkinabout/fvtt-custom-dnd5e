import { CONSTANTS } from "./constants.js";
import { c5eLoadTemplates, registerMenu } from "./utils.js";
import { ItemInteractionsForm } from "./forms/item-interactions/item-interactions-form.js";

const constants = CONSTANTS.ITEM_INTERACTIONS;

/**
 * Register settings.
 */
export function register() {
  registerMenu(
    constants.MENU.KEY,
    {
      hint: game.i18n.localize(constants.MENU.HINT),
      label: game.i18n.localize(constants.MENU.LABEL),
      name: game.i18n.localize(constants.MENU.NAME),
      icon: constants.MENU.ICON,
      type: ItemInteractionsForm,
      restricted: true,
      scope: "world"
    }
  );

  c5eLoadTemplates([constants.TEMPLATE.FORM]);
}
