import { CONSTANTS } from "../constants.js";
import { Logger, getDnd5eKeysPressed, getSetting, registerSetting } from "../utils.js";

const constants = CONSTANTS.SHOW_PRESSED_KEYS;

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
export function registerSettings() {
  registerSetting(
    constants.SETTING.KEY,
    {
      name: game.i18n.localize(constants.SETTING.NAME),
      hint: game.i18n.localize(constants.SETTING.HINT),
      scope: "world",
      config: false,
      type: Boolean,
      default: false,
      requiresReload: true
    }
  );
}

/* -------------------------------------------- */

/**
 * Register hooks.
 */
export function registerHooks() {
  if ( getSetting(constants.SETTING.KEY) ) {
    Hooks.on("ready", initializeCursorLabel);
    Hooks.on("renderActorSheet", attachAppListeners);
    Hooks.on("renderActorSheetV2", attachAppListeners);
    Hooks.on("renderCoreHUD", attachAppListeners);
    Hooks.on("renderTokenActionHud", attachAppListeners);
  }
}

/* -------------------------------------------- */

/**
 * Initialize the cursor label element and its event listeners.
 * Triggered on 'ready' hook.
 */
function initializeCursorLabel() {
  createCursorLabelElement();
  attachCursorLabelListeners();
  attachDocumentListeners(document);
}

/* -------------------------------------------- */

/**
 * Documents with cursor label key listeners attached.
 * @type {WeakSet<Document>}
 */
const listenedDocuments = new WeakSet();

/**
 * Tooltip elements with cursor label toggle listeners attached.
 * @type {WeakSet<HTMLElement>}
 */
const listenedTooltips = new WeakSet();

/* -------------------------------------------- */

/**
 * Attach listeners to a document.
 * @param {Document} doc
 */
function attachDocumentListeners(doc) {
  if ( !listenedDocuments.has(doc) ) {
    listenedDocuments.add(doc);
    doc.addEventListener("keydown", updateCursorLabelVisibility, { passive: true, capture: true });
    doc.addEventListener("keyup", updateCursorLabelVisibility, { passive: true, capture: true });
  }

  // Foundry shows its tooltip in the browser's top layer, so promote the label back above it
  // whenever the tooltip opens.
  const tooltip = (doc === document)
    ? (game.tooltip?.tooltip ?? doc.getElementById("tooltip"))
    : doc.getElementById("tooltip");
  if ( tooltip && !listenedTooltips.has(tooltip) ) {
    listenedTooltips.add(tooltip);
    tooltip.addEventListener("toggle", onTooltipToggle);
  }
}

/* -------------------------------------------- */

/**
 * Promote the cursor label above a tooltip that has just opened.
 * @param {ToggleEvent} event
 */
function onTooltipToggle(event) {
  if ( event.newState !== "open" ) return;
  const container = window.customDnd5eCursorLabel?.container;
  if ( container?.isConnected && container.style.visibility === "visible" ) promoteCursorLabel(container);
}

/* -------------------------------------------- */

/**
 * Move the cursor label into the given document if it is not already there.
 * @param {Document} doc
 */
function ensureCursorLabelDocument(doc) {
  const container = addCursorLabel();
  if ( container.ownerDocument !== doc ) {
    doc.body.appendChild(container);
    promoteCursorLabel(container);
  }

  if ( !container.querySelector("#custom-dnd5e-cursor-label-skip-dialog") ) createCursorLabelElement();

  attachDocumentListeners(doc);
}

/* -------------------------------------------- */

/**
 * Add cursor label.
 * @returns {HTMLElement} Cursor label container
 */
export function addCursorLabel() {
  let container = window.customDnd5eCursorLabel?.container;
  if ( container?.isConnected ) return container;
  container = document.getElementById("custom-dnd5e-cursor-label");
  if ( !container ) {
    container = document.createElement("div");
    container.id = "custom-dnd5e-cursor-label";
    container.popover = "manual";
    document.body.appendChild(container);
    promoteCursorLabel(container);
  }
  if ( !window.customDnd5eCursorLabel ) window.customDnd5eCursorLabel = {};
  window.customDnd5eCursorLabel.container = container;
  return container;
}

