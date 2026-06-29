import { CONSTANTS, MODULE } from "./constants.js";

/* -------------------------------------------- */
/*  LOGGING                                     */
/* -------------------------------------------- */

/** Console logger. */
export class Logger {
  /**
   * Log an info message.
   * @param {string} message
   * @param {boolean} [notify=false] Whether to show a UI notification
   * @param {object} [options]
   * @param {boolean} [options.prefix=true]
   */
  static info(message, notify = false, { prefix = true } = {}) {
    const label = prefix ? `${MODULE.NAME} | ${message}` : message;
    if ( notify ) ui.notifications.info(label);
    else console.log(prefix ? `${MODULE.NAME} Info | ${message}` : message);
  }

  /**
   * Log an error message.
   * @param {string} message
   * @param {boolean} [notify=false] Whether to show a UI notification
   * @param {object} [options]
   * @param {boolean} [options.prefix=true]
   */
  static error(message, notify = false, { prefix = true } = {}) {
    const label = prefix ? `${MODULE.NAME} | ${message}` : message;
    if ( notify ) ui.notifications.error(label);
    else console.error(prefix ? `${MODULE.NAME} Error | ${message}` : message);
  }

  /**
   * Log a debug message.
   * @param {string} message
   * @param {*} [data]
   */
  static debug(message, data) {
    try {
      if ( !game.settings?.get(MODULE.ID, CONSTANTS.DEBUG.SETTING.KEY) ) return;
    } catch {
      return;
    }
    if ( data === undefined ) {
      console.log(`${MODULE.NAME} Debug | ${message}`);
      return;
    }
    const dataClone = foundry.utils.deepClone(data);
    console.log(`${MODULE.NAME} Debug | ${message}`, dataClone);
  }
}

/* -------------------------------------------- */
/*  GENERAL UTILITIES                           */
/* -------------------------------------------- */

/**
 * Check whether the variable is empty.
 * @param {object} data
 * @returns {boolean}
 */
export function checkEmpty(data) {
  return (data && typeof data === "object" && !Object.keys(data).length) || (data !== false && !data);
}

/* -------------------------------------------- */

/**
 * Delete a property from an object using a dot-notated key.
 * @param {object} object
 * @param {string} key
 * @returns {boolean}
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
 * Convert string "true"/"false" values to booleans.
 * @param {string|boolean} value
 * @returns {boolean|string}
 */
export function parseBoolean(value) {
  if ( value === "false" ) return false;
  if ( value === "true" ) return true;
  return value;
}

/* -------------------------------------------- */

/**
 * Resolve a formula string containing @attribute paths against an entity's roll data.
 * Supports plain numbers, attribute paths (e.g. @scale.monk.ki-points) and
 * calculations (e.g. @abilities.str.value / 2).
 * @param {object} entity
 * @param {string|number} formula
 * @returns {number|null} Resolved numeric value, or null if resolution fails
 */
export function resolveFormula(entity, formula) {
  if ( typeof formula === "number" ) return formula;
  if ( typeof formula === "string" && formula.includes("@") ) {
    const rollData = entity.getRollData?.() ?? entity.system;
    const replaced = Roll.replaceFormulaData(formula, rollData, { missing: "0" });
    try {
      return Math.floor(Roll.safeEval(replaced));
    } catch {
      return null;
    }
  }
  return Number(formula) || null;
}

/* -------------------------------------------- */

/**
 * Compare a value against a target using the given operator.
 * @param {number} value
 * @param {"eq"|"lt"|"gt"|"neq"} operator
 * @param {number} target
 * @returns {boolean}
 */
export function compareValues(value, operator, target) {
  const a = Number(value);
  const b = Number(target);
  if ( isNaN(a) || isNaN(b) ) return false;
  switch (operator) {
    case "lt": return a < b;
    case "gt": return a > b;
    case "neq": return a !== b;
    case "eq":
    default: return a === b;
  }
}

/* -------------------------------------------- */

/**
 * Get the operator choices for trigger value comparisons.
 * @returns {object}
 */
