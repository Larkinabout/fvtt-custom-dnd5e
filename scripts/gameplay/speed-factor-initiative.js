import { CONSTANTS, MODULE } from "../constants.js";
import { c5eLoadTemplates, getSetting, isPrimaryHandler, registerMenu, registerSetting } from "../utils.js";
import { SpeedFactorInitiativeForm } from "../forms/speed-factor-initiative-form.js";

const constants = CONSTANTS.SPEED_FACTOR_INITIATIVE;

/* -------------------------------------------- */
/*  DEFAULTS                                    */
/* -------------------------------------------- */

/**
 * Default modifier per creature size.
 * @type {Record<string, number>}
 */
export const DEFAULT_SIZE_MODIFIERS = {
  tiny: 5,
  sm: 2,
  med: 0,
  lg: -2,
  huge: -5,
  grg: -8
};

/* -------------------------------------------- */

/**
 * Default actions.
 * @type {Record<string, object>}
 */
export const DEFAULT_ACTIONS = {
  attack: { label: "CUSTOM_DND5E.speedFactorInitiative.action.attack.label", description: "CUSTOM_DND5E.speedFactorInitiative.action.attack.desc", icon: "fas fa-hand-fist", isGroup: true, includeWeapons: true, filterWeapons: true, visible: true, system: false },
  lightFinesse: { label: "CUSTOM_DND5E.speedFactorInitiative.action.lightFinesse.label", description: "CUSTOM_DND5E.speedFactorInitiative.action.lightFinesse.desc", icon: "fas fa-dagger", modifier: 2, group: "attack", visible: true, system: false },
  heavy: { label: "CUSTOM_DND5E.speedFactorInitiative.action.heavy.label", description: "CUSTOM_DND5E.speedFactorInitiative.action.heavy.desc", icon: "fas fa-weight-hanging", modifier: -2, group: "attack", visible: true, system: false },
  twoHanded: { label: "CUSTOM_DND5E.speedFactorInitiative.action.twoHanded.label", description: "CUSTOM_DND5E.speedFactorInitiative.action.twoHanded.desc", icon: "fas fa-axe-battle", modifier: -2, group: "attack", visible: true, system: false },
  rangedLoading: { label: "CUSTOM_DND5E.speedFactorInitiative.action.rangedLoading.label", description: "CUSTOM_DND5E.speedFactorInitiative.action.rangedLoading.desc", icon: "fas fa-crosshairs", modifier: -5, group: "attack", visible: true, system: false },
  magic: { label: "CUSTOM_DND5E.speedFactorInitiative.action.magic.label", description: "CUSTOM_DND5E.speedFactorInitiative.action.magic.desc", icon: "fas fa-wand-sparkles", isGroup: true, includeSpells: true, includeSpellLevels: true, visible: true, system: false },
  dash: { label: "CUSTOM_DND5E.speedFactorInitiative.action.dash.label", description: "CUSTOM_DND5E.speedFactorInitiative.action.dash.desc", icon: "fas fa-person-running", modifier: 2, visible: true, system: false },
  disengage: { label: "CUSTOM_DND5E.speedFactorInitiative.action.disengage.label", description: "CUSTOM_DND5E.speedFactorInitiative.action.disengage.desc", icon: "fas fa-shoe-prints", modifier: -2, visible: true, system: false },
  dodge: { label: "CUSTOM_DND5E.speedFactorInitiative.action.dodge.label", description: "CUSTOM_DND5E.speedFactorInitiative.action.dodge.desc", icon: "fas fa-shield-halved", modifier: 5, visible: true, system: false },
  help: { label: "CUSTOM_DND5E.speedFactorInitiative.action.help.label", description: "CUSTOM_DND5E.speedFactorInitiative.action.help.desc", icon: "fas fa-handshake-angle", modifier: 0, visible: true, system: false },
  hide: { label: "CUSTOM_DND5E.speedFactorInitiative.action.hide.label", description: "CUSTOM_DND5E.speedFactorInitiative.action.hide.desc", icon: "fas fa-user-dashed", modifier: 0, visible: true, system: false },
  influence: { label: "CUSTOM_DND5E.speedFactorInitiative.action.influence.label", description: "CUSTOM_DND5E.speedFactorInitiative.action.influence.desc", icon: "fas fa-comments", modifier: 0, visible: true, system: false },
  ready: { label: "CUSTOM_DND5E.speedFactorInitiative.action.ready.label", description: "CUSTOM_DND5E.speedFactorInitiative.action.ready.desc", icon: "fas fa-stopwatch", modifier: 0, visible: true, system: false },
  search: { label: "CUSTOM_DND5E.speedFactorInitiative.action.search.label", description: "CUSTOM_DND5E.speedFactorInitiative.action.search.desc", icon: "fas fa-magnifying-glass", modifier: 0, visible: true, system: false },
  study: { label: "CUSTOM_DND5E.speedFactorInitiative.action.study.label", description: "CUSTOM_DND5E.speedFactorInitiative.action.study.desc", icon: "fas fa-book-open", modifier: 0, visible: true, system: false },
  utilize: { label: "CUSTOM_DND5E.speedFactorInitiative.action.utilize.label", description: "CUSTOM_DND5E.speedFactorInitiative.action.utilize.desc", icon: "fas fa-hand", modifier: 0, visible: true, system: false },
  pace: { label: "CUSTOM_DND5E.speedFactorInitiative.action.pace.label", description: "CUSTOM_DND5E.speedFactorInitiative.action.pace.desc", icon: "fas fa-hourglass", isGroup: true, visible: true, system: false },
  verySlow: { label: "CUSTOM_DND5E.speedFactorInitiative.action.verySlow.label", description: "CUSTOM_DND5E.speedFactorInitiative.action.verySlow.desc", icon: "fas fa-angles-down", modifier: -5, group: "pace", visible: true, system: false },
  slow: { label: "CUSTOM_DND5E.speedFactorInitiative.action.slow.label", description: "CUSTOM_DND5E.speedFactorInitiative.action.slow.desc", icon: "fas fa-angle-down", modifier: -2, group: "pace", visible: true, system: false },
  medium: { label: "CUSTOM_DND5E.speedFactorInitiative.action.medium.label", description: "CUSTOM_DND5E.speedFactorInitiative.action.medium.desc", icon: "fas fa-equals", modifier: 0, group: "pace", visible: true, system: false },
  fast: { label: "CUSTOM_DND5E.speedFactorInitiative.action.fast.label", description: "CUSTOM_DND5E.speedFactorInitiative.action.fast.desc", icon: "fas fa-angle-up", modifier: 2, group: "pace", visible: true, system: false },
  veryFast: { label: "CUSTOM_DND5E.speedFactorInitiative.action.veryFast.label", description: "CUSTOM_DND5E.speedFactorInitiative.action.veryFast.desc", icon: "fas fa-angles-up", modifier: 5, group: "pace", visible: true, system: false }
};

