// ============================================================================
// Layout helpers (0.6.0)
//
// All functions in this module return *coordinates* (or coordinate-bearing
// objects), NOT Excalidraw elements. Compose them with element factories
// (`box`, `arrow`, `textEl`, ...) from `elements.mjs`.
//
// Design intent:
//   - Keep `excalidrawer` package as primitives + layout math + palette.
//   - Diagram-kind opinions (flowchart layout, sequence rendering) live
//     either in templates (built-in) or in skill-side recipes (downstream).
//   - These helpers are the bridge: pure math, no styling decisions.
// ============================================================================

import { colors } from "./elements.mjs";
import { textHeight, fitBoundText, wrapText, estimateTextWidth, BOUND_TEXT_PAD_X } from "./text.mjs";

// ---------------------------------------------------------------------------
// gridLayout
// ---------------------------------------------------------------------------

/**
 * Lay items out in a regular grid. Returns coordinates only.
 *
 * @param {number} count - number of items
 * @param {object} opts
 * @param {number} opts.cols          - columns per row
 * @param {number} opts.cellW         - per-cell width
 * @param {number} opts.cellH         - per-cell height
 * @param {number} [opts.colGap=24]   - horizontal gap between cells
 * @param {number} [opts.rowGap=24]   - vertical gap between cells
 * @param {number} [opts.originX=0]   - top-left X of the grid
 * @param {number} [opts.originY=0]   - top-left Y of the grid
 *
 * @returns {Array<{ x: number, y: number, w: number, h: number, col: number, row: number }>}
 *
 * @example
 *   const cells = gridLayout(6, { cols: 3, cellW: 120, cellH: 60, originX: 40, originY: 40 });
 *   const els = cells.flatMap((c, i) =>
 *     box(`b${i}`, `t${i}`, c.x, c.y, c.w, c.h, colors.blue, `Item ${i}`)
 *   );
 */