export function getOperatorChoices() {
  return {
    eq: "CUSTOM_DND5E.form.counters.triggers.triggerOperator.choices.eq",
    lt: "CUSTOM_DND5E.form.counters.triggers.triggerOperator.choices.lt",
    gt: "CUSTOM_DND5E.form.counters.triggers.triggerOperator.choices.gt",
    neq: "CUSTOM_DND5E.form.counters.triggers.triggerOperator.choices.neq"
  };
}

/* -------------------------------------------- */
/*  SETTINGS                                    */
/* -------------------------------------------- */

/**
 * Register a menu.
 * @param {string} key
 * @param {object} options
 */
export function registerMenu(key, options) {
  game.settings.registerMenu(MODULE.ID, key, options);
}

/* -------------------------------------------- */

/**
 * Register a setting.
 * @param {string} key
 * @param {object} options
 */
export function registerSetting(key, options) {
  game.settings.register(MODULE.ID, key, options);
}

/* -------------------------------------------- */

/**
 * Get a setting value.
 * @param {string} key
 * @param {*} [defaultValue=null]
 * @returns {*}
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
 * @param {string} key
 * @returns {*}
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
 * Set a setting value.
 * @param {string} key
 * @param {*} value
 */
export async function setSetting(key, value) {
  if ( game.settings.settings.has(`${MODULE.ID}.${key}`) ) {
    await game.settings.set(MODULE.ID, key, value);
    Logger.debug(`Setting '${key}' set to`, value);
  } else {
    Logger.debug(`Setting '${key}' not found`);
  }
}

/* -------------------------------------------- */

/**
 * Reset a setting to its default value.
 * @param {string} key
 */
export async function resetSetting(key) {
  const setting = game.settings.settings.get(`${MODULE.ID}.${key}`);
  if ( setting ) {
    const value = setting.default;
    if ( value !== undefined ) {
      await game.settings.set(MODULE.ID, key, value);
      Logger.debug(`Setting '${key}' reset to`, value);
    } else {
      Logger.debug(`Setting '${key}' default not defined`);
    }
  } else {
    Logger.debug(`Setting '${key}' not found`);
  }
}

/* -------------------------------------------- */

/**
 * Get a dnd5e setting value.
 * @param {string} key
 * @param {*} [defaultValue=null]
 * @returns {*}
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
 * Set a dnd5e setting value.
 * @param {string} key
 * @param {*} value
 */
export async function setDnd5eSetting(key, value) {
  if ( game.settings.settings.has(`dnd5e.${key}`) ) {
    await game.settings.set("dnd5e", key, value);
    Logger.debug(`Setting '${key}' set to`, value);
  } else {
    Logger.debug(`Setting '${key}' not found`);
  }
}

/* -------------------------------------------- */
/*  FLAGS                                       */
/* -------------------------------------------- */

/**
 * Get a flag from an entity.
 * @param {object} entity
 * @param {string} key
 * @returns {*}
 */
export function getFlag(entity, key) {
  const flag = entity.getFlag(MODULE.ID, key);
  return (flag || flag === 0) ? flag : null;
}

/* -------------------------------------------- */

/**
 * Set a flag on an entity.
 * @param {object} entity
 * @param {string} key
 * @param {*} value
 */
export async function setFlag(entity, key, value) {
  Logger.debug("Setting flag...", { entity, key, value });
  await entity.setFlag(MODULE.ID, key, value);
  Logger.debug("Flag set", { entity, key, value });
}

/* -------------------------------------------- */

/**
 * Unset a flag on an entity.
 * @param {object} entity
 * @param {string} key
 */
export async function unsetFlag(entity, key) {
  Logger.debug("Unsetting flag...", { entity, key });
  await entity.unsetFlag(MODULE.ID, key);
  Logger.debug("Flag unset", { entity, key });
}

/* -------------------------------------------- */
/*  CONFIG                                      */
/* -------------------------------------------- */

/**
 * Get default dnd5e config.
 * @param {string} property
 * @param {string|null} [key=null]
 * @returns {object}
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
 * Assign data to a `CONFIG.DND5E` property, mutating the existing object in place when possible.
 * @param {string} property
 * @param {object} data
 * @returns {object}
 */
