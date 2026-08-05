/**
 * canvas — fixed-size output geometry.
 *
 * The default pipeline is content-driven: elements are laid out, their bounding
 * box is measured, and the output is however big that turned out to be. A
 * canvas inverts it — the output size is fixed up front and the content is
 * fitted into it. That is what publishing surfaces need: a 小红书 cover is 3:4
 * whether or not the diagram happens to be.
 *
 * This module is pure geometry. It knows nothing about platforms; a caller that
 * wants "小红书 cover" resolves that to width/height first (see src/presets/).
 *
 * The transform it produces maps content coordinates into canvas coordinates:
 *
 *     canvasX = contentX * scale + tx
 *     canvasY = contentY * scale + ty
 *
 * Element coordinates are never mutated — SVG applies the transform with a
 * single wrapping <g>, and the .excalidraw file keeps the original coordinates
 * so the diagram stays editable at its authored scale.
 */

/** Fraction of the canvas's short edge used as default inner padding. */
const DEFAULT_PADDING_FRAC = 0.06;

const FIT_MODES = new Set(["contain", "pad", "none"]);

const ALIGNMENTS = {
  center: [0.5, 0.5],
  top: [0.5, 0],
  bottom: [0.5, 1],
  left: [0, 0.5],
  right: [1, 0.5],
  "top-left": [0, 0],
  "top-right": [1, 0],
  "bottom-left": [0, 1],
  "bottom-right": [1, 1],
};

/** Thrown on a malformed canvas spec. Carries `.issues`. */
export class CanvasError extends Error {
  constructor(issues) {
    super(`invalid canvas: ${issues.join("; ")}`);
    this.name = "CanvasError";
    this.issues = issues;
  }
}

/**
 * Parse "3:4", "1.91:1", "16/9" or a bare number into width/height.
 * @returns {number} width divided by height, or NaN when unparseable
 */
export function parseRatio(ratio) {
  if (typeof ratio === "number") return ratio;
  if (typeof ratio !== "string") return NaN;
  const m = ratio.trim().match(/^([0-9.]+)\s*[:/]\s*([0-9.]+)$/);
  if (m) {
    const w = Number(m[1]);
    const h = Number(m[2]);
    if (w > 0 && h > 0) return w / h;
    return NaN;
  }
  const n = Number(ratio);
  return Number.isFinite(n) && n > 0 ? n : NaN;
}

function normalizeSafe(safe, issues) {
  const out = { top: 0, right: 0, bottom: 0, left: 0 };
  if (safe == null) return out;
  if (typeof safe !== "object" || Array.isArray(safe)) {
    issues.push("canvas.safe must be an object like { top, right, bottom, left }");
    return out;
  }
  for (const side of ["top", "right", "bottom", "left"]) {
    const v = safe[side];
    if (v == null) continue;
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0) {
      issues.push(`canvas.safe.${side} must be a non-negative number`);
      continue;
    }
    out[side] = v;
  }
  return out;
}

/**
 * Validate a canvas spec and fill in defaults.
 *
 * Accepts `width` + `height`, or `ratio` plus exactly one of the two.
 *
 * `safe` is an AVOIDANCE band, not an advisory one: it shrinks the usable box,
 * so content is laid out clear of the platform's UI by construction. That is
 * why there is no "you are under the title bar" warning to go with it — the
 * only way inside a safe area is to overflow the canvas outright.
 *
 * @param {object} spec
 * @returns {{width:number, height:number, padding:number, safe:object, fit:string, align:string, background:string}}
 * @throws {CanvasError}
 */
export function normalizeCanvas(spec) {
  const issues = [];
  if (typeof spec !== "object" || spec === null || Array.isArray(spec)) {
    throw new CanvasError(["canvas must be an object"]);
  }

  let { width, height } = spec;
  const hasW = typeof width === "number" && Number.isFinite(width) && width > 0;
  const hasH = typeof height === "number" && Number.isFinite(height) && height > 0;

  if (spec.ratio != null && !(hasW && hasH)) {
    const r = parseRatio(spec.ratio);
    if (!Number.isFinite(r) || r <= 0) {
      issues.push(`canvas.ratio "${spec.ratio}" must look like "3:4" or a positive number`);
    } else if (hasW) {
      height = Math.round(width / r);
    } else if (hasH) {
      width = Math.round(height * r);
    } else {
      issues.push("canvas.ratio needs one of width or height to resolve against");
    }
  } else if (!hasW || !hasH) {
    issues.push("canvas requires width and height (or ratio plus one of them)");
  }

  const fit = spec.fit ?? "contain";
  if (!FIT_MODES.has(fit)) {
    issues.push(`canvas.fit must be one of: ${[...FIT_MODES].join(", ")}`);
  }

  const align = spec.align ?? "center";
  if (!(align in ALIGNMENTS)) {
    issues.push(`canvas.align must be one of: ${Object.keys(ALIGNMENTS).join(", ")}`);
  }

  if (spec.padding != null && (typeof spec.padding !== "number" || !Number.isFinite(spec.padding) || spec.padding < 0)) {
    issues.push("canvas.padding must be a non-negative number");
  }

  const background = spec.background ?? "#ffffff";
  if (typeof background !== "string") {
    issues.push("canvas.background must be a color string or \"transparent\"");
  }

  const safe = normalizeSafe(spec.safe, issues);

  if (issues.length > 0) throw new CanvasError(issues);

  const padding =
    spec.padding != null
      ? spec.padding
      : Math.round(Math.min(width, height) * DEFAULT_PADDING_FRAC);

  const inner = {
    w: width - padding * 2 - safe.left - safe.right,
    h: height - padding * 2 - safe.top - safe.bottom,
  };
  if (inner.w <= 0 || inner.h <= 0) {
    throw new CanvasError([
      `canvas padding (${padding}) and safe area leave no room inside ${width}×${height}`,
    ]);
  }

  return { width, height, padding, safe, fit, align, background };
}