/* -------------------------------------------- */

/**
 * Show the cursor label as a popover so it renders in the browser's top layer.
 * Re-show to move the label above any tooltips.
 * @param {HTMLElement} container Cursor label container
 */
function promoteCursorLabel(container) {
  try {
    if ( container.matches(":popover-open") ) container.hidePopover();
    container.showPopover();
  } catch {}
}

/* -------------------------------------------- */

/**
 * Add an icon to the cursor label.
 * @param {string} id
 * @param {string} innerHTML
 * @param {string} [className="custom-dnd5e-cursor-label-icon"] CSS class
 * @returns {HTMLElement} Icon element
 */
export function addCursorLabelIcon(id, innerHTML, className = "custom-dnd5e-cursor-label-icon") {
  const container = addCursorLabel();
  let icon = container.querySelector(`#${id}`);
  if ( !icon ) {
    icon = document.createElement("span");
    icon.id = id;
    if ( className ) icon.classList.add(...className.split(/\s+/));
    container.appendChild(icon);
  }
  if ( innerHTML !== undefined ) icon.innerHTML = innerHTML;
  icon.style.display = icon.style.display || "none";
  return icon;
}

/* -------------------------------------------- */

/**
 * Toggle the visibility of a specific cursor label icon and refresh container visibility.
 * @param {string} id
 * @param {boolean} visible Whether the icon should be visible
 */
export function setCursorLabelIcon(id, visible) {
  const icon = window.customDnd5eCursorLabel?.container?.querySelector(`#${id}`);
  if ( icon ) icon.style.display = visible ? "inline-block" : "none";
  refreshCursorLabelVisibility();
}

/* -------------------------------------------- */

/**
 * Update the cursor label container's screen position.
 * Two positioning modes:
 *  - **tooltip** (default): Icon sits below-left of the cursor.
 *  - **cursor**: Icon is centered on the cursor point itself.
 * @param {number} clientX
 * @param {number} clientY
 * @param {object} [options]
 * @param {"tooltip"|"cursor"} [options.mode="tooltip"]
 */
export function setCursorLabelPosition(clientX, clientY, { mode = "tooltip" } = {}) {
  const container = addCursorLabel();
  if ( mode === "cursor" ) {
    container.classList.add("custom-dnd5e-cursor-label-cursor-mode");
    container.style.left = `${clientX}px`;
    container.style.top = `${clientY}px`;
  } else {
    container.classList.remove("custom-dnd5e-cursor-label-cursor-mode");
    container.style.left = `${clientX - 5}px`;
    container.style.top = `${clientY + 15}px`;
  }
}

/* -------------------------------------------- */

/**
 * Show or hide the container based on whether any child icon is visible.
 */
function refreshCursorLabelVisibility() {
  const container = window.customDnd5eCursorLabel?.container;
  if ( !container?.isConnected ) return;
  const anyVisible = Array.from(container.children).some(child => child.style.display && child.style.display !== "none");
  const wasVisible = container.style.visibility === "visible";
  container.style.visibility = anyVisible ? "visible" : "hidden";

  // If the label is appearing while a tooltip is already open, move it back above the tooltip.
  if ( anyVisible && !wasVisible ) promoteCursorLabel(container);
}

/* -------------------------------------------- */

/**
 * Create and append the cursor label element to the DOM.
 */
function createCursorLabelElement() {
  addCursorLabel();

  const skipDialogIcon = addCursorLabelIcon(
    "custom-dnd5e-cursor-label-skip-dialog",
    "",
    ""
  );
  skipDialogIcon.classList.add("fa-regular", "fa-forward");

  const advantageIcon = addCursorLabelIcon(
    "custom-dnd5e-cursor-label-advantage",
    '<i class="fa-sharp fa-regular fa-dice-d20"></i><i class="fa-solid fa-up-long"></i>'
  );

  const disadvantageIcon = addCursorLabelIcon(
    "custom-dnd5e-cursor-label-disadvantage",
    '<i class="fa-sharp fa-regular fa-dice-d20"></i><i class="fa-solid fa-down-long"></i>'
  );

  window.customDnd5eCursorLabel.advantage = advantageIcon;
  window.customDnd5eCursorLabel.disadvantage = disadvantageIcon;
  window.customDnd5eCursorLabel.skipDialog = skipDialogIcon;
}

