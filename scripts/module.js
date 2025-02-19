import { CONSTANTS, MODULE } from "./constants.js";
import { c5eLoadTemplates, getSetting, registerSetting } from "./utils.js";
import { register as registerHouseRules, registerNegativeHp } from "./house-rules.js";
import { register as registerAbilities, setConfig as setAbilities } from "./abilities.js";
import { register as registerActivationCosts, setConfig as setActivationCosts } from "./activation-costs.js";
import { register as registerActorSizes, setConfig as setActorSizes } from "./actor-sizes.js";
import { register as registerArmorCalculations, setConfig as setArmorCalculations } from "./armor-calculations.js";
import { register as registerArmorIds, setConfig as setArmorIds } from "./armor-ids.js";
import { register as registerArmorProficiencies, setConfig as setArmorProficiencies } from "./armor-proficiencies.js";
import { register as registerCampSupplies } from "./camp-supplies.js";
import { register as registerConditions, setConfig as setConditions } from "./conditions.js";
import { register as registerConsumableTypes, setConfig as setConsumableTypes } from "./consumable-types.js";
import {
  register as registerCounters,
  checkCheckbox,
  uncheckCheckbox,
  toggleCheckbox,
  increaseFraction,
  decreaseFraction,
  modifyFraction,
  increaseNumber,
  decreaseNumber,
  modifyNumber,
  increaseSuccess,
  decreaseSuccess,
  modifySuccess,
  increaseFailure,
  decreaseFailure,
  modifyFailure
} from "./counters.js";
import { register as registerCurrency, setConfig as setCurrency } from "./currency.js";
import { register as registerDamageTypes, setConfig as setDamageTypes } from "./damage-types.js";
import { register as registerDebug } from "./debug.js";
import { register as registerEncumbrance, setConfig as setEncumbrance } from "./encumbrance.js";
import { register as registerExhaustion } from "./exhaustion.js";
import { register as registerItemActionTypes, setConfig as setItemActionTypes } from "./item-action-types.js";
import { register as registerItemActivationCostTypes, setConfig as setItemActivationCostTypes } from "./item-activation-cost-types.js";
import { register as registerItemProperties, setConfig as setItemProperties } from "./item-properties.js";
import { register as registerItemRarity, setConfig as setItemRarity } from "./item-rarity.js";
import { register as registerJournalEntryPageSheet } from "./journal-entry-page-sheet.js";
import { register as registerLanguages, setConfig as setLanguages } from "./languages.js";
import { register as registerMigration, migrate } from "./migration.js";
import { register as registerMisc, setMaxLevel } from "./misc.js";
import { register as registerRolls } from "./rolls.js";
import { register as registerSenses, setConfig as setSenses } from "./senses.js";
import { register as registerSheet } from "./sheet.js";
import { register as registerSkills, setConfig as setSkills } from "./skills.js";
import { register as registerSpellSchools, setConfig as setSpellSchools } from "./spell-schools.js";
import { register as registerRadialStatusEffects } from "./radial-status-effects.js";
import { register as registerTokenBorder } from "./token-border.js";
import { register as registerToolIds, setConfig as setolIds } from "./tool-ids.js";
import { register as registerToolProficiencies, setConfig as setolProficiencies } from "./tool-proficiencies.js";
import { register as registerWeaponIds, setConfig as setWeaponIds } from "./weapon-ids.js";
import { register as registerWeaponProficiencies, setConfig as setWeaponProficiencies } from "./weapon-proficiencies.js";
import { patchApplicationRender } from "./patches/application-render.js";
import { patchD20Die } from "./patches/d20-die.js";
import { patchD20Roll } from "./patches/d20-roll.js";
import { patchPrepareEncumbrance } from "./patches/prepare-encumbrance.js";
import { registerCharacterSheet } from "./sheets/character-sheet.js";

/**
 * Initialize the module and register settings, hooks, and templates.
 */