export function assignDnd5eConfig(property, data) {
  const current = CONFIG.DND5E[property];
  if ( foundry.utils.getType(current) === "Object" && foundry.utils.getType(data) === "Object" ) {
    for ( const key of Object.keys(current) ) delete current[key];
    Object.assign(current, data);
    return current;
  }
  CONFIG.DND5E[property] = data;
  return CONFIG.DND5E[property];
}

/* -------------------------------------------- */

/**
 * Reset the dnd5e config to its default.
 * @param {string} property
 * @returns {object}
 */
export function resetDnd5eConfig(property) {
  const result = assignDnd5eConfig(property, foundry.utils.deepClone(CONFIG.CUSTOM_DND5E[property]));
  Logger.debug(`Config 'CONFIG.DND5E.${property}' reset to default`);
  return result;
}

/* -------------------------------------------- */
/*  DOCUMENTS & TEMPLATES                       */
/* -------------------------------------------- */

/**
 * Open a document.
 * @param {string} uuid
 */
export async function openDocument(uuid) {
  const document = await fromUuid(uuid);
  if ( !document ) {
    Logger.error(`Document '${uuid}' not found`, true);
    return;
  }
  if ( document instanceof JournalEntryPage ) {
    document.parent.sheet.render(true, {pageId: document.id, anchor: undefined});
  } else {
    document.sheet.render(true);
  }
}

/* -------------------------------------------- */

/**
 * Add a help button to a window header that opens a journal page.
 * @param {HTMLElement} element
 * @param {string} uuid
 */
export async function addHelpButton(element, uuid) {
  const windowHeader = element.querySelector(".window-header");
  if ( !windowHeader || windowHeader.querySelector('[data-action="help"]') ) return;
  const doc = await fromUuid(uuid);
  const journal = doc instanceof JournalEntryPage ? doc.parent : doc;
  if ( !journal?.testUserPermission(game.user, "OBSERVER") ) return;
  const pack = journal.pack ? game.packs.get(journal.pack) : null;
  if ( pack && !pack.testUserPermission(game.user, "OBSERVER") ) return;
  const closeButton = windowHeader.querySelector('[data-action="close"]');
  const button = document.createElement("button");
  button.setAttribute("type", "button");
  button.setAttribute("class", "header-control icon fa-solid fa-regular fa-circle-info");
  button.setAttribute("data-tooltip", "CUSTOM_DND5E.openGuide");
  button.setAttribute("aria-label", "CUSTOM_DND5E.openGuide");
  button.setAttribute("data-action", "help");
  button.addEventListener("click", () => openDocument(uuid));
  windowHeader.insertBefore(button, closeButton);
}

/* -------------------------------------------- */

/**
 * Load templates.
 * @param {Array} templates
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
 * @param {string} templatePath
 * @param {object} templateContext
 * @param {Function} processCallback Receives a File, returns boolean
 * @returns {Promise<boolean>}
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
 * Resolve a macro from a UUID and execute with the given args.
 * If `actor` is provided and `token` is not, the token is resolved automatically.
 * @param {string} uuid
 * @param {object} [args={}]
 */
export async function executeMacro(uuid, args = {}) {
  if ( !uuid ) return;
  const macro = await fromUuid(uuid);
  if ( !macro ) {
    Logger.error(`Macro not found: ${uuid}`, true);
    return;
  }
  if ( args.actor && !args.token ) {
    args.token = args.actor.isToken ? args.actor.token : args.actor.getActiveTokens()[0];
  }
  macro.execute(args);
}

/* -------------------------------------------- */
/*  DICE & ROLLS                                */
/* -------------------------------------------- */

/**
 * Get parts of a die string.
 * @param {string} input
 * @returns {object|null}
 */
export function getDieParts(input) {
  const match = input?.match(/\b(\d+)[dD](\d+)\b/);
  return match ? { number: parseInt(match[1], 10), faces: parseInt(match[2], 10) } : null;
}

/* -------------------------------------------- */

