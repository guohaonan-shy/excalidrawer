import { test } from "node:test";
import assert from "node:assert/strict";
import {
  gridLayout,
  chain,
  swimlane,
  hubSpoke,
  edgePoint,
  routeU,
  labelAnchor,
  contrastText,
  triplet,
  colors,
} from "../src/index.mjs";

// Float helper — geometry has rounding noise.
const approx = (a, b, eps = 1e-6) =>
  assert.ok(Math.abs(a - b) < eps, `expected ${a} ≈ ${b} (Δ=${Math.abs(a - b)})`);

// ===========================================================================
// gridLayout
// ===========================================================================

test("gridLayout: 6 items in 3 cols → 2 rows", () => {
  const cells = gridLayout(6, { cols: 3, cellW: 100, cellH: 50, colGap: 20, rowGap: 10 });
  assert.equal(cells.length, 6);
  assert.deepEqual(cells[0], { x: 0,   y: 0,  w: 100, h: 50, col: 0, row: 0 });
  assert.deepEqual(cells[2], { x: 240, y: 0,  w: 100, h: 50, col: 2, row: 0 });
  assert.deepEqual(cells[3], { x: 0,   y: 60, w: 100, h: 50, col: 0, row: 1 });
  assert.deepEqual(cells[5], { x: 240, y: 60, w: 100, h: 50, col: 2, row: 1 });
});

test("gridLayout: origin offset applied", () => {
  const cells = gridLayout(2, { cols: 2, cellW: 10, cellH: 10, colGap: 0, rowGap: 0, originX: 100, originY: 200 });
  assert.equal(cells[0].x, 100);
  assert.equal(cells[0].y, 200);
  assert.equal(cells[1].x, 110);
});

test("gridLayout: partial last row OK", () => {
  const cells = gridLayout(5, { cols: 3, cellW: 10, cellH: 10 });
  assert.equal(cells.length, 5);
  assert.equal(cells[4].col, 1);
  assert.equal(cells[4].row, 1);
});

// ===========================================================================
// chain
// ===========================================================================

test("chain: 5 steps rightward", () => {
  const pts = chain({ x: 40, y: 100 }, 5, { dx: 160, dy: 0 });
  assert.equal(pts.length, 5);
  assert.deepEqual(pts[0], { x: 40,  y: 100, i: 0 });
  assert.deepEqual(pts[4], { x: 680, y: 100, i: 4 });
});

test("chain: defaults dx=dy=0 (degenerate stack)", () => {
  const pts = chain({ x: 0, y: 0 }, 3);
  assert.deepEqual(pts.map(p => [p.x, p.y]), [[0,0],[0,0],[0,0]]);
});

// ===========================================================================
// swimlane
// ===========================================================================

test("swimlane: 2 lanes, items distributed correctly", () => {
  const { laneRects, itemPositions } = swimlane(
    [{ label: "FE", color: "yellow" }, { label: "BE", color: "blue" }],
    [{ lane: "FE", id: "ui" }, { lane: "BE", id: "api" }, { lane: "BE", id: "db" }],
    { laneW: 600, laneH: 120, itemW: 140, itemH: 56, headerW: 100, itemGap: 20, laneGap: 0 }
  );

  assert.equal(laneRects.length, 2);
  assert.deepEqual(laneRects[0], { x: 0, y: 0, w: 700, h: 120, label: "FE", color: "yellow" });
  assert.deepEqual(laneRects[1], { x: 0, y: 120, w: 700, h: 120, label: "BE", color: "blue" });

  assert.equal(itemPositions.length, 3);
  // First item, FE lane, slot 0
  assert.equal(itemPositions[0].x, 100); // originX + headerW
  assert.equal(itemPositions[0].y, 32);  // (120 - 56) / 2 = 32 within lane 0
  assert.equal(itemPositions[0].item.id, "ui");
  // Second item, BE lane, slot 0
  assert.equal(itemPositions[1].x, 100);
  assert.equal(itemPositions[1].y, 152); // 120 + 32
  // Third item, BE lane, slot 1
  assert.equal(itemPositions[2].x, 260); // 100 + (140 + 20)
});

