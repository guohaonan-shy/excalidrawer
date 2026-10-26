import { test } from "node:test";
import assert from "node:assert/strict";
import * as pkg from "../src/index.mjs";
import { axis } from "../src/index.mjs";
import { render } from "../src/render.mjs";
import { getTool } from "../src/tools/index.mjs";
import { HELPERS } from "../src/tools/compute-layout.mjs";

const approx = (a, b, eps = 1e-6) =>
  assert.ok(Math.abs(a - b) < eps, `expected ${a} ≈ ${b} (Δ=${Math.abs(a - b)})`);

const from = { x: 100, y: 50 };
const months = [0, 1, 2, 6].map((value) => ({ value, label: `M${value}` }));

// ---------------------------------------------------------------------------
// placement
// ---------------------------------------------------------------------------

test("axis: valued marks are placed linearly over the length", () => {
  const a = axis({ from, marks: months, length: 600 });
  assert.equal(a.kind, "axis");
  assert.deepEqual(a.marks.map((m) => m.x), [100, 200, 300, 700]);
  assert.ok(a.marks.every((m) => m.y === 50));
  assert.deepEqual(a.to, { x: 700, y: 50 });
  assert.deepEqual(a.from, from);
  approx(a.marks[1].t, 100 / 600);
  assert.equal(a.marks[3].t, 1);
  assert.equal(a.marks[0].label, "M0");
  assert.equal(a.marks[2].value, 2);
});

test("axis: mark `extend` pads the valued span on both ends", () => {
  const a = axis({ from, marks: months, length: 700, extend: [50, 50] });
  assert.deepEqual(a.marks.map((m) => m.x), [150, 250, 350, 750]);
  assert.deepEqual(a.to, { x: 800, y: 50 });
});

test("axis: marks without value are evenly spaced; `to` is `extend[1]` past the last", () => {
  const a = axis({
    from, marks: [{ label: "a" }, { label: "b" }, { label: "c" }], spacing: 160, extend: [0, 110],
  });
  assert.deepEqual(a.marks.map((m) => m.x), [100, 260, 420]);
  assert.deepEqual(a.to, { x: 530, y: 50 });
  assert.equal(a.marks[0].value, undefined);
});

test("axis: spacing defaults to 160", () => {
  const a = axis({ from, marks: [{}, {}, {}] });
  assert.deepEqual(a.marks.map((m) => m.x), [100, 260, 420]);
  assert.deepEqual(a.to, { x: 420, y: 50 });
});

test("axis: valueless marks with `length` are spread evenly inside `extend`", () => {
  const a = axis({ from, marks: [{}, {}, {}], length: 500, extend: [20, 80] });
  assert.deepEqual(a.marks.map((m) => m.x), [120, 320, 520]);
  assert.deepEqual(a.to, { x: 600, y: 50 });
});

test("axis: dir 'y' runs downward", () => {
  const a = axis({ from, dir: "y", marks: months, length: 600 });
  assert.deepEqual(a.marks.map((m) => m.y), [50, 150, 250, 650]);
  assert.ok(a.marks.every((m) => m.x === 100));
  assert.deepEqual(a.to, { x: 100, y: 650 });
});

test("axis: marks keep their id", () => {
  const a = axis({ from, marks: [{ id: "m1" }, { id: "m2" }] });
  assert.deepEqual(a.marks.map((m) => m.id), ["m1", "m2"]);
});

// ---------------------------------------------------------------------------
// segments
// ---------------------------------------------------------------------------

test("axis: gap 0 is one segment from `from` to `to`", () => {
  const a = axis({ from, marks: months, length: 600 });
  assert.equal(a.segments.length, 1);
  assert.deepEqual(a.segments[0], { at: [100, 50], points: [[0, 0], [600, 0]], arrow: false });
});

test("axis: gap breaks the line on both sides of every mark", () => {
  // marks at 0, 100, 200, 600 of a 600-long axis, gap 10
  const a = axis({ from, marks: months, length: 600, gap: 10 });
  // 1st mark sits at 0 and the 4th at 600 → no room before / after them.
  const xs = a.segments.map((s) => [s.at[0], s.at[0] + s.points[1][0]]);
  assert.deepEqual(xs, [[110, 190], [210, 290], [310, 690]]);
  assert.ok(a.segments.every((s) => s.at[1] === 50 && s.points[1][1] === 0));
});

