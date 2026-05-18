import { MODULE, CONSTANTS } from "../constants.js";
import { getSetting, registerSetting } from "../utils.js";
import { addCursorLabelIcon, setCursorLabelIcon, setCursorLabelPosition } from "../interface/cursor-label.js";

const DISABLE_ICON_ID = "custom-dnd5e-cursor-label-radial-disable";
const DELETE_ICON_ID = "custom-dnd5e-cursor-label-radial-delete";
const HOVER_SCALE_FACTOR = 1.2;
const HOVER_ANIM_DURATION = 120;

const constants = CONSTANTS.RADIAL_STATUS_EFFECTS;

/**
 * Whether drop shadow filters should be applied to effect backgrounds.
 * @type {boolean|null}
 */
let useDropShadow = null;

/**
 * Whether the stage-level pointer listener has been installed for this canvas.
 * @type {boolean}
 */
let stageListenerInstalled = false;

/**
 * The currently hovered click registry entry, or null.
 * @type {{sprite: PIXI.Sprite, ae: ActiveEffect, token: Token}|null}
 */
let hoveredEntry = null;

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
 * Register settings, hooks, and libWrapper patches.
 */
export function register() {
  registerSettings();
  Hooks.on("canvasReady", onCanvasReady);
  Hooks.on("canvasTearDown", onCanvasTearDown);
  registerStatePatch();
}

/* -------------------------------------------- */

/**
 * Patch for Token#_refreshState to render status effects above the token border.
 */
function registerStatePatch() {
  if ( typeof libWrapper === "undefined" ) return;
  libWrapper.register(
    MODULE.ID,
    "foundry.canvas.placeables.Token.prototype._refreshState",
    function(wrapped, ...args) {
      const result = wrapped(...args);
      if ( !getSetting(constants.SETTING.KEY) ) return result;
      if ( this.border?.zIndex === Infinity ) this.border.zIndex = 100;
      if ( this.effects ) this.effects.zIndex = 200;
      return result;
    },
    "WRAPPER"
  );
}

/* -------------------------------------------- */

/**
 * On canvas ready.
 */
function onCanvasReady() {
  hoveredEntry = null;
  stageListenerInstalled = false;
  if ( !getSetting(constants.SETTING.CLICK_TO_TOGGLE.KEY) ) return;
  if ( !canvas?.app?.stage ) return;
  canvas.app.stage.eventMode = "static";
  canvas.app.stage.addEventListener("pointerdown", onStagePointerDown, { capture: true });
  canvas.app.stage.addEventListener("pointermove", onStagePointerMove, { capture: true });
  window.addEventListener("keydown", onShiftKeyChange);
  window.addEventListener("keyup", onShiftKeyChange);
  stageListenerInstalled = true;
}

/* -------------------------------------------- */

/**
 * On canvas tear down.
 */
function onCanvasTearDown() {
  if ( stageListenerInstalled && canvas?.app?.stage ) {
    canvas.app.stage.removeEventListener("pointerdown", onStagePointerDown, { capture: true });
    canvas.app.stage.removeEventListener("pointermove", onStagePointerMove, { capture: true });
    window.removeEventListener("keydown", onShiftKeyChange);
    window.removeEventListener("keyup", onShiftKeyChange);
  }
  stageListenerInstalled = false;
  clearHoverState();
}

/* -------------------------------------------- */

/**
 * On stage pointer down.
 * @param {PIXI.FederatedPointerEvent} event
 */
function onStagePointerDown(event) {
  if ( event.button !== undefined && event.button !== 0 ) return;
  if ( !getSetting(constants.SETTING.CLICK_TO_TOGGLE.KEY) ) return;
  if ( !isPointerOverCanvas(event) ) return;

  const hit = hitTestRegistry(event.global);
  if ( !hit ) return;
  event.stopPropagation?.();
  event.stopImmediatePropagation?.();
  event.nativeEvent?.stopPropagation?.();
  const isCondition = (hit.ae.statuses?.size ?? 0) > 0;
  if ( isCondition || event.shiftKey ) hit.ae.delete();
  else hit.ae.update({ disabled: !hit.ae.disabled });
  clearHoverState();
}

/* -------------------------------------------- */

/**
 * Whether the cursor is on the canvas.
 * @param {PIXI.FederatedPointerEvent} event
 * @returns {boolean}
 */
function isPointerOverCanvas(event) {
  const ne = event.nativeEvent;
  if ( !ne || ne.clientX === undefined || ne.clientY === undefined ) return true;
  const view = canvas?.app?.view;
  if ( !view ) return true;
  const top = document.elementFromPoint(ne.clientX, ne.clientY);
  return top === view;
}