test("swimlane: default laneGap is 24", () => {
  const { laneRects } = swimlane(
    [{ label: "A" }, { label: "B" }],
    [],
    { laneW: 100, laneH: 50, itemW: 40, itemH: 20 }
  );
  // No explicit laneGap → should be 24
  assert.equal(laneRects[0].y, 0);
  assert.equal(laneRects[1].y, 74); // 50 + 24
});

test("swimlane: unknown lane throws", () => {
  assert.throws(
    () => swimlane([{ label: "A" }], [{ lane: "B" }], { laneW: 100, laneH: 50, itemW: 40, itemH: 20 }),
    /unknown lane "B"/
  );
});

// ===========================================================================
// hubSpoke
// ===========================================================================

test("hubSpoke: 4 spokes default (top start, clockwise) → top/right/bottom/left", () => {
  const { centerPos, spokePositions } = hubSpoke({ x: 100, y: 100 }, 4, { radius: 50 });
  assert.deepEqual(centerPos, { x: 100, y: 100 });
  // Spoke 0: -90° (top) → (100, 50)
  approx(spokePositions[0].x, 100);
  approx(spokePositions[0].y, 50);
  // Spoke 1: 0° (right) → (150, 100)
  approx(spokePositions[1].x, 150);
  approx(spokePositions[1].y, 100);
  // Spoke 2: 90° (bottom) → (100, 150)
  approx(spokePositions[2].x, 100);
  approx(spokePositions[2].y, 150);
  // Spoke 3: 180° (left) → (50, 100)
  approx(spokePositions[3].x, 50);
  approx(spokePositions[3].y, 100);
});

test("hubSpoke: counter-clockwise reverses order", () => {
  const { spokePositions } = hubSpoke({ x: 0, y: 0 }, 4, { radius: 10, clockwise: false });
  approx(spokePositions[0].y, -10); // still starts at top (-90°)
  approx(spokePositions[1].x, -10); // CCW → left next
  approx(spokePositions[2].y, 10);  // → bottom
  approx(spokePositions[3].x, 10);  // → right
});

// ===========================================================================
// edgePoint — rectangle
// ===========================================================================

test("edgePoint rectangle: edge midpoints (t=0.5)", () => {
  const b = { x: 100, y: 100, w: 160, h: 60 };
  assert.deepEqual(edgePoint(b, "top"),    { x: 180, y: 100 });
  assert.deepEqual(edgePoint(b, "right"),  { x: 260, y: 130 });
  assert.deepEqual(edgePoint(b, "bottom"), { x: 180, y: 160 });
  assert.deepEqual(edgePoint(b, "left"),   { x: 100, y: 130 });
});

test("edgePoint rectangle: corners (t=0 / t=1)", () => {
  const b = { x: 100, y: 100, w: 160, h: 60 };
  assert.deepEqual(edgePoint(b, "top", 0), { x: 100, y: 100 });
  assert.deepEqual(edgePoint(b, "top", 1), { x: 260, y: 100 });
  assert.deepEqual(edgePoint(b, "right", 0), { x: 260, y: 100 });
  assert.deepEqual(edgePoint(b, "right", 1), { x: 260, y: 160 });
});

// ===========================================================================
// edgePoint — diamond
// ===========================================================================

test("edgePoint diamond: returns vertex, t ignored", () => {
  const d = { x: 100, y: 100, w: 160, h: 60, type: "diamond" };
  // t=0.5 baseline
  assert.deepEqual(edgePoint(d, "top"),    { x: 180, y: 100 });
  assert.deepEqual(edgePoint(d, "right"),  { x: 260, y: 130 });
  assert.deepEqual(edgePoint(d, "bottom"), { x: 180, y: 160 });
  assert.deepEqual(edgePoint(d, "left"),   { x: 100, y: 130 });
  // t variations should give same result
  assert.deepEqual(edgePoint(d, "right", 0),    { x: 260, y: 130 });
  assert.deepEqual(edgePoint(d, "right", 0.25), { x: 260, y: 130 });
  assert.deepEqual(edgePoint(d, "right", 1),    { x: 260, y: 130 });
});

// ===========================================================================
// edgePoint — ellipse
// ===========================================================================

