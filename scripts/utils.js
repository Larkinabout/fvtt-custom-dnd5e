import { CONSTANTS, MODULE } from "./constants.js";
import { SPLATTER_VS, SPLATTER_FS } from "./shaders/splatter.js";
import { LIGHT_RAYS_VS, LIGHT_RAYS_FS } from "./shaders/light-rays.js";
import { COLOR_SPLIT_FS } from "./shaders/color-split.js";
import { WAVE_FS } from "./shaders/wave.js";

/**
 * Hide all open application windows overlaying the canvas.
 * @param {object} [options]
 * @param {number} [options.duration=200] Fade duration in milliseconds
 * @returns {Promise<Function>} A function that restores the hidden applications
 */
export async function hideApplications({ duration = 200 } = {}) {
  const hidden = [];
  const uiElements = new Set(Object.values(ui));

  for ( const app of foundry.applications.instances.values() ) {
    if ( !app.rendered || !app.element ) continue;
    if ( app.element.ownerDocument.defaultView !== window ) continue;
    if ( uiElements.has(app) ) continue;
    hidden.push(app);
  }

  await Promise.all(hidden.map(app =>
    app.element.animate([{ opacity: 1 }, { opacity: 0 }], { duration, fill: "forwards" }).finished
  ));

  for ( const app of hidden ) {
    app.element.style.display = "none";
    app.element.getAnimations().forEach(a => a.cancel());
  }

  return async () => {
    await Promise.all(hidden.filter(app => app.element).map(app => {
      app.element.style.display = "";
      return app.element.animate([{ opacity: 0 }, { opacity: 1 }], { duration }).finished;
    }));
  };
}

/* -------------------------------------------- */

/**
 * Animation functions.
 */
export const animations = {};

/**
 * Console logger
 */
export class Logger {
  /**
   * Log an info message.
   * @param {string} message The message
   * @param {boolean} notify Whether to notify the user
   */
  static info(message, notify = false) {
    if ( notify ) ui.notifications.info(`${MODULE.NAME} | ${message}`);
    else console.log(`${MODULE.NAME} Info | ${message}`);
  }

  /**
   * Log an error message.
   * @param {string} message The message
   * @param {boolean} notify Whether to notify the user
   */
  static error(message, notify = false) {
    if ( notify ) ui.notifications.error(`${MODULE.NAME} | ${message}`);
    else console.error(`${MODULE.NAME} Error | ${message}`);
  }

  /**
   * Log a debug message.
   * @param {string} message The message
   * @param {*} data The data
   */
  static debug(message, data) {
    try {
      if ( !game.settings?.get(MODULE.ID, CONSTANTS.DEBUG.SETTING.KEY) ) return;
    } catch {
      return;
    }
    if ( !data ) {
      console.log(`${MODULE.NAME} Debug | ${message}`);
      return;
    }
    const dataClone = foundry.utils.deepClone(data);
    console.log(`${MODULE.NAME} Debug | ${message}`, dataClone);
  }
}

/* -------------------------------------------- */

/**
 * Check whether the variable is empty.
 * @param {object} data The data
 * @returns {boolean} Whether the data is empty
 */
export function checkEmpty(data) {
  return (data && typeof data === "object" && !Object.keys(data).length) || (data !== false && !data);
}

/* -------------------------------------------- */

/**
 * Delete a property from an object using a dot notated key.
 * @param {object} object The object to update
 * @param {string} key The string key
 * @returns {boolean} Whether the property was deleted
 */
export function deleteProperty(object, key) {
  const keys = key.split(".");
  for (let i = 0; i < keys.length - 1; i++) {
    object = object[keys[i]];
    if ( !object ) return false;
  }
  delete object[keys[keys.length - 1]];
  return true;
}

/* -------------------------------------------- */

/**
 * Open a document.
 * @param {string} uuid The UUID
 */
export async function openDocument(uuid) {
  const document = await fromUuid(uuid);
  if ( document instanceof JournalEntryPage ) {
    document.parent.sheet.render(true, {pageId: document.id, anchor: undefined});
  } else {
    document.sheet.render(true);
  }
}

/* -------------------------------------------- */

/**
 * Get default dnd5e config.
 * @param {string} property The property
 * @param {string|null} key The key
 * @returns {object} The config
 */
export function getDefaultDnd5eConfig(property, key = null) {
  if ( key ) {
    return foundry.utils.deepClone(CONFIG.CUSTOM_DND5E[property][key]);
  } else {
    return foundry.utils.deepClone(CONFIG.CUSTOM_DND5E[property]);
  }
}

/* -------------------------------------------- */

/**
 * Reset the dnd5e config to its default.
 * @param {string} property The property
 * @returns {object} The reset config
 */
export function resetDnd5eConfig(property) {
  CONFIG.DND5E[property] = foundry.utils.deepClone(CONFIG.CUSTOM_DND5E[property]);
  Logger.debug(`Config 'CONFIG.DND5E.${property}' reset to default`);
  return CONFIG.DND5E[property];
}

/* -------------------------------------------- */

/**
 * Register a menu.
 * @param {string} key The setting key
 * @param {object} options The setting options
 */
export function registerMenu(key, options) {
  game.settings.registerMenu(MODULE.ID, key, options);
}

/* -------------------------------------------- */

/**
 * Register a setting.
 * @param {string} key The setting key
 * @param {object} options The setting options
 */
export function registerSetting(key, options) {
  game.settings.register(MODULE.ID, key, options);
}

/* -------------------------------------------- */

/**
 * Get parts of a die.
 * @param {string} input The die input
 * @returns {object|null} The die parts
 */
export function getDieParts(input) {
  const match = input?.match(/\b(\d+)[dD](\d+)\b/);
  return match ? { number: parseInt(match[1], 10), faces: parseInt(match[2], 10) } : null;
}

/* -------------------------------------------- */

/**
 * Convert string "true"/"false" values to booleans.
 * @param {string|boolean} value The input value.
 * @returns {boolean|string} The converted value.
 */