/* -------------------------------------------- */

/**
 * Hit-test all registered radial effect sprites against a global point.
 * @param {PIXI.IPointData} globalPoint
 * @returns {{sprite: PIXI.Sprite, ae: ActiveEffect, token: Token}|null}
 */
function hitTestRegistry(globalPoint) {
  if ( !globalPoint ) return null;
  if ( !canvas?.tokens ) return null;
  for ( const token of canvas.tokens.placeables ) {
    if ( !token.actor?.isOwner ) continue;
    if ( !token.effects?.children?.length ) continue;
    for ( const sprite of token.effects.children ) {
      const ae = sprite.customDnd5eAe;
      if ( !ae ) continue;
      if ( !sprite.parent ) continue;
      const localPoint = sprite.toLocal(globalPoint);
      const bounds = sprite.getLocalBounds();
      if ( bounds.contains(localPoint.x, localPoint.y) ) return { sprite, ae, token };
    }
  }
  return null;
}

/* -------------------------------------------- */

/**
 * On stage pointer move.
 * @param {PIXI.FederatedPointerEvent} event
 */
function onStagePointerMove(event) {
  if ( !getSetting(constants.SETTING.CLICK_TO_TOGGLE.KEY) ) {
    if ( hoveredEntry ) clearHoverState();
    return;
  }
  if ( !isPointerOverCanvas(event) ) {
    if ( hoveredEntry ) clearHoverState();
    return;
  }
  const hit = hitTestRegistry(event.global);
  if ( hit ) {
    if ( hoveredEntry?.sprite !== hit.sprite ) {
      if ( hoveredEntry?.sprite ) animateHoverScale(hoveredEntry.sprite, false);
      animateHoverScale(hit.sprite, true);
    }
    hoveredEntry = hit;
    setCanvasCursor("pointer");
    const ne = event.nativeEvent;
    showCursorLabel(actionVariant(hit.ae, event.shiftKey), ne?.clientX, ne?.clientY);
  } else if ( hoveredEntry ) {
    clearHoverState();
  }
}

/* -------------------------------------------- */

/**
 * Animate a sprite's scale between its base value and a slightly enlarged hover value.
 * @param {PIXI.Sprite} sprite
 * @param {boolean} hovered
 */
function animateHoverScale(sprite, hovered) {
  if ( !sprite || sprite.destroyed || !sprite.transform || !sprite.parent ) return;
  const base = sprite.customDnd5eBaseScale ?? sprite.scale.x;
  const target = base * (hovered ? HOVER_SCALE_FACTOR : 1);
  if ( !sprite.customDnd5eHoverAnimName ) sprite.customDnd5eHoverAnimName = Symbol("radial-hover");
  foundry.canvas.animation.CanvasAnimation.animate(
    [
      { parent: sprite.scale, attribute: "x", to: target },
      { parent: sprite.scale, attribute: "y", to: target }
    ],
    {
      name: sprite.customDnd5eHoverAnimName,
      duration: HOVER_ANIM_DURATION,
      ontick: () => redrawTokenBackgrounds(sprite.parent)
    }
  );
}

/* -------------------------------------------- */

/**
 * Redraw all radial backgrounds.
 * @param {PIXI.Container|null} tokenEffects token.effects container
 */
function redrawTokenBackgrounds(tokenEffects) {
  if ( !tokenEffects?.bg ) return;
  const bg = tokenEffects.bg.clear();
  for ( const sibling of tokenEffects.children ) {
    if ( sibling === bg || sibling === tokenEffects.overlay ) continue;
    const params = sibling.customDnd5eBgParams;
    if ( !params ) continue;
    drawBackground(sibling, bg, params.gridScale, params.slotSize);
  }
}

/* -------------------------------------------- */

/**
 * Update the badge variant in real time as Shift is pressed or released.
 * @param {KeyboardEvent} event
 */
function onShiftKeyChange(event) {
  if ( event.key !== "Shift" ) return;
  if ( !hoveredEntry ) return;
  setCursorLabel(actionVariant(hoveredEntry.ae, event.shiftKey));
}

/* -------------------------------------------- */

/**
 * Determine which action a click would perform.
 * @param {ActiveEffect} ae
 * @param {boolean} shift
 * @returns {"delete"|"disable"}
 */
function actionVariant(ae, shift) {
  const isCondition = (ae.statuses?.size ?? 0) > 0;
  return (isCondition || shift) ? "delete" : "disable";
}

