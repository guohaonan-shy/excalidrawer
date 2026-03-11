/**
 * Export Excalidraw diagrams to SVG and PNG.
 *
 * SVG is generated directly from element definitions (no browser required).
 * PNG is rendered from SVG using the `sharp` library.
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Font embedding
// ---------------------------------------------------------------------------

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
  switch (fontFamily) {
    case 1:
    case 5:
      return "Excalifont, Segoe UI Emoji, sans-serif";
    case 2:
      return "Helvetica Neue, Helvetica, Arial, sans-serif";
    case 3:
      return "Cascadia Code, Fira Code, ui-monospace, monospace";
    default:
      return "Excalifont, Segoe UI Emoji, sans-serif";
  }
}

/** Generate @font-face CSS for embedded fonts used by elements. */
function fontFaceCss(elements) {
  const needsHandDrawn = elements.some(
    (el) => el.type === "text" && (!el.fontFamily || el.fontFamily === 1 || el.fontFamily === 5)
  );
  if (!needsHandDrawn) return "";

  const b64 = getExcalifontBase64();
  return `<style>
@font-face {
  font-family: "Excalifont";
  src: url("data:font/woff2;base64,${b64}") format("woff2");
  font-weight: normal;
  font-style: normal;
}
</style>`;
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
    markerDef = `<defs><marker id="${markerId}" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
  <path d="M0,0 L0,6 L8,3 z" fill="${el.strokeColor}"/>
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
        parts.push(renderArrow(el));
        break;
      case "text":
        parts.push(renderText(el, flat));
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
// PNG export (via Playwright headless Chromium)
// ---------------------------------------------------------------------------

/**
 * Render elements to a PNG Buffer.
 *
 * Uses Playwright (headless Chromium) for accurate rendering of embedded
 * @font-face woff2 fonts (hand-drawn Excalifont).
 *
 * @param {Array} elements  - flat array of element objects
 * @param {number} scale    - output scale factor (default 2 for retina)
 * @returns {Promise<Buffer>} PNG buffer
 */
export async function toPng(elements, scale = 2) {
  const svg = toSvg(elements);
  const flat = elements.flat(Infinity).filter((e) => !e.isDeleted);
  const vb = computeViewBox(flat);

  const { chromium } = await import("playwright-core");
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({
      viewport: {
        width: Math.ceil(vb.w * scale),
        height: Math.ceil(vb.h * scale),
      },
      deviceScaleFactor: scale,
    });

    // Load SVG as data URI so embedded @font-face works
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; }
  body { width: ${vb.w}px; height: ${vb.h}px; overflow: hidden; }
</style></head><body>${svg}</body></html>`;

    await page.setContent(html, { waitUntil: "networkidle" });
    // Wait for fonts to load
    await page.evaluate(() => document.fonts.ready);

    const png = await page.screenshot({
      type: "png",
      clip: { x: 0, y: 0, width: vb.w, height: vb.h },
      omitBackground: false,
    });

    return png;
  } finally {
    await browser.close();
  }
}