test("edgePoint ellipse: cardinal points (t=0.5) hit bbox midpoints", () => {
  const e = { x: 100, y: 100, w: 160, h: 60, type: "ellipse" };
  const top = edgePoint(e, "top");
  approx(top.x, 180);
  approx(top.y, 100);
  const right = edgePoint(e, "right");
  approx(right.x, 260);
  approx(right.y, 130);
  const bottom = edgePoint(e, "bottom");
  approx(bottom.x, 180);
  approx(bottom.y, 160);
  const left = edgePoint(e, "left");
  approx(left.x, 100);
  approx(left.y, 130);
});

test("edgePoint ellipse: right + t=0 is upper-right (Y above center)", () => {
  const e = { x: 0, y: 0, w: 100, h: 100, type: "ellipse" };
  const p = edgePoint(e, "right", 0);
  // Angle = -45°, point on circle radius 50 centered at (50, 50):
  // x = 50 + 50*cos(-45°) ≈ 85.355, y = 50 + 50*sin(-45°) ≈ 14.645
  approx(p.x, 50 + 50 * Math.cos(-Math.PI / 4));
  approx(p.y, 50 + 50 * Math.sin(-Math.PI / 4));
  assert.ok(p.y < 50, "t=0 on right side should be ABOVE center (upper-right)");
});

test("edgePoint ellipse: right + t=1 is lower-right (Y below center)", () => {
  const e = { x: 0, y: 0, w: 100, h: 100, type: "ellipse" };
  const p = edgePoint(e, "right", 1);
  assert.ok(p.y > 50, "t=1 on right side should be BELOW center (lower-right)");
});

test("edgePoint ellipse: top + t=0 = upper-left corner area", () => {
  const e = { x: 0, y: 0, w: 100, h: 100, type: "ellipse" };
  const p = edgePoint(e, "top", 0);
  assert.ok(p.x < 50 && p.y < 50, "should be in upper-left quadrant");
});

// ===========================================================================
// routeU
// ===========================================================================

test("routeU: below — matches basic.mjs back-edge polyline", () => {
  // basic.mjs:
  //   from = (655, CY+40) with CY=120, i.e. (655, 160)
  //   to   = (265, 148)  // dx=-390, dy=-12
  //   side="below", clearance=60
  //   expected: [[0,0],[0,60],[-390,60],[-390,-12]]
  const pts = routeU({ x: 655, y: 160 }, { x: 265, y: 148 }, { side: "below", clearance: 60 });
  assert.deepEqual(pts, [[0, 0], [0, 60], [-390, 60], [-390, -12]]);
});

test("routeU: below — clearance extends past target when target is lower", () => {
  // from at y=100, to at y=200, clearance=30 → must drop past y=200, i.e. detourY = 230 (relative)
  const pts = routeU({ x: 0, y: 100 }, { x: 100, y: 200 }, { side: "below", clearance: 30 });
  assert.deepEqual(pts, [[0, 0], [0, 130], [100, 130], [100, 100]]);
  // detourY = max(30, dy+clearance) = max(30, 100+30) = 130 ✓
});

test("routeU: above — symmetric (negative detour)", () => {
  const pts = routeU({ x: 0, y: 0 }, { x: 100, y: 50 }, { side: "above", clearance: 30 });
  assert.deepEqual(pts, [[0, 0], [0, -30], [100, -30], [100, 50]]);
});

test("routeU: right / left — horizontal detour", () => {
  const right = routeU({ x: 0, y: 0 }, { x: 50, y: 100 }, { side: "right", clearance: 40 });
  assert.deepEqual(right, [[0, 0], [90, 0], [90, 100], [50, 100]]);
  // detourX = max(40, 50+40) = 90 ✓

  const left = routeU({ x: 100, y: 0 }, { x: 50, y: 100 }, { side: "left", clearance: 40 });
  // dx=-50, clearance=40 → detourX = min(-40, -90) = -90 (must clear left endpoint at x=-50)
  assert.deepEqual(left, [[0, 0], [-90, 0], [-90, 100], [-50, 100]]);
});

test("routeU: unknown side throws", () => {
  assert.throws(
    () => routeU({ x: 0, y: 0 }, { x: 1, y: 1 }, { side: "diagonal", clearance: 10 }),
    /unknown side "diagonal"/
  );
});

// ===========================================================================
// labelAnchor
// ===========================================================================

