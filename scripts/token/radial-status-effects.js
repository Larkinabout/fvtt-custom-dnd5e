import { MODULE, CONSTANTS } from "../constants.js";
import { getSetting, registerSetting } from "../utils.js";

const constants = CONSTANTS.RADIAL_STATUS_EFFECTS;

/**
 * Whether drop shadow filters should be applied to effect backgrounds.
 * @type {boolean|null}
 */
let useDropShadow = null;

/**
 * Determine whether drop shadow filters should be used.
 * Disabled when Prime Performance is active (as bitmap caching breaks PIXI filters)
 * or when core performance mode is Medium or lower.
 * @returns {boolean}
 */
function shouldUseDropShadow() {
  if ( !PIXI.filters?.DropShadowFilter ) return false;
  if ( game.modules.get("fvtt-perf-optim")?.active ) return false;
  const perfMode = game.settings.get("core", "performanceMode") ?? CONST.CANVAS_PERFORMANCE_MODES.MAX;
  if ( perfMode <= CONST.CANVAS_PERFORMANCE_MODES.MED ) return false;
  return true;
}

/**
 * Register settings.
 */
export function register() {
  registerSettings();
}

/* -------------------------------------------- */

/**
 * Register settings.
 */
function registerSettings() {
  registerSetting(
    constants.SETTING.KEY,
    {
      name: game.i18n.localize("CUSTOM_DND5E.setting.radialStatusEffects.name"),
      hint: game.i18n.localize("CUSTOM_DND5E.setting.radialStatusEffects.hint"),
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
 * Apply radial status effect positioning to a token's effects container.
 * Called from the shared _refreshEffects wrapper in condition-levels.js.
 * @param {Token} token Token
 */
export function applyRadialEffects(token) {
  if ( !getSetting(constants.SETTING.KEY) ) return;

  let i = 0;
  const gridSize = token.scene?.grid?.size ?? 100;
  const gridScale = gridSize / 100;
  const tokenSize = Math.min(token.document?.height, token.document?.width) ?? 1;
  const tokenTileFactor = token.document?.width ?? 1;
  const scaledSize = 12 * getIconScale(tokenSize) * gridScale;
  const max = getMaxIcons(token);
  const radius = getSizeOffset(tokenSize) * tokenTileFactor * gridSize;
  const initialRotation = (0.5 + ((1 / max) * Math.PI)) * Math.PI;
  const halfGridSize = gridSize * tokenTileFactor / 2;
  const bg = token.effects.bg.clear();

  if ( useDropShadow === null ) useDropShadow = shouldUseDropShadow();
  if ( useDropShadow && !bg.filters?.length ) {
    bg.filters = [new PIXI.filters.DropShadowFilter({
      blur: 2,
      quality: 2,
      alpha: 0.5,
      offset: { x: 1, y: 1 }
    })];
  }

  for ( const effect of token.effects.children ) {
    if ( effect === bg || effect === token.effects.overlay ) continue;

    effect.anchor.set(0.5);
    effect.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
    effect.width = scaledSize;
    effect.height = scaledSize;

    const src = effect.texture?.textureCacheIds?.[0] ?? effect.texture?.baseTexture?.resource?.src ?? "";
    if ( !effect.mask && !src.endsWith(".svg") ) {
      const texRadius = Math.min(effect.texture.width, effect.texture.height) / 2;
      const mask = new PIXI.Graphics();
      mask.beginFill(0xffffff);
      mask.drawCircle(0, 0, texRadius);
      mask.endFill();
      effect.addChild(mask);
      effect.mask = mask;
    }

    const angle = ((i / max) * 2 * Math.PI) + initialRotation;
    effect.position.x = ((radius * Math.cos(angle)) / 2) + halfGridSize;
    effect.position.y = (((-radius * Math.sin(angle)) / 2) + halfGridSize);

    drawBackground(effect, bg, gridScale);
    i++;
  }
}

/**
 * Get icon scale factor based on token size.
 * @param {number} size Token size in grid units
 * @returns {number} Scale factor
 */
function getIconScale(size) {
  if ( size >= 2.5 ) return size / 2;
  if ( size >= 1.5 ) return size * 0.7;
  return 1.4;
}

/* -------------------------------------------- */

/**
 * Get the maximum number of icon slots in the ring.
 * @param {Token} token Token
 * @returns {number} Maximum number of icons
 */
function getMaxIcons(token) {
  if ( token?.document.width < 1 ) return 9;
  if ( token?.document.width === 1 ) return 16;
  if ( token?.document.width === 2 ) return 28;
  return 40;
}

/* -------------------------------------------- */

/**
 * Get the radial offset multiplier based on token size.
 * @param {number} size Token size in grid units
 * @returns {number} Offset multiplier
 */
function getSizeOffset(size) {
  if ( size < 1 ) return 1.4;
  if ( size === 1 ) return 1.25;
  if ( size === 2 ) return 1.125;
  return 1.075;
}

/* -------------------------------------------- */

/**
 * Draw a circular background behind an icon.
 * @param {PIXI.Sprite} icon Icon sprite
 * @param {PIXI.Graphics} bg Background graphics
 * @param {number} gridScale Grid scale factor
 */
function drawBackground(icon, bg, gridScale) {
  const radius = (icon.width / 2) + (icon.width * 0.1);
  bg.beginFill(0x242731);
  bg.drawCircle(icon.position.x, icon.position.y, radius);
  bg.endFill();
  bg.lineStyle(gridScale, 0x9f9275, 1, 1);
  bg.drawCircle(icon.position.x, icon.position.y, radius);
  bg.lineStyle(0);
}
