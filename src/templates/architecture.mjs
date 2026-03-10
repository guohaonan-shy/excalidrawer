/**
 * Architecture diagram template.
 *
 * Input schema:
 * {
 *   title?: string,
 *   sections: [
 *     {
 *       label: string,
 *       color?: string,         // fill color key from colors (e.g. "blue", "green")
 *       items: [ string | { label: string, color?: string, desc?: string } ]
 *     }
 *   ],
 *   connections?: [
 *     { from: string, to: string, label?: string, style?: "solid"|"dashed" }
 *   ]
 * }
 *
 * Layout:
 *   - Sections stacked vertically, each with a dashed background rect
 *   - Items within a section laid out horizontally
 *   - ITEM_W is computed dynamically from the longest label so text always has breathing room
 *   - Canvas width expands to fit both items and the title
 *   - Optional connections drawn between items across sections
 */

import { setSeed, box, arrow, textEl, rect, colors, excalidraw } from "../elements.mjs";
import { toSvg, toPng } from "../export.mjs";

// Map color name strings to actual color values
const COLOR_MAP = {
  blue:   { bg: colors.bgBlue,   fill: colors.blue,   stroke: colors.strokeBlue },
  green:  { bg: colors.bgGreen,  fill: colors.green,  stroke: colors.strokeGreen },
  yellow: { bg: colors.bgYellow, fill: colors.yellow, stroke: colors.strokeYellow },
  purple: { bg: colors.bgPurple, fill: colors.purple, stroke: colors.strokePurple },
  red:    { bg: colors.bgRed,    fill: colors.red,    stroke: "#c92a2a" },
  gray:   { bg: colors.gray,     fill: colors.gray,   stroke: colors.strokeGray },
  orange: { bg: "#fff4e6",       fill: colors.orange, stroke: colors.strokeOrange },
};

const SECTION_COLORS = ["blue", "green", "purple", "yellow", "red", "orange"];

/**
 * Estimate rendered text width without a canvas (rough heuristic).
 * CJK characters are roughly square (≈ fontSize wide).
 * ASCII characters are narrower (≈ 0.62× fontSize).
 */
function estimateLabelWidth(text, fontSize) {
  let w = 0;
  for (const ch of text) {
    w += ch.charCodeAt(0) > 0x7f ? fontSize : fontSize * 0.62;
  }
  return Math.ceil(w);
}

/**
 * Generate architecture diagram elements from structured data.
 *
 * @param {object} data - { title?, sections, connections? }
 * @param {object} [opts] - { seed?: number }
 * @returns {Array} Excalidraw element array
 */