test("labelAnchor: prefers longest horizontal segment, label above", () => {
  // U-path going right→down→left: longest segment is the horizontal (200 wide)
  // Compared to vertical (100 tall). Prefer horizontal, label above midpoint.
  const a = labelAnchor([[0, 0], [0, 100], [200, 100], [200, 0]]);
  assert.equal(a.x, 100);     // midpoint of horizontal segment
  assert.equal(a.y, 100 - 6); // padding above
  assert.equal(a.side, "above");
  assert.equal(a.segmentIdx, 1);
});

test("labelAnchor: vertical-only path falls back to right side offset", () => {
  // Straight down: only vertical segment. label goes to the right.
  const a = labelAnchor([[50, 0], [50, 100]]);
  assert.equal(a.x, 50 + 6);
  assert.equal(a.y, 50);
  assert.equal(a.side, "right");
});

test("labelAnchor: preferSide=below honored on horizontal segment", () => {
  const a = labelAnchor([[0, 0], [100, 0]], { preferSide: "below", padding: 10 });
  assert.equal(a.x, 50);
  assert.equal(a.y, 10);
  assert.equal(a.side, "below");
});

test("labelAnchor: preferSide=left honored on vertical segment", () => {
  const a = labelAnchor([[0, 0], [0, 100]], { preferSide: "left", padding: 5 });
  assert.equal(a.x, -5);
  assert.equal(a.y, 50);
  assert.equal(a.side, "left");
});

test("labelAnchor: too few points throws", () => {
  assert.throws(() => labelAnchor([[0, 0]]), /need at least 2 points/);
});

// ===========================================================================
// contrastText
// ===========================================================================

test("contrastText: white on truly dark colors (luminance < 0.179)", () => {
  assert.equal(contrastText("#000000"), "#ffffff"); // pure black
  assert.equal(contrastText("#1971c2"), "#ffffff"); // strokeBlue, L=0.159
  assert.equal(contrastText("#7048e8"), "#ffffff"); // strokePurple, L=0.139
});

test("contrastText: black on light colors", () => {
  assert.equal(contrastText("#a5d8ff"), "#000000"); // light blue (mid)
  assert.equal(contrastText("#e7f5ff"), "#000000"); // very light blue (bg)
  assert.equal(contrastText("#ffffff"), "#000000"); // pure white
});

test("contrastText: warm 'stroke' tones get BLACK (luminance > 0.179 due to red/green channels)", () => {
  // WCAG strict: these colors all have L > 0.179, so black text gives higher contrast.
  // Visually they feel "dark" but math says black is the correct pair.
  assert.equal(contrastText(colors.strokeGreen),  "#000000"); // L=0.255
  assert.equal(contrastText(colors.strokeYellow), "#000000"); // L=0.442
  assert.equal(contrastText(colors.strokeOrange), "#000000"); // L=0.300
  assert.equal(contrastText(colors.strokeRed),    "#000000"); // L=0.270
});

test("contrastText: rejects invalid input", () => {
  assert.throws(() => contrastText("blue"), /expected "#RRGGBB"/);
  assert.throws(() => contrastText("#fff"), /expected "#RRGGBB"/);
  assert.throws(() => contrastText(null), /expected "#RRGGBB"/);
});

// ===========================================================================
// triplet
// ===========================================================================

test("triplet: blue (all three tones exist)", () => {
  const t = triplet("blue");
  assert.equal(t.bg,     colors.bgBlue);
  assert.equal(t.mid,    colors.blue);
  assert.equal(t.stroke, colors.strokeBlue);
});

test("triplet: red (now has strokeRed after palette fill)", () => {
  const t = triplet("red");
  assert.equal(t.bg,     colors.bgRed);
  assert.equal(t.mid,    colors.red);
  assert.equal(t.stroke, colors.strokeRed);
});

test("triplet: orange and gray (now have bg after palette fill)", () => {
  const orange = triplet("orange");
  assert.equal(orange.bg, colors.bgOrange);
  const gray = triplet("gray");
  assert.equal(gray.bg, colors.bgGray);
});

test("triplet: white (missing bgWhite / strokeWhite) → falls back", () => {
  const t = triplet("white");
  assert.equal(t.mid,    colors.white);
  assert.equal(t.bg,     colors.white); // falls back to mid
  assert.equal(t.stroke, "#000000");    // falls back to black
});

test("triplet: unknown color throws", () => {
  assert.throws(() => triplet("magenta"), /unknown color key "magenta"/);
});
