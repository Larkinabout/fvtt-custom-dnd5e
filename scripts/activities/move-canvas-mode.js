import { MODULE } from "../constants.js";
import { Logger } from "../utils.js";
import * as Highlight from "../canvas/highlight.js";

const HIGHLIGHT_LAYER_NAME = "custom-dnd5e-move";

/**
 * Canvas interaction mode for forced movement.
 * Highlights valid positions and handles click-to-move.
 */
export class MoveCanvasMode {
  /**
   * Create a MoveCanvasMode instance which highlights valid forced-movement positions
   * and handles user input to select a destination for forced movement.
   * @param {object} options
   * @param {Token} options.sourceToken Source token performing the move.
   * @param {Token} options.targetToken Target token being moved.
   * @param {string} options.direction "push" | "pull" | "any"
   * @param {number} options.distanceMin Minimum movement distance in game units.
   * @param {number} options.distanceMax Maximum movement distance in game units.
   */
  constructor({ sourceToken, targetToken, direction, distanceMin, distanceMax }) {
    this.sourceToken = sourceToken;
    this.targetToken = targetToken;
    this.direction = direction;
    this.distanceMin = distanceMin;
    this.distanceMax = distanceMax;
    this.validPositions = [];
    this._resolve = null;
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onContextMenu = this._onContextMenu.bind(this);
  }

  /* -------------------------------------------- */
  /*  STATIC API                                  */
  /* -------------------------------------------- */

  /**
   * Enter the move-selection interaction and resolve once the user
   * picks a destination or cancels.
   * @param {object} options
   * @param {Token} options.sourceToken
   * @param {Token} options.targetToken
   * @param {string} options.direction Movement direction.
   * @param {number} options.distanceMin
   * @param {number} options.distanceMax
   * @returns {Promise<boolean>} Whether the move was completed.
   */
  static async activate(options) {
    const mode = new MoveCanvasMode(options);
    return mode._start();
  }

  /* -------------------------------------------- */

  /**
   * Update the token to a new position with movement history stripped, so
   * forced movement isn't counted against the token's combat-turn movement.
   * Called directly or via socket by the GM.
   * @param {TokenDocument} tokenDoc Token document to move
   * @param {number} x x coordinate (top-left)
   * @param {number} y y coordinate (top-left)
   * @returns {Promise<void>}
   */
  static async _moveTokenDocument(tokenDoc, x, y) {
    // Strip movement history from the update so forced movement is not tracked in combat.
    const hookId = Hooks.on("preUpdateToken", (doc, changed) => {
      if ( doc.id !== tokenDoc.id ) return;
      delete changed._movementHistory;
    });
    try {
      await tokenDoc.update({ x, y });
    } catch (err) {
      Logger.error(err.message, true);
    } finally {
      Hooks.off("preUpdateToken", hookId);
    }
  }

  /* -------------------------------------------- */
  /*  LIFECYCLE                                   */
  /* -------------------------------------------- */

  /**
   * Compute valid positions, draw the highlight, attach input listeners,
   * and return a promise that resolves when the user picks a destination
   * or cancels.
   * @returns {Promise<boolean>} Whether the move was completed
   */
  async _start() {
    return new Promise(resolve => {
      this._resolve = resolve;
      const isGridless = canvas.grid.type === CONST.GRID_TYPES.GRIDLESS;

      if ( !isGridless ) {
        this.validPositions = this._computeValidPositions();
        if ( !this.validPositions.length ) {
          ui.notifications.warn(game.i18n.localize("CUSTOM_DND5E.activities.move.noValidPositions"));
          resolve(false);
          return;
        }
      }

      this._drawHighlights();
      this._attachListeners();
      ui.notifications.info(game.i18n.localize("CUSTOM_DND5E.activities.move.selectPosition"));
    });
  }

  /* -------------------------------------------- */

  /**
   * Clean up highlights and listeners.
   */
  _cleanup() {
    canvas.interface.grid.destroyHighlightLayer(HIGHLIGHT_LAYER_NAME);
    this._detachListeners();
  }

  /* -------------------------------------------- */

  /**
   * Cancel the canvas mode and resolve as incomplete.
   */
  _cancel() {
    this._cleanup();
    this._resolve(false);
  }

