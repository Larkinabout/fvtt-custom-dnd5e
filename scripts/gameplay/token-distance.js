import { CONSTANTS, MODULE } from "../constants.js";
import { getSetting, registerSetting } from "../utils.js";

const constants = CONSTANTS.TOKEN_DISTANCE;

/**
 * Active labels keyed by token id.
 */
const labels = new Map();

let hoveredTokenId = null;
let altActive = false;

/**
 * Register settings, keybindings, and hooks.
 */
export function register() {
  registerSettings();
  registerKeybindings();
  registerHooks();
}

/* -------------------------------------------- */

/**
 * Register settings.
 */
function registerSettings() {
  registerSetting(constants.SETTING.ENABLE.KEY, {
    name: game.i18n.localize(constants.SETTING.ENABLE.NAME),
    hint: game.i18n.localize(constants.SETTING.ENABLE.HINT),
    scope: "world",
    config: false,
    requiresReload: true,
    type: Boolean,
    default: false
  });

  registerSetting(constants.SETTING.VIEW_ROLE.KEY, {
    name: game.i18n.localize(constants.SETTING.VIEW_ROLE.NAME),
    hint: game.i18n.localize(constants.SETTING.VIEW_ROLE.HINT),
    scope: "world",
    config: false,
    type: Number,
    choices: {
      1: "USER.RolePlayer",
      2: "USER.RoleTrusted",
      3: "USER.RoleAssistant",
      4: "USER.RoleGamemaster"
    },
    default: 1
  });
}

/* -------------------------------------------- */

/**
 * Register keybindings
 */
function registerKeybindings() {
  game.keybindings.register(MODULE.ID, "showAllTokenDistances", {
    name: "CUSTOM_DND5E.keybinding.showAllTokenDistances",
    editable: [{ key: "AltLeft" }, { key: "AltRight" }],
    onDown: () => {
      if ( !isEnabled() || !canView() ) return false;
      if ( altActive ) return false;
      altActive = true;
      refreshLabels();
      return false;
    },
    onUp: () => {
      if ( !altActive ) return false;
      altActive = false;
      refreshLabels();
      return false;
    },
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL
  });
}

/* -------------------------------------------- */

/**
 * Register hooks
 * @returns {void}
 */
function registerHooks() {
  if ( !isEnabled() ) return;
  Hooks.on("hoverToken", onHoverToken);
  Hooks.on("controlToken", refreshLabels);
  Hooks.on("canvasReady", removeAll);
  Hooks.on("deleteToken", doc => removeLabel(doc.id));
  Hooks.on("updateToken", onUpdateToken);
}

/* -------------------------------------------- */

/**
 * On hover token.
 * @param {object} token
 * @param {boolean} hovered
 * @returns {void}
 */
function onHoverToken(token, hovered) {
  if ( !isEnabled() || !canView() ) return;
  if ( hovered ) hoveredTokenId = token.id;
  else if ( hoveredTokenId === token.id ) hoveredTokenId = null;
  refreshLabels();
}

/* -------------------------------------------- */

/**
 * Refresh labels when a token's position or elevation changes.
 * @param {TokenDocument} doc
 * @param {object} change
 * @returns {void}
 */
function onUpdateToken(doc, change) {
  if ( !labels.size ) return;
  if ( "x" in change || "y" in change || "elevation" in change ) refreshLabels();
}

/* -------------------------------------------- */

/**
 * Whether the setting is enabled.
 * @returns {boolean}
 */
function isEnabled() {
  return getSetting(constants.SETTING.ENABLE.KEY);
}

/* -------------------------------------------- */

/**
 * Whether the user can view the token distances.
 * @returns {boolean}
 */
function canView() {
  return game.user.role >= getSetting(constants.SETTING.VIEW_ROLE.KEY);
}

/* -------------------------------------------- */

/**
 * Get the source token.
 * @returns {Token|null}
 */
function getSourceToken() {
  const controlled = canvas.tokens?.controlled?.[0];
  if ( controlled ) return controlled;
  const char = game.user.character;
  return char?.getActiveTokens()?.[0] ?? null;
}

/* -------------------------------------------- */

/**
 * Refresh labels.
 */
