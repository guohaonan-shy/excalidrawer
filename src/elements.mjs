/**
 * Core element helpers for building Excalidraw diagrams.
 *
 * Usage:
 *   import { rect, box, arrow, diamond, textEl, excalidraw } from 'excalidrawer'
 *
 * Coordinate system: x/y are top-left corners, all units in pixels.
 */

import { fitBoundText } from "./text.mjs";

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

const BASE_TS = 1709640000000;
let _seed = 100000;

/**
 * Reset seed to a specific value to ensure deterministic IDs across diagrams.
 * Use a different base per diagram to avoid ID collisions when combining.
 */
export function setSeed(n) {
  _seed = n;
}

// ---------------------------------------------------------------------------
// Low-level primitive
// ---------------------------------------------------------------------------

export function base(id, type, x, y, w, h, extra = {}) {
  return {
    id, type, x, y, width: w, height: h, angle: 0,
    strokeColor: "#1e1e1e", backgroundColor: "transparent",
    fillStyle: "solid", strokeWidth: 2, strokeStyle: "solid",
    roughness: 1, opacity: 100, groupIds: [], frameId: null,
    index: "a" + (_seed++).toString(36), roundness: null,
    seed: _seed++, version: 1, versionNonce: _seed++,
    isDeleted: false, boundElements: null, updated: BASE_TS,
    link: null, locked: false, ...extra,
  };
}

// ---------------------------------------------------------------------------
// Shape helpers
// ---------------------------------------------------------------------------

/** Rounded rectangle. */
export function rect(id, x, y, w, h, bg, extra = {}) {
  return base(id, "rectangle", x, y, w, h, {
    backgroundColor: bg,
    roundness: { type: 3 },
    ...extra,
  });
}

/** Diamond shape (decision node). */
export function diamond(id, x, y, w, h, bg, extra = {}) {
  return base(id, "diamond", x, y, w, h, {
    backgroundColor: bg,
    ...extra,
  });
}

/** Ellipse. */
export function ellipse(id, x, y, w, h, bg, extra = {}) {
  return base(id, "ellipse", x, y, w, h, {
    backgroundColor: bg,
    ...extra,
  });
}

// ---------------------------------------------------------------------------
// Text helper
// ---------------------------------------------------------------------------

/**
 * Standalone text element.
 * Always uses Excalifont (fontFamily: 5) for consistent rendering.
 */
export function textEl(id, x, y, w, h, text, fontSize, extra = {}) {
  return base(id, "text", x, y, w, h, {
    text,
    fontSize,
    fontFamily: 1,
    textAlign: "center",
    verticalAlign: "top",
    roundness: null,
    ...extra,
  });
}

// ---------------------------------------------------------------------------
// Composite helpers
// ---------------------------------------------------------------------------

/**
 * Rectangle with vertically and horizontally centered bound text.
 * Returns [rectElement, textElement] — spread with `...box(...)`.
 *
 * Correct by construction: the label is wrapped to the box's inner width and
 * the box height grows to contain it (only when needed), so text never spills
 * out the bottom or sides. `h` is a floor, not a fixed height.
 */
export function box(rid, tid, x, y, w, h, bg, text, fontSize = 16, extra = {}) {
  const fit = fitBoundText(text, w, h, fontSize);
  return [
    rect(rid, x, y, w, fit.height, bg, {
      boundElements: [{ id: tid, type: "text" }],
      ...extra,
    }),
    base(tid, "text", x, y, w, fit.height, {
      text: fit.text,
      fontSize,
      fontFamily: 1,
      textAlign: "center",
      verticalAlign: "middle",
      roundness: null,
      containerId: rid,
    }),
  ];
}

/**
 * Diamond with centered bound text.
 * Returns [diamondElement, textElement]. Same correct-by-construction wrapping
 * and height-growth as `box` (see above).
 */
export function diamondBox(rid, tid, x, y, w, h, bg, text, fontSize = 14, extra = {}) {
  const fit = fitBoundText(text, w, h, fontSize);
  return [
    diamond(rid, x, y, w, fit.height, bg, {
      boundElements: [{ id: tid, type: "text" }],
      ...extra,
    }),
    base(tid, "text", x, y, w, fit.height, {
      text: fit.text,
      fontSize,
      fontFamily: 1,
      textAlign: "center",
      verticalAlign: "middle",
      roundness: null,
      containerId: rid,
    }),
  ];
}

