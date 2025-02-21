import { SHEET_TYPE } from "../constants.js";

/**
 * Hook to modify the actor sheet before rendering.
 * @param {Application} app The application instance.
 * @param {object} data The data for rendering the sheet.
 */
Hooks.on("preRenderActorSheet", (app, data) => {
  const sheetType = SHEET_TYPE[app.constructor.name];

  if ( !sheetType || !sheetType.custom ) return;

  if ( data.abilityRows?.top?.length ) {
    data.abilityRows.bottom = [...data.abilityRows.bottom, ...data.abilityRows.top];
    data.abilityRows.top = [];
  }
});

/* -------------------------------------------- */

/**
 * Register the custom character sheet.
 */
export function registerCharacterSheet() {
  DocumentSheetConfig.registerSheet(Actor, "dnd5e", CustomDnd5eSheetCharacter2, {
    types: ["character"],
    makeDefault: false,
    label: "CUSTOM_DND5E.sheet.characterSheet"
  });
}

/* -------------------------------------------- */

/**
 * Class representing the custom character sheet.
 */
export class CustomDnd5eSheetCharacter2 extends dnd5e.applications.actor.ActorSheet5eCharacter2 {
  /**
   * Constructor for CustomDnd5eSheetCharacter2.
   *
   * @param {object} object The actor object.
   * @param {object} [options={}] Additional options for the sheet.
   */
  constructor(object, options = {}) {
    super(object, options);
  }

  /** @inheritDoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["custom-dnd5e", "dnd5e2", "sheet", "actor", "character", "vertical-tabs"]
    });
  }

  /* -------------------------------------------- */

  /**
   * Get the template path for the sheet.
   *
   * @returns {string} The template path.
   */
  get template() {
    if ( !game.user.isGM && this.actor.limited ) return "systems/dnd5e/templates/actors/limited-sheet-2.hbs";
    return "modules/custom-dnd5e/templates/sheet/character-sheet-2.hbs";
  }
}
