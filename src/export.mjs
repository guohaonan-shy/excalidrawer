/**
 * Export Excalidraw diagrams to SVG and PNG.
 *
 * SVG is generated directly from element definitions (no browser required).
 * PNG is rendered from SVG using the `sharp` library.
 */

import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, basename } from "path";

import { contentBounds, normalizeCanvas, resolveCanvas } from "./canvas.mjs";

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

/**
 * Convert an array of points to a smooth cubic bezier SVG path using
 * Catmull-Rom → Cubic Bezier conversion (matches Excalidraw's curve rendering).
 */
function catmullRomToBezierPath(pts) {
  if (pts.length < 2) return "";
  if (pts.length === 2) {
    return `M${pts[0][0]},${pts[0][1]} L${pts[1][0]},${pts[1][1]}`;
  }

  let d = `M${pts[0][0]},${pts[0][1]}`;
  const n = pts.length;

  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[Math.min(n - 1, i + 1)];
    const p3 = pts[Math.min(n - 1, i + 2)];

    // Catmull-Rom to cubic bezier control points (alpha = 0.5 / tension = 1/6)
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

    d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`;
  }

  return d;
}

// Sample the last cubic-bezier segment of a Catmull-Rom path at a point
// roughly TARGET_DIST pixels before the endpoint, and return the angle (in
// degrees) from that sample to the endpoint. Used to orient end-arrowheads
// along the *visually approaching* direction rather than the strict t=1
// tangent, which can be off when Catmull-Rom recovers from a sharp prior
// direction change (see export.mjs comment on S-curve tails).
function computeEndOrientDeg(pts, useCurve, strokeWidth) {
  const n = pts.length;
  const [px, py] = pts[n - 2];
  const [qx, qy] = pts[n - 1];
  if (!useCurve) {
    return Math.atan2(qy - py, qx - px) * 180 / Math.PI;
  }
  const p0 = pts[Math.max(0, n - 3)];
  const p1 = pts[n - 2];
  const p2 = pts[n - 1];
  const cp1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
  const cp2 = [p2[0] - (p2[0] - p1[0]) / 6, p2[1] - (p2[1] - p1[1]) / 6];
  const TARGET_DIST = Math.max(8, strokeWidth * 6);
  let bestT = 0.9;
  let bestDelta = Infinity;
  for (let t = 0.4; t < 1.0; t += 0.02) {
    const omt = 1 - t;
    const x = omt**3 * p1[0] + 3*omt**2*t * cp1[0] + 3*omt*t**2 * cp2[0] + t**3 * p2[0];
    const y = omt**3 * p1[1] + 3*omt**2*t * cp1[1] + 3*omt*t**2 * cp2[1] + t**3 * p2[1];
    const d = Math.hypot(p2[0] - x, p2[1] - y);
    const delta = Math.abs(d - TARGET_DIST);
    if (delta < bestDelta) { bestDelta = delta; bestT = t; }
  }
  const omt = 1 - bestT;
  const sx = omt**3 * p1[0] + 3*omt**2*bestT * cp1[0] + 3*omt*bestT**2 * cp2[0] + bestT**3 * p2[0];
  const sy = omt**3 * p1[1] + 3*omt**2*bestT * cp1[1] + 3*omt*bestT**2 * cp2[1] + bestT**3 * p2[1];
  return Math.atan2(p2[1] - sy, p2[0] - sx) * 180 / Math.PI;
}

function renderArrow(el) {
  if (!el.points || el.points.length < 2) return "";

  const pts = el.points.map(([dx, dy]) => [el.x + dx, el.y + dy]);
  const useCurve = el.roundness && pts.length >= 3;
  const d = useCurve
    ? catmullRomToBezierPath(pts)
    : pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  const dash = strokeDashArray(el.strokeStyle);
  const markerId = `arrow-${el.id}`;

  let markerDef = "";
  let markerEnd = null;
  if (el.endArrowhead !== null) {
    const orient = computeEndOrientDeg(pts, useCurve, el.strokeWidth).toFixed(2);
    markerDef = `<defs><marker id="${markerId}" markerWidth="12" markerHeight="12" refX="11" refY="6" orient="${orient}">
  <path d="M0,0 L12,6 L0,12" fill="none" stroke="${el.strokeColor}" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
</marker></defs>`;
    markerEnd = `url(#${markerId})`;
  }

  const attrs = svgAttrs({
    d,
    fill: "none",
    stroke: el.strokeColor,
    "stroke-width": el.strokeWidth,
    "stroke-dasharray": dash,
    "marker-end": markerEnd,
    opacity: el.opacity / 100,
  });

  return `${markerDef}<path ${attrs}/>`;
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

/** Default slack around the content when no fixed canvas is given. */
const AUTO_PADDING = 20;

/**
 * Render an array of Excalidraw elements to an SVG string.
 *
 * Without `opts.canvas` the output size is whatever the content turned out to
 * be (content-driven, the historical behaviour). With it, the output is exactly
 * the requested size and the content is fitted inside via a single wrapping
 * <g> transform — element coordinates are never rewritten.
 *
 * @param {Array} elements - flat array of element objects (from elements.mjs)
 * @param {{ canvas?: object }} [opts]
 * @returns {string} SVG markup string
 */
export function toSvg(elements, opts = {}) {
  const flat = elements.flat(Infinity).filter((e) => !e.isDeleted);

  const parts = [];

  // Embed font face declarations
  const fontCss = fontFaceCss(flat);

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
        parts.push(renderArrow(el));
        break;
      case "text":
        parts.push(renderText(el));
        break;
    }
  }

  if (opts.canvas) {
    const c = resolveCanvas(flat, opts.canvas);
    const bg =
      c.background === "transparent"
        ? ""
        : `<rect x="0" y="0" width="${c.width}" height="${c.height}" fill="${c.background}"/>`;
    return [
      `<svg xmlns="${SVG_NS}" viewBox="0 0 ${c.width} ${c.height}" width="${c.width}" height="${c.height}">`,
      ...(fontCss ? [fontCss] : []),
      ...(bg ? [bg] : []),
      `<g transform="translate(${round(c.tx)} ${round(c.ty)}) scale(${round(c.scale)})">`,
      ...parts,
      `</g>`,
      `</svg>`,
    ].join("\n");
  }

  const vb = contentBounds(flat, AUTO_PADDING);
  return [
    `<svg xmlns="${SVG_NS}" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" width="${vb.w}" height="${vb.h}">`,
    ...(fontCss ? [fontCss] : []),
    `<rect x="${vb.x}" y="${vb.y}" width="${vb.w}" height="${vb.h}" fill="white"/>`,
    ...parts,
    `</svg>`,
  ].join("\n");
}

