/**
 * Export Excalidraw diagrams to SVG and PNG.
 *
 * SVG is generated directly from element definitions (no browser required).
 * PNG is rendered from SVG using the `sharp` library.
 */

import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, basename } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Font embedding
// ---------------------------------------------------------------------------

/**
 * Register custom font files (e.g. CJK fonts) for use in SVG and PNG export.
 * Call this once before toSvg() / toPng() — fonts will be embedded in SVG
 * @font-face declarations and loaded into the Resvg renderer for PNG export.
 *
 * @param {string | string[]} fontPaths - absolute path(s) to TTF / OTF / WOFF2 font files
 *
 * @example
 * // macOS system font
 * registerFonts("/System/Library/Fonts/PingFang.ttc");
 *
 * // multiple fonts
 * registerFonts(["/path/to/NotoSansCJK.ttf", "/path/to/other.ttf"]);
 */
export function registerFonts(fontPaths) {
  _customFontFiles = Array.isArray(fontPaths) ? fontPaths : [fontPaths];
}

let _customFontFiles = [];

// ---------------------------------------------------------------------------
// Automatic CJK font support
// ---------------------------------------------------------------------------

/**
 * Resvg-loaded fonts that are NOT embedded in SVG (full CJK fonts can be tens
 * of MB; embedding would bloat every output). SVG output instead extends its
 * font-family chain with common CJK family names so the viewer's locally
 * installed CJK font (PingFang on macOS, Noto on Linux, YaHei on Windows)
 * picks up the glyphs.
 */
let _autoFontFiles = [];
let _hasCjkText = false;

// First existing path wins. Order: macOS → Linux → Windows.
const CJK_FONT_CANDIDATES = [
  "/System/Library/Fonts/PingFang.ttc",
  "/System/Library/Fonts/STHeiti Light.ttc",
  "/System/Library/Fonts/Hiragino Sans GB.ttc",
  "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
  "/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc",
  "/usr/share/fonts/google-noto-cjk/NotoSansCJK-Regular.ttc",
  "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
  "/usr/share/fonts/wqy-microhei/wqy-microhei.ttc",
  "C:\\Windows\\Fonts\\msyh.ttc",
  "C:\\Windows\\Fonts\\msyh.ttf",
  "C:\\Windows\\Fonts\\simsun.ttc",
];

// CJK character ranges: Hiragana / Katakana / CJK Extension A / main CJK /
// Compatibility Ideographs / Hangul Syllables, plus CJK Symbols & Punctuation.
const CJK_REGEX = /[　-ヿ㐀-䶿一-鿿豈-﫿가-힯]/;

// Family-name fallback chain for SVG viewers, listed by likelihood of presence.
const CJK_SVG_FALLBACKS = [
  "'PingFang SC'",
  "'Hiragino Sans'",
  "'Hiragino Sans GB'",
  "'Microsoft YaHei'",
  "'Noto Sans CJK SC'",
  "'WenQuanYi Micro Hei'",
];

/**
 * Detect CJK text in the given elements and, if found, load a system CJK font
 * for PNG rendering. Idempotent (the resvg font path is cached after first
 * discovery; re-runs reflect the CJK state of the current element batch in
 * `_hasCjkText`, which drives the SVG font-family fallback chain).
 *
 * Called automatically by `render()`. Library users calling `toSvg`/`toPng`
 * directly may call it themselves.
 */
export function autoRegisterCjkFont(elements) {
  const hasCjk = Array.isArray(elements) && elements.some(
    (el) => el && el.type === "text" && typeof el.text === "string" && CJK_REGEX.test(el.text)
  );
  _hasCjkText = hasCjk;
  if (!hasCjk || _autoFontFiles.length > 0) return;
  for (const candidate of CJK_FONT_CANDIDATES) {
    try {
      if (existsSync(candidate)) {
        _autoFontFiles = [candidate];
        return;
      }
    } catch {
      // ignore permission / IO errors and try the next candidate
    }
  }
  // No system CJK font found. PNG will render tofu boxes for CJK glyphs;
  // SVG will fall back to viewer's system font via CJK_SVG_FALLBACKS.
}

/** Load Excalifont as base64 for SVG embedding. */
let _excalifontBase64 = null;
function getExcalifontBase64() {
  if (!_excalifontBase64) {
    const fontPath = join(__dirname, "fonts", "Excalifont-Regular.woff2");
    _excalifontBase64 = readFileSync(fontPath).toString("base64");
  }
  return _excalifontBase64;
}

