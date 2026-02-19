import { CONSTANTS } from "../constants.js";
import { Logger, c5eLoadTemplates, getSetting, registerMenu, registerSetting, resetSetting } from "../utils.js";
import { CalendarForm } from "../forms/calendar-form.js";
import { CustomCalendar } from "../data/custom-calendar.js";

const constants = CONSTANTS.CALENDAR;

/**
 * Register the dnd5e.setupCalendar hook at module load time.
 * This hook fires during dnd5e's init, before module init hooks run,
 * so the listener must be in place before init.
 */
Hooks.on("dnd5e.setupCalendar", () => {
  setConfig(getSetting(constants.SETTING.CONFIG.KEY));
});

/**
 * Register settings and load templates.
 */
export function register() {
  registerSettings();

  const templates = [
    constants.TEMPLATE.FORM,
    constants.TEMPLATE.LIST,
    constants.TEMPLATE.EDIT,
    constants.TEMPLATE.MONTHS_LIST,
    constants.TEMPLATE.DAYS_LIST,
    constants.TEMPLATE.SEASONS_LIST,
    constants.TEMPLATE.FESTIVALS_LIST
  ];
  c5eLoadTemplates(templates);
}

/* -------------------------------------------- */

/**
 * Register settings.
 */
function registerSettings() {
  registerMenu(
    constants.MENU.KEY,
    {
      hint: game.i18n.localize(constants.MENU.HINT),
      label: game.i18n.localize(constants.MENU.LABEL),
      name: game.i18n.localize(constants.MENU.NAME),
      icon: constants.MENU.ICON,
      type: CalendarForm,
      restricted: true,
      scope: "world"
    }
  );

  registerSetting(
    constants.SETTING.ENABLE.KEY,
    {
      scope: "world",
      config: false,
      requiresReload: true,
      type: Boolean,
      default: false
    }
  );

  registerSetting(
    constants.SETTING.CONFIG.KEY,
    {
      scope: "world",
      config: false,
      requiresReload: true,
      type: Object,
      default: getSettingDefault()
    }
  );
}

/* -------------------------------------------- */

/**
 * Get default config.
 * @returns {object} The config data
 */
export function getSettingDefault() {
  return {};
}

/* -------------------------------------------- */

/**
 * Reset config and setting to their default values.
 */
export async function resetConfigSetting() {
  await resetSetting(constants.SETTING.CONFIG.KEY);
}

/* -------------------------------------------- */

/**
 * Set custom calendars into CONFIG.DND5E.calendar.calendars.
 * @param {object} [settingData=null] The setting data
 */
export function setConfig(settingData = null) {
  if ( !getSetting(constants.SETTING.ENABLE.KEY) ) return;
  if ( !settingData || !Object.keys(settingData).length ) return;
  if ( !CONFIG.DND5E?.calendar?.calendars ) return;

  for ( const [key, calendarConfig] of Object.entries(settingData) ) {
    if ( !calendarConfig?.name ) continue;

    const config = {
      name: calendarConfig.name,
      years: calendarConfig.years ?? {},
      months: calendarConfig.months ?? {},
      days: calendarConfig.days ?? {},
      seasons: calendarConfig.seasons ?? {}
    };

    // Include festivals in the config so the CustomCalendar class can access them
    if ( calendarConfig.festivals?.length ) {
      config.festivals = calendarConfig.festivals;
    }

    const value = `custom-dnd5e-${key}`;

    // Avoid duplicates on re-registration
    const existing = CONFIG.DND5E.calendar.calendars.findIndex(c => c.value === value);
    const entry = {
      value,
      label: calendarConfig.name,
      config,
      class: CustomCalendar
    };

    if ( existing >= 0 ) {
      CONFIG.DND5E.calendar.calendars[existing] = entry;
    } else {
      CONFIG.DND5E.calendar.calendars.push(entry);
    }

    Logger.debug(`Registered custom calendar: ${calendarConfig.name} (${value})`);
  }
}