export function parseBoolean(value) {
  if ( value === "false" ) return false;
  if ( value === "true" ) return true;
  return value;
}

/* -------------------------------------------- */

/**
 * Get a flag from an entity.
 * @param {object} entity The entity
 * @param {string} key The flag key
 * @returns {*} The flag value
 */
export function getFlag(entity, key) {
  const flag = entity.getFlag(MODULE.ID, key);
  return (flag || flag === 0) ? flag : null;
}

/* -------------------------------------------- */

/**
 * Set a flag on an entity.
 * @param {object} entity The entity
 * @param {string} key The flag key
 * @param {*} value The flag value
 */
export async function setFlag(entity, key, value) {
  Logger.debug("Setting flag...", { entity, key, value });
  await entity.setFlag(MODULE.ID, key, value);
  Logger.debug("Flag set", { entity, key, value });
}

/* -------------------------------------------- */

/**
 * Unset a flag on an entity.
 * @param {object} entity The entity
 * @param {string} key The flag key
 */
export async function unsetFlag(entity, key) {
  Logger.debug("Unsetting flag...", { entity, key });
  await entity.unsetFlag(MODULE.ID, key);
  Logger.debug("Flag unset", { entity, key });
}

/* -------------------------------------------- */

/**
 * Get a setting value.
 * @param {string} key The setting key
 * @param {*} [defaultValue=null] The default value
 * @returns {*} The setting value
 */
export function getSetting(key, defaultValue = null) {
  let value = defaultValue ?? null;
  try {
    value = game.settings.get(MODULE.ID, key);
  } catch {
    Logger.debug(`Setting '${key}' not found. Searching world settings storage...`);
    const worldStorage = game.settings.storage.get("world").find(value => value.key === `${MODULE.ID}.${key}`);

    if ( worldStorage !== undefined ) return worldStorage.value;

    Logger.debug(`Setting '${key}' not found. Searching client settings storage...`);

    const clientStorage = game.settings.storage.get("client")[`${MODULE.ID}.${key}`];

    if ( clientStorage !== undefined ) return clientStorage;

    Logger.debug(`Setting '${key}' not found`);
  }
  return value;
}

/* -------------------------------------------- */

/**
 * Get the default setting value.
 * @param {string} key The setting key
 * @returns {*} The default setting value
 */
export function getDefaultSetting(key) {
  try {
    return game.settings.settings.get(`${MODULE.ID}.${key}`)?.default;
  } catch {
    Logger.debug(`Default setting '${key}' not found`);
  }
}

/* -------------------------------------------- */

/**
 * Get a dnd5e setting value.
 * @param {string} key The setting key
 * @param {*} [defaultValue=null] The default value
 * @returns {*} The setting value
 */
export function getDnd5eSetting(key, defaultValue = null) {
  try {
    return game.settings.get("dnd5e", key);
  } catch {
    Logger.debug(`Setting '${key}' not found`);
    return defaultValue;
  }
}

/* -------------------------------------------- */

/**
 * Set a setting value.
 * @param {string} key The setting key
 * @param {*} value The setting value
 */
export async function setSetting(key, value) {
  if ( game.settings.settings.has(`${MODULE.ID}.${key}`) ) {
    await game.settings.set(MODULE.ID, key, value);
    Logger.debug(`Setting '${key}' set to '${value}'`);
  } else {
    Logger.debug(`Setting '${key}' not found`);
  }
}

/* -------------------------------------------- */

/**
 * Reset a setting to its default value.
 * @param {string} key The setting key
 */
export async function resetSetting(key) {
  const setting = game.settings.settings.get(`${MODULE.ID}.${key}`);
  if ( setting ) {
    const value = setting.default;
    if ( value !== undefined ) {
      await game.settings.set(MODULE.ID, key, value);
      Logger.debug(`Setting '${key}' reset to '${value}'`);
    } else {
      Logger.debug(`Setting '${key}' default not defined`);
    }
  } else {
    Logger.debug(`Setting '${key}' not found`);
  }
}

/* -------------------------------------------- */

/**
 * Set a dnd5e setting value.
 * @param {string} key The setting key
 * @param {*} value The setting value
 */
export async function setDnd5eSetting(key, value) {
  if ( game.settings.settings.has(`dnd5e.${key}`) ) {
    await game.settings.set("dnd5e", key, value);
    Logger.debug(`Setting '${key}' set to '${value}'`);
  } else {
    Logger.debug(`Setting '${key}' not found`);
  }
}

/* -------------------------------------------- */

/**
 * Make the actor bloodied.
 * @param {object} actor The actor
 */
export async function makeBloodied(actor) {
  if ( !actor.effects.get("dnd5ebloodied000") && !actor.system.traits.ci.value.has("bloodied") ) {
    Logger.debug("Making Bloodied...", actor);
    const cls = getDocumentClass("ActiveEffect");
    const effect = await cls.fromStatusEffect("bloodied");
    effect.updateSource({ id: "dnd5ebloodied000", _id: "dnd5ebloodied000", "flags.custom-dnd5e.ignore": true });
    await cls.create(effect, { parent: actor, keepId: true });
    Logger.debug("Bloodied made", actor);
  }
}

/* -------------------------------------------- */

/**
 * Unmake the actor bloodied.
 * @param {object} actor The actor
 */
export async function unmakeBloodied(actor) {
  Logger.debug("Unmaking Bloodied...", actor);
  const effect = actor.effects.get("dnd5ebloodied000");
  await effect?.delete();
  Logger.debug("Bloodied unmade", actor);
}

/* -------------------------------------------- */

/**
 * Make the actor unconscious.
 * @param {object} actor The actor
 */
export async function makeUnconscious(actor) {
  if ( !actor.effects.get("dnd5eunconscious") && !actor.system.traits.ci.value.has("unconscious") ) {
    Logger.debug("Making Unconscious...", actor);
    const cls = getDocumentClass("ActiveEffect");
    const effect = await cls.fromStatusEffect("unconscious");
    effect.updateSource({ id: "dnd5eunconscious", _id: "dnd5eunconscious", "flags.core.overlay": true, "flags.custom-dnd5e.ignore": true });
    await cls.create(effect, { parent: actor, keepId: true });
    Logger.debug("Unconscious made", actor);
  }
}