  /* -------------------------------------------- */

  /**
   * Complete the movement and resolve as successful.
   * @param {number} x x coordinate (top-left)
   * @param {number} y y coordinate (top-left)
   */
  _completeMovement(x, y) {
    this._cleanup();
    this._executeMovement(x, y);
    this._resolve(true);
  }

  /* -------------------------------------------- */

  /**
   * Convert a center point to the target token's top-left position.
   * @param {{ x: number, y: number }} center Center point
   * @returns {{ x: number, y: number }} Top-left point
   */
  _centerToTopLeft(center) {
    return {
      x: center.x - (this.targetToken.w / 2),
      y: center.y - (this.targetToken.h / 2)
    };
  }

  /* -------------------------------------------- */
  /*  Position Computation                        */
  /* -------------------------------------------- */

  /**
   * Compute valid grid positions for the target token to move to.
   * @returns {object[]} Array of { x, y } objects (top-left coordinates)
   */
  _computeValidPositions() {
    const positions = [];
    const distPerGrid = canvas.scene.dimensions.distance;
    const maxSteps = Math.ceil(this.distanceMax / distPerGrid);

    const targetCenter = this._getSnappedCenter(this.targetToken);
    const sourceCenter = this._getSnappedCenter(this.sourceToken);
    const sourceDistToTarget = this._measureDistance(sourceCenter, targetCenter);

    const candidateOffsets = this._getCandidateOffsets(targetCenter, maxSteps);

    for ( const candidateOffset of candidateOffsets ) {
      const candidateTopLeft = canvas.grid.getTopLeftPoint(candidateOffset);
      const candidateCenter = canvas.grid.getCenterPoint(candidateOffset);

      const distance = this._measureDistance(targetCenter, candidateCenter);
      if ( distance < this.distanceMin || distance > this.distanceMax ) continue;
      if ( !this._checkDirection(sourceCenter, targetCenter, candidateCenter, sourceDistToTarget) ) continue;
      if ( this._checkWallCollision(targetCenter, candidateCenter) ) continue;

      positions.push({ x: candidateTopLeft.x, y: candidateTopLeft.y });
    }

    return positions;
  }

  /* -------------------------------------------- */

  /**
   * Enumerate every grid cell within `maxSteps` of the target. Hex grids
   * use cube coordinates to enumerate the hex neighbourhood correctly;
   * square grids use the simple di/dj bounding box.
   * @param {{ x: number, y: number }} targetCenter Target token center
   * @param {number} maxSteps Maximum grid steps from the target
   * @returns {object[]} Array of { i, j } offset objects
   */
  _getCandidateOffsets(targetCenter, maxSteps) {
    const offsets = [];
    const targetGridPos = canvas.grid.getOffset(targetCenter);
    const isHex = canvas.grid.isHexagonal;

    if ( isHex ) {
      const targetCube = canvas.grid.offsetToCube(targetGridPos);
      for ( let dq = -maxSteps; dq <= maxSteps; dq++ ) {
        const rMin = Math.max(-maxSteps, -dq - maxSteps);
        const rMax = Math.min(maxSteps, -dq + maxSteps);
        for ( let dr = rMin; dr <= rMax; dr++ ) {
          if ( dq === 0 && dr === 0 ) continue;
          const ds = -dq - dr;
          const cube = { q: targetCube.q + dq, r: targetCube.r + dr, s: targetCube.s + ds };
          offsets.push(canvas.grid.cubeToOffset(cube));
        }
      }
    } else {
      for ( let di = -maxSteps; di <= maxSteps; di++ ) {
        for ( let dj = -maxSteps; dj <= maxSteps; dj++ ) {
          if ( di === 0 && dj === 0 ) continue;
          offsets.push({ i: targetGridPos.i + di, j: targetGridPos.j + dj });
        }
      }
    }

    return offsets;
  }

  /* -------------------------------------------- */

  /**
   * Get the center point of a token snapped to its grid cell.
   * @param {Token} token Token
   * @returns {{ x: number, y: number }}
   */
  _getSnappedCenter(token) {
    const offset = canvas.grid.getOffset(token.center);
    return canvas.grid.getCenterPoint(offset);
  }

  /* -------------------------------------------- */

