/**
 * validate — the deterministic quality linter.
 *
 * Runs on raw (post-desugar) elements and returns a flat list of non-fatal
 * warnings for the geometry problems that repeatedly make AI-generated
 * diagrams look wrong: text spilling out of its box, shapes accidentally
 * overlapping, and arrows that render as nothing.
 *
 * This is deliberately a SAFETY NET, not the primary defense. The sugar path
 * already wraps + grows boxes; primitives should be correct by construction.
 * The linter catches what slips through any path — raw `box()` usage, hand-
 * written raw elements, and single-token overflow that wrapText can't break —
 * and surfaces it so the render loop can self-heal before declaring done.
 *
 * Warnings never block a render. Each warning is:
 *   { code, ids: [elementId...], message }
 * `message` is human/agent-actionable and names a concrete fix.
 */

import { estimateTextWidth } from "./text.mjs";

// Inner horizontal inset per side for bound text — matches sugar's TEXT_PAD_X
// so the linter agrees with what the wrapper/renderer actually does.
const INNER_PAD_X = 10;
const LINE_HEIGHT = 1.4;

// Tolerances absorb the ~0.62×fontSize width-estimate slack so we warn on real
// overflow, not borderline cases. Bound text is tighter (a visible border to
// spill past); standalone text is looser (only matters for viewBox clipping).
const BOUND_WIDTH_TOLERANCE = 1.08;
const STANDALONE_WIDTH_TOLERANCE = 1.2;
const HEIGHT_TOLERANCE = 1.05;

// Only flag partial overlaps above this fraction of the smaller shape's area.
// Full containment (a section box around its items) is intentional and skipped.
const OVERLAP_AREA_FRAC = 0.15;

// An arrow is "crossing" a shape only if it traverses this many px of the
// shape's interior — grazing a corner or ending at an edge stays under it.
const ARROW_CROSS_MIN_PX = 10;
// A point within this margin of a shape counts as belonging to it (an arrow
// endpoint sits on the box edge), so the shape is treated as an endpoint.
const ENDPOINT_MARGIN = 3;

// WCAG contrast floor. 3:1 is the AA threshold for large text; diagram labels
// are large/hand-drawn, so 3:1 flags only genuinely unreadable pairings.
const CONTRAST_MIN = 3.0;
const DEFAULT_TEXT_COLOR = { r: 30, g: 30, b: 30 }; // #1e1e1e
const CANVAS_WHITE = { r: 255, g: 255, b: 255 };

const SHAPE_TYPES = new Set(["rectangle", "diamond", "ellipse"]);

/**
 * @param {Array} elements - raw Excalidraw elements (may be nested; flattened)
 * @returns {Array<{code:string, ids:string[], message:string}>}
 */
export function validate(elements) {
  const warnings = [];
  if (!Array.isArray(elements)) return warnings;
  const flat = elements.flat(Infinity).filter((e) => e && !e.isDeleted);

  const byId = new Map();
  for (const el of flat) if (el && el.id != null) byId.set(el.id, el);

  checkTextOverflow(flat, byId, warnings);
  checkShapeOverlap(flat, warnings);
  checkDegenerateArrows(flat, warnings);
  checkArrowCrossings(flat, warnings);
  checkContrast(flat, byId, warnings);

  return warnings;
}

// --- text overflow ---------------------------------------------------------

