import { test } from "node:test";
import assert from "node:assert/strict";
import * as pkg from "../src/index.mjs";
import { panel, stack, fitBoundText } from "../src/index.mjs";
import { render } from "../src/render.mjs";
import { getTool } from "../src/tools/index.mjs";
import { HELPERS } from "../src/tools/compute-layout.mjs";

const approx = (a, b, eps = 1e-6) =>
  assert.ok(Math.abs(a - b) < eps, `expected ${a} ≈ ${b} (Δ=${Math.abs(a - b)})`);

const LONG = "Payment reconciliation and settlement worker (async, retries)";

// One line of an 18px title in a header box: ceil(18 * 1.4 + 20) = 46
const ONE_LINE_TITLE = 46;

// ============================================================================
// panel: title on top
// ============================================================================

test("panel top: title sits inside pad at the full inner width; body is gap below; h = pad*2 + title + gap + body", () => {
  const r = panel({
    title: "Hi",
    pad: 16,
    gap: 12,
    body: { dir: "y", gap: 10, cells: [{ w: 100, h: 40 }, { w: 100, h: 30 }] },
  });
  assert.equal(r.kind, "panel");
  assert.equal(r.x, 0);
  assert.equal(r.y, 0);
  assert.equal(r.w, 100 + 32);
  assert.equal(r.title.x, 16);
  assert.equal(r.title.y, 16);
  assert.equal(r.title.w, r.w - 32);
  assert.equal(r.title.h, ONE_LINE_TITLE);
  assert.equal(r.title.fontSize, 18);
  assert.equal(r.body.kind, "stack");
  assert.equal(r.body.x, 16);
  assert.equal(r.body.y, r.title.y + r.title.h + 12);
  assert.equal(r.body.h, 40 + 10 + 30);
  assert.equal(r.h, 16 * 2 + ONE_LINE_TITLE + 12 + 80);
  // the body's children carry absolute coordinates too
  assert.equal(r.body.children[0].x, 16);
  assert.equal(r.body.children[0].y, r.body.y);
});

test("panel top: defaults are pad 16, gap 12, title font 18, body dir y", () => {
  const r = panel({ title: "Hi", body: { cells: [{ w: 50, h: 20 }, { w: 50, h: 20 }] } });
  assert.equal(r.title.x, 16);
  assert.equal(r.body.y, 16 + ONE_LINE_TITLE + 12);
  // dir y: the two cells are stacked, not side by side
  assert.equal(r.body.children[1].x, r.body.children[0].x);
  assert.ok(r.body.children[1].y > r.body.children[0].y);
  assert.equal(r.title.fontSize, 18);
});

test("panel top: x and y place the top-left; everything inside moves with it", () => {
  const a = panel({ title: "T", body: { dir: "x", cells: [{ text: "A" }] } });
  const b = panel({ title: "T", x: 100, y: 200, body: { dir: "x", cells: [{ text: "A" }] } });
  assert.equal(b.x, 100);
  assert.equal(b.y, 200);
  assert.equal(b.w, a.w);
  assert.equal(b.h, a.h);
  assert.equal(b.title.x, a.title.x + 100);
  assert.equal(b.title.y, a.title.y + 200);
  assert.equal(b.body.x, a.body.x + 100);
  assert.equal(b.body.children[0].y, a.body.children[0].y + 200);
});

test("panel top: a title that wraps to two lines makes the title area taller and moves the body down by the same amount", () => {
  const body = { dir: "y", cells: [{ w: 100, h: 40 }] };
  const short = panel({ title: "Services", w: 140, body });
  const long = panel({ title: "Business services and data", w: 140, body });
  const innerW = 140 - 32;
  const expected = fitBoundText("Business services and data", innerW, 0, 18);
  assert.ok(expected.text.includes("\n"), "the long title does wrap at this width");
  assert.equal(long.title.h, expected.height);
  assert.equal(long.title.text, expected.text);
  assert.ok(long.title.h > short.title.h);
  assert.equal(long.body.y - short.body.y, long.title.h - short.title.h);
  assert.equal(long.h - short.h, long.title.h - short.title.h);
  assert.equal(long.w, 140);
});

test("panel top: with no w the width is the wider of the body and the title (title capped at 200)", () => {
  const narrow = panel({ title: "Hi", body: { dir: "y", cells: [{ w: 300, h: 20 }] } });
  assert.equal(narrow.w, 300 + 32);
  const wide = panel({ title: "A much longer panel title for this one", body: { dir: "y", cells: [{ w: 60, h: 20 }] } });
  assert.equal(wide.w, 200 + 32);
  assert.ok(wide.title.text.includes("\n"), "a title past the cap wraps");
});