/* -------------------------------------------- */

/**
 * Default initiative modifiers for the system's base weapons.
 * @type {Record<string, number>}
 */
const DEFAULT_WEAPON_MODIFIERS = {
  // Light or finesse
  club: 2, dagger: 2, handaxe: 2, lighthammer: 2, sickle: 2, rapier: 2, scimitar: 2, shortsword: 2, whip: 2,
  // Two-handed
  greatclub: -2,
  // Heavy and two-handed
  glaive: -4, greataxe: -4, greatsword: -4, halberd: -4, lance: -4, maul: -4, pike: -4,
  // Loading
  lightcrossbow: -5, handcrossbow: -5, heavycrossbow: -5, blowgun: -5, musket: -5, pistol: -5
};

/**
 * Whether a gather is already in progress.
 * @type {boolean}
 */
let gathering = false;

/**
 * The open action bar on this client, if any.
 * @type {import("../forms/speed-factor-action-bar.js").SpeedFactorActionBar|null}
 */
let activeBar = null;

/**
 * The active combatant id.
 * @type {string|null}
 */
let activeCombatantId = null;

/**
 * Queue of combatants for this client.
 * @type {Array<{combatId: string, combatantId: string}>}
 */
const promptQueue = [];

/**
 * Whether the GM is auto-advancing combatants.
 * @type {boolean}
 */
let autoAdvance = false;

/**
 * Combatant ids skipped this round.
 * @type {Set<string>}
 */
const manualSkipped = new Set();

/**
 * The selection timeout handler for the current round, if any.
 * @type {ReturnType<typeof setTimeout>|null}
 */
let gatherTimer = null;

/* -------------------------------------------- */
/*  REGISTRATION                                */
/* -------------------------------------------- */

/**
 * Register settings, hooks, and templates.
 * @returns {void}
 */
export function register() {
  registerSettings();
  registerHooks();

  c5eLoadTemplates([
    constants.TEMPLATE.FORM,
    constants.TEMPLATE.ACTIONS_FORM,
    constants.TEMPLATE.WEAPONS_FORM,
    constants.TEMPLATE.ACTION_BAR
  ]);
}

/* -------------------------------------------- */

/**
 * Register settings.
 * @returns {void}
 */
function registerSettings() {
  registerMenu(
    constants.MENU.KEY,
    {
      hint: game.i18n.localize(constants.MENU.HINT),
      label: game.i18n.localize(constants.MENU.LABEL),
      name: game.i18n.localize(constants.MENU.NAME),
      icon: constants.MENU.ICON,
      type: SpeedFactorInitiativeForm,
      restricted: true,
      scope: "world"
    }
  );

  registerSetting(
    constants.SETTING.ENABLE.KEY,
    {
      scope: "world",
      config: false,
      requiresReload: true,
      type: Boolean,
      default: false
    }
  );

  registerSetting(
    constants.SETTING.SIZE_MODIFIERS.KEY,
    {
      scope: "world",
      config: false,
      type: Object,
      default: foundry.utils.deepClone(DEFAULT_SIZE_MODIFIERS)
    }
  );

  registerSetting(
    constants.SETTING.ACTIONS.KEY,
    {
      scope: "world",
      config: false,
      type: Object,
      default: foundry.utils.deepClone(DEFAULT_ACTIONS)
    }
  );

  registerSetting(
    constants.SETTING.REVEAL_CHOICES.KEY,
    {
      scope: "world",
      config: false,
      type: Number,
      default: CONST.USER_ROLES.PLAYER
    }
  );

  registerSetting(
    constants.SETTING.GATHER_TIMEOUT.KEY,
    {
      scope: "world",
      config: false,
      type: Number,
      default: null
    }
  );

  registerSetting(
    constants.SETTING.TIMEOUT_ACTION.KEY,
    {
      scope: "world",
      config: false,
      type: String,
      default: "dodge"
    }
  );

  registerSetting(
    constants.SETTING.WEAPONS.KEY,
    {
      scope: "world",
      config: false,
      type: Object,
      default: buildDefaultWeapons()
    }
  );
}