/**
 * Get the advantage mode based on the keyboard event.
 * @param {KeyboardEvent} event
 * @returns {string} "normal", "advantage", or "disadvantage"
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
 * Get the D&D 5e-specific keys pressed during the event.
 * @param {KeyboardEvent} event
 * @returns {object}
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
 * @param {KeyboardEvent} event
 * @param {string} action
 * @returns {boolean}
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
  return isPressed;
}

/* -------------------------------------------- */

/**
 * Calculate attack bonus for an activity.
 * @param {*} activity
 * @returns {number}
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
 * Calculate the probability of hitting.
 * @param {string} advantageMode "normal", "advantage", or "disadvantage"
 * @param {number} attackBonus
 * @param {number} [targetNumber=20]
 * @returns {number} Probability between 0 and 1
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
/*  ACTORS & TOKENS                             */
/* -------------------------------------------- */

/**
 * Get the IDs of non-GM users who own the given actor.
 * Falls back to the current user's ID if no non-GM owner is found.
 * @param {object} actor
 * @returns {string[]}
 */
export function getActorOwnerIds(actor) {
  const owners = game.users.filter(u => !u.isGM && actor.testUserPermission(u, "OWNER"));
  return owners.length ? owners.map(u => u.id) : [game.user.id];
}

/* -------------------------------------------- */

/**
 * WWhether the user is the primary handler of a document.
 * @param {Document} [document]
 * @returns {boolean}
 */
export function isPrimaryHandler(document) {
  const activeGM = game.users.activeGM;
  if ( activeGM ) return activeGM.id === game.user.id;
  if ( !document ) return game.user.isGM;
  const owner = game.users.find(u => u.active && document.testUserPermission(u, "OWNER"));
  return owner?.id === game.user.id;
}

/* -------------------------------------------- */

/**
 * Make the actor bloodied.
 * @param {object} actor
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
 * Remove bloodied from the actor.
 * @param {object} actor
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
 * @param {object} actor
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
 * Remove unconscious from the actor.
 * @param {object} actor
 */
export async function unmakeUnconscious(actor) {
  Logger.debug("Unmaking Unconscious...", actor);
  const effect = actor.effects.get("dnd5eunconscious");
  await effect?.delete();
  Logger.debug("Unconscious unmade", actor);
}

/* -------------------------------------------- */

/**
 * Make the actor dead.
 * Set HP to 0, Death Saves failures to 3, and apply 'Dead' status effect.
 * @param {object} actor
 * @param {object} [data=null]
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
 * Remove dead from the actor.
 * @param {object} actor
 */
export async function unmakeDead(actor) {
  Logger.debug("Unmaking Dead...", actor);
  const effect = actor.effects.get("dnd5edead0000000");
  await effect?.delete();
  Logger.debug("Dead unmade", actor);
}

/* -------------------------------------------- */

/**
 * Rotate a token.
 * @param {object} token
 * @param {number} rotation
 */
export async function rotateToken(token, rotation) {
  if ( token.document.rotation === rotation ) return;

  Logger.debug("Rotating token", { token, rotation });

  const flag = getFlag(token.document, "rotation");
  if ( !flag && flag !== 0 ) {
    await setFlag(token.document, "rotation", token.document.rotation);
  }

  token.document.update({ rotation }, { customDnd5eRotation: true });

  Logger.debug("Token rotated", { token, rotation });
}

/* -------------------------------------------- */

/**
 * Unrotate a token.
 * @param {object} token
 */
export async function unrotateToken(token) {
  const rotation = getFlag(token.document, "rotation");

  if ( token.document.rotation === rotation ) return;

  Logger.debug("Unrotating token", { token, rotation });

  if ( rotation || rotation === 0 ) {
    token.document.update({ rotation }, { customDnd5eRotation: true });
    await unsetFlag(token.document, "rotation");
  }

  Logger.debug("Token unrotated", { token, rotation });
}

/* -------------------------------------------- */

/**
 * Tint a token.
 * @param {object} token
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
 * @param {object} token
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
 * Locate the topmost token at the given canvas world-space coordinates.
 * @param {number} x
 * @param {number} y
 * @returns {Token|null}
 */