test("panel top: titleW is ignored (it only applies to titleSide left)", () => {
  const body = { dir: "y", cells: [{ w: 100, h: 20 }] };
  assert.deepEqual(panel({ title: "T", titleW: 50, body }), panel({ title: "T", body }));
});

test("panel top: a custom title font size, pad and gap are used", () => {
  const r = panel({ title: "T", titleFontSize: 24, pad: 8, gap: 4, body: { dir: "y", cells: [{ w: 100, h: 20 }] } });
  assert.equal(r.title.fontSize, 24);
  assert.equal(r.title.x, 8);
  assert.equal(r.title.h, fitBoundText("T", 100, 0, 24).height);
  assert.equal(r.body.y, 8 + r.title.h + 4);
  assert.equal(r.h, 8 * 2 + r.title.h + 4 + 20);
});

// ============================================================================
// panel: title on the left
// ============================================================================

test("panel left: the title column is as tall as the panel's inner height; the body is gap to its right", () => {
  const r = panel({
    title: "Business Services",
    titleSide: "left",
    titleW: 120,
    body: { dir: "x", cells: [{ text: "A", w: 80 }, { text: LONG, w: 160 }] },
  });
  assert.equal(r.title.w, 120);
  assert.equal(r.title.x, 16);
  assert.equal(r.title.y, 16);
  assert.equal(r.title.h, r.h - 32);
  assert.equal(r.body.x, r.title.x + r.title.w + 12);
  assert.equal(r.body.y, 16);
  assert.equal(r.w, 16 * 2 + 120 + 12 + r.body.w);
  // the body is the tallest thing here (the long label), so the panel follows it
  assert.equal(r.h, r.body.h + 32);
});

test("panel left: with no titleW the title column takes the title's natural width (+10 per side), capped at 200", () => {
  const body = { dir: "x", cells: [{ w: 50, h: 20 }] };
  const data = panel({ title: "Data", titleSide: "left", body });
  assert.equal(data.title.w, 65); // ceil(4 * 0.62 * 18) = 45, + 20
  const long = panel({ title: "Business Services", titleSide: "left", body });
  assert.equal(long.title.w, 200);
  assert.ok(long.title.text.includes("\n"));
});

test("panel left: a title taller than the body stretches the panel, and the body area fills the inner height", () => {
  const r = panel({
    title: "A rather long title that wraps over many lines",
    titleSide: "left",
    titleW: 90,
    body: { dir: "x", cells: [{ w: 60, h: 20 }] },
  });
  const t = fitBoundText("A rather long title that wraps over many lines", 90, 0, 18);
  assert.equal(r.title.h, t.height);
  assert.equal(r.h, t.height + 32);
  assert.equal(r.body.y, 16);
  assert.equal(r.body.h, t.height);
});

// ============================================================================
// panel: fixed width
// ============================================================================

test("panel: with w and a row body justify center, the cells sit centered in the content area", () => {
  const r = panel({
    title: "T",
    w: 400,
    body: { dir: "x", justify: "center", gap: 20, cells: [{ w: 80, h: 30 }, { w: 80, h: 30 }] },
  });
  assert.equal(r.w, 400);
  assert.equal(r.body.w, 400 - 32);
  const [a, b] = r.body.children;
  const left = a.x - r.body.x;
  const right = r.body.x + r.body.w - (b.x + b.w);
  approx(left, right);
  assert.ok(left > 0);
});

test("panel: with w and a row body justify space-between, the first and last cells touch the content area's edges", () => {
  const r = panel({
    title: "T",
    titleSide: "left",
    titleW: 60,
    w: 500,
    body: { dir: "x", justify: "space-between", cells: [{ w: 50, h: 30 }, { w: 50, h: 30 }, { w: 50, h: 30 }] },
  });
  assert.equal(r.w, 500);
  assert.equal(r.body.x, 16 + 60 + 12);
  assert.equal(r.body.w, 500 - 32 - 60 - 12);
  const c = r.body.children;
  assert.equal(c[0].x, r.body.x);
  assert.equal(c[2].x + c[2].w, r.body.x + r.body.w);
});

