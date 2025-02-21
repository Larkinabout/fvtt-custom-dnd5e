import { MODULE, CONSTANTS } from "./constants.js";
import { getSetting, registerSetting } from "./utils.js";

/**
 * Register settings and patches.
 */
export function register() {
  registerSettings();
  registerPatches();
}

/* -------------------------------------------- */

/**
 * Register settings.
 */
function registerSettings() {
  registerSetting(
    CONSTANTS.TOKEN.SETTING.BORDER_SHAPE.KEY,
    {
      name: game.i18n.localize("CUSTOM_DND5E.setting.tokenBorderShape.name"),
      hint: game.i18n.localize("CUSTOM_DND5E.setting.tokenBorderShape.hint"),
      scope: "world",
      config: true,
      requiresReload: true,
      type: String,
      default: "square",
      choices: {
        circle: game.i18n.localize("CUSTOM_DND5E.circle"),
        square: game.i18n.localize("CUSTOM_DND5E.square")
      }
    }
  );
}

/* -------------------------------------------- */

/**
 * Register patches.
 */
function registerPatches() {
  if ( getSetting(CONSTANTS.TOKEN.SETTING.BORDER_SHAPE.KEY) === "square" ) return;

  libWrapper.register(MODULE.ID, "Token.prototype._refreshBorder", tokenRefreshBorderPatch, "WRAPPER");
}

/* -------------------------------------------- */

/**
 * Patch for refreshing token border.
 * @param {Function} wrapped The original function
 */
function tokenRefreshBorderPatch(wrapped) {
  wrapped();

  const thickness = CONFIG.Canvas.objectBorderThickness * 1.5;
  const shape = getSetting(CONSTANTS.TOKEN.SETTING.BORDER_SHAPE.KEY);

  if ( shape === "circle" ) {
    this.border.clear();
    this.border.lineStyle({ width: thickness / 2, color: 0xFFFFFF, alignment: 1, join: PIXI.LINE_JOIN.ROUND });
    this.border.drawCircle(this.h / 2, this.w / 2, (this.w - thickness) / 2);
  }
}
