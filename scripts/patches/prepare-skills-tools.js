import { MODULE, CONSTANTS } from "../constants.js";
import { getSetting } from "../utils.js";

/**
 * Patch _prepareSkillsTools to filter out skills not in CONFIG.DND5E.skills.
 */
export function patchPrepareSkillsTools() {
  if ( !getSetting(CONSTANTS.SKILLS.SETTING.ENABLE.KEY) ) return;
  libWrapper.register(MODULE.ID, "dnd5e.applications.actor.BaseActorSheet.prototype._prepareSkillsTools", prepareSkillsToolsPatch, "WRAPPER");
}

/**
 * Filter context to exclude skills not in CONFIG.DND5E.skills.
 * @param {Function} wrapped The wrapped function
 * @param {ApplicationRenderContext} context Context being prepared.
 * @param {string} property The property key ("skills" or "tools").
 * @returns {object[]}
 */
function prepareSkillsToolsPatch(wrapped, context, property) {
  if ( property === "skills" ) {
    const configSkills = CONFIG.DND5E[property];
    const filteredContext = {
      ...context,
      system: { ...context.system, [property]: Object.fromEntries(
        Object.entries(context.system[property] ?? {}).filter(([key]) => key in configSkills)
      ) },
      source: { ...context.source, [property]: Object.fromEntries(
        Object.entries(context.source?.[property] ?? {}).filter(([key]) => key in configSkills)
      ) }
    };
    return wrapped(filteredContext, property);
  }
  return wrapped(context, property);
}