/* -------------------------------------------- */

/**
 * Build the default weapons map.
 * @returns {Record<string, {modifier: number, visible: boolean}>}
 */
export function buildDefaultWeapons() {
  const weaponIds = CONFIG.DND5E?.weaponIds ?? {};
  return Object.fromEntries(
    Object.keys(weaponIds).map(key => [key, { modifier: DEFAULT_WEAPON_MODIFIERS[key] ?? 0, visible: true }])
  );
}

/* -------------------------------------------- */

/**
 * Register hooks.
 * @returns {void}
 */
function registerHooks() {
  Hooks.on("dnd5e.preConfigureInitiative", injectSpeedFactorModifier);
  Hooks.on("dnd5e.rollInitiative", onRollInitiative);
  Hooks.on("combatStart", onCombatStart);
  Hooks.on("combatRound", onCombatRound);
  Hooks.on("updateCombat", onUpdateCombat);
  Hooks.on("deleteCombat", onDeleteCombat);
  Hooks.on("renderCombatTracker", decorateCombatTracker);
}

/* -------------------------------------------- */
/*  HELPERS                                     */
/* -------------------------------------------- */

/**
 * Whether Speed Factor is enabled.
 * @returns {boolean}
 */
export function isSpeedFactorEnabled() {
  return getSetting(constants.SETTING.ENABLE.KEY) === true;
}

/* -------------------------------------------- */

/**
 * Build the actor sizes map.
 * @returns {Record<string, {label: string, modifier: number}>} Keyed by size slug.
 */
export function getSizeModifiers() {
  const sizes = CONFIG.CUSTOM_DND5E?.actorSizes ?? CONFIG.DND5E?.actorSizes ?? {};
  const stored = getSetting(constants.SETTING.SIZE_MODIFIERS.KEY) ?? {};
  const result = {};

  for ( const [key, size] of Object.entries(sizes) ) {
    const label = (typeof size === "string") ? size : (size?.label ?? key);
    const modifier = Number(stored[key] ?? DEFAULT_SIZE_MODIFIERS[key] ?? 0);
    result[key] = { label, modifier };
  }

  return result;
}

/* -------------------------------------------- */

/**
 * Get the minimum role that may see revealed choices.
 * @returns {number}
 */
export function getRevealRole() {
  const role = Number(getSetting(constants.SETTING.REVEAL_CHOICES.KEY));
  return Number.isFinite(role) ? role : CONST.USER_ROLES.PLAYER;
}

/* -------------------------------------------- */

/**
 * Get the actions.
 * @returns {Record<string, object>}
 */
export function getActions() {
  const stored = getSetting(constants.SETTING.ACTIONS.KEY);
  return stored && Object.keys(stored).length ? stored : foundry.utils.deepClone(DEFAULT_ACTIONS);
}

/* -------------------------------------------- */

/**
 * Find an action by key.
 * @param {string} key
 * @returns {object|null} Action, or null.
 */
export function getActionByKey(key) {
  return getActions()[key] ?? null;
}

/* -------------------------------------------- */

/**
 * Get the action groups.
 * @returns {Array<{key: string, label: string}>}
 */
export function getActionGroups() {
  return Object.entries(getActions())
    .filter(([, action]) => action.isGroup === true)
    .map(([key, action]) => ({ key, label: game.i18n.localize(action.label ?? key) }));
}

/* -------------------------------------------- */

/**
 * Get the weapons map.
 * @returns {Record<string, {modifier: number, visible: boolean}>}
 */
export function getWeapons() {
  const stored = getSetting(constants.SETTING.WEAPONS.KEY);
  return (stored && typeof stored === "object") ? stored : buildDefaultWeapons();
}

/* -------------------------------------------- */

/**
 * Cache of resolved weapon display names.
 * @type {Map<string, string>}
 */
const weaponNameCache = new Map();

/**
 * Get a weapon's display name from its base item, falling back to a prettified key.
 * @param {string} key
 * @returns {string} Weapon display name
 */
export function getWeaponName(key) {
  if ( weaponNameCache.has(key) ) return weaponNameCache.get(key);

  const uuid = CONFIG.DND5E?.weaponIds?.[key];
  if ( uuid ) {
    try {
      const name = fromUuidSync(uuid)?.name;
      if ( name ) {
        weaponNameCache.set(key, name);
        return name;
      }
    } catch {}
  }
  return key ? key.charAt(0).toUpperCase() + key.slice(1) : key;
}

/* -------------------------------------------- */

/**
 * Get the weapon modifiers list.
 * @returns {Array<{key: string, label: string, modifier: number, visible: boolean}>}
 */
export function getWeaponModifiers() {
  const weaponIds = CONFIG.DND5E?.weaponIds ?? {};
  const stored = getWeapons();
  const keys = [...new Set([...Object.keys(stored), ...Object.keys(weaponIds)])].filter(key => key in weaponIds);
  return keys.map(key => ({
    key,
    label: getWeaponName(key),
    modifier: Number(stored[key]?.modifier ?? 0),
    visible: stored[key]?.visible !== false
  }));
}

/* -------------------------------------------- */

/**
 * Get a weapon's initiative modifier.
 * @param {string} weaponKey
 * @returns {number} Modifier
 */
export function getWeaponModifier(weaponKey) {
  return Number(getWeapons()[weaponKey]?.modifier ?? 0);
}

/* -------------------------------------------- */

