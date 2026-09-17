import { CONSTANTS, MODULE } from "../constants.js";
import { configs } from "../configurations/registry.js";
import { getSetting, isPrimaryHandler } from "../utils.js";
import { workflows } from "../workflows/workflows.js";
import { applyRadialEffects } from "./radial-status-effects.js";

/**
 * Register hooks and patches.
 */
export function register() {
  registerHooks();
  registerPatches();
}

/* -------------------------------------------- */

/**
 * Register hooks.
 */
function registerHooks() {
  Hooks.on("renderTokenHUD", onRenderTokenHUD);
  Hooks.on("customDnd5e.conditionsConfigApplied", onConditionsConfigApplied);
  Hooks.on("createActiveEffect", effect => onConditionLevelChange(effect, effect.system?.level ?? 1));
  Hooks.on("updateActiveEffect", (effect, changes) => {
    if ( foundry.utils.getProperty(changes, "system.level") === undefined ) return;
    onConditionLevelChange(effect, effect.system?.level);
  });
  Hooks.on("deleteActiveEffect", effect => onConditionLevelChange(effect, 0));
}

/* -------------------------------------------- */

/**
 * Register libWrapper patches.
 */
function registerPatches() {
  libWrapper.register(
    MODULE.ID,
    "foundry.canvas.placeables.Token.prototype._refreshEffects",
    refreshEffectsPatch,
    "WRAPPER"
  );

  // The system derives a per-level icon path (e.g. exhaustion-3.svg), which only exists for
  // conditions. Fall back to the condition's base icon for conditions made leveled through
  // configuration.
  libWrapper.register(
    MODULE.ID,
    "dnd5e.dataModels.activeEffect.ConditionData.getIconByLevel",
    function(wrapped, type, level) {
      const img = wrapped(type, level);
      const defaults = CONFIG.CUSTOM_DND5E ?? CONFIG.DND5E;
      if ( Number.isFinite(defaults?.conditionTypes?.[type]?.levels) ) return img;
      return CONFIG.DND5E.conditionTypes[type]?.img ?? img;
    },
    "WRAPPER"
  );

  // Handle undefined `Infinite` in ConditionData#_onUpdate when a leveled condition changes level from no
  // recorded level.
  libWrapper.register(
    MODULE.ID,
    "dnd5e.dataModels.activeEffect.ConditionData.prototype._onUpdate",
    function(wrapped, ...args) {
      try {
        return wrapped(...args);
      } catch (err) {
        if ( !(err instanceof ReferenceError) ) throw err;
      }
    },
    "WRAPPER"
  );
}

/* -------------------------------------------- */

/**
 * Re-prepare actors with condition effects after the conditions config is applied.
 */
function onConditionsConfigApplied() {
  const hasConditionEffects = actor => actor?.effects?.some(e => e.type === "condition");

  for ( const actor of game.actors ?? [] ) {
    if ( !hasConditionEffects(actor) ) continue;
    actor.reset();
    if ( actor.sheet?.rendered ) actor.sheet.render();
  }

  for ( const token of canvas?.tokens?.placeables ?? [] ) {
    const actor = token.actor;
    if ( !hasConditionEffects(actor) ) continue;
    if ( !token.document.actorLink ) {
      actor.reset();
      if ( actor.sheet?.rendered ) actor.sheet.render();
    }
    token.renderFlags.set({ redrawEffects: true });
  }
}

/* -------------------------------------------- */

/**
 * Actors currently having their level condition riders applied.
 * @type {Set<string>}
 */
const applyingRiderActors = new Set();

/* -------------------------------------------- */

/**
 * Handle a change to a leveled condition's level.
 * @param {ActiveEffect} effect
 * @param {number} level
 */
