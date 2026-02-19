import { CONSTANTS, MODULE } from "../constants.js";
import { setSetting } from "../utils.js";

const constants = CONSTANTS.CALENDAR;

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Class representing the Calendar Edit Form.
 * @extends {HandlebarsApplicationMixin(ApplicationV2)}
 */
export class CalendarEditForm extends HandlebarsApplicationMixin(ApplicationV2) {
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

  /**
   * Default options for the form.
   * @type {object}
   */
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
      title: "CUSTOM_DND5E.form.calendars.edit.title",
      minimizable: true,
      resizable: true
    },
    tabGroups: {
      primary: "general"
    }
  };

  /* -------------------------------------------- */

  /**
   * Parts of the form.
   * @type {object}
   */
  static PARTS = {
    form: {
      template: constants.TEMPLATE.EDIT
    }
  };

  /* -------------------------------------------- */

  /**
   * Get a default empty calendar.
   * @returns {object} Default calendar data.
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
   * @returns {Promise<object>} The context data.
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
   * @param {Event} event The event that triggered the action.
   * @param {HTMLElement} target The target element.
   */
  static async addRow(event, target) {
    const section = target.dataset.section;
    if ( !section ) return;

    const list = this.element.querySelector(`ul[data-section="${section}"]`);
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
   * @param {Event} event The event that triggered the action.
   * @param {HTMLElement} target The target element.
   */
  static removeRow(event, target) {
    const item = target.closest(".custom-dnd5e-item");
    if ( !item ) return;
    item.remove();
  }

  /* -------------------------------------------- */

  /**
   * Submit the form data.
   * @param {Event} event The form submission event.
   * @param {HTMLFormElement} form The form element.
   * @param {object} formData The form data.
   */
  static async submit(event, form, formData) {
    const data = formData.object;

    // Build the calendar config
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

    // Save to the parent setting
    const settingData = foundry.utils.deepClone(this.setting);
    settingData[this.key] = calendarConfig;

    await setSetting(constants.SETTING.CONFIG.KEY, {});
    await setSetting(constants.SETTING.CONFIG.KEY, settingData);

    // Re-render the parent form
    if ( this.calendarForm ) {
      this.calendarForm.render(true);
    }

    foundry.applications.settings.SettingsConfig.reloadConfirm();
  }

  /* -------------------------------------------- */

  /**
   * Collect array data from flat form data.
   * @param {object} data The flat form data.
   * @param {string} section The section name (e.g., "months").
   * @param {string[]} fields The field names to collect.
   * @returns {object[]} The collected array data.
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

    // Convert to sorted array and filter out empty entries
    return Object.keys(items)
      .sort((a, b) => Number(a) - Number(b))
      .map(index => {
        const item = items[index];
        // Remove undefined leapDays
        if ( item.leapDays === undefined || item.leapDays === 0 ) {
          delete item.leapDays;
        }
        return item;
      })
      .filter(item => item.name || item.days || item.dayStart !== undefined);
  }
}
