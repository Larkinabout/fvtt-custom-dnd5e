import { CONSTANTS } from "./constants.js";
import { getSetting, registerSetting } from "./utils.js";

const constants = CONSTANTS.CHAT_COMMANDS;

/**
 * Shorthand aliases for the D&D 5e system's chat commands.
 */
const SHORTHANDS = {
  a: "attack",
  c: "check",
  con: "concentration",
  d: "damage",
  h: "heal",
  k: "skill",
  s: "save",
  t: "tool"
};

/**
 * Pattern matching a shorthand alias with optional configuration.
 */
const ALIAS_REGEX = new RegExp(`^/(?<alias>${Object.keys(SHORTHANDS).join("|")})(?<config>\\s.*)?$`, "i");

/* -------------------------------------------- */

/**
 * Register settings and hooks.
 */
export function register() {
  registerSettings();
  registerHooks();
}

/* -------------------------------------------- */

/**
 * Register settings.
 */
export function registerSettings() {
  registerSetting(
    constants.SETTING.KEY,
    {
      name: game.i18n.localize(constants.SETTING.NAME),
      hint: game.i18n.localize(constants.SETTING.HINT),
      scope: "world",
      config: false,
      requiresReload: true,
      type: Boolean,
      default: false
    }
  );
}

/* -------------------------------------------- */

/**
 * Register hooks.
 */
export function registerHooks() {
  if ( !getSetting(constants.SETTING.KEY) ) return;

  Hooks.on("chatMessage", (chatLog, message, options) => {
    const command = message.replace(/^<p>|<\/p>$/gi, "").trim();
    const match = command.match(ALIAS_REGEX);
    if ( !match ) return;

    const type = SHORTHANDS[match.groups.alias.toLowerCase()];
    ui.chat.processMessage(`/${type}${match.groups.config ?? ""}`);
    return false;
  });
}
