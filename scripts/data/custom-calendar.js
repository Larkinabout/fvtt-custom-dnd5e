/**
 * Custom calendar data model extending CalendarData5e with festival support.
 */
export class CustomCalendar extends dnd5e.dataModels.calendar.CalendarData5e {
  /** @override */
  static defineSchema() {
    const schema = super.defineSchema();
    schema.festivals = new foundry.data.fields.ArrayField(
      new foundry.data.fields.SchemaField({
        name: new foundry.data.fields.StringField(),
        month: new foundry.data.fields.NumberField({ integer: true }),
        day: new foundry.data.fields.NumberField({ integer: true })
      })
    );
    return schema;
  }

  /* -------------------------------------------- */

  /**
   * Find a festival matching the given time components.
   * @param {object} components The time components with month and dayOfMonth.
   * @returns {object|undefined} The matching festival entry, if any.
   */
  findFestivalDay(components) {
    const month = components.month + 1;
    const day = components.dayOfMonth + 1;
    return this.festivals.find(f => f.month === month && f.day === day);
  }

  /* -------------------------------------------- */

  /**
   * Format a date as month and day, showing festival name if applicable.
   * @param {CustomCalendar} calendar The calendar instance.
   * @param {object} components The time components.
   * @param {object} options Formatting options.
   * @returns {string} The formatted date.
   */
  static formatMonthDay(calendar, components, options) {
    const festival = calendar.findFestivalDay(components);
    if ( festival ) return festival.name;
    return super.formatMonthDay(calendar, components, options);
  }

  /* -------------------------------------------- */

  /**
   * Format a date as month, day, and year, showing festival name if applicable.
   * @param {CustomCalendar} calendar The calendar instance.
   * @param {object} components The time components.
   * @param {object} options Formatting options.
   * @returns {string} The formatted date.
   */
  static formatMonthDayYear(calendar, components, options) {
    const festival = calendar.findFestivalDay(components);
    if ( festival ) {
      const context = dnd5e.dataModels.calendar.CalendarData5e.dateFormattingParts(calendar, components);
      context.day = festival.name;
      return game.i18n.format("CUSTOM_DND5E.calendar.festivalDayYear", context);
    }
    return super.formatMonthDayYear(calendar, components, options);
  }
}