/* -------------------------------------------- */

/**
 * Attach listeners for cursor movement and key press events.
 */
function attachCursorLabelListeners() {
  const chatNotifications = document.querySelector("#chat-notifications");
  chatNotifications.addEventListener("pointermove", handleCursorMove);
  chatNotifications.addEventListener("pointermove", updateCursorLabelPosition);
  const chatLog = document.querySelector("#chat .chat-log");
  chatLog.addEventListener("pointermove", handleCursorMove);
  chatLog.addEventListener("pointermove", updateCursorLabelPosition);
}

/* -------------------------------------------- */

/**
 * Attach listeners for pointer movement in actor sheets.
 * @param {Application} app Actor sheet application
 * @param {HTMLElement} html Actor sheet HTML element
 * @param {object} data Actor sheet data
 */
function attachAppListeners(app, html, data) {
  const element = ( html instanceof jQuery ) ? html[0] : html;
  element.addEventListener("pointermove", handleCursorMove);
  element.addEventListener("pointermove", updateCursorLabelPosition);
}

/* -------------------------------------------- */

/**
 * Track the cursor event and store its position and target.
 * @param {PointerEvent} event
 */
function handleCursorMove(event) {
  window.customDnd5eCursorLabel.cursor = {
    target: event.target,
    clientX: event.clientX,
    clientY: event.clientY
  };
}

/* -------------------------------------------- */

/**
 * Find a valid button element for D&D 5e actions.
 * @param {HTMLElement} element Current target element
 * @returns {HTMLElement|null} Valid button or null if none
 */
function getValidButton(element) {
  if ( element.dataset?.action === "rollAttack"
        || element.dataset?.action === "rollRequest"
        || element.dataset?.action === "use"
        || element.classList.contains("rollable")
        || element.classList.contains("item-use-button") // Tidy5eCharacterSheet classic
        || element.classList.contains("item-button") // Argon Combat HUD
        || element.dataset?.action === "clickAction"
        || ![undefined, "false"].includes(element.dataset.hasRollModes) ) { // Generic opt in
    return element;
  }
  return element.closest(('[data-action="use"]'))
        || element.closest('[data-action="rollAttack"]')
        || element.closest('[data-action="rollRequest"]')
        || element.closest(".rollable")
        || element.closest(".item-use-button") // Tidy5eCharacterSheet classic
        || element.closest(".item-button") // Argon Combat HUD
        || element.closest('[data-action="clickAction"]') // Token Action HUD
        || element.closest('[data-has-roll-modes]:not([data-has-roll-modes="false"]'); // Generic opt in
}

/* -------------------------------------------- */

/**
 * Update the visibility of the cursor label.
 * @param {Event} event
 */
function updateCursorLabelVisibility(event) {
  const target = (event.type === "pointermove") ? event.target : window.customDnd5eCursorLabel?.cursor?.target;
  if ( !target ) return;
  if ( !window.customDnd5eCursorLabel?.skipDialog ) return;

  const onButton = getValidButton(target);
  const keysPressed = getDnd5eKeysPressed(event);

  setCursorLabelIcon("custom-dnd5e-cursor-label-skip-dialog", !!(onButton && keysPressed.normal));
  setCursorLabelIcon("custom-dnd5e-cursor-label-advantage", !!(onButton && keysPressed.advantage));
  setCursorLabelIcon("custom-dnd5e-cursor-label-disadvantage", !!(onButton && keysPressed.disadvantage));
}

/* -------------------------------------------- */

/**
 * Update the position and visibility of the cursor label.
 * @param {PointerEvent} event
 */
function updateCursorLabelPosition(event) {
  ensureCursorLabelDocument(event.target?.ownerDocument ?? document);
  setCursorLabelPosition(event.clientX, event.clientY);
  updateCursorLabelVisibility(event);
}
