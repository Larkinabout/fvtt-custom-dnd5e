import { CONSTANTS, MODULE } from "./constants.js";
import { animations, c5eLoadTemplates, getSetting, registerSetting } from "./utils.js";
import { configs, getConfigKeys } from "./configurations/registry.js";
import { register as registerGameplay, registerNegativeHp } from "./gameplay/gameplay.js";
import { register as registerActivities } from "./activities/activities.js";
import { registerSockets } from "./sockets.js";
import { register as registerActorSheet } from "./actor-sheet.js";
import { register as registerActorSheetTidy5e } from "./actor-sheet-tidy5e.js";
import { register as registerCampSupplies } from "./gameplay/camp-supplies.js";
import { register as registerConditionLevels } from "./token/condition-levels.js";
import {
  register as registerCounters,
  checkCheckbox,
  uncheckCheckbox,
  toggleCheckbox,
  increaseFraction,
  decreaseFraction,
  modifyFraction,
  setFraction,
  increaseNumber,
  decreaseNumber,
  modifyNumber,
  setNumber,
  increaseSuccess,
  decreaseSuccess,
  modifySuccess,
  increaseFailure,
  decreaseFailure,
  modifyFailure,
  togglePip
} from "./counters/counters.js";
import { register as registerDebug } from "./debug.js";
import { register as registerDetachedSheets } from "./detached-sheets.js";
import { register as registerExhaustion } from "./gameplay/exhaustion.js";
import { register as registerGiveItems } from "./item-interactions/give-items.js";
import { register as registerDropItems } from "./item-interactions/drop-items.js";
import { register as registerInventoryDrag } from "./item-interactions/inventory-drag.js";
import { ItemActorDataModel } from "./documents/item-actor.js";
import { registerItemActorSheet } from "./sheets/item-actor-sheet.js";
import { registerItemTokenHUD } from "./applications/item-token-hud.js";
import { register as registerItemSheet } from "./item-sheet.js";
import { register as registerMigration, migrate, migrations } from "./migration.js";
import { register as registerInterface } from "./interface.js";
import { register as registerItemInteractions } from "./item-interactions.js";
import { register as registerMisc, setMaxLevel } from "./misc.js";
import { register as registerRolls } from "./rolls.js";
import { register as registerRadialStatusEffects } from "./token/radial-status-effects.js";
import { register as registerRulerTravelTime } from "./interface/ruler-travel-time.js";
import { register as registerTidy5eCounters } from "./counters/counters-tidy5e.js";
import { register as registerWorkflows, workflows } from "./workflows/workflows.js";
import { register as registerWorkflowsTidy5e } from "./workflows/workflows-tidy5e.js";
import { register as registerTokenBorder } from "./token/token-border.js";
import { register as registerTokenDistance } from "./interface/token-distance.js";
import { register as registerTokenEffects } from "./token/token-effects.js";
import { register as registerTokenHudImprovements } from "./token/token-hud-improvements.js";
import { patchD20Die } from "./patches/d20-die.js";
import { patchD20Roll } from "./patches/d20-roll.js";
import { patchPrepareEncumbrance } from "./patches/prepare-encumbrance.js";
import { patchPrepareMovement } from "./patches/prepare-movement.js";
import { patchPrepareMovementAttribution } from "./patches/prepare-movement-attribution.js";
import { patchPrepareSenses } from "./patches/prepare-senses.js";
import { patchPrepareSkillsTools } from "./patches/prepare-skills-tools.js";
import { registerCharacterSheet } from "./sheets/character-sheet.js";

/**
 * Clone specific CONFIG.DND5E properties to CONFIG.CUSTOM_DND5E.
 */
function cloneDnd5eConfig() {
  CONFIG.CUSTOM_DND5E = {};
  for ( const key of getConfigKeys() ) {
    if ( key in CONFIG.DND5E ) {
      CONFIG.CUSTOM_DND5E[key] = foundry.utils.deepClone(CONFIG.DND5E[key]);
    }
  }
}