/**
 * Get the weapon choices for the combatant.
 * Optionally filtered to the combatant's own weapons.
 * @param {Combatant} combatant
 * @param {boolean} [filter=false] Restrict the list to the combatant's own weapons.
 * @returns {Array<{key: string, label: string, modifierLabel: string}>}
 */
export function getWeaponChoicesForCombatant(combatant, filter = false) {
  let weapons = getWeaponModifiers().filter(weapon => weapon.visible);

  if ( filter ) {
    const owned = new Set((combatant?.actor?.itemTypes?.weapon ?? [])
      .map(item => item.system?.type?.baseItem)
      .filter(Boolean));
    weapons = weapons.filter(weapon => owned.has(weapon.key));
  }

  return weapons.map(weapon => ({
    key: weapon.key,
    label: weapon.label,
    modifierLabel: formatModifier(weapon.modifier)
  }));
}

/* -------------------------------------------- */

/**
 * Get the spell choices for the combatant.
 * @param {Combatant} combatant
 * @returns {Array<{level: number, name: string, modifierLabel: string}>}
 */
export function getSpellChoicesForCombatant(combatant) {
  const spells = (combatant?.actor?.itemTypes?.spell ?? []).filter(spell => {
    const level = Number(spell.system?.level ?? 0);
    const method = spell.system?.method;
    const prepared = Number(spell.system?.prepared ?? 0);
    return level === 0 || prepared > 0 || ["atwill", "innate", "pact"].includes(method);
  });

  spells.sort((a, b) => (Number(a.system?.level ?? 0) - Number(b.system?.level ?? 0)) || a.name.localeCompare(b.name));

  return spells.map(spell => {
    const level = Number(spell.system?.level ?? 0);
    return { level, name: spell.name, modifierLabel: formatSpellLevelModifier(level) };
  });
}

/* -------------------------------------------- */

/**
 * Format the initiative modifier shown for a spell level.
 * @param {number} level
 * @returns {string} Modifier
 */
export function formatSpellLevelModifier(level) {
  return level ? `−${level}` : "0";
}

/* -------------------------------------------- */

/**
 * Build the button context for a single action definition.
 * @param {string} key
 * @param {object} action
 * @returns {object}
 */
function buildActionButton(key, action) {
  return {
    key,
    label: game.i18n.localize(action.label ?? key),
    description: action.description ? game.i18n.localize(action.description) : "",
    img: action.img ?? "",
    icon: action.icon ?? "",
    modifierLabel: formatModifier(Number(action.modifier ?? 0))
  };
}

/* -------------------------------------------- */

/**
 * Get actions a combatant's action bar.
 * @param {Combatant} combatant
 * @returns {Array<object>}
 */
export function getCombatantActions(combatant) {
  const actions = getActions();
  const entries = Object.entries(actions).filter(([, action]) => action.visible !== false);

  const membersByGroup = new Map();
  for ( const [key, action] of entries ) {
    if ( action.isGroup || !action.group || !actions[action.group]?.isGroup ) continue;
    if ( !membersByGroup.has(action.group) ) membersByGroup.set(action.group, []);
    membersByGroup.get(action.group).push(buildActionButton(key, action));
  }

  const out = [];

  for ( const [key, action] of entries ) {
    if ( action.group && actions[action.group]?.isGroup ) continue;

    if ( action.isGroup ) {
      const members = membersByGroup.get(key) ?? [];
      const includeWeapons = action.includeWeapons === true;
      const includeSpells = action.includeSpells === true;
      const includeSpellLevels = action.includeSpellLevels === true;
      if ( !members.length && !includeWeapons && !includeSpells && !includeSpellLevels ) continue;
      out.push({
        key,
        label: game.i18n.localize(action.label ?? key),
        img: action.img ?? "",
        icon: action.icon ?? "",
        isGroup: true,
        members,
        includeWeapons,
        includeSpells,
        includeSpellLevels,
        weapons: includeWeapons ? getWeaponChoicesForCombatant(combatant, action.filterWeapons === true) : []
      });
    } else {
      out.push({ ...buildActionButton(key, action), isGroup: false });
    }
  }

  return out;
}

/* -------------------------------------------- */

/**
 * Select and pan the canvas to a combatant's token.
 * @param {Combatant} combatant
 * @returns {void}
 */
export function panToCombatant(combatant) {
  const token = combatant?.token?.object;
  if ( !token || combatant.sceneId !== canvas?.scene?.id ) return;
  try {
    token.control({ releaseOthers: true });
    canvas.animatePan({ x: token.center.x, y: token.center.y });
  } catch {}
}

/* -------------------------------------------- */

/**
 * Normalise a choice into an array of selections.
 * @param {object|undefined} choice
 * @returns {Array<object>} Selections
 */
export function getSelections(choice) {
  if ( !choice ) return [];
  if ( Array.isArray(choice.selections) ) return choice.selections;
  if ( choice.actionKey ) return [choice];
  return [];
}

/* -------------------------------------------- */

/**
 * Get the normalised selections currently stored for a combatant.
 * @param {Combatant} combatant The combatant.
 * @returns {Array<object>} The selections.
 */
export function getCombatantSelections(combatant) {
  return getSelections(combatant?.getFlag(MODULE.ID, constants.FLAG.SPEED_FACTOR));
}

/* -------------------------------------------- */

/**
 * Resolve the initiative modifier for a single selection.
 * @param {object} selection
 * @returns {number} Modifier.
 */
function selectionModifier(selection) {
  if ( !selection?.actionKey ) return 0;
  if ( selection.weaponKey ) return getWeaponModifier(selection.weaponKey);
  if ( selection.spellLevel != null ) return -Math.max(0, Number(selection.spellLevel));
  return Number(getActionByKey(selection.actionKey)?.modifier ?? 0);
}

