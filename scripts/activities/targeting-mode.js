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
    this._originalSetTarget = null;
    this._onTargetToken = this._onTargetToken.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onContextMenu = this._onContextMenu.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
  }

  /* -------------------------------------------- */
  /* STATIC API                                   */
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
  /*  LIFECYCLE                                   */
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
  /*  INDICATOR                                   */
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
  /*  EVENT LISTENERS                             */
  /* -------------------------------------------- */

  /**
   * Attach event listeners.
   */
  _attachListeners() {
    this._targetTokenHookId = Hooks.on("targetToken", this._onTargetToken);
    document.addEventListener("keydown", this._onKeyDown);
    document.addEventListener("contextmenu", this._onContextMenu);
    document.addEventListener("pointermove", this._onPointerMove);
    this._patchSetTarget();
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
    this._unpatchSetTarget();
  }

  /* -------------------------------------------- */

  /**
   * Patch Token.setTarget so clicks made via the target tool never release other targets,
   * making each click a simple toggle. Foundry's click callback is captured at token
   * construction, so we patch setTarget (still resolved via the prototype at call time)
   * rather than _onClickLeft.
   */
  _patchSetTarget() {
    const TokenClass = foundry.canvas.placeables.Token;
    const original = TokenClass.prototype.setTarget;
    this._originalSetTarget = original;
    TokenClass.prototype.setTarget = function(targeted = true, options = {}) {
      if ( game.activeTool === "target" ) options = { ...options, releaseOthers: false };
      return original.call(this, targeted, options);
    };
  }

  /* -------------------------------------------- */

  /**
   * Restore the original Token.setTarget method.
   */
  _unpatchSetTarget() {
    if ( !this._originalSetTarget ) return;
    foundry.canvas.placeables.Token.prototype.setTarget = this._originalSetTarget;
    this._originalSetTarget = null;
  }

  /* -------------------------------------------- */

  /**
   * Handle the targetToken hook.
   * @param {User} user User who targeted/untargeted
   * @param {Token} token Token being targeted/untargeted
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
   * @param {KeyboardEvent} event Keyboard event
   */
  _onKeyDown(event) {
    if ( event.key === "Enter" ) this._complete();
    else if ( event.key === "Escape" ) this._cancel();
  }

  /* -------------------------------------------- */

  /**
   * Handle right-click to cancel.
   * @param {MouseEvent} event Context menu event
   */
  _onContextMenu(event) {
    event.preventDefault();
    this._cancel();
  }

  /* -------------------------------------------- */

  /**
   * Handle pointer move to reposition the indicator.
   * @param {PointerEvent} event Pointer event
   */
  _onPointerMove(event) {
    if ( this._indicator ) {
      this._indicator.style.left = `${event.clientX + 15}px`;
      this._indicator.style.top = `${event.clientY + 15}px`;
    }
  }
}
