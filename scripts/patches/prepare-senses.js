import { MODULE, CONSTANTS } from "../constants.js";
import { getFlag, getSetting } from "../utils.js";

/**
 * Patch the _prepareSenses function to include custom senses.
 */
export function patchPrepareSenses() {
  if ( !getSetting(CONSTANTS.SENSES.SETTING.ENABLE.KEY) ) return;
  libWrapper.register(MODULE.ID, "dnd5e.applications.actor.BaseActorSheet.prototype._prepareSenses", prepareSensesPatch, "WRAPPER");
}

/**
 * Prepare actor senses for display.
 * @param {ApplicationRenderContext} context  Context being prepared.
 * @returns {object[]}
 * @protected
 */
function prepareSensesPatch(wrapped, context) {
  const systemSenses = wrapped(context);

  const actor = context.actor;
  const senses = getSetting(CONSTANTS.SENSES.SETTING.CONFIG.KEY);
  const customSenses = [];

  Object.entries(senses)
    .filter(([_, value]) => value.system === false)
    .forEach(([key, value]) => {
      const flag = getFlag(actor, key);
      if ( flag ) customSenses.push({ label: value.label, value: flag });
    });

  const mergedSenses = [...systemSenses, ...customSenses];

  mergedSenses.sort((a, b) => {
    const aLabel = a.label.toLowerCase();
    const bLabel = b.label.toLowerCase();
    return aLabel.localeCompare(bLabel);
  });

  return mergedSenses;
}