test("axis: gap leaves the free stretch before the first and after the last mark", () => {
  const a = axis({ from, marks: [{}, {}], spacing: 100, extend: [60, 60], gap: 10 });
  // marks at 160, 260; axis spans 100..320
  const xs = a.segments.map((s) => [s.at[0], s.at[0] + s.points[1][0]]);
  assert.deepEqual(xs, [[100, 150], [170, 250], [270, 320]]);
});

test("axis: `arrow:'end'` marks only the last segment", () => {
  const a = axis({ from, marks: months, length: 600, gap: 10, arrow: "end" });
  assert.ok(a.segments.length > 1);
  const flags = a.segments.map((s) => s.arrow);
  assert.deepEqual(flags, flags.map((_, i) => i === flags.length - 1));
});

test("axis: `arrow:'end'` on an unbroken axis arrows the single segment", () => {
  const a = axis({ from, marks: months, length: 600, arrow: "end" });
  assert.deepEqual(a.segments.map((s) => s.arrow), [true]);
});

test("axis: overlapping gaps do not produce reversed or empty segments", () => {
  // marks at 0, 15, 30 with gap 10 → their cut-outs overlap into one hole
  const a = axis({ from, marks: [{}, {}, {}], spacing: 15, extend: [0, 100], gap: 10 });
  assert.deepEqual(a.segments, [{ at: [140, 50], points: [[0, 0], [90, 0]], arrow: false }]);
});

test("axis: dir 'y' segments run downward", () => {
  const a = axis({ from, dir: "y", marks: [{}, {}], spacing: 100, gap: 10 });
  assert.deepEqual(a.segments.map((s) => [s.at, s.points[1]]), [[[100, 60], [0, 80]]]);
});

// ---------------------------------------------------------------------------
// ticks + scale
// ---------------------------------------------------------------------------

test("axis: domain [0,87] with count 5 ticks at 0..80, and the scale reaches 87 at the end", () => {
  const a = axis({ from, domain: [0, 87], length: 870, ticks: { count: 5 } });
  assert.deepEqual(a.ticks.map((t) => t.value), [0, 20, 40, 60, 80]);
  assert.deepEqual(a.ticks.map((t) => t.x), [100, 300, 500, 700, 900]);
  assert.ok(a.ticks.every((t) => t.y === 50));
  assert.deepEqual(a.scale.domain, [0, 87]);
  assert.equal(a.scale.origin, 100);
  approx(a.scale.pxPerUnit, 10);
  approx(a.scale.origin + (87 - a.scale.domain[0]) * a.scale.pxPerUnit, a.to.x);
});

test("axis: the scale does not count `extend`", () => {
  const a = axis({ from, domain: [0, 100], length: 600, extend: [50, 50] });
  assert.equal(a.scale.origin, 150);
  approx(a.scale.pxPerUnit, 5);
  approx(a.scale.origin + 100 * a.scale.pxPerUnit, a.to.x - 50);
});

test("axis: the scale on a y axis is in y coordinates", () => {
  const a = axis({ from, dir: "y", domain: [0, 100], length: 400 });
  assert.equal(a.scale.origin, 50);
  approx(a.scale.pxPerUnit, 4);
});

test("axis: domain defaults to the min and max of the mark values", () => {
  const a = axis({ from, marks: [{ value: 10 }, { value: 30 }], length: 200 });
  assert.deepEqual(a.scale.domain, [10, 30]);
  assert.deepEqual(a.marks.map((m) => m.x), [100, 300]);
});

test("axis: ticks default to count 5", () => {
  const a = axis({ from, domain: [0, 100], length: 500, ticks: {} });
  assert.deepEqual(a.ticks.map((t) => t.value), [0, 20, 40, 60, 80, 100]);
});

test("axis: nice step picks from 1, 2, 5 times a power of ten", () => {
  const values = (domain, count) =>
    axis({ from, domain, length: 100, ticks: { count } }).ticks.map((t) => t.value);
  assert.deepEqual(values([0, 1], 5), [0, 0.2, 0.4, 0.6, 0.8, 1]);
  assert.deepEqual(values([0, 10], 3), [0, 5, 10]);
  assert.deepEqual(values([0, 1000], 5), [0, 200, 400, 600, 800, 1000]);
  assert.deepEqual(values([0, 0.3], 3), [0, 0.1, 0.2, 0.3]);
});

test("axis: ticks sit on multiples of the step and stay inside the domain", () => {
  const a = axis({ from, domain: [3, 47], length: 440, ticks: { step: 10 } });
  assert.deepEqual(a.ticks.map((t) => t.value), [10, 20, 30, 40]);
  assert.deepEqual(a.ticks.map((t) => t.x), [170, 270, 370, 470]);
});