/** Trim float noise out of transform attributes. */
function round(n) {
  return Math.round(n * 1000) / 1000;
}

// ---------------------------------------------------------------------------
// PNG export (via resvg-js)
// ---------------------------------------------------------------------------

/**
 * Render elements to a PNG Buffer.
 *
 * Uses @resvg/resvg-js for fast native SVG-to-PNG rendering.
 *
 * With a canvas, `canvas.width`/`height` ARE the pixel dimensions, so the
 * renderer is pinned to an exact output width rather than a zoom factor —
 * `scale` then acts as an extra multiplier on top (default 1, i.e. exact).
 * Without a canvas, `scale` keeps its original meaning: a zoom over the
 * content-sized SVG (default 2 for retina).
 *
 * @param {Array} elements  - flat array of element objects
 * @param {number|{scale?:number, canvas?:object}} [optsOrScale]
 * @returns {Promise<Buffer>} PNG buffer
 */
export async function toPng(elements, optsOrScale) {
  const opts = typeof optsOrScale === "number" ? { scale: optsOrScale } : (optsOrScale ?? {});
  const canvas = opts.canvas;
  const scale = opts.scale ?? (canvas ? 1 : 2);

  const svg = toSvg(elements, canvas ? { canvas } : {});
  const fontPath = join(__dirname, "fonts", "Excalifont-Regular.ttf");

  const fitTo = canvas
    ? { mode: "width", value: Math.max(1, Math.round(normalizeCanvas(canvas).width * scale)) }
    : { mode: "zoom", value: scale };

  const { Resvg } = await import("@resvg/resvg-js");
  const resvg = new Resvg(svg, {
    font: {
      fontFiles: [fontPath, ..._customFontFiles, ..._autoFontFiles],
      loadSystemFonts: false,
      defaultFontFamily: "Excalifont",
    },
    fitTo,
  });

  return Buffer.from(resvg.render().asPng());
}
