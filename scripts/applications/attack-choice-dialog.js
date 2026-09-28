/**
 * Dialog for choosing which attack to make against a target.
 */
export class AttackChoiceDialog extends dnd5e.applications.api.Application5e {
  /**
   * Create the dialog.
   * @param {object[]} choices
   * @param {object} [options]
   */
  constructor(choices, options = {}) {
    super(options);
    this.#choices = choices;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["activity-choice", "custom-dnd5e-attack-choice"],
    actions: {
      choose: AttackChoiceDialog.#onChoose
    },
    position: {
      width: "auto"
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    choices: {
      template: "systems/dnd5e/templates/activity/activity-choices.hbs"
    }
  };

  /* -------------------------------------------- */

  /**
   * Choices shown as buttons.
   * @type {object[]}
   */
  #choices;

  /* -------------------------------------------- */

  /**
   * Id of the chosen button.
   * @type {string|null}
   */
  choice = null;

  /* -------------------------------------------- */
  /*  RENDERING                                   */
  /* -------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    return {
      ...await super._prepareContext(options),
      activities: this.#choices
    };
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _onRender(context, options) {
    super._onRender(context, options);
    const columns = Math.ceil(Math.sqrt(this.#choices.length));
    this.element.querySelector("menu")?.style.setProperty("--custom-dnd5e-columns", columns);
  }

  /* -------------------------------------------- */
  /*  EVENT HANDLERS                              */
  /* -------------------------------------------- */

  /**
   * Remember the chosen button and close.
   * @this {AttackChoiceDialog}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #onChoose(event, target) {
    this.choice = target.dataset.activityId;
    this.close();
  }

  /* -------------------------------------------- */
  /*  FACTORY METHODS                             */
  /* -------------------------------------------- */

  /**
   * Show the dialog and wait for a choice.
   * @param {object[]} choices
   * @param {object} [options]
   * @returns {Promise<string|null>} Id of the chosen button
   */
  static create(choices, options = {}) {
    return new Promise(resolve => {
      const dialog = new this(choices, options);
      dialog.addEventListener("close", () => resolve(dialog.choice), { once: true });
      dialog.render({ force: true });
    });
  }
}