/* -------------------------------------------- */

/**
 * Get the action portion of the initiative modifier.
 * @param {object} choice
 * @returns {number} Action modifier
 */
export function getActionModifier(choice) {
  return getSelections(choice).reduce((total, selection) => total + selectionModifier(selection), 0);
}

/* -------------------------------------------- */

/**
 * Get the size portion of the initiative modifier.
 * @param {Actor} actor
 * @returns {number} Size modifier
 */
export function getSizeModifierForActor(actor) {
  const size = actor?.system?.traits?.size;
  if ( !size ) return 0;
  return getSizeModifiers()[size]?.modifier ?? 0;
}

/* -------------------------------------------- */

/**
 * Get a label for a single selection.
 * @param {object} selection
 * @returns {string} Localized label
 */
function getSelectionLabel(selection) {
  const action = getActionByKey(selection?.actionKey);
  if ( !action ) return "";
  const label = game.i18n.localize(action.label);
  if ( selection.weaponKey ) return `${label} (${getWeaponName(selection.weaponKey)})`;
  if ( selection.spellName ) return `${label} (${selection.spellName})`;
  if ( selection.spellLevel != null ) {
    return game.i18n.format("CUSTOM_DND5E.speedFactorInitiative.chat.castLabel",
      { label, level: Number(selection.spellLevel) });
  }
  return label;
}

/* -------------------------------------------- */

/**
 * Get a label for a stored choice, joining every selection.
 * @param {object} choice
 * @returns {string} Localized label
 */
export function getChoiceLabel(choice) {
  const selections = getSelections(choice);
  if ( !selections.length ) {
    return choice ? game.i18n.localize("CUSTOM_DND5E.speedFactorInitiative.tracker.noAction") : "";
  }
  return selections.map(getSelectionLabel).filter(Boolean).join(" + ");
}

/* -------------------------------------------- */

/**
 * Format a numeric modifier.
 * @param {number} modifier
 * @returns {string} Modifier with sign (e.g. "+2", "-3", "+0").
 */
export function formatModifier(modifier) {
  return `${modifier >= 0 ? "+" : ""}${modifier}`;
}

/* -------------------------------------------- */

/**
 * Find the combatant in the active combat associated with an actor.
 * @param {Actor} actor
 * @returns {Combatant|undefined} Matching combatant
 */
function findCombatant(actor) {
  const combat = game.combat;
  if ( !combat || !actor ) return undefined;
  return combat.combatants.find(c => c.actor === actor)
    ?? combat.combatants.find(c => c.actor?.id === actor.id);
}

/* -------------------------------------------- */
/*  INITIATIVE INJECTION                        */
/* -------------------------------------------- */

/**
 * Inject the Speed Factor modifier into the initiative roll configuration.
 * Triggered by the `dnd5e.preConfigureInitiative` hook.
 * @param {Actor} actor
 * @param {object} rollConfig
 * @returns {void}
 */
export function injectSpeedFactorModifier(actor, rollConfig) {
  if ( !isSpeedFactorEnabled() ) return;

  const combatant = findCombatant(actor);
  const choice = combatant?.getFlag(MODULE.ID, constants.FLAG.SPEED_FACTOR);
  const total = getSizeModifierForActor(actor) + getActionModifier(choice);
  if ( !total ) return;

  rollConfig.parts ??= [];
  rollConfig.data ??= {};
  rollConfig.data.speedFactor = total;
  rollConfig.parts.push("@speedFactor");
}

/* -------------------------------------------- */
/*  ROUND COORDINATION                          */
/* -------------------------------------------- */

/**
 * Begin gathering actions when combat starts (round 1).
 * Triggered by the `combatStart` hook.
 * @param {Combat} combat
 * @returns {Promise<void>}
 */
async function onCombatStart(combat) {
  if ( !isSpeedFactorEnabled() || !isPrimaryHandler(combat) ) return;
  await beginGather(combat);
}

/* -------------------------------------------- */

/**
 * Begin gathering actions at the start of each new round.
 * Triggered by the `combatRound` hook.
 * @param {Combat} combat
 * @param {object} data
 * @returns {Promise<void>}
 */
async function onCombatRound(combat, data) {
  if ( !isSpeedFactorEnabled() || !isPrimaryHandler(combat) ) return;
  if ( data?.turn !== 0 ) return;
  await beginGather(combat);
}

/* -------------------------------------------- */

/**
 * Close any open action bar once the round's choices have been revealed.
 * Triggered by the `updateCombat` hook on every client.
 * @param {Combat} combat
 * @returns {void}
 */
function onUpdateCombat(combat) {
  if ( !isSpeedFactorEnabled() ) return;
  if ( combat.getFlag(MODULE.ID, constants.FLAG.REVEALED) ) {
    autoAdvance = false;
    clearGatherTimer();
    if ( activeBar?.rendered ) {
      promptQueue.length = 0;
      activeBar.close();
    }
  }
}

/* -------------------------------------------- */

/**
 * Close any open action bar and reset gather state when combat ends.
 * Triggered by the `deleteCombat` hook on every client.
 * @returns {void}
 */
function onDeleteCombat() {
  autoAdvance = false;
  clearGatherTimer();
  promptQueue.length = 0;
  if ( activeBar?.rendered ) activeBar.close();
}

/* -------------------------------------------- */