async function onConditionLevelChange(effect, level) {
  if ( !getSetting(configs.conditions.SETTING.ENABLE.KEY) ) return;

  const actor = effect.parent;
  if ( actor?.documentName !== "Actor" || !isPrimaryHandler(actor) ) return;

  const statusId = getLeveledStatusId(effect);
  if ( !statusId || statusId === "exhaustion" ) return;

  if ( getSetting(CONSTANTS.WORKFLOWS.SETTING.ENABLE.KEY) ) {
    workflows.processEvent("conditionLevelChanged", { actor, conditionId: statusId, counterValue: level ?? 0 });
  }

  await applyLevelConditionRiders(actor, statusId, level ?? 0);
}

/* -------------------------------------------- */

/**
 * Apply the conditions configured for each level of a leveled condition up to the current
 * level as rider effects and remove for levels no longer reached.
 * @param {Actor5e} actor
 * @param {string} statusId
 * @param {number} level
 */
async function applyLevelConditionRiders(actor, statusId, level) {
  if ( applyingRiderActors.has(actor.uuid) ) return;
  applyingRiderActors.add(actor.uuid);

  try {
    const conditionsMap = CONFIG.DND5E.conditionTypes[statusId]?.conditions ?? {};
    const desired = new Set();
    for ( const [conditionLevel, ids] of Object.entries(conditionsMap) ) {
      if ( Number(conditionLevel) > level ) continue;
      for ( const id of ids ?? [] ) {
        if ( id !== statusId ) desired.add(id);
      }
    }

    // Apply missing rider conditions
    for ( const id of desired ) {
      if ( actor.effects.get(dnd5e.utils.staticID(`dnd5e${id}`)) ) continue;
      const rider = await actor.toggleStatusEffect(id, { active: true });
      if ( rider?.setFlag ) await rider.setFlag(MODULE.ID, "riderOf", statusId);
    }

    // Remove rider conditions for levels no longer reached
    for ( const rider of Array.from(actor.effects) ) {
      if ( rider.getFlag(MODULE.ID, "riderOf") !== statusId ) continue;
      const riderStatusId = [...(rider.statuses ?? [])][0];
      if ( !desired.has(riderStatusId) ) await rider.delete();
    }
  } finally {
    applyingRiderActors.delete(actor.uuid);
  }
}

/* -------------------------------------------- */

/**
 * Get the status id of an effect when it is a leveled condition.
 * @param {ActiveEffect} effect
 * @returns {string|null} Status id, or null when the effect is not a leveled condition
 */
function getLeveledStatusId(effect) {
  const statusId = [...(effect.statuses ?? [])][0];
  const conditionConfig = CONFIG.DND5E.conditionTypes[statusId];
  return (Number.isFinite(conditionConfig?.levels) && conditionConfig.levels > 0) ? statusId : null;
}

/* -------------------------------------------- */

/**
 * Get the ActiveEffect for a condition on an actor.
 * @param {Actor5e} actor
 * @param {string} statusId
 * @returns {ActiveEffect|undefined} Effect, if found
 */
function getConditionEffect(actor, statusId) {
  const staticId = dnd5e.utils.staticID(`dnd5e${statusId}`);
  const effect = actor.effects.get(staticId);
  if ( effect ) return effect;

  return actor.effects.find(e => e.statuses.has(statusId));
}

/* -------------------------------------------- */

/**
 * Get the current level of a condition.
 * @param {ActiveEffect|undefined} effect
 * @returns {number} Current level, or 0
 */
function getConditionLevel(effect) {
  return effect?.system?.level ?? effect?.getFlag(MODULE.ID, "conditionLevel") ?? 0;
}

/* -------------------------------------------- */

/**
 * Patch for _refreshEffects to add level badges to leveled condition icons on the token.
 * Badges are added directly to the effects container, positioned at each sprite's corner.
 * @param {Function} wrapped
 * @param {...any} args
 */
