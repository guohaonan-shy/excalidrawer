/**
 * Visual demo of 0.6.0 layout helpers.
 * Each section showcases one helper.
 */

import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

import {
  setSeed, box, diamondBox, ellipse, arrow, textEl, rect,
  colors, excalidraw, toSvg, toPng,
  gridLayout, chain, swimlane, hubSpoke, edgePoint, routeU,
  labelAnchor, contrastText, triplet,
} from "../src/index.mjs";

const dir = dirname(fileURLToPath(import.meta.url));
setSeed(600000);

const bg = [];   // section frames (back)
const conn = []; // arrows (middle)
const fg = [];   // boxes + text (front)

// Section header helper
let sectionId = 0;
function sectionTitle(y, text) {
  return textEl(`sec-${sectionId++}`, 40, y, 800, 24, text, 18);
}

// ===========================================================================
// 1. gridLayout — 6 items, 3 cols × 2 rows
// ===========================================================================
{
  fg.push(sectionTitle(20, "1. gridLayout(6, { cols: 3, cellW: 140, cellH: 50 })"));
  const cells = gridLayout(6, {
    cols: 3, cellW: 140, cellH: 50, colGap: 16, rowGap: 12,
    originX: 40, originY: 60,
  });
  cells.forEach((c, i) => {
    fg.push(...box(`g-r-${i}`, `g-t-${i}`, c.x, c.y, c.w, c.h, colors.blue, `Cell ${i}`, 13));
  });
}

// ===========================================================================
// 2. chain — 5 steps horizontal, with arrows between
// ===========================================================================
{
  fg.push(sectionTitle(210, "2. chain({x:40, y:260}, 5, { dx:170, dy:0 })  +  arrows"));
  const pts = chain({ x: 40, y: 260 }, 5, { dx: 170, dy: 0 });
  pts.forEach((p, i) => {
    fg.push(...box(`c-r-${i}`, `c-t-${i}`, p.x, p.y, 140, 50, colors.green, `Step ${i + 1}`, 13));
    if (i < pts.length - 1) {
      conn.push(arrow(`c-a-${i}`, p.x + 140, p.y + 25, [[0, 0], [30, 0]]));
    }
  });
}

// ===========================================================================
// 3. swimlane — 2 lanes (Frontend / Backend) with items
// ===========================================================================
{
  fg.push(sectionTitle(360, "3. swimlane([Frontend, Backend], items, { laneH:100, itemW:130 })"));
  const { laneRects, itemPositions } = swimlane(
    [{ label: "Frontend", color: "yellow" }, { label: "Backend", color: "blue" }],
    [
      { lane: "Frontend", name: "Web UI" },
      { lane: "Backend",  name: "API GW" },
      { lane: "Backend",  name: "Service" },
      { lane: "Backend",  name: "DB" },
    ],
    {
      laneW: 700, laneH: 100, itemW: 130, itemH: 50,
      headerW: 120, itemGap: 24,
      originX: 40, originY: 400,
    }
  );

  // Lane backgrounds (bg layer) + header labels (fg layer)
  laneRects.forEach((l, i) => {
    const t = triplet(l.color);
    bg.push(rect(`sw-lane-${i}`, l.x, l.y, l.w, l.h, t.bg, { strokeColor: t.stroke }));
    fg.push(textEl(`sw-h-${i}`, l.x + 12, l.y + l.h / 2 - 10, 100, 20, l.label, 14, { strokeColor: t.stroke }));
  });

  // Items
  itemPositions.forEach((p, i) => {
    fg.push(...box(`sw-i-r-${i}`, `sw-i-t-${i}`, p.x, p.y, p.w, p.h, colors.white, p.item.name, 13));
  });
}

