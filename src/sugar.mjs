/**
 * sugar — semantic shorthand → raw Excalidraw elements.
 *
 * `render` runs `desugar` before validation, so an agent can author diagrams
 * with terse, high-level objects instead of the ~20-field raw element schema.
 *
 *   shape sugar:  { shape:"rect"|"diamond"|"ellipse"|"text", id?, at:[x,y],
 *                   size:[w,h], fill?, stroke?, dashed?, text?, textColor?, fontSize? }
 *                 — a non-empty `text` auto-expands into a [shape, boundText] pair.
 *                   `stroke` colors the shape's border; `textColor` colors the label
 *                   (palette key or #rrggbb) — `stroke` does NOT reach bound text.
 *   arrow sugar:  L1 { shape:"arrow", from, to }                       (auto sides + route)
 *                 L2 { shape:"arrow", from, to, fromSide, toSide,      (pinned sides; fromT/
 *                       fromT?, toT? }                                  toT slide the anchor)
 *                 L3 { shape:"arrow", from, to, via, clearance? }      (via above/below/left/
 *                                                                      right = U-route detour)
 *                 L4 { shape:"arrow", at:[x,y], points:[[dx,dy]...] }  (manual escape)
 *
 *   Any arrow also takes: dashed? (dashed stroke), head?:"arrow"|"none"
 *   (end arrowhead, default "arrow"), labelT? (0-1, where the `text` label
 *   sits along the path; default = auto-pick by `labelAnchor`).
 *
 *   id-anchored arrows auto-route orthogonally — straight when the edge points
 *   line up, an L-bend for perpendicular sides, a Z-route for parallel sides
 *   with an offset — never a bare diagonal.
 *
 * Raw elements (objects WITHOUT a `shape` key) pass through, but are run
 * through `base()` so missing schema fields get filled — this closes the
 * silent "opacity=NaN" trap where partial raw elements rendered as garbage.
 *
 * Two-pass: shapes resolve first (recording each id's bbox), then arrows,
 * so `from`/`to` can look up the shapes they connect.
 */

import { base, rect, diamond, ellipse, textEl, arrow, colors } from "./elements.mjs";
import { edgePoint, routeU, labelAnchor } from "./layout.mjs";

export class SugarError extends Error {
  constructor(issues) {
    super(`invalid sugar: ${issues.length} issue(s)\n  - ${issues.join("\n  - ")}`);
    this.name = "SugarError";
    this.issues = issues;
  }
}

const SHAPE_KINDS = ["rect", "diamond", "ellipse", "text"];
const SIDES = ["top", "right", "bottom", "left"];

/** Resolve a color token: "#rrggbb" / "transparent" passthrough, palette key, or stroke accent. */
function resolveColor(token, kind) {
  if (typeof token !== "string") return undefined;
  if (token === "transparent" || token.startsWith("#")) return token;
  if (kind === "stroke") {
    const cap = token.charAt(0).toUpperCase() + token.slice(1);
    if (colors["stroke" + cap]) return colors["stroke" + cap];
  }
  return colors[token]; // undefined when unknown — caller raises an issue
}

const isSugar = (el) => el && typeof el === "object" && typeof el.shape === "string";
const isArrowSugar = (el) => isSugar(el) && el.shape === "arrow";
const isXY = (v) => Array.isArray(v) && v.length === 2 && typeof v[0] === "number" && typeof v[1] === "number";

/**
 * Translate a mixed array of sugar + raw elements into a flat raw array.
 * @throws {SugarError} when any sugar element is malformed.
 */