test("panel: with w and a column body, width-less text cells fill the content area", () => {
  const r = panel({ title: "T", w: 300, body: { dir: "y", cells: [{ text: "One" }, { text: "Two" }] } });
  assert.equal(r.body.w, 300 - 32);
  for (const c of r.body.children) assert.equal(c.w, 300 - 32);
});

test("panel: a w smaller than the content lets the panel grow instead of overflowing", () => {
  const r = panel({ title: "T", w: 50, body: { dir: "x", cells: [{ w: 200, h: 20 }] } });
  assert.equal(r.w, 200 + 32);
  const c = r.body.children[0];
  assert.ok(c.x + c.w <= r.x + r.w - 16);
});

test("panel: overflow reports the px the panel grew past its w (title on top)", () => {
  const r = panel({ title: "T", w: 100, body: { dir: "x", cells: [{ w: 120, h: 40 }] } });
  assert.equal(r.w, 120 + 32);
  assert.equal(r.overflow, r.w - 100);
});

test("panel: overflow reports the px the panel grew past its w (title on the left)", () => {
  const r = panel({ title: "T", titleSide: "left", w: 100, body: { dir: "x", cells: [{ w: 120, h: 40 }] } });
  assert.equal(r.overflow, r.w - 100);
  assert.ok(r.overflow > 0);
});

test("panel: overflow is 0 when it fits, when w is spare, and when there is no w", () => {
  const body = { dir: "x", cells: [{ w: 120, h: 40 }] };
  for (const side of ["top", "left"]) {
    assert.equal(panel({ title: "T", titleSide: side, body }).overflow, 0);
    assert.equal(panel({ title: "T", titleSide: side, w: 400, body }).overflow, 0);
  }
  // w exactly the natural width: nothing past it
  const nat = panel({ title: "T", body });
  assert.equal(panel({ title: "T", w: nat.w, body }).overflow, 0);
});

// ============================================================================
// panel: nested in a stack
// ============================================================================

test("stack: a { panel } cell is laid out and carries its kind, id and absolute coordinates", () => {
  const r = stack({
    dir: "y",
    gap: 20,
    x: 10,
    y: 30,
    cells: [
      { text: "Head", w: 60 },
      { id: "p", panel: { title: "Hi", body: { dir: "x", cells: [{ w: 60, h: 20 }] } } },
    ],
  });
  const p = r.children[1];
  assert.equal(p.kind, "panel");
  assert.equal(p.id, "p");
  assert.equal(p.x, 10);
  assert.equal(p.y, 30 + r.children[0].h + 20);
  assert.equal(p.title.x, p.x + 16);
  assert.equal(p.body.y, p.y + 16 + ONE_LINE_TITLE + 12);
  assert.equal(r.w, p.w);
});

test("stack equalize in a column: two panels with different titles get one width and re-flow inside; centered cells stay centered", () => {
  const mk = (title, w) => ({
    panel: { title, body: { dir: "x", justify: "center", cells: [{ w, h: 30 }] } },
  });
  const natural = [panel(mk("Short", 60).panel), panel(mk("A much longer panel title", 120).panel)];
  assert.notEqual(natural[0].w, natural[1].w);
  const r = stack({ dir: "y", equalize: true, cells: [mk("Short", 60), mk("A much longer panel title", 120)] });
  const [a, b] = r.children;
  assert.equal(a.w, b.w);
  assert.equal(a.w, Math.max(natural[0].w, natural[1].w));
  for (const p of [a, b]) {
    assert.equal(p.title.w, p.w - 32);
    assert.equal(p.body.w, p.w - 32);
    const cell = p.body.children[0];
    approx(cell.x - p.body.x, p.body.x + p.body.w - (cell.x + cell.w));
    assert.equal(p.x, 0);
  }
  // the second panel's long title wraps at its width, so it is the taller one
  assert.ok(b.h > a.h);
});

test("stack equalize in a row: two panels of different heights get one height; the body area takes the extra room", () => {
  const r = stack({
    dir: "x",
    equalize: true,
    cells: [
      { panel: { title: "A", body: { dir: "y", justify: "center", cells: [{ w: 60, h: 20 }] } } },
      { panel: { title: "B", body: { dir: "y", cells: [{ w: 60, h: 20 }, { w: 60, h: 20 }, { w: 60, h: 20 }] } } },
    ],
  });
  const [a, b] = r.children;
  assert.equal(a.h, b.h);
  assert.equal(a.h, 16 * 2 + ONE_LINE_TITLE + 12 + 3 * 20 + 2 * 16);
  assert.equal(a.body.h, a.h - 32 - ONE_LINE_TITLE - 12);
  // the single cell is centered vertically in the taller body
  const cell = a.body.children[0];
  approx(cell.y - a.body.y, a.body.y + a.body.h - (cell.y + cell.h));
  assert.equal(r.h, a.h);
});

