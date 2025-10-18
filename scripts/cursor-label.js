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
      config: true,
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
 * Create and append the cursor label element to the DOM.
 */
function createCursorLabelElement() {
  const container = document.createElement("div");
  container.id = "custom-dnd5e-cursor-label";

  const skipDialogIcon = document.createElement("i");
  skipDialogIcon.id = "custom-dnd5e-cursor-label-skip-dialog";
  skipDialogIcon.classList.add("fa-solid", "fa-forward");
  container.appendChild(skipDialogIcon);

  const advantageIcon = document.createElement("i");
  advantageIcon.id = "custom-dnd5e-cursor-label-advantage";
  advantageIcon.classList.add("fa-solid", "fa-up-long");
  container.appendChild(advantageIcon);

  const disadvantageIcon = document.createElement("i");
  disadvantageIcon.id = "custom-dnd5e-cursor-label-disadvantage";
  disadvantageIcon.classList.add("fa-solid", "fa-down-long");
  container.appendChild(disadvantageIcon);

  document.body.appendChild(container);
  window.customDnd5eCursorLabel = {
    container,
    advantage: advantageIcon,
    disadvantage: disadvantageIcon,
    skipDialog: skipDialogIcon
  };
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
 * @param {Application} app The actor sheet application.
 * @param {HTMLElement} html The actor sheet HTML element.
 * @param {object} data Actor sheet data.
 */
function attachAppListeners(app, html, data) {
  html.addEventListener("pointermove", handleCursorMove);
  html.addEventListener("pointermove", updateCursorLabelPosition);
}

/* -------------------------------------------- */

/**
 * Track the cursor event and store its position and target.
 * @param {PointerEvent} event The pointer move event.
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
 * @param {HTMLElement} element The current target element.
 * @returns {HTMLElement|null} The valid button or null if none.
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
 * Update the visibility of the cursor label based on the event.
 * @param {Event} event The event.
 */
function updateCursorLabelVisibility(event) {
  const target = (event.type === "pointermove") ? event.target : window.customDnd5eCursorLabel?.cursor?.target;
  if ( !target ) return;

  const onButton = getValidButton(target);
  const keysPressed = getDnd5eKeysPressed(event);
  const isVisible = onButton && (keysPressed.normal || keysPressed.advantage || keysPressed.disadvantage);

  window.customDnd5eCursorLabel.container.style.visibility = isVisible ? "visible" : "hidden";
  window.customDnd5eCursorLabel.skipDialog.style.display = (onButton && keysPressed.normal) ? "inline-block" : "none";
  window.customDnd5eCursorLabel.advantage.style.display = (onButton && keysPressed.advantage) ? "inline-block" : "none";
  window.customDnd5eCursorLabel.disadvantage.style.display = (onButton && keysPressed.disadvantage) ? "inline-block" : "none";
}

/* -------------------------------------------- */

/**
 * Update the position and visibility of the cursor label based on the pointer event.
 * @param {PointerEvent} event The pointer move event.
 */
function updateCursorLabelPosition(event) {
  window.customDnd5eCursorLabel.container.style.left = `${event.clientX + 15}px`;
  window.customDnd5eCursorLabel.container.style.top = `${event.clientY}px`;

  updateCursorLabelVisibility(event);
}
