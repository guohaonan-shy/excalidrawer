import { test } from "node:test";
import assert from "node:assert/strict";
import * as pkg from "../src/index.mjs";
import { pie } from "../src/index.mjs";
import { render } from "../src/render.mjs";
import { validate } from "../src/validate.mjs";
import { desugar } from "../src/sugar.mjs";
import { getTool } from "../src/tools/index.mjs";
import { HELPERS } from "../src/tools/compute-layout.mjs";

const approx = (a, b, eps = 1e-6) =>
  assert.ok(Math.abs(a - b) < eps, `expected ${a} ≈ ${b} (Δ=${Math.abs(a - b)})`);

// Four slices with two small ones, like a "what do questions ask" breakdown.
const MIX = [
  { label: "Experience", value: 25.8 },
  { label: "Opinion", value: 50 },
  { label: "Recommendation", value: 13.3 },
  { label: "Trade-off", value: 10.9 },
];
// Five slices where three neighbours are small: their outside labels crowd one side.
const TRAFFIC = [
  { label: "Search", value: 46 },
  { label: "Direct", value: 31 },
  { label: "Social", value: 15 },
  { label: "Referral", value: 5.5 },
  { label: "Email", value: 2.5 },
];

const boxes = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

function inPolygon([px, py], poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const corners = (b) => [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h], [b.x, b.y + b.h]];

// ============================================================================
// geometry
// ============================================================================

test("pie: slices go clockwise from 12 o'clock, each sweep proportional to its value", () => {
  const p = pie({ slices: MIX, r: 140, cx: 350, cy: 300 });
  assert.equal(p.kind, "pie");
  approx(p.total, 100);
  approx(p.slices[0].startDeg, -90);
  for (let i = 1; i < p.slices.length; i++) approx(p.slices[i].startDeg, p.slices[i - 1].endDeg);
  approx(p.slices.at(-1).endDeg, 270);
  p.slices.forEach((s, i) => {
    approx(s.share, MIX[i].value / 100);
    approx(s.endDeg - s.startDeg, s.share * 360);
    approx(s.midDeg, (s.startDeg + s.endDeg) / 2);
  });
  // Experience starts at 12 o'clock and runs clockwise: its arc begins straight above the center, then moves right.
  const arc = p.slices[0].points.slice(1);
  assert.deepEqual(arc[0], [350, 160]);
  assert.ok(arc[1][0] > 350);
});

test("pie: a slice's outline is the center plus arc points on the circle", () => {
  const p = pie({ slices: MIX, r: 140, cx: 350, cy: 300, arcStep: 6 });
  for (const s of p.slices) {
    assert.deepEqual(s.points[0], [350, 300]);
    for (const [x, y] of s.points.slice(1)) approx(Math.hypot(x - 350, y - 300), 140, 0.02);
    // no edge of the arc spans more than arcStep degrees
    assert.ok(s.points.length - 2 >= Math.ceil((s.endDeg - s.startDeg) / 6));
  }
});

test("pie: a single slice is a full circle with no center point, its label at the center", () => {
  const p = pie({ slices: [{ label: "All", value: 7 }], r: 100, cx: 0, cy: 0 });
  const s = p.slices[0];
  assert.equal(s.share, 1);
  assert.ok(!s.points.some(([x, y]) => x === 0 && y === 0));
  assert.equal(s.placement, "inside");
  approx(s.textBox.x + s.textBox.w / 2, 0, 0.01);
  approx(s.textBox.y + s.textBox.h / 2, 0, 0.01);
});

test("pie: a zero value has no slice; index still points into the input", () => {
  const p = pie({ slices: [{ label: "A", value: 3 }, { label: "B", value: 0 }, { label: "C", value: 1 }] });
  assert.deepEqual(p.slices.map((s) => s.index), [0, 2]);
  assert.deepEqual(p.slices.map((s) => s.label), ["A", "C"]);
});

// ============================================================================
// labels
// ============================================================================

test("pie labels: the name and the percentage, decimals and valueText respected", () => {
  const p = pie({ slices: [{ label: "A", value: 1 }, { label: "B", value: 2, valueText: "two" }], decimals: 0 });
  assert.equal(p.slices[0].valueText, "33%");
  assert.match(p.slices[0].textBox.text, /^A\n33%$/);
  assert.match(p.slices[1].textBox.text, /^B\ntwo$/);
  assert.equal(pie({ slices: MIX }).slices[2].valueText, "13.3%");
});

test("pie labels: a label that fits goes inside its own slice, clear of its edges", () => {
  const p = pie({ slices: MIX, r: 140, cx: 350, cy: 300 });
  const opinion = p.slices[1];
  assert.equal(opinion.placement, "inside");
  assert.equal(opinion.leader, undefined);
  for (const c of corners(opinion.textBox)) assert.ok(inPolygon(c, opinion.points), `corner ${c} outside the slice`);
});

test("pie labels: small slices keep their labels — outside, on a leader that starts at the arc", () => {
  const p = pie({ slices: TRAFFIC, r: 140, cx: 350, cy: 300 });
  const small = p.slices.filter((s) => s.share < 0.1);
  assert.ok(small.length >= 2);
  for (const s of small) {
    assert.equal(s.placement, "outside");
    assert.ok(s.textBox.text.startsWith(s.label));
    const [ax, ay] = s.leader.at;
    approx(Math.hypot(ax - 350, ay - 300), 142, 0.05); // 2 px off the arc
    // the leader's last point is at the label's left (right side) or right (left side) edge, at its middle height
    const [lx, ly] = s.leader.points.at(-1);
    const end = [ax + lx, ay + ly];
    const b = s.textBox;
    approx(end[1], b.y + b.h / 2, 0.02);
    assert.ok(Math.abs(end[0] - b.x) <= 4.01 || Math.abs(end[0] - (b.x + b.w)) <= 4.01);
    // the whole label sits outside the circle
    for (const [x, y] of corners(b)) assert.ok(Math.hypot(x - 350, y - 300) > 140);
  }
});

