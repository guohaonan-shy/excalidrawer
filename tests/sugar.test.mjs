import { test } from "node:test";
import assert from "node:assert/strict";

import { desugar, SugarError } from "../src/sugar.mjs";

// --- shape sugar -----------------------------------------------------------

test("rect sugar: resolves palette fill, keeps roundness", () => {
  const [r] = desugar([{ shape: "rect", id: "a", at: [0, 0], size: [100, 50], fill: "blue" }]);
  assert.equal(r.id, "a");
  assert.equal(r.type, "rectangle");
  assert.equal(r.backgroundColor, "#a5d8ff");
  assert.deepEqual(r.roundness, { type: 3 });
});

test("shape sugar: non-empty text expands into a bound [shape, text] pair", () => {
  const raw = desugar([{ shape: "rect", id: "a", at: [0, 0], size: [100, 50], text: "hi" }]);
  assert.equal(raw.length, 2);
  assert.deepEqual(raw[0].boundElements, [{ id: "a-t", type: "text" }]);
  assert.equal(raw[1].type, "text");
  assert.equal(raw[1].id, "a-t");
  assert.equal(raw[1].text, "hi");
  assert.equal(raw[1].containerId, "a");
});

test("shape sugar: missing id auto-generates el-<index>", () => {
  const [r] = desugar([{ shape: "rect", at: [0, 0], size: [10, 10] }]);
  assert.equal(r.id, "el-0");
});

test("color resolution: hex passthrough, transparent, stroke accent", () => {
  const [hex] = desugar([{ shape: "rect", id: "a", at: [0, 0], size: [10, 10], fill: "#123456" }]);
  assert.equal(hex.backgroundColor, "#123456");
  const [tr] = desugar([{ shape: "rect", id: "b", at: [0, 0], size: [10, 10], fill: "transparent" }]);
  assert.equal(tr.backgroundColor, "transparent");
  const [st] = desugar([{ shape: "rect", id: "c", at: [0, 0], size: [10, 10], stroke: "blue" }]);
  assert.equal(st.strokeColor, "#1971c2");
});

test("text sugar: standalone text element", () => {
  const [t] = desugar([{ shape: "text", id: "t", at: [0, 0], size: [100, 20], text: "hello", fontSize: 18 }]);
  assert.equal(t.type, "text");
  assert.equal(t.text, "hello");
  assert.equal(t.fontSize, 18);
});

test("shape sugar: unknown fill color throws SugarError with issue", () => {
  try {
    desugar([{ shape: "rect", id: "a", at: [0, 0], size: [10, 10], fill: "bogus" }]);
    assert.fail("should have thrown");
  } catch (e) {
    assert.ok(e instanceof SugarError);
    assert.ok(Array.isArray(e.issues));
    assert.match(e.issues[0], /unknown fill color "bogus"/);
  }
});

test("shape sugar: bad at/size shapes raise issues", () => {
  assert.throws(() => desugar([{ shape: "rect", id: "a", at: [0], size: [10, 10] }]), /at.*\[x,y\]/);
  assert.throws(() => desugar([{ shape: "rect", id: "a", at: [0, 0], size: "big" }]), /size.*\[w,h\]/);
});

// --- raw passthrough -------------------------------------------------------

test("raw passthrough: partial raw element gets base fields filled (no NaN trap)", () => {
  const [r] = desugar([{ id: "r", type: "rectangle", x: 0, y: 0, width: 10, height: 10 }]);
  assert.equal(r.opacity, 100);
  assert.equal(r.strokeColor, "#1e1e1e");
  assert.deepEqual(r.groupIds, []);
  assert.equal(r.isDeleted, false);
});

test("mixed array: sugar and raw coexist", () => {
  const raw = desugar([
    { shape: "rect", id: "a", at: [0, 0], size: [10, 10] },
    { id: "r", type: "ellipse", x: 5, y: 5, width: 8, height: 8 },
  ]);
  assert.equal(raw.length, 2);
  assert.equal(raw[0].id, "a");
  assert.equal(raw[0].type, "rectangle");
  assert.equal(raw[1].type, "ellipse");
  assert.equal(raw[1].opacity, 100);
});

// --- arrow sugar -----------------------------------------------------------

const twoBoxes = [
  { shape: "rect", id: "a", at: [0, 0], size: [100, 50] },
  { shape: "rect", id: "b", at: [200, 0], size: [100, 50] },
];

test("arrow L1: auto sides connect facing edges", () => {
  const raw = desugar([...twoBoxes, { shape: "arrow", id: "e", from: "a", to: "b" }]);
  const arrow = raw.find((r) => r.id === "e");
  assert.equal(arrow.type, "arrow");
  assert.equal(arrow.x, 100); // a's right edge
  assert.equal(arrow.y, 25);
  assert.deepEqual(arrow.points, [[0, 0], [100, 0]]); // → b's left edge
});

test("arrow L2: explicit fromSide/toSide are honored", () => {
  const raw = desugar([...twoBoxes, { shape: "arrow", id: "e", from: "a", to: "b", fromSide: "bottom", toSide: "bottom" }]);
  const arrow = raw.find((r) => r.id === "e");
  assert.equal(arrow.x, 50); // a's bottom edge midpoint
  assert.equal(arrow.y, 50);
});

test("arrow L3: via produces a multi-point U-route", () => {
  const raw = desugar([...twoBoxes, { shape: "arrow", id: "e", from: "a", to: "b", via: "below", clearance: 30 }]);
  const arrow = raw.find((r) => r.id === "e");
  assert.equal(arrow.points.length, 4);
});

