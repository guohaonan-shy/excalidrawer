/**
 * Tree diagram template — root → children hierarchy (tidy tree).
 *
 * Input schema:
 * {
 *   title?: string,
 *   direction?: "horizontal" | "vertical",   // default "horizontal": root on the left, grows right
 *                                            // ("vertical": root on top, grows down; also right/down, LR/TB)
 *   root: {
 *     label: string, desc?: string, id?: string, color?: string,
 *     children?: [ node | string ]           // a bare string is a leaf { label }
 *   },
 *   widths?: number[],        // node width per depth (auto from labels if omitted)
 *   levels?: string[],        // optional depth captions ("Root", "Category", "Skill")
 *   numberLeaves?: boolean,   // prefix leaves "1. ", "2. " … in reading order
 *   arrowheads?: boolean,     // arrowheads on child branches (default: plain connectors)
 *   equalize?: "depth" | "siblings" | "none"
 * }
 *
 * Layout: the `tree` helper in layout.mjs (pure math). Coloring:
 *   - root: solid yellow (the focal node)
 *   - each first-level branch with children takes the next palette color as a
 *     solid fill; everything below it inherits that hue as a light tint with an
 *     accent border, so a group reads as one family
 *   - `color` on any node overrides the hue for it and its subtree
 */

import { setSeed, box, rect, arrow, textEl, colors, excalidraw } from "../elements.mjs";
import { toSvg, toPng } from "../export.mjs";
import { estimateTextWidth } from "../text.mjs";
import { tree as treeLayout } from "../layout.mjs";

const PALETTE = {
  blue:   { fill: colors.blue,   tint: colors.bgBlue,   stroke: colors.strokeBlue },
  green:  { fill: colors.green,  tint: colors.bgGreen,  stroke: colors.strokeGreen },
  purple: { fill: colors.purple, tint: colors.bgPurple, stroke: colors.strokePurple },
  red:    { fill: colors.red,    tint: colors.bgRed,    stroke: colors.strokeRed },
  orange: { fill: colors.orange, tint: colors.bgOrange, stroke: colors.strokeOrange },
  yellow: { fill: colors.yellow, tint: colors.bgYellow, stroke: colors.strokeYellow },
  gray:   { fill: colors.gray,   tint: colors.bgGray,   stroke: colors.strokeGray },
};
const GROUP_CYCLE = ["blue", "green", "purple", "red", "orange", "gray"];
const INK = "#1e1e1e";
const EDGE = "#495057";

// A palette key → its triplet; a hex → used as-is for fill and tint.
const swatch = (c) => PALETTE[c] ?? { fill: c, tint: c, stroke: INK };

/**
 * Generate tree diagram elements from structured data.
 *
 * @param {object} data - { title?, direction?, root, widths?, levels?, numberLeaves?, arrowheads?, equalize? }
 * @param {object} [opts] - { seed?: number }
 * @returns {Array} Excalidraw element array
 */
export function tree(data, opts = {}) {
  setSeed(opts.seed ?? 600000);
  const { title, root, levels = [], numberLeaves = false, arrowheads = false } = data;
  if (!root) return [];

  const PAD = 40;
  const TITLE_FONT = 24;
  const TITLE_H = title ? 56 : 0;
  const LEVEL_FONT = 14;
  const isRight = !["vertical", "down", "tb", "td", "top-down"].includes(String(data.direction ?? "horizontal").toLowerCase());

  // Number leaves in reading order — a pre-order walk visits them top→bottom
  // (right) / left→right (down), the order they were listed in.
  let leafNo = 0;
  const prep = (raw) => {
    const n = typeof raw === "string" ? { label: raw } : { ...raw };
    if (Array.isArray(n.children) && n.children.length) n.children = n.children.map(prep);
    else if (numberLeaves) n.label = `${++leafNo}. ${n.label ?? ""}`;
    return n;
  };
  const prepared = prep(root);

  // Room for depth captions: a header row (right) or a left gutter (down).
  const hasLevels = levels.length > 0;
  const gutterW = hasLevels && !isRight
    ? Math.max(...levels.map((l) => estimateTextWidth(String(l), LEVEL_FONT))) + 32
    : 0;
  const headerH = hasLevels && isRight ? 32 : 0;

  const t = treeLayout(prepared, {
    direction: isRight ? "right" : "down",
    widths: data.widths,
    equalize: data.equalize,
    originX: PAD + gutterW,
    originY: PAD + TITLE_H + headerH,
  });

  // Resolve each node's hue: root → yellow; first-level groups cycle; rest inherit.
  const hue = new Map();
  let cycle = 0;
  for (const n of t.nodes) {
    const own = n.data.color;
    if (n.depth === 0) hue.set(n.id, own ?? "yellow");
    else if (own) hue.set(n.id, own);
    else if (n.depth === 1) hue.set(n.id, n.leaf ? "blue" : GROUP_CYCLE[cycle++ % GROUP_CYCLE.length]);
    else hue.set(n.id, hue.get(n.parent));
  }

  const lines = [];
  const shapes = [];
  const contentW = t.bounds.x + t.bounds.w - PAD; // from the left pad to the far edge

  if (title) {
    const w = Math.max(contentW, estimateTextWidth(title, TITLE_FONT) + 20);
    shapes.push(textEl("tree-title", PAD, PAD - 12, w, 34, title, TITLE_FONT, {}));
  }

  if (hasLevels) {
    t.levels.forEach((lv, d) => {
      if (levels[d] == null || levels[d] === "") return;
      const label = String(levels[d]);
      if (isRight) {
        shapes.push(textEl(`tree-lvl-${d}`, lv.x, PAD + TITLE_H, lv.w, 22, label, LEVEL_FONT, { strokeColor: EDGE }));
      } else {
        const w = gutterW - 16;
        shapes.push(textEl(`tree-lvl-${d}`, PAD, lv.y + lv.h / 2 - 11, w, 22, label, LEVEL_FONT, { strokeColor: EDGE }));
      }
    });
  }

  for (const n of t.nodes) {
    const sw = swatch(hue.get(n.id));
    // Root and branch heads are solid; what hangs under a branch is its tint.
    const solid = n.depth === 0 || (!n.leaf && (n.depth === 1 || n.data.color != null));
    const fill = solid ? sw.fill : sw.tint;
    const extra = solid ? {} : { strokeColor: sw.stroke };
    if (n.titled) {
      const { box: b, title: ht, body } = n.titled;
      shapes.push(rect(n.id, b.x, b.y, b.w, b.h, fill, extra));
      shapes.push(textEl(`${n.id}-t`, ht.x, ht.y, ht.w, ht.h, ht.text, ht.fontSize, {}));
      shapes.push(textEl(`${n.id}-d`, body.x, body.y, body.w, body.h, body.text, body.fontSize, { strokeColor: EDGE }));
    } else {
      shapes.push(...box(n.id, `${n.id}-t`, n.x, n.y, n.w, n.h, fill, n.label, n.fontSize, extra));
    }
  }

  t.segments.forEach((s, i) => {
    const head = arrowheads && s.kind === "branch" ? "arrow" : null;
    lines.push(arrow(`tree-e${i}`, s.at[0], s.at[1], s.points, {
      strokeColor: EDGE,
      strokeWidth: 1.5,
      roundness: null,
      endArrowhead: head,
    }));
  });

  // Connectors under the boxes, so a trunk end never paints over a border.
  return [...lines, ...shapes];
}

export { excalidraw, toSvg, toPng };