// ===========================================================================
// 4. hubSpoke — center + 6 spokes
// ===========================================================================
{
  fg.push(sectionTitle(620, "4. hubSpoke({x:260, y:790}, 6, { radius:140 })"));

  const center = { x: 260, y: 790 };
  const { centerPos, spokePositions } = hubSpoke(center, 6, { radius: 140 });

  // Center
  fg.push(...box("hs-center-r", "hs-center-t",
    centerPos.x - 60, centerPos.y - 28, 120, 56, colors.purple, "Hub", 15));

  // Spokes + connectors
  spokePositions.forEach((s, i) => {
    fg.push(...box(`hs-r-${i}`, `hs-t-${i}`,
      s.x - 45, s.y - 22, 90, 44, colors.yellow, `S${i}`, 13));
    // Arrow from center toward spoke (visual approximation; just for demo)
    conn.push(arrow(`hs-a-${i}`, centerPos.x, centerPos.y,
      [[0, 0], [s.x - centerPos.x, s.y - centerPos.y]]));
  });
}

// ===========================================================================
// 5. edgePoint — rect / diamond / ellipse, with arrows showing t = 0 / 0.5 / 1
// ===========================================================================
{
  const baseY = 1000;
  fg.push(sectionTitle(baseY - 20, "5. edgePoint — arrows attaching at t = 0 / 0.5 / 1 (right side)"));

  const shapes = [
    { type: "rectangle", label: "rectangle" },
    { type: "diamond",   label: "diamond" },
    { type: "ellipse",   label: "ellipse" },
  ];

  shapes.forEach((s, idx) => {
    const cx = 100 + idx * 280;
    const target = { x: cx, y: baseY + 30, w: 160, h: 100, type: s.type };

    // Render the shape itself
    if (s.type === "rectangle") {
      fg.push(...box(`ep-r-${idx}`, `ep-t-${idx}`,
        target.x, target.y, target.w, target.h, colors.bgBlue, s.label, 14,
        { strokeColor: colors.strokeBlue }));
    } else if (s.type === "diamond") {
      fg.push(...diamondBox(`ep-r-${idx}`, `ep-t-${idx}`,
        target.x, target.y, target.w, target.h, colors.bgBlue, s.label, 14,
        { strokeColor: colors.strokeBlue }));
    } else if (s.type === "ellipse") {
      fg.push(ellipse(`ep-r-${idx}`, target.x, target.y, target.w, target.h, colors.bgBlue,
        { strokeColor: colors.strokeBlue }));
      fg.push(textEl(`ep-t-${idx}`, target.x, target.y + target.h / 2 - 10, target.w, 20, s.label, 14,
        { strokeColor: colors.strokeBlue }));
    }

    // Three arrows: t = 0, 0.5, 1 on right side. Origin points are 80px right of target.
    [0, 0.5, 1].forEach((t, ti) => {
      const p = edgePoint(target, "right", t);
      const originX = target.x + target.w + 100;
      const originY = target.y + 20 + ti * 30;
      // Arrow pointing FROM the right toward the shape's edge point
      conn.push(arrow(`ep-a-${idx}-${ti}`, originX, originY,
        [[0, 0], [p.x - originX, p.y - originY]],
        { strokeColor: [colors.strokeRed, colors.strokeGreen, colors.strokeOrange][ti] }));
      // Label
      fg.push(textEl(`ep-l-${idx}-${ti}`, originX + 4, originY - 8, 50, 14,
        `t=${t}`, 11,
        { strokeColor: [colors.strokeRed, colors.strokeGreen, colors.strokeOrange][ti] }));
    });
  });
}

// ===========================================================================
// 6. triplet — show bg / mid / stroke for several palette keys
// ===========================================================================
{
  const baseY = 1220;
  fg.push(sectionTitle(baseY - 20, "6. triplet(key) → { bg, mid, stroke }  — one row per color"));

  const keys = ["blue", "green", "yellow", "purple", "red", "orange", "gray"];
  const swatchW = 80, swatchH = 44, gap = 8;
  const labels = ["bg", "mid", "stroke"];

  keys.forEach((key, i) => {
    const y = baseY + 20 + i * (swatchH + 10);
    const t = triplet(key);
    const tones = [t.bg, t.mid, t.stroke];

    // Color key label
    fg.push(textEl(`tr-k-${i}`, 40, y + 14, 80, 18, key, 14));

    // 3 swatches — text color auto-picked via contrastText against each swatch fill
    [0, 1, 2].forEach((ti) => {
      const x = 130 + ti * (swatchW + gap);
      const fill = tones[ti];
      const txt  = contrastText(fill);
      bg.push(rect(`tr-sw-${i}-${ti}`, x, y, swatchW, swatchH, fill,
        { strokeColor: colors.strokeGray }));
      fg.push(textEl(`tr-tl-${i}-${ti}`, x + 4, y + swatchH / 2 - 8, swatchW - 8, 16,
        labels[ti], 11, { strokeColor: txt }));
    });
  });
}

