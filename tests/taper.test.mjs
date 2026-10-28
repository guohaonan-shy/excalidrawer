import { test } from "node:test";
import assert from "node:assert/strict";
import * as pkg from "../src/index.mjs";
import { taper } from "../src/index.mjs";
import { render } from "../src/render.mjs";
import { getTool } from "../src/tools/index.mjs";
import { HELPERS } from "../src/tools/compute-layout.mjs";

const approx = (a, b, eps = 1e-6) =>
  assert.ok(Math.abs(a - b) < eps, `expected ${a} ≈ ${b} (Δ=${Math.abs(a - b)})`);

const FUNNEL = [
  { text: "Visited", value: 1000 },
  { text: "Signed up", value: 400 },
  { text: "Activated", value: 120 },
  { text: "Paying users", value: 30 }, // 12 characters
];

// Widths of a layer's top and bottom edges, from its corners (tl, tr, br, bl).
const topW = (l) => l.corners[1][0] - l.corners[0][0];
const botW = (l) => l.corners[2][0] - l.corners[3][0];

function inPolygon([px, py], poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const boxCorners = (b) => [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h], [b.x, b.y + b.h]];

// ============================================================================
// geometry: a 4-layer funnel (narrow at the bottom)
// ============================================================================

test("taper funnel: 4 layers, widest edge is `width`, layers narrow one step at a time from the top", () => {
  const r = taper({ layers: FUNNEL, narrow: "bottom", width: 560, x: 40, y: 100 });
  assert.equal(r.kind, "taper");
  assert.equal(r.layers.length, 4);
  assert.deepEqual(r.layers.map((l) => l.text), FUNNEL.map((l) => l.text));
  assert.deepEqual(r.layers.map((l) => l.index), [0, 1, 2, 3]);
  assert.equal(r.x, 40);
  assert.equal(r.y, 100);
  assert.equal(r.w, 560);
  approx(topW(r.layers[0]), 560);
  // every layer is narrower than the one above it, top edge and bottom edge alike
  for (let i = 1; i < 4; i++) {
    assert.ok(topW(r.layers[i]) < botW(r.layers[i - 1]), `layer ${i} top edge must be narrower than the bottom edge above`);
    assert.ok(botW(r.layers[i]) < botW(r.layers[i - 1]));
  }
  // a funnel layer is wider at the top than at the bottom
  for (const l of r.layers) assert.ok(topW(l) > botW(l));
});

test("taper: the width step is the same from layer to layer, whatever the values are", () => {
  const r = taper({ layers: FUNNEL, narrow: "bottom", width: 560 });
  const steps = [0, 1, 2].map((i) => topW(r.layers[i]) - topW(r.layers[i + 1]));
  approx(steps[0], steps[1]);
  approx(steps[1], steps[2]);
  // values do not change the shape
  const flat = taper({ layers: FUNNEL.map((l) => ({ text: l.text, value: 100 })), narrow: "bottom", width: 560 });
  assert.deepEqual(flat.layers.map((l) => l.corners), r.layers.map((l) => l.corners));
});

test("taper: layers stack top to bottom without overlapping, `gap` apart, and each is symmetric about the center line", () => {
  const r = taper({ layers: FUNNEL, narrow: "bottom", width: 560, x: 40, y: 100, gap: 12 });
  const cx = 40 + 560 / 2;
  approx(r.cx, cx);
  for (const l of r.layers) {
    const [tl, tr, br, bl] = l.corners;
    approx((tl[0] + tr[0]) / 2, cx);
    approx((bl[0] + br[0]) / 2, cx);
    assert.equal(tl[1], tr[1]);
    assert.equal(bl[1], br[1]);
    assert.equal(br[1] - tr[1], l.h);
    assert.equal(tl[1], l.y);
    // the layer's bbox holds its corners
    for (const [px, py] of l.corners) {
      assert.ok(px >= l.x - 1e-9 && px <= l.x + l.w + 1e-9 && py >= l.y && py <= l.y + l.h);
    }
  }
  for (let i = 1; i < 4; i++) {
    approx(r.layers[i].y - (r.layers[i - 1].y + r.layers[i - 1].h), 12);
  }
  const last = r.layers.at(-1);
  approx(r.y + r.h, last.y + last.h);
  assert.equal(r.layers[0].y, 100);
});

