import { test } from "node:test";
import assert from "node:assert/strict";
import { legend, estimateTextWidth, textHeight, render } from "../src/index.mjs";
import { getTool } from "../src/tools/index.mjs";
import { HELPERS } from "../src/tools/compute-layout.mjs";

const ITEMS = [
  { label: "request" },
  { label: "async event", id: "async" },
  { label: "planned (Q3)" },
];

// Independent source of truth for the text slot: width from the shared
// estimator, height = one 1.4-line-height row at the font size.
const textW = (s, fs = 14) => estimateTextWidth(s, fs);
const rowH = (fs = 14, sampleH = 16) => Math.max(sampleH, textHeight("x", fs, 0));

// ===========================================================================
// rows
// ===========================================================================

test("legend: 3 vertical rows step by row height + itemGap; w = pad*2 + sampleW + gap + widest text", () => {
  const lg = legend({ items: ITEMS });
  assert.equal(lg.kind, "legend");
  assert.equal(lg.items.length, 3);

  const h = rowH();
  const ys = lg.items.map((it) => it.sample.y);
  assert.equal(ys[1] - ys[0], h + 8);
  assert.equal(ys[2] - ys[1], h + 8);

  const widest = Math.max(...ITEMS.map((i) => textW(i.label)));
  assert.equal(lg.w, 12 * 2 + 40 + 8 + widest);
  assert.equal(lg.h, 12 * 2 + 3 * h + 2 * 8);
});

test("legend: each row's sample and text slots sit side by side, vertically centered", () => {
  const lg = legend({ items: ITEMS, at: { x: 100, y: 50 } });
  for (const [i, it] of lg.items.entries()) {
    assert.equal(it.text, ITEMS[i].label);
    assert.equal(it.sample.w, 40);
    assert.equal(it.sample.h, 16);
    assert.equal(it.label.x, it.sample.x + it.sample.w + 8);
    assert.equal(it.label.w, textW(ITEMS[i].label));
    assert.equal(it.label.fontSize, 14);
    assert.equal(it.sample.y + it.sample.h / 2, it.label.y + it.label.h / 2);
  }
  assert.equal(lg.items[1].id, "async");
  assert.ok(!("id" in lg.items[0]));
});

test("legend: slots stay inside the block and honor pad", () => {
  const lg = legend({ items: ITEMS, at: { x: 10, y: 20 }, pad: 20 });
  for (const it of lg.items) {
    assert.ok(it.sample.x >= lg.x + 20);
    assert.ok(it.label.x + it.label.w <= lg.x + lg.w - 20);
    assert.ok(it.sample.y >= lg.y + 20);
    assert.ok(it.label.y + it.label.h <= lg.y + lg.h - 20);
  }
  assert.equal(lg.items[0].sample.x, 10 + 20);
});

test("legend: dir x lays the items on one row, itemGap (default 24) apart", () => {
  const lg = legend({ items: ITEMS, dir: "x" });
  const sameY = new Set(lg.items.map((it) => it.sample.y));
  assert.equal(sameY.size, 1);

  const endOf = (it) => it.label.x + it.label.w;
  assert.equal(lg.items[1].sample.x - endOf(lg.items[0]), 24);
  assert.equal(lg.items[2].sample.x - endOf(lg.items[1]), 24);

  const custom = legend({ items: ITEMS, dir: "x", itemGap: 10 });
  assert.equal(custom.items[1].sample.x - (custom.items[0].label.x + custom.items[0].label.w), 10);

  assert.equal(lg.h, 12 * 2 + rowH());
  const total = ITEMS.reduce((s, i) => s + 40 + 8 + textW(i.label), 0);
  assert.equal(lg.w, 12 * 2 + total + 2 * 24);
});

test("legend: a taller sample grows the row, text stays centered on the sample", () => {
  const lg = legend({ items: [{ label: "a" }, { label: "b" }], sampleH: 40 });
  const [a, b] = lg.items;
  assert.equal(b.sample.y - a.sample.y, 40 + 8);
  assert.equal(a.sample.y + 20, a.label.y + a.label.h / 2);
});

