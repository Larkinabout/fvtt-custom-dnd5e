import { CONSTANTS } from "./constants.js";
import { c5eLoadTemplates, registerMenu } from "./utils.js";
import { InterfaceForm } from "./forms/interface-form.js";

const constants = CONSTANTS.INTERFACE;

/**
 * Register menu and load template.
 */
export function register() {
  registerMenu(
    constants.MENU.KEY,
    {
      hint: game.i18n.localize(constants.MENU.HINT),
      label: game.i18n.localize(constants.MENU.LABEL),
      name: game.i18n.localize(constants.MENU.NAME),
      icon: constants.MENU.ICON,
      type: InterfaceForm,
      restricted: true,
      scope: "world"
    }
  );

  c5eLoadTemplates([constants.TEMPLATE.FORM]);
}
