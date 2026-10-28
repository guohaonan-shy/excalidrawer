import { test } from "node:test";
import assert from "node:assert/strict";
import { desugar, SugarError } from "../src/sugar.mjs";
import { validate } from "../src/validate.mjs";
import { toSvg, excalidraw } from "../src/index.mjs";
import { render } from "../src/render.mjs";

// A trapezoid, vertices given clockwise from the top-left, absolute coordinates.
const TRAP = [[60, 100], [260, 100], [240, 160], [80, 160]];
const poly = (extra = {}) => ({ shape: "polygon", id: "p", points: TRAP, fill: "blue", ...extra });

// ============================================================================
// sugar: polygon → one closed, filled line element
// ============================================================================

test("polygon sugar expands to a single closed line element with the fill on it", () => {
  const raw = desugar([poly()]);
  assert.equal(raw.length, 1);
  const [el] = raw;
  assert.equal(el.id, "p");
  assert.equal(el.type, "line");
  assert.equal(el.polygon, true);
  assert.equal(el.backgroundColor, "#a5d8ff");
  // closed: last point equals first
  assert.deepEqual(el.points.at(0), el.points.at(-1));
  assert.equal(el.points.length, TRAP.length + 1);
  // x, y, width, height are the vertices' bounding box
  assert.deepEqual([el.x, el.y, el.width, el.height], [60, 100, 200, 60]);
  // absolute vertices round-trip through the relative points
  const abs = el.points.map(([dx, dy]) => [el.x + dx, el.y + dy]);
  assert.deepEqual(abs.slice(0, 4), TRAP);
  // straight edges, no arrowheads
  assert.equal(el.roundness, null);
  assert.equal(el.startArrowhead, null);
  assert.equal(el.endArrowhead, null);
});

test("polygon sugar: stroke and dashed apply, a last point equal to the first is not doubled", () => {
  const [el] = desugar([poly({ stroke: "blue", dashed: true, points: [...TRAP, TRAP[0]] })]);
  assert.equal(el.strokeColor, "#1971c2");
  assert.equal(el.strokeStyle, "dashed");
  assert.equal(el.points.length, TRAP.length + 1);
});

test("polygon sugar without fill stays transparent", () => {
  const [el] = desugar([poly({ fill: undefined })]);
  assert.equal(el.backgroundColor, "transparent");
});

test("polygon sugar: bad input is reported with the element index and id", () => {
  const cases = [
    [{ shape: "polygon", id: "a", fill: "blue" }, /element\[0\] \(a\).*points/],
    [{ shape: "polygon", id: "a", points: [[0, 0], [10, 10]] }, /element\[0\] \(a\).*at least 3/],
    [{ shape: "polygon", id: "a", points: [[0, 0], [10, 0], ["x", 5]] }, /element\[0\] \(a\).*\[x,y\]/],
    [{ shape: "polygon", id: "a", points: [[0, 0], [10, 0], [20, 0]] }, /element\[0\] \(a\).*area/],
    [{ shape: "polygon", id: "a", points: TRAP, fill: "nope" }, /element\[0\] \(a\).*unknown fill color/],
  ];
  for (const [el, re] of cases) {
    assert.throws(() => desugar([el]), (e) => e instanceof SugarError && re.test(e.message), JSON.stringify(el));
  }
});

test("an arrow can still connect to a polygon by id (its bounding box)", () => {
  const raw = desugar([
    poly(),
    { shape: "rect", id: "r", at: [300, 100], size: [80, 60] },
    { shape: "arrow", from: "p", to: "r", fromSide: "right", toSide: "left" },
  ]);
  const a = raw.find((e) => e.type === "arrow");
  assert.equal(a.x, 260); // right edge of the polygon's bounding box
});

// ============================================================================
// export: the fill survives; lines and arrows stay unfilled
// ============================================================================

test("SVG export draws a polygon as a closed path filled with its color", () => {
  const svg = toSvg(desugar([poly()]));
  const m = svg.match(/<path [^>]*>/g).find((p) => p.includes('fill="#a5d8ff"'));
  assert.ok(m, `no filled path in:\n${svg}`);
  assert.match(m, /d="[^"]*Z"/, "path must be closed");
});