/* -------------------------------------------- */

/**
 * Reset hover state, cursor, and hide both badge icons.
 */
function clearHoverState() {
  if ( hoveredEntry?.sprite ) animateHoverScale(hoveredEntry.sprite, false);
  hoveredEntry = null;
  setCanvasCursor("");
  setCursorLabelIcon(DISABLE_ICON_ID, false);
  setCursorLabelIcon(DELETE_ICON_ID, false);
}

/* -------------------------------------------- */

/**
 * Set the cursor on the canvas DOM element.
 * @param {string} value
 */
function setCanvasCursor(value) {
  const view = canvas?.app?.view;
  if ( view ) view.style.cursor = value;
}

/* -------------------------------------------- */

/**
 * Add cursor labels.
 */
function addCursorLabels() {
  addCursorLabelIcon(DISABLE_ICON_ID, '<i class="fa-solid fa-toggle-off"></i>');
  addCursorLabelIcon(DELETE_ICON_ID, '<i class="fa-sharp fa-solid fa-xmark"></i>');
}

/* -------------------------------------------- */

/**
 * Show the radial cursor label.
 * @param {"delete"|"disable"} variant
 * @param {number|undefined} clientX
 * @param {number|undefined} clientY
 */
function showCursorLabel(variant, clientX, clientY) {
  addCursorLabels();
  if ( clientX !== undefined && clientY !== undefined ) setCursorLabelPosition(clientX, clientY);
  setCursorLabelIcon(DISABLE_ICON_ID, variant === "disable");
  setCursorLabelIcon(DELETE_ICON_ID, variant === "delete");
}

/* -------------------------------------------- */

/**
 * Set which icon is visible in the cursor label.
 * @param {"delete"|"disable"} variant
 */
function setCursorLabel(variant) {
  setCursorLabelIcon(DISABLE_ICON_ID, variant === "disable");
  setCursorLabelIcon(DELETE_ICON_ID, variant === "delete");
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

  registerSetting(
    constants.SETTING.CLICK_TO_TOGGLE.KEY,
    {
      name: game.i18n.localize(constants.SETTING.CLICK_TO_TOGGLE.NAME),
      hint: game.i18n.localize(constants.SETTING.CLICK_TO_TOGGLE.HINT),
      scope: "world",
      config: false,
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

  const clickEnabled = getSetting(constants.SETTING.CLICK_TO_TOGGLE.KEY) && !!token.actor?.isOwner;
  const SHOW_ICON = CONST.ACTIVE_EFFECT_SHOW_ICON;
  const activeEffects = clickEnabled
    ? (token.actor?.appliedEffects.filter(e =>
      (e.showIcon === SHOW_ICON.ALWAYS) || ((e.showIcon === SHOW_ICON.CONDITIONAL) && e.isTemporary)
    ) ?? [])
    : [];
  if ( clickEnabled && !stageListenerInstalled ) onCanvasReady();

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
    const texW = (effect.texture?.orig?.width ?? effect.texture?.width) || scaledSize;
    const texH = (effect.texture?.orig?.height ?? effect.texture?.height) || scaledSize;
    const uniformScale = scaledSize / Math.max(texW, texH);
    effect.customDnd5eBaseScale = uniformScale;
    effect.scale.set(uniformScale, uniformScale);

    const src = effect.texture?.textureCacheIds?.[0] ?? effect.texture?.baseTexture?.resource?.src ?? "";
    if ( !effect.mask && !src.endsWith(".svg") ) {
      const texRadius = Math.min(texW, texH) / 2;
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

    effect.customDnd5eBgParams = { gridScale, slotSize: scaledSize };
    drawBackground(effect, bg, gridScale, scaledSize);

    effect.customDnd5eAe = clickEnabled ? (activeEffects[effect.zIndex] ?? null) : null;

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
 * @param {number} slotSize Intended icon slot size
 */
function drawBackground(icon, bg, gridScale, slotSize) {
  const ratio = (icon.customDnd5eBaseScale && icon.scale.x)
    ? (icon.scale.x / icon.customDnd5eBaseScale)
    : 1;
  const radius = ((slotSize / 2) + (slotSize * 0.1)) * ratio;
  bg.beginFill(0x242731);
  bg.drawCircle(icon.position.x, icon.position.y, radius);
  bg.endFill();
  bg.lineStyle(gridScale, 0x9f9275, 1, 1);
  bg.drawCircle(icon.position.x, icon.position.y, radius);
  bg.lineStyle(0);
}