/* -------------------------------------------- */

/**
 * Unmake the actor unconscious.
 * @param {object} actor The actor
 */
export async function unmakeUnconscious(actor) {
  Logger.debug("Unmaking Unconscious...", actor);
  const effect = actor.effects.get("dnd5eunconscious");
  await effect?.delete();
  Logger.debug("Unconscious unmade", actor);
}

/* -------------------------------------------- */

/**
 * Rotate a token.
 * @param {object} token The token
 * @param {number} rotation The angle of rotation
 */
export async function rotateToken(token, rotation) {
  if ( token.document.rotation === rotation ) return;

  Logger.debug("Rotating token", { token, rotation });

  const flag = getFlag(token.document, "rotation");
  if ( !flag && flag !== 0 ) {
    await setFlag(token.document, "rotation", token.document.rotation);
  }

  token.document.update({ rotation });

  Logger.debug("Token rotated", { token, rotation });
}

/* -------------------------------------------- */

/**
 * Unrotate a token.
 * @param {object} token The token
 */
export async function unrotateToken(token) {
  const rotation = getFlag(token.document, "rotation");

  if ( token.document.rotation === rotation ) return;

  Logger.debug("Unrotating token", { token, rotation });

  if ( rotation || rotation === 0 ) {
    token.document.update({ rotation });
    await unsetFlag(token.document, "rotation");
  }

  Logger.debug("Token unrotated", { token, rotation });
}

/* -------------------------------------------- */

/**
 * Tint a token.
 * @param {object} token The token
 * @param {string} tint The hex color
 */
export async function tintToken(token, tint) {
  if ( token?.document?.texture?.tint === tint ) return;

  Logger.debug("Tinting token", { token, tint });

  if ( !getFlag(token.document, "tint") ) {
    await setFlag(token.document, "tint", token.document.texture.tint);
  }

  token.document.update({ texture: { tint } });

  Logger.debug("Token tinted", { token, tint });
}

/* -------------------------------------------- */

/**
 * Untint a token.
 * @param {object} token The token
 */
export async function untintToken(token) {
  const tint = getFlag(token.document, "tint");

  if ( token?.document?.texture?.tint === tint ) return;

  Logger.debug("Untinting token", { token, tint });

  if ( tint || tint === null ) {
    token.document.update({ texture: { tint } });
    await unsetFlag(token.document, "tint");
  }

  Logger.debug("Token untinted", { token, tint });
}

/* -------------------------------------------- */

/**
 * Make the actor dead.
 * Set HP to 0, set Death Saves failures to 3, and apply 'Dead' status effect.
 * @param {object} actor The actor
 * @param {object} [data=null] The data
 */
export async function makeDead(actor, data = null) {
  Logger.debug("Making Dead...", actor);
  const applyNegativeHp = getSetting(CONSTANTS.HIT_POINTS.SETTING.APPLY_NEGATIVE_HP.KEY);
  if ( data ) {
    if ( !applyNegativeHp ) {
      if ( data["system.attributes.hp.value"] !== undefined ) {
        data["system.attributes.hp.value"] = 0;
      } else {
        foundry.utils.setProperty(data, "system.attributes.hp.value", 0);
      }
    }
    data["system.attributes.death.failure"] = 3;
  } else {
    actor.update({
      ...(!applyNegativeHp && { "system.attributes.hp.value": 0 }),
      ...(actor.type === "character" && { "system.attributes.death.failure": 3 })
    });
  }

  if ( actor.effects.get("dnd5edead0000000") ) return;

  const cls = getDocumentClass("ActiveEffect");
  const effect = await cls.fromStatusEffect("dead");
  effect.updateSource({ "flags.core.overlay": true, "flags.custom-dnd5e.ignore": true });
  await cls.create(effect, { parent: actor, keepId: true });

  Logger.debug("Dead made", actor);
}

/* -------------------------------------------- */

/**
 * Unmake the actor dead.
 * @param {object} actor The actor
 */
export async function unmakeDead(actor) {
  Logger.debug("Unmaking Dead...", actor);
  const effect = actor.effects.get("dnd5edead0000000");
  await effect?.delete();
  Logger.debug("Dead unmade", actor);
}

/* -------------------------------------------- */

/**
 * Load templates.
 * @param {Array} templates The templates
 */
export async function c5eLoadTemplates(templates) {
  Logger.debug("Loading templates", templates);
  try {
    const result = await foundry.applications.handlebars.loadTemplates(templates);
    Logger.debug("Templates loaded", { templates, result });
  } catch (error) {
    Logger.debug("Failed to load templates", { templates, error });
  }
}

/* -------------------------------------------- */

/**
 * Show an import file dialog.
 * @param {string} templatePath The path to the Handlebars template for the dialog content
 * @param {object} templateContext The context to pass to the template
 * @param {Function} processCallback The callback to process the selected file, receives a File and returns a boolean
 * @returns {Promise<boolean>} Whether the import was successful
 */
export async function showImportDialog(templatePath, templateContext, processCallback) {
  const content = await foundry.applications.handlebars.renderTemplate(templatePath, templateContext);
  return foundry.applications.api.DialogV2.confirm({
    window: {
      title: game.i18n.localize("CUSTOM_DND5E.importData")
    },
    content,
    modal: true,
    position: { width: 400 },
    yes: {
      icon: "fas fa-file-import",
      label: game.i18n.localize("CUSTOM_DND5E.importData"),
      callback: async (event, button, dialog) => {
        const form = dialog.element.querySelector("form");
        if ( !form.data.files.length ) {
          Logger.error(game.i18n.localize("CUSTOM_DND5E.dialog.importData.noFile"), true);
          return false;
        }
        return processCallback(form.data.files[0]);
      }
    },
    no: {
      icon: "fas fa-times",
      label: game.i18n.localize("CUSTOM_DND5E.cancel")
    }
  });
}