test("a plain line (and an arrow) with a background color is still exported unfilled", () => {
  const raw = desugar([
    { shape: "line", at: [0, 0], points: [[0, 0], [100, 0]] },
    { shape: "arrow", at: [0, 20], points: [[0, 0], [100, 0]] },
  ]);
  raw.forEach((e) => { e.backgroundColor = "#a5d8ff"; });
  const svg = toSvg(raw);
  assert.ok(!svg.includes('fill="#a5d8ff"'));
});

test("an unfilled polygon is exported closed with fill none", () => {
  const svg = toSvg(desugar([poly({ fill: undefined })]));
  const m = svg.match(/<path [^>]*>/g)[0];
  assert.match(m, /fill="none"/);
  assert.match(m, /Z"/);
});

test("the .excalidraw file holds a closed line element (polygon: true)", () => {
  const file = JSON.parse(excalidraw(desugar([poly()])));
  const el = file.elements[0];
  assert.equal(el.type, "line");
  assert.equal(el.polygon, true);
  assert.deepEqual(el.points.at(0), el.points.at(-1));
});

// ============================================================================
// Layer A: a polygon is a shape, ranged by its bounding box
// ============================================================================

test("a polygon overlapping a rectangle is flagged SHAPE_OVERLAP", () => {
  const raw = desugar([poly(), { shape: "rect", id: "r", at: [200, 120], size: [120, 80] }]);
  const w = validate(raw).filter((x) => x.code === "SHAPE_OVERLAP");
  assert.equal(w.length, 1);
  assert.deepEqual([...w[0].ids].sort(), ["p", "r"]);
});

test("two stacked polygons with a gap do not overlap", () => {
  const raw = desugar([
    poly({ id: "a" }),
    poly({ id: "b", points: TRAP.map(([x, y]) => [x, y + 70]) }),
  ]);
  assert.deepEqual(validate(raw), []);
});

test("a connector that runs through a polygon between two other shapes is flagged ARROW_CROSSES_SHAPE", () => {
  const raw = desugar([
    { shape: "rect", id: "l", at: [0, 100], size: [40, 60] },
    { shape: "rect", id: "r", at: [320, 100], size: [40, 60] },
    poly(),
    { shape: "arrow", from: "l", to: "r", fromSide: "right", toSide: "left" },
  ]);
  const w = validate(raw).filter((x) => x.code === "ARROW_CROSSES_SHAPE");
  assert.equal(w.length, 1);
  assert.ok(w[0].ids.includes("p"));
});

test("dark text on a light polygon fill does not warn; light text on it does", () => {
  const label = (extra) => ({ shape: "text", id: "t", at: [80, 120], size: [160, 22], text: "Layer", ...extra });
  assert.deepEqual(validate(desugar([poly(), label({})])), []);
  const bad = validate(desugar([poly(), label({ textColor: "#ffffff" })]));
  assert.deepEqual(bad.map((x) => x.code), ["LOW_CONTRAST"]);
});

test("light text on a dark polygon fill is not flagged, dark text on it is", () => {
  const label = (extra) => ({ shape: "text", id: "t", at: [80, 120], size: [160, 22], text: "Layer", ...extra });
  const dark = poly({ fill: "#0b2545" });
  assert.deepEqual(validate(desugar([dark, label({ textColor: "#ffffff" })])), []);
  assert.deepEqual(validate(desugar([dark, label({})])).map((x) => x.code), ["LOW_CONTRAST"]);
});

test("text away from every polygon is still judged against the white canvas", () => {
  const raw = desugar([poly(), { shape: "text", id: "t", at: [600, 600], size: [100, 22], text: "far", textColor: "#ffffff" }]);
  assert.deepEqual(validate(raw).map((x) => x.code), ["LOW_CONTRAST"]);
});

test("render() takes a polygon end to end, warning-free", async () => {
  const out = await render([poly(), { shape: "text", at: [80, 120], size: [160, 22], text: "Layer" }], { formats: ["svg"] });
  assert.deepEqual(out.warnings, []);
  assert.match(out.outputs.svg, /fill="#a5d8ff"/);
});