test("pie labels: outside labels never overlap each other or another slice's label", () => {
  for (const slices of [MIX, TRAFFIC]) {
    const p = pie({ slices, r: 140, cx: 350, cy: 300 });
    const bs = p.slices.map((s) => s.textBox);
    for (let i = 0; i < bs.length; i++) {
      for (let j = i + 1; j < bs.length; j++) assert.ok(!boxes(bs[i], bs[j]), `labels ${i} and ${j} overlap`);
    }
  }
});

test("pie labels: a leader's horizontal leg stays outside the circle", () => {
  const p = pie({ slices: TRAFFIC, r: 140, cx: 350, cy: 300 });
  for (const s of p.slices.filter((x) => x.leader)) {
    const [ax, ay] = s.leader.at;
    const [p1, p2] = s.leader.points.slice(1).map(([x, y]) => [ax + x, ay + y]);
    for (let k = 0; k <= 10; k++) {
      const x = p1[0] + ((p2[0] - p1[0]) * k) / 10;
      assert.ok(Math.hypot(x - 350, p1[1] - 300) >= 140, `${s.label}: horizontal leg enters the circle`);
    }
  }
});

test("pie labels: CJK names wrap and fit like Latin ones", () => {
  const p = pie({ slices: [{ label: "经理、办公室或主管", value: 58 }, { label: "教授、导师或教练", value: 28 }, { label: "同辈", value: 14 }], r: 140, cx: 350, cy: 300 });
  for (const s of p.slices) {
    assert.ok(s.textBox.text.replace(/\n/g, "").startsWith(s.label));
    if (s.placement === "inside") for (const c of corners(s.textBox)) assert.ok(inPolygon(c, s.points));
  }
});

test("pie: bounds cover the circle and every label", () => {
  const p = pie({ slices: TRAFFIC, r: 140, cx: 350, cy: 300 });
  const { x, y, w, h } = p.bounds;
  assert.ok(x <= 210 && y <= 160 && x + w >= 490 && y + h >= 440);
  for (const s of p.slices) {
    const b = s.textBox;
    assert.ok(b.x >= x - 0.01 && b.y >= y - 0.01 && b.x + b.w <= x + w + 0.01 && b.y + b.h <= y + h + 0.01);
  }
});

// ============================================================================
// rendering + Layer A
// ============================================================================

function draw(p) {
  const els = [];
  for (const s of p.slices) els.push({ shape: "polygon", id: `s${s.index}`, points: s.points, fill: ["blue", "orange", "purple", "green", "gray"][s.index] });
  for (const s of p.slices) {
    const b = s.textBox;
    els.push({ shape: "text", at: [b.x, b.y], size: [b.w, b.h], text: b.text, fontSize: b.fontSize });
    if (s.leader) els.push({ shape: "line", at: s.leader.at, points: s.leader.points });
  }
  return els;
}

test("pie drawn as polygons + text + leaders renders lint clean", async () => {
  for (const slices of [MIX, TRAFFIC]) {
    const out = await render(draw(pie({ slices, r: 140, cx: 350, cy: 300 })), { formats: ["svg"] });
    assert.deepEqual(out.warnings ?? [], []);
  }
});

test("Layer A compares two polygons by their outlines, not their boxes", () => {
  // two wedges of one pie: their bounding boxes overlap, their areas don't
  const p = pie({ slices: [{ label: "A", value: 1 }, { label: "B", value: 1 }, { label: "C", value: 1 }], r: 100 });
  const raw = desugar(p.slices.map((s) => ({ shape: "polygon", id: s.label, points: s.points, fill: "blue" })));
  assert.deepEqual(validate(raw).filter((w) => w.code === "SHAPE_OVERLAP"), []);
  // two triangles that do overlap are still flagged
  const tri = (id, dx) => ({ shape: "polygon", id, points: [[dx, 0], [dx + 100, 0], [dx, 100]], fill: "blue" });
  const w = validate(desugar([tri("t1", 0), tri("t2", 20)])).filter((x) => x.code === "SHAPE_OVERLAP");
  assert.equal(w.length, 1);
});

// ============================================================================
// errors + surfaces
// ============================================================================

test("pie: bad input is a clear error", () => {
  assert.throws(() => pie({}), /pie: `slices`/);
  assert.throws(() => pie({ slices: [{ label: "", value: 1 }] }), /slices\[0\]/);
  assert.throws(() => pie({ slices: [{ label: "A", value: -1 }] }), /slices\[0\]\.value/);
  assert.throws(() => pie({ slices: [{ label: "A", value: 0 }] }), /total above 0/);
  assert.throws(() => pie({ slices: MIX, r: 0 }), /`r`/);
  assert.throws(() => pie({ slices: MIX, leader: [1] }), /`leader`/);
});

test("pie is exported and reachable through compute_layout", () => {
  assert.equal(typeof pkg.pie, "function");
  assert.ok(HELPERS.includes("pie"));
  const tool = getTool("compute_layout");
  const ok = tool.run({ helper: "pie", args: { slices: MIX } });
  assert.equal(ok.result.kind, "pie");
  assert.match(tool.run({ helper: "pie", args: {} }).error, /slices/);
});
