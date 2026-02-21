import { MODULE, CONSTANTS } from "./constants.js";
import { c5eLoadTemplates, getSetting, registerSetting } from "./utils.js";

const constants = CONSTANTS.RULER_TRAVEL_TIME;
const TEMPLATE = "modules/custom-dnd5e/templates/waypoint-label.hbs";

/**
 * Module-level state for the hovered token ID.
 */
let hoveredTokenId = null;

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
      name: game.i18n.localize(constants.SETTING.NAME),
      hint: game.i18n.localize(constants.SETTING.HINT),
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

  CONFIG.Canvas.rulerClass.WAYPOINT_LABEL_TEMPLATE = TEMPLATE;
  c5eLoadTemplates([TEMPLATE]);

  libWrapper.register(
    MODULE.ID,
    "CONFIG.Canvas.rulerClass.prototype._getWaypointLabelContext",
    getWaypointLabelContextPatch,
    "WRAPPER"
  );

  Hooks.on("hoverToken", onHoverToken);
}

/* -------------------------------------------- */

/**
 * D&D 5e travel pace rates in feet per minute.
 */
const PACE = [
  { fpm: 400, icon: "fa-solid fa-person-running" },
  { fpm: 300, icon: "fa-solid fa-person-walking" },
  { fpm: 200, icon: "fa-solid fa-person-hiking" }
];

/**
 * Pace multipliers for deriving fast/normal/slow from a token's speed.
 */
const PACE_MULTIPLIERS = [
  { multiplier: 4 / 3 },
  { multiplier: 1 },
  { multiplier: 2 / 3 }
];

/**
 * Map movement actions to actor movement speed properties.
 */
const ACTION_SPEED_MAP = {
  walk: "walk", fly: "fly", swim: "swim",
  burrow: "burrow", climb: "climb", crawl: "walk", jump: "walk"
};

/* -------------------------------------------- */

/**
 * Patch for _getWaypointLabelContext that adds travel time data.
 * @param {Function} wrapped The original function
 * @param {object} waypoint The waypoint
 * @param {object} state The state
 * @returns {object|void} The context
 */
function getWaypointLabelContextPatch(wrapped, waypoint, state) {
  const context = wrapped(waypoint, state);
  if ( !context ) return context;

  if ( game.combat?.started ) return context;
  if ( waypoint.next ) return context;

  const units = canvas.grid.units?.toLowerCase();
  if ( !isSupportedUnit(units) ) return context;

  const distance = waypoint.measurement?.distance;
  if ( !distance || distance <= 0 ) return context;

  const distanceFeet = isMiles(units) ? distance * 5280 : distance;

  context.uiScale = 1 / (canvas.stage.scale.x || 1);

  let token = hoveredTokenId
    ? canvas.tokens.get(hoveredTokenId) : null;

  // Verify the measurement originates from the hovered token
  if ( token ) {
    let firstWaypoint = waypoint;
    while ( firstWaypoint.previous ) firstWaypoint = firstWaypoint.previous;
    if ( !token.bounds.contains(firstWaypoint.x, firstWaypoint.y) ) {
      token = null;
    }
  }

  const baseFpm = getTokenSpeed(token);

  if ( baseFpm ) {
    const action = token.document?.movementAction || "walk";
    const actionConfig = CONFIG.Token.movement.actions[action];
    const label = game.i18n.localize(actionConfig?.label);
    context.travelTime = {
      label,
      paces: PACE_MULTIPLIERS.map((pace, i) => ({
        icon: PACE[i].icon,
        time: formatTime(distanceFeet / (baseFpm * pace.multiplier))
      }))
    };
  } else {
    context.travelTime = {
      paces: PACE.map(pace => ({
        icon: pace.icon,
        time: formatTime(distanceFeet / pace.fpm)
      }))
    };
  }

  return context;
}

/* -------------------------------------------- */

/**
 * Handle token hover to track the hovered token.
 * @param {Token} token The token
 * @param {boolean} hovered Whether the token is hovered
 */
function onHoverToken(token, hovered) {
  if ( hovered ) hoveredTokenId = token.id;
}

/* -------------------------------------------- */

/**
 * Get the hovered token's movement speed in feet per minute.
 * @param {Token} token The token
 * @returns {number|null} The speed in fpm, or null if unavailable
 */
function getTokenSpeed(token) {
  const actor = token?.actor;
  const movement = actor?.system?.attributes?.movement;
  if ( !movement ) return null;
  const action = token.document?.movementAction || "walk";
  if ( ["blink", "displace"].includes(action) ) return null;

  const speedType = ACTION_SPEED_MAP[action] || "walk";
  let speed = movement[speedType] || movement.walk || 0;

  if ( ["crawl", "jump"].includes(action) ) speed /= 2;
  if ( action === "climb" && !movement.climb ) {
    speed = (movement.walk || 0) / 2;
  }

  if ( speed <= 0 ) return null;
  return speed * 10;
}

/* -------------------------------------------- */

/**
 * Check if the grid unit is supported for travel time calculation.
 * @param {string} units The grid units
 * @returns {boolean}
 */
function isSupportedUnit(units) {
  return ["ft", "ft.", "feet", "mi", "mi.", "miles"].includes(units);
}

/* -------------------------------------------- */

/**
 * Check if the grid unit is miles.
 * @param {string} units The grid units
 * @returns {boolean}
 */
function isMiles(units) {
  return units === "mi" || units === "mi." || units === "miles";
}

/* -------------------------------------------- */

/**
 * Format a time value in minutes to a human-readable string.
 * Uses 8-hour travel days per D&D 5e rules.
 * @param {number} totalMinutes The total time in minutes
 * @returns {string} The formatted time string
 */
function formatTime(totalMinutes) {
  if ( totalMinutes < 1 ) {
    const seconds = Math.round(totalMinutes * 60);
    return `${seconds} sec`;
  }

  const days = Math.floor(totalMinutes / 480);
  const remainingAfterDays = totalMinutes - (days * 480);
  const hours = Math.floor(remainingAfterDays / 60);
  const minutes = Math.round(remainingAfterDays % 60);

  const parts = [];
  if ( days > 0 ) parts.push(`${days}d`);
  if ( hours > 0 ) parts.push(`${hours}h`);
  if ( minutes > 0 && days === 0 ) parts.push(`${minutes}m`);
  return parts.join(" ") || "< 1m";
}