test("arrow auto-route: perpendicular sides produce an L-bend along the fromSide axis", () => {
  const raw = desugar([
    { shape: "rect", id: "a", at: [200, 100], size: [100, 50] },
    { shape: "rect", id: "b", at: [0, 0], size: [100, 50] },
    { shape: "arrow", id: "e", from: "a", to: "b", fromSide: "left", toSide: "bottom" },
  ]);
  const arrow = raw.find((r) => r.id === "e");
  // start = a's left-edge mid (200,125); end = b's bottom-edge mid (50,50)
  assert.equal(arrow.x, 200);
  assert.equal(arrow.y, 125);
  // horizontal exit → travel in x first, then y
  assert.deepEqual(arrow.points, [[0, 0], [-150, 0], [-150, -75]]);
});

test("arrow auto-route: vertically disjoint boxes connect bottom→top even when far in x", () => {
  const raw = desugar([
    { shape: "rect", id: "a", at: [0, 0], size: [100, 50] },
    { shape: "rect", id: "b", at: [400, 200], size: [100, 50] },
    { shape: "arrow", id: "e", from: "a", to: "b" },
  ]);
  const arrow = raw.find((r) => r.id === "e");
  assert.equal(arrow.x, 50); // a's bottom-edge mid, not its side
  assert.equal(arrow.y, 50);
  assert.equal(arrow.points.length, 4); // parallel sides + x-offset → Z-route
});

test("arrow: fromT/toT slide the attachment point along the edge", () => {
  const raw = desugar([
    { shape: "rect", id: "a", at: [0, 0], size: [100, 50] },
    { shape: "rect", id: "b", at: [0, 200], size: [100, 50] },
    { shape: "arrow", id: "e", from: "a", to: "b", fromSide: "bottom", toSide: "top", fromT: 0.25, toT: 0.75 },
  ]);
  const arrow = raw.find((r) => r.id === "e");
  assert.equal(arrow.x, 25); // a's bottom edge at t=0.25
  assert.equal(arrow.y, 50);
});

test("shape sugar: dashed sets a dashed stroke style", () => {
  const [r] = desugar([{ shape: "rect", id: "a", at: [0, 0], size: [10, 10], dashed: true }]);
  assert.equal(r.strokeStyle, "dashed");
});

test("arrow: dashed + head:'none' produce a plain dashed line", () => {
  const raw = desugar([
    ...twoBoxes,
    { shape: "arrow", id: "e", from: "a", to: "b", dashed: true, head: "none" },
  ]);
  const arrow = raw.find((r) => r.id === "e");
  assert.equal(arrow.strokeStyle, "dashed");
  assert.equal(arrow.endArrowhead, null);
});

test("arrow: invalid head throws SugarError", () => {
  assert.throws(
    () =>
      desugar([
        ...twoBoxes,
        { shape: "arrow", from: "a", to: "b", head: "circle" },
      ]),
    /head must be "arrow" or "none"/
  );
});

test("arrow: labelT slides the label earlier on the path than the auto midpoint", () => {
  const base = [
    { shape: "rect", id: "a", at: [0, 0], size: [100, 50] },
    { shape: "rect", id: "b", at: [300, 0], size: [100, 50] },
  ];
  const def = desugar([...base, { shape: "arrow", id: "e", from: "a", to: "b", text: "msg" }])
    .find((r) => r.id === "e-t");
  const early = desugar([...base, { shape: "arrow", id: "e", from: "a", to: "b", text: "msg", labelT: 0.2 }])
    .find((r) => r.id === "e-t");
  assert.ok(early.x < def.x, "labelT=0.2 should anchor earlier along the path");
});

test("arrow: out-of-range labelT throws SugarError", () => {
  assert.throws(
    () =>
      desugar([
        ...twoBoxes,
        { shape: "arrow", from: "a", to: "b", text: "x", labelT: 2 },
      ]),
    /labelT must be a number in \[0,1\]/
  );
});

test("arrow: out-of-range fromT throws SugarError", () => {
  assert.throws(
    () =>
      desugar([
        { shape: "rect", id: "a", at: [0, 0], size: [10, 10] },
        { shape: "rect", id: "b", at: [0, 100], size: [10, 10] },
        { shape: "arrow", from: "a", to: "b", fromT: 1.5 },
      ]),
    /fromT must be a number in \[0,1\]/
  );
});

test("arrow L4: explicit at + points pass through", () => {
  const [arrow] = desugar([{ shape: "arrow", id: "x", at: [0, 0], points: [[0, 0], [50, 0]] }]);
  assert.equal(arrow.type, "arrow");
  assert.deepEqual(arrow.points, [[0, 0], [50, 0]]);
});

test("arrow: text label becomes a standalone text element", () => {
  const raw = desugar([...twoBoxes, { shape: "arrow", id: "e", from: "a", to: "b", text: "Yes" }]);
  const label = raw.find((r) => r.id === "e-t");
  assert.equal(label.type, "text");
  assert.equal(label.text, "Yes");
});

test("arrow: unknown from id throws SugarError", () => {
  assert.throws(
    () => desugar([{ shape: "rect", id: "a", at: [0, 0], size: [10, 10] }, { shape: "arrow", from: "ghost", to: "a" }]),
    /unknown id "ghost"/
  );
});

test("arrow: bad fromSide throws SugarError", () => {
  assert.throws(
    () => desugar([...twoBoxes, { shape: "arrow", from: "a", to: "b", fromSide: "diag" }]),
    /fromSide must be one of/
  );
});

test("arrow L4: points without at raises an issue", () => {
  assert.throws(() => desugar([{ shape: "arrow", id: "x", points: [[0, 0], [50, 0]] }]), /needs "at"/);
});
