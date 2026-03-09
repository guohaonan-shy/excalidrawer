/**
 * Core element helpers for building Excalidraw diagrams.
 *
 * Usage:
 *   import { rect, box, arrow, diamond, textEl, excalidraw } from 'excalidrawer'
 *
 * Coordinate system: x/y are top-left corners, all units in pixels.
 */

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
 */
export function box(rid, tid, x, y, w, h, bg, text, fontSize = 16, extra = {}) {
  return [
    rect(rid, x, y, w, h, bg, {
      boundElements: [{ id: tid, type: "text" }],
      ...extra,
    }),
    base(tid, "text", x, y, w, h, {
      text,
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
 * Returns [diamondElement, textElement].
 */
export function diamondBox(rid, tid, x, y, w, h, bg, text, fontSize = 14, extra = {}) {
  return [
    diamond(rid, x, y, w, h, bg, {
      boundElements: [{ id: tid, type: "text" }],
      ...extra,
    }),
    base(tid, "text", x, y, w, h, {
      text,
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
// Arrow helper
// ---------------------------------------------------------------------------

/**
 * Arrow from (x, y) following a relative points path.
 *
 * points: array of [dx, dy] offsets, e.g. [[0,0],[100,0]] draws a 100px horizontal arrow.
 */
export function arrow(id, x, y, points, extra = {}) {
  const last = points[points.length - 1];
  const w = Math.abs(last[0]);
  const h = Math.abs(last[1]);
  return base(id, "arrow", x, y, w || 1, h || 1, {
    points,
    roundness: { type: 2 },
    startArrowhead: null,
    endArrowhead: "arrow",
    startBinding: null,
    endBinding: null,
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

  // Stroke accents
  strokeBlue:   "#1971c2",
  strokeGreen:  "#2f9e44",
  strokeYellow: "#f59f00",
  strokeOrange: "#e67700",
  strokePurple: "#7048e8",
  strokeGray:   "#868e96",
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