test("axis: no `ticks` means an empty array", () => {
  assert.deepEqual(axis({ from, marks: months, length: 600 }).ticks, []);
});

// ---------------------------------------------------------------------------
// labels
// ---------------------------------------------------------------------------

test("axis: labelSide 'after' is below an x axis; 'before' is above", () => {
  const after = axis({ from, marks: [{}, {}], labelOffset: 12 });
  assert.deepEqual(after.marks[0].labelAnchor, { x: 100, y: 62, side: "after" });
  const before = axis({ from, marks: [{}, {}], labelSide: "before" });
  assert.deepEqual(before.marks[1].labelAnchor, { x: 260, y: 38, side: "before" });
});

test("axis: labelOffset defaults to 12", () => {
  const a = axis({ from, marks: [{}] });
  assert.equal(a.marks[0].labelAnchor.y, 62);
});

test("axis: 'alternate' puts odd marks before and even marks after", () => {
  const a = axis({ from, marks: [{}, {}, {}, {}], labelSide: "alternate" });
  assert.deepEqual(a.marks.map((m) => m.labelAnchor.side), ["before", "after", "before", "after"]);
  assert.deepEqual(a.marks.map((m) => m.labelAnchor.y), [38, 62, 38, 62]);
});

test("axis: on a y axis 'before' is left and 'after' is right", () => {
  const a = axis({ from, dir: "y", marks: [{}, {}], labelSide: "alternate" });
  assert.deepEqual(a.marks[0].labelAnchor, { x: 88, y: 50, side: "before" });
  assert.deepEqual(a.marks[1].labelAnchor, { x: 112, y: 210, side: "after" });
});

test("axis: tick label anchors follow the same rule", () => {
  const a = axis({ from, domain: [0, 10], length: 100, ticks: { step: 5 } });
  assert.deepEqual(a.ticks[1].labelAnchor, { x: 150, y: 62, side: "after" });
});

// ---------------------------------------------------------------------------
// bad input
// ---------------------------------------------------------------------------

test("axis: marks where only some have `value` throw", () => {
  assert.throws(() => axis({ from, marks: [{ value: 0 }, {}] }), /axis.*value/);
});

test("axis: missing or malformed `from` throws, naming axis and from", () => {
  assert.throws(() => axis({ marks: [] }), /axis.*from/);
  assert.throws(() => axis({ from: { x: 1 }, marks: [] }), /axis.*from/);
});

test("axis: unknown dir / labelSide / arrow throw, naming the parameter", () => {
  assert.throws(() => axis({ from, dir: "z" }), /axis.*dir/);
  assert.throws(() => axis({ from, labelSide: "middle" }), /axis.*labelSide/);
  assert.throws(() => axis({ from, arrow: "start" }), /axis.*arrow/);
});

test("axis: ticks without a domain throw", () => {
  assert.throws(() => axis({ from, length: 100, ticks: { count: 5 } }), /axis.*domain/);
});

test("axis: a malformed domain throws", () => {
  assert.throws(() => axis({ from, domain: [5, 1], length: 100 }), /axis.*domain/);
  assert.throws(() => axis({ from, domain: [0], length: 100 }), /axis.*domain/);
});

test("axis: a domain with no length to spread it over throws", () => {
  assert.throws(() => axis({ from, domain: [0, 10], ticks: { step: 5 } }), /axis.*length/);
});

// ---------------------------------------------------------------------------
// a range that collapses to one value
// ---------------------------------------------------------------------------
// `ticks` on a [v, v] range used to spin forever (the nice-step search had no
// finite scale to work from), so each of these runs under a clock.

const within = (ms, fn) => {
  const t0 = Date.now();
  const r = fn();
  assert.ok(Date.now() - t0 < ms, "took too long");
  return r;
};

test("axis: one valued mark with ticks returns a single tick on that value", () => {
  const a = within(1000, () =>
    axis({ from, marks: [{ value: 5, label: "now" }], length: 600, ticks: { count: 5 } }));
  assert.deepEqual(a.ticks.map((t) => t.value), [5]);
  assert.equal(a.ticks[0].x, 100);
  assert.equal(a.ticks[0].y, 50);
  assert.equal(a.marks[0].x, 100);
  assert.deepEqual(a.scale.domain, [5, 5]);
  assert.equal(a.scale.pxPerUnit, 0);
});

