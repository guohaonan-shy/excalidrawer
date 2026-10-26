import { test } from "node:test";
import assert from "node:assert/strict";
import * as pkg from "../src/index.mjs";
import { stack, equalize, fitBoundText } from "../src/index.mjs";
import { render } from "../src/render.mjs";
import { getTool } from "../src/tools/index.mjs";
import { HELPERS } from "../src/tools/compute-layout.mjs";

const approx = (a, b, eps = 1e-6) =>
  assert.ok(Math.abs(a - b) < eps, `expected ${a} ≈ ${b} (Δ=${Math.abs(a - b)})`);

const LONG = "Payment reconciliation and settlement worker (async, retries)";

// ============================================================================
// stack: main axis, sizing from content
// ============================================================================

test("stack: horizontal text cells — container is pad*2 + Σw + gap*(n-1), and as tall as the tallest + pad*2", () => {
  const r = stack({
    dir: "x",
    cells: [{ text: "Auth", w: 100 }, { text: LONG, w: 160 }, { text: "Billing", w: 120 }],
    gap: 12,
    pad: 8,
  });
  assert.equal(r.kind, "stack");
  assert.equal(r.children.length, 3);
  const [a, b, c] = r.children;
  assert.equal(r.w, 8 * 2 + 100 + 160 + 120 + 12 * 2);
  assert.equal(r.h, Math.max(a.h, b.h, c.h) + 8 * 2);
  assert.equal(a.x, 8);
  assert.equal(b.x, a.x + a.w + 12);
  assert.equal(c.x, b.x + b.w + 12);
  assert.equal(r.overflow, 0);
});

test("stack: x and y place the container's top-left; children carry absolute coordinates", () => {
  const r = stack({ dir: "y", cells: [{ w: 50, h: 20 }, { w: 50, h: 30 }], gap: 10, pad: 5, x: 100, y: 200 });
  assert.equal(r.x, 100);
  assert.equal(r.y, 200);
  assert.deepEqual(
    r.children.map((c) => [c.x, c.y]),
    [[105, 205], [105, 235]],
  );
  assert.equal(r.h, 5 * 2 + 20 + 30 + 10);
});

test("stack: a text cell's height matches what equalize measures for the same cell", () => {
  const r = stack({ dir: "x", cells: [{ text: LONG, w: 160 }] });
  assert.equal(r.children[0].h, 132);
  assert.equal(r.children[0].h, equalize([{ w: 160, text: LONG }]).h);
  assert.equal(r.children[0].h, fitBoundText(LONG, 160, 0, 16).height);
  assert.equal(r.children[0].kind, "text");
  assert.equal(r.children[0].fontSize, 16);
});

test("stack: a text cell without w takes its natural width plus 10 on each side", () => {
  const r = stack({ dir: "x", cells: [{ text: "Order Service" }] });
  assert.equal(r.children[0].w, 149);
});

test("stack: a long label without w is capped at maxW and wraps", () => {
  const r = stack({ dir: "x", cells: [{ text: LONG }] });
  assert.equal(r.children[0].w, 200);
  assert.equal(r.children[0].h, fitBoundText(LONG, 200, 0, 16).height);
  assert.ok(r.children[0].h > fitBoundText("Order Service", 149, 0, 16).height);

  const narrow = stack({ dir: "x", maxW: 120, cells: [{ text: LONG }] });
  assert.equal(narrow.children[0].w, 120);
});

test("stack: fontSize defaults every text cell; a cell's own fontSize wins", () => {
  const r = stack({ dir: "x", fontSize: 20, cells: [{ text: "A", w: 100 }, { text: "B", w: 100, fontSize: 12 }] });
  assert.deepEqual(r.children.map((c) => c.fontSize), [20, 12]);
});

