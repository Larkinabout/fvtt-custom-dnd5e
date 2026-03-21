import { CONSTANTS, MODULE } from "../constants.js";
import { getSetting } from "../utils.js";
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
 * Register hooks and event listeners.
 */
function registerHooks() {
  document.addEventListener("click", onClickCondition, { capture: true });
  document.addEventListener("contextmenu", onClickCondition, { capture: true });
  Hooks.on("renderTokenHUD", onRenderTokenHUD);
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
}

/* -------------------------------------------- */

/**
 * On click condition.
 * @param {PointerEvent} event Pointer event
 */
async function onClickCondition(event) {
  const target = event.target?.closest?.(".effect-control") ?? event.target;
  if ( !target?.classList?.contains("effect-control") ) return;

  if ( !getSetting(CONSTANTS.CONDITIONS.SETTING.ENABLE.KEY) ) return;

  const statusId = target.dataset?.statusId;
  if ( !statusId ) return;

  if ( statusId === "exhaustion" || statusId === "concentrating" ) return;

  const conditionConfig = CONFIG.DND5E.conditionTypes[statusId];
  if ( !conditionConfig?.levels || conditionConfig.levels <= 0 ) return;

  const actor = canvas.hud.token?.object?.actor;
  if ( !actor ) return;

  event.preventDefault();
  event.stopPropagation();

  const effect = getConditionEffect(actor, statusId);
  const currentLevel = getConditionLevel(effect);
  const maxLevel = conditionConfig.levels;

  await manageLeveledCondition(event, actor, statusId, currentLevel, maxLevel, effect);
}

/* -------------------------------------------- */

/**
 * Increment/decrement a leveled condition.
 * @param {PointerEvent} event Pointer event
 * @param {Actor5e} actor Actor
 * @param {string} statusId Status ID
 * @param {number} currentLevel Current level
 * @param {number} maxLevel Max level
 * @param {ActiveEffect|undefined} effect Existing effect, if any
 */
async function manageLeveledCondition(event, actor, statusId, currentLevel, maxLevel, effect) {
  let newLevel = currentLevel;

  if ( event.button === 0 ) {
    // Left-click: increment
    if ( currentLevel === 0 ) {
      await createConditionEffect(actor, statusId);
      const newEffect = getConditionEffect(actor, statusId);
      if ( newEffect ) {
        await newEffect.setFlag(MODULE.ID, "conditionLevel", 1);
      }
      newLevel = 1;
    } else if ( currentLevel < maxLevel ) {
      await effect.setFlag(MODULE.ID, "conditionLevel", currentLevel + 1);
      newLevel = currentLevel + 1;
    }
  } else if ( event.button === 2 ) {
    // Right-click: decrement
    if ( currentLevel <= 1 && effect ) {
      await deleteConditionEffect(actor, statusId);
      newLevel = 0;
    } else if ( currentLevel > 1 ) {
      await effect.setFlag(MODULE.ID, "conditionLevel", currentLevel - 1);
      newLevel = currentLevel - 1;
    }
  }

  // Display scrolling status text and fire workflow event
  if ( newLevel !== currentLevel ) {
    const conditionName = CONFIG.DND5E.conditionTypes[statusId]?.name ?? statusId;
    const increasing = newLevel > currentLevel;
    const displayLevel = increasing ? newLevel : currentLevel;
    displayScrollingText(actor, `${conditionName} ${displayLevel}`, increasing);

    if ( getSetting(CONSTANTS.WORKFLOWS.SETTING.ENABLE.KEY) ) {
      workflows.processEvent("conditionLevelChanged", { actor, conditionId: statusId, counterValue: newLevel });
    }
  }

  // Re-render the token HUD
  if ( canvas.hud.token?.rendered ) {
    canvas.hud.token.render();
  }
}

/* -------------------------------------------- */

/**
 * Display scrolling status text on the actor's tokens.
 * @param {Actor5e} actor Actor
 * @param {string} name Condition name and level
 * @param {boolean} increasing Whether the level is increasing
 */
function displayScrollingText(actor, name, increasing) {
  const tokens = actor.getActiveTokens(true);
  const text = `${increasing ? "+" : "-"}(${name})`;
  for ( const token of tokens ) {
    if ( !token.visible || token.document.isSecret ) continue;
    canvas.interface.createScrollingText(token.center, text, {
      anchor: CONST.TEXT_ANCHOR_POINTS.CENTER,
      direction: increasing ? CONST.TEXT_ANCHOR_POINTS.TOP : CONST.TEXT_ANCHOR_POINTS.BOTTOM,
      distance: 2 * token.h,
      fontSize: 28,
      stroke: 0x000000,
      strokeThickness: 4,
      jitter: 0.25
    });
  }
}