test("axis: marks that all share one value with ticks return a single tick on it", () => {
  const a = within(1000, () =>
    axis({ from, marks: [{ value: 7 }, { value: 7 }, { value: 7 }], length: 600, ticks: { count: 5 } }));
  assert.deepEqual(a.ticks.map((t) => t.value), [7]);
  assert.deepEqual(a.marks.map((m) => m.x), [100, 100, 100]);
});

test("axis: domain [3,3] with ticks returns a single tick on 3, with or without a step", () => {
  const a = within(1000, () => axis({ from, domain: [3, 3], length: 600, ticks: { count: 5 } }));
  assert.deepEqual(a.ticks.map((t) => t.value), [3]);
  assert.equal(a.ticks[0].x, 100);
  const b = within(1000, () => axis({ from, domain: [3, 3], length: 600, ticks: { step: 2 } }));
  assert.deepEqual(b.ticks.map((t) => t.value), [3]);
  assert.equal(b.ticks[0].x, 100);
});

test("axis: a collapsed range on a y axis puts the single tick at the origin, label by the usual rule", () => {
  const a = within(1000, () =>
    axis({ from, dir: "y", domain: [3, 3], length: 600, ticks: { count: 5 } }));
  assert.equal(a.ticks[0].x, 100);
  assert.equal(a.ticks[0].y, 50);
  assert.deepEqual(a.ticks[0].labelAnchor, { x: 112, y: 50, side: "after" });
});

// Without a `length`, a range that collapsed to one value has nothing to
// spread: the axis is as long as its `extend`s, and everything sits at the start.
const collapsedInputs = {
  "one valued mark": { marks: [{ value: 5, label: "now" }] },
  "marks sharing one value": { marks: [{ value: 7 }, { value: 7 }, { value: 7 }] },
  "domain [3,3] with no marks": { domain: [3, 3] },
};

for (const [name, input] of Object.entries(collapsedInputs)) {
  for (const withTicks of [false, true]) {
    test(`axis: ${name}, no length${withTicks ? ", with ticks" : ""}: returns a zero-length axis at the start`, () => {
      const opts = { from, ...input, ...(withTicks ? { ticks: { count: 5 } } : {}) };
      const a = within(1000, () => axis(opts));
      assert.deepEqual(a.to, from);
      assert.ok(a.marks.every((m) => m.x === 100 && m.y === 50 && m.t === 0));
      assert.equal(a.marks.length, (input.marks ?? []).length);
      assert.equal(a.ticks.length, withTicks ? 1 : 0);
      if (withTicks) assert.deepEqual([a.ticks[0].x, a.ticks[0].y], [100, 50]);
      assert.deepEqual(a.segments, []);
    });
  }
}

test("axis: a collapsed range with no length keeps the extends as the axis length", () => {
  const a = axis({ from, marks: [{ value: 5 }], extend: [20, 30], ticks: { count: 5 } });
  assert.deepEqual(a.to, { x: 150, y: 50 });
  assert.equal(a.marks[0].x, 120);
  assert.equal(a.ticks[0].x, 120);
});

test("axis: a lone valued mark matches a lone valueless mark when no length is given", () => {
  const valued = axis({ from, marks: [{ value: 5 }] });
  const plain = axis({ from, marks: [{}] });
  assert.deepEqual(valued.to, plain.to);
  assert.deepEqual(valued.marks[0].x, plain.marks[0].x);
  assert.deepEqual(valued.marks[0].labelAnchor, plain.marks[0].labelAnchor);
});

test("axis: a real domain with nothing to spread it over still throws", () => {
  assert.throws(() => axis({ from, domain: [0, 10], marks: [{ value: 5 }] }), /axis.*length/);
});

test("axis: non-numeric numeric parameters throw, naming axis and the parameter", () => {
  const ok = { from, marks: [{}, {}] };
  for (const name of ["spacing", "labelOffset", "gap", "length"]) {
    for (const bad of ["bad", NaN, Infinity, {}, -1]) {
      assert.throws(
        () => axis({ ...ok, [name]: bad }),
        new RegExp(`axis: \\\`${name}\\\``),
        `${name}=${String(bad)}`,
      );
    }
  }
  assert.throws(() => axis({ ...ok, extend: ["a", 0] }), /axis: `extend`/);
  assert.throws(() => axis({ ...ok, extend: [NaN, 0] }), /axis: `extend`/);
  const dom = { from, domain: [0, 10], length: 100 };
  assert.throws(() => axis({ ...dom, ticks: { step: "bad" } }), /axis: `ticks.step`/);
  assert.throws(() => axis({ ...dom, ticks: { step: NaN } }), /axis: `ticks.step`/);
  assert.throws(() => axis({ ...dom, ticks: { step: 0 } }), /axis: `ticks.step`/);
  assert.throws(() => axis({ ...dom, ticks: { count: "bad" } }), /axis: `ticks.count`/);
  assert.throws(() => axis({ ...dom, ticks: { count: NaN } }), /axis: `ticks.count`/);
  assert.throws(() => axis({ ...dom, ticks: { count: 0 } }), /axis: `ticks.count`/);
  assert.throws(() => axis({ ...dom, ticks: "bad" }), /axis: `ticks`/);
  assert.throws(
    () => axis({ from, marks: [{ value: "5" }, { value: "7" }], length: 100 }),
    /axis: .*`value`/,
  );
  assert.throws(
    () => axis({ from, marks: [{ value: NaN }, { value: 1 }], length: 100 }),
    /axis: .*`value`/,
  );
});