/* -------------------------------------------- */

/**
 * Get the advantage mode based on the keyboard event.
 * @param {KeyboardEvent} event The keyboard event.
 * @returns {string} The advantage mode ("normal", "advantage", or "disadvantage").
 */
export function getAdvantageMode(event) {
  if ( !event ) return "normal";
  const keysPressed = getDnd5eKeysPressed(event);
  if ( keysPressed.advantage && keysPressed.disadvantage ) return "normal";
  if ( keysPressed.advantage ) return "advantage";
  if ( keysPressed.disadvantage ) return "disadvantage";
  return "normal";
}

/* -------------------------------------------- */

/**
 * Get the keys pressed during the event related to D&D 5e-specific actions.
 * @param {KeyboardEvent} event The keyboard event.
 * @returns {object} Keys pressed during the event.
 */
export function getDnd5eKeysPressed(event) {
  return {
    normal: areKeysPressed(event, "skipDialogNormal"),
    advantage: areKeysPressed(event, "skipDialogAdvantage"),
    disadvantage: areKeysPressed(event, "skipDialogDisadvantage")
  };
}

/* -------------------------------------------- */

/**
 * Check if specific keys are pressed during the event.
 * @param {KeyboardEvent} event The keyboard event.
 * @param {string} action The action to check.
 * @returns {boolean} Whether the keys are pressed.
 */
function areKeysPressed(event, action) {
  if ( !event ) return false;
  const activeModifiers = {};
  const addModifiers = (key, pressed) => {
    activeModifiers[key] = pressed;
    foundry.helpers.interaction.KeyboardManager.MODIFIER_CODES[key].forEach(n => activeModifiers[n] = pressed);
  };
  addModifiers(foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.CONTROL, event.ctrlKey || event.metaKey);
  addModifiers(foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.SHIFT, event.shiftKey);
  addModifiers(foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.ALT, event.altKey);
  const isPressed = game.keybindings.get("dnd5e", action).some(b => {
    if ( !(event.type === "keyup" && b.key === event.code) && game.keyboard.downKeys.has(b.key) && b.modifiers.every(m => activeModifiers[m]) ) return true;
    if ( b.modifiers.length ) return false;
    return activeModifiers[b.key];
  });
  const downKeys = [...game.keyboard.downKeys];
  Logger.debug(`Getting key pressed for ${action}`, { event, downKeys, isPressed });
  return isPressed;
}

/* -------------------------------------------- */

/**
 * Calculate attack bonus
 * @param {*} activity The activity being used.
 * @returns {number} The attack bonus.
 */
export function calculateAttackBonus(activity) {
  const item = activity.item;
  const attackModeOptions = item.system.attackModes;
  const attackMode = attackModeOptions?.[0]?.value;
  const attackConfig = activity.getAttackData({ attackMode });
  return parseInt(dnd5e.dice.simplifyRollFormula(
    Roll.defaultImplementation.replaceFormulaData(attackConfig.parts.join(" + "), attackConfig.data)
  )) ?? 0;
}

/* -------------------------------------------- */

/**
 * Calculates the probability of hitting.
 * @param {string} advantageMode The advantage mode ("normal", "advantage", or "disadvantage").
 * @param {number} attackBonus The bonus to the attack roll.
 * @param {number} targetNumber The target number to hit.
 * @returns {number} The probability of hitting (between 0 and 1).
 */
export function calculateHitProbability(advantageMode, attackBonus, targetNumber = 20) {
  const rollNeeded = Math.max(1, targetNumber - attackBonus);
  switch (advantageMode) {
    case "advantage":
      const failChance = (rollNeeded - 1) / 20;
      return 1 - (failChance * failChance);
    case "disadvantage":
      const successChance = (21 - rollNeeded) / 20;
      return successChance * successChance;
    default:
      return (21 - rollNeeded) / 20;
  }
}

/* -------------------------------------------- */

/**
 * Shake the canvas with decaying intensity.
 * @param {object} [options] The options.
 * @param {number} [options.intensity=25] The shake intensity in screen pixels.
 * @param {number} [options.duration=500] The shake duration in milliseconds.
 */
animations.shakeCanvas = async function({ intensity = 25, duration = 500 } = {}) {
  if ( !canvas?.stage ) return;
  const origin = { x: canvas.stage.pivot.x, y: canvas.stage.pivot.y };
  const scale = canvas.stage.scale.x || 1;

  await CanvasAnimation.animate([], {
    name: "custom-dnd5e.shakeCanvas",
    duration,
    ontick: (dt, animation) => {
      const progress = animation.time / duration;
      const decay = Math.pow(1 - progress, 2);
      const adjusted = intensity / scale;
      canvas.stage.pivot.x = origin.x + ((Math.random() - 0.5) * adjusted * decay);
      canvas.stage.pivot.y = origin.y + ((Math.random() - 0.5) * adjusted * decay);
    }
  });

  canvas.stage.pivot.set(origin.x, origin.y);
};

/* -------------------------------------------- */

/**
 * Flash the canvas with a color overlay.
 * Skipped when photosensitive mode is enabled.
 * @param {object} [options] The options.
 * @param {number} [options.color=0xFF0000] The flash color as a hex number.
 * @param {number} [options.opacity=0.4] The peak opacity (0-1).
 * @param {number} [options.duration=500] The total flash duration in milliseconds.
 */
