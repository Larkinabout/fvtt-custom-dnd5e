import { MODULE } from "./constants.js";
import { onApplyDamageQuery, onResolveSaveQuery } from "./activities/activity-multiattack.js";
import { onMoveTokenQuery } from "./activities/move-canvas-mode.js";
import { onSwapTokensQuery } from "./activities/activity-swap.js";

/**
 * Query handlers by query name.
 */
const QUERIES = {
  applyMultiattackDamage: onApplyDamageQuery,
  moveToken: onMoveTokenQuery,
  resolveMultiattackSave: onResolveSaveQuery,
  swapTokens: onSwapTokensQuery
};

/* -------------------------------------------- */

/**
 * Register queries.
 */
export function registerQueries() {
  for ( const [name, handler] of Object.entries(QUERIES) ) {
    CONFIG.queries[`${MODULE.ID}.${name}`] = handler;
  }
}
