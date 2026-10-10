import { Logger, measureDistance, queryGM } from "../utils.js";
import * as Highlight from "../canvas/highlight.js";
import { addCursorLabelIcon, setCursorLabelIcon, setCursorLabelPosition } from "../interface/cursor-label.js";
import { applyBypassedMoves } from "./activities.js";

const HIGHLIGHT_LAYER_NAME = "custom-dnd5e-move";
const PATH_HIGHLIGHT_LAYER_NAME = "custom-dnd5e-move-path";
const MOVE_ICON_ID = "custom-dnd5e-cursor-label-move";
const MOVE_ICON_HTML = '<i class="fa-solid fa-arrows-up-down-left-right"></i>';

/**
 * Build a lookup key for a grid space.
 * @param {{ i: number, j: number }} offset
 * @returns {string} Key in the form "i,j"
 */
const getSpaceKey = offset => `${offset.i},${offset.j}`;

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
    this._spacePositions = new Map();
    this._targetSpaces = [];
    this._anchorOffset = null;
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
   * Called directly, or by the GM for a player who can't move the token.
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

    const targetTopLeft = this.targetToken.document.getSnappedPosition();
    const targetCenter = this._getSnappedCenter(this.targetToken);
    const sourceCenter = this._getSnappedCenter(this.sourceToken);
    const sourceDistToTarget = measureDistance(sourceCenter, targetCenter);

    // The whole token is shifted by the same number of spaces as the space under its centre
    this._anchorOffset = canvas.grid.getOffset(targetCenter);
    this._targetSpaces = this._getOccupiedSpaces(this.targetToken);
    const anchorCenter = canvas.grid.getCenterPoint(this._anchorOffset);

    // The target token cannot be moved onto a grid space occupied by the source token
    const sourceSpaces = this._getOccupiedSpaces(this.sourceToken);
    const sourceOccupied = new Set(sourceSpaces.map(getSpaceKey));
    const isPull = ["pull", "pushOrPull"].includes(this.direction);
    const gap = isPull ? this._getGap(sourceSpaces, this._targetSpaces) : 0;

    for ( const candidateOffset of Highlight.candidateOffsets(this._anchorOffset, maxSteps) ) {
      if ( getSpaceKey(candidateOffset) === getSpaceKey(this._anchorOffset) ) continue;
      const spaces = this._targetSpaces.map(o => this._shiftOffset(o, this._anchorOffset, candidateOffset));
      if ( spaces.some(o => sourceOccupied.has(getSpaceKey(o))) ) continue;

      const shiftedAnchor = canvas.grid.getCenterPoint(candidateOffset);
      const dx = shiftedAnchor.x - anchorCenter.x;
      const dy = shiftedAnchor.y - anchorCenter.y;
      const candidateCenter = { x: targetCenter.x + dx, y: targetCenter.y + dy };

      const distance = measureDistance(anchorCenter, shiftedAnchor);
      if ( distance < this.distanceMin || distance > this.distanceMax ) continue;

      // Every space of a pull must bringthe target a space closer to the source
      const steps = isPull ? canvas.grid.measurePath([this._anchorOffset, candidateOffset]).spaces : 0;
      const pullsCloser = isPull && ((gap - this._getGap(sourceSpaces, spaces)) >= steps);
      if ( !this._checkDirection(sourceCenter, targetCenter, candidateCenter, sourceDistToTarget, pullsCloser) ) {
        continue;
      }
      if ( !this.isTeleport && this._checkWallCollision(targetCenter, candidateCenter) ) continue;

      positions.push({ x: targetTopLeft.x + dx, y: targetTopLeft.y + dy, spaces, length: Math.hypot(dx, dy) });
    }

    this._mapSpacesToPositions(positions);
    return positions;
  }

  /* -------------------------------------------- */

  /**
   * Work out which position each grid space selects.
   * @param {object[]} positions Valid positions
   */
  _mapSpacesToPositions(positions) {
    this._spacePositions = new Map();
    const occupied = new Set(this._targetSpaces.map(getSpaceKey));

    for ( const position of positions ) {
      for ( const offset of position.spaces ) {
        const key = getSpaceKey(offset);
        if ( occupied.has(key) ) continue;
        const entry = this._spacePositions.get(key);
        const shortest = entry?.positions[0].length ?? Infinity;
        if ( position.length < (shortest - 0.5) ) this._spacePositions.set(key, { offset, positions: [position] });
        else if ( position.length < (shortest + 0.5) ) entry.positions.push(position);
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Count the grid spaces between the two nearest spaces of two tokens.
   * @param {object[]} spacesA First token's occupied grid spaces
   * @param {object[]} spacesB Second token's occupied grid spaces
   * @returns {number} Number of grid spaces
   */
  _getGap(spacesA, spacesB) {
    let gap = Infinity;
    for ( const a of spacesA ) {
      for ( const b of spacesB ) gap = Math.min(gap, canvas.grid.measurePath([a, b]).spaces);
    }
    return gap;
  }

  /* -------------------------------------------- */

  /**
   * Get the grid spaces a token occupis.
   * @param {Token} token
   * @returns {object[]} Array of { i, j } offset objects
   */
  _getOccupiedSpaces(token) {
    const spaces = new Map();
    for ( const { i, j } of token.document.getOccupiedGridSpaceOffsets() ) spaces.set(getSpaceKey({ i, j }), { i, j });
    return Array.from(spaces.values());
  }

  /* -------------------------------------------- */

  /**
   * Shift a grid space by the same number of spaces as the move between two
   * other grid spaces.
   * @param {{ i: number, j: number }} offset Grid space to shift
   * @param {{ i: number, j: number }} from Grid space the move starts on
   * @param {{ i: number, j: number }} to Grid space the move ends on
   * @returns {{ i: number, j: number }} Shifted grid space
   */
  _shiftOffset(offset, from, to) {
    if ( !canvas.grid.isHexagonal ) return { i: offset.i + to.i - from.i, j: offset.j + to.j - from.j };
    const [o, f, t] = [offset, from, to].map(c => canvas.grid.offsetToCube(c));
    const { i, j } = canvas.grid.cubeToOffset({ q: o.q + t.q - f.q, r: o.r + t.r - f.r, s: o.s + t.s - f.s });
    return { i, j };
  }

  /* -------------------------------------------- */

  /**
   * Get the center point of a token once it is snapped to the grid.
   * @param {Token} token Token
   * @returns {{ x: number, y: number }}
   */
  _getSnappedCenter(token) {
    const { x, y } = token.document.getCenterPoint(token.document.getSnappedPosition());
    return { x, y };
  }

  /* -------------------------------------------- */

  /**
   * Check whether a candidate position satisfies the direction constraint.
   * @param {{ x: number, y: number }} sourceCenter Source token center
   * @param {{ x: number, y: number }} targetCenter Target token center
   * @param {{ x: number, y: number }} candidateCenter Candidate position center
   * @param {number} sourceDistToTarget Distance from source to target
   * @param {boolean} pullsCloser Whether every space of the move brings the target closer to the source
   * @returns {boolean} Whether the direction constraint is met
   */
  _checkDirection(sourceCenter, targetCenter, candidateCenter, sourceDistToTarget, pullsCloser) {
    if ( this.direction === "any" ) return true;

    const sourceDistToCandidate = measureDistance(sourceCenter, candidateCenter);

    if ( this.direction === "pushOrPull" ) {
      return this._checkDirectionalMove(
        "push", sourceCenter, targetCenter, candidateCenter, sourceDistToTarget, sourceDistToCandidate, pullsCloser
      ) || this._checkDirectionalMove(
        "pull", sourceCenter, targetCenter, candidateCenter, sourceDistToTarget, sourceDistToCandidate, pullsCloser
      );
    }
    return this._checkDirectionalMove(
      this.direction, sourceCenter, targetCenter, candidateCenter, sourceDistToTarget, sourceDistToCandidate,
      pullsCloser
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
   * @param {boolean} pullsCloser
   * @returns {boolean} Whether the candidate is a valid destination
   */
  _checkDirectionalMove(direction, sourceCenter, targetCenter, candidateCenter, sourceDistToTarget,
    sourceDistToCandidate, pullsCloser) {
    if ( direction === "pull" ) return pullsCloser;
    if ( sourceDistToCandidate <= sourceDistToTarget ) return false;

    if ( (sourceCenter.x === targetCenter.x) && (sourceCenter.y === targetCenter.y) ) return true;

    const Ray = foundry.canvas.geometry.Ray;
    const lineAngle = new Ray(sourceCenter, targetCenter).angle;
    const moveAngle = new Ray(targetCenter, candidateCenter).angle;
    const deviation = Math.abs(Math.normalizeRadians(moveAngle - lineAngle));
    const maxDeviation = canvas.grid.isHexagonal ? (Math.PI / 3) : (Math.PI / 4);
    return deviation <= (maxDeviation + 1e-6);
  }

  /* -------------------------------------------- */

  /**
   * Whether a wall blocks the target token from moving between the two points.
   * @param {{ x: number, y: number }} from Starting center point
   * @param {{ x: number, y: number }} to Ending center point
   * @returns {boolean} Whether a wall blocks the path
   */
  _checkWallCollision(from, to) {
    return this.targetToken.checkCollision(to, { origin: from, type: "move", mode: "any" });
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
      for ( const { offset } of this._spacePositions.values() ) Highlight.highlightCell(HIGHLIGHT_LAYER_NAME, offset);
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
      const sourceDist = Math.hypot(sourceCenter.x - targetCenter.x, sourceCenter.y - targetCenter.y);
      Highlight.highlightLine(HIGHLIGHT_LAYER_NAME, targetCenter, sourceCenter, {
        ...lineOpts, outerDist: Math.min(outerRadius, sourceDist)
      });
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
      const anchorCenter = canvas.grid.getCenterPoint(this._anchorOffset);
      const shiftedAnchor = { x: anchorCenter.x + to.x - from.x, y: anchorCenter.y + to.y - from.y };
      const spaces = new Map();
      for ( const step of canvas.grid.getDirectPath([anchorCenter, shiftedAnchor]) ) {
        for ( const space of this._targetSpaces ) {
          const offset = this._shiftOffset(space, this._anchorOffset, step);
          spaces.set(getSpaceKey(offset), offset);
        }
      }
      for ( const offset of spaces.values() ) {
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
   * Get the valid position selected by the grid space under the point.
   * @param {{ x: number, y: number }} pos
   * @returns {{ x: number, y: number }|null} Destination top-left point, or null
   */
  _getGridDestination(pos) {
    const entry = this._spacePositions.get(getSpaceKey(canvas.grid.getOffset(pos)));
    if ( !entry ) return null;
    const { w, h } = this.targetToken;
    const centerDistance = p => Math.hypot(p.x + (w / 2) - pos.x, p.y + (h / 2) - pos.y);
    return entry.positions.reduce((a, b) => (centerDistance(b) < centerDistance(a) ? b : a));
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

    const distance = measureDistance(targetCenter, pos);
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
      directions.push({ ux: dx / sourceDist, uy: dy / sourceDist, isPull: true });
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
      if ( dir.isPull && (clampedPx >= sourceDist) ) continue;
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
    const { x, y } = this._centerToTopLeft(center);
    const moved = new PIXI.Rectangle(x, y, this.targetToken.w, this.targetToken.h);
    return this.sourceToken.bounds.intersects(moved);
  }

  /* -------------------------------------------- */
  /*  Movement Execution                          */
  /* -------------------------------------------- */

  /**
   * Move the target token. Apply the update directly if the user has
   * permission; otherwise ask the active GM to do it.
   * @param {number} x
   * @param {number} y
   * @returns {Promise<void>}
   */
  async _executeMovement(x, y) {
    const tokenDoc = this.targetToken.document;

    if ( tokenDoc.canUserModify(game.user, "update") ) {
      await MoveCanvasMode._moveTokenDocument(tokenDoc, x, y, { isTeleport: this.isTeleport });
    } else {
      await queryGM("moveToken", {
        sceneId: canvas.scene.id,
        tokenId: tokenDoc.id,
        x,
        y,
        isTeleport: this.isTeleport
      });
    }
  }
}

/* -------------------------------------------- */

/**
 * Move a token on the active GM'sclient.
 * @param {object} data
 * @param {string} data.sceneId
 * @param {string} data.tokenId
 * @param {number} data.x
 * @param {number} data.y
 * @param {boolean} [data.isTeleport] Whether to teleport (skip animation)
 * @returns {Promise<void>}
 */
export async function onMoveTokenQuery({ sceneId, tokenId, x, y, isTeleport }) {
  const tokenDoc = game.scenes.get(sceneId)?.tokens.get(tokenId);
  if ( tokenDoc ) await MoveCanvasMode._moveTokenDocument(tokenDoc, x, y, { isTeleport });
}