animations.flashCanvas = async function({ color = 0xFF0000, opacity = 0.4, duration = 500 } = {}) {
  if ( !canvas?.interface ) return;
  if ( game.settings.get("core", "photosensitiveMode") ) return;

  const scale = canvas.stage.scale.x || 1;
  const { x: pivotX, y: pivotY } = canvas.stage.pivot;
  const w = canvas.app.screen.width / scale;
  const h = canvas.app.screen.height / scale;

  const flash = new PIXI.Graphics();
  flash.beginFill(color);
  flash.drawRect(pivotX - (w / 2), pivotY - (h / 2), w, h);
  flash.endFill();
  flash.alpha = 0;
  canvas.interface.addChild(flash);

  const fadeIn = duration * 0.2;
  const fadeOut = duration * 0.8;

  await CanvasAnimation.animate(
    [{ parent: flash, attribute: "alpha", to: opacity }],
    { duration: fadeIn, name: "custom-dnd5e.flashCanvas.in" }
  );
  await CanvasAnimation.animate(
    [{ parent: flash, attribute: "alpha", to: 0 }],
    { duration: fadeOut, name: "custom-dnd5e.flashCanvas.out" }
  );

  canvas.interface.removeChild(flash);
  flash.destroy();
};

/* -------------------------------------------- */

/**
 * Get the IDs of non-GM users who own the given actor.
 * Falls back to the current user's ID if no non-GM owner is found.
 * @param {object} actor The actor
 * @returns {string[]} The user IDs
 */
export function getActorOwnerIds(actor) {
  const owners = game.users.filter(u => !u.isGM && actor.testUserPermission(u, "OWNER"));
  return owners.length ? owners.map(u => u.id) : [game.user.id];
}

/* -------------------------------------------- */

/**
 * Check whether a socket is needed to reach the given user IDs.
 * Returns true if any of the user IDs belong to a different client.
 * @param {string[]} userIds The target user IDs
 * @returns {boolean} Whether a socket emission is needed
 */
function requiresSocket(userIds) {
  return userIds.some(id => id !== game.user.id);
}

/* -------------------------------------------- */

/**
 * Shake the entire screen with decaying intensity.
 * @param {object} [options] The options.
 * @param {number} [options.intensity=5] The shake intensity in pixels.
 * @param {number} [options.duration=500] The shake duration in milliseconds.
 * @param {string[]} [options.userIds] If provided, only play for these users.
 */
animations.shakeScreen = async function({ intensity = 5, duration = 500, userIds } = {}) {
  if ( userIds && requiresSocket(userIds) ) {
    game.socket.emit(`module.${MODULE.ID}`, { action: "animation", type: "shakeScreen", options: { intensity, duration, userIds } });
  }
  if ( userIds && !userIds.includes(game.user.id) ) return;
  const element = document.body;
  const decayDuration = Math.min(duration, 1000);
  const startTime = performance.now();

  return new Promise(resolve => {
    /**
     * Handle a single animation frame for the shake effect.
     * @param {number} currentTime The current time in milliseconds supplied by requestAnimationFrame.
     */
    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = elapsed / duration;

      if ( progress >= 1 ) {
        element.style.transform = "";
        resolve();
        return;
      }

      const decayProgress = Math.min(elapsed / decayDuration, 1);
      const decay = Math.pow(1 - decayProgress, 2);
      const x = (Math.random() - 0.5) * intensity * decay;
      const y = (Math.random() - 0.5) * intensity * decay;
      element.style.transform = `translate(${x}px, ${y}px)`;
      requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  });
};

/* -------------------------------------------- */

/**
 * Flash the entire screen with a color overlay.
 * Skipped when photosensitive mode is enabled.
 * @param {object} [options] The options.
 * @param {string} [options.color="#ff0000"] The flash color as a CSS color string.
 * @param {number} [options.opacity=0.4] The peak opacity (0-1).
 * @param {number} [options.duration=500] The total flash duration in milliseconds.
 * @param {string[]} [options.userIds] If provided, only play for these users.
 */
animations.flashScreen = async function({ color = "#ff0000", opacity = 0.4, duration = 500, userIds } = {}) {
  if ( userIds && requiresSocket(userIds) ) {
    game.socket.emit(`module.${MODULE.ID}`, { action: "animation", type: "flashScreen", options: { color, opacity, duration, userIds } });
  }
  if ( userIds && !userIds.includes(game.user.id) ) return;
  if ( game.settings.get("core", "photosensitiveMode") ) return;

  const flash = document.createElement("div");
  flash.style.cssText = `
    position: fixed;
    inset: 0;
    background: ${color};
    opacity: 0;
    pointer-events: none;
    z-index: 10000;
  `;
  document.body.appendChild(flash);

  const fadeIn = Math.min(duration * 0.2, 200);
  const fadeOut = Math.min(duration * 0.8, 800);

  await flash.animate(
    [{ opacity: 0 }, { opacity }],
    { duration: fadeIn, fill: "forwards" }
  ).finished;
  await flash.animate(
    [{ opacity }, { opacity: 0 }],
    { duration: fadeOut, fill: "forwards" }
  ).finished;

  flash.remove();
};

/* -------------------------------------------- */

/**
 * Blur the entire screen.
 * @param {object} [options] The options.
 * @param {number} [options.intensity=5] The max blur in pixels.
 * @param {number} [options.duration=1500] The total duration in milliseconds.
 * @param {string[]} [options.userIds] If provided, only play for these users.
 */
animations.blurScreen = async function({ intensity = 5, duration = 1500, userIds } = {}) {
  if ( userIds && requiresSocket(userIds) ) {
    game.socket.emit(`module.${MODULE.ID}`, { action: "animation", type: "blurScreen", options: { intensity, duration, userIds } });
  }
  if ( userIds && !userIds.includes(game.user.id) ) return;
  const element = document.body;
  const fadeIn = Math.min(duration * 0.5, 500);
  const fadeOut = Math.min(duration * 0.5, 1000);
  const startTime = performance.now();

  return new Promise(resolve => {
    /**
     * Animate a single frame of the blur effect.
     * @param {number} currentTime The current time in milliseconds supplied by requestAnimationFrame.
     */
    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = elapsed / duration;

      if ( progress >= 1 ) {
        element.style.filter = "";
        resolve();
        return;
      }

      let env;
      if ( elapsed < fadeIn ) env = elapsed / fadeIn;
      else if ( elapsed > duration - fadeOut ) env = (duration - elapsed) / fadeOut;
      else env = 1.0;
      env = Math.max(0, Math.min(1, env));

      const blur = intensity * env;
      element.style.filter = `blur(${blur}px)`;
      requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  });
};

