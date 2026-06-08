import {
  Logger,
  c5eLoadTemplates,
  getSetting,
  registerMenu,
  registerSetting,
  resetSetting,
  setSetting,
  showImportDialog } from "../utils.js";
import { CONSTANTS, MODULE } from "../constants.js";
import { CustomDnd5eForm } from "../forms/custom-dnd5e-form.js";
import { CustomCalendar } from "../data/custom-calendar.js";
import { configs } from "./registry.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/* -------------------------------------------- */
/*  CONSTANTS                                   */
/* -------------------------------------------- */

export const constants = {
  ID: "calendars",
  MENU: {
    KEY: "calendar-menu",
    HINT: "CUSTOM_DND5E.menu.calendars.hint",
    ICON: "fas fa-calendar-days",
    LABEL: "CUSTOM_DND5E.menu.calendars.label",
    NAME: "CUSTOM_DND5E.menu.calendars.name"
  },
  SETTING: {
    ENABLE: {
      KEY: "enable-calendar"
    },
    CONFIG: {
      KEY: "calendar"
    }
  },
  TEMPLATE: {
    FORM: "modules/custom-dnd5e/templates/calendar/calendar-form.hbs",
    EDIT: "modules/custom-dnd5e/templates/calendar/calendar-edit-form.hbs",
    MONTHS_LIST: "modules/custom-dnd5e/templates/calendar/calendar-months-list.hbs",
    DAYS_LIST: "modules/custom-dnd5e/templates/calendar/calendar-days-list.hbs",
    SEASONS_LIST: "modules/custom-dnd5e/templates/calendar/calendar-seasons-list.hbs",
    FESTIVALS_LIST: "modules/custom-dnd5e/templates/calendar/calendar-festivals-list.hbs"
  },
  UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.B48iqFBddUikMMer.JournalEntryPage.cR8kYmNpV3tZbW5d"
};
export const configKey = "calendar";

/**
 * Register the dnd5e.setupCalendar hook at module load time.
 * This hook fires during dnd5e's init, before module init hooks run,
 * so the listener must be in place before init.
 */
Hooks.on("dnd5e.setupCalendar", () => {
  setConfig(getSetting(constants.SETTING.CONFIG.KEY));
});

/* -------------------------------------------- */
/*  EDIT FORM                                   */
/* -------------------------------------------- */

/**
 * Per-calendar edit form. Renders a single calendar's name, years, months, days, seasons, and
 * festivals; writes the result back into the parent CalendarForm's setting.
 * @extends {HandlebarsApplicationMixin(ApplicationV2)}
 */
class CalendarEditForm extends HandlebarsApplicationMixin(ApplicationV2) {
  /**
   * Constructor for CalendarEditForm.
   * @param {object} args Arguments for the form.
   */
  constructor(args) {
    super(args);
    this.calendarForm = args.calendarForm;
    this.key = args.key;
    this.calendarData = args.calendarData ?? this._getDefaultCalendar();
    this.setting = args.setting;
  }

  /* -------------------------------------------- */

  static DEFAULT_OPTIONS = {
    actions: {
      addRow: CalendarEditForm.addRow,
      removeRow: CalendarEditForm.removeRow
    },
    classes: [`${MODULE.ID}-app`, "dnd5e2", "sheet"],
    tag: "form",
    form: {
      handler: CalendarEditForm.submit,
      submitOnChange: false,
      closeOnSubmit: true
    },
    id: `${MODULE.ID}-calendar-edit-form`,
    position: {
      width: 600,
      height: 680
    },
    window: {
      title: `CUSTOM_DND5E.form.${constants.ID}.edit.title`,
      minimizable: true,
      resizable: true
    },
    tabGroups: {
      primary: "general"
    }
  };

  /* -------------------------------------------- */

  static PARTS = {
    form: {
      template: constants.TEMPLATE.EDIT
    }
  };

  /* -------------------------------------------- */

  /**
   * Get a default empty calendar.
   * @returns {object} Default calendar data
   */
  _getDefaultCalendar() {
    return {
      name: "",
      years: {
        yearZero: 1,
        firstWeekday: 0,
        leapYear: {
          leapStart: 0,
          leapInterval: 0
        }
      },
      months: {
        values: []
      },
      days: {
        values: [],
        daysPerYear: 365,
        hoursPerDay: 24,
        minutesPerHour: 60,
        secondsPerMinute: 60
      },
      seasons: {
        values: []
      },
      festivals: []
    };
  }

  /* -------------------------------------------- */

