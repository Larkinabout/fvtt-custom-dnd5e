import { CONSTANTS } from "./constants.js";
import { Logger, getFlag, setFlag } from "./utils.js";

const SETTING = CONSTANTS.ACTOR_SHEET.SETTING;
const GEOMETRY_POLL_MS = 1000;
const MAX_FIT_SCALE = 4;
const FIT_MARGIN = 0.98;

/**
 * Minimum width/height (px) of a detached window.
 * @type {number}
 */
const MIN_DETACHED_SIZE = 300;

/**
 * Delay (ms) before applying the geometry.
 * @type {number}
 */
const GEOMETRY_SETTLE_MS = 60;

/**
 * Fixed id for the shared detached window.
 * @type {string}
 */
const DETACHED_WINDOW_ID = "custom-dnd5e-detached-sheet";

/**
 * The shared detached window's tracked state: its window id and the id of the sheet inside it.
 * @type {{windowId: string|null, appId: string|null}}
 */
const sharedWindow = { windowId: null, appId: null };

/**
 * Serialises detach operations so token selection cannot leave orphaned sheets.
 * @type {Promise<void>}
 */
let detachQueue = Promise.resolve();

/**
 * Pauses the geometry poll while the saved geometry is being applied.
 * @type {boolean}
 */
let pauseCapture = false;

/**
 * Timer for capturing the detached window's geometry.
 * @type {number|null}
 */
let geometryPollTimer = null;

/**
 * Last saved geometry.
 * @type {{left: number, top: number, width: number, height: number}|null}
 */
let lastSavedGeometry = null;

/**
 * Removes the detached window's listeners.
 * @type {(() => void)|null}
 */
let removeWindowListeners = null;

/**
 * Observes the detached sheet's own size so it refits when its content settles or changes.
 * @type {ResizeObserver|null}
 */
let sheetResizeObserver = null;

/**
 * Pending geometry-apply timeout id, cleared if the window closes before it fires.
 * @type {number|null}
 */
let geometryTimer = null;

/**
 * True when a fit is already queued for the next frame, to coalesce rapid resize events.
 * @type {boolean}
 */
let fitScheduled = false;

/* -------------------------------------------- */
/*  REGISTRATION                                */
/* -------------------------------------------- */

/**
 * Register.
 */
export function register() {
  registerHooks();
}

/* -------------------------------------------- */

/**
 * Register hooks.
 */
function registerHooks() {
  Hooks.on("renderActorSheetV2", onRenderActorSheet);
  Hooks.on("controlToken", onControlToken);
  Hooks.on("closeDetachedWindow", onCloseDetachedWindow);
  Hooks.on("getSceneControlButtons", onGetSceneControlButtons);
}

/* -------------------------------------------- */

/**
 * Add toggle buttons for the open / detach settings.
 * @param {Record<string, object>} controls
 */
function onGetSceneControlButtons(controls) {
  if ( !isShowControls() ) return;
  const tokenControls = controls?.tokens;
  if ( !tokenControls?.tools ) return;
  tokenControls.tools[SETTING.AUTO_DETACH_ACTOR_SHEET.KEY] = {
    name: SETTING.AUTO_DETACH_ACTOR_SHEET.KEY,
    title: "CUSTOM_DND5E.controls.autoDetach.title",
    icon: "fas fa-window-restore",
    order: 98,
    toggle: true,
    active: isAutoDetach(),
    visible: true,
    onChange: (event, active) => { setFlag(game.user, SETTING.AUTO_DETACH_ACTOR_SHEET.KEY, active); }
  };
  tokenControls.tools[SETTING.OPEN_SINGLE_ACTOR_SHEET.KEY] = {
    name: SETTING.OPEN_SINGLE_ACTOR_SHEET.KEY,
    title: "CUSTOM_DND5E.controls.singleSheet.title",
    icon: "fas fa-clone",
    order: 99,
    toggle: true,
    active: isSingleSheet(),
    visible: true,
    onChange: (event, active) => { setFlag(game.user, SETTING.OPEN_SINGLE_ACTOR_SHEET.KEY, active); }
  };
  tokenControls.tools[SETTING.OPEN_ACTOR_SHEET_ON_SELECT.KEY] = {
    name: SETTING.OPEN_ACTOR_SHEET_ON_SELECT.KEY,
    title: "CUSTOM_DND5E.controls.openOnSelect.title",
    icon: "fas fa-hand-pointer",
    order: 100,
    toggle: true,
    active: isOpenOnSelect(),
    visible: true,
    onChange: (event, active) => { setFlag(game.user, SETTING.OPEN_ACTOR_SHEET_ON_SELECT.KEY, active); }
  };
}