test("stack equalize in a row: left-titled panels take the shared height on the title column too", () => {
  const r = stack({
    dir: "x",
    equalize: true,
    cells: [
      { panel: { title: "A", titleSide: "left", body: { dir: "x", cells: [{ w: 60, h: 20 }] } } },
      { panel: { title: "B", titleSide: "left", body: { dir: "x", cells: [{ w: 60, h: 90 }] } } },
    ],
  });
  const [a, b] = r.children;
  assert.equal(a.h, b.h);
  assert.equal(a.title.h, a.h - 32);
  assert.equal(b.title.h, b.h - 32);
});

test("stack: a panel inside a panel's body lays out and moves with its parent", () => {
  const inner = { title: "In", body: { dir: "x", cells: [{ w: 40, h: 20 }] } };
  const r = panel({ title: "Out", x: 50, y: 60, body: { dir: "y", cells: [{ panel: inner }] } });
  const p = r.body.children[0];
  assert.equal(p.kind, "panel");
  assert.equal(p.x, r.body.x);
  assert.equal(p.y, r.body.y);
  assert.ok(p.x >= 50 + 16 && p.y >= 60 + 16);
  assert.ok(p.x + p.w <= r.x + r.w - 16 + 1e-6);
});

// ============================================================================
// panel: the swim-lane overflow this exists for
// ============================================================================

// The repro's items are 160 wide (itemW: 160), where the long label wraps to 5
// lines = 132 tall. `maxW: 160` on the body gives the same item width.
async function laneWarnings(bodyOpts) {
  const lanes = stack({
    dir: "y",
    gap: 16,
    x: 40,
    y: 40,
    cells: [
      {
        panel: {
          title: "Business Services",
          titleSide: "left",
          body: { dir: "x", ...bodyOpts, cells: [{ text: "Order Service" }, { text: LONG }] },
        },
      },
      {
        panel: {
          title: "Data",
          titleSide: "left",
          body: { dir: "x", ...bodyOpts, cells: [{ text: "Postgres" }] },
        },
      },
    ],
  });
  const texts = [["Order Service", LONG], ["Postgres"]];
  const els = [];
  lanes.children.forEach((p, i) => {
    els.push({ shape: "rect", id: `p${i}`, at: [p.x, p.y], size: [p.w, p.h], fill: "gray" });
    els.push({ shape: "rect", id: `t${i}`, at: [p.title.x, p.title.y], size: [p.title.w, p.title.h], fill: "yellow", text: ["Business Services", "Data"][i] });
    p.body.children.forEach((c, j) => {
      els.push({ shape: "rect", id: `c${i}-${j}`, at: [c.x, c.y], size: [c.w, c.h], fill: "blue", text: texts[i][j] });
    });
  });
  const { warnings } = await render(els, { formats: ["excalidraw"] });
  return { lanes, warnings };
}

test("panel: two left-titled panels in a column stack, with the repro's 160-wide long item, are 132 + padding tall and render with no SHAPE_OVERLAP", async () => {
  const { lanes, warnings } = await laneWarnings({ maxW: 160 });
  const [first, second] = lanes.children;
  assert.equal(first.body.children[1].h, 132);
  assert.ok(first.h >= 132 + 32, `first panel is ${first.h} tall`);
  assert.ok(!warnings.some((w) => w.code === "SHAPE_OVERLAP"), JSON.stringify(warnings));
  assert.ok(!warnings.some((w) => w.code.startsWith("TEXT_OVERFLOW")), JSON.stringify(warnings));
  assert.ok(second.y >= first.y + first.h);
});

test("panel: the same lanes with items at their default natural width (capped at 200) are as tall as their tallest item + padding, no overlap", async () => {
  const { lanes, warnings } = await laneWarnings({});
  const [first, second] = lanes.children;
  const tallest = Math.max(...first.body.children.map((c) => c.h));
  assert.equal(first.h, tallest + 32);
  assert.ok(!warnings.some((w) => w.code === "SHAPE_OVERLAP"), JSON.stringify(warnings));
  assert.ok(!warnings.some((w) => w.code.startsWith("TEXT_OVERFLOW")), JSON.stringify(warnings));
  assert.ok(second.y >= first.y + first.h);
});