/* -------------------------------------------- */

/**
 * Blur the game canvas using a PIXI BlurFilter.
 * @param {object} [options] The options.
 * @param {number} [options.intensity=5] The max blur strength.
 * @param {number} [options.duration=1500] The total duration in milliseconds.
 * @param {string[]} [options.userIds] If provided, only play for these users.
 */
animations.blurCanvas = async function({ intensity = 5, duration = 1500, userIds } = {}) {
  if ( userIds && requiresSocket(userIds) ) {
    game.socket.emit(`module.${MODULE.ID}`, { action: "animation", type: "blurCanvas", options: { intensity, duration, userIds } });
  }
  if ( userIds && !userIds.includes(game.user.id) ) return;
  if ( typeof canvas === "undefined" || !canvas?.stage ) return;

  const filter = new PIXI.BlurFilter(0);

  if ( !canvas.stage.filterArea ) {
    canvas.stage.filterArea = canvas.app.renderer.screen;
  }

  const existing = canvas.stage.filters || [];
  canvas.stage.filters = [...existing, filter];

  const fadeIn = Math.min(duration * 0.5, 500);
  const fadeOut = Math.min(duration * 0.5, 1000);
  const startTime = performance.now();

  return new Promise(resolve => {
    /**
     * Animate a single frame of the canvas blur effect.
     * @param {number} currentTime The current time in milliseconds supplied by requestAnimationFrame.
     */
    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1.0);

      if ( progress >= 1.0 ) {
        canvas.stage.filters = (canvas.stage.filters || []).filter(f => f !== filter);
        filter.destroy();
        resolve();
        return;
      }

      let env;
      if ( elapsed < fadeIn ) env = elapsed / fadeIn;
      else if ( elapsed > duration - fadeOut ) env = (duration - elapsed) / fadeOut;
      else env = 1.0;
      env = Math.max(0, Math.min(1, env));

      filter.blur = intensity * env;

      requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  });
};

/* -------------------------------------------- */

/**
 * Sway the entire screen.
 * @param {object} [options] The options.
 * @param {number} [options.intensity=2] The max rotation in degrees.
 * @param {number} [options.duration=2000] The total duration in milliseconds.
 * @param {number} [options.frequency=2] The oscillation frequency (cycles per second).
 * @param {string[]} [options.userIds] If provided, only play for these users.
 */
animations.swayScreen = async function({ intensity = 2, duration = 2000, frequency = 2, userIds } = {}) {
  if ( userIds && requiresSocket(userIds) ) {
    game.socket.emit(`module.${MODULE.ID}`, { action: "animation", type: "swayScreen", options: { intensity, duration, frequency, userIds } });
  }
  if ( userIds && !userIds.includes(game.user.id) ) return;
  const element = document.body;
  const decayDuration = Math.min(duration, 2000);
  const startTime = performance.now();

  return new Promise(resolve => {
    /**
     * Animate a single frame of the sway effect.
     * @param {number} currentTime The current time in milliseconds supplied by requestAnimationFrame.
     */
    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = elapsed / duration;

      if ( progress >= 1 ) {
        element.style.transform = "";
        resolve();
        return;
      }

      const decayProgress = Math.min(elapsed / decayDuration, 1);
      const decay = Math.pow(1 - decayProgress, 2);
      const angle = Math.sin(elapsed / 1000 * Math.PI * frequency) * intensity * decay;
      const x = Math.sin(elapsed / 1000 * Math.PI * frequency * 0.7) * intensity * 2 * decay;
      element.style.transform = `rotate(${angle}deg) translateX(${x}px)`;
      requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  });
};

/* -------------------------------------------- */

/**
 * Play a light rays screen effect.
 * @param {object} [options] The options.
 * @param {string} [options.color="#fff5d6"] The color of the rays.
 * @param {number} [options.rays=12] The number of light rays.
 * @param {number} [options.duration=2500] The total duration in milliseconds.
 * @param {string[]} [options.userIds] If provided, only play for these users.
 */
animations.lightRaysScreen = async function({ color = "#fff5d6", rays = 12, duration = 2500, userIds } = {}) {
  if ( userIds && requiresSocket(userIds) ) {
    game.socket.emit(`module.${MODULE.ID}`, { action: "animation", type: "lightRaysScreen", options: { color, rays, duration, userIds } });
  }
  if ( userIds && !userIds.includes(game.user.id) ) return;
  if ( game.settings.get("core", "photosensitiveMode") ) return;

  const canvas = document.createElement("canvas");
  canvas.style.cssText = `
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 10000;
  `;
  document.body.appendChild(canvas);
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;

  const gl = canvas.getContext("webgl");
  if ( !gl ) {
    canvas.remove();
    return;
  }

  /**
   * Compile a WebGL shader from source.
   * @param {number} type The shader type (e.g. gl.VERTEX_SHADER or gl.FRAGMENT_SHADER).
   * @param {string} source The GLSL source code for the shader.
   * @returns {WebGLShader} The compiled shader object.
   */
  function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
  }

  const vs = compileShader(gl.VERTEX_SHADER, LIGHT_RAYS_VS);
  const fs = compileShader(gl.FRAGMENT_SHADER, LIGHT_RAYS_FS);
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  const aPos = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uTime = gl.getUniformLocation(program, "u_time");
  const uFade = gl.getUniformLocation(program, "u_fade");
  const uResolution = gl.getUniformLocation(program, "u_resolution");
  const uColor = gl.getUniformLocation(program, "u_color");
  const uRays = gl.getUniformLocation(program, "u_rays");
  const uSeed = gl.getUniformLocation(program, "u_seed");

  // Parse hex color to RGB floats
  const r = parseInt(color.slice(1, 3), 16) / 255;
  const g = parseInt(color.slice(3, 5), 16) / 255;
  const b = parseInt(color.slice(5, 7), 16) / 255;

  gl.uniform2f(uResolution, canvas.width, canvas.height);
  gl.uniform3f(uColor, r, g, b);
  gl.uniform1f(uRays, rays);
  gl.uniform1f(uSeed, Math.random() * 100.0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  const fadeIn = Math.min(duration * 0.3, 500);
  const fadeOut = Math.min(duration * 0.7, 1500);

  const startTime = performance.now();

  return new Promise(resolve => {
    /**
     * Animate a single frame for the light rays effect.
     * @param {number} currentTime The current time in milliseconds supplied by requestAnimationFrame.
     */
    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1.0);

      if ( progress >= 1.0 ) {
        gl.deleteProgram(program);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        gl.deleteBuffer(buffer);
        canvas.remove();
        resolve();
        return;
      }

      let fade;
      if ( elapsed < fadeIn ) {
        fade = elapsed / fadeIn;
      } else if ( elapsed > duration - fadeOut ) {
        fade = (duration - elapsed) / fadeOut;
      } else {
        fade = 1.0;
      }
      fade = Math.max(0, Math.min(1, fade));

      gl.uniform1f(uTime, progress);
      gl.uniform1f(uFade, fade);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  });
};