function checkTextOverflow(flat, byId, warnings) {
  for (const el of flat) {
    if (el.type !== "text" || !el.text) continue;
    const fontSize = el.fontSize || 16;
    const container = el.containerId != null ? byId.get(el.containerId) : null;

    const boxW = container ? container.width : el.width;
    if (!boxW || boxW <= 0) continue;

    const availW = container ? boxW - INNER_PAD_X * 2 : boxW;
    const tol = container ? BOUND_WIDTH_TOLERANCE : STANDALONE_WIDTH_TOLERANCE;
    const textW = longestLineWidth(el.text, fontSize);

    if (availW > 0 && textW > availW * tol) {
      const target = Math.ceil(textW + (container ? INNER_PAD_X * 2 : 0));
      warnings.push({
        code: "TEXT_OVERFLOW_X",
        ids: container ? [container.id, el.id] : [el.id],
        message:
          `text "${truncate(el.text)}" (~${textW}px @ ${fontSize}px) exceeds ` +
          `${container ? `box ${container.id} inner` : "its own"} width ` +
          `${Math.round(availW)}px — widen to ≥${target}px, lower fontSize, ` +
          `or add "\\n" line breaks.`,
      });
    }

    // Vertical overflow only meaningful for text bound to a fixed-height box.
    if (container && container.height > 0) {
      const lines = String(el.text).split("\n").length;
      const totalH = lines * fontSize * LINE_HEIGHT;
      if (totalH > container.height * HEIGHT_TOLERANCE) {
        warnings.push({
          code: "TEXT_OVERFLOW_Y",
          ids: [container.id, el.id],
          message:
            `text in box ${container.id} needs ~${Math.ceil(totalH)}px height ` +
            `but the box is ${Math.round(container.height)}px — grow the box height.`,
        });
      }
    }
  }
}

function longestLineWidth(text, fontSize) {
  let max = 0;
  for (const line of String(text).split("\n")) {
    const w = estimateTextWidth(line, fontSize);
    if (w > max) max = w;
  }
  return max;
}

// --- shape overlap ---------------------------------------------------------

function checkShapeOverlap(flat, warnings) {
  const shapes = flat.filter(
    (e) => SHAPE_TYPES.has(e.type) && e.width > 0 && e.height > 0
  );
  for (let i = 0; i < shapes.length; i++) {
    for (let j = i + 1; j < shapes.length; j++) {
      const a = shapes[i];
      const b = shapes[j];
      const ix = intersectArea(a, b);
      if (ix <= 0) continue;
      // Full containment is intentional nesting (a section around its items).
      if (contains(a, b) || contains(b, a)) continue;
      const minArea = Math.min(a.width * a.height, b.width * b.height);
      if (ix > minArea * OVERLAP_AREA_FRAC) {
        warnings.push({
          code: "SHAPE_OVERLAP",
          ids: [a.id, b.id],
          message:
            `shapes ${a.id} and ${b.id} overlap by ~${Math.round((ix / minArea) * 100)}% ` +
            `— separate them, or nest one fully inside the other.`,
        });
      }
    }
  }
}

function intersectArea(a, b) {
  const w = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const h = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return w * h;
}

function contains(outer, inner, eps = 1) {
  return (
    inner.x >= outer.x - eps &&
    inner.y >= outer.y - eps &&
    inner.x + inner.width <= outer.x + outer.width + eps &&
    inner.y + inner.height <= outer.y + outer.height + eps
  );
}

// --- degenerate arrows -----------------------------------------------------

function checkDegenerateArrows(flat, warnings) {
  for (const el of flat) {
    if (el.type !== "arrow") continue;
    const pts = Array.isArray(el.points) ? el.points : null;
    if (!pts || pts.length < 2) {
      warnings.push({
        code: "DEGENERATE_ARROW",
        ids: [el.id],
        message: `arrow ${el.id} has fewer than 2 points — it renders as nothing.`,
      });
      continue;
    }
    const len = pathLength(pts);
    if (len < 4) {
      warnings.push({
        code: "DEGENERATE_ARROW",
        ids: [el.id],
        message:
          `arrow ${el.id} is only ~${Math.round(len)}px long (start ≈ end) ` +
          `— give it real endpoints.`,
      });
    }
  }
}

// Segment lengths are identical for relative or absolute points (both shift by
// the same origin), so this works directly on the [dx,dy] offset array.
function pathLength(pts) {
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  }
  return len;
}

// --- arrow crossing a non-endpoint shape ("line over a module") ------------

