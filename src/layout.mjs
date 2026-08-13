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
import { textHeight, fitBoundText } from "./text.mjs";

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