export function architecture(data, opts = {}) {
  setSeed(opts.seed ?? 400000);

  const { title, sections, connections = [] } = data;

  // Layout constants
  const PAD = 30;             // canvas outer padding
  const SECTION_PAD = 20;     // padding inside each section rect
  const ITEM_GAP = 30;        // horizontal gap between items
  const SECTION_GAP = 30;     // vertical gap between sections
  const SECTION_LABEL_H = 28;
  const ITEM_H = 64;          // taller boxes for vertical breathing room
  const TITLE_FONT = 20;
  const ITEM_FONT = 14;
  const ITEM_PAD_X = 20;      // horizontal padding inside each item box (per side)

  // Dynamic ITEM_W: fit the longest label so no text feels cramped
  const allLabels = sections.flatMap((s) =>
    s.items.map((i) => (typeof i === "string" ? i : i.label))
  );
  const maxLabelW = Math.max(...allLabels.map((l) => estimateLabelWidth(l, ITEM_FONT)));
  const ITEM_W = Math.max(160, maxLabelW + ITEM_PAD_X * 2);

  // Canvas width: driven by items, but also wide enough for the title
  const maxItems = Math.max(...sections.map((s) => s.items.length), 1);
  const contentW = maxItems * ITEM_W + (maxItems - 1) * ITEM_GAP;
  const titleEstW = title ? estimateLabelWidth(title, TITLE_FONT) + 20 : 0;
  const sectionW = Math.max(contentW + SECTION_PAD * 2, titleEstW);
  const totalW = sectionW + PAD * 2;
  const TITLE_H = title ? 50 : 0;

  // Three rendering buckets to control z-order:
  //   bgElements  → section background rects          (bottom layer)
  //   connElements → connection arrows                 (middle layer)
  //   fgElements  → section labels, boxes, desc text  (top layer)
  //
  // This ensures arrows never obscure labels or desc captions.
  const bgElements = [];
  const fgElements = [];
  const connElements = [];

  // Title always on top
  if (title) {
    fgElements.push(
      textEl("arch-title", PAD, 14, sectionW, 32, title, TITLE_FONT, {})
    );
  }

  // Track item positions for connections
  const itemPos = new Map(); // "sectionIdx-itemIdx" and label → { cx, cy, y, h, sectionIdx }

  let curY = PAD + TITLE_H;

  sections.forEach((section, si) => {
    const colorKey = section.color || SECTION_COLORS[si % SECTION_COLORS.length];
    const palette = COLOR_MAP[colorKey] || COLOR_MAP.blue;
    const itemCount = section.items.length;

    // Section height: label + items + padding
    const sectionH = SECTION_LABEL_H + SECTION_PAD + ITEM_H + SECTION_PAD * 2;

    // Section background → bottom layer
    bgElements.push(
      rect(`sec-${si}`, PAD, curY, sectionW, sectionH, palette.bg, {
        strokeColor: palette.stroke,
        strokeStyle: "dashed",
        strokeWidth: 1.5,
      })
    );

    // Section label — use full available width so long labels are never clipped
    fgElements.push(
      textEl(`sec-${si}-lbl`, PAD + SECTION_PAD, curY + SECTION_PAD - 4,
        sectionW - SECTION_PAD * 2, SECTION_LABEL_H, section.label, 16, {
          textAlign: "left",
          strokeColor: palette.stroke,
        })
    );

    // Items — centered within section
    const itemsW = itemCount * ITEM_W + (itemCount - 1) * ITEM_GAP;
    const itemsStartX = PAD + (sectionW - itemsW) / 2;
    const itemsY = curY + SECTION_PAD + SECTION_LABEL_H + 10;

    section.items.forEach((item, ii) => {
      const itemLabel = typeof item === "string" ? item : item.label;
      const itemColor = typeof item === "object" && item.color
        ? (COLOR_MAP[item.color]?.fill || item.color)
        : palette.fill;
      const x = itemsStartX + ii * (ITEM_W + ITEM_GAP);
      // Reduce font only if the label still overflows after dynamic sizing
      const fontSize = estimateLabelWidth(itemLabel, ITEM_FONT) > ITEM_W - ITEM_PAD_X * 2 ? 12 : ITEM_FONT;

      // Item box and label → top layer
      fgElements.push(
        ...box(`item-${si}-${ii}`, `item-${si}-${ii}-t`, x, itemsY, ITEM_W, ITEM_H, itemColor, itemLabel, fontSize)
      );

      // Optional description below item → top layer
      if (typeof item === "object" && item.desc) {
        fgElements.push(
          textEl(`item-${si}-${ii}-desc`, x, itemsY + ITEM_H + 4, ITEM_W, 20, item.desc, 11, {
            textAlign: "center",
            strokeColor: "#868e96",
          })
        );
      }

      // Store position for connections (include w for same-section horizontal routing)
      const pos = { cx: x + ITEM_W / 2, cy: itemsY + ITEM_H / 2, y: itemsY, h: ITEM_H, w: ITEM_W, sectionIdx: si };
      itemPos.set(`${si}-${ii}`, pos);
      itemPos.set(itemLabel, pos);
    });

    curY += sectionH + SECTION_GAP;
  });

  // Connections → middle layer (above backgrounds, below boxes and text)
  connections.forEach((conn, ci) => {
    const fromPos = itemPos.get(conn.from);
    const toPos = itemPos.get(conn.to);
    if (!fromPos || !toPos) return;

    let startX, startY, endX, endY, points;

    if (fromPos.sectionIdx === toPos.sectionIdx) {
      // ── Same-section: horizontal arrow between item sides ──────────
      const isFromRight = fromPos.cx > toPos.cx;
      startX = isFromRight ? fromPos.cx - fromPos.w / 2 : fromPos.cx + fromPos.w / 2;
      startY = fromPos.cy;
      endX = isFromRight ? toPos.cx + toPos.w / 2 : toPos.cx - toPos.w / 2;
      endY = startY;
      points = [[0, 0], [endX - startX, 0]];
    } else {
      // ── Cross-section: vertical routing ───────────────────────────
      const fromBelow = fromPos.sectionIdx < toPos.sectionIdx;
      startX = fromPos.cx;
      startY = fromBelow ? fromPos.y + fromPos.h : fromPos.y;
      endX = toPos.cx;
      endY = fromBelow ? toPos.y : toPos.y + toPos.h;
      const dx = endX - startX;
      const dy = endY - startY;

      // Skip-layer (>1 section): route around the outside to avoid piercing
      // intermediate section backgrounds. Left side if start is left of center,
      // right side otherwise.
      const sectionSpan = Math.abs(toPos.sectionIdx - fromPos.sectionIdx);
      if (sectionSpan > 1) {
        const isLeftSide = startX < PAD + sectionW / 2;
        const sideX = isLeftSide ? PAD / 2 : PAD + sectionW + PAD / 2;
        points = [[0, 0], [sideX - startX, 0], [sideX - startX, dy], [dx, dy]];
      } else if (Math.abs(dx) > 5) {
        // Adjacent-section L-shaped path
        const midY = dy / 2;
        points = [[0, 0], [0, midY], [dx, midY], [dx, dy]];
      } else {
        points = [[0, 0], [dx, dy]];
      }
    }

    connElements.push(
      arrow(`conn-${ci}`, startX, startY, points, {
        strokeColor: "#495057",
        strokeWidth: 1.5,
        strokeStyle: conn.style || "solid",
        roundness: { type: 2 },  // smooth curved elbows
      })
    );

    if (conn.label) {
      const LW = 64;
      const LH = 20;
      const lx = (startX + endX) / 2 - LW / 2;
      const ly = (startY + endY) / 2 - LH / 2;
      // White background so the label masks the arrow line and sits cleanly on top
      fgElements.push(
        textEl(`conn-${ci}-lbl`, lx, ly, LW, LH, conn.label, 12, {
          strokeColor: "#495057",
          backgroundColor: "#ffffff",
          textAlign: "center",
        })
      );
    }
  });

  // Assemble in z-order: backgrounds → arrows → foreground
  return [...bgElements, ...connElements, ...fgElements];
}

export { excalidraw, toSvg, toPng };