export function findTargetTokenAt(x, y) {
  if ( !canvas?.tokens?.quadtree ) return null;
  const rect = new PIXI.Rectangle(x, y, 0, 0);
  const collisionTest = ({ t }) => t.visible && t.renderable && t.interactive
    && t.hitArea?.contains(x - t.x, y - t.y);
  const matches = [...canvas.tokens.quadtree.getObjects(rect, { collisionTest })]
    .sort((a, b) => a._lastSortedIndex - b._lastSortedIndex);
  return matches.at(0) ?? null;
}

/* -------------------------------------------- */

/**
 * Get a token's center based on its document's `_source`.
 * @param {Token|TokenDocument} token
 * @returns {{x: number, y: number}|null}
 */
export function getTokenSourceCenter(token) {
  const doc = token?.document ?? token;
  return doc?._source ? doc.getCenterPoint(doc._source) : null;
}

/* -------------------------------------------- */

/**
 * Measure distance between two points.
 * @param {{x: number, y: number}} from
 * @param {{x: number, y: number}} to
 * @returns {number} Distance in scene units (e.g. feet).
 */
export function measureDistance(from, to) {
  const grid = canvas.grid;
  if ( !grid ) return Infinity;
  return grid.measurePath([grid.getOffset(from), grid.getOffset(to)]).distance;
}

/* -------------------------------------------- */
/*  UI                                          */
/* -------------------------------------------- */

/**
 * Hide all open application windows overlaying the canvas.
 * @param {object} [options]
 * @param {number} [options.duration=200] Fade duration in milliseconds
 * @param {(app: ApplicationV2) => boolean} [options.exclude] Predicate; apps for
 *   which this returns true are left visible.
 * @returns {Promise<Function>} A function that restores the hidden applications
 */
export async function hideApplications({ duration = 200, exclude } = {}) {
  const hidden = [];

  for ( const app of foundry.applications.instances.values() ) {
    if ( !app.rendered || !app.element ) continue;
    if ( app.element.ownerDocument.defaultView !== window ) continue;
    if ( !app.options.window?.frame ) continue;
    if ( exclude?.(app) ) continue;
    hidden.push(app);
  }

  await Promise.allSettled(hidden.map(app =>
    app.element.animate([{ opacity: 1 }, { opacity: 0 }], { duration, fill: "forwards" }).finished
  ));

  for ( const app of hidden ) {
    app.element.style.display = "none";
    app.element.getAnimations().forEach(a => a.cancel());
  }

  return async () => {
    await Promise.allSettled(hidden.filter(app => app.element).map(app => {
      app.element.style.display = "";
      return app.element.animate([{ opacity: 0 }, { opacity: 1 }], { duration }).finished;
    }));
  };
}

/* -------------------------------------------- */

/**
 * Managed wrapper around {@link hideApplications}. Returns a `{ hide, restore }`
 * pair that hides apps while a drag/placement is active, and restore them on exit.
 * @param {object} [options]
 * @param {(app: ApplicationV2) => boolean} [options.exclude] Forwarded to
 *   {@link hideApplications}; apps for which this returns true stay visible.
 * @returns {{hide: () => void, restore: () => Promise<void>}}
 */
export function createAppHider({ exclude } = {}) {
  let promise = null;
  return {
    hide() {
      if ( promise ) return;
      promise = hideApplications({ exclude });
    },
    async restore() {
      if ( !promise ) return;
      const pending = promise;
      promise = null;
      const restorer = await pending;
      await restorer();
    }
  };
}

/* -------------------------------------------- */

/**
 * Find the open ApplicationV2 instance whose root element contains the nearest
 * ancestor of `target` matching `selector`. Returns null if `target` isn't
 * inside such an element, or if no open app owns it.
 * @param {EventTarget|null} target
 * @param {string} selector CSS selector for the app root (e.g. a class on the form).
 * @returns {ApplicationV2|null}
 */
export function findAppForElement(target, selector) {
  const el = target?.closest?.(selector);
  if ( !el ) return null;
  for ( const app of foundry.applications.instances.values() ) {
    if ( app.element === el || app.element?.contains?.(el) ) return app;
  }
  return null;
}

/* -------------------------------------------- */
/*  FOLDERS                                     */
/* -------------------------------------------- */

