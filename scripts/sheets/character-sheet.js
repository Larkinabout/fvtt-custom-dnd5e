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
    header: {
      template: "systems/dnd5e/templates/actors/character-header.hbs"
    },
    sidebar: {
      container: { classes: ["main-content"], id: "main" },
      template: "systems/dnd5e/templates/actors/character-sidebar.hbs"
    },
    details: {
      container: { classes: ["tab-body"], id: "tabs" },
      template: "modules/custom-dnd5e/templates/sheet/character-details.hbs",
      templates: ["systems/dnd5e/templates/actors/character-ability-scores.hbs"],
      scrollable: [""]
    },
    inventory: {
      container: { classes: ["tab-body"], id: "tabs" },
      template: "systems/dnd5e/templates/actors/tabs/character-inventory.hbs",
      templates: [
        "systems/dnd5e/templates/inventory/inventory.hbs", "systems/dnd5e/templates/inventory/activity.hbs",
        "systems/dnd5e/templates/inventory/encumbrance.hbs", "systems/dnd5e/templates/inventory/containers.hbs"
      ],
      scrollable: [""]
    },
    features: {
      container: { classes: ["tab-body"], id: "tabs" },
      template: "systems/dnd5e/templates/actors/tabs/character-features.hbs",
      templates: ["systems/dnd5e/templates/inventory/inventory.hbs", "systems/dnd5e/templates/inventory/activity.hbs"],
      scrollable: [""]
    },
    spells: {
      container: { classes: ["tab-body"], id: "tabs" },
      template: "systems/dnd5e/templates/actors/tabs/creature-spells.hbs",
      templates: ["systems/dnd5e/templates/inventory/inventory.hbs", "systems/dnd5e/templates/inventory/activity.hbs"],
      scrollable: [""]
    },
    effects: {
      container: { classes: ["tab-body"], id: "tabs" },
      template: "systems/dnd5e/templates/actors/tabs/actor-effects.hbs",
      scrollable: [""]
    },
    biography: {
      container: { classes: ["tab-body"], id: "tabs" },
      template: "systems/dnd5e/templates/actors/tabs/character-biography.hbs",
      scrollable: [""]
    },
    bastion: {
      container: { classes: ["tab-body"], id: "tabs" },
      template: "systems/dnd5e/templates/actors/tabs/character-bastion.hbs",
      scrollable: [""]
    },
    specialTraits: {
      classes: ["flexcol"],
      container: { classes: ["tab-body"], id: "tabs" },
      template: "systems/dnd5e/templates/actors/tabs/creature-special-traits.hbs",
      scrollable: [""]
    },
    warnings: {
      template: "systems/dnd5e/templates/actors/parts/actor-warnings-dialog.hbs"
    },
    tabs: {
      id: "tabs",
      classes: ["tabs-right"],
      template: "systems/dnd5e/templates/shared/sidebar-tabs.hbs"
    }
  };

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