test("taper: every layer's text box lies inside its trapezoid", () => {
  for (const narrow of ["top", "bottom"]) {
    const r = taper({ layers: FUNNEL, narrow, width: 560, x: 40, y: 100 });
    for (const l of r.layers) {
      for (const c of boxCorners(l.textBox)) {
        assert.ok(inPolygon(c, l.corners), `${narrow}: ${l.text} text box corner ${c} outside ${JSON.stringify(l.corners)}`);
      }
    }
  }
});

test("taper: a 12-character name fits the last (narrowest) layer; a name that has to wrap makes that layer taller", () => {
  const short = taper({ layers: FUNNEL, narrow: "bottom", width: 560 });
  const last = short.layers.at(-1);
  assert.equal(last.text, "Paying users");
  assert.equal(last.textBox.text, "Paying users", "12 ASCII characters stay on one line");
  assert.equal(last.h, 56, "no growth when the label fits");

  const cjk = taper({
    layers: [...FUNNEL.slice(0, 3), { text: "付费转化的最终用户数量", value: 30 }],
    narrow: "bottom",
    width: 560,
  });
  const l = cjk.layers.at(-1);
  assert.ok(l.textBox.text.includes("\n"), "wrapped onto more than one line");
  assert.ok(l.h > 56, `the layer grew to ${l.h}`);
  // the wrapped label still lies inside the trapezoid, and no line is wider than the text box
  for (const c of boxCorners(l.textBox)) assert.ok(inPolygon(c, l.corners));
  assert.ok(l.textBox.h <= l.h);
  // the other layers did not grow
  for (const o of cjk.layers.slice(0, 3)) assert.equal(o.h, 56);
  // growing a layer pushes the ones below it down, never over them
  for (let i = 1; i < 4; i++) assert.ok(cjk.layers[i].y >= cjk.layers[i - 1].y + cjk.layers[i - 1].h);
});

// ============================================================================
// narrow: "top" (a pyramid)
// ============================================================================

test("taper pyramid: the top layer is the narrowest, widths grow downward, the bottom edge is `width`", () => {
  const r = taper({ layers: ["Self", "Esteem", "Belonging", "Safety", "Physiological"], narrow: "top", width: 600 });
  assert.equal(r.layers.length, 5);
  approx(botW(r.layers.at(-1)), 600);
  for (const l of r.layers) assert.ok(topW(l) < botW(l), "a pyramid layer is narrower at the top");
  for (let i = 1; i < 5; i++) {
    assert.ok(topW(r.layers[i]) > topW(r.layers[i - 1]));
    assert.ok(botW(r.layers[i]) > botW(r.layers[i - 1]));
    assert.ok(topW(r.layers[i]) > botW(r.layers[i - 1]), "no overlap: the edge below is wider than the edge above");
  }
  assert.equal(r.w, 600);
  // layers given as bare strings carry no value anchors
  for (const l of r.layers) assert.equal(l.valueAnchor, undefined);
  // ...but every pair of neighbours still gets a conversion anchor, with no figures on it
  assert.equal(r.rates.length, 4);
  for (const x of r.rates) assert.deepEqual(Object.keys(x).sort(), ["anchor", "from", "to"]);
});

test("taper: the narrowest edge is `minWidth` (default 30% of width) when layers keep their nominal height", () => {
  const f = taper({ layers: ["a", "b", "c"], narrow: "bottom", width: 500 });
  approx(botW(f.layers.at(-1)), 150, 1e-6);
  const p = taper({ layers: ["a", "b", "c"], narrow: "top", width: 500, minWidth: 200 });
  approx(topW(p.layers[0]), 200, 1e-6);
});

// ============================================================================
// anchors: values on the right, conversion rates between layers
// ============================================================================

