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
 *   - Optional connections drawn between items across sections
 */

import { setSeed, box, arrow, textEl, rect, colors, excalidraw } from "../elements.mjs";
import { toSvg, toPng } from "../export.mjs";

// Map color name strings to actual color values
const COLOR_MAP = {
  blue: { bg: colors.bgBlue, fill: colors.blue, stroke: colors.strokeBlue },
  green: { bg: colors.bgGreen, fill: colors.green, stroke: colors.strokeGreen },
  yellow: { bg: colors.bgYellow, fill: colors.yellow, stroke: colors.strokeYellow },
  purple: { bg: colors.bgPurple, fill: colors.purple, stroke: colors.strokePurple },
  red: { bg: colors.bgRed, fill: colors.red, stroke: "#c92a2a" },
  gray: { bg: colors.gray, fill: colors.gray, stroke: colors.strokeGray },
  orange: { bg: "#fff4e6", fill: colors.orange, stroke: colors.strokeOrange },
};

const SECTION_COLORS = ["blue", "green", "purple", "yellow", "red", "orange"];

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
  const PAD = 30;
  const SECTION_PAD = 20;
  const ITEM_W = 150;
  const ITEM_H = 52;
  const ITEM_GAP = 30;
  const SECTION_GAP = 30;
  const SECTION_LABEL_H = 28;
  const TITLE_H = title ? 50 : 0;

  // Compute max items per section to determine total width
  const maxItems = Math.max(...sections.map((s) => s.items.length), 1);
  const contentW = maxItems * ITEM_W + (maxItems - 1) * ITEM_GAP;
  const sectionW = contentW + SECTION_PAD * 2;
  const totalW = sectionW + PAD * 2;

  const elements = [];

  // Title
  if (title) {
    elements.push(
      textEl("arch-title", PAD, 14, sectionW, 32, title, 24, {})
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

    // Section background
    elements.push(
      rect(`sec-${si}`, PAD, curY, sectionW, sectionH, palette.bg, {
        strokeColor: palette.stroke,
        strokeStyle: "dashed",
        strokeWidth: 1.5,
      })
    );

    // Section label
    elements.push(
      textEl(`sec-${si}-lbl`, PAD + SECTION_PAD, curY + SECTION_PAD - 4, 200, SECTION_LABEL_H, section.label, 16, {
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
      const fontSize = itemLabel.length > 18 ? 12 : 14;

      elements.push(
        ...box(`item-${si}-${ii}`, `item-${si}-${ii}-t`, x, itemsY, ITEM_W, ITEM_H, itemColor, itemLabel, fontSize)
      );

      // Optional description below item
      if (typeof item === "object" && item.desc) {
        elements.push(
          textEl(`item-${si}-${ii}-desc`, x, itemsY + ITEM_H + 4, ITEM_W, 20, item.desc, 11, {
            textAlign: "center",
            strokeColor: "#868e96",
          })
        );
      }

      // Store position for connections
      const pos = { cx: x + ITEM_W / 2, cy: itemsY + ITEM_H / 2, y: itemsY, h: ITEM_H, sectionIdx: si };
      itemPos.set(`${si}-${ii}`, pos);
      itemPos.set(itemLabel, pos);
    });

    curY += sectionH + SECTION_GAP;
  });

  // Connections between items
  connections.forEach((conn, ci) => {
    const fromPos = itemPos.get(conn.from);
    const toPos = itemPos.get(conn.to);
    if (!fromPos || !toPos) return;

    const fromBelow = fromPos.sectionIdx < toPos.sectionIdx;
    const startX = fromPos.cx;
    const startY = fromBelow ? fromPos.y + fromPos.h : fromPos.y;
    const endX = toPos.cx;
    const endY = fromBelow ? toPos.y : toPos.y + toPos.h;

    const dx = endX - startX;
    const dy = endY - startY;

    // Use L-shaped path if not vertically aligned
    let points;
    if (Math.abs(dx) > 5) {
      const midY = dy / 2;
      points = [[0, 0], [0, midY], [dx, midY], [dx, dy]];
    } else {
      points = [[0, 0], [dx, dy]];
    }

    elements.push(
      arrow(`conn-${ci}`, startX, startY, points, {
        strokeColor: "#495057",
        strokeWidth: 1.5,
        strokeStyle: conn.style || "solid",
      })
    );

    if (conn.label) {
      const lx = startX + dx / 2 - 30;
      const ly = startY + dy / 2 - 10;
      elements.push(
        textEl(`conn-${ci}-lbl`, lx, ly, 60, 14, conn.label, 11, {
          strokeColor: "#495057",
        })
      );
    }
  });

  return elements;
}

export { excalidraw, toSvg, toPng };
