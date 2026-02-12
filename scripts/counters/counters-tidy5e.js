import { CONSTANTS } from "../constants.js";
import { getSetting } from "../utils.js";
import { mergeCounters, setupCounterInteractions } from "./counters.js";

/**
 * Register Tidy 5e Sheets integration for counters.
 */
export function register() {
  if ( !game.modules.get("tidy5e-sheet")?.active ) return;

  Hooks.on("tidy5e-sheet.ready", api => {
    registerTab(api, "registerCharacterTab",
      CONSTANTS.COUNTERS.SETTING.CHARACTER_COUNTERS.KEY);
    registerTab(api, "registerNpcTab",
      CONSTANTS.COUNTERS.SETTING.NPC_COUNTERS.KEY);
  });
}

/* -------------------------------------------- */

/**
 * Register a counters tab with the Tidy 5e Sheets API.
 * @param {object} api The Tidy 5e Sheets API
 * @param {string} method The registration method name
 * @param {string} settingKey The counter setting key
 */
function registerTab(api, method, settingKey) {
  const tab = new api.models.HandlebarsTab({
    tabId: "custom-dnd5e-counters",
    title: game.i18n.localize("CUSTOM_DND5E.counters"),
    iconClass: "fas fa-tally",
    path: "/modules/custom-dnd5e/templates/counters/tidy5e/counters-actor.hbs",
    enabled: context => getSetting(CONSTANTS.COUNTERS.SETTING.COUNTERS.KEY),
    getData: context => {
      const actor = context.actor;
      const counters = mergeCounters(actor, settingKey);
      return { ...context, counters, unlocked: context.unlocked };
    },
    onRender: ({ app, tabContentsElement }) => {
      const actor = app.actor;
      const container = tabContentsElement.querySelector("#custom-dnd5e-counters");
      if ( !container ) return;
      const counters = mergeCounters(actor, settingKey);
      setupCounterInteractions(actor, counters, container, app.isEditable);
    }
  });

  api[method](tab, { layout: "all" });
}
