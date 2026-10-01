import { MODULE } from "./constants.js";
import { onApplyDamageQuery, onResolveSaveQuery } from "./activities/activity-multiattack.js";
import { onMoveTokenQuery } from "./activities/move-canvas-mode.js";
import { onSwapTokensQuery } from "./activities/activity-swap.js";
import { onAddToContainerQuery, onDropItemQuery, onTakeItemQuery } from "./item-interactions/drop-items.js";
import { onChooseActionQuery, onRequestActionQuery } from "./gameplay/speed-factor-initiative.js";
import { onGiveItemQuery } from "./item-interactions/give-items.js";
import { onRequestRollQuery } from "./workflows/workflows.js";

/**
 * Query handlers by query name.
 */
const QUERIES = {
  addToContainer: onAddToContainerQuery,
  applyMultiattackDamage: onApplyDamageQuery,
  chooseSpeedFactorAction: onChooseActionQuery,
  dropItem: onDropItemQuery,
  giveItem: onGiveItemQuery,
  moveToken: onMoveTokenQuery,
  requestRoll: onRequestRollQuery,
  requestSpeedFactorAction: onRequestActionQuery,
  resolveMultiattackSave: onResolveSaveQuery,
  swapTokens: onSwapTokensQuery,
  takeItem: onTakeItemQuery
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