/**
 * Initialize the module and register settings, hooks, and templates.
 */
Hooks.on("init", async () => {
  cloneDnd5eConfig();

  CONFIG.Actor.dataModels ??= {};
  CONFIG.Actor.dataModels[CONSTANTS.DROP_ITEMS.ACTOR_TYPE] = ItemActorDataModel;
  CONFIG.Actor.typeIcons ??= {};
  CONFIG.Actor.typeIcons[CONSTANTS.DROP_ITEMS.ACTOR_TYPE] = "fa-solid fa-treasure-chest";
  CONFIG.DND5E ??= {};
  CONFIG.DND5E.defaultArtwork ??= {};
  CONFIG.DND5E.defaultArtwork.Actor ??= {};
  CONFIG.DND5E.defaultArtwork.Actor[CONSTANTS.DROP_ITEMS.ACTOR_TYPE] = CONSTANTS.DROP_ITEMS.DEFAULT_ICON;
  registerItemActorSheet();
  registerItemTokenHUD();

  game.keybindings.register(MODULE.ID, "stopAnimations", {
    name: "CUSTOM_DND5E.keybinding.stopAnimations",
    editable: [{ key: "Escape" }],
    onDown: () => {
      if ( animations.hasActive() ) {
        animations.stopAll();
        return true;
      }
      return false;
    },
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL
  });

  const module = game.modules.get(MODULE.ID);
  module.api = {
    animations,
    counters: {
      checkCheckbox,
      uncheckCheckbox,
      toggleCheckbox,
      increaseFraction,
      decreaseFraction,
      modifyFraction,
      setFraction,
      increaseNumber,
      decreaseNumber,
      modifyNumber,
      setNumber,
      increaseSuccess,
      decreaseSuccess,
      modifySuccess,
      increaseFailure,
      decreaseFailure,
      modifyFailure,
      togglePip
    },
    migrations,
    workflows
  };

  registerSockets();

  registerSetting(
    CONSTANTS.DEBUG.SETTING.KEY,
    {
      scope: "world",
      config: false,
      type: Boolean,
      default: false
    }
  );

  patchD20Die();
  patchD20Roll();
  patchPrepareEncumbrance();
  patchPrepareMovement();
  patchPrepareMovementAttribution();
  patchPrepareSenses();
  patchPrepareSkillsTools();

  registerMigration();
  registerCharacterSheet();

  registerGameplay();
  registerInterface();
  registerItemInteractions();
  registerActivities();
  registerCounters();
  registerTidy5eCounters();
  registerWorkflows();
  registerWorkflowsTidy5e();

  configs.abilities.register();
  configs.activationCosts.register();
  registerActorSheet();
  registerActorSheetTidy5e();
  configs.actorSizes.register();
  configs.armorCalculations.register();
  configs.armorIds.register();
  configs.armorProficiencies.register();
  configs.bastions.register();
  configs.bloodied.register();
  configs.calendar.register();
  registerCampSupplies();
  configs.conditions.registerMenu();
  registerConditionLevels();
  configs.consumableTypes.register();
  configs.creatureTypes.register();
  configs.currency.register();
  configs.damageTypes.register();
  configs.encumbrance.register();
  configs.miscEquipmentTypes.register();
  registerExhaustion();
  registerGiveItems();
  registerDropItems();
  registerInventoryDrag();
  configs.featureTypes.register();
  configs.itemActionTypes.register();
  configs.itemActivationCostTypes.register();
  configs.itemProperties.register();
  configs.itemRarity.register();
  registerItemSheet();
  configs.languages.register();
  configs.lootTypes.register();
  configs.restTypes.register();
  registerRolls();
  configs.senses.register();
  configs.skills.register();
  configs.spellSchools.register();
  configs.tools.register();
  configs.toolProficiencies.register();
  configs.weaponIds.register();
  configs.weaponMasteries.register();
  configs.weaponProficiencies.register();
  registerMisc();
  registerRadialStatusEffects();
  registerRulerTravelTime();
  registerTokenBorder();
  registerTokenDistance();
  registerTokenEffects();
  registerTokenHudImprovements();
  registerDebug();
  registerDetachedSheets();

  configs.abilities.setConfig();
  const isV4 = foundry.utils.isNewerVersion(game.dnd5e.version, "3.3.1");
  if ( isV4 ) {
    configs.activationCosts.setConfig();
  }
  configs.currency.setConfig();
  await configs.encumbrance.setConfig();
  configs.itemRarity.setConfig();
  configs.languages.setConfig();
  // configs.senses.setConfig();
  configs.skills.setConfig();

  // Must be registered after abilities and skills are set
  registerNegativeHp();

  const templates = [
    CONSTANTS.CONFIG.TEMPLATE.EDIT,
    CONSTANTS.CONFIG.TEMPLATE.EDIT_IN_LIST,
    CONSTANTS.CONFIG.TEMPLATE.FORM,
    CONSTANTS.CONFIG.TEMPLATE.SECTIONS,
    CONSTANTS.CONFIG.TEMPLATE.LIST,
    CONSTANTS.CONFIG.TEMPLATE.TABLE,
    CONSTANTS.CONFIG.TEMPLATE.TABLE_ROWS,
    CONSTANTS.CONFIG.TEMPLATE.FIELD,
    CONSTANTS.CONFIG.TEMPLATE.FIELD_CHECKBOX_GRID,
    CONSTANTS.CONFIG.TEMPLATE.FIELD_MACRO_DROP,
    CONSTANTS.ACTOR_SHEET.TEMPLATE.CHARACTER_SHEET_2,
    CONSTANTS.ACTOR_SHEET.TEMPLATE.CHARACTER_DETAILS,
    CONSTANTS.MESSAGE.TEMPLATE.ROLL_REQUEST_CARD,
    "modules/custom-dnd5e/templates/footer.hbs"
  ];
  c5eLoadTemplates(templates);
});

