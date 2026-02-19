import { MODULE, CONSTANTS } from "./constants.js";
import { c5eLoadTemplates, getSetting, registerSetting } from "./utils.js";

const constants = CONSTANTS.RULER_TRAVEL_TIME;
const TEMPLATE = "modules/custom-dnd5e/templates/waypoint-label.hbs";

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

  context.travelTime = {
    paces: PACE.map(pace => ({
      icon: pace.icon,
      time: formatTime(distanceFeet / pace.fpm)
    }))
  };

  return context;
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