/**
 * Font family mapping: Excalidraw fontFamily number → CSS font stack.
 *  1 = Virgil (hand-drawn)
 *  2 = Helvetica (clean)
 *  3 = Cascadia (monospace)
 *  5 = Excalifont (legacy, map to Virgil)
 */
function cssFontFamily(fontFamily) {
  // Append registered custom fonts as fallbacks so their glyphs are used
  // when the primary font doesn't cover a character (e.g. CJK).
  // Use single quotes for multi-word names — SVG text attributes are
  // already wrapped in double quotes by svgAttrs(), so inner double
  // quotes would break XML parsing.
  const customFamilies = _customFontFiles
    .map((fp) => {
      const family = basename(fp).replace(/\.[^.]+$/, "");
      return family.includes(" ") ? `'${family}'` : family;
    })
    .join(", ");
  const fallback = customFamilies ? `, ${customFamilies}` : "";
  const cjkFallback = _hasCjkText ? `, ${CJK_SVG_FALLBACKS.join(", ")}` : "";

  switch (fontFamily) {
    case 1:
    case 5:
      return `Excalifont, Segoe UI Emoji${fallback}${cjkFallback}, sans-serif`;
    case 2:
      return `Helvetica Neue, Helvetica, Arial${fallback}${cjkFallback}, sans-serif`;
    case 3:
      return `Cascadia Code, Fira Code, ui-monospace${fallback}${cjkFallback}, monospace`;
    default:
      return `Excalifont, Segoe UI Emoji${fallback}${cjkFallback}, sans-serif`;
  }
}

/** Generate @font-face CSS for embedded fonts used by elements. */
function fontFaceCss(elements) {
  const faces = [];

  // Excalifont — hand-drawn style (fontFamily 1 / 5)
  const needsHandDrawn = elements.some(
    (el) => el.type === "text" && (!el.fontFamily || el.fontFamily === 1 || el.fontFamily === 5)
  );
  if (needsHandDrawn) {
    const b64 = getExcalifontBase64();
    faces.push(`@font-face {
  font-family: "Excalifont";
  src: url("data:font/woff2;base64,${b64}") format("woff2");
  font-weight: normal;
  font-style: normal;
}`);
  }

  // Custom fonts (e.g. CJK fonts for Chinese / Japanese / Korean text)
  for (const fp of _customFontFiles) {
    const b64 = readFileSync(fp).toString("base64");
    const ext = fp.split(".").pop().toLowerCase();
    const fmt = ext === "woff2" ? "woff2" : ext === "otf" ? "opentype" : "truetype";
    const family = basename(fp).replace(/\.[^.]+$/, "");
    faces.push(`@font-face {
  font-family: "${family}";
  src: url("data:font/${fmt};base64,${b64}") format("${fmt}");
  font-weight: normal;
  font-style: normal;
}`);
  }

  if (faces.length === 0) return "";
  return `<style>\n${faces.join("\n")}\n</style>`;
}

// ---------------------------------------------------------------------------
// SVG renderer
// ---------------------------------------------------------------------------

const SVG_NS = "http://www.w3.org/2000/svg";

function strokeDashArray(strokeStyle) {
  if (strokeStyle === "dashed") return "8,4";
  if (strokeStyle === "dotted") return "2,4";
  return null;
}

function svgAttrs(obj) {
  return Object.entries(obj)
    .filter(([, v]) => v != null)
    .map(([k, v]) => `${k}="${v}"`)
    .join(" ");
}

function renderRect(el) {
  const r = el.roundness ? 8 : 0;
  const dash = strokeDashArray(el.strokeStyle);
  const attrs = svgAttrs({
    x: el.x, y: el.y, width: el.width, height: el.height,
    rx: r, ry: r,
    fill: el.backgroundColor === "transparent" ? "none" : el.backgroundColor,
    stroke: el.strokeColor,
    "stroke-width": el.strokeWidth,
    "stroke-dasharray": dash,
    opacity: el.opacity / 100,
  });
  return `<rect ${attrs}/>`;
}

