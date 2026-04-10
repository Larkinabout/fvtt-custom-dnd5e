import { CONSTANTS } from "../constants.js";
import { getSetting } from "../utils.js";
import { WorkflowsFormEntity } from "../forms/workflows/workflows-form-entity.js";

const constants = CONSTANTS.WORKFLOWS;

/**
 * Register Tidy 5e Sheets integration for the workflows button.
 */
export function register() {
  if ( !game.modules.get("tidy5e-sheet")?.active ) return;

  Hooks.on("tidy5e-sheet.ready", api => {
    const buttonHtml = `<button type="button" class="custom-dnd5e-workflows-button">
      <i class="fas fa-bolt-lightning"></i> ${game.i18n.localize("CUSTOM_DND5E.form.workflows.title")}
    </button>`;

    const makeContent = () => new api.models.HtmlContent({
      html: buttonHtml,
      injectParams: {
        selector: '[data-tab-contents-for="effects"]',
        position: "afterbegin"
      },
      enabled: context => getSetting(constants.SETTING.ENABLE.KEY)
        && !!context?.editable && !!context?.unlocked,
      onRender: ({ app, element }) => {
        const button = element.querySelector(".custom-dnd5e-workflows-button");
        if ( !button ) return;
        button.addEventListener("click", event => {
          event.preventDefault();
          new WorkflowsFormEntity(app.actor).render(true);
        });
      }
    });

    api.registerCharacterContent(makeContent(), { layout: "all" });
    api.registerNpcContent(makeContent(), { layout: "all" });
  });
}