/* -------------------------------------------- */

/**
 * Get the ActiveEffect for a condition on an actor.
 * @param {Actor5e} actor Actor
 * @param {string} statusId Condition status ID
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
 * @param {ActiveEffect|undefined} effect Effect
 * @returns {number} Current level, or 0
 */
function getConditionLevel(effect) {
  return effect?.getFlag(MODULE.ID, "conditionLevel") ?? 0;
}

/* -------------------------------------------- */

/**
 * Create a condition effect on the actor.
 * @param {Actor5e} actor Actor
 * @param {string} statusId Condition status ID
 */
async function createConditionEffect(actor, statusId) {
  const ActiveEffect = getDocumentClass("ActiveEffect");
  const effect = await ActiveEffect.fromStatusEffect(statusId);
  await ActiveEffect.implementation.create(effect, { parent: actor, keepId: true, animate: false });
}

/* -------------------------------------------- */

/**
 * Delete a condition effect from the actor.
 * @param {Actor5e} actor Actor
 * @param {string} statusId Condition status ID
 */
async function deleteConditionEffect(actor, statusId) {
  const effect = getConditionEffect(actor, statusId);
  if ( !effect ) return;
  await actor.deleteEmbeddedDocuments("ActiveEffect", [effect.id], { animate: false });
}

/* -------------------------------------------- */

/**
 * Patch for _refreshEffects to add level badges to leveled condition icons on the token.
 * Badges are added directly to the effects container, positioned at each sprite's corner.
 * @param {Function} wrapped The original function.
 * @param {...any} args The arguments.
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

  if ( !getSetting(CONSTANTS.CONDITIONS.SETTING.ENABLE.KEY) ) return;

  const actor = this.actor;
  if ( !actor ) return;

  // Build a set of leveled conditions
  const activeEffects = actor.temporaryEffects || [];
  const overlayEffect = activeEffects.findLast(e => e.img && e.getFlag("core", "overlay"));
  const levelMap = new Map();

  for ( const effect of activeEffects ) {
    if ( !effect.img || effect === overlayEffect ) continue;

    const statusId = [...(effect.statuses || [])][0];
    if ( !statusId || statusId === "exhaustion" ) continue;

    const conditionConfig = CONFIG.DND5E.conditionTypes[statusId];
    if ( !conditionConfig?.levels || conditionConfig.levels <= 0 ) continue;

    const level = getConditionLevel(effect);
    if ( level <= 0 ) continue;

    levelMap.set(effect.img, level);
  }

  if ( !levelMap.size ) return;

  // Add badges for leveled conditions
  const bg = this.effects.bg;
  let effectIndex = 0;
  const nonOverlayEffects = activeEffects.filter(e => e.img && e !== overlayEffect);

  for ( const child of this.effects.children ) {
    if ( child === bg || child === this.effects.overlay || child.customDnd5eLevelBadge ) continue;

    const activeEffect = nonOverlayEffects[effectIndex];
    effectIndex++;

    if ( !activeEffect ) continue;
    const level = levelMap.get(activeEffect.img);
    if ( !level ) continue;

    addLevelBadge(this.effects, child, level);
  }
}

/* -------------------------------------------- */

/**
 * Add level badge.
 * @param {PIXI.Container} container Container
 * @param {PIXI.Sprite} sprite Sprite
 * @param {number} level Condition level
 */
function addLevelBadge(container, sprite, level) {
  const style = new PIXI.TextStyle({
    fontFamily: "Signika",
    fontSize: 12,
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
 * @param {TokenHUD} app TokenHUD app
 * @param {HTMLElement} html HTML element
 */
function onRenderTokenHUD(app, html) {
  if ( !getSetting(CONSTANTS.CONDITIONS.SETTING.ENABLE.KEY) ) return;

  const actor = app.object?.actor;
  if ( !actor ) return;

  // Remove any existing badges
  html.querySelectorAll(".custom-dnd5e-condition-level").forEach(el => el.remove());

  const conditionTypes = CONFIG.DND5E.conditionTypes;

  const container = html.querySelector(".status-effects");
  if ( !container ) return;

  for ( const [statusId, config] of Object.entries(conditionTypes) ) {
    if ( !config.levels || config.levels <= 0 ) continue;
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
