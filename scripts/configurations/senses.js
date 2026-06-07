import { registerConfig } from "./config-engine.js";
import { MODULE } from "../constants.js";
import { Logger, c5eLoadTemplates, getFlag, getSetting } from "../utils.js";
import { ConfigForm } from "../forms/config-form.js";
import { configs } from "./registry.js";

/* -------------------------------------------- */
/*  CONSTANTS                                   */
/* -------------------------------------------- */

const constants = {
  ID: "senses",
  MENU: {
    KEY: "senses-menu",
    HINT: "CUSTOM_DND5E.menu.senses.hint",
    ICON: "fas fa-eye",
    LABEL: "CUSTOM_DND5E.menu.senses.label",
    NAME: "CUSTOM_DND5E.menu.senses.name"
  },
  SETTING: {
    ENABLE: {
      KEY: "enable-senses"
    },
    CONFIG: {
      KEY: "senses"
    }
  },
  TEMPLATE: {
    CONFIG_FORM_GROUP: "modules/custom-dnd5e/templates/movement-senses-config-form-group.hbs"
  },
  UUID: "Compendium.custom-dnd5e.custom-dnd5e-journals.JournalEntry.B48iqFBddUikMMer.JournalEntryPage.UC0cWoAGMtU6yISR"
};

/* -------------------------------------------- */
/*  FORM CLASSES                                */
/* -------------------------------------------- */

class SensesForm extends ConfigForm {
  /**
   * Constructor for SensesForm.
   */
  constructor() {
    super();
    this.editInList = true;
    this.listTitle = "CUSTOM_DND5E.form.senses.listTitle";
    this.requiresReload = false;
    this.config = configs.senses;
    this.setConfig = null; // Temporarily disabled until custom senses is supported in the dnd5e system
    this.includeConfig = false;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    id: `${MODULE.ID}-senses-form`,
    window: {
      title: "CUSTOM_DND5E.form.senses.title"
    }
  };
}

/* -------------------------------------------- */

/* -------------------------------------------- */

/**
 * Register settings, hooks, and templates.
 */
export function register() {
  registerConfig(DEFINITION);
  registerHooks();
  c5eLoadTemplates([DEFINITION.constants.TEMPLATE.CONFIG_FORM_GROUP]);
}

/* -------------------------------------------- */

/**
 * Register hooks.
 */
function registerHooks() {
  if ( !getSetting(DEFINITION.constants.SETTING.ENABLE.KEY) ) return;
  Hooks.on("renderMovementSensesConfig", addCustomSensesToConfig);
}

/* -------------------------------------------- */
/*  UI INJECTION                                */
/* -------------------------------------------- */

/**
 * Add custom senses to the Movement and Senses Configuration sheet.
 * @param {object} app
 * @param {HTMLElement} html
 */
async function addCustomSensesToConfig(app, html) {
  Logger.debug("Adding custom senses...");
  const actor = app.document;
  const systemSenses = ["blindsight", "darkvision", "tremorsense", "truesight"];
  const senses = getSetting(DEFINITION.constants.SETTING.CONFIG.KEY);
  const outerElement = html.querySelector("fieldset.card");
  let lastElement = null;

  for (const [key, value] of Object.entries(senses)) {
    const existingElement = html.querySelector(`input[name$='${key}']`)?.closest(".form-group");
    if ( existingElement ) {
      if ( value.visible === "false" ) {
        existingElement.remove();
      } else {
        if ( lastElement ) {
          lastElement.insertAdjacentElement("afterend", existingElement);
        }
        lastElement = existingElement;
      }
    } else if ( value.visible && value.visible !== undefined && !systemSenses.includes(key) ) {
      const data = { label: value.label, inputName: `flags.custom-dnd5e.${key}`, inputValue: getFlag(actor, key) };
      const template = await foundry.applications.handlebars.renderTemplate(
        DEFINITION.constants.TEMPLATE.CONFIG_FORM_GROUP, data
      );

      if ( lastElement ) {
        lastElement.insertAdjacentHTML("afterend", template);
      } else {
        outerElement.insertAdjacentHTML("afterbegin", template);
      }

      const currentElement = html.querySelector(`input[name$='${key}']`)?.closest(".form-group");
      if ( currentElement ) {
        lastElement = currentElement;
      }
    }
  }
  Logger.debug("Custom senses added");
}

/* -------------------------------------------- */
/*  DEFINITION                                  */
/* -------------------------------------------- */

const DEFINITION = {
  configKey: "senses",
  constants,
  form: SensesForm,
  loadTemplates: false,
  entryType: "scalar",
  entry: { source: "labelOrSelf", localize: true }
};
export default DEFINITION;