/**
 * Reveal the round's choices once initiative has been rolled.
 * Triggered by the `dnd5e.rollInitiative` hook.
 * @param {Actor} actor
 * @returns {void}
 */
function onRollInitiative(actor) {
  if ( !isSpeedFactorEnabled() ) return;
  const combat = game.combat;
  if ( !combat || combat.getFlag(MODULE.ID, constants.FLAG.REVEALED) ) return;
  if ( !isPrimaryHandler(combat) ) return;
  if ( combat.combatants.every(c => c.initiative !== null) ) {
    combat.setFlag(MODULE.ID, constants.FLAG.REVEALED, true);
  }
}

/* -------------------------------------------- */

/**
 * Reset initiative, clear stored choices, and request actions from each combatant's controller.
 * @param {Combat} combat
 * @returns {Promise<void>}
 */
async function beginGather(combat) {
  if ( gathering ) return;
  if ( !combat?.combatants.size ) return;
  gathering = true;
  clearGatherTimer();

  try {
    await combat.resetAll();
    await combat.unsetFlag(MODULE.ID, constants.FLAG.REVEALED);
    for ( const combatant of combat.combatants ) {
      if ( combatant.getFlag(MODULE.ID, constants.FLAG.SPEED_FACTOR) ) {
        await combatant.unsetFlag(MODULE.ID, constants.FLAG.SPEED_FACTOR);
      }
    }

    const combatantsByOwner = new Map();
    for ( const combatant of combat.combatants ) {
      const owner = getActivePlayerOwner(combatant.actor);
      if ( !owner ) continue;
      if ( !combatantsByOwner.has(owner.id) ) combatantsByOwner.set(owner.id, []);
      combatantsByOwner.get(owner.id).push(combatant.id);
    }
    for ( const [userId, combatantIds] of combatantsByOwner ) {
      game.socket.emit(`module.${MODULE.ID}`, {
        action: "sfRequestAction",
        options: { combatId: combat.id, combatantIds, userId }
      });
    }

    manualSkipped.clear();
    autoAdvance = true;

    const timeoutSeconds = Number(getSetting(constants.SETTING.GATHER_TIMEOUT.KEY)) || 0;
    if ( timeoutSeconds > 0 ) {
      gatherTimer = setTimeout(() => resolveTimeout(combat.id), timeoutSeconds * 1000);
    }

    ui.combat?.render();
    advanceAuto();
  } finally {
    gathering = false;
  }
}

/* -------------------------------------------- */

/**
 * Clear the pending selection timeout, if any.
 * @returns {void}
 */
function clearGatherTimer() {
  if ( gatherTimer ) {
    clearTimeout(gatherTimer);
    gatherTimer = null;
  }
}

/* -------------------------------------------- */

/**
 * Resolve the round when the selection timeout is reached.
 * @param {string} combatId
 * @returns {Promise<void>}
 */
async function resolveTimeout(combatId) {
  gatherTimer = null;
  const combat = game.combats.get(combatId);

  if ( !combat || combat !== game.combat || !isPrimaryHandler(combat) ) return;
  if ( combat.getFlag(MODULE.ID, constants.FLAG.REVEALED) ) return;

  const timeoutAction = getSetting(constants.SETTING.TIMEOUT_ACTION.KEY);
  const candidate = (timeoutAction && timeoutAction !== "skip") ? getActionByKey(timeoutAction) : null;
  const action = (candidate && !candidate.isGroup && candidate.visible !== false) ? candidate : null;

  for ( const combatant of combat.combatants ) {
    if ( !needsChoice(combatant) ) continue;
    if ( action ) {
      await combatant.setFlag(MODULE.ID, constants.FLAG.SPEED_FACTOR, { selections: [{ actionKey: timeoutAction }] });
    } else {
      manualSkipped.add(combatant.id);
    }
  }

  autoAdvance = false;
  if ( activeBar?.rendered ) {
    promptQueue.length = 0;
    await activeBar.close();
  }

  if ( !combat.getFlag(MODULE.ID, constants.FLAG.REVEALED) && allChosen(combat) ) await rollAndReveal(combat);
  else ui.combat?.render();
}

/* -------------------------------------------- */

/**
 * Find an active, non-GM owner of an actor.
 * @param {Actor} actor
 * @returns {User|undefined} Owning user, if any.
 */
export function getActivePlayerOwner(actor) {
  if ( !actor?.hasPlayerOwner ) return undefined;
  return game.users.find(u => u.active && !u.isGM && actor.testUserPermission(u, "OWNER"));
}

/* -------------------------------------------- */

/**
 * Whether the current user is the one who chooses the action for a combatant.
 * @param {Combatant} combatant
 * @returns {boolean}
 */
export function currentUserCanChoose(combatant) {
  const owner = getActivePlayerOwner(combatant?.actor);
  return owner ? owner.id === game.user.id : game.user.isGM;
}

/* -------------------------------------------- */

/**
 * Get the active combatant id.
 * @returns {string|null}
 */
export function getActiveCombatantId() {
  return activeCombatantId;
}

/* -------------------------------------------- */
/*  ACTION BAR CONTROL                          */
/* -------------------------------------------- */

/**
 * Open the single action bar for a combatant.
 * @param {string} combatId
 * @param {string} combatantId
 * @returns {Promise<void>}
 */
export async function openActionBar(combatId, combatantId) {
  activeCombatantId = combatantId;
  if ( activeBar?.rendered ) {
    await activeBar.setCombatant(combatId, combatantId);
  } else {
    const { SpeedFactorActionBar } = await import("../forms/speed-factor-action-bar.js");
    activeBar = new SpeedFactorActionBar({ combatId, combatantId });
    await activeBar.render(true);
  }
  ui.combat?.render();
}