/* -------------------------------------------- */
/*  STATE HELPERS                               */
/* -------------------------------------------- */

/**
 * Whether auto-detach is enabled.
 * @returns {boolean}
 */
function isAutoDetach() {
  return !!getFlag(game.user, SETTING.AUTO_DETACH_ACTOR_SHEET.KEY);
}

/* -------------------------------------------- */

/**
 * Whether only one actor sheet should be open at a time.
 * @returns {boolean}
 */
function isSingleSheet() {
  return !!getFlag(game.user, SETTING.OPEN_SINGLE_ACTOR_SHEET.KEY);
}

/* -------------------------------------------- */

/**
 * Whether the current user wants token selection to open the sheet.
 * @returns {boolean}
 */
function isOpenOnSelect() {
  return !!getFlag(game.user, SETTING.OPEN_ACTOR_SHEET_ON_SELECT.KEY);
}

/* -------------------------------------------- */

/**
 * Whether the toggle buttons should be shown.
 * @returns {boolean}
 */
function isShowControls() {
  return !!getFlag(game.user, SETTING.OPEN_DETACH_SHOW_CONTROLS.KEY);
}

/* -------------------------------------------- */

/**
 * Whether the actor sheet's type is included.
 * An unset or empty filter falls back to the default selection.
 * @param {ApplicationV2} app Actor sheet
 * @returns {boolean}
 */
function isActorTypeIncluded(app) {
  const type = app?.document?.type;
  if ( !type ) return true;
  const included = getFlag(game.user, SETTING.OPEN_DETACH_ACTOR_TYPES.KEY);
  const selected = Array.isArray(included) && included.length > 0
    ? included
    : SETTING.OPEN_DETACH_ACTOR_TYPES.DEFAULT;
  return selected.includes(type);
}

/* -------------------------------------------- */

/**
 * Get the descriptor for the shared detached window.
 * @returns {{window: Window, applications: Map<string, ApplicationV2>}|null}
 */
function getSharedDescriptor() {
  if ( !sharedWindow.windowId ) return null;
  return foundry.applications.detached.windows.get(sharedWindow.windowId) ?? null;
}

/* -------------------------------------------- */

/**
 * Get the window object hosting the shared sheet.
 * @returns {Window|null}
 */
function getSharedWindow() {
  const descriptor = getSharedDescriptor();
  const app = descriptor?.applications.get(sharedWindow.appId);
  return app?.element?.ownerDocument?.defaultView ?? descriptor?.window ?? null;
}

/* -------------------------------------------- */

/**
 * Get the saved detached window geometry from the user flag.
 * @returns {{left: number, top: number, width: number, height: number}|null}
 */
function getSavedGeometry() {
  const raw = getFlag(game.user, SETTING.AUTO_DETACH_GEOMETRY.KEY);
  if ( !raw ) return null;
  const { left, top, width, height } = raw;
  if ( [left, top, width, height].some(v => typeof v !== "number" || !Number.isFinite(v)) ) return null;
  if ( width < MIN_DETACHED_SIZE || height < MIN_DETACHED_SIZE ) return null;
  return { left, top, width, height };
}

/* -------------------------------------------- */
/*  HOOK HANDLERS                               */
/* -------------------------------------------- */

/**
 * Handle a rendered actor sheet by routing it into the shared window.
 * @param {ApplicationV2} app Actor sheet
 * @param {HTMLElement} html
 * @param {object} context
 * @param {object} options
 */
function onRenderActorSheet(app, html, context, options) {
  if ( app?.document?.documentName !== "Actor" ) return;
  if ( app.window?.windowId ) {
    if ( app.id === sharedWindow.appId ) {
      const descriptor = getSharedDescriptor();
      if ( descriptor?.window ) scheduleFit(app, descriptor.window);
    }
    return;
  }
  if ( options?.window?.detached || options?.window?.detach || options?.window?.attach ) return;
  if ( !options?.isFirstRender ) return;
  if ( !isActorTypeIncluded(app) ) return;
  routeSheet(app);
}