// ===========================================================================
// 7. routeU — back-edge loop (composes with edgePoint)
// ===========================================================================
{
  const baseY = 1680;
  fg.push(sectionTitle(baseY - 20, "7. routeU — back-edge looping below the main flow"));

  // Mini horizontal flow: A → B → C(decision) → D, with C looping back to B.
  const ROW_Y = baseY + 40;
  const BH = 56;
  const BY = ROW_Y - BH / 2;

  const A = { x: 40,  y: BY, w: 110, h: BH, type: "rectangle" };
  const B = { x: 200, y: BY, w: 130, h: BH, type: "rectangle" };
  const C = { x: 380, y: ROW_Y - 50, w: 130, h: 100, type: "diamond" };
  const D = { x: 580, y: BY, w: 110, h: BH, type: "rectangle" };

  fg.push(...box("ru-a-r", "ru-a-t", A.x, A.y, A.w, A.h, colors.yellow, "Start", 14));
  fg.push(...box("ru-b-r", "ru-b-t", B.x, B.y, B.w, B.h, colors.blue,   "Enter Email", 13));
  fg.push(...diamondBox("ru-c-r", "ru-c-t", C.x, C.y, C.w, C.h, colors.orange, "Valid?", 12));
  fg.push(...box("ru-d-r", "ru-d-t", D.x, D.y, D.w, D.h, colors.green,  "Done", 14));

  // Forward arrows (straight, edge-snapped)
  const ab = edgePoint(A, "right"), ba = edgePoint(B, "left");
  conn.push(arrow("ru-ab", ab.x, ab.y, [[0, 0], [ba.x - ab.x, ba.y - ab.y]]));

  const bc = edgePoint(B, "right"), cb = edgePoint(C, "left");
  conn.push(arrow("ru-bc", bc.x, bc.y, [[0, 0], [cb.x - bc.x, cb.y - bc.y]]));

  const cd = edgePoint(C, "right"), dc = edgePoint(D, "left");
  conn.push(arrow("ru-cd", cd.x, cd.y, [[0, 0], [dc.x - cd.x, dc.y - cd.y]],
    { strokeColor: colors.strokeGreen }));
  fg.push(textEl("ru-ok", cd.x + 4, cd.y - 16, 40, 14, "OK", 11, { strokeColor: colors.strokeGreen }));

  // BACK-EDGE: C's bottom → routeU(below, clearance=50) → B's bottom
  const start = edgePoint(C, "bottom");
  const end   = edgePoint(B, "bottom");
  const pts   = routeU(start, end, { side: "below", clearance: 50 });
  conn.push(arrow("ru-back", start.x, start.y, pts, { strokeColor: colors.strokeOrange }));

  // Resolve relative path → absolute, ask labelAnchor for best label position
  const absPts = pts.map(([dx, dy]) => [start.x + dx, start.y + dy]);
  const anchor = labelAnchor(absPts, { padding: 8 });
  fg.push(textEl("ru-fail", anchor.x - 12, anchor.y - 6, 30, 14, "Fail", 11,
    { strokeColor: colors.strokeOrange }));
}

// ===========================================================================
// Assemble
// ===========================================================================
const elements = [...bg, ...conn, ...fg];

writeFileSync(join(dir, "layout-helpers-demo.excalidraw"), excalidraw(elements));
console.log("layout-helpers-demo.excalidraw written");

writeFileSync(join(dir, "layout-helpers-demo.svg"), toSvg(elements));
console.log("layout-helpers-demo.svg written");

const png = await toPng(elements, 2);
writeFileSync(join(dir, "layout-helpers-demo.png"), png);
console.log("layout-helpers-demo.png written");