function renderDiamond(el) {
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  const points = [
    `${cx},${el.y}`,
    `${el.x + el.width},${cy}`,
    `${cx},${el.y + el.height}`,
    `${el.x},${cy}`,
  ].join(" ");
  const dash = strokeDashArray(el.strokeStyle);
  const attrs = svgAttrs({
    points,
    fill: el.backgroundColor === "transparent" ? "none" : el.backgroundColor,
    stroke: el.strokeColor,
    "stroke-width": el.strokeWidth,
    "stroke-dasharray": dash,
    opacity: el.opacity / 100,
  });
  return `<polygon ${attrs}/>`;
}

function renderEllipse(el) {
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  const dash = strokeDashArray(el.strokeStyle);
  const attrs = svgAttrs({
    cx, cy, rx: el.width / 2, ry: el.height / 2,
    fill: el.backgroundColor === "transparent" ? "none" : el.backgroundColor,
    stroke: el.strokeColor,
    "stroke-width": el.strokeWidth,
    "stroke-dasharray": dash,
    opacity: el.opacity / 100,
  });
  return `<ellipse ${attrs}/>`;
}

// ---------------------------------------------------------------------------
// Linear elements (arrow / line) — geometry mirrors Excalidraw
// ---------------------------------------------------------------------------

// Excalidraw's per-arrowhead size (px) and half-angle (deg) — see
// getArrowheadSize / getArrowheadAngle in excalidraw/packages/element/src/bounds.ts.
// Sizes are absolute, NOT scaled by strokeWidth.
const ARROWHEAD_SIZE = { arrow: 25, diamond: 12, diamond_outline: 12 };
const ARROWHEAD_ANGLE = { arrow: 20, bar: 90 };
const ELBOW_RADIUS = 16;

/** Catmull-Rom control points for segment i (the curve Excalidraw / roughjs draws). */
function catmullRomSegments(pts) {
  const n = pts.length;
  const segs = [];
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(n - 1, i + 2)];
    segs.push([
      p1,
      [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6],
      [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6],
      p2,
    ]);
  }
  return segs;
}

function bezierAt([a, b, c, d], t) {
  const u = 1 - t;
  return [
    u ** 3 * a[0] + 3 * u ** 2 * t * b[0] + 3 * u * t ** 2 * c[0] + t ** 3 * d[0],
    u ** 3 * a[1] + 3 * u ** 2 * t * b[1] + 3 * u * t ** 2 * c[1] + t ** 3 * d[1],
  ];
}

/** Elbow path: orthogonal polyline with each corner rounded (Excalidraw's generateElbowArrowShape). */
function elbowPath(pts) {
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1];
    const [x, y] = pts[i];
    const [nx, ny] = pts[i + 1];
    const r = Math.min(ELBOW_RADIUS, Math.hypot(x - px, y - py) / 2, Math.hypot(nx - x, ny - y) / 2);
    const toward = (ax, ay) => {
      const l = Math.hypot(ax - x, ay - y) || 1;
      return [x + ((ax - x) / l) * r, y + ((ay - y) / l) * r];
    };
    const a = toward(px, py);
    const b = toward(nx, ny);
    d += ` L${a[0]},${a[1]} Q${x},${y} ${b[0]},${b[1]}`;
  }
  const last = pts[pts.length - 1];
  return d + ` L${last[0]},${last[1]}`;
}

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/**
 * The drawn path of a linear element plus a dense polyline approximation of
 * it (`samples`), used to aim arrowheads along what is actually on screen.
 */
function linearGeometry(el, pts) {
  if (el.elbowed && pts.length >= 3) {
    return { d: elbowPath(pts), samples: pts };
  }
  if (el.roundness && pts.length >= 3) {
    const segs = catmullRomSegments(pts);
    let d = `M${pts[0][0]},${pts[0][1]}`;
    const samples = [pts[0]];
    for (const seg of segs) {
      d += ` C${seg[1][0]},${seg[1][1]} ${seg[2][0]},${seg[2][1]} ${seg[3][0]},${seg[3][1]}`;
      for (let k = 1; k <= 24; k++) samples.push(bezierAt(seg, k / 24));
    }
    return { d, samples };
  }
  return {
    d: pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" "),
    samples: pts,
  };
}

/** Walk `samples` back from the last point by arc length `dist`; return that point. */
function pointBackAlong(samples, dist) {
  let acc = 0;
  for (let i = samples.length - 1; i > 0; i--) {
    const [ax, ay] = samples[i];
    const [bx, by] = samples[i - 1];
    const seg = Math.hypot(ax - bx, ay - by);
    if (acc + seg >= dist) {
      const t = (dist - acc) / (seg || 1);
      return [ax + (bx - ax) * t, ay + (by - ay) * t];
    }
    acc += seg;
  }
  return samples[0];
}

