/**
 * Export Excalidraw diagrams to SVG and PNG.
 *
 * SVG is generated directly from element definitions (no browser required).
 * PNG is rendered from SVG using the `sharp` library.
 */

import { createRequire } from "module";

// ---------------------------------------------------------------------------
// SVG renderer
// ---------------------------------------------------------------------------

const SVG_NS = "http://www.w3.org/2000/svg";

/** Convert a roughness value to a simple SVG filter id string (unused visually but kept for parity). */
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

function renderArrow(el) {
  if (!el.points || el.points.length < 2) return "";

  const pts = el.points.map(([dx, dy]) => [el.x + dx, el.y + dy]);
  const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  const dash = strokeDashArray(el.strokeStyle);
  const markerId = `arrow-${el.id}`;

  const marker = `<marker id="${markerId}" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
  <path d="M0,0 L0,6 L8,3 z" fill="${el.strokeColor}"/>
</marker>`;

  const attrs = svgAttrs({
    d,
    fill: "none",
    stroke: el.strokeColor,
    "stroke-width": el.strokeWidth,
    "stroke-dasharray": dash,
    "marker-end": `url(#${markerId})`,
    opacity: el.opacity / 100,
  });

  return `<defs>${marker}</defs><path ${attrs}/>`;
}

function renderText(el, boundParent) {
  // Skip bound text — it will be rendered as part of its container
  if (el.containerId) return "";

  const lines = el.text.split("\n");
  const lineH = el.fontSize * 1.4;
  const totalH = lineH * lines.length;
  const baseY = el.y + (el.verticalAlign === "middle" ? (el.height - totalH) / 2 + el.fontSize : el.fontSize);

  const textEls = lines.map((line, i) => {
    const attrs = svgAttrs({
      x: el.x + el.width / 2,
      y: baseY + i * lineH,
      "text-anchor": "middle",
      "font-size": el.fontSize,
      "font-family": "ui-monospace, monospace",
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

  let cx, cy;
  if (container.type === "diamond") {
    cx = container.x + container.width / 2;
    cy = container.y + container.height / 2;
  } else {
    cx = container.x + container.width / 2;
    cy = container.y + container.height / 2;
  }

  const startY = cy - totalH / 2 + bound.fontSize;

  return lines.map((line, i) => {
    const attrs = svgAttrs({
      x: cx,
      y: startY + i * lineH,
      "text-anchor": "middle",
      "font-size": bound.fontSize,
      "font-family": "ui-monospace, monospace",
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
// PNG export (via sharp)
// ---------------------------------------------------------------------------

/**
 * Render elements to a PNG Buffer.
 * Requires `sharp` to be installed: npm install sharp
 *
 * @param {Array} elements  - flat array of element objects
 * @param {number} scale    - output scale factor (default 2 for retina)
 * @returns {Promise<Buffer>} PNG buffer
 */
export async function toPng(elements, scale = 2) {
  const svg = toSvg(elements);
  const { default: sharp } = await import("sharp");
  const vb = computeViewBox(elements.flat(Infinity).filter((e) => !e.isDeleted));
  return sharp(Buffer.from(svg))
    .resize(Math.round(vb.w * scale), Math.round(vb.h * scale))
    .png()
    .toBuffer();
}