// ---------------------------------------------------------------------------
// Linear components: arrow / line
// ---------------------------------------------------------------------------
//
// These mirror Excalidraw's two linear tools and their property panels:
//
//   arrow — Stroke style · Arrow type (sharp / round / elbow) · Arrowheads
//   line  — Stroke width · Edges (sharp / round)
//
// Shared option keys (both): strokeColor, strokeWidth, strokeStyle. Anything
// else in the options object is passed through as a raw element field.

/** Excalidraw's arrowhead set (null = none). */
export const ARROWHEADS = [
  "arrow", "bar", "circle", "circle_outline",
  "triangle", "triangle_outline", "diamond", "diamond_outline",
];
export const ARROW_TYPES = ["sharp", "round", "elbow"];
export const STROKE_STYLES = ["solid", "dashed", "dotted"];
export const LINE_EDGES = ["sharp", "round"];

/** Excalidraw's three stroke-width presets (thin / medium / bold). */
export const strokeWidths = { thin: 1, medium: 2, bold: 4 };

function resolveStrokeWidth(v) {
  if (v == null) return undefined;
  return typeof v === "string" ? strokeWidths[v] : v;
}

/** Bounding box of a relative points path → { minX, minY, w, h }. */
function pointsBox(points) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return {
    w: Math.max(...xs) - Math.min(...xs),
    h: Math.max(...ys) - Math.min(...ys),
  };
}

/**
 * Make a path axis-aligned for an elbow arrow: every diagonal step becomes an
 * L (horizontal leg first). Collinear / zero-length points are dropped.
 */
export function orthogonalize(points) {
  const out = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const [px, py] = out[out.length - 1];
    const [x, y] = points[i];
    if (x !== px && y !== py) out.push([x, py]);
    out.push([x, y]);
  }
  // Drop duplicates and the middle of collinear runs.
  const clean = [out[0]];
  for (let i = 1; i < out.length; i++) {
    const p = out[i];
    const q = clean[clean.length - 1];
    if (p[0] === q[0] && p[1] === q[1]) continue;
    if (clean.length >= 2) {
      const r = clean[clean.length - 2];
      if ((r[0] === q[0] && q[0] === p[0]) || (r[1] === q[1] && q[1] === p[1])) {
        clean[clean.length - 1] = p;
        continue;
      }
    }
    clean.push(p);
  }
  return clean;
}

/**
 * Arrow from (x, y) following a relative points path.
 *
 * points: array of [dx, dy] offsets, e.g. [[0,0],[100,0]] draws a 100px horizontal arrow.
 *
 * opts (all optional — Excalidraw's arrow property panel):
 *   arrowType      "sharp" | "round" | "elbow"   (default "round"; elbow
 *                  auto-inserts corners so every segment is axis-aligned)
 *   startArrowhead / endArrowhead   one of ARROWHEADS, or null for none
 *                  (default start null, end "arrow")
 *   strokeStyle    "solid" | "dashed" | "dotted"
 *   strokeWidth    1 | 2 | 4 or "thin" | "medium" | "bold"
 *   strokeColor
 * Raw element fields (e.g. roundness) still pass through and win.
 */
export function arrow(id, x, y, points, opts = {}) {
  const { arrowType, strokeWidth, ...extra } = opts;
  if (arrowType != null && !ARROW_TYPES.includes(arrowType)) {
    throw new Error(`arrow ${id}: arrowType must be one of ${ARROW_TYPES.join("/")}`);
  }
  const elbowed = arrowType === "elbow";
  const pts = elbowed ? orthogonalize(points) : points;
  const { w, h } = pointsBox(pts);
  const sw = resolveStrokeWidth(strokeWidth);
  return base(id, "arrow", x, y, w || 1, h || 1, {
    points: pts,
    roundness: arrowType === "sharp" || elbowed ? null : { type: 2 },
    elbowed,
    startArrowhead: null,
    endArrowhead: "arrow",
    startBinding: null,
    endBinding: null,
    ...(sw != null ? { strokeWidth: sw } : {}),
    ...extra,
  });
}