export function desugar(elements) {
  const issues = [];
  const raw = [];
  const bboxes = new Map(); // id -> { x, y, w, h, type }

  // --- pass 1: shapes + raw passthrough -------------------------------------
  elements.forEach((el, i) => {
    if (isArrowSugar(el)) return; // deferred to pass 2

    if (!isSugar(el)) {
      if (!el || typeof el !== "object" || Array.isArray(el)) {
        issues.push(`element[${i}]: must be an object`);
        return;
      }
      // raw passthrough — base() fills any missing schema fields.
      raw.push(base(el.id, el.type, el.x, el.y, el.width, el.height, el));
      if (typeof el.id === "string" && el.id) {
        bboxes.set(el.id, { x: el.x, y: el.y, w: el.width, h: el.height, type: el.type });
      }
      return;
    }

    const kind = el.shape;
    const id = typeof el.id === "string" && el.id ? el.id : `el-${i}`;
    if (!SHAPE_KINDS.includes(kind)) {
      issues.push(`element[${i}] (${id}): unknown shape "${kind}" — expected ${SHAPE_KINDS.join("/")}/arrow`);
      return;
    }
    if (!isXY(el.at)) {
      issues.push(`element[${i}] (${id}): "at" must be [x,y] numbers`);
      return;
    }
    if (!isXY(el.size)) {
      issues.push(`element[${i}] (${id}): "size" must be [w,h] numbers`);
      return;
    }
    const [x, y] = el.at;
    const [w, h] = el.size;

    const extra = {};
    if (el.stroke != null) {
      const s = resolveColor(el.stroke, "stroke");
      if (s === undefined) {
        issues.push(`element[${i}] (${id}): unknown stroke color "${el.stroke}"`);
        return;
      }
      extra.strokeColor = s;
    }

    // `textColor` colors the label. A text element's color IS its strokeColor,
    // so resolve it once here and apply it to a standalone `text` shape and to
    // the bound text of a rect/diamond/ellipse — `stroke` (the shape border)
    // never reaches bound text, which is why it needs its own field.
    let textStroke;
    if (el.textColor != null) {
      textStroke = resolveColor(el.textColor, "stroke");
      if (textStroke === undefined) {
        issues.push(`element[${i}] (${id}): unknown textColor "${el.textColor}"`);
        return;
      }
    }

    if (kind === "text") {
      const textExtra = textStroke ? { ...extra, strokeColor: textStroke } : extra;
      raw.push(textEl(id, x, y, w, h, el.text ?? "", el.fontSize ?? 16, textExtra));
      bboxes.set(id, { x, y, w, h, type: "text" });
      return;
    }

    let fill = "transparent";
    if (el.fill != null) {
      fill = resolveColor(el.fill, "fill");
      if (fill === undefined) {
        issues.push(`element[${i}] (${id}): unknown fill color "${el.fill}"`);
        return;
      }
    }
    if (el.dashed) extra.strokeStyle = "dashed";

    const factory = kind === "rect" ? rect : kind === "diamond" ? diamond : ellipse;
    const shapeEl = factory(id, x, y, w, h, fill, extra);
    bboxes.set(id, { x, y, w, h, type: shapeEl.type });

    if (el.text != null && el.text !== "") {
      const tid = `${id}-t`;
      shapeEl.boundElements = [{ id: tid, type: "text" }];
      raw.push(
        shapeEl,
        base(tid, "text", x, y, w, h, {
          text: el.text,
          fontSize: el.fontSize ?? (kind === "diamond" ? 14 : 16),
          fontFamily: 1,
          textAlign: "center",
          verticalAlign: "middle",
          roundness: null,
          containerId: id,
          ...(textStroke ? { strokeColor: textStroke } : {}),
        })
      );
    } else {
      raw.push(shapeEl);
    }
  });

  // --- pass 2: arrows -------------------------------------------------------
  elements.forEach((el, i) => {
    if (!isArrowSugar(el)) return;
    const id = typeof el.id === "string" && el.id ? el.id : `el-${i}`;

    const extra = {};
    if (el.stroke != null) {
      const s = resolveColor(el.stroke, "stroke");
      if (s === undefined) {
        issues.push(`element[${i}] (${id}): unknown stroke color "${el.stroke}"`);
        return;
      }
      extra.strokeColor = s;
    }
    if (el.dashed) extra.strokeStyle = "dashed";
    if (el.head != null) {
      if (el.head !== "arrow" && el.head !== "none") {
        issues.push(`element[${i}] (${id}): head must be "arrow" or "none"`);
        return;
      }
      if (el.head === "none") extra.endArrowhead = null;
    }
    const labelT = el.labelT;
    if (labelT != null && (typeof labelT !== "number" || labelT < 0 || labelT > 1)) {
      issues.push(`element[${i}] (${id}): labelT must be a number in [0,1]`);
      return;
    }

    // L4 — manual escape: explicit anchor + relative points.
    if (el.points != null) {
      if (!isXY(el.at)) {
        issues.push(`element[${i}] (${id}): arrow with "points" also needs "at":[x,y]`);
        return;
      }
      raw.push(arrow(id, el.at[0], el.at[1], el.points, extra));
      if (el.text) {
        const abs = el.points.map(([dx, dy]) => [el.at[0] + dx, el.at[1] + dy]);
        pushLabel(raw, id, el.text, abs, labelT);
      }
      return;
    }

    // L1-L3 — id-anchored.
    const fromBox = bboxes.get(el.from);
    const toBox = bboxes.get(el.to);
    if (!fromBox) {
      issues.push(`element[${i}] (${id}): arrow "from" references unknown id "${el.from}"`);
      return;
    }
    if (!toBox) {
      issues.push(`element[${i}] (${id}): arrow "to" references unknown id "${el.to}"`);
      return;
    }

    let { fromSide, toSide } = el;
    if (fromSide && !SIDES.includes(fromSide)) {
      issues.push(`element[${i}] (${id}): fromSide must be one of ${SIDES.join("/")}`);
      return;
    }
    if (toSide && !SIDES.includes(toSide)) {
      issues.push(`element[${i}] (${id}): toSide must be one of ${SIDES.join("/")}`);
      return;
    }
    const fromT = el.fromT ?? 0.5;
    const toT = el.toT ?? 0.5;
    if (typeof fromT !== "number" || fromT < 0 || fromT > 1) {
      issues.push(`element[${i}] (${id}): fromT must be a number in [0,1]`);
      return;
    }
    if (typeof toT !== "number" || toT < 0 || toT > 1) {
      issues.push(`element[${i}] (${id}): toT must be a number in [0,1]`);
      return;
    }
    if (!fromSide || !toSide) {
      const [autoFrom, autoTo] = autoSides(fromBox, toBox);
      fromSide = fromSide ?? autoFrom;
      toSide = toSide ?? autoTo;
    }

    const start = edgePoint({ x: fromBox.x, y: fromBox.y, w: fromBox.w, h: fromBox.h, type: fromBox.type }, fromSide, fromT);
    const end = edgePoint({ x: toBox.x, y: toBox.y, w: toBox.w, h: toBox.h, type: toBox.type }, toSide, toT);

    let points;
    let abs;
    if (el.via != null) {
      try {
        points = routeU(start, end, { side: el.via, clearance: el.clearance ?? 60 });
      } catch (e) {
        issues.push(`element[${i}] (${id}): ${e.message}`);
        return;
      }
      abs = points.map(([dx, dy]) => [start.x + dx, start.y + dy]);
    } else {
      points = orthoPath(start, end, fromSide, toSide);
      abs = points.map(([px, py]) => [start.x + px, start.y + py]);
    }

    raw.push(arrow(id, start.x, start.y, points, extra));
    if (el.text) pushLabel(raw, id, el.text, abs, labelT);
  });

  if (issues.length > 0) throw new SugarError(issues);
  return raw;
}

