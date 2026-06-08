import { CONSTANTS } from "../constants.js";
import { getSetting, registerSetting } from "../utils.js";

const constants = CONSTANTS.TOKEN;

/**
 * Module-level state for palette hover timeouts.
 */
let paletteTimeout = null;
const HOVER_DELAY = 200;
const DEFAULT_HUD_SCALE = 1;
const DEFAULT_STATUS_EFFECT_ROWS = 8;
const DEFAULT_STATUS_EFFECT_COLUMNS = 5;
const EFFECT_CELL_SIZE = 25;
const EFFECT_CELL_GAP = 3;

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
      config: false,
      requiresReload: true,
      type: Boolean,
      default: false
    }
  );

  registerSetting(
    constants.SETTING.HUD_SCALE.KEY,
    {
      name: game.i18n.localize("CUSTOM_DND5E.setting.tokenHudScale.name"),
      hint: game.i18n.localize("CUSTOM_DND5E.setting.tokenHudScale.hint"),
      scope: "world",
      config: false,
      type: Number,
      default: DEFAULT_HUD_SCALE
    }
  );

  registerSetting(
    constants.SETTING.HUD_STATUS_EFFECT_ROWS.KEY,
    {
      name: game.i18n.localize("CUSTOM_DND5E.setting.tokenHudStatusEffectRows.name"),
      hint: game.i18n.localize("CUSTOM_DND5E.setting.tokenHudStatusEffectRows.hint"),
      scope: "world",
      config: false,
      type: Number,
      default: DEFAULT_STATUS_EFFECT_ROWS
    }
  );

  registerSetting(
    constants.SETTING.HUD_STATUS_EFFECT_COLUMNS.KEY,
    {
      name: game.i18n.localize("CUSTOM_DND5E.setting.tokenHudStatusEffectColumns.name"),
      hint: game.i18n.localize("CUSTOM_DND5E.setting.tokenHudStatusEffectColumns.hint"),
      scope: "world",
      config: false,
      type: Number,
      default: DEFAULT_STATUS_EFFECT_COLUMNS
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
 * @param {TokenHUD} hud Token HUD app
 * @param {HTMLElement} html HTML element
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

  applyStatusEffectGrid(html);

  requestAnimationFrame(() => applyHudScale(hud));
}

/* -------------------------------------------- */

/**
 * Resize the status effects palette grid.
 * @param {HTMLElement} html
 */
function applyStatusEffectGrid(html) {
  const rows = Number(getSetting(constants.SETTING.HUD_STATUS_EFFECT_ROWS.KEY)) || DEFAULT_STATUS_EFFECT_ROWS;
  const columns = Number(getSetting(constants.SETTING.HUD_STATUS_EFFECT_COLUMNS.KEY)) || DEFAULT_STATUS_EFFECT_COLUMNS;
  if ( rows === DEFAULT_STATUS_EFFECT_ROWS && columns === DEFAULT_STATUS_EFFECT_COLUMNS ) return;

  const statusEffects = html.querySelector(".status-effects");
  if ( !statusEffects ) return;

  if ( rows !== DEFAULT_STATUS_EFFECT_ROWS ) {
    statusEffects.style.height = `${rows * (EFFECT_CELL_SIZE + EFFECT_CELL_GAP) + 2 * EFFECT_CELL_GAP}px`;
  }
  if ( columns !== DEFAULT_STATUS_EFFECT_COLUMNS ) {
    statusEffects.style.gridTemplateColumns = `repeat(${columns}, ${EFFECT_CELL_SIZE}px)`;
  }
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
 * @param {TokenHUD} hud Token HUD app
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
  const hudScale = Number(getSetting(constants.SETTING.HUD_SCALE.KEY)) || DEFAULT_HUD_SCALE;
  hud.element.style.transform = `scale(${hudScale / stageScale})`;
}

/* -------------------------------------------- */

/**
 * Schedule closing all active palettes after a delay.
 * @param {TokenHUD} hud Token HUD app
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