export function gridLayout(count, opts) {
  const { cols, cellW, cellH } = opts;
  const colGap  = opts.colGap  ?? 24;
  const rowGap  = opts.rowGap  ?? 24;
  const originX = opts.originX ?? 0;
  const originY = opts.originY ?? 0;
  const out = [];
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    out.push({
      x: originX + col * (cellW + colGap),
      y: originY + row * (cellH + rowGap),
      w: cellW,
      h: cellH,
      col,
      row,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// chain
// ---------------------------------------------------------------------------

/**
 * Generate `count` evenly-spaced points starting from `startXY`, advancing
 * by (dx, dy) each step. Useful for linear sequences (sequence diagram
 * lifeline steps, linear flowchart segments).
 *
 * @param {{ x: number, y: number }} startXY
 * @param {number} count
 * @param {object} opts
 * @param {number} [opts.dx=0]  - X delta per step
 * @param {number} [opts.dy=0]  - Y delta per step
 *
 * @returns {Array<{ x: number, y: number, i: number }>}
 *
 * @example
 *   // 5 steps going right, 160px apart
 *   const pts = chain({ x: 40, y: 100 }, 5, { dx: 160, dy: 0 });
 *
 *   // 4 steps going down, 90px apart
 *   const pts = chain({ x: 100, y: 60 }, 4, { dx: 0, dy: 90 });
 */
export function chain(startXY, count, opts = {}) {
  const dx = opts.dx ?? 0;
  const dy = opts.dy ?? 0;
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push({ x: startXY.x + i * dx, y: startXY.y + i * dy, i });
  }
  return out;
}

// ---------------------------------------------------------------------------
// swimlane
// ---------------------------------------------------------------------------

/**
 * Lay items into horizontal swimlanes. Each lane gets a row band; items
 * within a lane are distributed by their `order` (or input order).
 *
 * @param {Array<{ label: string, color?: string }>} lanes
 *   Lane definitions, top-to-bottom.
 * @param {Array<{ lane: string, [k: string]: any }>} items
 *   Items, each tagged with which lane it belongs to (must match lane.label).
 * @param {object} opts
 * @param {number} opts.laneW         - lane band width (X extent)
 * @param {number} opts.laneH         - per-lane height
 * @param {number} opts.itemW         - per-item box width
 * @param {number} opts.itemH         - per-item box height
 * @param {number} [opts.laneGap=24]  - vertical gap between lanes
 * @param {number} [opts.itemGap=24]  - horizontal gap between items within a lane
 * @param {number} [opts.headerW=120] - left header column width for lane labels
 * @param {number} [opts.originX=0]
 * @param {number} [opts.originY=0]
 *
 * @returns {{
 *   laneRects: Array<{ x, y, w, h, label, color? }>,
 *   itemPositions: Array<{ x, y, w, h, item }>
 * }}
 *
 * @example
 *   const { laneRects, itemPositions } = swimlane(
 *     [{ label: "Frontend", color: "yellow" }, { label: "Backend", color: "blue" }],
 *     [{ lane: "Frontend", id: "ui" }, { lane: "Backend", id: "api" }, { lane: "Backend", id: "db" }],
 *     { laneW: 600, laneH: 120, itemW: 140, itemH: 56, headerW: 120 }
 *   );
 */
export function swimlane(lanes, items, opts) {
  const { laneW, laneH, itemW, itemH } = opts;
  const laneGap = opts.laneGap ?? 24;
  const itemGap = opts.itemGap ?? 24;
  const headerW = opts.headerW ?? 120;
  const originX = opts.originX ?? 0;
  const originY = opts.originY ?? 0;

  const laneRects = lanes.map((lane, i) => ({
    x: originX,
    y: originY + i * (laneH + laneGap),
    w: headerW + laneW,
    h: laneH,
    label: lane.label,
    color: lane.color,
  }));

  const slotCounter = new Map();
  const laneIndex = new Map(lanes.map((l, i) => [l.label, i]));
  const itemPositions = [];

  for (const item of items) {
    const li = laneIndex.get(item.lane);
    if (li === undefined) {
      throw new Error(`swimlane: item references unknown lane "${item.lane}"`);
    }
    const slot = slotCounter.get(item.lane) ?? 0;
    slotCounter.set(item.lane, slot + 1);
    const laneY = originY + li * (laneH + laneGap);
    itemPositions.push({
      x: originX + headerW + slot * (itemW + itemGap),
      y: laneY + (laneH - itemH) / 2,
      w: itemW,
      h: itemH,
      item,
    });
  }

  return { laneRects, itemPositions };
}

// ---------------------------------------------------------------------------
// hubSpoke
// ---------------------------------------------------------------------------

/**
 * Position one center + N spokes radially around it.
 *
 * @param {{ x: number, y: number }} centerXY  - center of the hub
 * @param {number} spokeCount                  - how many spokes
 * @param {object} opts
 * @param {number} opts.radius              - distance from center to spoke center
 * @param {number} [opts.startAngleDeg=-90] - first spoke's angle (degrees, 0 = right, -90 = top)
 * @param {boolean} [opts.clockwise=true]
 *
 * @returns {{
 *   centerPos: { x, y },
 *   spokePositions: Array<{ x, y, angleDeg, i }>
 * }}
 *
 * @example
 *   // 6 spokes around (300, 300), 180px radius, starting at top going clockwise
 *   const { centerPos, spokePositions } = hubSpoke({ x: 300, y: 300 }, 6, { radius: 180 });
 */
export function hubSpoke(centerXY, spokeCount, opts) {
  const { radius } = opts;
  const startAngleDeg = opts.startAngleDeg ?? -90;
  const clockwise = opts.clockwise ?? true;
  const dir = clockwise ? 1 : -1;
  const step = 360 / spokeCount;
  const spokePositions = [];
  for (let i = 0; i < spokeCount; i++) {
    const angleDeg = startAngleDeg + dir * i * step;
    const rad = (angleDeg * Math.PI) / 180;
    spokePositions.push({
      x: centerXY.x + radius * Math.cos(rad),
      y: centerXY.y + radius * Math.sin(rad),
      angleDeg,
      i,
    });
  }
  return { centerPos: { x: centerXY.x, y: centerXY.y }, spokePositions };
}

// ---------------------------------------------------------------------------
// edgePoint
// ---------------------------------------------------------------------------

/**
 * Compute a point on the edge of a shape (rectangle / diamond / ellipse).
 * Replaces ad-hoc math like `box.x + box.w / 2` (Issue 1 in 0.5.x feedback:
 * edge points drifting off the shape boundary, especially for diamonds and
 * ellipses where the bbox edge midpoint isn't on the actual boundary).
 *
 * Invariant across all shapes: `t = 0.5` always returns the bbox edge midpoint,
 * which coincides with the natural attachment point of each shape's `side`.
 *
 * @param {{ x: number, y: number, w: number, h: number, type?: string }} target
 *   - bbox-style shape descriptor. `type` ∈ `"rectangle"` (default) / `"diamond"` / `"ellipse"`.
 *   - Accepts elements returned by `rect()`, `diamond()`, `ellipse()`, or the
 *     first element of `box()` / `diamondBox()` arrays.
 * @param {"top"|"right"|"bottom"|"left"} side
 * @param {number} [t=0.5]
 *
 * @returns {{ x: number, y: number }}
 *
 * @example
 *   // Rectangle: t linearly interpolates along the straight edge.
 *   const b = { x: 100, y: 100, w: 160, h: 60 };
 *   edgePoint(b, "right")        // → { x: 260, y: 130 }
 *   edgePoint(b, "bottom", 0.25) // → { x: 140, y: 160 }
 *
 *   // Diamond: only the 4 cardinal vertices are valid attachment points;
 *   //   `t` is ignored. All `t` values return the same cardinal vertex.
 *   const d = { x: 100, y: 100, w: 160, h: 60, type: "diamond" };
 *   edgePoint(d, "right")     // → { x: 260, y: 130 } (right vertex)
 *   edgePoint(d, "right", 0)  // → { x: 260, y: 130 } (same — t ignored)
 *
 *   // Ellipse: `t` parameterizes a 90°-bounded arc around the cardinal point.
 *   //   t=0.5 = cardinal (touching bbox edge midpoint), t=0/1 = corner area.
 *   const e = { x: 100, y: 100, w: 160, h: 60, type: "ellipse" };
 *   edgePoint(e, "right", 0.5)  // → { x: 260, y: 130 } (rightmost point)
 *   edgePoint(e, "right", 0)    // → upper-right boundary point (45° above)
 *
 *   // Pass an element directly — `type` is read automatically:
 *   const [shape, text] = diamondBox("d1", "d1t", 100, 100, 160, 60, colors.blue, "Decision?");
 *   edgePoint(shape, "right");  // dispatches to diamond branch
 */
export function edgePoint(target, side, t = 0.5) {
  const { x, y, w, h } = target;
  const type = target.type ?? "rectangle";
  const cx = x + w / 2;
  const cy = y + h / 2;

  if (type === "rectangle") {
    switch (side) {
      case "top":    return { x: x + t * w, y };
      case "right":  return { x: x + w,     y: y + t * h };
      case "bottom": return { x: x + t * w, y: y + h };
      case "left":   return { x,            y: y + t * h };
    }
  }

  if (type === "diamond") {
    // 4 vertices; t is ignored.
    switch (side) {
      case "top":    return { x: cx,    y };
      case "right":  return { x: x + w, y: cy };
      case "bottom": return { x: cx,    y: y + h };
      case "left":   return { x,        y: cy };
    }
  }

  if (type === "ellipse") {
    // Each side spans a 90° arc bounded by the two adjacent bbox corners.
    // t=0 = "starting" corner per rectangle convention, t=0.5 = cardinal,
    // t=1 = "ending" corner. Angle conventions: 0°=right, 90°=down,
    // 180°=left, -90°=up (screen coords, Y points down).
    let angleDeg;
    switch (side) {
      case "top":    angleDeg = -135 + t * 90; break;
      case "right":  angleDeg =  -45 + t * 90; break;
      case "bottom": angleDeg =  135 - t * 90; break;
      case "left":   angleDeg = -135 - t * 90; break;
    }
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: cx + (w / 2) * Math.cos(rad),
      y: cy + (h / 2) * Math.sin(rad),
    };
  }

  throw new Error(`edgePoint: unknown shape type "${type}" or side "${side}"`);
}

// ---------------------------------------------------------------------------
// routeU
// ---------------------------------------------------------------------------

/**
 * Compute a U-shaped detour path between two points. The returned points are
 * **relative offsets from `fromXY`** (the convention `arrow()` expects).
 *
 * Use case: flowchart back-edges, retry loops, error-restart flows — anywhere
 * you need to route around the main flow without crossing it. The arrow
 * renderer auto-smooths multi-point paths into curves.
 *
 * The detour extends `clearance` past *both* endpoints on the chosen `side`,
 * so even when `fromXY` and `toXY` differ on the perpendicular axis the U
 * still clears both.
 *
 * @param {{ x: number, y: number }} fromXY  - absolute start (arrow tail)
 * @param {{ x: number, y: number }} toXY    - absolute end (arrow head)
 * @param {object} opts
 * @param {"above"|"below"|"left"|"right"} opts.side  - which side to loop around
 * @param {number} opts.clearance                     - detour distance past endpoints
 *
 * @returns {Array<[number, number]>} 4-point path, all coords relative to `fromXY`.
 *
 * @example
 *   // Back-edge: from "Show Error" (right side) looping down and back to
 *   // "Enter Credentials" (bottom edge).
 *   const start = edgePoint(showErrorBox, "right");
 *   const end   = edgePoint(enterCredBox, "bottom");
 *   const pts   = routeU(start, end, { side: "below", clearance: 60 });
 *   arrow("back", start.x, start.y, pts, { strokeColor: colors.strokeOrange });
 */
export function routeU(fromXY, toXY, opts) {
  const { side, clearance } = opts;
  const dx = toXY.x - fromXY.x;
  const dy = toXY.y - fromXY.y;

  if (side === "below") {
    const detourY = Math.max(clearance, dy + clearance);
    return [[0, 0], [0, detourY], [dx, detourY], [dx, dy]];
  }
  if (side === "above") {
    const detourY = Math.min(-clearance, dy - clearance);
    return [[0, 0], [0, detourY], [dx, detourY], [dx, dy]];
  }
  if (side === "right") {
    const detourX = Math.max(clearance, dx + clearance);
    return [[0, 0], [detourX, 0], [detourX, dy], [dx, dy]];
  }
  if (side === "left") {
    const detourX = Math.min(-clearance, dx - clearance);
    return [[0, 0], [detourX, 0], [detourX, dy], [dx, dy]];
  }
  throw new Error(`routeU: unknown side "${side}"`);
}

// ---------------------------------------------------------------------------
// labelAnchor
// ---------------------------------------------------------------------------

/**
 * Pick a good anchor point for placing a label on a polyline path
 * (typically an arrow's route). Prefers the longest horizontal segment
 * (label sits above the line, not crossing it); falls back to the longest
 * vertical segment with the label offset to one side.
 *
 * @param {Array<[number, number]>} absPoints
 *   Absolute polyline points (NOT relative offsets). To resolve a relative
 *   path from `routeU` / `chain`, do:
 *     `absPoints = relPath.map(([dx, dy]) => [origin.x + dx, origin.y + dy])`
 * @param {object} [opts]
 * @param {number} [opts.padding=6]
 *   Distance between the label anchor and the line.
 * @param {"auto"|"above"|"below"|"left"|"right"} [opts.preferSide="auto"]
 *   "auto" picks "above" for horizontal segments, "right" for vertical.
 *   Explicit values are honored when compatible with the segment orientation;
 *   otherwise the auto fallback is used.
 *
 * @returns {{ x: number, y: number, side: string, segmentIdx: number }}
 *
 * @example
 *   const pts = routeU(start, end, { side: "below", clearance: 50 });
 *   const abs = pts.map(([dx, dy]) => [start.x + dx, start.y + dy]);
 *   const a = labelAnchor(abs);
 *   textEl("lbl", a.x, a.y, 40, 14, "Fail", 11);
 */
export function labelAnchor(absPoints, opts = {}) {
  if (!Array.isArray(absPoints) || absPoints.length < 2) {
    throw new Error("labelAnchor: need at least 2 points");
  }
  const padding = opts.padding ?? 6;
  const preferSide = opts.preferSide ?? "auto";

  const segments = [];
  for (let i = 0; i < absPoints.length - 1; i++) {
    const [x1, y1] = absPoints[i];
    const [x2, y2] = absPoints[i + 1];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len === 0) continue;
    segments.push({
      x1, y1, x2, y2,
      len,
      horizontal: Math.abs(dx) >= Math.abs(dy),
      idx: i,
    });
  }
  if (segments.length === 0) {
    throw new Error("labelAnchor: no non-degenerate segments");
  }

  const horizontals = segments.filter((s) => s.horizontal).sort((a, b) => b.len - a.len);
  const verticals = segments.filter((s) => !s.horizontal).sort((a, b) => b.len - a.len);

  const chosen = horizontals[0] ?? verticals[0];
  const midX = (chosen.x1 + chosen.x2) / 2;
  const midY = (chosen.y1 + chosen.y2) / 2;

  let side;
  let x;
  let y;

  if (chosen.horizontal) {
    side = preferSide === "below" ? "below" : "above";
    x = midX;
    y = side === "above" ? midY - padding : midY + padding;
  } else {
    side = preferSide === "left" ? "left" : "right";
    x = side === "right" ? midX + padding : midX - padding;
    y = midY;
  }

  return { x, y, side, segmentIdx: chosen.idx };
}