/**
 * Plain line (no arrowheads) from (x, y) following a relative points path.
 *
 * opts (all optional — Excalidraw's line property panel):
 *   strokeWidth    1 | 2 | 4 or "thin" | "medium" | "bold"
 *   edges          "sharp" | "round"   (default "sharp"; round = smooth curve
 *                  through the points, same as a round arrow)
 *   strokeStyle, strokeColor
 */
export function line(id, x, y, points, opts = {}) {
  const { edges, strokeWidth, ...extra } = opts;
  if (edges != null && !LINE_EDGES.includes(edges)) {
    throw new Error(`line ${id}: edges must be one of ${LINE_EDGES.join("/")}`);
  }
  const { w, h } = pointsBox(points);
  const sw = resolveStrokeWidth(strokeWidth);
  return base(id, "line", x, y, w || 1, h || 1, {
    points,
    roundness: edges === "round" ? { type: 2 } : null,
    polygon: false,
    startArrowhead: null,
    endArrowhead: null,
    startBinding: null,
    endBinding: null,
    ...(sw != null ? { strokeWidth: sw } : {}),
    ...extra,
  });
}

// ---------------------------------------------------------------------------
// Layout utilities
// ---------------------------------------------------------------------------

/**
 * Lay out items in a horizontal row with equal spacing.
 * builder(index, x, y) should return an array of elements.
 *
 * @param {number} count     - number of items
 * @param {number} startX    - x of first item
 * @param {number} y         - y of all items
 * @param {number} itemW     - width of each item
 * @param {number} gap       - gap between items
 * @param {Function} builder - (i, x, y) => element[]
 */
export function row(count, startX, y, itemW, gap, builder) {
  const els = [];
  for (let i = 0; i < count; i++) {
    const x = startX + i * (itemW + gap);
    els.push(...builder(i, x, y));
  }
  return els;
}

/**
 * Lay out items in a grid.
 * builder(index, col, row, x, y) should return an array of elements.
 */
export function grid(cols, count, startX, startY, itemW, itemH, gapX, gapY, builder) {
  const els = [];
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const r = Math.floor(i / cols);
    const x = startX + col * (itemW + gapX);
    const y = startY + r * (itemH + gapY);
    els.push(...builder(i, col, r, x, y));
  }
  return els;
}

// ---------------------------------------------------------------------------
// Color palette
// ---------------------------------------------------------------------------

/** Semantic color constants for consistent diagram styling. */
export const colors = {
  // Fills
  blue:    "#a5d8ff",
  green:   "#b2f2bb",
  yellow:  "#ffd43b",
  purple:  "#d0bfff",
  red:     "#ffc9c9",
  orange:  "#ffec99",
  gray:    "#e9ecef",
  white:   "#ffffff",

  // Backgrounds (lighter tints for section containers)
  bgBlue:   "#e7f5ff",
  bgGreen:  "#ebfbee",
  bgYellow: "#fffbf0",
  bgPurple: "#f3f0ff",
  bgRed:    "#fff5f5",
  bgOrange: "#fff4e6",
  bgGray:   "#f8f9fa",

  // Stroke accents
  strokeBlue:   "#1971c2",
  strokeGreen:  "#2f9e44",
  strokeYellow: "#f59f00",
  strokeOrange: "#e67700",
  strokePurple: "#7048e8",
  strokeGray:   "#868e96",
  strokeRed:    "#fa5252",
};

// ---------------------------------------------------------------------------
// Output serializer
// ---------------------------------------------------------------------------

/**
 * Wrap elements into a complete Excalidraw file JSON string.
 *
 * @param {Array} elements - flat or nested array of element objects
 * @returns {string} JSON string ready to write to a .excalidraw file
 */
export function excalidraw(elements) {
  return JSON.stringify(
    {
      type: "excalidraw",
      version: 2,
      source: "https://excalidraw.com",
      elements: elements.flat(Infinity),
      appState: { viewBackgroundColor: "#ffffff", gridSize: 20 },
      files: {},
    },
    null,
    2
  );
}