test("stack: titled cell measures like titledBox, kind 'titled' carries both text zones", () => {
  const r = stack({
    dir: "x",
    cells: [{ title: "Delivery", body: "• Pace\n• Pronunciation", w: 200 }],
  });
  const c = r.children[0];
  assert.equal(c.kind, "titled");
  assert.equal(c.w, 200);
  // titledBox: padding 16, gap 10, title 18px, body 15px, two body lines
  const titleH = Math.ceil(1 * 18 * 1.4);
  const bodyH = Math.ceil(2 * 15 * 1.4);
  assert.equal(c.h, 16 + titleH + 10 + bodyH + 16);
  assert.deepEqual(
    { x: c.title.x, y: c.title.y, w: c.title.w, h: c.title.h, fontSize: c.title.fontSize },
    { x: c.x + 16, y: c.y + 16, w: 168, h: titleH, fontSize: 18 },
  );
  assert.deepEqual(
    { x: c.body.x, y: c.body.y, w: c.body.w, h: c.body.h, fontSize: c.body.fontSize },
    { x: c.x + 16, y: c.y + 16 + titleH + 10, w: 168, h: bodyH, fontSize: 15 },
  );
});

test("stack: titled cell without w takes the widest line plus padding*2, capped at maxW", () => {
  const r = stack({ dir: "x", cells: [{ title: "Hi", body: "short", padding: 10 }] });
  // widest line: "short" at 15px = ceil(5 * 15 * 0.62) = 47 ; title "Hi" at 18px = ceil(2*18*.62)=23
  assert.equal(r.children[0].w, 47 + 20);

  const capped = stack({ dir: "x", cells: [{ title: LONG, body: "x" }] });
  assert.equal(capped.children[0].w, 200);
  // the long title wrapped, so the title zone is taller than one line
  assert.ok(capped.children[0].title.h > Math.ceil(18 * 1.4));
});

test("stack: a { w, h } cell is a box with exactly that size", () => {
  const r = stack({ dir: "x", cells: [{ w: 30, h: 40 }] });
  assert.equal(r.children[0].kind, "box");
  assert.equal(r.children[0].w, 30);
  assert.equal(r.children[0].h, 40);
});

// ============================================================================
// stack: cross axis
// ============================================================================

test("stack: equalize on a horizontal row makes every cell as tall as the one that wrapped most", () => {
  const r = stack({
    dir: "x",
    equalize: true,
    cells: [{ text: "Auth", w: 160 }, { text: LONG, w: 160 }, { text: "Billing", w: 160 }],
  });
  const hs = r.children.map((c) => c.h);
  assert.equal(new Set(hs).size, 1);
  assert.equal(hs[0], fitBoundText(LONG, 160, 0, 16).height);
  assert.equal(r.h, hs[0]);
});

test("stack: equalize on a vertical column makes every cell as wide as the widest", () => {
  const r = stack({
    dir: "y",
    equalize: true,
    cells: [{ text: "A", w: 100 }, { text: "B", w: 180 }, { w: 120, h: 30 }],
  });
  assert.deepEqual(r.children.map((c) => c.w), [180, 180, 180]);
  assert.equal(r.w, 180);
});

test("stack: equalize re-measures wrapped text at the new width", () => {
  const r = stack({
    dir: "y",
    equalize: true,
    cells: [{ text: LONG, w: 100 }, { text: LONG, w: 300 }],
  });
  assert.equal(r.children[0].h, fitBoundText(LONG, 300, 0, 16).height);
  assert.equal(r.children[1].h, fitBoundText(LONG, 300, 0, 16).height);
});

test("stack: vertical with cross and pad — cells without a width take cross - pad*2", () => {
  const r = stack({
    dir: "y",
    cross: 400,
    pad: 16,
    cells: [{ text: "Short" }, { text: LONG }, { title: "T", body: "b" }, { text: "Fixed", w: 90 }],
  });
  assert.equal(r.w, 400);
  assert.deepEqual(r.children.map((c) => c.w), [368, 368, 368, 90]);
  assert.equal(r.children[1].h, fitBoundText(LONG, 368, 0, 16).height);
});

test("stack: without cross the cross size is the largest cell plus pad*2", () => {
  const r = stack({ dir: "y", pad: 10, cells: [{ w: 50, h: 10 }, { w: 90, h: 10 }] });
  assert.equal(r.w, 90 + 20);
});