/* -------------------------------------------- */

/**
 * Route a newly opened actor sheet according to the auto-detach and one-sheet-at-a-time settings.
 * @param {ApplicationV2} app Actor sheet
 */
function routeSheet(app) {
  const detach = isAutoDetach();
  const single = isSingleSheet();
  if ( detach && single ) {
    autoDetach(app);
    closeOtherActorSheets(app, true);
  } else if ( detach ) {
    detachSeparate(app);
  } else if ( single ) {
    closeOtherActorSheets(app, false);
  }
}

/* -------------------------------------------- */

/**
 * Close all other actor sheets to enforce one-sheet-at-a-time.
 * @param {ApplicationV2} keepApp Sheet to keep open
 * @param {boolean} keepSharedWindow Leave sheets in the shared detached window alone
 */
function closeOtherActorSheets(keepApp, keepSharedWindow) {
  const sharedWindowId = keepSharedWindow ? sharedWindow.windowId : null;
  for ( const instance of foundry.applications.instances.values() ) {
    if ( instance === keepApp ) continue;
    if ( instance?.document?.documentName !== "Actor" ) continue;
    if ( sharedWindowId && instance.window?.windowId === sharedWindowId ) continue;
    instance.close?.({ animate: false });
  }
}

/* -------------------------------------------- */

/**
 * Open (or focus) a token's actor sheet when the token is selected.
 * @param {Token} token
 * @param {boolean} controlled Whether the token is controlled
 */
function onControlToken(token, controlled) {
  if ( !controlled || !isOpenOnSelect() ) return;
  const sheet = token?.actor?.sheet;
  if ( !sheet || !isActorTypeIncluded(sheet) ) return;

  if ( !sheet.rendered ) {
    sheet.render(true);
    return;
  }

  if ( sheet.window?.windowId ) {
    foundry.applications.detached.windows.get(sheet.window.windowId)?.window?.focus();
  } else {
    sheet.bringToFront?.();
    routeSheet(sheet);
  }
}

/* -------------------------------------------- */

/**
 * Clear shared-window state when the detached window is closed manually.
 * @param {string} id Window id
 */
function onCloseDetachedWindow(id) {
  if ( sharedWindow.windowId !== id ) return;
  sharedWindow.windowId = null;
  sharedWindow.appId = null;
  lastSavedGeometry = null;
  pauseCapture = false;
  fitScheduled = false;
  if ( geometryTimer ) clearTimeout(geometryTimer);
  geometryTimer = null;
  stopGeometryPoll();
  unbindWindowListeners();
  unobserveSheet();
}

/* -------------------------------------------- */
/*  DETACH LOGIC                                */
/* -------------------------------------------- */

/**
 * Detach a sheet into its own window.
 * @param {ApplicationV2} app Actor sheet to detach
 */
function detachSeparate(app) {
  try {
    if ( app.window?.windowId ) return;
    app.detachWindow();
  } catch ( error ) {
    Logger.error(`Auto-detach (separate) failed: ${error.message}`);
  }
}

/* -------------------------------------------- */

/**
 * Queue a shared-window detach so concurrent renders are processed one at a time.
 * @param {ApplicationV2} app Actor sheet to detach
 * @returns {Promise<void>}
 */
function autoDetach(app) {
  detachQueue = detachQueue
    .catch(() => {})
    .then(() => detachNow(app))
    .catch(error => Logger.error(`Auto-detach failed: ${error.message}`));
  return detachQueue;
}

/* -------------------------------------------- */

/**
 * Move the given sheet into the shared detached window, replacing any prior sheet.
 * @param {ApplicationV2} app Actor sheet to detach
 */
async function detachNow(app) {
  if ( app.window?.windowId || app.state === foundry.applications.api.ApplicationV2.RENDER_STATES.CLOSED ) return;
  const descriptor = foundry.applications.detached.windows.get(DETACHED_WINDOW_ID);
  if ( descriptor?.window && !descriptor.window.closed ) {
    sharedWindow.windowId = DETACHED_WINDOW_ID;
    await adoptIntoSharedWindow(app, descriptor);
    return;
  }
  await openSharedWindow(app);
}

