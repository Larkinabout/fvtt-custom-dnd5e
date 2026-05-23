/** Drop-item range highlight. */

import * as Highlight from "../canvas/highlight.js";

const LAYER_NAME = "custom-dnd5e-drop-items-drop";

let active = false;

/* -------------------------------------------- */

/**
 * Show the in-range drop area for a token. Replaces any active highlight.
 * @param {object} args
 * @param {Token} args.sourceToken
 * @param {number} args.rangeUnits Drop range in scene units
 */
export function activate({ sourceToken, rangeUnits } = {}) {
  if ( active ) deactivate();
  if ( !canvas?.ready || !sourceToken || !(rangeUnits > 0) ) return;
  Highlight.addLayer(LAYER_NAME);
  Highlight.highlightRange({ name: LAYER_NAME, sourceToken, rangeUnits });
  active = true;
}

/* -------------------------------------------- */

/** Tear down the highlight layer. */
export function deactivate() {
  if ( !active ) return;
  active = false;
  Highlight.removeLayer(LAYER_NAME);
}