Hooks.on("init", async () => {
  CONFIG.CUSTOM_DND5E = foundry.utils.deepClone(CONFIG.DND5E);
  CONFIG.CUSTOM_DND5E.coreStatusEffects = foundry.utils.deepClone(CONFIG.statusEffects);

  const module = game.modules.get(MODULE.ID);
  module.api = {
    counters: {
      checkCheckbox,
      uncheckCheckbox,
      toggleCheckbox,
      increaseFraction,
      decreaseFraction,
      modifyFraction,
      increaseNumber,
      decreaseNumber,
      modifyNumber,
      increaseSuccess,
      decreaseSuccess,
      modifySuccess,
      increaseFailure,
      decreaseFailure,
      modifyFailure
    }
  };

  registerSetting(
    CONSTANTS.DEBUG.SETTING.KEY,
    {
      scope: "world",
      config: false,
      type: Boolean,
      default: false
    }
  );

  patchApplicationRender();
  patchD20Die();
  patchD20Roll();
  patchPrepareEncumbrance();

  registerMigration();
  registerCharacterSheet();
  registerJournalEntryPageSheet();

  registerHouseRules();
  registerAbilities();
  registerActivationCosts();
  registerActorSizes();
  registerArmorCalculations();
  registerArmorIds();
  registerArmorProficiencies();
  registerCampSupplies();
  registerConditions();
  registerConsumableTypes();
  registerCounters();
  registerCurrency();
  registerDamageTypes();
  registerEncumbrance();
  registerExhaustion();
  registerItemActionTypes();
  registerItemActivationCostTypes();
  registerItemProperties();
  registerItemRarity();
  registerLanguages();
  registerRolls();
  registerSenses();
  registerSheet();
  registerSkills();
  registerSpellSchools();
  registerToolIds();
  registerToolProficiencies();
  registerWeaponIds();
  registerWeaponProficiencies();
  registerMisc();
  registerRadialStatusEffects();
  registerTokenBorder();
  registerDebug();

  setAbilities(getSetting(CONSTANTS.ABILITIES.SETTING.CONFIG.KEY));
  setCurrency(getSetting(CONSTANTS.CURRENCY.SETTING.CONFIG.KEY));
  await setEncumbrance(getSetting(CONSTANTS.ENCUMBRANCE.SETTING.CONFIG.KEY));
  // SetSenses(getSetting(CONSTANTS.SENSES.SETTING.KEY))
  setSkills(getSetting(CONSTANTS.SKILLS.SETTING.CONFIG.KEY));

  // Must be registered after abilities and skills are set
  registerNegativeHp();

  const templates = [
    CONSTANTS.CONFIG.TEMPLATE.EDIT_IN_LIST,
    CONSTANTS.CONFIG.TEMPLATE.FORM,
    CONSTANTS.CONFIG.TEMPLATE.LIST,
    CONSTANTS.SHEET.TEMPLATE.CHARACTER_SHEET_2,
    CONSTANTS.SHEET.TEMPLATE.CHARACTER_DETAILS,
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
    customDnd5eEq: function(a, b) { return a === b; },
    customDnd5eRandomId: function() { return foundry.utils.randomID(); },
    customDnd5eTrue: function(value) { return !!value; },
    customDnd5eUndef: function(value) { return typeof value === "undefined" || value === null; },
    customDnd5eDotNotateChild: function(childType, parent, child) {
      if ( parent ) {
        return `${parent}.${childType}.${child}`;
      }
      return `${child}`;
    },
    customDnd5eShowActionValue: function(value) {
      const allowed = ["increase", "decrease"];
      return allowed.includes(value);
    },
    customDnd5eShowTriggerValue: function(value) {
      const allowed = ["counterValue"];
      return allowed.includes(value);
    }
  });

  const isV4 = foundry.utils.isNewerVersion(game.dnd5e.version, "3.3.1");
  if ( isV4 ) {
    setActivationCosts(getSetting(CONSTANTS.ACTIVATION_COSTS.SETTING.CONFIG.KEY));
  }
  setActorSizes(getSetting(CONSTANTS.ACTOR_SIZES.SETTING.CONFIG.KEY));
  setArmorCalculations(getSetting(CONSTANTS.ARMOR_CALCULATIONS.SETTING.CONFIG.KEY));
  setArmorIds(getSetting(CONSTANTS.ARMOR_IDS.SETTING.CONFIG.KEY));
  setArmorProficiencies(getSetting(CONSTANTS.ARMOR_PROFICIENCIES.SETTING.CONFIG.KEY));
  setConditions(getSetting(CONSTANTS.CONDITIONS.SETTING.CONFIG.KEY));
  setConsumableTypes(getSetting(CONSTANTS.CONSUMABLE_TYPES.SETTING.CONFIG.KEY));
  setDamageTypes(getSetting(CONSTANTS.DAMAGE_TYPES.SETTING.CONFIG.KEY));
  if ( !isV4 ) {
    setItemActionTypes(getSetting(CONSTANTS.ITEM_ACTION_TYPES.SETTING.CONFIG.KEY));
    setItemActivationCostTypes(getSetting(CONSTANTS.ITEM_ACTIVATION_COST_TYPES.SETTING.CONFIG.KEY));
  }
  setItemProperties(getSetting(CONSTANTS.ITEM_PROPERTIES.SETTING.CONFIG.KEY));
  setItemRarity(getSetting(CONSTANTS.ITEM_RARITY.SETTING.CONFIG.KEY));
  setLanguages(getSetting(CONSTANTS.LANGUAGES.SETTING.CONFIG.KEY));
  setSpellSchools(getSetting(CONSTANTS.SPELL_SCHOOLS.SETTING.CONFIG.KEY));
  setolIds(getSetting(CONSTANTS.TOOL_IDS.SETTING.CONFIG.KEY));
  setolProficiencies(getSetting(CONSTANTS.TOOL_PROFICIENCIES.SETTING.CONFIG.KEY));
  setWeaponIds(getSetting(CONSTANTS.WEAPON_IDS.SETTING.CONFIG.KEY));
  setWeaponProficiencies(getSetting(CONSTANTS.WEAPON_PROFICIENCIES.SETTING.CONFIG.KEY));
  setMaxLevel(getSetting(CONSTANTS.MAX_LEVEL.SETTING.KEY));

  migrate();
});