  /**
   * Measure the distance between two points in game units.
   * @param {{ x: number, y: number }} a First point
   * @param {{ x: number, y: number }} b Second point
   * @returns {number} Distance in game units
   */
  _measureDistance(a, b) {
    const result = canvas.grid.measurePath([a, b]);
    return result.distance;
  }

  /* -------------------------------------------- */

  /**
   * Check whether a candidate position satisfies the direction constraint.
   * @param {{ x: number, y: number }} sourceCenter Source token center
   * @param {{ x: number, y: number }} targetCenter Target token center
   * @param {{ x: number, y: number }} candidateCenter Candidate position center
   * @param {number} sourceDistToTarget Distance from source to target
   * @returns {boolean} Whether the direction constraint is met
   */
  _checkDirection(sourceCenter, targetCenter, candidateCenter, sourceDistToTarget) {
    if ( this.direction === "any" ) return true;

    const sourceDistToCandidate = this._measureDistance(sourceCenter, candidateCenter);

    if ( this.direction === "push" ) {
      return sourceDistToCandidate > sourceDistToTarget;
    }
    if ( this.direction === "pull" ) {
      return sourceDistToCandidate < sourceDistToTarget;
    }
    if ( this.direction === "pushOrPull" ) {
      return sourceDistToCandidate !== sourceDistToTarget;
    }
    return true;
  }

  /* -------------------------------------------- */

  /**
   * Whether the movement polygon backend reports a wall between the two
   * points. Uses `mode: "any"` so a single intersecting wall is enough.
   * @param {{ x: number, y: number }} from Starting point
   * @param {{ x: number, y: number }} to Ending point
   * @returns {boolean} Whether a wall blocks the path
   */
  _checkWallCollision(from, to) {
    return CONFIG.Canvas.polygonBackends.move.testCollision(from, to, {
      type: "move",
      mode: "any"
    });
  }

  /* -------------------------------------------- */
  /*  Highlighting                                */
  /* -------------------------------------------- */

  /**
   * Render the valid-destination highlight: per-cell highlights on
   * gridded scenes, annulus/line on gridless scenes.
   */
  _drawHighlights() {
    Highlight.addLayer(HIGHLIGHT_LAYER_NAME);
    if ( canvas.grid.type === CONST.GRID_TYPES.GRIDLESS ) this._drawGridlessHighlight();
    else for ( const pos of this.validPositions ) Highlight.highlightCell(HIGHLIGHT_LAYER_NAME, pos);
  }

  /* -------------------------------------------- */

  /**
   * Quarter-cell tolerance so thin rings stay clickable on gridless scenes.
   * @returns {number}
   */
  _getGridlessTolerance() {
    return canvas.scene.dimensions.distance / 4;
  }

  /* -------------------------------------------- */

  /**
   * Draw the gridless highlight: an annulus for "any" direction, otherwise
   * directional push/pull line(s), all clipped to the wall-reachable polygon
   * around the target.
   */
  _drawGridlessHighlight() {
    const targetCenter = this.targetToken.center;
    const sourceCenter = this.sourceToken.center;
    const pixelsPerUnit = canvas.grid.size / canvas.scene.dimensions.distance;
    const tolerance = this._getGridlessTolerance();
    const outerRadius = (this.distanceMax + tolerance) * pixelsPerUnit;
    const innerRadius = Math.max(0, (this.distanceMin - tolerance)) * pixelsPerUnit;
    const mask = CONFIG.Canvas.polygonBackends.move.create(targetCenter, {
      type: "move", radius: outerRadius + canvas.grid.size
    });

    if ( this.direction === "any" ) {
      Highlight.highlightAnnulus(HIGHLIGHT_LAYER_NAME, targetCenter, outerRadius, { innerRadius, mask });
      return;
    }

    const halfWidth = tolerance * pixelsPerUnit;
    const lineOpts = { innerDist: innerRadius, outerDist: outerRadius, halfWidth, mask };
    // `reverse: true` flips the line direction relative to (origin → toward).
    // toward = sourceCenter, so reverse=true points away from the source (push).
    if ( this.direction === "push" || this.direction === "pushOrPull" ) {
      Highlight.highlightLine(HIGHLIGHT_LAYER_NAME, targetCenter, sourceCenter, { ...lineOpts, reverse: true });
    }
    if ( this.direction === "pull" || this.direction === "pushOrPull" ) {
      Highlight.highlightLine(HIGHLIGHT_LAYER_NAME, targetCenter, sourceCenter, lineOpts);
    }
  }

