/*
MIT License

Copyright (c) 2022 Dorako

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

https://github.com/Dorako/pf2e-dorako-ux/blob/main/LICENSE
*/

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

  libWrapper.register(MODULE.ID, "Token.prototype._refreshEffects", tokenRefreshEffectsPatch, "WRAPPER");
  libWrapper.register(MODULE.ID, "Token.prototype._drawEffect", tokenDrawEffectPatch, "WRAPPER");
  libWrapper.register(MODULE.ID, "Token.prototype._drawOverlay", tokenDrawOverlayPatch, "WRAPPER");
}

/* -------------------------------------------- */

/**
 * Patch for token refresh effects.
 * @param {Function} wrapped The original function
 * @param {...any} args The arguments
 */
function tokenRefreshEffectsPatch(wrapped, ...args) {
  wrapped(...args);

  let i = 0;
  const gridSize = this.scene?.grid?.size ?? 100;
  const bg = this.effects.bg.clear();

  for (const effect of this.effects.children) {
    if ( effect === bg ) continue;

    // Overlay effect
    if ( effect === this.effects.overlay ) continue;

    // Status effect
    else {
      effect.anchor.set(0.5);
      const iconScale = getIconScale(Math.min(this.document?.height, this.document?.width));
      const gridScale = gridSize / 100;
      const scaledSize = 12 * iconScale * gridScale;

      effect.width = scaledSize;
      effect.height = scaledSize;

      updateIconPosition(effect, i, this);
      drawBackground(effect, bg, gridScale);
      i++;
    }
  }
}

/* -------------------------------------------- */

/**
 * Patch for token draw effect.
 * @param {Function} wrapped The original function
 * @param {string} src The source
 * @param {number} tint The tint
 * @param {boolean} overlay Whether it is an overlay
 */
async function tokenDrawEffectPatch(wrapped, src, tint, overlay = false) {
  wrapped(null, tint);

  if ( !src ) return;

  const tex = await loadTexture(src, { fallback: "icons/svg/hazard.svg" });
  const icon = new PIXI.Sprite(tex);
  icon.tint = tint ?? 0xFFFFFF;

  if ( !overlay && !src.endsWith(".svg") ) {
    const size = Math.min(icon.width, icon.height);
    const radius = size / 2;

    const mask = new PIXI.Graphics();
    mask.beginFill(0xffffff);
    mask.drawCircle(0, 0, radius);
    mask.endFill();
    icon.addChild(mask);
    icon.mask = mask;
  }

  return this.effects.addChild(icon);
}

/* -------------------------------------------- */

/**
 * Patch for token draw overlay.
 * 
 * @param {Function} wrapped The original function
 * @param {string} src The source
 * @param {number} tint The tint
 * @returns {object} The icon
 */
async function tokenDrawOverlayPatch(wrapped, src, tint) {
  wrapped(null, tint);

  const icon = await this._drawEffect(src, tint, true);
  if ( icon ) icon.alpha = 0.8;
  this.effects.overlay = icon ?? null;
  return icon;
}

/* -------------------------------------------- */

/**
 * Get icon scale based on size.
 * @param {number} size The size
 * @returns {number} The icon scale
 */
function getIconScale(size) {
  if ( size >= 2.5 ) return size / 2;
  if ( size >= 1.5 ) return size * 0.7;
  return 1.4;
}

/* -------------------------------------------- */

/**
 * Update icon position.
 * @param {object} icon The icon
 * @param {number} index The index
 * @param {object} token The token
 */
function updateIconPosition(icon, index, token) {
  const max = getMaxIcons(token);
  const ratio = index / max;
  const gridSize = token?.scene?.grid?.size ?? 100;
  const tokenTileFactor = token?.document?.width ?? 1;
  const sizeOffset = getSizeOffset(Math.min(token?.document?.height, token?.document?.width));
  const offset = sizeOffset * tokenTileFactor * gridSize;
  const initialRotation = (0.5 + (1 / max) * Math.PI) * Math.PI;

  const { x, y } = polarToCartesian(offset, (ratio + 0) * 2 * Math.PI + initialRotation);

  const halfGridSize = gridSize * tokenTileFactor / 2;

  icon.position.x = x / 2 + halfGridSize;
  icon.position.y = -y / 2 + halfGridSize;
}

/* -------------------------------------------- */

/**
 * Get the maximum number of icons.
 * @param {object} token The token
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
 * Get size offset based on size.
 * @param {number} size The size
 * @returns {number} The size offset
 */
function getSizeOffset(size) {
  if ( size < 1 ) return 1.4;
  if ( size === 1 ) return 1.25;
  if ( size === 2 ) return 1.125;
  return 1.075;
}

/* -------------------------------------------- */

/**
 * Convert polar coordinates to Cartesian coordinates.
 * @param {number} radius The radius
 * @param {number} angle The angle
 * @returns {object} The Cartesian coordinates
 */
function polarToCartesian(radius, angle) {
  return {
    x: radius * Math.cos(angle),
    y: radius * Math.sin(angle)
  };
}

/* -------------------------------------------- */

/**
 * Draw background for the icon.
 * @param {object} icon The icon
 * @param {object} background The background
 * @param {number} gridScale The grid scale
 */
function drawBackground(icon, background, gridScale) {
  const radius = (icon.width) / 2 + (icon.width * 0.1);
  background.beginFill(0x333333);
  background.drawCircle(icon.position.x, icon.position.y, radius);
  background.endFill();
  background.lineStyle((2 * gridScale) / 2, 0x9f9275, 1, 0.5);
  background.drawCircle(icon.position.x, icon.position.y, radius);
  background.lineStyle(0);
}