/**
 * Bounding box of the drawable content, in element coordinates.
 *
 * Bound text is skipped (it is drawn inside its container) and arrows are
 * measured through their relative points.
 *
 * @param {Array} elements - flat, non-deleted raw elements
 * @param {number} [padding] - slack added on every side
 * @returns {{x:number, y:number, w:number, h:number}}
 */
export function contentBounds(elements, padding = 0) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const el of elements) {
    if (el.type === "text" && el.containerId) continue; // drawn by its container
    if (el.type === "arrow" && el.points) {
      for (const [dx, dy] of el.points) {
        minX = Math.min(minX, el.x + dx);
        minY = Math.min(minY, el.y + dy);
        maxX = Math.max(maxX, el.x + dx);
        maxY = Math.max(maxY, el.y + dy);
      }
    } else {
      minX = Math.min(minX, el.x);
      minY = Math.min(minY, el.y);
      maxX = Math.max(maxX, el.x + (el.width || 0));
      maxY = Math.max(maxY, el.y + (el.height || 0));
    }
  }

  if (!Number.isFinite(minX)) return { x: 0, y: 0, w: 0, h: 0 };

  return {
    x: minX - padding,
    y: minY - padding,
    w: maxX - minX + padding * 2,
    h: maxY - minY + padding * 2,
  };
}

/**
 * Work out how the content sits inside a fixed canvas.
 *
 * @param {Array} elements - flat, non-deleted raw elements
 * @param {object} spec - raw canvas spec (see normalizeCanvas)
 * @returns {{
 *   width:number, height:number, scale:number, tx:number, ty:number,
 *   background:string, padding:number, safe:object,
 *   inner:{x:number,y:number,w:number,h:number},
 *   content:{x:number,y:number,w:number,h:number},
 *   fill:number, overflow:boolean
 * }}
 * @throws {CanvasError}
 */
export function resolveCanvas(elements, spec) {
  const c = normalizeCanvas(spec);
  const content = contentBounds(elements);

  const inner = {
    x: c.padding + c.safe.left,
    y: c.padding + c.safe.top,
    w: c.width - c.padding * 2 - c.safe.left - c.safe.right,
    h: c.height - c.padding * 2 - c.safe.top - c.safe.bottom,
  };

  // An empty diagram has no box to fit; fall through at 1:1 rather than
  // dividing by zero.
  const sx = content.w > 0 ? inner.w / content.w : 1;
  const sy = content.h > 0 ? inner.h / content.h : 1;

  let scale;
  if (c.fit === "none") scale = 1;
  else if (c.fit === "pad") scale = Math.min(1, sx, sy);
  else scale = Math.min(sx, sy);

  const [ax, ay] = ALIGNMENTS[c.align];
  const usedW = content.w * scale;
  const usedH = content.h * scale;

  const tx = inner.x + (inner.w - usedW) * ax - content.x * scale;
  const ty = inner.y + (inner.h - usedH) * ay - content.y * scale;

  // Fraction of the usable area the content actually covers. Under `contain`
  // one axis always fills completely, so this reports the other axis — i.e.
  // how badly the content's aspect ratio disagrees with the canvas's.
  const fill = inner.w > 0 && inner.h > 0 ? (usedW * usedH) / (inner.w * inner.h) : 0;

  return {
    width: c.width,
    height: c.height,
    scale,
    tx,
    ty,
    background: c.background,
    padding: c.padding,
    safe: c.safe,
    inner,
    content,
    fill,
    overflow: usedW > inner.w + 0.5 || usedH > inner.h + 0.5,
  };
}
