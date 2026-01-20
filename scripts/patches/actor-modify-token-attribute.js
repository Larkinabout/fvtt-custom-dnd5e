import { MODULE } from "../constants.js";

/**
 * Patch the Actor5e.modifyTokenAttribute method.
 */
export function patchModifyTokenAttribute() {
  libWrapper.register(MODULE.ID, "dnd5e.documents.Actor5e.prototype.modifyTokenAttribute", modifyTokenAttributePatch, "OVERRIDE");
}

/* -------------------------------------------- */

/**
 * Modify a token attribute, such as hit points or item uses.
 * @param {string} attribute The attribute path to modify.
 * @param {number} value The value to set or adjust by.
 * @param {boolean} isDelta Whether the value is a delta (true) or an absolute value (false).
 * @param {boolean} isBar Whether the attribute is displayed as a bar on the token.
 * @returns {Promise} A promise that resolves once the modification is complete.
 */
function modifyTokenAttributePatch(attribute, value, isDelta, isBar) {
  if ( attribute === "attributes.hp" ) {
    const hp = this.system.attributes.hp;
    const delta = isDelta ? (-1 * value) : (hp.value + hp.temp) - value;
    return this.applyDamage(delta, { isDelta });
  } else if ( attribute.startsWith(".") ) {
    const item = fromUuidSync(attribute, { relative: this });
    let newValue = item?.system.uses?.value ?? 0;
    if ( isDelta ) newValue += value;
    else newValue = value;
    return item?.update({ "system.uses.spent": item.system.uses.max - newValue });
  }
  return Object.getPrototypeOf(dnd5e.documents.Actor5e).prototype.modifyTokenAttribute.apply(this, [attribute, value, isDelta, isBar]);
  // return super.modifyTokenAttribute(attribute, value, isDelta, isBar);
}
