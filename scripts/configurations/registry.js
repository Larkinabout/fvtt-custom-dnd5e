import {
  getSettingDefault as engineGetSettingDefault,
  registerConfig,
  resetConfigSetting as engineResetConfigSetting,
  setConfig as engineSetConfig } from "./config-engine.js";

// Configs using the shared config engine.
import abilities from "./abilities.js";
import activationCosts, { register as registerActivationCosts } from "./activation-costs.js";
import actorSizes from "./actor-sizes.js";
import armorCalculations from "./armor-calculations.js";
import armorIds from "./armor-ids.js";
import consumableTypes from "./consumable-types.js";
import creatureTypes from "./creature-types.js";
import currency, { register as registerCurrency } from "./currency.js";
import damageTypes from "./damage-types.js";
import featureTypes from "./feature-types.js";
import itemActionTypes, { register as registerItemActionTypes } from "./item-action-types.js";
import itemActivationCostTypes, { register as registerItemActivationCostTypes } from "./item-activation-cost-types.js";
import itemRarity from "./item-rarity.js";
import languages from "./languages.js";
import lootTypes from "./loot-types.js";
import miscEquipmentTypes from "./misc-equipment-types.js";
import movementTypes, { register as registerMovementTypes } from "./movement-types.js";
import senses, { register as registerSenses } from "./senses.js";
import skills from "./skills.js";
import spellSchools from "./spell-schools.js";
import tools from "./tools.js";
import weaponIds from "./weapon-ids.js";
import weaponMasteries from "./weapon-masteries.js";

// Bespoke configs not using the shared config engine.
import * as armorProficienciesMod from "./armor-proficiencies.js";
import * as bastionsMod from "./bastions.js";
import * as bloodiedMod from "./bloodied.js";
import * as calendarMod from "./calendar.js";
import * as conditionEffectsMod from "./condition-effects.js";
import * as conditionsMod from "./conditions.js";
import * as encumbranceMod from "./encumbrance.js";
import * as itemPropertiesMod from "./item-properties.js";
import * as restTypesMod from "./rest-types.js";
import * as toolProficienciesMod from "./tool-proficiencies.js";
import * as weaponProficienciesMod from "./weapon-proficiencies.js";

/* -------------------------------------------- */

/**
 * Bind functions to the config definition.
 * @param {object} definition
 * @param {object} [overrides] Optional overrides for the shared config engine's functions
 * @returns {object}
 */
function bind(definition, overrides = {}) {
  return {
    DEFINITION: definition,
    configKey: definition.configKey,
    constants: definition.constants,
    ...definition.constants,
    register: overrides.register ?? (() => registerConfig(definition)),
    setConfig: overrides.setConfig ?? (data => engineSetConfig(definition, data)),
    getSettingDefault: overrides.getSettingDefault ?? ((key = null) => engineGetSettingDefault(definition, key)),
    resetConfigSetting: overrides.resetConfigSetting ?? (() => engineResetConfigSetting(definition))
  };
}

/* -------------------------------------------- */

/**
 * All configs with `register`, `setConfig`, `getSettingDefault`, `resetConfigSetting` functions and flattened
 * constants. Engine-driven entries also expose `DEFINITION`.
 */
export const configs = {
  abilities: bind(abilities),
  activationCosts: bind(activationCosts, { register: registerActivationCosts }),
  actorSizes: bind(actorSizes),
  armorCalculations: bind(armorCalculations),
  armorIds: bind(armorIds),
  consumableTypes: bind(consumableTypes),
  creatureTypes: bind(creatureTypes),
  currency: bind(currency, { register: registerCurrency }),
  damageTypes: bind(damageTypes),
  featureTypes: bind(featureTypes),
  itemActionTypes: bind(itemActionTypes, { register: registerItemActionTypes }),
  itemActivationCostTypes: bind(itemActivationCostTypes, { register: registerItemActivationCostTypes }),
  itemRarity: bind(itemRarity),
  languages: bind(languages),
  lootTypes: bind(lootTypes),
  miscEquipmentTypes: bind(miscEquipmentTypes),
  movementTypes: bind(movementTypes, { register: registerMovementTypes }),
  senses: bind(senses, { register: registerSenses }),
  skills: bind(skills),
  spellSchools: bind(spellSchools),
  tools: bind(tools),
  weaponIds: bind(weaponIds),
  weaponMasteries: bind(weaponMasteries),

  // Bespoke configs
  armorProficiencies: {...armorProficienciesMod, ...armorProficienciesMod.constants},
  bastions: {...bastionsMod, ...bastionsMod.constants},
  bloodied: {...bloodiedMod, ...bloodiedMod.constants},
  calendar: {...calendarMod, ...calendarMod.constants},
  conditionEffects: {...conditionEffectsMod, ...conditionEffectsMod.constants},
  conditions: {...conditionsMod, ...conditionsMod.constants},
  encumbrance: {...encumbranceMod, ...encumbranceMod.constants},
  itemProperties: {...itemPropertiesMod, ...itemPropertiesMod.constants},
  restTypes: {...restTypesMod, ...restTypesMod.constants},
  toolProficiencies: {...toolProficienciesMod, ...toolProficienciesMod.constants},
  weaponProficiencies: {...weaponProficienciesMod, ...weaponProficienciesMod.constants}
};

/* -------------------------------------------- */

/**
 * CONFIG.DND5E properties not managed by the registry.
 * @type {string[]}
 */
const NON_REGISTRY_CONFIG_KEYS = ["maxAbilityScore", "maxLevel"];

/* -------------------------------------------- */

/**
 * Get CONFIG.DND5E properties managed by the module.
 * @returns {string[]} Sorted, de-duplicated config keys
 */
export function getConfigKeys() {
  const keys = new Set(NON_REGISTRY_CONFIG_KEYS);
  for ( const config of Object.values(configs) ) {
    const configKeys = config.configKeys ?? (config.configKey ? [config.configKey] : []);
    configKeys.forEach(key => keys.add(key));
  }
  return [...keys].sort();
}