/* -------------------------------------------- */

/**
 * Toggle the action bar for a combatant.
 * @param {string} combatId
 * @param {string} combatantId
 * @returns {Promise<void>}
 */
export async function toggleActionBar(combatId, combatantId) {
  // Manually choosing a combatant takes over from auto-advance.
  autoAdvance = false;
  if ( activeCombatantId === combatantId && activeBar?.rendered ) {
    promptQueue.length = 0;
    await activeBar.close();
  } else {
    await openActionBar(combatId, combatantId);
  }
}

/* -------------------------------------------- */

/**
 * Whether the GM is auto-advancing through choices.
 * @returns {boolean}
 */
export function isAutoAdvancing() {
  return autoAdvance;
}

/* -------------------------------------------- */

/**
 * Toggle auto-advance on or off.
 * @param {string} combatId
 * @returns {void}
 */
export function toggleAutoAdvance(combatId) {
  autoAdvance = !autoAdvance;
  if ( autoAdvance && !activeBar?.rendered ) advanceAuto(combatId);
  else ui.combat?.render();
}

/* -------------------------------------------- */

/**
 * When auto-advancing, open the action bar for the next GM-controlled combatant that still needs an action.
 * @param {string} [combatId]
 * @returns {void}
 */
function advanceAuto(combatId) {
  const combat = combatId ? game.combats.get(combatId) : game.combat;
  if ( !autoAdvance || !combat ) {
    ui.combat?.render();
    return;
  }

  const ordered = combat.turns?.length ? combat.turns : [...combat.combatants];
  const next = ordered.find(c => currentUserCanChoose(c) && needsChoice(c));
  if ( next ) openActionBar(combat.id, next.id);
  else if ( allChosen(combat) ) rollAndReveal(combat);
  else ui.combat?.render();
}

/* -------------------------------------------- */

/**
 * Whether a combatant still needs an action chosen this round.
 * @param {Combatant} combatant
 * @returns {boolean}
 */
function needsChoice(combatant) {
  if ( combatant.getFlag(MODULE.ID, constants.FLAG.SPEED_FACTOR) ) return false;
  if ( manualSkipped.has(combatant.id) ) return false;
  return true;
}

/* -------------------------------------------- */

/**
 * Queue a prompt to choose for a combatant.
 * @param {string} combatId
 * @param {string} combatantId
 * @returns {void}
 */
export function enqueuePrompt(combatId, combatantId) {
  if ( activeCombatantId !== combatantId && !promptQueue.some(p => p.combatantId === combatantId) ) {
    promptQueue.push({ combatId, combatantId });
  }
  if ( !activeBar?.rendered ) {
    const next = promptQueue.shift();
    if ( next ) openActionBar(next.combatId, next.combatantId);
  }
}

/* -------------------------------------------- */

/**
 * Handle the action bar closing.
 * @param {import("../forms/speed-factor-action-bar.js").SpeedFactorActionBar} bar
 * @returns {void}
 */
export function onActionBarClosed(bar) {
  if ( bar !== activeBar ) return;
  activeBar = null;
  activeCombatantId = null;
  const next = promptQueue.shift();
  if ( next ) openActionBar(next.combatId, next.combatantId);
  else if ( autoAdvance ) advanceAuto();
  else ui.combat?.render();
}

/* -------------------------------------------- */

/**
 * Record a combatant's chosen action and refresh the combat tracker.
 * @param {string} combatId
 * @param {string} combatantId
 * @param {object} choice
 * @returns {Promise<void>}
 */
export async function recordChoice(combatId, combatantId, choice) {
  const combat = game.combats.get(combatId);
  const combatant = combat?.combatants.get(combatantId);
  if ( !combatant ) return;

  await combatant.setFlag(MODULE.ID, constants.FLAG.SPEED_FACTOR, choice);

  if ( !combat.getFlag(MODULE.ID, constants.FLAG.REVEALED) && allChosen(combat) ) await rollAndReveal(combat);
  else ui.combat?.render();
}

/* -------------------------------------------- */

/**
 * Whether every combatant has chosen an action or been skipped.
 * @param {Combat} combat
 * @returns {boolean}
 */
export function allChosen(combat) {
  return !combat.combatants.some(c => needsChoice(c));
}

/* -------------------------------------------- */

/**
 * Roll initiative for all combatants and reveal the chosen actions.
 * @param {Combat} combat
 * @returns {Promise<void>}
 */
export async function rollAndReveal(combat) {
  if ( !combat ) return;
  clearGatherTimer();
  await combat.rollAll();
  await combat.update({ turn: 0 });
  await combat.setFlag(MODULE.ID, constants.FLAG.REVEALED, true);

  ui.combat?.render();
}

/* -------------------------------------------- */
/*  COMBAT TRACKER DISPLAY                       */
/* -------------------------------------------- */

/**
 * Decorate the combat tracker with each combatant's chosen action (or status), a GM choose/re-choose
 * button per GM-controlled combatant, and a GM roll control while choices are being gathered.
 * Triggered by the `renderCombatTracker` hook.
 * @param {Application} app Combat tracker app
 * @param {HTMLElement|jQuery} html
 * @returns {void}
 */