// ---------------------------------------------------------------------------
// contrastText
// ---------------------------------------------------------------------------

/**
 * Pick a foreground color (black or white) that meets WCAG AA (4.5:1)
 * contrast against the given background color.
 *
 * Threshold ~0.179 in sRGB relative luminance — below this, white text wins;
 * above, black wins. (Both reach AA contrast in the narrow crossover band
 * around 0.175–0.183; we use 0.179.)
 *
 * @param {string} hex - "#RRGGBB" (case-insensitive). Short "#RGB" not supported.
 * @returns {"#000000"|"#ffffff"}
 *
 * @example
 *   contrastText("#1971c2")  // → "#ffffff"   (deep blue, use white text)
 *   contrastText("#a5d8ff")  // → "#000000"   (light blue, use black text)
 *
 *   // Typical usage with triplet():
 *   const t = triplet("blue");
 *   // Stroke-colored box (dark fill) → white text + matching border
 *   const txt = contrastText(t.stroke);
 *   box("b1", "b1t", x, y, w, h, t.stroke, "Header", 14, { strokeColor: txt });
 */
export function contrastText(hex) {
  return relativeLuminance(hex, "contrastText") > 0.179 ? "#000000" : "#ffffff";
}

/**
 * Keep an accent color as a label only while it stays legible on its
 * background; otherwise fall back to a color that is.
 *
 * The palette's light accents (yellow, orange) drop under the 3:1 WCAG floor
 * on their own `bg*` tint — the same threshold the `LOW_CONTRAST` lint uses —
 * so tinting a label with its section color is safe for some hues and not
 * others. This picks per-hue instead of per-diagram.
 *
 * @param {string} hex   - "#RRGGBB" the label would like to be
 * @param {string} bgHex - "#RRGGBB" it sits on
 * @param {object} [opts]
 * @param {number} [opts.min=3] - minimum contrast ratio to keep `hex`
 * @returns {string} `hex` when it clears `min`, else `contrastText(bgHex)`
 */
