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

  registerSetting(
    SETTING.BORDER_SCALE_WITH_TOKEN.KEY,
    {
      name: game.i18n.localize(SETTING.BORDER_SCALE_WITH_TOKEN.NAME),
      hint: game.i18n.localize(SETTING.BORDER_SCALE_WITH_TOKEN.HINT),
      scope: "world",
      config: false,
      requiresReload: true,
      type: Boolean,
      default: false
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
  Hooks.on("updateToken", onUpdateTokenForBorderScale);
}

/* -------------------------------------------- */

/**
 * Force a border refresh when a token's image scale changes.
 * @param {TokenDocument} doc
 * @param {object} changed
 */
function onUpdateTokenForBorderScale(doc, changed) {
  if ( !getSetting(SETTING.BORDER_SCALE_WITH_TOKEN.KEY) ) return;
  const tex = changed?.texture;
  const ringSubject = changed?.ring?.subject;
  const textureScaleChanged = tex && (("scaleX" in tex) || ("scaleY" in tex));
  const ringScaleChanged = ringSubject && ("scale" in ringSubject);
  if ( !textureScaleChanged && !ringScaleChanged ) return;
  doc.object?.renderFlags?.set({ refreshBorder: true });
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
  const userScale = Number(getSetting(SETTING.BORDER_SCALE.KEY)) || 1;
  const scaleWithToken = getSetting(SETTING.BORDER_SCALE_WITH_TOKEN.KEY);
  let tokenScale = 1;
  if ( scaleWithToken ) {
    tokenScale = this.document?.texture?.scaleX ?? 1;
    if ( this.hasDynamicRing && CONFIG.Token.ring.isGridFitMode ) {
      tokenScale *= this.ring?.subjectScaleAdjustment ?? 1;
    }
  }
  const scale = userScale * tokenScale;
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
