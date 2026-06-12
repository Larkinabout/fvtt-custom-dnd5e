import { MODULE } from "../constants.js";
import { getFlag, getSetting } from "../utils.js";
import { configs } from "../configurations/registry.js";

/**
 * Patch the _prepareSenses function to include custom senses.
 */
export function patchPrepareSenses() {
  if ( !getSetting(configs.senses.SETTING.ENABLE.KEY) ) return;
  libWrapper.register(MODULE.ID, "dnd5e.applications.actor.BaseActorSheet.prototype._prepareSenses", prepareSensesPatch, "WRAPPER");
}

/**
 * Prepare actor senses for display.
 * @param {Function} wrapped
 * @param {ApplicationRenderContext} context
 * @returns {object[]}
 * @protected
 */
function prepareSensesPatch(wrapped, context) {
  const systemSenses = wrapped(context);

  const actor = context.actor;
  const senses = getSetting(configs.senses.SETTING.CONFIG.KEY);
  const customSenses = [];

  Object.entries(senses)
    .filter(([_, value]) => value.system === false)
    .forEach(([key, value]) => {
      const flag = getFlag(actor, `senses.${key}`);
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
