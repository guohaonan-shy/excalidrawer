import { test } from "node:test";
import assert from "node:assert/strict";

import { arrow, line, orthogonalize, ARROWHEADS } from "../src/elements.mjs";
import { toSvg } from "../src/export.mjs";
import { desugar } from "../src/sugar.mjs";

// --- builders ---------------------------------------------------------------

test("arrow: arrowType maps to Excalidraw's roundness / elbowed fields", () => {
  const pts = [[0, 0], [50, 0], [50, 50]];
  const round = arrow("r", 0, 0, pts);
  assert.deepEqual(round.roundness, { type: 2 });
  assert.equal(round.elbowed, false);

  const sharp = arrow("s", 0, 0, pts, { arrowType: "sharp" });
  assert.equal(sharp.roundness, null);

  const elbow = arrow("e", 0, 0, [[0, 0], [80, 40]], { arrowType: "elbow" });
  assert.equal(elbow.elbowed, true);
  assert.equal(elbow.roundness, null);
  assert.deepEqual(elbow.points, [[0, 0], [80, 0], [80, 40]]);

  assert.throws(() => arrow("x", 0, 0, pts, { arrowType: "wavy" }), /arrowType/);
});

test("arrow: width/height are the points' bounding box, not the last point", () => {
  const a = arrow("a", 0, 0, [[0, 0], [80, -30], [200, 0]]);
  assert.equal(a.width, 200);
  assert.equal(a.height, 30);
});

test("arrow: arrowheads, stroke style and named stroke width pass through", () => {
  const a = arrow("a", 0, 0, [[0, 0], [100, 0]], {
    startArrowhead: "circle", endArrowhead: "triangle", strokeStyle: "dotted", strokeWidth: "bold",
  });
  assert.equal(a.startArrowhead, "circle");
  assert.equal(a.endArrowhead, "triangle");
  assert.equal(a.strokeStyle, "dotted");
  assert.equal(a.strokeWidth, 4);
});

test("line: type line, no arrowheads, edges → roundness", () => {
  const sharp = line("l", 0, 0, [[0, 0], [50, 20], [100, 0]]);
  assert.equal(sharp.type, "line");
  assert.equal(sharp.roundness, null);
  assert.equal(sharp.startArrowhead, null);
  assert.equal(sharp.endArrowhead, null);
  const round = line("l2", 0, 0, [[0, 0], [50, 20], [100, 0]], { edges: "round", strokeWidth: "thin" });
  assert.deepEqual(round.roundness, { type: 2 });
  assert.equal(round.strokeWidth, 1);
});

test("orthogonalize: inserts corners and drops collinear points", () => {
  assert.deepEqual(orthogonalize([[0, 0], [30, 0], [60, 0], [60, 40]]), [[0, 0], [60, 0], [60, 40]]);
  assert.deepEqual(orthogonalize([[0, 0], [40, 40], [80, 80]]), [[0, 0], [40, 0], [40, 40], [80, 40], [80, 80]]);
});

// --- rendering --------------------------------------------------------------

/** Pull the end arrowhead's "M x3,y3 L tip L x4,y4" path out of the SVG. */
function headPath(svg) {
  const m = [...svg.matchAll(/<path d="M([\d.-]+),([\d.-]+) L([\d.-]+),([\d.-]+) L([\d.-]+),([\d.-]+)" fill="none"/g)];
  return m.map((g) => g.slice(1).map(Number));
}

test("render: curved arrowhead is centered on the curve's tail", () => {
  // The issue: on a curved tail the head was aimed by a ~12px sample but
  // drawn 24px long, so it sat lopsided. Now the head's axis must match the
  // chord from the tip to the point one head-length back along the curve.
  const a = arrow("a", 0, 0, [[0, 0], [100, 0], [100, 80]]);
  const svg = toSvg([a]);
  const [h] = headPath(svg);
  assert.ok(h, "end arrowhead path present");
  const [x3, y3, tx, ty, x4, y4] = h;
  assert.deepEqual([tx, ty], [100, 80]);
  // Wings are symmetric: same length (25px Excalidraw size) ...
  const l3 = Math.hypot(x3 - tx, y3 - ty);
  const l4 = Math.hypot(x4 - tx, y4 - ty);
  assert.ok(Math.abs(l3 - 25) < 0.05 && Math.abs(l4 - 25) < 0.05, `wing lengths ${l3} ${l4}`);
  // ... ±20° from the axis.
  const between = Math.acos(((x3 - tx) * (x4 - tx) + (y3 - ty) * (y4 - ty)) / (l3 * l4)) * 180 / Math.PI;
  assert.ok(Math.abs(between - 40) < 0.1, `wing spread ${between}`);
});