function refreshEffectsPatch(wrapped, ...args) {
  // Remove any previously added level badges
  const existing = this.effects.children.filter(c => c.customDnd5eLevelBadge);
  for ( const badge of existing ) {
    this.effects.removeChild(badge);
    badge.destroy();
  }

  wrapped(...args);

  // Apply radial status effects if enabled
  applyRadialEffects(this);

  if ( !getSetting(configs.conditions.SETTING.ENABLE.KEY) ) return;

  const actor = this.actor;
  if ( !actor ) return;

  const SHOW_ICON = CONST.ACTIVE_EFFECT_SHOW_ICON;
  const activeEffects = actor.appliedEffects?.filter(e => (e.showIcon === SHOW_ICON.ALWAYS)
    || ((e.showIcon === SHOW_ICON.CONDITIONAL) && e.isTemporary)) ?? [];

  for ( const child of this.effects.children ) {
    if ( child === this.effects.bg || child.customDnd5eLevelBadge ) continue;

    const effect = activeEffects[child.zIndex];
    if ( !effect ) continue;

    const statusId = getLeveledStatusId(effect);
    if ( !statusId || statusId === "exhaustion" ) continue;

    const level = getConditionLevel(effect);
    if ( level <= 0 ) continue;

    addLevelBadge(this.effects, child, level);
  }
}

/* -------------------------------------------- */

/**
 * Add level badge.
 * @param {PIXI.Container} container
 * @param {PIXI.Sprite} sprite
 * @param {number} level
 */
function addLevelBadge(container, sprite, level) {
  const fontSize = Math.max(12, Math.round(sprite.width * 0.3));

  const style = new PIXI.TextStyle({
    fontFamily: "Signika",
    fontSize,
    fontWeight: "bold",
    fill: "#ff0000",
    stroke: "#000000",
    strokeThickness: 2,
    lineJoin: "round",
    miterLimit: 1,
    dropShadow: false
  });

  const text = new PIXI.Text(String(level), style);
  text.customDnd5eLevelBadge = true;
  text.resolution = window.devicePixelRatio * 4;
  text.anchor.set(0.5, 0.5);
  const anchorX = sprite.anchor?.x ?? 0;
  const anchorY = sprite.anchor?.y ?? 0;
  text.x = sprite.x + ((0.5 - anchorX) * sprite.width);
  text.y = sprite.y + ((0.5 - anchorY) * sprite.height);
  text.zIndex = Infinity;

  container.addChild(text);
}

/* -------------------------------------------- */

/**
 * Render level badges on the token HUD status effects palette.
 * @param {TokenHUD} app
 * @param {HTMLElement} html
 */
function onRenderTokenHUD(app, html) {
  if ( !getSetting(configs.conditions.SETTING.ENABLE.KEY) ) return;

  const actor = app.object?.actor;
  if ( !actor ) return;

  // Remove any existing badges
  html.querySelectorAll(".custom-dnd5e-condition-level").forEach(el => el.remove());

  const conditionTypes = CONFIG.DND5E.conditionTypes;

  const container = html.querySelector(".status-effects");
  if ( !container ) return;

  for ( const [statusId, conditionConfig] of Object.entries(conditionTypes) ) {
    if ( !conditionConfig.levels || conditionConfig.levels <= 0 ) continue;
    if ( statusId === "exhaustion" ) continue;

    const elem = html.querySelector(`[data-status-id="${statusId}"]`);
    if ( !elem ) continue;

    const effect = getConditionEffect(actor, statusId);
    const level = getConditionLevel(effect);
    if ( level <= 0 ) continue;

    const left = elem.offsetLeft + (elem.offsetWidth / 2);
    const top = elem.offsetTop + (elem.offsetHeight / 2) + 2;

    const badge = document.createElement("span");
    badge.classList.add("custom-dnd5e-condition-level");
    badge.dataset.statusId = statusId;
    badge.textContent = level;
    badge.style.left = `${left}px`;
    badge.style.top = `${top}px`;

    container.appendChild(badge);
  }
}