function refreshLabels() {
  if ( !canvas?.tokens ) return;
  if ( !isEnabled() || !canView() ) {
    removeAll();
    return;
  }

  const source = getSourceToken();
  if ( !source ) {
    removeAll();
    return;
  }

  const targets = new Set();
  if ( hoveredTokenId && hoveredTokenId !== source.id ) targets.add(hoveredTokenId);
  if ( altActive ) {
    for ( const t of canvas.tokens.placeables ) {
      if ( t.id !== source.id && t.visible ) targets.add(t.id);
    }
  }

  for ( const id of targets ) {
    const target = canvas.tokens.get(id);
    if ( target ) addLabel(target, source);
  }

  for ( const id of [...labels.keys()] ) {
    if ( !targets.has(id) ) removeLabel(id);
  }
}

/* -------------------------------------------- */

/**
 * Add label.
 * @param {*} target Target token
 * @param {*} source Source token
 */
function addLabel(target, source) {
  const text = formatDistance(source, target);
  const resolution = Math.max(4, Math.ceil(window.devicePixelRatio || 1) * 4);
  const gridSize = target.scene?.grid?.size ?? canvas.dimensions?.size ?? 100;
  const fontScale = (game.settings.get("core", "uiConfig")?.fontScale ?? 5) / 5;
  const labelScale = 0.7 * (gridSize / 100) * fontScale;
  let label = labels.get(target.id);
  if ( !label ) {
    label = new PIXI.Container();
    label.icon = new PIXI.Text("\uf545", createIconStyle());
    label.icon.resolution = resolution;
    label.icon.roundPixels = true;
    label.distance = new PIXI.Text(text, createTextStyle());
    label.distance.resolution = resolution;
    label.distance.roundPixels = true;
    label.addChild(label.icon, label.distance);
    target.addChild(label);
    labels.set(target.id, label);
  } else {
    label.distance.text = text;
  }
  label.scale.set(labelScale);
  const gap = (label.distance.style.fontSize ?? 32) * 0.125;
  const totalHeight = Math.max(label.icon.height, label.distance.height);
  label.icon.position.set(0, (totalHeight - label.icon.height) / 2);
  label.distance.position.set(label.icon.width + gap, (totalHeight - label.distance.height) / 2);
  const totalWidth = label.icon.width + gap + label.distance.width;
  label.pivot.set(totalWidth / 2, totalHeight / 2);
  label.position.set(target.w / 2, target.h / 2);
}

/* -------------------------------------------- */

/**
 * Remove label.
 * @param {string} id
 * @returns {void}
 */
function removeLabel(id) {
  const label = labels.get(id);
  if ( !label ) return;
  label.parent?.removeChild(label);
  label.destroy();
  labels.delete(id);
}

/* -------------------------------------------- */

/**
 * Remove all labels.
 */
function removeAll() {
  for ( const id of [...labels.keys()] ) removeLabel(id);
  hoveredTokenId = null;
  altActive = false;
}

/* -------------------------------------------- */

/**
 * Format distance.
 * @param {object} source Source token
 * @param {object} target Target token
 * @returns {string} Formatted distance
 */
function formatDistance(source, target) {
  const path = canvas.grid.measurePath([
    { x: source.center.x, y: source.center.y, elevation: source.document.elevation ?? 0 },
    { x: target.center.x, y: target.center.y, elevation: target.document.elevation ?? 0 }
  ]);
  const distance = Math.round((path.distance ?? 0) * 100) / 100;
  const units = canvas.scene?.grid?.units || "";
  return units ? `${distance} ${units}` : `${distance}`;
}

/* -------------------------------------------- */

/**
 * Create text style.
 * @returns {PIXI.TextStyle} Created text style
 */
function createTextStyle() {
  return new PIXI.TextStyle({
    fontFamily: "Signika, sans-serif",
    fontSize: 32,
    fontWeight: "bold",
    fill: "#ffffff",
    stroke: "#000000",
    strokeThickness: 4,
    align: "center",
    padding: 4
  });
}

/* -------------------------------------------- */

/**
 * Create icon style.
 * @returns {PIXI.TextStyle} Created icon style
 */
function createIconStyle() {
  return new PIXI.TextStyle({
    fontFamily: ["Font Awesome 7 Pro", "Font Awesome 6 Pro", "Font Awesome 6 Free"],
    fontSize: 28,
    fontWeight: "900",
    fill: "#ffffff",
    stroke: "#000000",
    strokeThickness: 4,
    padding: 4
  });
}