test("stack: align places the shorter cells at the start, centre or end of the cross axis (horizontal)", () => {
  const cells = [{ w: 50, h: 100 }, { w: 50, h: 40 }];
  const at = (align) => stack({ dir: "x", cells, align, pad: 4, y: 10 }).children[1].y;
  assert.equal(at("start"), 10 + 4);
  assert.equal(at("center"), 10 + 4 + (100 - 40) / 2);
  assert.equal(at("end"), 10 + 4 + (100 - 40));
});

test("stack: align on a vertical column positions along x", () => {
  const cells = [{ w: 100, h: 20 }, { w: 40, h: 20 }];
  const at = (align) => stack({ dir: "y", cells, align }).children[1].x;
  assert.equal(at("start"), 0);
  assert.equal(at("center"), 30);
  assert.equal(at("end"), 60);
});

// ============================================================================
// stack: fixed size, justify, overflow
// ============================================================================

test("stack: justify distributes spare room when size is given", () => {
  const cells = [{ w: 80, h: 20 }, { w: 80, h: 20 }];
  const xs = (justify) =>
    stack({ dir: "x", cells, size: 400, justify, gap: 16 }).children.map((c) => c.x);

  assert.deepEqual(xs("start"), [0, 96]);
  // content = 80 + 16 + 80 = 176; spare = 224 → 112 on each side
  assert.deepEqual(xs("center"), [112, 208]);
  assert.deepEqual(xs("end"), [400 - 80 - 16 - 80, 400 - 80]);
  // first flush left, last flush right
  assert.deepEqual(xs("space-between"), [0, 320]);
  assert.equal(stack({ dir: "x", cells, size: 400 }).w, 400);
});

test("stack: justify respects pad (start/end are measured from the inner edge)", () => {
  const cells = [{ w: 80, h: 20 }, { w: 80, h: 20 }];
  const r = stack({ dir: "x", cells, size: 400, pad: 10, justify: "space-between" });
  assert.equal(r.children[0].x, 10);
  assert.equal(r.children[1].x, 400 - 10 - 80);
});

test("stack: space-between with a single cell behaves like start", () => {
  const r = stack({ dir: "x", cells: [{ w: 80, h: 20 }], size: 400, justify: "space-between", pad: 6 });
  assert.equal(r.children[0].x, 6);
});

test("stack: size that cannot hold the content grows to the content and reports overflow", () => {
  const cells = [{ w: 80, h: 20 }, { w: 80, h: 20 }];
  const r = stack({ dir: "x", cells, size: 100, gap: 16, justify: "center" });
  assert.equal(r.w, 176);
  assert.equal(r.overflow, 76);
  assert.deepEqual(r.children.map((c) => c.x), [0, 96]);
});

test("stack: size and justify work on a column too", () => {
  const r = stack({ dir: "y", cells: [{ w: 10, h: 40 }, { w: 10, h: 40 }], size: 200, justify: "end", gap: 10 });
  assert.equal(r.h, 200);
  assert.deepEqual(r.children.map((c) => c.y), [200 - 90, 200 - 40]);
  assert.equal(r.overflow, 0);
});

test("stack: without size the container is exactly the content and overflow is 0", () => {
  const r = stack({ dir: "x", cells: [{ w: 80, h: 20 }, { w: 80, h: 20 }], justify: "end", gap: 16, pad: 4 });
  assert.equal(r.w, 4 * 2 + 176);
  assert.equal(r.overflow, 0);
  assert.equal(r.children[0].x, 4);
});

// ============================================================================
// stack: nesting
// ============================================================================

test("stack: nested stack children get absolute coordinates (outer position + inner offset)", () => {
  const r = stack({
    dir: "y",
    x: 100,
    y: 50,
    pad: 10,
    gap: 20,
    cells: [
      { w: 60, h: 30 },
      { stack: { dir: "x", gap: 5, pad: 2, cells: [{ w: 40, h: 20 }, { w: 40, h: 20 }] } },
    ],
  });
  const inner = r.children[1];
  assert.equal(inner.kind, "stack");
  // outer places the inner container at (100 + 10, 50 + 10 + 30 + 20)
  assert.equal(inner.x, 110);
  assert.equal(inner.y, 110);
  assert.equal(inner.w, 2 * 2 + 40 + 5 + 40);
  assert.deepEqual(inner.children.map((c) => [c.x, c.y]), [[112, 112], [157, 112]]);
});