  /**
   * Prepare the context for rendering the form.
   * @returns {Promise<object>} Context data
   */
  async _prepareContext() {
    const data = this.calendarData;
    return {
      name: data.name ?? "",
      years: {
        yearZero: data.years?.yearZero ?? 1,
        firstWeekday: data.years?.firstWeekday ?? 0,
        firstWeekdayDisplay: (data.years?.firstWeekday ?? 0) + 1,
        leapYear: {
          leapStart: data.years?.leapYear?.leapStart ?? 0,
          leapInterval: data.years?.leapYear?.leapInterval ?? 0
        }
      },
      months: (data.months?.values ?? []).map((m, i) => ({ ...m, index: i }))
        .sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0)),
      days: {
        values: (data.days?.values ?? []).map((d, i) => ({ ...d, index: i }))
          .sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0)),
        daysPerYear: data.days?.daysPerYear ?? 365,
        hoursPerDay: data.days?.hoursPerDay ?? 24,
        minutesPerHour: data.days?.minutesPerHour ?? 60,
        secondsPerMinute: data.days?.secondsPerMinute ?? 60
      },
      seasons: (data.seasons?.values ?? []).map((s, i) => ({ ...s, index: i }))
        .sort((a, b) => (a.dayStart ?? 0) - (b.dayStart ?? 0)),
      festivals: (data.festivals ?? []).map((f, i) => ({ ...f, index: i }))
        .sort((a, b) => (a.month ?? 0) - (b.month ?? 0) || (a.day ?? 0) - (b.day ?? 0)),
      activeTab: this.tabGroups.primary ?? "general"
    };
  }

  /* -------------------------------------------- */

  /**
   * Add a new row to an array section.
   * @param {Event} event
   * @param {HTMLElement} target
   */
  static async addRow(event, target) {
    const section = target.dataset.section;
    if ( !section ) return;

    const list = this.element.querySelector(`ol[data-section="${section}"]`);
    if ( !list ) return;

    const existingItems = list.querySelectorAll("li");
    const nextIndex = existingItems.length;
    const nextOrdinal = nextIndex + 1;

    let templatePath;
    let data;

    switch ( section ) {
      case "months":
        templatePath = constants.TEMPLATE.MONTHS_LIST;
        data = { months: [{ name: "", abbreviation: "", ordinal: nextOrdinal, days: 30, leapDays: "" }] };
        // Remap index for the template
        data.months = data.months.map((m, i) => ({ ...m, index: nextIndex + i }));
        break;
      case "days":
        templatePath = constants.TEMPLATE.DAYS_LIST;
        data = { days: [{ name: "", abbreviation: "", ordinal: nextOrdinal }] };
        data.days = data.days.map((d, i) => ({ ...d, index: nextIndex + i }));
        break;
      case "seasons":
        templatePath = constants.TEMPLATE.SEASONS_LIST;
        data = { seasons: [{ name: "", dayStart: 0, dayEnd: 0 }] };
        data.seasons = data.seasons.map((s, i) => ({ ...s, index: nextIndex + i }));
        break;
      case "festivals":
        templatePath = constants.TEMPLATE.FESTIVALS_LIST;
        data = { festivals: [{ name: "", month: 1, day: 1 }] };
        data.festivals = data.festivals.map((f, i) => ({ ...f, index: nextIndex + i }));
        break;
      default:
        return;
    }

    const html = await foundry.applications.handlebars.renderTemplate(templatePath, data);
    list.insertAdjacentHTML("beforeend", html);

    const scrollable = list.closest(".scrollable");
    if ( scrollable ) {
      scrollable.scrollTop = scrollable.scrollHeight;
    }
  }

  /* -------------------------------------------- */

  /**
   * Remove a row from an array section.
   * @param {Event} event
   * @param {HTMLElement} target
   */
  static removeRow(event, target) {
    const item = target.closest(".custom-dnd5e-item");
    if ( !item ) return;
    item.remove();
  }

  /* -------------------------------------------- */

  /**
   * Submit the form data.
   * @param {Event} event
   * @param {HTMLFormElement} form
   * @param {object} formData
   */
  static async submit(event, form, formData) {
    const data = formData.object;

    const daysValues = CalendarEditForm._collectArrayData(data, "days", ["name", "abbreviation", "ordinal"]);
    const hasDays = daysValues.length > 0;
    const firstWeekday = Number(data["years.firstWeekday"]) || 0;

    const calendarConfig = {
      name: data.name || "Unnamed Calendar",
      years: {
        yearZero: Number(data["years.yearZero"]) || 1,
        firstWeekday: hasDays ? firstWeekday : Math.max(0, firstWeekday - 1),
        leapYear: {
          leapStart: Number(data["years.leapYear.leapStart"]) || 0,
          leapInterval: Number(data["years.leapYear.leapInterval"]) || 0
        }
      },
      months: {
        values: CalendarEditForm._collectArrayData(data, "months", ["name", "abbreviation", "ordinal", "days", "leapDays"])
      },
      days: {
        values: daysValues,
        daysPerYear: Number(data["days.daysPerYear"]) || 365,
        hoursPerDay: Number(data["days.hoursPerDay"]) || 24,
        minutesPerHour: Number(data["days.minutesPerHour"]) || 60,
        secondsPerMinute: Number(data["days.secondsPerMinute"]) || 60
      },
      seasons: {
        values: CalendarEditForm._collectArrayData(data, "seasons", ["name", "dayStart", "dayEnd"])
      },
      festivals: CalendarEditForm._collectArrayData(data, "festivals", ["name", "month", "day"])
    };

    const settingData = foundry.utils.deepClone(this.setting);
    settingData[this.key] = calendarConfig;

    await setSetting(constants.SETTING.CONFIG.KEY, {});
    await setSetting(constants.SETTING.CONFIG.KEY, settingData);

    if ( this.calendarForm ) {
      this.calendarForm.render(true);
    }

    foundry.applications.settings.SettingsConfig.reloadConfirm();
  }

  /* -------------------------------------------- */

  /**
   * Collect array data from flat form data.
   * @param {object} data Flat form data
   * @param {string} section Section name (e.g., "months")
   * @param {string[]} fields
   * @returns {object[]} Collected array data
   */
  static _collectArrayData(data, section, fields) {
    const items = {};
    const numericFields = ["ordinal", "days", "leapDays", "dayStart", "dayEnd", "month", "day"];

    for ( const [key, value] of Object.entries(data) ) {
      if ( !key.startsWith(`${section}.`) ) continue;

      const parts = key.split(".");
      if ( parts.length !== 3 ) continue;

      const index = parts[1];
      const field = parts[2];

      if ( !fields.includes(field) ) continue;

      if ( !items[index] ) items[index] = {};

      if ( numericFields.includes(field) ) {
        const num = Number(value);
        items[index][field] = isNaN(num) ? undefined : num;
      } else {
        items[index][field] = value;
      }
    }

    return Object.keys(items)
      .sort((a, b) => Number(a) - Number(b))
      .map(index => {
        const item = items[index];
        if ( item.leapDays === undefined || item.leapDays === 0 ) {
          delete item.leapDays;
        }
        return item;
      })
      .filter(item => item.name || item.days || item.dayStart !== undefined);
  }
}

