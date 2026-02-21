import { CONSTANTS } from "./constants.js";
import { getSetting, registerSetting } from "./utils.js";

const constants = CONSTANTS.TOKEN;

/**
 * Module-level state for palette hover timeouts.
 */
let paletteTimeout = null;
const HOVER_DELAY = 200;
const HUD_SCALE = 1.25;

/* -------------------------------------------- */

/**
 * Register settings and hooks.
 */
export function register() {
  registerSettings();
  registerHooks();
}

/* -------------------------------------------- */

/**
 * Register settings.
 */
function registerSettings() {
  registerSetting(
    constants.SETTING.HUD_IMPROVEMENTS.KEY,
    {
      name: game.i18n.localize("CUSTOM_DND5E.setting.tokenHudImprovements.name"),
      hint: game.i18n.localize("CUSTOM_DND5E.setting.tokenHudImprovements.hint"),
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
 * Register hooks.
 */
function registerHooks() {
  if ( !getSetting(constants.SETTING.HUD_IMPROVEMENTS.KEY) ) return;

  Hooks.on("renderTokenHUD", onRenderTokenHUD);
  Hooks.on("canvasPan", onCanvasPan);
}

/* -------------------------------------------- */

/**
 * Handle Token HUD render to attach palette hover listeners and apply scaling.
 * @param {TokenHUD} hud The Token HUD application.
 * @param {HTMLElement} html The rendered HTML element.
 */
function onRenderTokenHUD(hud, html) {
  // Add class for CSS styling
  html.classList.add("custom-dnd5e-hud");

  // Palette hover listeners
  const paletteButtons = html.querySelectorAll('[data-action="togglePalette"]');
  for ( const button of paletteButtons ) {
    const paletteId = button.dataset.palette;

    button.addEventListener("mouseenter", () => {
      cancelPaletteClose();
      hud.togglePalette(paletteId, true);
    });
    button.addEventListener("mouseleave", () => {
      schedulePaletteClose(hud);
    });
  }

  const palettes = html.querySelectorAll(".palette[data-palette]");
  for ( const palette of palettes ) {
    palette.addEventListener("mouseenter", () => cancelPaletteClose());
    palette.addEventListener("mouseleave", () => schedulePaletteClose(hud));
  }

  // Scale HUD to stay a consistent size regardless of zoom
  // Defer to ensure it runs after Foundry's _updatePosition overwrites the transform
  requestAnimationFrame(() => applyHudScale(hud));
}

/* -------------------------------------------- */

/**
 * Handle canvas pan/zoom to update HUD scaling.
 */
function onCanvasPan() {
  const hud = canvas.hud.token;
  if ( !hud.rendered ) return;
  applyHudScale(hud);
}

/* -------------------------------------------- */

/**
 * Apply inverse zoom scaling to the Token HUD so controls stay a fixed screen size.
 * Width/height match the token when zoomed in, with a minimum (default-zoom size) when zoomed out.
 * @param {TokenHUD} hud The Token HUD application.
 */
function applyHudScale(hud) {
  const token = hud.object;
  if ( !token ) return;
  const stageScale = canvas.stage.scale.x || 1;
  const scaleFactor = Math.max(1, stageScale);

  // Scale width/height: match token when zoomed in, use default size as minimum when zoomed out
  const width = token.bounds.width * scaleFactor;
  const height = token.bounds.height * scaleFactor;

  // Reposition to keep HUD centered on the token
  const { x: tokenX, y: tokenY } = token.position;
  const left = tokenX + (token.bounds.width - width) / 2;
  const top = tokenY + (token.bounds.height - height) / 2;

  hud.element.style.width = `${width}px`;
  hud.element.style.height = `${height}px`;
  hud.element.style.left = `${left}px`;
  hud.element.style.top = `${top}px`;
  hud.element.style.transformOrigin = "center";
  hud.element.style.transform = `scale(${HUD_SCALE / stageScale})`;
}

/* -------------------------------------------- */

/**
 * Schedule closing all active palettes after a delay.
 * @param {TokenHUD} hud The Token HUD application.
 */
function schedulePaletteClose(hud) {
  cancelPaletteClose();
  paletteTimeout = setTimeout(() => {
    hud.togglePalette(null);
    paletteTimeout = null;
  }, HOVER_DELAY);
}

/* -------------------------------------------- */

/**
 * Cancel a pending palette close.
 */
function cancelPaletteClose() {
  if ( paletteTimeout ) {
    clearTimeout(paletteTimeout);
    paletteTimeout = null;
  }
}