test("stack: nested stack ignores its own x / y", () => {
  const r = stack({ dir: "x", cells: [{ stack: { dir: "y", x: 999, y: 999, cells: [{ w: 5, h: 5 }] } }] });
  assert.equal(r.children[0].x, 0);
  assert.equal(r.children[0].children[0].y, 0);
});

test("stack: equalize widens a nested stack and it re-flows inside the new width", () => {
  const r = stack({
    dir: "y",
    equalize: true,
    cells: [
      { w: 300, h: 20 },
      { stack: { dir: "x", justify: "center", cells: [{ w: 50, h: 20 }, { w: 50, h: 20 }], gap: 10 } },
    ],
  });
  const inner = r.children[1];
  assert.equal(inner.w, 300);
  // content 110 centred in 300 → starts at 95
  assert.deepEqual(inner.children.map((c) => c.x), [95, 155]);
});

test("stack: equalize on a row stretches a nested column to the tallest, along its own main axis", () => {
  const r = stack({
    dir: "x",
    equalize: true,
    cells: [
      { w: 50, h: 120 },
      { stack: { dir: "y", justify: "end", cells: [{ w: 50, h: 20 }] } },
    ],
  });
  const inner = r.children[1];
  assert.equal(inner.h, 120);
  assert.equal(inner.children[0].y, 100);
});

test("stack: deep nesting returns absolute coordinates at every level", () => {
  const r = stack({
    dir: "x",
    x: 10,
    y: 10,
    cells: [{ w: 30, h: 30 }, { stack: { dir: "y", gap: 0, cells: [{ stack: { dir: "x", cells: [{ w: 7, h: 7 }] } }] } }],
  });
  const leaf = r.children[1].children[0].children[0];
  assert.equal(leaf.x, 10 + 30 + 16);
  assert.equal(leaf.y, 10);
});

// ============================================================================
// stack: ids, kinds, errors
// ============================================================================

test("stack: id on a cell, a nested stack and the container comes back on the matching result", () => {
  const r = stack({
    id: "lane",
    dir: "x",
    cells: [
      { id: "a", text: "A" },
      { id: "b", title: "B" },
      { id: "c", w: 5, h: 5 },
      { id: "d", stack: { dir: "x", cells: [{ id: "e", w: 5, h: 5 }] } },
    ],
  });
  assert.equal(r.id, "lane");
  assert.deepEqual(r.children.map((c) => c.id), ["a", "b", "c", "d"]);
  assert.equal(r.children[3].children[0].id, "e");
  assert.deepEqual(r.children.map((c) => c.kind), ["text", "titled", "box", "stack"]);
});

test("stack: cells without an id leave no id key on the result", () => {
  const r = stack({ dir: "x", cells: [{ text: "A" }] });
  assert.ok(!("id" in r));
  assert.ok(!("id" in r.children[0]));
});

test("stack: missing dir throws, naming stack and dir", () => {
  assert.throws(() => stack({ cells: [{ w: 1, h: 1 }] }), /stack: .*`dir`/);
  assert.throws(() => stack({ dir: "z", cells: [{ w: 1, h: 1 }] }), /stack: .*`dir`/);
});

test("stack: empty or missing cells throws, naming stack and cells", () => {
  assert.throws(() => stack({ dir: "x", cells: [] }), /stack: .*`cells`/);
  assert.throws(() => stack({ dir: "x" }), /stack: .*`cells`/);
});