/**
 * SVG for one arrowhead. Like Excalidraw, the head is sized
 * min(size, lastSegment / 2) and drawn as real geometry (not an SVG marker).
 * Its axis runs from the tip to the point one head-length back *along the
 * drawn curve*, so on a curved tail the head stays centered on the line —
 * the old marker sampled only ~12px back while drawing a 24px head, which
 * is what made curved arrows look lopsided.
 */
/** Excalidraw's head size: min(per-kind size, last segment × ½ (¼ for diamonds)). */
function arrowheadSize(kind, pts) {
  const lastLen = dist(pts[pts.length - 1], pts[pts.length - 2]);
  const isDiamond = kind === "diamond" || kind === "diamond_outline";
  return Math.min(ARROWHEAD_SIZE[kind] ?? 15, lastLen * (isDiamond ? 0.25 : 0.5));
}

function renderArrowhead(el, kind, pts, samples) {
  const [tx, ty] = pts[pts.length - 1];
  const size = arrowheadSize(kind, pts);
  if (!(size > 0)) return "";

  const [bx, by] = pointBackAlong(samples, size);
  const len = Math.hypot(tx - bx, ty - by) || 1;
  const nx = (tx - bx) / len;
  const ny = (ty - by) / len;
  const xs = tx - nx * size;
  const ys = ty - ny * size;
  const rot = (deg) => {
    const a = (deg * Math.PI) / 180;
    const dx = xs - tx, dy = ys - ty;
    return [tx + dx * Math.cos(a) - dy * Math.sin(a), ty + dx * Math.sin(a) + dy * Math.cos(a)];
  };
  const angle = ARROWHEAD_ANGLE[kind] ?? 25;
  const [x3, y3] = rot(-angle);
  const [x4, y4] = rot(angle);
  const f = (n) => +n.toFixed(2);

  const outline = kind.endsWith("_outline");
  const common = {
    stroke: el.strokeColor,
    "stroke-width": el.strokeWidth,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    opacity: el.opacity / 100,
  };
  switch (kind) {
    case "circle":
    case "circle_outline": {
      const r = (size + el.strokeWidth - 2) / 2;
      return `<circle ${svgAttrs({ cx: f(tx), cy: f(ty), r: f(r), fill: outline ? "#ffffff" : el.strokeColor, ...common })}/>`;
    }
    case "triangle":
    case "triangle_outline":
      return `<path ${svgAttrs({ d: `M${f(tx)},${f(ty)} L${f(x3)},${f(y3)} L${f(x4)},${f(y4)} Z`, fill: outline ? "#ffffff" : el.strokeColor, ...common })}/>`;
    case "diamond":
    case "diamond_outline": {
      const ox = tx - nx * size * 2;
      const oy = ty - ny * size * 2;
      return `<path ${svgAttrs({ d: `M${f(tx)},${f(ty)} L${f(x3)},${f(y3)} L${f(ox)},${f(oy)} L${f(x4)},${f(y4)} Z`, fill: outline ? "#ffffff" : el.strokeColor, ...common })}/>`;
    }
    default: // "arrow", "bar"
      return `<path ${svgAttrs({ d: `M${f(x3)},${f(y3)} L${f(tx)},${f(ty)} L${f(x4)},${f(y4)}`, fill: "none", ...common })}/>`;
  }
}

function renderLinear(el) {
  if (!el.points || el.points.length < 2) return "";

  const pts = el.points.map(([dx, dy]) => [el.x + dx, el.y + dy]);
  const { d, samples } = linearGeometry(el, pts);

  const attrs = svgAttrs({
    d,
    fill: "none",
    stroke: el.strokeColor,
    "stroke-width": el.strokeWidth,
    "stroke-dasharray": strokeDashArray(el.strokeStyle),
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    opacity: el.opacity / 100,
  });
  const parts = [`<path ${attrs}/>`];

  if (el.type === "arrow") {
    if (el.endArrowhead != null) {
      parts.push(renderArrowhead(el, el.endArrowhead, pts, samples));
    }
    if (el.startArrowhead != null) {
      const rev = [...pts].reverse();
      parts.push(renderArrowhead(el, el.startArrowhead, rev, [...samples].reverse()));
    }
  }
  return parts.join("");
}

