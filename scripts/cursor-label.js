import { CONSTANTS } from "./constants.js";
import { Logger, getDnd5eKeysPressed, getSetting, registerSetting } from "./utils.js";

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
}

/* -------------------------------------------- */

/**
 * Add cursor label.
 * @returns {HTMLElement} Cursor label container
 */
export function addCursorLabel() {
  let container = document.getElementById("custom-dnd5e-cursor-label");
  if ( container ) return container;
  container = document.createElement("div");
  container.id = "custom-dnd5e-cursor-label";
  document.body.appendChild(container);
  if ( !window.customDnd5eCursorLabel ) window.customDnd5eCursorLabel = {};
  window.customDnd5eCursorLabel.container = container;
  return container;
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
  let icon = document.getElementById(id);
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
  const icon = document.getElementById(id);
  if ( icon ) icon.style.display = visible ? "inline-block" : "none";
  refreshCursorLabelVisibility();
}

/* -------------------------------------------- */

/**
 * Update the cursor label container's screen position.
 * @param {number} clientX
 * @param {number} clientY
 */
export function setCursorLabelPosition(clientX, clientY) {
  const container = addCursorLabel();
  container.style.left = `${clientX - 5}px`;
  container.style.top = `${clientY + 15}px`;
}

/* -------------------------------------------- */

/**
 * Show or hide the container based on whether any child icon is visible.
 */
function refreshCursorLabelVisibility() {
  const container = document.getElementById("custom-dnd5e-cursor-label");
  if ( !container ) return;
  const anyVisible = Array.from(container.children).some(child => child.style.display && child.style.display !== "none");
  container.style.visibility = anyVisible ? "visible" : "hidden";
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

  addCursorLabelIcon(
    "custom-dnd5e-cursor-label-advantage",
    '<i class="fa-sharp fa-regular fa-dice-d20"></i><i class="fa-solid fa-up-long"></i>'
  );

  addCursorLabelIcon(
    "custom-dnd5e-cursor-label-disadvantage",
    '<i class="fa-sharp fa-regular fa-dice-d20"></i><i class="fa-solid fa-down-long"></i>'
  );

  window.customDnd5eCursorLabel.advantage = document.getElementById("custom-dnd5e-cursor-label-advantage");
  window.customDnd5eCursorLabel.disadvantage = document.getElementById("custom-dnd5e-cursor-label-disadvantage");
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
  document.addEventListener("keydown", updateCursorLabelVisibility, { passive: true, capture: true });
  document.addEventListener("keyup", updateCursorLabelVisibility, { passive: true, capture: true });
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
  setCursorLabelPosition(event.clientX, event.clientY);
  updateCursorLabelVisibility(event);
}