/* -------------------------------------------- */

/**
 * Adopt a freshly rendered sheet into the existing detached window.
 * @param {ApplicationV2} app New actor sheet
 * @param {{window: Window, applications: Map<string, ApplicationV2>}} descriptor Detached window descriptor
 */
async function adoptIntoSharedWindow(app, descriptor) {
  await app.render({ force: true, window: { detached: true, windowId: sharedWindow.windowId } });
  sharedWindow.appId = app.id;
  const stale = [...descriptor.applications.values()].filter(other => other && other.id !== app.id);
  for ( const other of stale ) {
    try {
      await other.close({ animate: false });
    } catch ( error ) {
      Logger.debug(`Auto-detach: failed to close replaced sheet - ${error.message}`);
    }
  }
  bindWindowListeners(descriptor.window);
  observeSheet(app, descriptor.window);
  scheduleFit(app, descriptor.window);
  descriptor.window.focus?.();
}

/* -------------------------------------------- */

/**
 * Open the shared detached window, restoring the saved geometry if available.
 * @param {ApplicationV2} app Actor sheet to detach
 */
async function openSharedWindow(app) {
  const savedGeometry = getSavedGeometry();
  const geometry = savedGeometry ?? getDefaultGeometry();
  const win = await foundry.applications.detached.openWindow({ id: DETACHED_WINDOW_ID, position: geometry });
  await app.render({ force: true, window: { detached: true, windowId: win.id } });
  sharedWindow.windowId = win.id;
  sharedWindow.appId = app.id;
  lastSavedGeometry = savedGeometry;
  bindWindowListeners(win);
  observeSheet(app, win);
  if ( savedGeometry ) applyWindowGeometry(savedGeometry);
  scheduleFit(app, win);
  startGeometryPoll();
}

/* -------------------------------------------- */

/**
 * Apply stored geometry to the detached window.
 * @param {{left: number, top: number, width: number, height: number}} geometry
 */
function applyWindowGeometry(geometry) {
  const win = getSharedWindow();
  if ( !win || win.closed ) return;
  pauseCapture = true;
  geometryTimer = setTimeout(() => {
    geometryTimer = null;
    try {
      if ( !win.closed ) {
        win.resizeTo(Math.round(geometry.width), Math.round(geometry.height));
        win.moveTo(Math.round(geometry.left), Math.round(geometry.top));
      }
    } catch ( error ) {
      Logger.debug(`Auto-detach: failed to apply window geometry - ${error.message}`);
    } finally {
      pauseCapture = false;
    }
  }, GEOMETRY_SETTLE_MS);
}

/* -------------------------------------------- */

/**
 * Get default window geometry when none has been saved yet.
 * @returns {{left: number, top: number, width: number, height: number}}
 */
function getDefaultGeometry() {
  const screenWidth = window.screen?.availWidth || 1280;
  const screenHeight = window.screen?.availHeight || 800;
  const width = Math.round(screenWidth * 0.8);
  const height = Math.round(screenHeight * 0.9);
  return {
    left: Math.round((screenWidth - width) / 2),
    top: Math.round((screenHeight - height) / 2),
    width,
    height
  };
}

/* -------------------------------------------- */
/*  FIT TO WINDOW                               */
/* -------------------------------------------- */

/**
 * Schedule a window fit on the next frame.
 * @param {ApplicationV2} app Actor sheet
 * @param {Window} win Detached window
 */
function scheduleFit(app, win) {
  if ( fitScheduled ) return;
  fitScheduled = true;
  win.requestAnimationFrame(() => {
    fitScheduled = false;
    applyFit(app, win);
  });
}

/* -------------------------------------------- */

/**
 * Fit actor sheet to the detached window.
 * @param {ApplicationV2} app Actor sheet
 * @param {Window} win Detached window
 */
