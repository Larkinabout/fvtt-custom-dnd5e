import { CONSTANTS, JOURNAL_HELP_BUTTON, MODULE } from "../constants.js";
import { getSetting, setSetting, resetSetting } from "../utils.js";
import { CustomDnd5eForm } from "./custom-dnd5e-form.js";
import { isProficiencyDiceMode } from "../patches/prepare-base-data.js";
import { getMaxChallengeRating, getMaxLevel } from "../gameplay/proficiency-bonus.js";

const constants = CONSTANTS.PROFICIENCY_BONUS;

/**
 * Form data per actor type.
 *
 * @type {Array<object>}
 */
const ACTOR_TYPES = [
  {
    tab: "characters",
    actorType: "character",
    label: "CUSTOM_DND5E.characters",
    icon: "fa-solid fa-users",
    enableKey: constants.SETTING.CHARACTER_ENABLE.KEY,
    tableKey: constants.SETTING.CHARACTER_PROFICIENCY_BONUS.KEY,
    getMax: getMaxLevel,
    enableLabel: "CUSTOM_DND5E.form.proficiencyBonus.enable.character.label",
    tableHeading: "CUSTOM_DND5E.form.proficiencyBonus.table.levelHeading",
    rowLabel: "CUSTOM_DND5E.form.proficiencyBonus.table.levelLabel"
  },
  {
    tab: "npcs",
    actorType: "npc",
    label: "CUSTOM_DND5E.npcs",
    icon: "fa-solid fa-dragon",
    enableKey: constants.SETTING.NPC_ENABLE.KEY,
    tableKey: constants.SETTING.NPC_PROFICIENCY_BONUS.KEY,
    getMax: getMaxChallengeRating,
    enableLabel: "CUSTOM_DND5E.form.proficiencyBonus.enable.npc.label",
    tableHeading: "CUSTOM_DND5E.form.proficiencyBonus.table.crHeading",
    rowLabel: "CUSTOM_DND5E.form.proficiencyBonus.table.crLabel"
  }
];

/* -------------------------------------------- */

/**
 * Format a proficiency bonus value as its Proficiency Dice term (1d[PB × 2]).
 * @param {number} pb Proficiency bonus
 * @returns {string} Die notation, or "None"
 */
function formatProficiencyDie(pb) {
  const n = Number(pb);
  if ( !Number.isFinite(n) || n <= 0 ) return game.i18n.localize("CUSTOM_DND5E.none");
  return `1d${n * 2}`;
}

/**
 * Class representing the Proficiency Bonus Form.
 */
export class ProficiencyBonusForm extends CustomDnd5eForm {
  /**
   * Constructor for ProficiencyBonusForm.
   *
   * @param {...any} args
   */
  constructor(...args) {
    super(args);
    this.type = "proficiency-bonus";
    this.headerButton = JOURNAL_HELP_BUTTON;
    this.headerButton.uuid = constants.UUID;
  }

  /* -------------------------------------------- */

  /**
   * Default options for the form.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    actions: {
      reset: ProficiencyBonusForm.reset
    },
    form: {
      handler: ProficiencyBonusForm.submit
    },
    id: `${MODULE.ID}-proficiency-bonus-form`,
    window: {
      title: "CUSTOM_DND5E.form.proficiencyBonus.title"
    },
    tabGroups: {
      primary: "characters"
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
      template: constants.TEMPLATE.FORM
    }
  };

  /* -------------------------------------------- */

  /**
   * Prepare the context for rendering the form.
   *
   * @returns {Promise<object>} Context data
   */
  async _prepareContext() {
    const diceMode = isProficiencyDiceMode();

    return {
      activeTab: this.tabGroups.primary ?? "characters",
      diceMode,
      tabs: ACTOR_TYPES.map(({ tab, label, icon }) => ({ id: tab, label, icon })),
      sections: ACTOR_TYPES.map(descriptor => this.#prepareSection(descriptor, diceMode))
    };
  }

  /* -------------------------------------------- */

  /**
   * Prepare the tab section for an actor type.
   *
   * @param {object} descriptor Actor type descriptor
   * @param {boolean} diceMode Whether the Proficiency Dice variant is active
   * @returns {object} Section data
   */
  #prepareSection(descriptor, diceMode) {
    const { tab, actorType, enableKey, tableKey, getMax, enableLabel, tableHeading, rowLabel } = descriptor;
    const max = getMax();
    const table = getSetting(tableKey) ?? {};

    const rows = [];
    for ( let level = 1; level <= max; level++ ) {
      const raw = table[level] ?? table[String(level)];
      const hasValue = !(raw === undefined || raw === null || raw === "");
      const defaultPb = Math.floor((level + 7) / 4);
      rows.push({
        level,
        label: game.i18n.format(rowLabel, { value: level }),
        value: hasValue ? raw : "",
        placeholder: defaultPb,
        dice: diceMode ? formatProficiencyDie(hasValue ? Number(raw) : defaultPb) : null
      });
    }

    return {
      tab,
      actorType,
      enableLabel,
      tableHeading,
      enable: getSetting(enableKey),
      rows
    };
  }

  /* -------------------------------------------- */

  /**
   * When using the Proficiency Dice variant, update the die preview on input.
   *
   * @param {object} context
   * @param {object} options
   */
  _onRender(context, options) {
    super._onRender(context, options);

    if ( !context.diceMode ) return;

    this.element.querySelectorAll('input[name*=".table."]').forEach(input => {
      input.addEventListener("input", () => {
        const preview = input.closest(".form-group")?.querySelector(".custom-dnd5e-pb-dice");
        if ( !preview ) return;
        preview.textContent = formatProficiencyDie(input.value || input.placeholder);
      });
    });
  }

  /* -------------------------------------------- */

  /**
   * Reset the form to default settings.
   */
  static async reset() {
    const reset = async () => {
      await Promise.all(
        ACTOR_TYPES.flatMap(({ enableKey, tableKey }) => [resetSetting(enableKey), resetSetting(tableKey)])
      );
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
   *
   * @param {Event} event
   * @param {HTMLFormElement} form
   * @param {object} formData
   */
  static async submit(event, form, formData) {
    const tables = Object.fromEntries(ACTOR_TYPES.map(({ actorType }) => [actorType, {}]));

    for ( const [key, value] of Object.entries(formData.object) ) {
      const [actorType, property, level] = key.split(".");
      if ( property !== "table" || !tables[actorType] ) continue;
      if ( value === "" || value === null || value === undefined ) continue;
      const num = Number(value);
      if ( Number.isNaN(num) ) continue;
      tables[actorType][level] = num;
    }

    await Promise.all(
      ACTOR_TYPES.flatMap(({ actorType, enableKey, tableKey }) => [
        setSetting(enableKey, formData.object[`${actorType}.enable`]),
        setSetting(tableKey, tables[actorType])
      ])
    );

    foundry.applications.settings.SettingsConfig.reloadConfirm();
  }
}
