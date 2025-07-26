import { CONSTANTS, MODULE } from "./constants.js";

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
    if ( game.settings && game.settings.get(MODULE.ID, CONSTANTS.DEBUG.SETTING.KEY) ) {
      if ( !data ) {
        console.log(`${MODULE.NAME} Debug | ${message}`);
        return;
      }
      const dataClone = foundry.utils.deepClone(data);
      console.log(`${MODULE.NAME} Debug | ${message}`, dataClone);
    }
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
  document?.sheet.render(true);
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