/**
 * Perform actions when Foundry VTT is ready.
 */
Hooks.on("ready", async () => {
  Handlebars.registerHelper({
    customDnd5eBoolFalse: function(value) { return value === false; },
    customDnd5eChecked: function(value) { return value !== false ? "checked" : ""; },
    customDnd5eEq: function(a, b) { return a === b; },
    customDnd5eDotNotateChild: function(childType, parent, child) {
      if ( parent ) {
        return `${parent}.${childType}.${child}`;
      }
      return `${child}`;
    }
  });

  CONFIG.CUSTOM_DND5E.coreStatusEffects = foundry.utils.deepClone(CONFIG.statusEffects);
  configs.conditions.register();

  await migrate();

  configs.actorSizes.setConfig();
  configs.armorCalculations.setConfig();
  configs.armorIds.setConfig();
  configs.armorProficiencies.setConfig();
  configs.bastions.setConfig();
  configs.bloodied.setConfig();
  configs.conditions.setConfig();
  configs.bloodied.addBloodiedCondition();
  configs.consumableTypes.setConfig();
  configs.creatureTypes.setConfig();
  configs.damageTypes.setConfig();
  configs.miscEquipmentTypes.setConfig();
  configs.featureTypes.setConfig();
  const isV4 = foundry.utils.isNewerVersion(game.dnd5e.version, "3.3.1");
  if ( !isV4 ) {
    configs.itemActionTypes.setConfig();
    configs.itemActivationCostTypes.setConfig();
  }
  configs.itemProperties.setConfig();
  configs.lootTypes.setConfig();
  configs.restTypes.setConfig();
  configs.spellSchools.setConfig();
  configs.tools.setConfig();
  configs.toolProficiencies.setConfig();
  configs.weaponIds.setConfig();
  configs.weaponMasteries.setConfig();
  configs.weaponProficiencies.setConfig();
  setMaxLevel(getSetting(CONSTANTS.MAX_LEVEL.SETTING.KEY));
});