/**
 * Resolve a folder by stored id, then by name, creating it if missing.
 * @param {object} args
 * @param {string} args.type Folder document type, e.g. `"Actor"`
 * @param {string} args.name Localised folder name; used for find-by-name and create
 * @param {string} [args.storedId] Previously-known folder id to try first
 * @param {string} [args.color] Folder colour applied on create
 * @returns {Promise<Folder|null>}
 */
export async function getOrCreateFolder({ type, name, storedId, color } = {}) {
  if ( storedId ) {
    const existing = game.folders?.get(storedId);
    if ( existing && existing.type === type ) return existing;
  }
  const byName = game.folders?.find(f => f.type === type && f.name === name);
  if ( byName ) return byName;
  if ( !game.user.isGM ) return null;
  return Folder.create({ name, type, color });
}

/* -------------------------------------------- */
/*  DRAG & DROP                                 */
/* -------------------------------------------- */

/**
 * Resolve an owned inventory item from a drag event's target.
 * Recognises both the standard dnd5e/Foundry `data-uuid` and Tidy 5e's
 * `data-info-card-entity-uuid`.
 * @param {DragEvent|MouseEvent} event
 * @returns {{actor: Actor, item: Item}|null}
 */
export function resolveOwnedItemFromDragEvent(event) {
  const el = event.target;
  if ( !(el instanceof HTMLElement) ) return null;
  const itemEl = el.closest("[data-uuid], [data-info-card-entity-uuid]");
  if ( !itemEl ) return null;
  if ( itemEl.dataset.activityId || itemEl.dataset.effectId ) return null;
  const uuid = itemEl.dataset.uuid ?? itemEl.dataset.infoCardEntityUuid;
  const item = uuid ? fromUuidSync(uuid) : null;
  if ( item?.documentName !== "Item" ) return null;
  const actor = item.actor;
  if ( !actor?.isOwner ) return null;
  return { actor, item };
}

/* -------------------------------------------- */
/*  ITEMS                                       */
/* -------------------------------------------- */

/**
 * Find an existing item on the actor that should stack with the given
 * item data: same name, type, container parent, and compendium source.
 * @param {Actor} actor
 * @param {object} itemData
 * @returns {Item|null}
 */
export function findStackableItem(actor, itemData) {
  const name = itemData.name;
  const type = itemData.type;
  const sourceId = itemData._stats?.compendiumSource ?? null;
  const containerId = itemData.system?.container ?? null;
  return actor.items.find(existing => {
    if ( existing.type !== type ) return false;
    if ( existing.name !== name ) return false;
    if ( (existing.system?.container ?? null) !== containerId ) return false;
    const existingSource = existing._stats?.compendiumSource ?? null;
    if ( sourceId && existingSource && sourceId !== existingSource ) return false;
    return existing.system?.quantity !== undefined;
  }) ?? null;
}

/* -------------------------------------------- */

/**
 * Add items to the actor by creating or stacking onto existing items.
 * @param {Actor} actor
 * @param {object[]} itemDataList
 * @returns {Promise<void>}
 */
export async function createOrStackItems(actor, itemDataList) {
  if ( !actor || !itemDataList?.length ) return;

  const batchIds = new Set(itemDataList.map(d => d._id).filter(Boolean));
  const toCreateWithId = [];
  const toCreateFreshId = [];

  for ( const data of itemDataList ) {
    const isPartOfBatchTree = data.type === "container"
      || (data.system?.container && batchIds.has(data.system.container));

    if ( !isPartOfBatchTree ) {
      const existing = findStackableItem(actor, data);
      if ( existing ) {
        const current = existing.system?.quantity ?? 0;
        const incoming = data.system?.quantity ?? 1;
        await existing.update({ "system.quantity": current + incoming });
        continue;
      }
      const clone = foundry.utils.deepClone(data);
      delete clone._id;
      toCreateFreshId.push(clone);
      continue;
    }

    toCreateWithId.push(data);
  }

  if ( toCreateWithId.length ) {
    await actor.createEmbeddedDocuments("Item", toCreateWithId, { keepId: true });
  }
  if ( toCreateFreshId.length ) {
    await actor.createEmbeddedDocuments("Item", toCreateFreshId);
  }
}