/**
 * Auto-pick a (fromSide, toSide) pair from box geometry. Prefers the axis on
 * which the boxes are *disjoint* — vertical separation wins, which suits the
 * top-down / layered diagrams this serves: two boxes in adjacent rows connect
 * row-to-row even when they sit in far-apart columns. Falls back to the
 * center-delta magnitude only when the boxes overlap on both axes.
 *
 * @returns {[string, string]} [fromSide, toSide]
 */
function autoSides(fromBox, toBox) {
  const vDisjoint =
    fromBox.y + fromBox.h <= toBox.y || toBox.y + toBox.h <= fromBox.y;
  const hDisjoint =
    fromBox.x + fromBox.w <= toBox.x || toBox.x + toBox.w <= fromBox.x;
  const dx = toBox.x + toBox.w / 2 - (fromBox.x + fromBox.w / 2);
  const dy = toBox.y + toBox.h / 2 - (fromBox.y + fromBox.h / 2);
  const vertical = vDisjoint || (!hDisjoint && Math.abs(dy) > Math.abs(dx));
  if (vertical) return dy >= 0 ? ["bottom", "top"] : ["top", "bottom"];
  return dx >= 0 ? ["right", "left"] : ["left", "right"];
}

/**
 * Build a clean orthogonal point path between two edge points, given their
 * exit/entry sides. Straight when the points are axis-aligned; an L-bend
 * (one turn) for perpendicular sides; a Z-route (two turns) for parallel
 * sides with a perpendicular offset, so the arrow leaves and arrives along
 * its sides' normals instead of cutting a diagonal.
 * Returns points relative to `start` — the convention `arrow()` expects.
 */