function applyFit(app, win) {
  const element = app.element;
  if ( !element || win.closed ) return;

  const winWidth = win.innerWidth;
  const winHeight = win.innerHeight;
  if ( !winWidth || !winHeight ) return;

  const currentScale = app.position?.scale || 1;
  const ownRect = element.getBoundingClientRect();
  const ownWidth = ownRect.width / currentScale;
  const ownHeight = ownRect.height / currentScale;
  if ( !ownWidth || !ownHeight ) return;

  const visible = getVisibleBox(element, win);
  const overLeft = visible ? Math.clamp((ownRect.left - visible.left) / currentScale, 0, ownWidth * 0.5) : 0;
  const overTop = visible ? Math.clamp((ownRect.top - visible.top) / currentScale, 0, ownHeight * 0.5) : 0;

  try {
    if ( app.options?.window?.resizable ) {
      app.setPosition({
        scale: 1,
        left: overLeft,
        top: overTop,
        width: winWidth - overLeft,
        height: winHeight - overTop
      });
    } else {
      scaleToFit(app, { winWidth, winHeight, ownRect, ownWidth, ownHeight, currentScale, visible, overLeft, overTop });
    }
  } catch ( error ) {
    Logger.debug(`Auto-detach: failed to fit sheet to window - ${error.message}`);
  }
}

/* -------------------------------------------- */

/**
 * Scale a sheet to fit the window, centring it and keeping overhangs on-screen.
 * @param {ApplicationV2} app Actor sheet
 * @param {object} measure Pre-measured geometry
 * @param {number} measure.winWidth
 * @param {number} measure.winHeight
 * @param {DOMRect} measure.ownRect
 * @param {number} measure.ownWidth
 * @param {number} measure.ownHeight
 * @param {number} measure.currentScale
 * @param {object|null} measure.visible
 * @param {number} measure.overLeft
 * @param {number} measure.overTop
 */
function scaleToFit(app, measure) {
  const { winWidth, winHeight, ownRect, ownWidth, ownHeight, currentScale, visible, overLeft, overTop } = measure;
  const overRight = visible ? Math.clamp((visible.right - ownRect.right) / currentScale, 0, ownWidth * 0.5) : 0;
  const overBottom = visible ? Math.clamp((visible.bottom - ownRect.bottom) / currentScale, 0, ownHeight * 0.5) : 0;

  const fillScale = Math.min(winWidth / ownWidth, winHeight / ownHeight);
  const containScale = Math.min(
    winWidth / (ownWidth + overLeft + overRight),
    winHeight / (ownHeight + overTop + overBottom)
  );
  const scale = Math.min(MAX_FIT_SCALE, Math.max(0.2, Math.min(fillScale, containScale) * FIT_MARGIN));

  const scaledWidth = ownWidth * scale;
  const scaledHeight = ownHeight * scale;
  const leftMin = overLeft * scale;
  const leftMax = winWidth - scaledWidth - (overRight * scale);
  const topMin = overTop * scale;
  const topMax = winHeight - scaledHeight - (overBottom * scale);
  const left = Math.max(leftMin, Math.min(leftMax, (winWidth - scaledWidth) / 2));
  const top = Math.max(topMin, Math.min(topMax, (winHeight - scaledHeight) / 2));

  app.setPosition({ scale, left, top });
}

/* -------------------------------------------- */

/**
 * Compute the union of an element's bounding box with those of overflowing descendants (namely the floating tab bar).
 * @param {HTMLElement} root Element to measure
 * @param {Window} win Window the element lives in
 * @returns {{left: number, top: number, right: number, bottom: number, width: number, height: number}|null}
 */
function getVisibleBox(root, win) {
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;

  const include = rect => {
    if ( !rect.width || !rect.height ) return;
    minX = Math.min(minX, rect.left);
    minY = Math.min(minY, rect.top);
    maxX = Math.max(maxX, rect.right);
    maxY = Math.max(maxY, rect.bottom);
  };

  const walk = (element, positionedAncestor, visibleAncestor = true) => {
    const style = win.getComputedStyle(element);
    const isPositioned = style.position !== "static";
    const overflowVisible = style.overflow === "visible";
    if ( isPositioned && overflowVisible ) positionedAncestor = element;
    const isVisible = (positionedAncestor && style.position === "absolute") || (isPositioned && visibleAncestor);
    if ( isVisible ) include(element.getBoundingClientRect());
    const unionChildren = (!isPositioned && positionedAncestor) || (isPositioned && overflowVisible);
    if ( !overflowVisible ) visibleAncestor = false;
    if ( unionChildren ) {
      for ( const child of element.children ) walk(child, positionedAncestor, visibleAncestor);
    }
  };

  walk(root);
  if ( minX === Infinity ) return null;
  return { left: minX, top: minY, right: maxX, bottom: maxY, width: maxX - minX, height: maxY - minY };
}