test("taper: value anchors sit in one column to the right of the whole figure, level with each layer's middle", () => {
  const r = taper({ layers: FUNNEL, narrow: "bottom", width: 560, x: 40, valueGap: 30 });
  const col = r.x + r.w + 30;
  r.layers.forEach((l, i) => {
    assert.equal(l.value, FUNNEL[i].value);
    approx(l.valueAnchor.x, col);
    approx(l.valueAnchor.y, l.y + l.h / 2);
  });
});

test("taper: conversion rates are value[i+1] / value[i], anchored in the gap between the two layers, same column as the values", () => {
  const r = taper({ layers: FUNNEL, narrow: "bottom", width: 560, x: 40, gap: 12 });
  assert.equal(r.rates.length, 3);
  assert.deepEqual(r.rates.map((x) => [x.from, x.to]), [[0, 1], [1, 2], [2, 3]]);
  approx(r.rates[0].ratio, 0.4);
  approx(r.rates[1].ratio, 0.3);
  approx(r.rates[2].ratio, 0.25);
  assert.deepEqual(r.rates.map((x) => x.text), ["40%", "30%", "25%"]);
  r.rates.forEach((x, i) => {
    const above = r.layers[i];
    const below = r.layers[i + 1];
    approx(x.anchor.y, (above.y + above.h + below.y) / 2);
    approx(x.anchor.x, r.layers[0].valueAnchor.x);
  });
});

test("taper: every pair of neighbours gets a rate anchor; ratio and text come only where both values are numbers and the upper one is above 0", () => {
  const r = taper({
    layers: [{ text: "a", value: 1000 }, { text: "b", value: 125 }, { text: "c" }, { text: "d", value: 0 }, { text: "e", value: 5 }],
    narrow: "bottom",
    width: 500,
  });
  assert.deepEqual(r.rates.map((x) => [x.from, x.to]), [[0, 1], [1, 2], [2, 3], [3, 4]]);
  assert.deepEqual(r.rates.map((x) => x.text), ["12.5%", undefined, undefined, undefined]);
  assert.equal(r.rates[0].ratio, 0.125);
  for (const x of r.rates.slice(1)) assert.ok(!("ratio" in x) && !("text" in x), "no figures where the pair is not numeric / upper is 0");
  r.rates.forEach((x, i) => {
    approx(x.anchor.y, (r.layers[i].y + r.layers[i].h + r.layers[i + 1].y) / 2);
    approx(x.anchor.x, r.x + r.w + 24);
  });
});

test("taper: a conversion-rates-only funnel (no values, or values written as formatted strings) still gets 3 anchors for 4 layers", () => {
  const bare = taper({ layers: ["Visited", "Signed up", "Activated", "Paying"], narrow: "bottom", width: 560 });
  assert.equal(bare.rates.length, 3);
  const formatted = taper({
    layers: [{ text: "Visited", value: "10,000" }, { text: "Signed up", value: "4,200" }, { text: "Activated", value: "1.2M" }, { text: "Paying", value: "300k" }],
    narrow: "bottom",
    width: 560,
  });
  assert.equal(formatted.layers[0].valueAnchor.y, formatted.layers[0].y + formatted.layers[0].h / 2);
  assert.equal(formatted.rates.length, 3);
  formatted.rates.forEach((x, i) => {
    assert.deepEqual([x.from, x.to], [i, i + 1]);
    assert.ok(!("ratio" in x) && !("text" in x), "string values have no ratio");
    approx(x.anchor.y, (formatted.layers[i].y + formatted.layers[i].h + formatted.layers[i + 1].y) / 2);
  });
  // a single layer has no neighbour
  assert.deepEqual(taper({ layers: ["only"], width: 300 }).rates, []);
});

// ============================================================================
// params, errors, surfaces
// ============================================================================

