import { MODULE } from "../constants.js";
import { Logger } from "../utils.js";
import * as Highlight from "../canvas/highlight.js";
import { addCursorLabelIcon, setCursorLabelIcon, setCursorLabelPosition } from "../interface/cursor-label.js";
import { applyBypassedMoves } from "./activities.js";

const HIGHLIGHT_LAYER_NAME = "custom-dnd5e-move";
const PATH_HIGHLIGHT_LAYER_NAME = "custom-dnd5e-move-path";
const MOVE_ICON_ID = "custom-dnd5e-cursor-label-move";
const MOVE_ICON_HTML = '<i class="fa-solid fa-arrows-up-down-left-right"></i>';

/**
 * Canvas interaction mode for forced movement.
 * Highlights valid positions and handles click-to-move.
 */
export class MoveCanvasMode {
  /**
   * Create a MoveCanvasMode instance which highlights valid forced-movement positions
   * and handles user input to select a destination for forced movement.
   * @param {object} options
   * @param {Token} options.sourceToken
   * @param {Token} options.targetToken
   * @param {"push"|"pull"|"any"} options.direction
   * @param {number} options.distanceMin Minimum movement distance in game units
   * @param {number} options.distanceMax Maximum movement distance in game units
   * @param {boolean} [options.isTeleport=false] Whether to teleport (skip animation)
   */
  constructor({ sourceToken, targetToken, direction, distanceMin, distanceMax, isTeleport = false }) {
    this.sourceToken = sourceToken;
    this.targetToken = targetToken;
    this.direction = direction;
    this.distanceMin = distanceMin;
    this.distanceMax = distanceMax;
    this.isTeleport = isTeleport;
    this.validPositions = [];
    this._resolve = null;
    this._previewClone = null;
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
   * @param {boolean} [options.isTeleport]
   * @returns {Promise<boolean>} Whether the move was completed.
   */
  static async activate(options) {
    const mode = new MoveCanvasMode(options);
    return mode._start();
  }

  /* -------------------------------------------- */

  /**
   * Move a token to a new position, bypassing Foundry's movement
   * pipeline. Uses `isPaste: true` to avoid movement constraints.
   * Called directly or via socket by the GM.
   * @param {TokenDocument} tokenDoc Token document to move
   * @param {number} x x coordinate (top-left)
   * @param {number} y y coordinate (top-left)
   * @param {object} [options]
   * @param {boolean} [options.isTeleport=false] Whether to teleport (skip animation)
   * @returns {Promise<void>}
   */
  static async _moveTokenDocument(tokenDoc, x, y, { isTeleport = false } = {}) {
    try {
      await applyBypassedMoves(tokenDoc.parent, [{ tokenDoc, x, y }],
        { stripHistory: true, animate: !isTeleport });
    } catch ( err ) {
      Logger.error(err.message, true, { prefix: false });
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
   * Clean up highlights, listeners, and the hover indicator.
   */
  _cleanup() {
    canvas.interface.grid.destroyHighlightLayer(HIGHLIGHT_LAYER_NAME);
    canvas.interface.grid.destroyHighlightLayer(PATH_HIGHLIGHT_LAYER_NAME);
    this._detachListeners();
    this._clearHoverIndicator();
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

    // The target token cannot be moved onto a grid space occupied by the source token
    const sourceOccupied = new Set(
      this.sourceToken.document.getOccupiedGridSpaceOffsets().map(o => `${o.i},${o.j}`)
    );

    for ( const candidateOffset of candidateOffsets ) {
      if ( sourceOccupied.has(`${candidateOffset.i},${candidateOffset.j}`) ) continue;

      const candidateTopLeft = canvas.grid.getTopLeftPoint(candidateOffset);
      const candidateCenter = canvas.grid.getCenterPoint(candidateOffset);

      const distance = this._measureDistance(targetCenter, candidateCenter);
      if ( distance < this.distanceMin || distance > this.distanceMax ) continue;
      if ( !this._checkDirection(sourceCenter, targetCenter, candidateCenter, sourceDistToTarget) ) continue;
      if ( !this.isTeleport && this._checkWallCollision(targetCenter, candidateCenter) ) continue;

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

    if ( this.direction === "pushOrPull" ) {
      return this._checkDirectionalMove(
        "push", sourceCenter, targetCenter, candidateCenter, sourceDistToTarget, sourceDistToCandidate
      ) || this._checkDirectionalMove(
        "pull", sourceCenter, targetCenter, candidateCenter, sourceDistToTarget, sourceDistToCandidate
      );
    }
    return this._checkDirectionalMove(
      this.direction, sourceCenter, targetCenter, candidateCenter, sourceDistToTarget, sourceDistToCandidate
    );
  }

  /* -------------------------------------------- */

  /**
   * Check whether a candidate position is a valid destination.
   * @param {"push"|"pull"} direction
   * @param {{ x: number, y: number }} sourceCenter
   * @param {{ x: number, y: number }} targetCenter
   * @param {{ x: number, y: number }} candidateCenter
   * @param {number} sourceDistToTarget
   * @param {number} sourceDistToCandidate
   * @returns {boolean} Whether the candidate is a valid destination
   */
  _checkDirectionalMove(direction, sourceCenter, targetCenter, candidateCenter, sourceDistToTarget,
    sourceDistToCandidate) {
    if ( direction === "push" && (sourceDistToCandidate <= sourceDistToTarget) ) return false;
    if ( direction === "pull" && (sourceDistToCandidate >= sourceDistToTarget) ) return false;

    if ( (sourceCenter.x === targetCenter.x) && (sourceCenter.y === targetCenter.y) ) return true;

    if ( direction === "pull" ) {
      const alongLine = ((candidateCenter.x - sourceCenter.x) * (targetCenter.x - sourceCenter.x))
        + ((candidateCenter.y - sourceCenter.y) * (targetCenter.y - sourceCenter.y));
      if ( alongLine < 0 ) return false;
    }

    const Ray = foundry.canvas.geometry.Ray;
    let lineAngle = new Ray(sourceCenter, targetCenter).angle;
    if ( direction === "pull" ) lineAngle += Math.PI;
    const moveAngle = new Ray(targetCenter, candidateCenter).angle;
    const deviation = Math.abs(Math.normalizeRadians(moveAngle - lineAngle));
    const maxDeviation = canvas.grid.isHexagonal ? (Math.PI / 3) : (Math.PI / 4);
    return deviation <= (maxDeviation + 1e-6);
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
    else {
      for ( const pos of this.validPositions ) Highlight.highlightCell(HIGHLIGHT_LAYER_NAME, pos);
      Highlight.addLayer(PATH_HIGHLIGHT_LAYER_NAME);
    }
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
    const mask = this.isTeleport ? null : CONFIG.Canvas.polygonBackends.move.create(targetCenter, {
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
   * On a left-click, complete the movement if the clicked point resolves to
   * a valid destination. Other mouse buttons are ignored (right-click is
   * handled separately).
   * @param {PIXI.FederatedPointerEvent} event The pointer event
   */
  _onPointerDown(event) {
    if ( event.button !== 0 ) return;

    const pos = event.getLocalPosition(canvas.stage);
    const destination = this._getDestination(pos);
    if ( destination ) this._completeMovement(destination.x, destination.y);
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
   * Handle pointer move: edge-of-screen canvas panning (via Canvas's built-in
   * edge pan handler) and the valid-destination hover indicator.
   * @param {PointerEvent} event
   */
  _onPointerMove(event) {
    canvas._onDragCanvasPan(event);
    this._updateHoverIndicator(event);
  }

  /* -------------------------------------------- */

  /**
   * Show a cursor label and pointer cursor while hovering over a point
   * where a click would execute the movement.
   * @param {PointerEvent} event
   */
  _updateHoverIndicator(event) {
    let destination = null;
    if ( event.target === canvas.app?.view ) {
      const pos = canvas.canvasCoordinatesFromClient({ x: event.clientX, y: event.clientY });
      destination = this._getDestination(pos);
    }
    if ( destination ) {
      addCursorLabelIcon(MOVE_ICON_ID, MOVE_ICON_HTML);
      setCursorLabelPosition(event.clientX, event.clientY);
      this._drawHoverPath(destination);
    } else {
      this._clearHoverPath();
      this._clearHoverPreview();
    }
    setCursorLabelIcon(MOVE_ICON_ID, !!destination);
    this._setCanvasCursor(destination ? "pointer" : "");
  }

  /* -------------------------------------------- */

  /**
   * Show the path from the target token to the hovered destination.
   * @param {{ x: number, y: number }} destination Destination top-left point
   */
  _drawHoverPath(destination) {
    const ruler = canvas.controls?.ruler;
    if ( !ruler ) return;

    const isGridless = canvas.grid.type === CONST.GRID_TYPES.GRIDLESS;
    const from = isGridless ? this.targetToken.center : this._getSnappedCenter(this.targetToken);
    const to = {
      x: destination.x + (this.targetToken.w / 2),
      y: destination.y + (this.targetToken.h / 2)
    };
    const elevation = this.targetToken.document.elevation ?? 0;

    ruler.path = [{ x: from.x, y: from.y, elevation }, { x: to.x, y: to.y, elevation }];

    // Highlight the grid spaces the movement would pass through.
    if ( !isGridless ) {
      canvas.interface.grid.clearHighlightLayer(PATH_HIGHLIGHT_LAYER_NAME);
      const color = game.user.color;
      for ( const offset of canvas.grid.getDirectPath([from, to]) ) {
        Highlight.highlightCell(PATH_HIGHLIGHT_LAYER_NAME, offset, {
          fill: color, fillAlpha: 0.5, border: null
        });
      }
    }

    this._drawHoverPreview(destination);
  }

  /* -------------------------------------------- */

  /**
   * Show a faded preview clone of the target token at the hovered destination.
   * @param {{ x: number, y: number }} destination Destination top-left point
   */
  _drawHoverPreview(destination) {
    if ( !this._previewClone ) {
      const clone = this.targetToken.clone();
      clone.document.updateSource({ alpha: this.targetToken.document.alpha * 0.5 });
      clone.eventMode = "none";
      clone.visible = false;
      canvas.tokens.preview.addChild(clone);
      clone.draw().then(c => {
        if ( !c.destroyed ) c.visible = true;
      });
      this._previewClone = clone;
    }

    this._previewClone.document.x = destination.x;
    this._previewClone.document.y = destination.y;
    this._previewClone.renderFlags.set({ refreshPosition: true });
  }

  /* -------------------------------------------- */

  /**
   * Remove the hover preview clone.
   */
  _clearHoverPreview() {
    if ( !this._previewClone ) return;
    canvas.tokens.preview.removeChild(this._previewClone);
    this._previewClone.destroy({ children: true });
    this._previewClone = null;
  }

  /* -------------------------------------------- */

  /**
   * Clear the hover path from the ruler and the path highlight layer.
   */
  _clearHoverPath() {
    canvas.controls?.ruler?.reset();
    canvas.interface?.grid?.clearHighlightLayer?.(PATH_HIGHLIGHT_LAYER_NAME);
  }

  /* -------------------------------------------- */

  /**
   * Hide the hover cursor label, path line, and preview clone, and restore the
   * default canvas cursor.
   */
  _clearHoverIndicator() {
    setCursorLabelIcon(MOVE_ICON_ID, false);
    this._setCanvasCursor("");
    this._clearHoverPath();
    this._clearHoverPreview();
  }

  /* -------------------------------------------- */

  /**
   * Set the cursor on the canvas DOM element.
   * @param {string} value The CSS cursor value
   */
  _setCanvasCursor(value) {
    const view = canvas?.app?.view;
    if ( view ) view.style.cursor = value;
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
  /*  DESTINATION RESOLUTION                      */
  /* -------------------------------------------- */

  /**
   * Resolve a canvas point to the destination the target token would move to,
   * or null when the point is not a valid destination. Shared by the click
   * handler and the hover indicator.
   * @param {{ x: number, y: number }} pos
   * @returns {{ x: number, y: number }|null} Destination top-left point, or null
   */
  _getDestination(pos) {
    const isGridless = canvas.grid.type === CONST.GRID_TYPES.GRIDLESS;
    return isGridless ? this._getGridlessDestination(pos) : this._getGridDestination(pos);
  }

  /* -------------------------------------------- */

  /**
   * Snap the point to its cell's top-left and return it when that cell is in
   * the precomputed valid-positions set.
   * @param {{ x: number, y: number }} pos
   * @returns {{ x: number, y: number }|null} Destination top-left point, or null
   */
  _getGridDestination(pos) {
    const snapped = canvas.grid.getTopLeftPoint(canvas.grid.getOffset(pos));
    return this.validPositions.find(p => p.x === snapped.x && p.y === snapped.y) ?? null;
  }

  /* -------------------------------------------- */

  /**
   * Resolve a point on a gridless canvas.
   * For directional modes, projects the point onto the push/pull line.
   * For "any" direction, validates within the annulus.
   * @param {{ x: number, y: number }} pos
   * @returns {{ x: number, y: number }|null} Destination top-left point, or null
   */
  _getGridlessDestination(pos) {
    if ( this.direction === "any" ) {
      return this._getGridlessAnyDestination(pos);
    }
    return this._getGridlessDirectionalDestination(pos);
  }

  /* -------------------------------------------- */

  /**
   * Resolve a gridless point for "any" direction (annulus validation).
   * @param {{ x: number, y: number }} pos
   * @returns {{ x: number, y: number }|null} Destination top-left point, or null
   */
  _getGridlessAnyDestination(pos) {
    const targetCenter = this.targetToken.center;
    const pixelsPerUnit = canvas.grid.size / canvas.scene.dimensions.distance;
    const tolerance = this._getGridlessTolerance();

    const distance = this._measureDistance(targetCenter, pos);
    if ( distance < (this.distanceMin - tolerance) || distance > (this.distanceMax + tolerance) ) return null;

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

    if ( !this.isTeleport && this._checkWallCollision(targetCenter, clampedPos) ) return null;
    if ( this._overlapsSourceToken(clampedPos) ) return null;

    return this._centerToTopLeft(clampedPos);
  }

  /* -------------------------------------------- */

  /**
   * Resolve a gridless point for directional modes (line projection).
   * Projects the point onto the push/pull line from the target through/toward the source.
   * @param {{ x: number, y: number }} pos
   * @returns {{ x: number, y: number }|null} Destination top-left point, or null
   */
  _getGridlessDirectionalDestination(pos) {
    const targetCenter = this.targetToken.center;
    const sourceCenter = this.sourceToken.center;
    const pixelsPerUnit = canvas.grid.size / canvas.scene.dimensions.distance;
    const tolerance = this._getGridlessTolerance();
    const tolerancePx = tolerance * pixelsPerUnit;

    const dx = sourceCenter.x - targetCenter.x;
    const dy = sourceCenter.y - targetCenter.y;
    const sourceDist = Math.sqrt((dx * dx) + (dy * dy));
    if ( sourceDist <= 0 ) return null;

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

      if ( !this.isTeleport && this._checkWallCollision(targetCenter, clampedPos) ) continue;
      if ( this._overlapsSourceToken(clampedPos) ) continue;

      return this._centerToTopLeft(clampedPos);
    }

    return null;
  }

  /* -------------------------------------------- */

  /**
   * Whether the target token would overlap the source token.
   * @param {{ x: number, y: number }} center
   * @returns {boolean} Whether the moved target token would overlap the source token
   */
  _overlapsSourceToken(center) {
    const topLeft = this._centerToTopLeft(center);
    const source = this.sourceToken;
    return (topLeft.x < source.x + source.w) && (topLeft.x + this.targetToken.w > source.x)
      && (topLeft.y < source.y + source.h) && (topLeft.y + this.targetToken.h > source.y);
  }

  /* -------------------------------------------- */
  /*  Movement Execution                          */
  /* -------------------------------------------- */

  /**
   * Move the target token. Apply the update directly if the user has
   * permission; otherwise relay to an active GM via socket.
   * @param {number} x
   * @param {number} y
   */
  _executeMovement(x, y) {
    const tokenDoc = this.targetToken.document;

    if ( tokenDoc.canUserModify(game.user, "update") ) {
      MoveCanvasMode._moveTokenDocument(tokenDoc, x, y, { isTeleport: this.isTeleport });
    } else {
      game.socket.emit(`module.${MODULE.ID}`, {
        action: "moveToken",
        options: {
          sceneId: canvas.scene.id,
          tokenId: tokenDoc.id,
          x,
          y,
          isTeleport: this.isTeleport
        }
      });
    }
  }
}
