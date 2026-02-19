import { MODULE, CONSTANTS } from "../constants.js";
import { getSetting } from "../utils.js";

/**
 * Patch _prepareMovementAttribution to append jump distances for characters.
 */
export function patchPrepareMovementAttribution() {
  if ( !getSetting(CONSTANTS.ACTOR_SHEET.SETTING.SHOW_JUMP_DISTANCE.KEY) ) return;

  libWrapper.register(
    MODULE.ID,
    "CONFIG.Actor.documentClass.prototype._prepareMovementAttribution",
    prepareMovementAttributionPatch,
    "WRAPPER"
  );
}

/* -------------------------------------------- */

/**
 * Wrapper patch for _prepareMovementAttribution that appends jump distances.
 * @param {Function} wrapped The original function
 * @returns {string} The HTML string
 */
function prepareMovementAttributionPatch(wrapped) {
  let html = wrapped();

  if ( this.type !== "character" ) return html;

  const str = this.system.abilities?.str;
  if ( !str ) return html;

  const { movement } = this.system.attributes;
  const units = movement.units || dnd5e.utils.defaultUnits("length");
  const unit = CONFIG.DND5E.movementUnits[units]?.formattingUnit;

  const formatValue = value => {
    const rounded = Math.floor(value);
    if ( unit ) {
      return `<span class="value">${dnd5e.utils.formatLength(rounded, unit, { parts: true })}</span>`;
    }
    return `<span class="value">${rounded} <span class="units">${units}</span></span>`;
  };

  const longJump = str.value;
  const longJumpStanding = Math.floor(str.value / 2);
  const highJump = Math.max(0, 3 + str.mod);
  const highJumpStanding = Math.floor(highJump / 2);

  html += "<hr class=\"custom-dnd5e-jump-separator\">";
  html += `
    <div class="row">
      <i class="fas fa-arrow-right-from-line"></i>
      ${formatValue(longJump)}
      <span class="label">${game.i18n.localize("CUSTOM_DND5E.longJump")}</span>
    </div>
    <div class="row custom-dnd5e-secondary">
      ${formatValue(longJumpStanding)}
      <span class="label">${game.i18n.localize("CUSTOM_DND5E.standing")}</span>
    </div>
    <div class="row">
      <i class="fas fa-arrow-up-from-line"></i>
      ${formatValue(highJump)}
      <span class="label">${game.i18n.localize("CUSTOM_DND5E.highJump")}</span>
    </div>
    <div class="row custom-dnd5e-secondary">
      ${formatValue(highJumpStanding)}
      <span class="label">${game.i18n.localize("CUSTOM_DND5E.standing")}</span>
    </div>
  `;

  return html;
}