function orthoPath(start, end, fromSide, toSide) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 || dy === 0) return [[0, 0], [dx, dy]];
  const fromV = fromSide === "top" || fromSide === "bottom";
  const toV = toSide === "top" || toSide === "bottom";
  if (fromV === toV) {
    // parallel sides → Z-route: split on the travel axis at its midpoint.
    return fromV
      ? [[0, 0], [0, dy / 2], [dx, dy / 2], [dx, dy]]
      : [[0, 0], [dx / 2, 0], [dx / 2, dy], [dx, dy]];
  }
  // perpendicular sides → L-bend: travel along fromSide's axis, then turn.
  return fromV
    ? [[0, 0], [0, dy], [dx, dy]]
    : [[0, 0], [dx, 0], [dx, dy]];
}

/**
 * Find an anchor at fraction `t` along a polyline (0 = start, 1 = end), with
 * the same `{x, y, side}` shape `labelAnchor` returns. Used when an arrow
 * pins its label position via `labelT` instead of taking the auto midpoint.
 */
function anchorAtT(absPoints, t) {
  const segs = [];
  let total = 0;
  for (let i = 0; i < absPoints.length - 1; i++) {
    const [x1, y1] = absPoints[i];
    const [x2, y2] = absPoints[i + 1];
    const len = Math.hypot(x2 - x1, y2 - y1);
    if (len === 0) continue;
    segs.push({ x1, y1, x2, y2, len, horizontal: Math.abs(x2 - x1) >= Math.abs(y2 - y1) });
    total += len;
  }
  if (segs.length === 0) throw new Error("anchorAtT: no non-degenerate segments");
  let target = Math.max(0, Math.min(1, t)) * total;
  let seg = segs[segs.length - 1];
  let frac = 1;
  for (const s of segs) {
    if (target <= s.len) {
      seg = s;
      frac = target / s.len;
      break;
    }
    target -= s.len;
  }
  const px = seg.x1 + (seg.x2 - seg.x1) * frac;
  const py = seg.y1 + (seg.y2 - seg.y1) * frac;
  const padding = 6;
  return seg.horizontal
    ? { x: px, y: py - padding, side: "above" }
    : { x: px + padding, y: py, side: "right" };
}

/**
 * Place a standalone text label alongside an arrow's polyline. The anchor is
 * the auto midpoint (`labelAnchor`) unless `labelT` pins a position along the
 * path. The anchor's `side` tells where the label sits relative to the line;
 * the box must sit fully on that side — for vertical segments that means
 * anchoring an edge of the box, not centering it (which would straddle).
 */
function pushLabel(raw, arrowId, text, absPoints, labelT) {
  const a = labelT == null ? labelAnchor(absPoints) : anchorAtT(absPoints, labelT);
  const w = Math.max(28, text.length * 9);
  const h = 18;
  let x;
  let y;
  if (a.side === "above") {
    x = a.x - w / 2;
    y = a.y - h;
  } else if (a.side === "below") {
    x = a.x - w / 2;
    y = a.y;
  } else if (a.side === "right") {
    x = a.x;
    y = a.y - h / 2;
  } else {
    x = a.x - w; // "left"
    y = a.y - h / 2;
  }
  raw.push(textEl(`${arrowId}-t`, x, y, w, h, text, 14));
}