function renderText(el) {
  // Skip bound text — it will be rendered as part of its container
  if (el.containerId) return "";

  const lines = el.text.split("\n");
  const lineH = el.fontSize * 1.4;
  const totalH = lineH * lines.length;
  const baseY = el.y + (el.verticalAlign === "middle" ? (el.height - totalH) / 2 + el.fontSize : el.fontSize);
  const fontFamily = cssFontFamily(el.fontFamily);

  const textEls = lines.map((line, i) => {
    const attrs = svgAttrs({
      x: el.x + el.width / 2,
      y: baseY + i * lineH,
      "text-anchor": "middle",
      "font-size": el.fontSize,
      "font-family": fontFamily,
      fill: el.strokeColor,
      opacity: el.opacity / 100,
    });
    return `<text ${attrs}>${escapeXml(line)}</text>`;
  });

  return textEls.join("\n");
}

function renderBoundText(container, elements) {
  const bound = elements.find(
    (e) => e.type === "text" && e.containerId === container.id
  );
  if (!bound) return "";

  const lines = bound.text.split("\n");
  const lineH = bound.fontSize * 1.4;
  const totalH = lineH * lines.length;
  const fontFamily = cssFontFamily(bound.fontFamily);

  const cx = container.x + container.width / 2;
  const cy = container.y + container.height / 2;
  const startY = cy - totalH / 2 + bound.fontSize;

  return lines.map((line, i) => {
    const attrs = svgAttrs({
      x: cx,
      y: startY + i * lineH,
      "text-anchor": "middle",
      "font-size": bound.fontSize,
      "font-family": fontFamily,
      fill: bound.strokeColor,
      opacity: bound.opacity / 100,
    });
    return `<text ${attrs}>${escapeXml(line)}</text>`;
  }).join("\n");
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Compute the bounding box of all elements with a small padding.
 */
function computeViewBox(elements, padding = 20) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const el of elements) {
    if (el.type === "text" && el.containerId) continue; // skip bound text
    if ((el.type === "arrow" || el.type === "line") && el.points) {
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

  return {
    x: minX - padding,
    y: minY - padding,
    w: maxX - minX + padding * 2,
    h: maxY - minY + padding * 2,
  };
}

/**
 * Render an array of Excalidraw elements to an SVG string.
 *
 * @param {Array} elements - flat array of element objects (from elements.mjs)
 * @returns {string} SVG markup string
 */
export function toSvg(elements) {
  const flat = elements.flat(Infinity).filter((e) => !e.isDeleted);
  const vb = computeViewBox(flat);

  const parts = [];

  // Embed font face declarations
  const fontCss = fontFaceCss(flat);
  if (fontCss) parts.push(fontCss);

  for (const el of flat) {
    switch (el.type) {
      case "rectangle":
        parts.push(renderRect(el));
        parts.push(renderBoundText(el, flat));
        break;
      case "diamond":
        parts.push(renderDiamond(el));
        parts.push(renderBoundText(el, flat));
        break;
      case "ellipse":
        parts.push(renderEllipse(el));
        parts.push(renderBoundText(el, flat));
        break;
      case "arrow":
      case "line":
        parts.push(renderLinear(el));
        break;
      case "text":
        parts.push(renderText(el));
        break;
    }
  }

  return [
    `<svg xmlns="${SVG_NS}" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" width="${vb.w}" height="${vb.h}">`,
    `<rect x="${vb.x}" y="${vb.y}" width="${vb.w}" height="${vb.h}" fill="white"/>`,
    ...parts,
    `</svg>`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// PNG export (via resvg-js)
// ---------------------------------------------------------------------------

/**
 * Render elements to a PNG Buffer.
 *
 * Uses @resvg/resvg-js for fast native SVG-to-PNG rendering.
 *
 * @param {Array} elements  - flat array of element objects
 * @param {number} scale    - output scale factor (default 2 for retina)
 * @returns {Promise<Buffer>} PNG buffer
 */
export async function toPng(elements, scale = 2) {
  const svg = toSvg(elements);
  const fontPath = join(__dirname, "fonts", "Excalifont-Regular.ttf");

  const { Resvg } = await import("@resvg/resvg-js");
  const resvg = new Resvg(svg, {
    font: {
      fontFiles: [fontPath, ..._customFontFiles, ..._autoFontFiles],
      loadSystemFonts: false,
      defaultFontFamily: "Excalifont",
    },
    fitTo: { mode: "zoom", value: scale },
  });

  return Buffer.from(resvg.render().asPng());
}
