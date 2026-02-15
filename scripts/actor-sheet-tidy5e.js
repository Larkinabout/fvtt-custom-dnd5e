import { CONSTANTS } from "./constants.js";
import { getSetting } from "./utils.js";

const constants = CONSTANTS.ACTOR_SHEET;

/**
 * Register Tidy 5e Sheets integration for token disposition.
 */
export function register() {
  if ( !game.modules.get("tidy5e-sheet")?.active ) return;

  Hooks.on("tidy5e-sheet.ready", api => {
    registerNpcDisposition(api);
  });
}

/* -------------------------------------------- */

/**
 * Register token disposition content on the Tidy 5e NPC sheet.
 * @param {object} api The Tidy 5e Sheets API
 */
function registerNpcDisposition(api) {
  const content = new api.models.HandlebarsContent({
    path: constants.TEMPLATE.TOKEN_DISPOSITION_TIDY5E,
    injectParams: {
      selector: ".sidebar",
      position: "afterbegin"
    },
    enabled: () => getSetting(constants.SETTING.SHOW_TOKEN_DISPOSITION.KEY),
    getData: context => {
      const actor = context.actor;
      const disposition = actor.isToken
        ? actor.token.disposition
        : actor.prototypeToken.disposition;
      return { disposition };
    },
    onRender: ({ app, element }) => {
      const buttons = element.querySelectorAll(".custom-dnd5e-disposition-button");
      buttons.forEach(button => {
        button.addEventListener("click", async (event) => {
          event.preventDefault();
          const value = Number(button.dataset.disposition);
          if ( app.document.isToken ) {
            await app.document.token.update({ disposition: value });
          } else {
            await app.document.update({ "prototypeToken.disposition": value });
            const tokens = app.document.getActiveTokens(false, true);
            for ( const token of tokens ) {
              await token.update({ disposition: value });
            }
          }
          buttons.forEach(b => b.classList.toggle("active", Number(b.dataset.disposition) === value));
        });
      });
    }
  });

  api.registerNpcContent(content, { layout: "all" });
}