// ============================================================================
// panel: bad input
// ============================================================================

test("panel: missing or non-string title throws, naming panel and title", () => {
  const body = { dir: "x", cells: [{ w: 1, h: 1 }] };
  assert.throws(() => panel({ body }), /panel: .*`title`/);
  assert.throws(() => panel({ title: 5, body }), /panel: .*`title`/);
});

test("panel: missing or malformed body throws, naming panel and body", () => {
  assert.throws(() => panel({ title: "T" }), /panel: .*`body`/);
  assert.throws(() => panel({ title: "T", body: "x" }), /panel: .*`body`/);
  assert.throws(() => panel({ title: "T", body: [] }), /panel: .*`body`/);
});

test("panel: an unknown titleSide or a bad number throws, naming the parameter", () => {
  const body = { dir: "x", cells: [{ w: 1, h: 1 }] };
  assert.throws(() => panel({ title: "T", body, titleSide: "right" }), /panel: `titleSide`/);
  assert.throws(() => panel({ title: "T", body, pad: -1 }), /panel: `pad`/);
  assert.throws(() => panel({ title: "T", body, gap: "a" }), /panel: `gap`/);
  assert.throws(() => panel({ title: "T", body, titleFontSize: 0 }), /panel: `titleFontSize`/);
  assert.throws(() => panel({ title: "T", body, titleSide: "left", titleW: -4 }), /panel: `titleW`/);
  assert.throws(() => panel({ title: "T", body, w: 0 }), /panel: `w`/);
});

test("panel: an error inside the body says it came from the panel's body", () => {
  assert.throws(() => panel({ title: "T", body: { dir: "z", cells: [{ w: 1, h: 1 }] } }), /panel: .*body.*`dir`/s);
  assert.throws(() => panel({ title: "T", body: { dir: "y", cells: [{ foo: 1 }] } }), /panel: .*body.*cells\[0\] needs/s);
});

test("stack: an error in a panel cell says which cell it was in", () => {
  assert.throws(
    () => stack({ dir: "x", cells: [{ text: "a" }, { panel: { body: { dir: "x", cells: [{ w: 1, h: 1 }] } } }] }),
    /^Error: panel: cells\[1\]\.panel: .*`title`/,
  );
  assert.throws(() => stack({ dir: "x", cells: [{ panel: {} }] }), /panel: cells\[0\]\.panel: .*`title`/);
  assert.throws(() => stack({ dir: "x", cells: [{ panel: "x" }] }), /panel: cells\[0\]\.panel: /);
});

// ============================================================================
// panel: entry points (package export, compute_layout)
// ============================================================================

test("panel: is exported from the package entry", () => {
  assert.equal(typeof pkg.panel, "function");
});

test("compute_layout: HELPERS includes panel", () => {
  assert.ok(HELPERS.includes("panel"));
});

test("compute_layout: dispatches panel with flat args", () => {
  const args = { title: "Data", titleSide: "left", body: { dir: "x", cells: [{ text: "Postgres" }] } };
  const res = getTool("compute_layout").run({ helper: "panel", args });
  assert.equal(res.helper, "panel");
  assert.equal(res.result.kind, "panel");
  assert.equal(res.result.body.children.length, 1);
  assert.deepEqual(res.result, panel(args));
});

test("compute_layout: bad panel args come back as { error } naming the component and the parameter", () => {
  const res = getTool("compute_layout").run({ helper: "panel", args: { body: { dir: "x", cells: [{ w: 1, h: 1 }] } } });
  assert.match(res.error, /panel: .*`title`/);
  const res2 = getTool("compute_layout").run({ helper: "panel", args: { title: "T" } });
  assert.match(res2.error, /panel: .*`body`/);
});

test("compute_layout: the description documents panel's parameters and return", () => {
  const { description } = getTool("compute_layout");
  assert.match(description, /panel\s+—\s+\{ title/);
  assert.match(description, /titleSide/);
});

test("panel: a non-boolean equalize on the body throws, naming panel, body and equalize", () => {
  assert.throws(
    () => panel({ title: "T", body: { dir: "x", equalize: "false", cells: [{ w: 10, h: 10 }] } }),
    /panel: body: stack: .*`equalize`/,
  );
});
