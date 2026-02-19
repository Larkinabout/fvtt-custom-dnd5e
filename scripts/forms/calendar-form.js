import { CONSTANTS, JOURNAL_HELP_BUTTON, MODULE } from "../constants.js";
import { getSetting, Logger, setSetting, showImportDialog } from "../utils.js";
import { CustomDnd5eForm } from "./custom-dnd5e-form.js";
import { CalendarEditForm } from "./calendar-edit-form.js";
import { resetConfigSetting, setConfig } from "../configurations/calendar.js";

const constants = CONSTANTS.CALENDAR;

/**
 * Class representing the Calendar Form.
 * @extends CustomDnd5eForm
 */
export class CalendarForm extends CustomDnd5eForm {
  /**
   * Constructor for CalendarForm.
   * @param {...any} args The arguments for the form.
   */
  constructor(...args) {
    super(args);
    this.requiresReload = true;
    this.enableConfigKey = constants.SETTING.ENABLE.KEY;
    this.settingKey = constants.SETTING.CONFIG.KEY;
    this.resetConfigSetting = resetConfigSetting;
    this.setConfig = setConfig;
    if ( constants.UUID ) {
      this.headerButton = JOURNAL_HELP_BUTTON;
      this.headerButton.uuid = constants.UUID;
    }
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   * @type {object}
   */
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

  /**
   * Parts of the form.
   * @type {object}
   */
  static PARTS = {
    form: {
      template: constants.TEMPLATE.FORM
    }
  };

  /* -------------------------------------------- */

  /**
   * Prepare the context for the form.
   * @returns {Promise<object>} The context object.
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
   * @param {Event} event The event that triggered the edit.
   * @param {HTMLElement} target The target element.
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
      async (file) => {
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
   * @param {Event} event The form submission event.
   * @param {HTMLFormElement} form The form element.
   * @param {object} formData The form data.
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