  /* -------------------------------------------- */
  /*  Event Listeners                             */
  /* -------------------------------------------- */

  /**
   * Wire up the canvas pointer-down (for picking) and document-level
   * pointermove/keydown/contextmenu (for pan, Escape, right-click cancel).
   */
  _attachListeners() {
    canvas.stage.on("pointerdown", this._onPointerDown);
    document.addEventListener("pointermove", this._onPointerMove);
    document.addEventListener("keydown", this._onKeyDown);
    document.addEventListener("contextmenu", this._onContextMenu);
  }

  /* -------------------------------------------- */

  /**
   * Mirror of {@link _attachListeners} — remove every listener it added.
   */
  _detachListeners() {
    canvas.stage.off("pointerdown", this._onPointerDown);
    document.removeEventListener("pointermove", this._onPointerMove);
    document.removeEventListener("keydown", this._onKeyDown);
    document.removeEventListener("contextmenu", this._onContextMenu);
  }

  /* -------------------------------------------- */

  /**
   * On a left-click, dispatch to the gridded or gridless click handler.
   * Other mouse buttons are ignored (right-click is handled separately).
   * @param {PIXI.FederatedPointerEvent} event The pointer event
   */
  _onPointerDown(event) {
    if ( event.button !== 0 ) return;

    const pos = event.getLocalPosition(canvas.stage);
    const isGridless = canvas.grid.type === CONST.GRID_TYPES.GRIDLESS;

    if ( isGridless ) {
      this._handleGridlessClick(pos);
    } else {
      this._handleGridClick(pos);
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle keydown events (Escape to cancel).
   * @param {KeyboardEvent} event The keyboard event
   */
  _onKeyDown(event) {
    if ( event.key === "Escape" ) this._cancel();
  }

  /* -------------------------------------------- */

  /**
   * Handle pointer move for edge-of-screen canvas panning.
   * Delegates to Canvas's built-in edge pan handler.
   * @param {PointerEvent} event The pointer event
   */
  _onPointerMove(event) {
    canvas._onDragCanvasPan(event);
  }

  /* -------------------------------------------- */

  /**
   * Handle right-click to cancel.
   * @param {MouseEvent} event The context menu event
   */
  _onContextMenu(event) {
    event.preventDefault();
    this._cancel();
  }

  /* -------------------------------------------- */
  /*  Click Handling                              */
  /* -------------------------------------------- */

  /**
   * Snap the click to the clicked cell's top-left and complete the move
   * if that cell is in the precomputed valid-positions set.
   * @param {{ x: number, y: number }} pos The click position in canvas coordinates
   */
  _handleGridClick(pos) {
    const snapped = canvas.grid.getTopLeftPoint(canvas.grid.getOffset(pos));
    const match = this.validPositions.find(p => p.x === snapped.x && p.y === snapped.y);
    if ( match ) this._completeMovement(match.x, match.y);
  }

  /* -------------------------------------------- */

  /**
   * Handle a click on a gridless canvas.
   * For directional modes, projects the click onto the push/pull line.
   * For "any" direction, validates within the annulus.
   * @param {{ x: number, y: number }} pos The click position in canvas coordinates
   */
  _handleGridlessClick(pos) {
    if ( this.direction === "any" ) {
      this._handleGridlessAnyClick(pos);
    } else {
      this._handleGridlessDirectionalClick(pos);
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle a gridless click for "any" direction (annulus validation).
   * @param {{ x: number, y: number }} pos The click position in canvas coordinates
   */
  _handleGridlessAnyClick(pos) {
    const targetCenter = this.targetToken.center;
    const pixelsPerUnit = canvas.grid.size / canvas.scene.dimensions.distance;
    const tolerance = this._getGridlessTolerance();

    const distance = this._measureDistance(targetCenter, pos);
    if ( distance < (this.distanceMin - tolerance) || distance > (this.distanceMax + tolerance) ) return;

    // Clamp to min/max if within tolerance but outside actual range
    let clampedPos = pos;
    if ( distance < this.distanceMin || distance > this.distanceMax ) {
      const clampDist = Math.max(this.distanceMin, Math.min(this.distanceMax, distance));
      const dx = pos.x - targetCenter.x;
      const dy = pos.y - targetCenter.y;
      const pixelDist = Math.sqrt((dx * dx) + (dy * dy));
      if ( pixelDist > 0 ) {
        const clampedPixelDist = clampDist * pixelsPerUnit;
        const scale = clampedPixelDist / pixelDist;
        clampedPos = {
          x: targetCenter.x + (dx * scale),
          y: targetCenter.y + (dy * scale)
        };
      }
    }

    if ( this._checkWallCollision(targetCenter, clampedPos) ) return;

    const topLeft = this._centerToTopLeft(clampedPos);
    this._completeMovement(topLeft.x, topLeft.y);
  }

  /* -------------------------------------------- */

  /**
   * Handle a gridless click for directional modes (line projection).
   * Projects the click onto the push/pull line from the target through/toward the source.
   * @param {{ x: number, y: number }} pos The click position in canvas coordinates
   */
  _handleGridlessDirectionalClick(pos) {
    const targetCenter = this.targetToken.center;
    const sourceCenter = this.sourceToken.center;
    const pixelsPerUnit = canvas.grid.size / canvas.scene.dimensions.distance;
    const tolerance = this._getGridlessTolerance();
    const tolerancePx = tolerance * pixelsPerUnit;

    const dx = sourceCenter.x - targetCenter.x;
    const dy = sourceCenter.y - targetCenter.y;
    const sourceDist = Math.sqrt((dx * dx) + (dy * dy));
    if ( sourceDist <= 0 ) return;

    // Build direction(s) to test
    const directions = [];
    if ( this.direction === "push" || this.direction === "pushOrPull" ) {
      directions.push({ ux: -(dx / sourceDist), uy: -(dy / sourceDist) });
    }
    if ( this.direction === "pull" || this.direction === "pushOrPull" ) {
      directions.push({ ux: dx / sourceDist, uy: dy / sourceDist });
    }

    const clickDx = pos.x - targetCenter.x;
    const clickDy = pos.y - targetCenter.y;

    for ( const dir of directions ) {
      // Project click onto the direction line
      const projDist = (clickDx * dir.ux) + (clickDy * dir.uy);
      const perpDist = Math.abs((clickDx * (-dir.uy)) + (clickDy * dir.ux));

      // Reject if too far from the line or on the wrong side
      if ( perpDist > tolerancePx ) continue;
      if ( projDist < 0 ) continue;

      const projDistUnits = projDist / pixelsPerUnit;
      if ( projDistUnits < (this.distanceMin - tolerance) || projDistUnits > (this.distanceMax + tolerance) ) continue;

      // Clamp to min/max along the line
      const clampedDist = Math.max(this.distanceMin, Math.min(this.distanceMax, projDistUnits));
      const clampedPx = clampedDist * pixelsPerUnit;
      const clampedPos = {
        x: targetCenter.x + (dir.ux * clampedPx),
        y: targetCenter.y + (dir.uy * clampedPx)
      };

      if ( this._checkWallCollision(targetCenter, clampedPos) ) continue;

      const topLeft = this._centerToTopLeft(clampedPos);
      this._completeMovement(topLeft.x, topLeft.y);
      return;
    }
  }

  /* -------------------------------------------- */
  /*  Movement Execution                          */
  /* -------------------------------------------- */

  /**
   * Move the target token. Apply the update directly if the user has
   * permission; otherwise relay to an active GM via socket.
   * @param {number} x The x coordinate (top-left)
   * @param {number} y The y coordinate (top-left)
   */
  _executeMovement(x, y) {
    const tokenDoc = this.targetToken.document;

    if ( tokenDoc.canUserModify(game.user, "update") ) {
      MoveCanvasMode._moveTokenDocument(tokenDoc, x, y);
    } else {
      game.socket.emit(`module.${MODULE.ID}`, {
        action: "moveToken",
        options: {
          sceneId: canvas.scene.id,
          tokenId: tokenDoc.id,
          x,
          y
        }
      });
    }
  }
}