test("stack: a cell of an unknown form throws, naming the index and what is accepted", () => {
  assert.throws(
    () => stack({ dir: "x", cells: [{ w: 1, h: 1 }, { text: "ok" }, { foo: 1 }] }),
    /^Error: stack: cells\[2\] needs text, title, h, stack or panel$/,
  );
  assert.throws(() => stack({ dir: "x", cells: [null] }), /stack: cells\[0\] needs/);
  // a panel cell is a known form: its errors come from panel, naming the cell
  assert.throws(() => stack({ dir: "x", cells: [{ panel: {} }] }), /panel: cells\[0\]\.panel: .*`title`/);
});

test("stack: a { w } or { h } cell missing its other side throws", () => {
  assert.throws(() => stack({ dir: "x", cells: [{ w: 10 }] }), /stack: cells\[0\] .*`w` and `h`/);
  assert.throws(() => stack({ dir: "x", cells: [{ h: 10 }] }), /stack: cells\[0\] .*`w` and `h`/);
});

test("stack: bad numeric parameters throw, naming the parameter", () => {
  const ok = [{ w: 1, h: 1 }];
  assert.throws(() => stack({ dir: "x", cells: ok, gap: -1 }), /stack: `gap`/);
  assert.throws(() => stack({ dir: "x", cells: ok, pad: "a" }), /stack: `pad`/);
  assert.throws(() => stack({ dir: "x", cells: ok, size: 0 }), /stack: `size`/);
  assert.throws(() => stack({ dir: "x", cells: ok, cross: -5 }), /stack: `cross`/);
  assert.throws(() => stack({ dir: "x", cells: ok, maxW: 0 }), /stack: `maxW`/);
  assert.throws(() => stack({ dir: "x", cells: ok, fontSize: NaN }), /stack: `fontSize`/);
  assert.throws(() => stack({ dir: "x", cells: ok, align: "middle" }), /stack: `align`/);
  assert.throws(() => stack({ dir: "x", cells: ok, justify: "around" }), /stack: `justify`/);
  assert.throws(() => stack({ dir: "x", cells: [{ text: "a", w: -3 }] }), /stack: cells\[0\] `w`/);
  assert.throws(() => stack({ dir: "x", cells: [{ w: 1, h: 0 }] }), /stack: cells\[0\] .*`w` and `h`/);
});

test("stack: a titled cell's bad titleFontSize, bodyFontSize, padding, gap or body throws, naming stack, the cell and the parameter", () => {
  const titled = (extra) => [{ w: 1, h: 1 }, { title: "T", body: "B", w: 150, ...extra }];
  const cases = [
    ["titleFontSize", "big"], ["titleFontSize", 0], ["titleFontSize", NaN],
    ["bodyFontSize", "12"], ["bodyFontSize", -1], ["bodyFontSize", Infinity],
    ["padding", "16"], ["padding", -4], ["padding", NaN],
    ["gap", "10"], ["gap", -1], ["gap", NaN],
    ["body", 5], ["body", {}], ["body", ["x"]],
  ];
  for (const [param, bad] of cases) {
    assert.throws(
      () => stack({ dir: "x", cells: titled({ [param]: bad }) }),
      new RegExp(`^Error: stack: cells\\[1\\] \`${param}\``),
      `${param}: ${JSON.stringify(bad)}`,
    );
  }
  // inside a nested stack the message still says which cell
  assert.throws(
    () => stack({ dir: "x", cells: [{ stack: { dir: "y", cells: [{ title: "T", padding: "x" }] } }] }),
    /^Error: stack: cells\[0\]\.stack: cells\[0\] `padding`/,
  );
  // valid values (including 0 padding / gap and an absent or empty body) still lay out with finite numbers
  const r = stack({ dir: "x", cells: [{ title: "T", w: 100, padding: 0, gap: 0 }, { title: "T", body: "", w: 100 }, { title: "T", body: null, w: 100 }] });
  for (const c of r.children) assert.ok([c.x, c.y, c.w, c.h].every(Number.isFinite), JSON.stringify(c));
});