/* -------------------------------------------- */

/**
 * Bind the detached window's listeners.
 * @param {Window} win
 */
function bindWindowListeners(win) {
  unbindWindowListeners();
  const onResize = () => {
    const descriptor = getSharedDescriptor();
    const app = descriptor?.applications.get(sharedWindow.appId);
    if ( app && descriptor?.window ) scheduleFit(app, descriptor.window);
  };
  const onUnload = () => setWindowGeometry();
  win.addEventListener("resize", onResize);
  win.addEventListener("pagehide", onUnload);
  removeWindowListeners = () => {
    win.removeEventListener("resize", onResize);
    win.removeEventListener("pagehide", onUnload);
  };
}

/* -------------------------------------------- */

/**
 * Observe and refit the detached sheet when its size changes.
 * @param {ApplicationV2} app Actor sheet
 * @param {Window} win Detached window
 */
function observeSheet(app, win) {
  unobserveSheet();
  const element = app.element;
  const ResizeObserverImpl = win.ResizeObserver;
  if ( !element || !ResizeObserverImpl ) return;
  sheetResizeObserver = new ResizeObserverImpl(() => {
    const descriptor = getSharedDescriptor();
    if ( descriptor?.window && sharedWindow.appId === app.id ) scheduleFit(app, descriptor.window);
  });
  sheetResizeObserver.observe(element);
}

/* -------------------------------------------- */

/**
 * Disconnect the active sheet resize observer.
 */
function unobserveSheet() {
  if ( sheetResizeObserver ) {
    try { sheetResizeObserver.disconnect(); } catch {}
  }
  sheetResizeObserver = null;
}

/* -------------------------------------------- */

/**
 * Unbind the detached window's listeners.
 */
function unbindWindowListeners() {
  if ( removeWindowListeners ) {
    try { removeWindowListeners(); } catch {}
  }
  removeWindowListeners = null;
}

/* -------------------------------------------- */
/*  GEOMETRY MEMORY                             */
/* -------------------------------------------- */

/**
 * Start polling the detached window geometry.
 */
function startGeometryPoll() {
  stopGeometryPoll();
  geometryPollTimer = setInterval(setWindowGeometry, GEOMETRY_POLL_MS);
}

/* -------------------------------------------- */

/**
 * Stop the geometry poll timer.
 */
function stopGeometryPoll() {
  if ( geometryPollTimer ) clearInterval(geometryPollTimer);
  geometryPollTimer = null;
}

/* -------------------------------------------- */

/**
 * Get the detached window's current geometry.
 * @returns {{left: number, top: number, width: number, height: number}|null}
 */
function getWindowGeometry() {
  const win = getSharedWindow();
  if ( !win || win.closed ) return null;

  const width = win.outerWidth || win.innerWidth;
  const height = win.outerHeight || win.innerHeight;
  const left = Number.isFinite(win.screenX) ? win.screenX : win.screenLeft;
  const top = Number.isFinite(win.screenY) ? win.screenY : win.screenTop;
  if ( !width || !height || width < MIN_DETACHED_SIZE || height < MIN_DETACHED_SIZE ) return null;
  return {
    left: Math.round(left || 0),
    top: Math.round(top || 0),
    width: Math.round(width),
    height: Math.round(height)
  };
}

/* -------------------------------------------- */

/**
 * Save the detached window's current geometry to a user flag.
 */
async function setWindowGeometry() {
  const win = getSharedWindow();
  if ( win?.closed ) {
    stopGeometryPoll();
    return;
  }
  if ( !win || pauseCapture ) return;
  const geometry = getWindowGeometry();
  if ( !geometry ) return;
  if ( lastSavedGeometry
    && lastSavedGeometry.left === geometry.left
    && lastSavedGeometry.top === geometry.top
    && lastSavedGeometry.width === geometry.width
    && lastSavedGeometry.height === geometry.height ) return;
  lastSavedGeometry = geometry;
  try {
    await setFlag(game.user, SETTING.AUTO_DETACH_GEOMETRY.KEY, geometry);
  } catch ( error ) {
    Logger.debug(`Auto-detach: failed to persist window geometry - ${error.message}`);
  }
}