test("legend: a multi-line label sizes its slot from the longest line and line count", () => {
  const lg = legend({ items: [{ label: "short" }, { label: "long line here\nsecond" }] });
  const it = lg.items[1];
  assert.equal(it.label.w, textW("long line here"));
  assert.equal(it.label.h, textHeight("a\nb", 14, 0));
  // the taller row pushes the block down by its own height
  assert.equal(lg.h, 12 * 2 + rowH() + 8 + textHeight("a\nb", 14, 0));
});

// ===========================================================================
// placement
// ===========================================================================

const bounds = { x: 100, y: 200, w: 800, h: 500 };

test("legend: corner bottom-right inside sits `offset` from the bounds' right and bottom edges", () => {
  const lg = legend({ items: ITEMS, bounds, corner: "bottom-right", place: "inside" });
  assert.equal(bounds.x + bounds.w - (lg.x + lg.w), 16);
  assert.equal(bounds.y + bounds.h - (lg.y + lg.h), 16);

  const far = legend({ items: ITEMS, bounds, corner: "bottom-right", offset: 30 });
  assert.equal(bounds.x + bounds.w - (far.x + far.w), 30);
  assert.equal(bounds.y + bounds.h - (far.y + far.h), 30);
});

test("legend: the other three inside corners", () => {
  const tl = legend({ items: ITEMS, bounds, corner: "top-left" });
  assert.equal(tl.x - bounds.x, 16);
  assert.equal(tl.y - bounds.y, 16);
  const tr = legend({ items: ITEMS, bounds, corner: "top-right" });
  assert.equal(bounds.x + bounds.w - (tr.x + tr.w), 16);
  assert.equal(tr.y - bounds.y, 16);
  const bl = legend({ items: ITEMS, bounds, corner: "bottom-left" });
  assert.equal(bl.x - bounds.x, 16);
  assert.equal(bounds.y + bounds.h - (bl.y + bl.h), 16);
});

test("legend: bottom-right outside sits `offset` below the bounds, right edges aligned", () => {
  const lg = legend({ items: ITEMS, bounds, corner: "bottom-right", place: "outside" });
  assert.equal(lg.y - (bounds.y + bounds.h), 16);
  assert.equal(lg.x + lg.w, bounds.x + bounds.w);
});

test("legend: outside — top corners go above the bounds, left corners align left edges", () => {
  const tl = legend({ items: ITEMS, bounds, corner: "top-left", place: "outside" });
  assert.equal(bounds.y - (tl.y + tl.h), 16);
  assert.equal(tl.x, bounds.x);
  const tr = legend({ items: ITEMS, bounds, corner: "top-right", place: "outside" });
  assert.equal(bounds.y - (tr.y + tr.h), 16);
  assert.equal(tr.x + tr.w, bounds.x + bounds.w);
  const bl = legend({ items: ITEMS, bounds, corner: "bottom-left", place: "outside" });
  assert.equal(bl.y - (bounds.y + bounds.h), 16);
  assert.equal(bl.x, bounds.x);
});

test("legend: the slots move with the block", () => {
  const a = legend({ items: ITEMS, at: { x: 0, y: 0 } });
  const b = legend({ items: ITEMS, bounds, corner: "bottom-right" });
  const dx = b.x - a.x, dy = b.y - a.y;
  for (const [i, it] of b.items.entries()) {
    assert.equal(it.sample.x - a.items[i].sample.x, dx);
    assert.equal(it.label.y - a.items[i].label.y, dy);
  }
});

test("legend: only `at` — the block's top-left is exactly `at`; nothing given → (0, 0)", () => {
  const lg = legend({ items: ITEMS, at: { x: 37, y: 91 } });
  assert.equal(lg.x, 37);
  assert.equal(lg.y, 91);
  const origin = legend({ items: ITEMS });
  assert.equal(origin.x, 0);
  assert.equal(origin.y, 0);
});

test("legend: corner wins over at", () => {
  const lg = legend({ items: ITEMS, at: { x: 0, y: 0 }, bounds, corner: "bottom-right" });
  assert.equal(lg.x + lg.w, bounds.x + bounds.w - 16);
});

// ===========================================================================
// errors
// ===========================================================================