test("render: head size does not scale with stroke width", () => {
  const svg = toSvg([arrow("a", 0, 0, [[0, 0], [200, 0]], { strokeWidth: 4 })]);
  const [[x3, y3, tx, ty]] = headPath(svg);
  assert.ok(Math.abs(Math.hypot(x3 - tx, y3 - ty) - 25) < 0.05);
});

test("render: start and end arrowheads, every arrowhead kind renders", () => {
  for (const kind of ARROWHEADS) {
    const svg = toSvg([arrow("a", 0, 0, [[0, 0], [200, 0]], { startArrowhead: kind, endArrowhead: kind })]);
    const shapes = (svg.match(/<(path|circle) /g) || []).length;
    assert.equal(shapes, 3, `${kind}: shaft + 2 heads`);
  }
});

test("render: no marker defs — arrowheads are plain geometry", () => {
  const svg = toSvg([arrow("a", 0, 0, [[0, 0], [200, 0]])]);
  assert.doesNotMatch(svg, /<marker/);
});

test("render: line element renders, elbow arrow has rounded corners", () => {
  const svg = toSvg([
    line("l", 0, 0, [[0, 0], [100, 0]]),
    arrow("e", 0, 50, [[0, 0], [100, 0], [100, 100]], { arrowType: "elbow" }),
  ]);
  assert.match(svg, /M0,0 L100,0/);
  assert.match(svg, / Q100,50 /); // corner at (100,50) is a quadratic curve
});

// --- sugar ------------------------------------------------------------------

test("sugar: arrow takes arrowType / startHead / head / strokeStyle / strokeWidth", () => {
  const [a] = desugar([{
    shape: "arrow", id: "a", at: [0, 0], points: [[0, 0], [100, 50]],
    arrowType: "elbow", startHead: "diamond", head: "triangle_outline",
    strokeStyle: "dotted", strokeWidth: "thin",
  }]);
  assert.equal(a.elbowed, true);
  assert.equal(a.startArrowhead, "diamond");
  assert.equal(a.endArrowhead, "triangle_outline");
  assert.equal(a.strokeStyle, "dotted");
  assert.equal(a.strokeWidth, 1);
});

test("sugar: line shape, id-anchored and manual", () => {
  const raw = desugar([
    { shape: "rect", id: "a", at: [0, 0], size: [50, 50] },
    { shape: "rect", id: "b", at: [200, 0], size: [50, 50] },
    { shape: "line", id: "l1", from: "a", to: "b", strokeWidth: 4 },
    { shape: "line", id: "l2", at: [0, 100], points: [[0, 0], [50, 20], [100, 0]], edges: "round" },
  ]);
  const l1 = raw.find((e) => e.id === "l1");
  const l2 = raw.find((e) => e.id === "l2");
  assert.equal(l1.type, "line");
  assert.equal(l1.strokeWidth, 4);
  assert.deepEqual(l2.roundness, { type: 2 });
});

test("sugar: invalid linear options are reported", () => {
  const bad = (extra) => () => desugar([{ shape: "arrow", at: [0, 0], points: [[0, 0], [10, 0]], ...extra }]);
  assert.throws(bad({ arrowType: "wavy" }), /arrowType must be one of/);
  assert.throws(bad({ startHead: "x" }), /startHead must be one of/);
  assert.throws(bad({ strokeStyle: "zigzag" }), /strokeStyle must be one of/);
  assert.throws(bad({ strokeWidth: "huge" }), /strokeWidth must be/);
  assert.throws(
    () => desugar([{ shape: "line", at: [0, 0], points: [[0, 0], [10, 0]], edges: "soft" }]),
    /edges must be one of/,
  );
});
