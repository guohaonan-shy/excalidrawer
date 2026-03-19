/**
 * Flowchart diagram template.
 *
 * Input schema:
 * {
 *   title?: string,
 *   direction?: "horizontal" | "vertical",   // default: "horizontal"
 *   nodes: [
 *     { id: string, label: string, type?: "process"|"decision"|"start"|"end"|"io", color?: string }
 *   ],
 *   edges: [
 *     { from: string, to: string, label?: string }
 *   ]
 * }
 *
 * Layout algorithm:
 *   - Topological sort from root nodes (no incoming edges)
 *   - Assign each node to the earliest layer it can occupy
 *   - Within each layer, nodes are stacked perpendicular to flow direction
 *   - Edges are drawn between layer positions
 */

import { setSeed, box, diamondBox, arrow, textEl, rect, ellipse, colors, excalidraw } from "../elements.mjs";
import { toSvg, toPng } from "../export.mjs";
import { estimateTextWidth, wrapText, textHeight } from "../text.mjs";

const COLOR_CYCLE = [
  colors.blue,
  colors.green,
  colors.yellow,
  colors.purple,
  colors.red,
  colors.orange,
];

const TYPE_DEFAULTS = {
  start:    { color: colors.yellow, w: 140, h: 52 },
  end:      { color: colors.green,  w: 140, h: 52 },
  process:  { color: colors.blue,   w: 160, h: 56 },
  decision: { color: colors.orange, w: 170, h: 80 },
  io:       { color: colors.purple, w: 160, h: 56 },
};

/**
 * Generate flowchart elements from structured data.
 *
 * @param {object} data - { title?, direction?, nodes, edges }
 * @param {object} [opts] - { seed?: number }
 * @returns {Array} Excalidraw element array
 */
