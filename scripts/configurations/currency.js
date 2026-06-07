import { registerConfig } from "./config-engine.js";
import { MODULE, SHEET_TYPE } from "../constants.js";
import { getSetting } from "../utils.js";
import { ConfigForm } from "../forms/config-form.js";
import { ConfigEditForm } from "../forms/config-edit-form.js";
import { configs } from "./registry.js";

/* -------------------------------------------- */
/*  CONSTANTS                                   */
/* -------------------------------------------- */

const constants = {
  ID: "currency",
  MENU: {
    KEY: "currency-menu",
    HINT: "CUSTOM_DND5E.menu.currency.hint",
    ICON: "fas fa-coin",
    LABEL: "CUSTOM_DND5E.menu.currency.label",
    NAME: "CUSTOM_DND5E.menu.currency.name"
  },
  SETTING: {
    ENABLE: {
      KEY: "enable-currency"
    },
    CONFIG: {
      KEY: "currency"
    }
  },
  TEMPLATE: {
    EDIT: "modules/custom-dnd5e/templates/currency-edit.hbs"
  },
  UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.B48iqFBddUikMMer.JournalEntryPage.dmzCGf2LPoBlfu9m"
};

/* -------------------------------------------- */
/*  FORM CLASSES                                */
/* -------------------------------------------- */

class CurrencyEditForm extends ConfigEditForm {
  /**
   * Constructor for CurrencyEditForm.
   *
   * @param {object} args
   */
  constructor(args) {
    super(args);
    this.config = configs.currency;
    this.requiresReload = true;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-currency-edit-form`,
    position: {
      height: 340
    },
    window: {
      title: `CUSTOM_DND5E.form.${constants.ID}.edit.title`
    }
  };

  /* -------------------------------------------- */

  /**
   * Parts of the form.
   *
   * @type {object}
   */
  static PARTS = {
    form: {
      template: constants.TEMPLATE.EDIT
    }
  };
}

/* -------------------------------------------- */

class CurrencyForm extends ConfigForm {
  /**
   * Constructor for CurrencyForm.
   */
  constructor() {
    super();
    this.editForm = CurrencyEditForm;
    this.listTitle = `CUSTOM_DND5E.form.${constants.ID}.listTitle`;
    this.requiresReload = true;
    this.config = configs.currency;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-currency-form`,
    window: {
      title: `CUSTOM_DND5E.form.${constants.ID}.title`
    }
  };
}

/* -------------------------------------------- */

/* -------------------------------------------- */

/**
 * Register settings and hooks.
 */
export function register() {
  registerConfig(DEFINITION);
  registerHooks();
}

/* -------------------------------------------- */

/**
 * Register hooks.
 */
function registerHooks() {
  if ( !getSetting(DEFINITION.constants.SETTING.ENABLE.KEY) ) return;

  Hooks.on("renderCurrencyManager", (app, html, data) => {
    const setting = getSetting(DEFINITION.constants.SETTING.CONFIG.KEY);

    Object.entries(setting).forEach(([key, value]) => {
      if ( value.visible === false ) {
        html.querySelector(`input[name="amount.${key}"]`)?.closest("label")?.remove();
      }
    });
  });

  Hooks.on("renderActorSheetV2", (app, html, data) => {
    const sheetType = SHEET_TYPE[app.constructor.name];

    if ( !sheetType ) return;

    const setting = getSetting(DEFINITION.constants.SETTING.CONFIG.KEY);

    if ( !sheetType.legacy ) {
      Object.entries(setting).forEach(([key, value]) => {
        if ( value.visible === false ) {
          html.querySelector(`.${key}`)?.closest("label")?.remove();
        }
      });
    }
  });
}

/* -------------------------------------------- */
/*  DEFINITION                                  */
/* -------------------------------------------- */

const DEFINITION = {
  configKey: "currencies",
  hookName: "customDnd5e.setCurrencyConfig",
  constants,
  form: CurrencyForm,
  entryType: "object",
  entry: [
    { key: "abbreviation", localize: true },
    { key: "conversion" },
    { key: "icon" },
    { key: "label", localize: true }
  ]
};
export default DEFINITION;