test("taper: defaults — pyramid orientation, nominal layer 56 tall, 12 apart, 16px labels", () => {
  const r = taper({ layers: ["A", "B"], width: 300 });
  assert.equal(r.narrow, "top");
  assert.equal(r.layers[0].h, 56);
  approx(r.layers[1].y - (r.layers[0].y + r.layers[0].h), 12);
  assert.equal(r.layers[0].textBox.fontSize, 16);
  assert.equal(r.x, 0);
  assert.equal(r.y, 0);
});

test("taper: a wrong parameter throws, naming taper and the parameter", () => {
  const ok = { layers: ["A", "B"], width: 300 };
  const cases = [
    [{ width: 300 }, /taper: .*`layers`/],
    [{ ...ok, layers: [] }, /taper: .*`layers`/],
    [{ ...ok, layers: "A,B" }, /taper: .*`layers`/],
    [{ ...ok, layers: ["A", ""] }, /taper: .*`layers\[1\]`/],
    [{ ...ok, layers: ["A", { value: 3 }] }, /taper: .*`layers\[1\]`/],
    [{ ...ok, layers: ["A", { text: "B", value: {} }] }, /taper: .*`layers\[1\]\.value`/],
    [{ layers: ["A"] }, /taper: .*`width`/],
    [{ ...ok, width: "300" }, /taper: .*`width`.*"300"/],
    [{ ...ok, width: 0 }, /taper: .*`width`/],
    [{ ...ok, narrow: "left" }, /taper: .*`narrow`/],
    [{ ...ok, minWidth: "x" }, /taper: .*`minWidth`/],
    [{ ...ok, minWidth: 300 }, /taper: .*`minWidth`/],
    [{ ...ok, layerH: -1 }, /taper: .*`layerH`/],
    [{ ...ok, gap: "8" }, /taper: .*`gap`/],
    [{ ...ok, fontSize: NaN }, /taper: .*`fontSize`/],
    [{ ...ok, valueGap: "24" }, /taper: .*`valueGap`/],
    [{ ...ok, x: "0" }, /taper: .*`x`/],
    [{ ...ok, y: Infinity }, /taper: .*`y`/],
  ];
  for (const [opts, re] of cases) {
    assert.throws(() => taper(opts), re, JSON.stringify(opts));
  }
  assert.throws(() => taper(), /taper: /);
});

test("taper is exported from the library and listed as a compute_layout helper", () => {
  assert.equal(typeof pkg.taper, "function");
  assert.ok(HELPERS.includes("taper"));
});

test("compute_layout dispatches taper and returns the same result as the direct call", () => {
  const args = { layers: FUNNEL, narrow: "bottom", width: 560, x: 40, y: 100 };
  const res = getTool("compute_layout").run({ helper: "taper", args });
  assert.equal(res.helper, "taper");
  assert.deepEqual(res.result, taper(args));
});

test("compute_layout turns a taper parameter error into { error } with the component and parameter", () => {
  const res = getTool("compute_layout").run({ helper: "taper", args: { layers: ["A"], width: "wide" } });
  assert.match(res.error, /taper: .*`width`/);
});

// ============================================================================
// drawn through sugar: the pieces fit together and Layer A is quiet
// ============================================================================

test("drawing a funnel from the taper result gives Layer A zero warnings", async () => {
  const r = taper({ layers: FUNNEL, narrow: "bottom", width: 560, x: 40, y: 60 });
  const els = [];
  r.layers.forEach((l, i) => {
    els.push({ shape: "polygon", id: `layer-${i}`, points: l.corners, fill: ["blue", "green", "orange", "red"][i] });
    els.push({ shape: "text", at: [l.textBox.x, l.textBox.y], size: [l.textBox.w, l.textBox.h], text: l.textBox.text, fontSize: l.textBox.fontSize });
    els.push({ shape: "text", at: [l.valueAnchor.x, l.valueAnchor.y - 11], size: [80, 22], text: String(l.value) });
  });
  const out = await render(els, { formats: ["svg"] });
  assert.deepEqual(out.warnings, []);
  assert.equal([...out.outputs.svg.matchAll(/<path [^>]*Z"/g)].length, 4);
});