/* -------------------------------------------- */
/*  MAIN FORM                                   */
/* -------------------------------------------- */

/**
 * Calendar list settings menu form.
 * @extends CustomDnd5eForm
 */
class CalendarForm extends CustomDnd5eForm {
  /**
   * Constructor for CalendarForm.
   * @param {...any} args
   */
  constructor(...args) {
    super(args);
    this.requiresReload = true;
    this.config = configs.calendar;
  }

  /* -------------------------------------------- */

  static DEFAULT_OPTIONS = {
    actions: {
      edit: CalendarForm.edit,
      export: CalendarForm.export,
      import: CalendarForm.import,
      new: CalendarForm.createItem,
      reset: CalendarForm.reset
    },
    form: {
      handler: CalendarForm.submit
    },
    id: `${MODULE.ID}-calendar-form`,
    window: {
      title: "CUSTOM_DND5E.form.calendars.title"
    }
  };

  /* -------------------------------------------- */

  static PARTS = {
    form: {
      template: constants.TEMPLATE.FORM
    }
  };

  /* -------------------------------------------- */

  /**
   * Prepare the context for the form.
   * @returns {Promise<object>} Context data
   */
  async _prepareContext() {
    this.setting = getSetting(this.settingKey) ?? {};

    const items = {};
    Object.entries(this.setting).forEach(([key, value]) => {
      items[key] = {
        key,
        name: value.name ?? key
      };
    });

    const context = { items };

    if ( this.enableConfigKey ) {
      this.enableConfig = getSetting(this.enableConfigKey);
      context.enableConfig = this.enableConfig;
    }

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Create a new calendar.
   */
  static async createItem() {
    const key = foundry.utils.randomID();
    const args = {
      calendarForm: this,
      key,
      calendarData: null,
      setting: this.setting
    };
    const form = new CalendarEditForm(args);
    form.render(true);
  }

  /* -------------------------------------------- */

  /**
   * Edit an existing calendar.
   * @param {Event} event
   * @param {HTMLElement} target
   */
  static async edit(event, target) {
    const item = target.closest(".custom-dnd5e-item");
    if ( !item ) return;

    const key = item.dataset.key;
    if ( !key ) return;

    const args = {
      calendarForm: this,
      key,
      calendarData: foundry.utils.deepClone(this.setting[key]),
      setting: this.setting
    };
    const form = new CalendarEditForm(args);
    form.render(true);
  }

  /* -------------------------------------------- */

  /**
   * Export calendars to a JSON file.
   */
  static async export() {
    const settingData = getSetting(constants.SETTING.CONFIG.KEY) ?? {};
    if ( !Object.keys(settingData).length ) {
      Logger.error(game.i18n.localize("CUSTOM_DND5E.dialog.calendars.exportEmpty"), true);
      return;
    }
    const data = {
      customDnd5eVersion: game.modules.get(MODULE.ID).version,
      calendars: settingData
    };
    saveDataToFile(JSON.stringify(data, null, 2), "text/json", `${MODULE.ID}-calendars.json`);
  }

  /* -------------------------------------------- */

  /**
   * Import calendars from a JSON file.
   */
  static async import() {
    const result = await showImportDialog(
      CONSTANTS.DEBUG.TEMPLATE.IMPORT_DIALOG,
      {
        hint: game.i18n.localize("CUSTOM_DND5E.dialog.calendars.importHint"),
        warning: game.i18n.localize("CUSTOM_DND5E.dialog.calendars.importWarning")
      },
      async file => {
        const json = await readTextFromFile(file);
        const jsonData = JSON.parse(json);
        if ( !jsonData.calendars || typeof jsonData.calendars !== "object" ) {
          Logger.error(game.i18n.localize("CUSTOM_DND5E.dialog.calendars.importInvalid"), true);
          return false;
        }
        await setSetting(constants.SETTING.CONFIG.KEY, {});
        await setSetting(constants.SETTING.CONFIG.KEY, jsonData.calendars);
        Logger.info(game.i18n.localize("CUSTOM_DND5E.dialog.calendars.importSuccess"), true);
        return true;
      }
    );
    if ( result ) {
      this.render(true);
      foundry.applications.settings.SettingsConfig.reloadConfirm();
    }
  }

  /* -------------------------------------------- */

  /**
   * Reset the form to default settings.
   */
  static async reset() {
    const reset = async () => {
      await this.resetConfigSetting();
      this.render(true);
    };

    await foundry.applications.api.DialogV2.confirm({
      window: {
        title: game.i18n.localize("CUSTOM_DND5E.dialog.reset.title")
      },
      content: `<p>${game.i18n.localize("CUSTOM_DND5E.dialog.reset.content")}</p>`,
      modal: true,
      yes: {
        label: game.i18n.localize("CUSTOM_DND5E.yes"),
        callback: async () => {
          reset();
        }
      },
      no: {
        label: game.i18n.localize("CUSTOM_DND5E.no")
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * Submit the form data.
   * @param {Event} event
   * @param {HTMLFormElement} form
   * @param {object} formData
   */
  static async submit(event, form, formData) {
    // Handle enableConfig
    if ( this.enableConfigKey ) {
      const newEnableConfig = formData.object.enableConfig;
      if ( this.enableConfig !== newEnableConfig ) {
        this.requiresReload = true;
      }
      this.enableConfig = newEnableConfig;
      await setSetting(this.enableConfigKey, this.enableConfig);
    }
    delete formData.object.enableConfig;

    // Process deletions
    const settingData = foundry.utils.deepClone(this.setting);
    for ( const [key, value] of Object.entries(formData.object) ) {
      if ( key.endsWith(".delete") && value === "true" ) {
        const calendarKey = key.split(".")[0];
        delete settingData[calendarKey];
      }
    }

    await setSetting(this.settingKey, {});
    await setSetting(this.settingKey, settingData);

    if ( this.requiresReload ) {
      foundry.applications.settings.SettingsConfig.reloadConfirm();
    }

    this.close();
  }
}

/* -------------------------------------------- */
/*  REGISTRATION                                */
/* -------------------------------------------- */

/**
 * Register settings and load templates.
 */
export function register() {
  registerSettings();

  const templates = [
    constants.TEMPLATE.FORM,
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
/*  CONFIG                                      */
/* -------------------------------------------- */

/**
 * Get default config.
 * @returns {object} Default config data
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
 * @param {object} [settingData=null]
 */
export function setConfig(settingData) {
  if ( !getSetting(constants.SETTING.ENABLE.KEY) ) return;
  settingData ??= getSetting(constants.SETTING.CONFIG.KEY);
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

    if ( calendarConfig.festivals?.length ) {
      config.festivals = calendarConfig.festivals;
    }

    const value = `custom-dnd5e-${key}`;

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
