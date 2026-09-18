/**
 * Register the custom character sheet.
 */
export function registerCharacterSheet() {
  foundry.applications.apps.DocumentSheetConfig.registerSheet(Actor, "dnd5e", CustomDnd5eCharacterActorSheet, {
    types: ["character"],
    makeDefault: false,
    label: "CUSTOM_DND5E.sheet.characterSheet"
  });
}

/* -------------------------------------------- */

/**
 * Class representing the custom character sheet.
 */
export class CustomDnd5eCharacterActorSheet extends dnd5e.applications.actor.CharacterActorSheet {
  static DEFAULT_OPTIONS = {
    classes: ["custom-dnd5e"]
  };

  /* -------------------------------------------- */

  static PARTS = {
    ...super.PARTS,
    details: {
      container: { classes: ["tab-body"], id: "tabs" },
      template: "modules/custom-dnd5e/templates/sheet/character-details.hbs",
      templates: ["systems/dnd5e/templates/actors/character-ability-scores.hbs"],
      scrollable: [""]
    }
  };

  static {
    delete this.PARTS.abilityScores;
  }

  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    if ( partId === "details" ) {
      return this._prepareAbilityScoresContext(context, options);
    }
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the ability scores.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {ApplicationRenderContext}
   * @protected
   */
  async _prepareAbilityScoresContext(context, options) {
    for ( const ability of this._prepareAbilities(context) ) {
      context.abilityRows.bottom.push(ability);
    }
    return context;
  }
}
