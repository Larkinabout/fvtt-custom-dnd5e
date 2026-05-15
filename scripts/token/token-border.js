import { MODULE, CONSTANTS } from "../constants.js";
import { getSetting, registerSetting } from "../utils.js";

const SETTING = CONSTANTS.TOKEN.SETTING;

/**
 * Default border thickness.
 */
const DEFAULT_BORDER_THICKNESS_PX = 6;

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
    SETTING.BORDER_ENABLE.KEY,
    {
      name: game.i18n.localize(SETTING.BORDER_ENABLE.NAME),
      hint: game.i18n.localize(SETTING.BORDER_ENABLE.HINT),
      scope: "world",
      config: false,
      requiresReload: true,
      type: Boolean,
      default: false
    }
  );

  registerSetting(
    SETTING.BORDER_SHAPE.KEY,
    {
      name: game.i18n.localize(SETTING.BORDER_SHAPE.NAME),
      hint: game.i18n.localize(SETTING.BORDER_SHAPE.HINT),
      scope: "world",
      config: false,
      requiresReload: true,
      type: String,
      default: "square",
      choices: {
        circle: game.i18n.localize("CUSTOM_DND5E.circle"),
        square: game.i18n.localize("CUSTOM_DND5E.square")
      }
    }
  );

  registerSetting(
    SETTING.BORDER_THICKNESS.KEY,
    {
      name: game.i18n.localize(SETTING.BORDER_THICKNESS.NAME),
      hint: game.i18n.localize(SETTING.BORDER_THICKNESS.HINT),
      scope: "world",
      config: false,
      requiresReload: true,
      type: Number,
      default: DEFAULT_BORDER_THICKNESS_PX
    }
  );

  registerSetting(
    SETTING.BORDER_SCALE.KEY,
    {
      name: game.i18n.localize(SETTING.BORDER_SCALE.NAME),
      hint: game.i18n.localize(SETTING.BORDER_SCALE.HINT),
      scope: "world",
      config: false,
      requiresReload: true,
      type: Number,
      default: 1
    }
  );
}

/* -------------------------------------------- */

/**
 * Register patches.
 */
function registerPatches() {
  if ( !getSetting(SETTING.BORDER_ENABLE.KEY) ) return;
  libWrapper.register(MODULE.ID, "foundry.canvas.placeables.Token.prototype._refreshBorder", tokenRefreshBorderPatch, "WRAPPER");
}

/* -------------------------------------------- */

/**
 * Patch for refreshing token border.
 * @param {Function} wrapped Original function
 */
function tokenRefreshBorderPatch(wrapped) {
  wrapped();

  const shape = getSetting(SETTING.BORDER_SHAPE.KEY);
  const thickness = Number(getSetting(SETTING.BORDER_THICKNESS.KEY)) || DEFAULT_BORDER_THICKNESS_PX;
  const scale = Number(getSetting(SETTING.BORDER_SCALE.KEY)) || 1;
  if ( shape === "square" && thickness === DEFAULT_BORDER_THICKNESS_PX && scale === 1 ) return;

  this.border.clear();
  this.border.lineStyle({ width: thickness, color: 0xFFFFFF, alignment: 0, join: PIXI.LINE_JOIN.ROUND });

  if ( shape === "circle" ) {
    this.border.drawCircle(this.w / 2, this.h / 2, (this.w / 2) * scale);
    return;
  }

  // Square
  const cx = this.w / 2;
  const cy = this.h / 2;
  const sw = this.w * scale;
  const sh = this.h * scale;
  this.border.drawRect(cx - sw / 2, cy - sh / 2, sw, sh);
}