test("axis: no numeric input ever yields NaN coordinates", () => {
  // anything that returns must be finite all the way down
  const walk = (v) => {
    if (typeof v === "number") assert.ok(Number.isFinite(v), `non-finite ${v}`);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(axis({ from, marks: [{}, {}], spacing: 0 }));
  walk(axis({ from, marks: [{ value: 3 }], length: 100, ticks: { count: 5 } }));
});

// ---------------------------------------------------------------------------
// entry points
// ---------------------------------------------------------------------------

test("axis: the package entry exports it", () => {
  assert.equal(typeof pkg.axis, "function");
});

test("axis: compute_layout lists and dispatches it", () => {
  assert.ok(HELPERS.includes("axis"));
  const res = getTool("compute_layout").run({
    helper: "axis",
    args: { from, marks: months, length: 600, gap: 10, arrow: "end" },
  });
  assert.equal(res.helper, "axis");
  assert.equal(res.result.kind, "axis");
  assert.deepEqual(res.result.marks.map((m) => m.x), [100, 200, 300, 700]);
});

test("axis: compute_layout turns a bad call into { error } naming axis and the parameter", () => {
  const res = getTool("compute_layout").run({ helper: "axis", args: { marks: [] } });
  assert.match(res.error, /axis.*from/);
});

// ---------------------------------------------------------------------------
// rendering the segments
// ---------------------------------------------------------------------------

test("axis: segments drawn as sugar line / arrow render with no linter warnings", async () => {
  for (const dir of ["x", "y"]) {
    const a = axis({ from, dir, marks: months, length: 600, gap: 10, arrow: "end" });
    const els = a.segments.map((s, i) => ({
      shape: s.arrow ? "arrow" : "line",
      id: `ax${i}`,
      at: s.at,
      points: s.points,
    }));
    for (const [i, m] of a.marks.entries()) {
      els.push({ shape: "ellipse", id: `dot${i}`, at: [m.x - 4, m.y - 4], size: [8, 8], fill: "blue" });
    }
    const out = await render(els, { formats: ["excalidraw"] });
    assert.deepEqual(out.warnings, [], `dir ${dir}`);
    assert.ok(!out.warnings.some((w) => w.code === "DEGENERATE_ARROW"));
  }
});

// ---------------------------------------------------------------------------
// tick cap: at most 1000 ticks, refused before any is generated
// ---------------------------------------------------------------------------

test("axis: a step so small it implies billions of ticks throws at once, naming axis and `step`", () => {
  const t0 = Date.now();
  assert.throws(
    () => axis({ from, domain: [0, 1000], length: 500, ticks: { step: 1e-9 } }),
    /axis.*1000.*step/,
  );
  assert.ok(Date.now() - t0 < 1000, "took too long");
});

test("axis: a huge `count` throws at once, naming axis and telling to lower `count`", () => {
  const t0 = Date.now();
  assert.throws(
    () => axis({ from, domain: [0, 1000], length: 500, ticks: { count: 1e9 } }),
    /axis.*1000.*count/,
  );
  assert.ok(Date.now() - t0 < 1000, "took too long");
});

test("axis: exactly 1000 ticks is fine, 1001 is not", () => {
  const ok = axis({ from, domain: [0, 999], length: 999, ticks: { step: 1 } });
  assert.equal(ok.ticks.length, 1000);
  assert.throws(() => axis({ from, domain: [0, 1000], length: 1000, ticks: { step: 1 } }), /axis.*1000/);
});

test("axis: a step below float range does not slip past the cap as Infinity", () => {
  assert.throws(() => axis({ from, domain: [0, 1e300], length: 500, ticks: { step: 1e-300 } }), /axis.*1000/);
});