export function readableOn(hex, bgHex, opts = {}) {
  const min = opts.min ?? 3;
  const la = relativeLuminance(hex, "readableOn");
  const lb = relativeLuminance(bgHex, "readableOn");
  const ratio = (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  return ratio >= min ? hex : contrastText(bgHex);
}

function relativeLuminance(hex, who) {
  if (typeof hex !== "string" || !/^#[0-9a-fA-F]{6}$/.test(hex)) {
    throw new Error(`${who}: expected "#RRGGBB", got "${hex}"`);
  }
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

// ---------------------------------------------------------------------------
// triplet
// ---------------------------------------------------------------------------

/**
 * Resolve a color key into its semantic triplet: light background, mid fill,
 * dark stroke. Falls back gracefully when a tone is missing from `colors`.
 *
 * @param {string} key - e.g. "blue", "green", "red", ...
 * @returns {{ bg: string, mid: string, stroke: string }}
 *
 * @example
 *   triplet("blue")
 *   // → { bg: "#e7f5ff", mid: "#a5d8ff", stroke: "#1971c2" }
 *
 *   triplet("red")
 *   // → { bg: "#fff5f5", mid: "#ffc9c9", stroke: "#fa5252" }
 *   //                                            ^ fallback (no strokeRed in palette)
 *
 *   // Typical box-with-accent usage:
 *   const t = triplet("green");
 *   const [r, txt] = box("b1", "b1t", x, y, w, h, t.mid, "Pass", 16, { strokeColor: t.stroke });
 */
export function triplet(key) {
  const mid = colors[key];
  if (!mid) {
    throw new Error(`triplet: unknown color key "${key}"`);
  }
  const cap = key.charAt(0).toUpperCase() + key.slice(1);
  const bg = colors[`bg${cap}`] ?? mid;
  const stroke = colors[`stroke${cap}`] ?? "#000000";
  return { bg, mid, stroke };
}

// ---------------------------------------------------------------------------
// fitContainer
// ---------------------------------------------------------------------------

/**
 * Size a container rect to wrap a set of already-placed children with equal
 * padding on all four sides — including the bottom edge, the one most often
 * left flush or floating when a container height is hand-authored.
 *
 * Pure math: returns container geometry only. Render the rect BEFORE the
 * children so the children paint on top.
 *
 * @param {Array<{x:number,y:number,w:number,h:number}>} children - placed child bboxes
 * @param {object} [opts]
 * @param {number} [opts.padding=16] - equal inset on all four sides
 * @param {number} [opts.minW=0]     - width floor (grows rightward from the content)
 * @param {number} [opts.minH=0]     - height floor (grows downward from the content)
 *
 * @returns {{ x: number, y: number, w: number, h: number }}
 *
 * @example
 *   // Wrap 3 stacked sub-boxes — the bottom gets the same gap as the top.
 *   const kids = chain({ x: 40, y: 40 }, 3, { dy: 70 }).map((p) => ({ x: p.x, y: p.y, w: 160, h: 50 }));
 *   const c = fitContainer(kids, { padding: 20 });
 *   const els = [rect("c", c.x, c.y, c.w, c.h, colors.bgBlue), ...kids.flatMap(renderKid)];
 */
export function fitContainer(children, opts = {}) {
  if (!Array.isArray(children) || children.length === 0) {
    throw new Error("fitContainer: `children` must be a non-empty array of {x,y,w,h}");
  }
  const padding = opts.padding ?? 16;
  const minW = opts.minW ?? 0;
  const minH = opts.minH ?? 0;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const c of children) {
    if (![c?.x, c?.y, c?.w, c?.h].every((n) => typeof n === "number" && Number.isFinite(n))) {
      throw new Error("fitContainer: each child needs numeric x, y, w, h");
    }
    minX = Math.min(minX, c.x);
    minY = Math.min(minY, c.y);
    maxX = Math.max(maxX, c.x + c.w);
    maxY = Math.max(maxY, c.y + c.h);
  }
  return {
    x: minX - padding,
    y: minY - padding,
    w: Math.max(minW, (maxX - minX) + padding * 2),
    h: Math.max(minH, (maxY - minY) + padding * 2),
  };
}

// ---------------------------------------------------------------------------
// titledBox
// ---------------------------------------------------------------------------

/**
 * Geometry for a "titled box": a header line above a body block (e.g. a bullet
 * list) inside one rect, auto-sized to fit both with equal top/bottom padding.
 * Header and body may use different font sizes — the case a single bound-text
 * box can't express, and the reason a hand-sized container drifts flush/loose.
 *
 * Pure math: returns coordinates for the rect and the two text elements; you
 * render them (rect first, then the two `textEl`s on top).
 *
 * @param {object} opts
 * @param {number} opts.x   - container top-left X
 * @param {number} opts.y   - container top-left Y
 * @param {number} opts.w   - container width
 * @param {string} opts.title - header text (single line)
 * @param {string} [opts.body=""] - body text; use "\n" between bullet lines
 * @param {number} [opts.titleFontSize=18]
 * @param {number} [opts.bodyFontSize=15]
 * @param {number} [opts.padding=16] - equal inset on all four sides
 * @param {number} [opts.gap=10]     - vertical gap between header and body
 *
 * @returns {{
 *   box:   { x:number, y:number, w:number, h:number },
 *   title: { x:number, y:number, w:number, h:number, fontSize:number },
 *   body:  { x:number, y:number, w:number, h:number, fontSize:number }
 * }}
 *
 * @example
 *   const t = titledBox({
 *     x: 40, y: 40, w: 200, title: "Delivery",
 *     body: "• Pace & pauses\n• Pronunciation\n• Rhythm & intonation",
 *   });
 *   const els = [
 *     rect("d", t.box.x, t.box.y, t.box.w, t.box.h, colors.bgGreen, { strokeColor: colors.strokeGreen }),
 *     textEl("d-h", t.title.x, t.title.y, "Delivery", t.title.fontSize),
 *     textEl("d-b", t.body.x, t.body.y, "• Pace & pauses\n• Pronunciation\n• Rhythm & intonation", t.body.fontSize),
 *   ];
 */
export function titledBox(opts = {}) {
  const { x, y, w, title = "", body = "" } = opts;
  if (![x, y, w].every((n) => typeof n === "number" && Number.isFinite(n))) {
    throw new Error("titledBox: numeric `x`, `y`, `w` are required");
  }
  const titleFontSize = opts.titleFontSize ?? 18;
  const bodyFontSize = opts.bodyFontSize ?? 15;
  const padding = opts.padding ?? 16;
  const gap = opts.gap ?? 10;

  // Raw content heights — pass padding=0 so spacing is owned by `padding`/`gap` here.
  const titleH = textHeight(title, titleFontSize, 0);
  const hasBody = body.length > 0;
  const bodyH = hasBody ? textHeight(body, bodyFontSize, 0) : 0;

  const innerX = x + padding;
  const innerW = w - padding * 2;
  const titleY = y + padding;
  const bodyY = titleY + titleH + (hasBody ? gap : 0);
  const boxH = padding + titleH + (hasBody ? gap + bodyH : 0) + padding;

  return {
    box: { x, y, w, h: boxH },
    title: { x: innerX, y: titleY, w: innerW, h: titleH, fontSize: titleFontSize },
    body: { x: innerX, y: bodyY, w: innerW, h: bodyH, fontSize: bodyFontSize },
  };
}

// ---------------------------------------------------------------------------
// equalize
// ---------------------------------------------------------------------------

/**
 * One height that fits every cell in a group — the "measure, take the max,
 * apply to all" step that keeps a row of sibling boxes from going ragged.
 *
 * Sugar's bound text treats a box's `h` as a *floor*: a label that wraps grows
 * its own box and nothing else, so three boxes declared at the same size can
 * render at three different heights. Measure the group first, then build every
 * box at the returned `h` — the label still wraps and centers, the boxes stay
 * level, and the overflow lint still applies.
 *
 * Measurement reuses `fitBoundText` / `titledBox`, so the numbers agree with
 * what the renderer will actually do. Widths are per-cell inputs and are
 * returned untouched — this equalizes height only.
 *
 * @param {Array<object>} cells - one descriptor per cell, each of:
 *   - `{ w, text, fontSize? }`  — a bound-text box (label wrapped to `w`)
 *   - `{ w, title, body?, titleFontSize?, bodyFontSize?, padding?, gap? }`
 *                               — a titled box (header + body, `titledBox` math)
 *   - `{ w, h }`                — a cell whose height is already known
 * @param {object} [opts]
 * @param {number} [opts.minH=0] - floor for the resulting height
 *
 * @returns {{ h: number, cells: Array<{ w: number, h: number, contentH: number }> }}
 *   `h` is the group height; every entry in `cells` carries that same `h`
 *   plus its own `contentH` (what it needed on its own).
 *
 * @example
 *   const row = equalize([
 *     { w: 400, text: "Speaking: Listen & Repeat, Interview", fontSize: 15 },
 *     { w: 400, text: "Speaking: Listen & Repeat, Interview\nWriting: Email", fontSize: 15 },
 *   ]);
 *   // → { h: 62, cells: [{ w: 400, h: 62, contentH: 41 }, { w: 400, h: 62, contentH: 62 }] }
 *   // build both rects at row.h — they stay level whichever label wrapped
 */
export function equalize(cells, opts = {}) {
  if (!Array.isArray(cells) || cells.length === 0) {
    throw new Error("equalize: `cells` must be a non-empty array");
  }
  const minH = opts.minH ?? 0;

  const measured = cells.map((cell, i) => {
    const w = cell?.w;
    if (typeof w !== "number" || !Number.isFinite(w) || w <= 0) {
      throw new Error(`equalize: cells[${i}] needs a positive numeric \`w\``);
    }
    let contentH;
    if (typeof cell.h === "number" && Number.isFinite(cell.h)) {
      contentH = cell.h;
    } else if (typeof cell.title === "string") {
      contentH = titledBox({ ...cell, x: 0, y: 0, w }).box.h;
    } else if (typeof cell.text === "string") {
      contentH = cell.text === ""
        ? 0
        : fitBoundText(cell.text, w, 0, cell.fontSize ?? 16).height;
    } else {
      throw new Error(
        `equalize: cells[${i}] needs one of \`text\`, \`title\`, or a numeric \`h\``
      );
    }
    return { w, contentH };
  });

  const h = Math.max(minH, ...measured.map((m) => m.contentH));
  return { h, cells: measured.map((m) => ({ w: m.w, h, contentH: m.contentH })) };
}

// ---------------------------------------------------------------------------
// tree
// ---------------------------------------------------------------------------

const TREE_DIRECTIONS = {
  right: "right", horizontal: "right", lr: "right", "left-right": "right",
  down: "down", vertical: "down", tb: "down", td: "down", "top-down": "down",
};

// Per-direction defaults. Index = depth; the last entry repeats for deeper levels.
const TREE_DEFAULTS = {
  right: { fontSize: [20, 16, 15], minH: [56, 48, 40], levelGap: 72, siblingGap: 16, groupGap: 32, equalize: "siblings" },
  down:  { fontSize: [20, 16, 15], minH: [60, 56, 52], levelGap: 64, siblingGap: 24, groupGap: 40, equalize: "depth" },
};

const TITLED_PAD = 12;
const TITLED_GAP = 4;

const atDepth = (v, d, fallback) =>
  Array.isArray(v) ? (v.length ? v[Math.min(d, v.length - 1)] : fallback) : (v ?? fallback);

/**
 * Tidy tree layout — root → children hierarchy, growing right (root on the
 * left) or down (root on top). Returns coordinates only: node boxes plus the
 * connector segments, ready for `box`/`rect` + `arrow` (or sugar L4 arrows).
 *
 * Correct by construction, not eyeballed:
 *   - Leaves are stacked in input order along the breadth axis; every subtree
 *     owns a contiguous band of it, so subtrees never overlap.
 *   - Each parent sits at the midpoint of its first and last child
 *     (recursively); a parent larger than its children's band pushes the band
 *     out instead of overlapping a neighbour.
 *   - All nodes at one depth share a column (right) / row (down), so
 *     connectors only ever run through the gap between levels — no edge
 *     crosses a box or another edge.
 *   - Node heights come from the same `fitBoundText` / `titledBox` math the
 *     renderer uses, then are equalized per `equalize` so rows stay level.
 *
 * Connectors are one shared trunk per parent: a `stem` from the parent to the
 * mid-gap trunk line, a `spine` along the trunk spanning the children, and one
 * `branch` per child from the trunk into the child. A child aligned with its
 * parent gets a single straight branch from the parent instead.
 *
 * @param {object} root - `{ label, desc?, id?, children?: [node | string] }`
 *   (a bare string is shorthand for a leaf `{ label }`). Extra node fields are
 *   passed through on the result as `data`.
 * @param {object} [opts]
 * @param {"right"|"down"} [opts.direction="right"] - also accepts horizontal/vertical, LR/TB
 * @param {number|number[]} [opts.widths]     - node width per depth (auto from labels if omitted)
 * @param {number|number[]} [opts.fontSize]   - label font size per depth
 * @param {number|number[]} [opts.descFontSize] - `desc` font size per depth (default fontSize − 3)
 * @param {number|number[]} [opts.minH]       - minimum node height per depth
 * @param {number} [opts.maxW]                - cap for auto widths (default right: 280, leaves 420; down: 220)
 * @param {number} [opts.levelGap]            - gap between depths (where connectors run)
 * @param {number} [opts.siblingGap]          - gap between two adjacent leaves
 * @param {number} [opts.groupGap]            - gap next to a sibling that has its own children
 * @param {"depth"|"siblings"|"none"} [opts.equalize] - height equalizing scope
 * @param {number} [opts.originX=0]
 * @param {number} [opts.originY=0]
 *
 * @returns {{
 *   direction: "right"|"down",
 *   nodes: Array<{ id, parent, depth, index, leaf, label, desc?, fontSize, descFontSize?,
 *                  x, y, w, h, cx, cy, data, titled? }>,
 *   segments: Array<{ kind: "stem"|"spine"|"branch", parent, child?, at:[x,y], points:[[dx,dy]...] }>,
 *   levels: Array<{ depth, x, y, w, h }>,
 *   bounds: { x, y, w, h }
 * }}
 *   `titled` (only on nodes with `desc`) is the `titledBox` layout at the
 *   node's final position, with the wrapped strings on `title.text` /
 *   `body.text` — draw a rect + two texts instead of a bound label.
 *   Each segment is in sugar L4 form: `{ shape: "arrow", at, points, head: "none" }`.
 *
 * @example
 *   const t = tree({ label: "Skills", children: [
 *     { label: "Design", children: ["polish", "critique"] },
 *     { label: "Research", children: ["investigate"] },
 *   ]}, { direction: "down", originX: 40, originY: 40 });
 */
export function tree(root, opts = {}) {
  if (root == null || (typeof root !== "object" && typeof root !== "string")) {
    throw new Error("tree: `root` must be a node object `{ label, children? }`");
  }
  const dirKey = String(opts.direction ?? "right").toLowerCase();
  const direction = TREE_DIRECTIONS[dirKey];
  if (!direction) {
    throw new Error(`tree: unknown direction "${opts.direction}" (use "right" or "down")`);
  }
  const isRight = direction === "right";
  const D = TREE_DEFAULTS[direction];
  const levelGap = opts.levelGap ?? D.levelGap;
  const siblingGap = opts.siblingGap ?? D.siblingGap;
  const groupGap = opts.groupGap ?? D.groupGap;
  const eqMode = opts.equalize ?? D.equalize;
  if (!["depth", "siblings", "none"].includes(eqMode)) {
    throw new Error(`tree: equalize must be "depth", "siblings" or "none"`);
  }
  const originX = opts.originX ?? 0;
  const originY = opts.originY ?? 0;

  // 1. Normalize into an internal node list (pre-order).
  const nodes = [];
  const walk = (raw, parent, depth, index, path) => {
    const n = typeof raw === "string" ? { label: raw } : raw;
    if (n == null || typeof n !== "object") {
      throw new Error(`tree: node at ${path} must be an object or a string`);
    }
    const label = n.label == null ? "" : String(n.label);
    const { children: rawKids, ...data } = n;
    const node = {
      id: n.id != null ? String(n.id) : path,
      parent: parent ? parent.id : null,
      depth, index, label,
      desc: n.desc != null && n.desc !== "" ? String(n.desc) : undefined,
      data, kids: [],
    };
    nodes.push(node);
    if (parent) parent.kids.push(node);
    if (rawKids != null && !Array.isArray(rawKids)) {
      throw new Error(`tree: \`children\` of "${label}" must be an array`);
    }
    (rawKids || []).forEach((c, i) => walk(c, node, depth + 1, i, `${path}-${i}`));
    return node;
  };
  const top = walk(root, null, 0, 0, "n");
  const ids = new Set();
  for (const n of nodes) {
    if (ids.has(n.id)) throw new Error(`tree: duplicate node id "${n.id}"`);
    ids.add(n.id);
  }
  const maxDepth = Math.max(...nodes.map((n) => n.depth));

  // 2. Widths per depth (explicit, or auto from the longest label line).
  const widths = [];
  for (let d = 0; d <= maxDepth; d++) {
    const explicit = atDepth(opts.widths, d, null);
    if (explicit != null) { widths.push(explicit); continue; }
    const fs = atDepth(opts.fontSize, d, null) ?? atDepth(D.fontSize, d);
    const atD = nodes.filter((n) => n.depth === d);
    // Measure a `desc` line at its own (smaller) size, or it inflates the column.
    const dfs = atDepth(opts.descFontSize, d, null) ?? Math.max(11, fs - 3);
    const lineW = (s, size) => s.split("\n").map((l) => estimateTextWidth(l, size));
    const longest = Math.max(0, ...atD.flatMap((n) => [...lineW(n.label, fs), ...lineW(n.desc ?? "", dfs)]));
    const cap = opts.maxW ?? (isRight ? (d === maxDepth && d > 0 ? 420 : 280) : 220);
    widths.push(Math.max(120, Math.min(cap, longest + BOUND_TEXT_PAD_X * 2 + 16)));
  }

  // 3. Measure each node at its depth's width.
  for (const n of nodes) {
    const d = n.depth;
    n.w = widths[d];
    n.fontSize = atDepth(opts.fontSize, d, null) ?? atDepth(D.fontSize, d);
    const minH = atDepth(opts.minH, d, null) ?? atDepth(D.minH, d);
    if (n.desc) {
      n.descFontSize = atDepth(opts.descFontSize, d, null) ?? Math.max(11, n.fontSize - 3);
      const inner = n.w - TITLED_PAD * 2;
      n.wrappedLabel = wrapText(n.label, inner, n.fontSize);
      n.wrappedDesc = wrapText(n.desc, inner, n.descFontSize);
      n.h = Math.max(minH, titledBox({
        x: 0, y: 0, w: n.w, title: n.wrappedLabel, body: n.wrappedDesc,
        titleFontSize: n.fontSize, bodyFontSize: n.descFontSize, padding: TITLED_PAD, gap: TITLED_GAP,
      }).box.h);
    } else {
      n.h = fitBoundText(n.label, n.w, minH, n.fontSize).height;
    }
  }

  // 4. Equalize heights.
  const levelH = (group) => Math.max(...group.map((n) => n.h));
  if (eqMode === "depth") {
    for (let d = 0; d <= maxDepth; d++) {
      const g = nodes.filter((n) => n.depth === d);
      const h = levelH(g);
      for (const n of g) n.h = h;
    }
  } else if (eqMode === "siblings") {
    for (const n of nodes) {
      if (n.kids.length > 1) {
        const h = levelH(n.kids);
        for (const k of n.kids) k.h = h;
      }
    }
  }

  // 5. Depth-axis positions: columns (right) or rows (down).
  const levelSize = [];
  for (let d = 0; d <= maxDepth; d++) {
    levelSize.push(isRight ? widths[d] : levelH(nodes.filter((n) => n.depth === d)));
  }
  const levelPos = [];
  let acc = isRight ? originX : originY;
  for (let d = 0; d <= maxDepth; d++) {
    levelPos.push(acc);
    acc += levelSize[d] + levelGap;
  }

  // 6. Breadth-axis placement — contiguous band per subtree.
  const bSize = (n) => (isRight ? n.h : n.w);
  const shift = (n, delta) => { n.b += delta; n.kids.forEach((k) => shift(k, delta)); };
  const place = (n, cursor) => {
    if (n.kids.length === 0) { n.b = cursor; return cursor + bSize(n); }
    let c = cursor;
    let end = cursor;
    n.kids.forEach((k, i) => {
      if (i > 0) {
        const prev = n.kids[i - 1];
        c += prev.kids.length || k.kids.length ? groupGap : siblingGap;
      }
      end = place(k, c);
      c = end;
    });
    const first = n.kids[0];
    const last = n.kids[n.kids.length - 1];
    const mid = (first.b + bSize(first) / 2 + last.b + bSize(last) / 2) / 2;
    n.b = mid - bSize(n) / 2;
    if (n.b < cursor) {
      // Parent is larger than its children's band: push the band out so the
      // parent starts at the cursor and stays centered on its children.
      const delta = cursor - n.b;
      n.kids.forEach((k) => shift(k, delta));
      n.b = cursor;
      end += delta;
    }
    return Math.max(end, n.b + bSize(n));
  };
  const breadthEnd = place(top, isRight ? originY : originX);

  // 7. Final boxes.
  for (const n of nodes) {
    const lp = levelPos[n.depth];
    if (isRight) {
      n.x = lp;
      n.y = n.b;
    } else {
      n.x = n.b;
      // Center a shorter node in its row (only differs when equalize !== "depth").
      n.y = lp + (levelSize[n.depth] - n.h) / 2;
    }
    n.cx = n.x + n.w / 2;
    n.cy = n.y + n.h / 2;
    if (n.desc) {
      n.titled = titledBox({
        x: n.x, y: n.y, w: n.w, title: n.wrappedLabel, body: n.wrappedDesc,
        titleFontSize: n.fontSize, bodyFontSize: n.descFontSize, padding: TITLED_PAD, gap: TITLED_GAP,
      });
      // Center the header+body block when equalizing made the box taller.
      const slack = (n.h - n.titled.box.h) / 2;
      n.titled.box.h = n.h;
      n.titled.title.y += slack;
      n.titled.body.y += slack;
      n.titled.title.text = n.wrappedLabel;
      n.titled.body.text = n.wrappedDesc;
    }
  }

  // 8. Connectors — one shared trunk per parent.
  const segments = [];
  const seg = (kind, parent, child, a, b) =>
    segments.push({ kind, parent, ...(child ? { child } : {}), at: [a[0], a[1]], points: [[0, 0], [b[0] - a[0], b[1] - a[1]]] });
  for (const p of nodes) {
    if (p.kids.length === 0) continue;
    const pc = isRight ? p.cy : p.cx;
    const pEdge = isRight ? p.x + p.w : p.y + p.h;
    const trunk = levelPos[p.depth] + levelSize[p.depth] + levelGap / 2;
    const pt = (along, across) => (isRight ? [along, across] : [across, along]);
    const kc = p.kids.map((k) => (isRight ? k.cy : k.cx));
    const aligned = kc.map((c) => Math.abs(c - pc) < 0.5);
    if (!aligned.some(Boolean)) seg("stem", p.id, null, pt(pEdge, pc), pt(trunk, pc));
    const lo = Math.min(pc, ...kc);
    const hi = Math.max(pc, ...kc);
    if (hi - lo >= 0.5) {
      seg("spine", p.id, null, pt(trunk, lo), pt(trunk, hi));
    }
    p.kids.forEach((k, i) => {
      const kEdge = isRight ? k.x : k.y;
      seg("branch", p.id, k.id, aligned[i] ? pt(pEdge, pc) : pt(trunk, kc[i]), pt(kEdge, kc[i]));
    });
  }

  const levels = levelPos.map((pos, d) => (isRight
    ? { depth: d, x: pos, y: originY, w: levelSize[d], h: breadthEnd - originY }
    : { depth: d, x: originX, y: pos, w: breadthEnd - originX, h: levelSize[d] }));

  const out = nodes.map((n) => {
    const r = {
      id: n.id, parent: n.parent, depth: n.depth, index: n.index, leaf: n.kids.length === 0,
      label: n.label, fontSize: n.fontSize,
      x: n.x, y: n.y, w: n.w, h: n.h, cx: n.cx, cy: n.cy, data: n.data,
    };
    if (n.desc) Object.assign(r, { desc: n.desc, descFontSize: n.descFontSize, titled: n.titled });
    return r;
  });

  const depthEnd = levelPos[maxDepth] + levelSize[maxDepth];
  return {
    direction,
    nodes: out,
    segments,
    levels,
    bounds: isRight
      ? { x: originX, y: originY, w: depthEnd - originX, h: breadthEnd - originY }
      : { x: originX, y: originY, w: breadthEnd - originX, h: depthEnd - originY },
  };
}
