/**
 * Shared canvas-highlighting.
 */

import { measureDistance } from "../utils.js";

/** Default palette. */
export const DEFAULT_COLORS = Object.freeze({
  fill: 0x00cc00,
  fillAlpha: 0.2,
  border: 0x008800,
  borderAlpha: 0.8
});

/**
 * @typedef {object} HighlightColors
 * @property {number} [fill]
 * @property {number} [fillAlpha]
 * @property {number} [border]
 * @property {number} [borderAlpha]
 */

/* -------------------------------------------- */

/**
 * Register (or reset) a named highlight layer.
 * @param {string} name
 */
export function addLayer(name) {
  removeLayer(name);
  canvas.interface.grid.addHighlightLayer(name);
}

/* -------------------------------------------- */

/**
 * Tear down a named highlight layer.
 * @param {string} name
 */
export function removeLayer(name) {
  canvas?.interface?.grid?.destroyHighlightLayer?.(name);
}

/* -------------------------------------------- */

/**
 * Highlight a single grid cell.
 * @param {string} name
 * @param {{i: number, j: number}|{x: number, y: number}} cell Grid offset or top-left point.
 * @param {HighlightColors} [colors]
 */
export function highlightCell(name, cell, colors = {}) {
  const c = { ...DEFAULT_COLORS, ...colors };
  const topLeft = "i" in cell ? canvas.grid.getTopLeftPoint(cell) : cell;
  canvas.interface.grid.highlightPosition(name, {
    x: topLeft.x, y: topLeft.y, color: c.fill, border: c.border, alpha: c.fillAlpha
  });
}

/* -------------------------------------------- */

/**
 * Draw an annulus; `innerRadius = 0` produces a solid disc.
 * @param {string} name
 * @param {{x: number, y: number}} center
 * @param {number} outerRadius
 * @param {object} [options]
 * @param {number} [options.innerRadius=0]
 * @param {PIXI.Polygon|{points: number[]}} [options.mask]
 * @param {HighlightColors} [options.colors]
 */
export function highlightAnnulus(name, center, outerRadius, { innerRadius = 0, mask, colors = {} } = {}) {
  const hl = canvas.interface.grid.getHighlightLayer(name);
  if ( !hl ) return;
  const c = { ...DEFAULT_COLORS, ...colors };

  const gfx = new PIXI.Graphics();
  gfx.beginFill(c.fill, c.fillAlpha);
  gfx.drawCircle(center.x, center.y, outerRadius);
  if ( innerRadius > 0 ) {
    gfx.beginHole();
    gfx.drawCircle(center.x, center.y, innerRadius);
    gfx.endHole();
  }
  gfx.endFill();
  gfx.lineStyle(2, c.border, c.borderAlpha);
  gfx.drawCircle(center.x, center.y, outerRadius);
  if ( innerRadius > 0 ) gfx.drawCircle(center.x, center.y, innerRadius);

  attachShape(hl, gfx, mask);
}

/* -------------------------------------------- */

/**
 * Draw an oriented rectangle.
 * @param {string} name
 * @param {{x: number, y: number}} origin
 * @param {{x: number, y: number}} toward
 * @param {object} [options]
 * @param {number} [options.innerDist=0]
 * @param {number} [options.outerDist]
 * @param {number} [options.halfWidth=10]
 * @param {boolean} [options.reverse=false] Draw away from `toward`.
 * @param {PIXI.Polygon|{points: number[]}} [options.mask]
 * @param {HighlightColors} [options.colors]
 */