test("legend: bad parameters throw with `legend` and the parameter name", () => {
  assert.throws(() => legend({ items: [] }), /legend: .*items/);
  assert.throws(() => legend({}), /legend: .*items/);
  assert.throws(() => legend({ items: [{ label: "" }] }), /legend: .*items\[0\]/);
  assert.throws(() => legend({ items: ITEMS, corner: "bottom-right" }), /legend: .*bounds/);
  assert.throws(() => legend({ items: ITEMS, bounds, corner: "middle" }), /legend: .*corner/);
  assert.throws(() => legend({ items: ITEMS, dir: "z" }), /legend: .*dir/);
  assert.throws(() => legend({ items: ITEMS, bounds, corner: "top-left", place: "beside" }), /legend: .*place/);
});

test("legend: a non-number numeric param throws, naming legend and the param", () => {
  const bad = ["bad", NaN, Infinity, "40", {}];
  for (const name of ["sampleW", "sampleH", "gap", "itemGap", "fontSize", "pad", "offset"]) {
    for (const v of bad) {
      assert.throws(
        () => legend({ items: ITEMS, [name]: v }),
        (e) => /legend/.test(e.message) && e.message.includes(`\`${name}\``),
        `${name}=${String(v)}`
      );
    }
  }
});

test("legend: non-number `at` and `bounds` members throw, naming legend and the member", () => {
  for (const k of ["x", "y"]) {
    assert.throws(
      () => legend({ items: ITEMS, at: { x: 0, y: 0, [k]: "50" } }),
      (e) => /legend/.test(e.message) && e.message.includes(`at.${k}`)
    );
  }
  assert.throws(() => legend({ items: ITEMS, at: 5 }), /legend.*`at`/);
  for (const k of ["x", "y", "w", "h"]) {
    // with and without a corner: a bad bounds is never silently accepted
    for (const extra of [{ corner: "top-left" }, {}]) {
      assert.throws(
        () => legend({ items: ITEMS, bounds: { ...bounds, [k]: "bad" }, ...extra }),
        (e) => /legend/.test(e.message) && e.message.includes(`bounds.${k}`),
        `${k} ${JSON.stringify(extra)}`
      );
    }
  }
});

test("legend: valid numbers (0 offset, negative at) still work and stay finite", () => {
  const lg = legend({ items: ITEMS, offset: 0, pad: 0, gap: 0, itemGap: 0, at: { x: -5, y: -7 } });
  assert.equal(lg.x, -5);
  assert.equal(lg.y, -7);
  assert.ok([lg.x, lg.y, lg.w, lg.h].every(Number.isFinite));
});

// ===========================================================================
// entry points
// ===========================================================================

test("compute_layout: legend is whitelisted and dispatches", () => {
  assert.ok(HELPERS.includes("legend"));
  const res = getTool("compute_layout").run({
    helper: "legend",
    args: { items: ITEMS, bounds, corner: "bottom-right" },
  });
  assert.equal(res.helper, "legend");
  assert.equal(res.result.kind, "legend");
  assert.equal(res.result.items.length, 3);

  const bad = getTool("compute_layout").run({ helper: "legend", args: { items: [] } });
  assert.match(bad.error, /legend/);
});

test("compute_layout: the tool description documents legend", () => {
  assert.match(getTool("compute_layout").description, /legend\s+—/);
});

// ===========================================================================
// drawn through sugar + render: no text overflow
// ===========================================================================

test("legend: drawn as sample rects + text, render() reports no text overflow", async () => {
  for (const dir of ["y", "x"]) {
    const lg = legend({ items: ITEMS, dir, bounds, corner: "bottom-right", place: "outside" });
    const els = lg.items.flatMap((it, i) => [
      { shape: "rect", id: `s${i}`, at: [it.sample.x, it.sample.y], size: [it.sample.w, it.sample.h], fill: "blue" },
      { shape: "text", id: `t${i}`, at: [it.label.x, it.label.y], size: [it.label.w, it.label.h], text: it.text, fontSize: it.label.fontSize },
    ]);
    const res = await render(els, { formats: ["excalidraw"] });
    const codes = res.warnings.map((w) => w.code);
    assert.ok(!codes.some((c) => c.startsWith("TEXT_OVERFLOW")), `${dir}: ${JSON.stringify(res.warnings)}`);
    assert.deepEqual(res.warnings, []);
  }
});