/* -------------------------------------------- */

/**
 * Play a liquid splatter screen effect.
 * @param {object} [options] The options.
 * @param {string} [options.color="#8b0000"] The splatter color.
 * @param {number} [options.density=10] Number of splat impacts (max 20).
 * @param {number} [options.duration=3500] The total duration in milliseconds.
 * @param {number} [options.fluidity=1.0] Drip fluidity from 0 (frozen) to 2 (watery).
 * @param {string[]} [options.userIds] If provided, only play for these users.
 */
animations.splatterScreen = async function({ color = "#8b0000", density = 10, duration = 3500, fluidity = 1.0, userIds } = {}) {
  if ( userIds && requiresSocket(userIds) ) {
    game.socket.emit(`module.${MODULE.ID}`, { action: "animation", type: "splatterScreen", options: { color, density, duration, fluidity, userIds } });
  }
  if ( userIds && !userIds.includes(game.user.id) ) return;
  if ( game.settings.get("core", "photosensitiveMode") ) return;

  const canvas = document.createElement("canvas");
  canvas.style.cssText = `
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 10000;
  `;
  document.body.appendChild(canvas);
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;

  const gl = canvas.getContext("webgl");
  if ( !gl ) {
    canvas.remove();
    return;
  }

  /**
   * Compile a WebGL shader from source.
   * @param {number} type The shader type (e.g. gl.VERTEX_SHADER or gl.FRAGMENT_SHADER).
   * @param {string} source The GLSL source code for the shader.
   * @returns {WebGLShader} The compiled shader object.
   */
  function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
  }

  const vs = compileShader(gl.VERTEX_SHADER, SPLATTER_VS);
  const fs = compileShader(gl.FRAGMENT_SHADER, SPLATTER_FS);
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  const aPos = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uTime = gl.getUniformLocation(program, "u_time");
  const uFade = gl.getUniformLocation(program, "u_fade");
  const uResolution = gl.getUniformLocation(program, "u_resolution");
  const uColor = gl.getUniformLocation(program, "u_color");
  const uSeed = gl.getUniformLocation(program, "u_seed");
  const uDensity = gl.getUniformLocation(program, "u_density");
  const uFluidity = gl.getUniformLocation(program, "u_fluidity");

  // Parse hex color to RGB floats
  const r = parseInt(color.slice(1, 3), 16) / 255;
  const g = parseInt(color.slice(3, 5), 16) / 255;
  const b = parseInt(color.slice(5, 7), 16) / 255;

  gl.uniform2f(uResolution, canvas.width, canvas.height);
  gl.uniform3f(uColor, r, g, b);
  gl.uniform1f(uSeed, Math.random() * 100.0);
  gl.uniform1f(uDensity, Math.max(1, Math.min(20, density)));
  gl.uniform1f(uFluidity, Math.max(0, Math.min(2, fluidity)));
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  const fadeOut = Math.min(duration * 0.6, 2000);

  const startTime = performance.now();

  return new Promise(resolve => {
    /**
     * Handle a single animation frame for the splatter effect.
     * @param {number} currentTime The current time in milliseconds supplied by requestAnimationFrame.
     */
    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1.0);

      if ( progress >= 1.0 ) {
        gl.deleteProgram(program);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        gl.deleteBuffer(buffer);
        canvas.remove();
        resolve();
        return;
      }

      const fade = elapsed > duration - fadeOut
        ? Math.max(0, (duration - elapsed) / fadeOut)
        : 1.0;

      gl.uniform1f(uTime, elapsed / 1000);
      gl.uniform1f(uFade, fade);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  });
};

/* -------------------------------------------- */

/**
 * Play a color-split screen effect.
 * @param {object} [options] The options.
 * @param {string[]} [options.colors=["#ff0000","#00ff00","#0000ff"]] Up to three hex colors for the split layers.
 * @param {number} [options.intensity=25] Maximum pixel offset for layer movement.
 * @param {number} [options.duration=4000] The total duration in milliseconds.
 * @param {string[]} [options.userIds] If provided, only play for these users.
 */
