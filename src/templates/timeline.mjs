/**
 * Timeline diagram template.
 *
 * Input schema:
 * {
 *   title: string,
 *   items: [
 *     { label: string, time: string, desc: string, color?: string }
 *   ]
 * }
 */

import { setSeed, box, arrow, textEl, rect, colors, excalidraw } from "../elements.mjs";
import { toSvg, toPng } from "../export.mjs";
import { wrapText } from "../text.mjs";

// Color rotation for items without explicit color
const COLOR_CYCLE = [
  colors.yellow,
  colors.blue,
  colors.green,
  colors.purple,
  colors.red,
  colors.orange,
];

/**
 * Generate timeline diagram elements from structured data.
 *
 * @param {object} data - { title, items: [{ label, time, desc, color? }] }
 * @param {object} [opts] - { seed?: number }
 * @returns {Array} Excalidraw element array
 */
export function timeline(data, opts = {}) {
  setSeed(opts.seed ?? 200000);

  const { title, items } = data;
  const count = items.length;

  // Layout constants
  // Vertical layout (top to bottom):
  //   y=20:   Title (h=36)              → 20..56
  //   y=80:   Above descriptions (h=64) → 80..144
  //   y=155:  Above boxes (h=52)        → 155..207
  //   y=250:  Time labels above axis    → 250..272
  //   y=280:  Timeline axis
  //   y=292:  Time labels below axis    → 292..314
  //   y=340:  Below boxes (h=52)        → 340..392
  //   y=400:  Below descriptions (h=64) → 400..464
  const NODE_W = 220;
  const NODE_H = 52;
  const GAP = 60;
  const DESC_H = 64;
  const TIMELINE_Y = 280;
  const PADDING_X = 60;

  const ABOVE_BOX_Y = 155;
  const ABOVE_DESC_Y = 80;
  const BELOW_BOX_Y = TIMELINE_Y + 60;   // 340
  const BELOW_DESC_Y = TIMELINE_Y + 120;  // 400

  const totalW = count * NODE_W + (count - 1) * GAP;
  const elements = [];

  // Title
  if (title) {
    elements.push(
      textEl("title", 20, 20, totalW, 36, title, 28, {})
    );
  }

  // Timeline horizontal axis
  const axisStartX = PADDING_X - 30;
  const axisEndX = PADDING_X + totalW + 30;
  elements.push(
    arrow("axis", axisStartX, TIMELINE_Y, [[0, 0], [axisEndX - axisStartX, 0]], {
      strokeColor: "#868e96",
      strokeWidth: 3,
    })
  );

  // Milestones
  items.forEach((item, i) => {
    const x = PADDING_X + i * (NODE_W + GAP);
    const cx = x + NODE_W / 2;
    const itemColor = item.color || COLOR_CYCLE[i % COLOR_CYCLE.length];
    const prefix = `m${i}`;

    // Dot on timeline
    elements.push(
      rect(`${prefix}dot`, cx - 8, TIMELINE_Y - 8, 16, 16, itemColor, {
        strokeColor: "#495057",
        strokeWidth: 2,
        roundness: { type: 3, value: 8 },
      })
    );

    // Alternate above/below for visual clarity
    const isAbove = i % 2 === 0;

    // Time label — positioned near the axis on the opposite side of the box
    const timeLabelY = isAbove ? TIMELINE_Y - 30 : TIMELINE_Y + 12;
    elements.push(
      textEl(`${prefix}time`, cx - 50, timeLabelY, 100, 22, item.time, 14, {
        textAlign: "center",
        strokeColor: "#495057",
      })
    );

    // Box position
    const boxY = isAbove ? ABOVE_BOX_Y : BELOW_BOX_Y;

    // Dashed connector from dot to box
    const connStartY = isAbove ? TIMELINE_Y - 8 : TIMELINE_Y + 8;
    const connEndY = isAbove ? boxY + NODE_H : boxY;
    elements.push(
      arrow(`${prefix}conn`, cx, connStartY, [[0, 0], [0, connEndY - connStartY]], {
        strokeColor: "#adb5bd",
        strokeWidth: 1,
        strokeStyle: "dashed",
        endArrowhead: null,
      })
    );

    // Milestone box
    elements.push(
      ...box(`${prefix}box`, `${prefix}txt`, x, boxY, NODE_W, NODE_H, itemColor, item.label, 16)
    );

    // Description text (auto-wrap to fit node width)
    if (item.desc) {
      const descY = isAbove ? ABOVE_DESC_Y : BELOW_DESC_Y;
      const wrappedDesc = wrapText(item.desc, NODE_W - 10, 13);
      elements.push(
        textEl(`${prefix}desc`, x, descY, NODE_W, DESC_H, wrappedDesc, 13, {
          textAlign: "center",
          strokeColor: "#495057",
        })
      );
    }
  });

  return elements;
}

export { excalidraw, toSvg, toPng };