function decorateCombatTracker(app, html) {
  if ( !isSpeedFactorEnabled() ) return;
  const combat = app.viewed;
  if ( !combat ) return;

  const element = (html instanceof jQuery) ? html[0] : html;
  const revealed = !!combat.getFlag(MODULE.ID, constants.FLAG.REVEALED);
  const revealRole = getRevealRole();

  const activeId = getActiveCombatantId();

  for ( const row of element.querySelectorAll("[data-combatant-id]") ) {
    const combatant = combat.combatants.get(row.dataset.combatantId);
    if ( !combatant ) continue;

    const choice = combatant.getFlag(MODULE.ID, constants.FLAG.SPEED_FACTOR);
    const canChoose = currentUserCanChoose(combatant);

    const text = resolveTrackerText(choice, {
      revealed,
      revealRole,
      isOwner: !!combatant.actor?.isOwner
    });
    if ( text ) {
      const nameEl = row.querySelector(".token-name, .combatant-name, .name");
      if ( nameEl ) {
        const badge = document.createElement("div");
        badge.classList.add("custom-dnd5e-speed-factor-action");
        badge.textContent = text;
        nameEl.appendChild(badge);
      }
    }

    if ( canChoose ) {
      const isActive = activeId === combatant.id;
      if ( isActive ) row.classList.add("custom-dnd5e-speed-factor-active");

      const controls = row.querySelector(".combatant-controls");
      if ( controls ) {
        const button = document.createElement("button");
        button.type = "button";
        button.classList.add("inline-control", "combatant-control", "icon", "fa-solid", "fa-bolt",
          "custom-dnd5e-speed-factor-choose");
        button.classList.toggle("active", isActive);
        button.dataset.tooltip = game.i18n.localize("CUSTOM_DND5E.speedFactorInitiative.coordinator.choose");
        button.addEventListener("click", async event => {
          event.preventDefault();
          event.stopPropagation();
          await toggleActionBar(combat.id, combatant.id);
        });
        controls.prepend(button);
      }
    }
  }

  if ( game.user.isGM && combat.started && !revealed ) {
    const bulkRolls = element.querySelector(".encounter-controls .control-buttons.left");
    if ( bulkRolls && !bulkRolls.querySelector(".custom-dnd5e-speed-factor-auto") ) {
      const autoButton = document.createElement("button");
      autoButton.type = "button";
      autoButton.classList.add("inline-control", "combat-control", "icon", "fa-solid", "fa-forward-fast",
        "custom-dnd5e-speed-factor-auto");
      autoButton.classList.toggle("active", isAutoAdvancing());
      autoButton.dataset.tooltip = game.i18n.localize("CUSTOM_DND5E.speedFactorInitiative.coordinator.autoAdvance");
      autoButton.addEventListener("click", event => {
        event.preventDefault();
        toggleAutoAdvance(combat.id);
      });
      bulkRolls.append(autoButton);
    }
  }
}

/* -------------------------------------------- */

/**
 * Resolve the tracker text for a combatant's choice.
 * @param {object|undefined} choice
 * @param {object} options
 * @param {boolean} options.revealed Whether choices have been revealed
 * @param {number} options.revealRole Minimum role that may see revealed choices
 * @param {boolean} options.isOwner Whether the current user owns the combatant
 * @returns {string} Tracker text
 */
function resolveTrackerText(choice, { revealed, revealRole, isOwner }) {
  const canSeeChoice = revealed && game.user.role >= revealRole;
  if ( canSeeChoice ) return getChoiceLabel(choice);

  if ( isOwner ) {
    return choice
      ? getChoiceLabel(choice)
      : game.i18n.localize("CUSTOM_DND5E.speedFactorInitiative.tracker.waiting");
  }

  // Everyone else only sees that a choice has been made, never what it was.
  return choice
    ? game.i18n.localize("CUSTOM_DND5E.speedFactorInitiative.tracker.hidden")
    : "";
}

/* -------------------------------------------- */
/*  SOCKET HANDLERS                             */
/* -------------------------------------------- */

/**
 * Handle an incoming `sfRequestAction` socket event.
 * Only processed by the targeted non-GM owner.
 * @param {object} data
 * @param {object} data.options
 * @param {string} data.options.combatId
 * @param {string[]} data.options.combatantIds
 * @param {string} data.options.userId
 * @returns {void}
 */
export function handleRequestAction(data) {
  if ( game.user.isGM ) return;
  const { combatId, combatantIds, userId } = data.options;
  if ( game.user.id !== userId ) return;

  for ( const combatantId of combatantIds ) enqueuePrompt(combatId, combatantId);
}

/* -------------------------------------------- */

/**
 * Handle an incoming `sfActionChosen` socket event.
 * Only processed by the primary GM.
 * @param {object} data
 * @param {object} data.options
 * @param {string} data.options.combatId
 * @param {string} data.options.combatantId
 * @param {object} data.options.choice
 * @returns {Promise<void>}
 */
export async function handleActionChosen(data) {
  if ( !game.user.isGM || !isPrimaryHandler() ) return;
  const { combatId, combatantId, choice } = data.options;
  await recordChoice(combatId, combatantId, choice);
}

/* -------------------------------------------- */

/**
 * Submit a chosen action.
 * @param {string} combatId
 * @param {string} combatantId
 * @param {object} choice
 * @returns {Promise<void>}
 */
export async function submitChoice(combatId, combatantId, choice) {
  if ( game.user.isGM ) {
    await recordChoice(combatId, combatantId, choice);
  } else {
    game.socket.emit(`module.${MODULE.ID}`, {
      action: "sfActionChosen",
      options: { combatId, combatantId, choice }
    });
  }
}