animations.colorSplitCanvas = async function({ colors = ["#ff0000", "#00ff00", "#0000ff"], intensity = 25, duration = 4000, userIds } = {}) {
  if ( userIds && requiresSocket(userIds) ) {
    game.socket.emit(`module.${MODULE.ID}`, { action: "animation", type: "colorSplitCanvas", options: { colors, intensity, duration, userIds } });
  }
  if ( userIds && !userIds.includes(game.user.id) ) return;
  if ( game.settings.get("core", "photosensitiveMode") ) return;
  if ( typeof canvas === "undefined" || !canvas?.stage ) return;

  // Parse hex colors to 0-1 RGB
  const rgb = colors.slice(0, 3).map(hex => [
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255
  ]);
  while ( rgb.length < 3 ) rgb.push(rgb.length === 1 ? [0, 1, 0] : [0, 0, 1]);

  const filter = new PIXI.Filter(undefined, COLOR_SPLIT_FS, {
    u_offset0: new Float32Array([0, 0]),
    u_offset1: new Float32Array([0, 0]),
    u_offset2: new Float32Array([0, 0]),
    u_color0: new Float32Array(rgb[0]),
    u_color1: new Float32Array(rgb[1]),
    u_color2: new Float32Array(rgb[2]),
    u_env: 0
  });
  filter.padding = intensity;

  if ( !canvas.stage.filterArea ) {
    canvas.stage.filterArea = canvas.app.renderer.screen;
  }

  const existing = canvas.stage.filters || [];
  canvas.stage.filters = [...existing, filter];

  const arcs = [
    { fx: 1.0, fy: 1.3, px: 0, py: 0 },
    { fx: 1.7, fy: 0.9, px: 2.094, py: 1.047 },
    { fx: 0.8, fy: 1.6, px: 4.189, py: 3.142 }
  ];

  const startTime = performance.now();

  return new Promise(resolve => {
    /**
     * Handle a single animation frame for the split effect.
     * @param {number} currentTime The current time in milliseconds supplied by requestAnimationFrame.
     */
    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1.0);

      if ( progress >= 1.0 ) {
        canvas.stage.filters = (canvas.stage.filters || []).filter(f => f !== filter);
        filter.destroy();
        resolve();
        return;
      }

      const env = Math.sin(progress * Math.PI);
      const amp = intensity * env;
      const t = progress * Math.PI * 2 * 1.5;

      for ( let i = 0; i < 3; i++ ) {
        const arc = arcs[i];
        filter.uniforms[`u_offset${i}`][0] = Math.cos((t * arc.fx) + arc.px) * amp;
        filter.uniforms[`u_offset${i}`][1] = Math.sin((t * arc.fy) + arc.py) * amp;
      }

      filter.uniforms.u_env = env;

      requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  });
};

/* -------------------------------------------- */

/**
 * Play a vignette effect to darken edges of screen.
 * @param {object} [options] The options.
 * @param {number} [options.intensity=0.8] The max intensity.
 * @param {number} [options.duration=2000] The total duration in milliseconds.
 * @param {string[]} [options.userIds] If provided, only play for these users.
 */
animations.vignetteScreen = async function({ intensity = 0.8, duration = 2000, userIds } = {}) {
  if ( userIds && requiresSocket(userIds) ) {
    game.socket.emit(`module.${MODULE.ID}`, { action: "animation", type: "vignetteScreen", options: { intensity, duration, userIds } });
  }
  if ( userIds && !userIds.includes(game.user.id) ) return;

  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 10000;
  `;
  document.body.appendChild(overlay);

  const fadeIn = Math.min(duration * 0.5, 500);
  const fadeOut = Math.min(duration * 0.5, 1000);
  const startTime = performance.now();

  return new Promise(resolve => {
    /**
     * Handle a single animation frame for the vignette effect.
     *
     * @param {number} currentTime The current time in milliseconds supplied by requestAnimationFrame.
     * @returns {void}
     */
    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = elapsed / duration;

      if ( progress >= 1 ) {
        overlay.remove();
        resolve();
        return;
      }

      let env;
      if ( elapsed < fadeIn ) env = elapsed / fadeIn;
      else if ( elapsed > duration - fadeOut ) env = (duration - elapsed) / fadeOut;
      else env = 1.0;
      env = Math.max(0, Math.min(1, env));

      const amount = env * intensity;
      const innerRadius = 50 - (amount * 30);
      const outerRadius = 80 - (amount * 20);
      const edgeOpacity = Math.min(amount * 1.5, 1);
      overlay.style.background = `radial-gradient(circle at center, transparent ${innerRadius}%, rgba(0,0,0,${amount}) ${outerRadius}%, rgba(0,0,0,${edgeOpacity}) 100%)`;
      requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  });
};

/* -------------------------------------------- */

/**
 * Play a wave distortion screen effect.
 * @param {object} [options] The options.
 * @param {number} [options.intensity=30] Maximum displacement scale in pixels.
 * @param {number} [options.speed=1] Animation speed multiplier.
 * @param {number} [options.duration=4000] The total duration in milliseconds.
 * @param {string[]} [options.userIds] If provided, only play for these users.
 */
animations.waveCanvas = async function({ intensity = 30, speed = 1, duration = 4000, userIds } = {}) {
  if ( userIds && requiresSocket(userIds) ) {
    game.socket.emit(`module.${MODULE.ID}`, { action: "animation", type: "waveCanvas", options: { intensity, speed, duration, userIds } });
  }
  if ( userIds && !userIds.includes(game.user.id) ) return;
  if ( game.settings.get("core", "photosensitiveMode") ) return;
  if ( typeof canvas === "undefined" || !canvas?.stage ) return;

  const filter = new PIXI.Filter(undefined, WAVE_FS, {
    u_time: 0,
    u_intensity: 0
  });
  filter.padding = intensity;

  if ( !canvas.stage.filterArea ) {
    canvas.stage.filterArea = canvas.app.renderer.screen;
  }

  const existing = canvas.stage.filters || [];
  canvas.stage.filters = [...existing, filter];

  const startTime = performance.now();

  return new Promise(resolve => {
    /**
     * Handle a single animation frame for the wave effect.
     * @param {number} currentTime The current time in milliseconds supplied by requestAnimationFrame.
     */
    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1.0);

      if ( progress >= 1.0 ) {
        canvas.stage.filters = (canvas.stage.filters || []).filter(f => f !== filter);
        filter.destroy();
        resolve();
        return;
      }

      const sine = Math.sin(progress * Math.PI);
      const env = sine * sine;

      filter.uniforms.u_time = (elapsed / 1000) * speed;
      filter.uniforms.u_intensity = intensity * env;

      requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  });
};
