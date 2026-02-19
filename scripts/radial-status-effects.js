import { MODULE, CONSTANTS } from "./constants.js";
import { getSetting, registerSetting } from "./utils.js";

const constants = CONSTANTS.RADIAL_STATUS_EFFECTS;

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
    constants.SETTING.KEY,
    {
      name: game.i18n.localize("CUSTOM_DND5E.setting.radialStatusEffects.name"),
      hint: game.i18n.localize("CUSTOM_DND5E.setting.radialStatusEffects.hint"),
      scope: "world",
      config: true,
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
  if ( !getSetting(constants.SETTING.KEY) ) return;

  libWrapper.register(MODULE.ID, "foundry.canvas.placeables.Token.prototype._refreshEffects", refreshEffectsPatch, "WRAPPER");
}

/* -------------------------------------------- */

/**
 * Patch for _refreshEffects.
 * @param {Function} wrapped The original function
 * @param {...any} args The arguments
 */
function refreshEffectsPatch(wrapped, ...args) {
  wrapped(...args);

  let i = 0;
  const gridSize = this.scene?.grid?.size ?? 100;
  const gridScale = gridSize / 100;
  const tokenSize = Math.min(this.document?.height, this.document?.width) ?? 1;
  const tokenTileFactor = this.document?.width ?? 1;
  const scaledSize = 12 * getIconScale(tokenSize) * gridScale;
  const max = getMaxIcons(this);
  const radius = getSizeOffset(tokenSize) * tokenTileFactor * gridSize;
  const initialRotation = (0.5 + (1 / max) * Math.PI) * Math.PI;
  const halfGridSize = gridSize * tokenTileFactor / 2;
  const bg = this.effects.bg.clear();

  if ( !bg.filters?.length && PIXI.filters?.DropShadowFilter ) {
    bg.filters = [new PIXI.filters.DropShadowFilter({
      blur: 2,
      quality: 2,
      alpha: 0.5,
      offset: { x: 1, y: 1 }
    })];
  }

  for ( const effect of this.effects.children ) {
    if ( effect === bg || effect === this.effects.overlay ) continue;

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

    const angle = (i / max) * 2 * Math.PI + initialRotation;
    effect.position.x = ((radius * Math.cos(angle)) / 2) + halfGridSize;
    effect.position.y = (((-radius * Math.sin(angle)) / 2) + halfGridSize);

    drawBackground(effect, bg, gridScale);
    i++;
  }
}

/**
 * Get icon scale factor based on token size.
 * @param {number} size The token size in grid units
 * @returns {number} The scale factor
 */
function getIconScale(size) {
  if ( size >= 2.5 ) return size / 2;
  if ( size >= 1.5 ) return size * 0.7;
  return 1.4;
}

/* -------------------------------------------- */

/**
 * Get the maximum number of icon slots in the ring.
 * @param {Token} token The token
 * @returns {number} The maximum number of icons
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
 * @param {number} size The token size in grid units
 * @returns {number} The offset multiplier
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
 * @param {PIXI.Sprite} icon The icon sprite
 * @param {PIXI.Graphics} bg The background graphics
 * @param {number} gridScale The grid scale factor
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