function checkArrowCrossings(flat, warnings) {
  const shapes = flat.filter(
    (e) => SHAPE_TYPES.has(e.type) && e.width > 0 && e.height > 0
  );
  if (shapes.length === 0) return;

  for (const el of flat) {
    if (el.type !== "arrow" || !Array.isArray(el.points) || el.points.length < 2) {
      continue;
    }
    // Absolute points (points are [dx,dy] offsets from the arrow origin).
    const abs = el.points.map(([dx, dy]) => [el.x + dx, el.y + dy]);
    const start = abs[0];
    const end = abs[abs.length - 1];

    // Only node-to-node connectors can "cross" a third module. Backbone lines
    // (timeline axis, sequence lifelines) have a free end in empty space and
    // thread through markers on purpose — skip anything not anchored at BOTH
    // ends to a shape.
    const startShape = shapes.find((s) => pointInRect(start, s, ENDPOINT_MARGIN));
    const endShape = shapes.find((s) => pointInRect(end, s, ENDPOINT_MARGIN));
    if (!startShape || !endShape) continue;

    for (const s of shapes) {
      // Skip the arrow's own endpoints: a shape that holds (or contains) either
      // tip is where the arrow legitimately attaches, not something it crosses.
      if (pointInRect(start, s, ENDPOINT_MARGIN) || pointInRect(end, s, ENDPOINT_MARGIN)) {
        continue;
      }
      let through = 0;
      for (let i = 1; i < abs.length; i++) {
        through += clippedLength(abs[i - 1], abs[i], s);
        if (through >= ARROW_CROSS_MIN_PX) break;
      }
      if (through >= ARROW_CROSS_MIN_PX) {
        warnings.push({
          code: "ARROW_CROSSES_SHAPE",
          ids: [el.id, s.id],
          message:
            `arrow ${el.id} runs through shape ${s.id} (~${Math.round(through)}px of it) ` +
            `— reroute it (via / fromSide / toSide), or move the shape out of the path.`,
        });
      }
    }
  }
}

function pointInRect([px, py], r, margin = 0) {
  return (
    px >= r.x - margin &&
    px <= r.x + r.width + margin &&
    py >= r.y - margin &&
    py <= r.y + r.height + margin
  );
}

// Length of a segment's portion inside a rectangle, via Liang–Barsky clipping.
function clippedLength([x0, y0], [x1, y1], r) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const p = [-dx, dx, -dy, dy];
  const q = [x0 - r.x, r.x + r.width - x0, y0 - r.y, r.y + r.height - y0];
  let t0 = 0;
  let t1 = 1;
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return 0; // parallel and outside this edge
    } else {
      const t = q[i] / p[i];
      if (p[i] < 0) {
        if (t > t1) return 0;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return 0;
        if (t < t1) t1 = t;
      }
    }
  }
  if (t1 <= t0) return 0;
  return Math.hypot(dx, dy) * (t1 - t0);
}

// --- text/background contrast ----------------------------------------------

function checkContrast(flat, byId, warnings) {
  for (const el of flat) {
    if (el.type !== "text" || !el.text) continue;
    const fg = parseColor(el.strokeColor) || DEFAULT_TEXT_COLOR;

    // Background: the container fill for bound text; canvas white otherwise or
    // when the fill is transparent (text then sits on the white canvas).
    let bg = CANVAS_WHITE;
    if (el.containerId != null) {
      const c = byId.get(el.containerId);
      const parsed = c && parseColor(c.backgroundColor);
      if (parsed) bg = parsed;
    }

    const ratio = contrastRatio(fg, bg);
    if (ratio < CONTRAST_MIN) {
      warnings.push({
        code: "LOW_CONTRAST",
        ids: el.containerId != null ? [el.containerId, el.id] : [el.id],
        message:
          `text "${truncate(el.text)}" has ~${ratio.toFixed(1)}:1 contrast against ` +
          `its background (min ${CONTRAST_MIN}:1) — pick a darker/lighter label ` +
          `color or change the fill (see contrastText()).`,
      });
    }
  }
}

function parseColor(c) {
  if (!c || typeof c !== "string" || c === "transparent") return null;
  let s = c.trim().replace(/^#/, "");
  if (s.length === 3) s = s.split("").map((ch) => ch + ch).join("");
  if (s.length !== 6) return null;
  const r = parseInt(s.slice(0, 2), 16);
  const g = parseInt(s.slice(2, 4), 16);
  const b = parseInt(s.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return null;
  return { r, g, b };
}

function relativeLuminance({ r, g, b }) {
  const lin = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

// --- misc ------------------------------------------------------------------

function truncate(s, n = 24) {
  const one = String(s).replace(/\n/g, "⏎");
  return one.length > n ? one.slice(0, n) + "…" : one;
}