export function flowchart(data, opts = {}) {
  setSeed(opts.seed ?? 300000);

  const { title, nodes = [], edges = [] } = data;
  if (nodes.length === 0) return [];
  const direction = data.direction || "horizontal";
  const isHoriz = direction === "horizontal";

  // Build adjacency info
  const nodeMap = new Map();
  for (const n of nodes) nodeMap.set(n.id, n);

  const adjList = new Map();
  for (const n of nodes) adjList.set(n.id, []);
  for (const e of edges) adjList.get(e.from).push(e.to);

  // Detect back-edges using node input order as a hint.
  // An edge from A→B is a "back-edge" if B appears before A in the input
  // (i.e. it loops back to an earlier step). Back-edges are skipped for layout.
  const nodeOrder = new Map();
  nodes.forEach((n, i) => nodeOrder.set(n.id, i));

  const forwardAdj = new Map();
  const backEdgeSet = new Set();
  for (const n of nodes) forwardAdj.set(n.id, []);
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    if (nodeOrder.get(e.to) <= nodeOrder.get(e.from)) {
      backEdgeSet.add(i); // mark as back-edge, skip for layer assignment
    } else {
      forwardAdj.get(e.from).push(e.to);
    }
  }

  // Assign layers via BFS on forward edges only
  const layer = new Map();
  for (const n of nodes) layer.set(n.id, 0);

  const hasForwardIncoming = new Set();
  for (let i = 0; i < edges.length; i++) {
    if (!backEdgeSet.has(i)) hasForwardIncoming.add(edges[i].to);
  }
  const roots = nodes.filter((n) => !hasForwardIncoming.has(n.id));
  if (roots.length === 0) roots.push(nodes[0]);

  const queue = roots.map((n) => n.id);
  const visited = new Set(queue);
  while (queue.length > 0) {
    const id = queue.shift();
    for (const toId of forwardAdj.get(id)) {
      const newLayer = layer.get(id) + 1;
      if (newLayer > layer.get(toId)) {
        layer.set(toId, newLayer);
      }
      if (!visited.has(toId)) {
        visited.add(toId);
        queue.push(toId);
      }
    }
  }
  for (const n of nodes) {
    if (!visited.has(n.id)) layer.set(n.id, 0);
  }

  // Group nodes by layer
  const layers = [];
  for (const n of nodes) {
    const l = layer.get(n.id);
    if (!layers[l]) layers[l] = [];
    layers[l].push(n);
  }

  // Layout constants
  const LAYER_GAP = isHoriz ? 80 : 100;
  const NODE_GAP = 40;
  const TITLE_H = title ? 50 : 0;
  const PAD = 40;

  // Pre-compute wrapped labels and dynamic node heights
  const nodeWrapped = new Map(); // id → { wrapped, h }
  for (const n of nodes) {
    const type = n.type || "process";
    const defaults = TYPE_DEFAULTS[type] || TYPE_DEFAULTS.process;
    const maxTextW = defaults.w - 20;
    const fontSize = 15;
    const wrapped = wrapText(n.label, maxTextW, fontSize);
    const h = Math.max(defaults.h, textHeight(wrapped, fontSize, 20));
    nodeWrapped.set(n.id, { wrapped, h });
  }

  // Compute node dimensions and positions
  const nodePos = new Map(); // id → { x, y, w, h, cx, cy }

  for (let li = 0; li < layers.length; li++) {
    const layerNodes = layers[li] || [];
    let perpOffset = 0;

    for (let ni = 0; ni < layerNodes.length; ni++) {
      const n = layerNodes[ni];
      const type = n.type || "process";
      const defaults = TYPE_DEFAULTS[type] || TYPE_DEFAULTS.process;
      const w = defaults.w;
      const h = nodeWrapped.get(n.id).h;

      let x, y;
      if (isHoriz) {
        x = PAD + li * (180 + LAYER_GAP);
        y = PAD + TITLE_H + perpOffset;
      } else {
        x = PAD + perpOffset;
        y = PAD + TITLE_H + li * (80 + LAYER_GAP);
      }

      nodePos.set(n.id, { x, y, w, h, cx: x + w / 2, cy: y + h / 2 });
      perpOffset += (isHoriz ? h : w) + NODE_GAP;
    }
  }

  // Center each layer's nodes relative to the widest layer
  let maxPerp = 0;
  for (const layerNodes of layers) {
    if (!layerNodes) continue;
    let totalPerp = 0;
    for (const n of layerNodes) {
      const pos = nodePos.get(n.id);
      totalPerp = isHoriz
        ? Math.max(totalPerp, pos.y + pos.h - PAD - TITLE_H)
        : Math.max(totalPerp, pos.x + pos.w - PAD);
    }
    maxPerp = Math.max(maxPerp, totalPerp);
  }

  for (const layerNodes of layers) {
    if (!layerNodes) continue;
    let totalPerp = 0;
    for (const n of layerNodes) {
      const pos = nodePos.get(n.id);
      totalPerp = isHoriz
        ? Math.max(totalPerp, pos.y + pos.h - PAD - TITLE_H)
        : Math.max(totalPerp, pos.x + pos.w - PAD);
    }
    const offset = (maxPerp - totalPerp) / 2;
    for (const n of layerNodes) {
      const pos = nodePos.get(n.id);
      if (isHoriz) {
        pos.y += offset;
        pos.cy = pos.y + pos.h / 2;
      } else {
        pos.x += offset;
        pos.cx = pos.x + pos.w / 2;
      }
    }
  }

  // Generate elements
  const elements = [];

  // Title
  if (title) {
    const totalW = isHoriz
      ? layers.length * (180 + LAYER_GAP) - LAYER_GAP + PAD * 2
      : maxPerp + PAD * 2;
    elements.push(textEl("fc-title", PAD, 12, totalW - PAD * 2, 32, title, 24, {}));
  }

  // Nodes
  let colorIdx = 0;
  for (const n of nodes) {
    const pos = nodePos.get(n.id);
    const type = n.type || "process";
    const defaults = TYPE_DEFAULTS[type] || TYPE_DEFAULTS.process;
    const color = n.color || defaults.color || COLOR_CYCLE[colorIdx++ % COLOR_CYCLE.length];
    const { wrapped } = nodeWrapped.get(n.id);
    const fontSize = 15;

    if (type === "decision") {
      elements.push(
        ...diamondBox(`${n.id}`, `${n.id}-t`, pos.x, pos.y, pos.w, pos.h, color, wrapped, fontSize)
      );
    } else if (type === "start" || type === "end") {
      elements.push(
        ...box(`${n.id}`, `${n.id}-t`, pos.x, pos.y, pos.w, pos.h, color, wrapped, fontSize, {
          roundness: { type: 3, value: pos.h / 2 },
        })
      );
    } else {
      elements.push(
        ...box(`${n.id}`, `${n.id}-t`, pos.x, pos.y, pos.w, pos.h, color, wrapped, fontSize)
      );
    }
  }

  // --- Helpers for edge routing ---

  // Global bounding box of all nodes (for back-edge routing clearance)
  let globalMinY = Infinity, globalMaxY = -Infinity;
  let globalMinX = Infinity, globalMaxX = -Infinity;
  for (const [, pos] of nodePos) {
    globalMinY = Math.min(globalMinY, pos.y);
    globalMaxY = Math.max(globalMaxY, pos.y + pos.h);
    globalMinX = Math.min(globalMinX, pos.x);
    globalMaxX = Math.max(globalMaxX, pos.x + pos.w);
  }

  // AABB overlap test
  function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  const BACK_EDGE_MARGIN = 36;

  // Edges
  for (let ei = 0; ei < edges.length; ei++) {
    const e = edges[ei];
    const from = nodePos.get(e.from);
    const to = nodePos.get(e.to);
    if (!from || !to) continue;

    const isBackEdge = backEdgeSet.has(ei);
    let startX, startY, points;

    if (isBackEdge) {
      // --- Back-edge: route around the flow to avoid crossing nodes ---
      if (isHoriz) {
        // Decide whether to route above or below based on which is closer
        const midCy = (from.cy + to.cy) / 2;
        const distToTop = midCy - globalMinY;
        const distToBot = globalMaxY - midCy;
        const routeAbove = distToTop <= distToBot;

        if (routeAbove) {
          const clearY = globalMinY - BACK_EDGE_MARGIN;
          startX = from.cx;
          startY = from.y;
          const endX = to.cx;
          const endY = to.y;
          points = [
            [0, 0],
            [0, clearY - startY],
            [endX - startX, clearY - startY],
            [endX - startX, endY - startY],
          ];
        } else {
          const clearY = globalMaxY + BACK_EDGE_MARGIN;
          startX = from.cx;
          startY = from.y + from.h;
          const endX = to.cx;
          const endY = to.y + to.h;
          points = [
            [0, 0],
            [0, clearY - startY],
            [endX - startX, clearY - startY],
            [endX - startX, endY - startY],
          ];
        }
      } else {
        // Vertical flow: route to the right or left
        const midCx = (from.cx + to.cx) / 2;
        const distToLeft = midCx - globalMinX;
        const distToRight = globalMaxX - midCx;
        const routeRight = distToRight <= distToLeft;

        if (routeRight) {
          const clearX = globalMaxX + BACK_EDGE_MARGIN;
          startX = from.x + from.w;
          startY = from.cy;
          const endX = to.x + to.w;
          const endY = to.cy;
          points = [
            [0, 0],
            [clearX - startX, 0],
            [clearX - startX, endY - startY],
            [endX - startX, endY - startY],
          ];
        } else {
          const clearX = globalMinX - BACK_EDGE_MARGIN;
          startX = from.x;
          startY = from.cy;
          const endX = to.x;
          const endY = to.cy;
          points = [
            [0, 0],
            [clearX - startX, 0],
            [clearX - startX, endY - startY],
            [endX - startX, endY - startY],
          ];
        }
      }
    } else {
      // --- Forward edge: standard routing ---
      let dx, dy;
      if (isHoriz) {
        startX = from.x + from.w;
        startY = from.cy;
        dx = to.x - startX;
        dy = to.cy - startY;
      } else {
        startX = from.cx;
        startY = from.y + from.h;
        dx = to.cx - startX;
        dy = to.y - startY;
      }

      const needsBend = isHoriz ? Math.abs(dy) > 5 : Math.abs(dx) > 5;
      if (needsBend) {
        if (isHoriz) {
          const midX = dx / 2;
          points = [[0, 0], [midX, 0], [midX, dy], [dx, dy]];
        } else {
          const midY = dy / 2;
          points = [[0, 0], [0, midY], [dx, midY], [dx, dy]];
        }
      } else {
        points = [[0, 0], [dx, dy]];
      }
    }

    elements.push(
      arrow(`edge-${ei}`, startX, startY, points, {
        strokeColor: "#495057",
        strokeWidth: 1.5,
      })
    );

    // --- Edge label with collision avoidance ---
    if (e.label) {
      const labelFontSize = 12;
      const labelLines = e.label.split("\n");
      const labelW = Math.max(...labelLines.map((l) => estimateTextWidth(l, labelFontSize))) + 8;
      const labelH = textHeight(e.label, labelFontSize, 4);

      // Compute arrow midpoint in absolute coordinates
      const lastPt = points[points.length - 1];
      const arrowMidAbsX = startX + lastPt[0] / 2;
      const arrowMidAbsY = startY + lastPt[1] / 2;

      let lx = arrowMidAbsX - labelW / 2;
      let ly = arrowMidAbsY - labelH - 4; // default: above the arrow

      // Try to avoid overlapping any node; offset perpendicular to flow
      const offsetDir = isHoriz ? [0, -labelH - 4] : [-labelW - 4, 0];
      for (let attempt = 0; attempt < 6; attempt++) {
        let collides = false;
        for (const [, pos] of nodePos) {
          if (rectsOverlap(lx, ly, labelW, labelH, pos.x - 2, pos.y - 2, pos.w + 4, pos.h + 4)) {
            collides = true;
            break;
          }
        }
        if (!collides) break;
        lx += offsetDir[0];
        ly += offsetDir[1];
      }

      elements.push(
        textEl(`elbl-${ei}`, lx, ly, labelW, labelH, e.label, labelFontSize, {
          strokeColor: "#495057",
        })
      );
    }
  }

  return elements;
}

export { excalidraw, toSvg, toPng };