export function highlightLine(name, origin, toward, {
  innerDist = 0, outerDist, halfWidth = 10, reverse = false, mask, colors = {}
} = {}) {
  const hl = canvas.interface.grid.getHighlightLayer(name);
  if ( !hl ) return;
  const c = { ...DEFAULT_COLORS, ...colors };

  const dx = toward.x - origin.x;
  const dy = toward.y - origin.y;
  const dist = Math.hypot(dx, dy);
  if ( dist <= 0 ) return;

  const ux = (reverse ? -1 : 1) * (dx / dist);
  const uy = (reverse ? -1 : 1) * (dy / dist);
  const px = -uy;
  const py = ux;

  const startX = origin.x + (ux * innerDist);
  const startY = origin.y + (uy * innerDist);
  const endX = origin.x + (ux * outerDist);
  const endY = origin.y + (uy * outerDist);

  const gfx = new PIXI.Graphics();
  gfx.beginFill(c.fill, c.fillAlpha);
  gfx.moveTo(startX + (px * halfWidth), startY + (py * halfWidth));
  gfx.lineTo(endX + (px * halfWidth), endY + (py * halfWidth));
  gfx.lineTo(endX - (px * halfWidth), endY - (py * halfWidth));
  gfx.lineTo(startX - (px * halfWidth), startY - (py * halfWidth));
  gfx.closePath();
  gfx.endFill();
  gfx.lineStyle(2, c.border, c.borderAlpha);
  gfx.moveTo(startX + (px * halfWidth), startY + (py * halfWidth));
  gfx.lineTo(endX + (px * halfWidth), endY + (py * halfWidth));
  gfx.lineTo(endX - (px * halfWidth), endY - (py * halfWidth));
  gfx.lineTo(startX - (px * halfWidth), startY - (py * halfWidth));
  gfx.closePath();

  attachShape(hl, gfx, mask);
}

/* -------------------------------------------- */

/**
 * Attach a PIXI shape to a highlight layer, optionally polygon-clipped.
 * @param {PIXI.Container} hl
 * @param {PIXI.Graphics} shape
 * @param {PIXI.Polygon|{points: number[]}} [mask]
 */
function attachShape(hl, shape, mask) {
  if ( !mask ) {
    hl.addChild(shape);
    return;
  }
  const container = new PIXI.Container();
  const maskGfx = new PIXI.Graphics();
  maskGfx.beginFill(0xffffff);
  maskGfx.drawPolygon(mask.points ?? mask);
  maskGfx.endFill();
  container.mask = maskGfx;
  container.addChild(shape);
  hl.addChild(maskGfx);
  hl.addChild(container);
}

/* -------------------------------------------- */

/**
 * Paint cells within range of source token; annulus on gridless.
 * @param {object} args
 * @param {string} args.name Layer name (create via {@link addLayer} first).
 * @param {Token} args.sourceToken
 * @param {number} args.rangeUnits
 * @param {HighlightColors} [args.colors]
 */
export function highlightRange({ name, sourceToken, rangeUnits, colors }) {
  const grid = canvas.grid;
  if ( !grid || !sourceToken || !(rangeUnits > 0) ) return;
  const sourceCenter = sourceToken.center;

  if ( grid.isGridless ) {
    const pixelsPerUnit = grid.size / canvas.scene.dimensions.distance;
    highlightAnnulus(name, sourceCenter, rangeUnits * pixelsPerUnit, { colors });
    return;
  }

  const maxSteps = Math.ceil(rangeUnits / grid.distance);
  const sourceOffset = grid.getOffset(sourceCenter);
  for ( const offset of candidateOffsets(sourceOffset, maxSteps) ) {
    const cellCenter = grid.getCenterPoint(offset);
    if ( measureDistance(sourceCenter, cellCenter) > rangeUnits ) continue;
    highlightCell(name, offset, colors);
  }
}

/* -------------------------------------------- */

/**
 * Enumerate grid offsets.
 * @param {object} sourceOffset
 * @param {number} maxSteps
 * @yields {object} A grid offset.
 */
function* candidateOffsets(sourceOffset, maxSteps) {
  const grid = canvas.grid;
  if ( grid.isHexagonal ) {
    const sourceCube = grid.offsetToCube(sourceOffset);
    for ( let dq = -maxSteps; dq <= maxSteps; dq++ ) {
      const rMin = Math.max(-maxSteps, -dq - maxSteps);
      const rMax = Math.min(maxSteps, -dq + maxSteps);
      for ( let dr = rMin; dr <= rMax; dr++ ) {
        const ds = -dq - dr;
        yield grid.cubeToOffset({
          q: sourceCube.q + dq, r: sourceCube.r + dr, s: sourceCube.s + ds
        });
      }
    }
    return;
  }
  for ( let di = -maxSteps; di <= maxSteps; di++ ) {
    for ( let dj = -maxSteps; dj <= maxSteps; dj++ ) {
      yield { i: sourceOffset.i + di, j: sourceOffset.j + dj };
    }
  }
}
