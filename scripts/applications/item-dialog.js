/**
 * Dialog5e subclass for the item interaction dialog.
 */
export class ItemDialog extends dnd5e.applications.api.Dialog5e {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    actions: {
      ok: ItemDialog.#onResolve,
      yes: ItemDialog.#onResolve,
      no: ItemDialog.#onResolve,
      cancel: ItemDialog.#onResolve
    },
    classes: ["custom-dnd5e-item-dialog", "titlebar"],
    position: { width: 400 }
  };

  /* -------------------------------------------- */

  /** Result reported via the close event. */
  result = null;

  /* -------------------------------------------- */

  /**
   * Resolve and close.
   * @this {ItemDialog}
   * @param {Event} event
   * @param {HTMLElement} target
   */
  static async #onResolve(event, target) {
    const action = target.dataset.action;
    this.result = this._resolve ? this._resolve(action, this) : null;
    this.close();
  }

  /* -------------------------------------------- */

  /**
   * Open a confirm dialog.
   * @param {object} args
   * @param {string} args.title
   * @param {string} args.content
   * @returns {Promise<boolean>}
   */
  static confirm({ title, content }) {
    return new Promise(resolve => {
      const dialog = new this({
        window: { title },
        content,
        buttons: [
          {
            action: "yes",
            icon: "fa-solid fa-check",
            label: game.i18n.localize("CUSTOM_DND5E.yes"),
            default: true,
            type: "button"
          },
          {
            action: "no",
            icon: "fa-solid fa-times",
            label: game.i18n.localize("CUSTOM_DND5E.no"),
            type: "button"
          }
        ]
      });
      dialog._resolve = action => action === "yes";
      dialog.addEventListener("close", () => resolve(!!dialog.result), { once: true });
      dialog.render({ force: true });
    });
  }

  /* -------------------------------------------- */

  /**
   * Open a quantity prompt with an optional warning paragraph.
   * @param {object} args
   * @param {string} args.title
   * @param {string} args.prompt
   * @param {number} args.max
   * @param {string} [args.warning]
   * @returns {Promise<number|null>}
   */
  static quantity({ title, prompt, max, warning }) {
    const warningHtml = warning
      ? `<p class="custom-dnd5e-item-dialog-warning">${warning}</p>`
      : "";
    const content = `
      ${warningHtml}
      <p>${prompt}</p>
      <range-picker name="quantity" value="${max}" min="1" max="${max}" step="1"></range-picker>
    `;
    return new Promise(resolve => {
      const dialog = new this({
        window: { title },
        content,
        buttons: [
          {
            action: "ok",
            icon: "fa-solid fa-check",
            label: game.i18n.localize("CUSTOM_DND5E.ok"),
            default: true,
            type: "button"
          },
          {
            action: "cancel",
            icon: "fa-solid fa-times",
            label: game.i18n.localize("CUSTOM_DND5E.cancel"),
            type: "button"
          }
        ]
      });
      dialog._resolve = (action, d) => {
        if ( action !== "ok" ) return null;
        const input = d.element.querySelector('[name="quantity"]');
        const value = Number(input?.value) || 1;
        return Math.max(1, Math.min(value, max));
      };
      dialog.addEventListener("close", () => resolve(dialog.result), { once: true });
      dialog.render({ force: true });
    });
  }
}
