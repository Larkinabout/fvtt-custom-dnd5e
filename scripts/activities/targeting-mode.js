import { hideApplications } from "../utils.js";

/**
 * Targeting interaction mode.
 * Prompts the user to select targets on the canvas before an activity executes.
 */
export class TargetingMode {
  /**
   * Create a TargetingMode instance.
   * @param {object} options
   * @param {object} options.activity The activity being used
   * @param {number} options.count Required number of targets
   * @param {string} options.typeLabel Localized target type label (e.g. "Creature")
   * @param {object} options.usageConfig The usage configuration
   * @param {object} options.dialogConfig The dialog configuration
   * @param {object} options.messageConfig The message configuration
   */
  constructor({ activity, count, typeLabel, usageConfig, dialogConfig, messageConfig }) {
    this.activity = activity;
    this.count = count;
    this.typeLabel = typeLabel;
    this.usageConfig = usageConfig;
    this.dialogConfig = dialogConfig;
    this.messageConfig = messageConfig;
    this._resolve = null;
    this._previousControl = null;
    this._previousTool = null;
    this._restoreApplications = null;
    this._indicator = null;
    this._targetTokenHookId = null;
    this._onTargetToken = this._onTargetToken.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onContextMenu = this._onContextMenu.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
  }

  /* -------------------------------------------- */
  /*  Static API                                  */
  /* -------------------------------------------- */

  /**
   * Activate the targeting mode.
   * @param {object} options
   * @param {object} options.activity The activity being used
   * @param {number} options.count Required number of targets
   * @param {string} options.typeLabel Localized target type label
   * @param {object} options.usageConfig The usage configuration
   * @param {object} options.dialogConfig The dialog configuration
   * @param {object} options.messageConfig The message configuration
   * @returns {Promise<boolean>} Whether targeting was completed
   */
  static async activate(options) {
    const mode = new TargetingMode(options);
    return mode._start();
  }

  /* -------------------------------------------- */
  /*  Lifecycle                                   */
  /* -------------------------------------------- */

  /**
   * Start the targeting mode.
   * @returns {Promise<boolean>} Whether targeting was completed
   */
  async _start() {
    return new Promise(async resolve => {
      this._resolve = resolve;

      this._previousControl = ui.controls.control?.name;
      this._previousTool = ui.controls.tool?.name;
      this._restoreApplications = await hideApplications();
      this._createIndicator();
      ui.controls.activate({ control: "tokens", tool: "target" });
      this._attachListeners();
      ui.notifications.info(game.i18n.localize("CUSTOM_DND5E.activities.targeting.selectTargets"));
    });
  }

  /* -------------------------------------------- */

  /**
   * Clean up the targeting mode.
   */
  _cleanup() {
    this._detachListeners();
    if ( this._indicator ) {
      this._indicator.remove();
      this._indicator = null;
    }
    ui.controls.activate({ control: this._previousControl, tool: this._previousTool });
    if ( this._restoreApplications ) this._restoreApplications();
  }

  /* -------------------------------------------- */

  /**
   * Complete targeting and resolve as successful.
   */
  _complete() {
    this._cleanup();
    this._resolve(true);
  }

  /* -------------------------------------------- */

  /**
   * Cancel targeting and resolve as unsuccessful.
   */
  _cancel() {
    this._cleanup();
    this._resolve(false);
  }

  /* -------------------------------------------- */
  /*  Indicator                                   */
  /* -------------------------------------------- */

  /**
   * Create and append the cursor indicator element.
   */
  _createIndicator() {
    const indicator = document.createElement("div");
    indicator.id = "custom-dnd5e-targeting-indicator";
    indicator.textContent = this._getIndicatorText();
    document.body.appendChild(indicator);
    this._indicator = indicator;
  }

  /* -------------------------------------------- */

  /**
   * Update the indicator text.
   */
  _updateIndicator() {
    if ( this._indicator ) {
      this._indicator.textContent = this._getIndicatorText();
    }
  }

  /* -------------------------------------------- */

  /**
   * Get the indicator text.
   * @returns {string} The text, e.g. "0/1 Creature"
   */
  _getIndicatorText() {
    return `${game.user.targets.size}/${this.count} ${this.typeLabel}`;
  }

  /* -------------------------------------------- */
  /*  Event Listeners                             */
  /* -------------------------------------------- */

  /**
   * Attach event listeners.
   */
  _attachListeners() {
    this._targetTokenHookId = Hooks.on("targetToken", this._onTargetToken);
    document.addEventListener("keydown", this._onKeyDown);
    document.addEventListener("contextmenu", this._onContextMenu);
    document.addEventListener("pointermove", this._onPointerMove);
  }

  /* -------------------------------------------- */

  /**
   * Detach event listeners.
   */
  _detachListeners() {
    if ( this._targetTokenHookId !== null ) {
      Hooks.off("targetToken", this._targetTokenHookId);
      this._targetTokenHookId = null;
    }
    document.removeEventListener("keydown", this._onKeyDown);
    document.removeEventListener("contextmenu", this._onContextMenu);
    document.removeEventListener("pointermove", this._onPointerMove);
  }

  /* -------------------------------------------- */

  /**
   * Handle the targetToken hook.
   * @param {User} user The user who targeted/untargeted
   * @param {Token} token The token being targeted/untargeted
   * @param {boolean} targeted Whether the token is now targeted
   */
  _onTargetToken(user, token, targeted) {
    if ( user.id !== game.user.id ) return;
    this._updateIndicator();
    if ( game.user.targets.size >= this.count ) this._complete();
  }

  /* -------------------------------------------- */

  /**
   * Handle keydown events.
   * @param {KeyboardEvent} event The keyboard event
   */
  _onKeyDown(event) {
    if ( event.key === "Enter" ) this._complete();
    else if ( event.key === "Escape" ) this._cancel();
  }

  /* -------------------------------------------- */

  /**
   * Handle right-click to cancel.
   * @param {MouseEvent} event The context menu event
   */
  _onContextMenu(event) {
    event.preventDefault();
    this._cancel();
  }

  /* -------------------------------------------- */

  /**
   * Handle pointer move to reposition the indicator.
   * @param {PointerEvent} event The pointer event
   */
  _onPointerMove(event) {
    if ( this._indicator ) {
      this._indicator.style.left = `${event.clientX + 15}px`;
      this._indicator.style.top = `${event.clientY + 15}px`;
    }
  }
}