test("stack: an error inside a nested stack says which cell it was in", () => {
  assert.throws(
    () => stack({ dir: "x", cells: [{ text: "a" }, { stack: { dir: "y", cells: [{ foo: 1 }] } }] }),
    /^Error: stack: cells\[1\]\.stack: cells\[0\] needs/,
  );
  assert.throws(
    () => stack({ dir: "x", cells: [{ stack: { cells: [{ w: 1, h: 1 }] } }] }),
    /cells\[0\]\.stack: .*`dir`/,
  );
});

// ============================================================================
// stack: entry points (package export, compute_layout)
// ============================================================================

test("stack: is exported from the package entry", () => {
  assert.equal(typeof pkg.stack, "function");
});

test("compute_layout: HELPERS includes stack", () => {
  assert.ok(HELPERS.includes("stack"));
});

test("compute_layout: dispatches stack with flat args", () => {
  const res = getTool("compute_layout").run({
    helper: "stack",
    args: { dir: "x", gap: 10, cells: [{ text: "Auth", w: 100 }, { w: 40, h: 40 }] },
  });
  assert.equal(res.helper, "stack");
  assert.equal(res.result.kind, "stack");
  assert.equal(res.result.children.length, 2);
  assert.equal(res.result.w, 100 + 10 + 40);
  // same numbers as calling the function directly
  assert.deepEqual(res.result, stack({ dir: "x", gap: 10, cells: [{ text: "Auth", w: 100 }, { w: 40, h: 40 }] }));
});

test("compute_layout: bad stack args come back as { error } naming the component and the parameter", () => {
  const res = getTool("compute_layout").run({ helper: "stack", args: { cells: [{ w: 1, h: 1 }] } });
  assert.match(res.error, /stack: .*`dir`/);
  const res2 = getTool("compute_layout").run({ helper: "stack", args: { dir: "x", cells: [{ nope: 1 }] } });
  assert.match(res2.error, /stack: cells\[0\] needs/);
});

test("compute_layout: the description documents stack's parameters and return", () => {
  const { description } = getTool("compute_layout");
  assert.match(description, /stack\s+—\s+\{ dir/);
  assert.match(description, /overflow/);
});

// ============================================================================
// stack: drawn through render, the linter stays quiet
// ============================================================================

test("stack: a swim-lane built from stacks, with a long label, renders with no overlap warnings", async () => {
  const lane = stack({
    dir: "x",
    pad: 16,
    gap: 16,
    equalize: true,
    x: 40,
    y: 40,
    cells: [{ text: "Order Service" }, { text: "Gateway" }, { text: LONG, w: 160 }],
  });
  const els = [
    { shape: "rect", id: "lane", at: [lane.x, lane.y], size: [lane.w, lane.h], fill: "gray" },
    ...lane.children.map((c, i) => ({
      shape: "rect",
      id: `c${i}`,
      at: [c.x, c.y],
      size: [c.w, c.h],
      fill: "blue",
      text: ["Order Service", "Gateway", LONG][i],
    })),
  ];
  // the lane is at least the long label's height (132) plus the padding
  assert.ok(lane.h >= 132 + 32);
  const { warnings } = await render(els, { formats: ["excalidraw"] });
  assert.ok(!warnings.some((w) => w.code === "SHAPE_OVERLAP" && w.ids.some((id) => id.startsWith("c"))), JSON.stringify(warnings));
  assert.ok(!warnings.some((w) => w.code.startsWith("TEXT_OVERFLOW")), JSON.stringify(warnings));
});

test("stack: equalize accepts only true or false; anything else throws, naming stack and equalize", () => {
  const cells = [{ w: 10, h: 10 }, { w: 10, h: 50 }];
  for (const bad of ["false", "true", 1, 0, {}, []]) {
    assert.throws(() => stack({ dir: "x", equalize: bad, cells }), /stack: .*`equalize`/, JSON.stringify(bad));
  }
  assert.deepEqual(stack({ dir: "x", equalize: true, cells }).children.map((c) => c.h), [50, 50]);
  assert.deepEqual(stack({ dir: "x", equalize: false, cells }).children.map((c) => c.h), [10, 50]);
  assert.deepEqual(stack({ dir: "x", cells }).children.map((c) => c.h), [10, 50]);
});
