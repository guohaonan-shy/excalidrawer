import { test } from "node:test";
import assert from "node:assert/strict";

import { normalizeCanvas, resolveCanvas, contentBounds, CanvasError } from "../src/canvas.mjs";
import { toSvg } from "../src/export.mjs";
import { render } from "../src/render.mjs";
import { validate } from "../src/validate.mjs";
import { chooseGrid, gridLayout } from "../src/layout.mjs";
import { getPreset, presetToCanvas, presetIds, presetAgeMonths } from "../src/presets/index.mjs";

const box = (id, x, y, w, h) => ({ id, type: "rectangle", x, y, width: w, height: h });
const text = (id, x, y, fontSize, str = "hi") => ({
  id, type: "text", x, y, width: 60, height: fontSize, fontSize, text: str,
});

// --- normalizeCanvas -------------------------------------------------------

test("normalizeCanvas: accepts explicit width + height", () => {
  const c = normalizeCanvas({ width: 1000, height: 500 });
  assert.equal(c.width, 1000);
  assert.equal(c.height, 500);
  assert.equal(c.fit, "contain");
  assert.equal(c.align, "center");
});

test("normalizeCanvas: resolves ratio against a given width", () => {
  assert.equal(normalizeCanvas({ ratio: "3:4", width: 1242 }).height, 1656);
});

test("normalizeCanvas: resolves ratio against a given height", () => {
  assert.equal(normalizeCanvas({ ratio: "16:9", height: 1080 }).width, 1920);
});

test("normalizeCanvas: accepts a slash ratio and a bare number", () => {
  assert.equal(normalizeCanvas({ ratio: "16/9", height: 900 }).width, 1600);
  assert.equal(normalizeCanvas({ ratio: 2, height: 300 }).width, 600);
});

test("normalizeCanvas: explicit width+height wins over ratio", () => {
  const c = normalizeCanvas({ ratio: "1:1", width: 400, height: 300 });
  assert.equal(c.width, 400);
  assert.equal(c.height, 300);
});

test("normalizeCanvas: rejects a ratio with nothing to resolve against", () => {
  assert.throws(() => normalizeCanvas({ ratio: "3:4" }), CanvasError);
});

test("normalizeCanvas: rejects a malformed ratio", () => {
  assert.throws(() => normalizeCanvas({ ratio: "wide", width: 100 }), /ratio/);
});

test("normalizeCanvas: rejects missing dimensions", () => {
  assert.throws(() => normalizeCanvas({}), /requires width and height/);
});

test("normalizeCanvas: rejects unknown fit and align", () => {
  assert.throws(() => normalizeCanvas({ width: 10, height: 10, fit: "cover" }), /fit/);
  assert.throws(() => normalizeCanvas({ width: 10, height: 10, align: "middle" }), /align/);
});

test("normalizeCanvas: rejects padding that leaves no room", () => {
  assert.throws(() => normalizeCanvas({ width: 100, height: 100, padding: 60 }), /no room/);
});

test("normalizeCanvas: default padding is 6% of the short edge", () => {
  assert.equal(normalizeCanvas({ width: 1242, height: 1656 }).padding, 75);
});

test("normalizeCanvas: safe area defaults to zeros and validates sides", () => {
  assert.deepEqual(normalizeCanvas({ width: 100, height: 100 }).safe, { top: 0, right: 0, bottom: 0, left: 0 });
  assert.equal(normalizeCanvas({ width: 400, height: 400, safe: { bottom: 40 } }).safe.bottom, 40);
  assert.throws(() => normalizeCanvas({ width: 100, height: 100, safe: { top: -5 } }), /non-negative/);
});

// --- contentBounds ---------------------------------------------------------

test("contentBounds: measures shapes and arrow points, skips bound text", () => {
  const b = contentBounds([
    box("a", 10, 20, 100, 50),
    { id: "t", type: "text", x: -999, y: -999, width: 10, height: 10, containerId: "a", text: "x" },
    { id: "ar", type: "arrow", x: 110, y: 45, points: [[0, 0], [40, 0]] },
  ]);
  assert.deepEqual(b, { x: 10, y: 20, w: 140, h: 50 });
});

test("contentBounds: empty input yields a zero box rather than Infinity", () => {
  assert.deepEqual(contentBounds([]), { x: 0, y: 0, w: 0, h: 0 });
});

// --- resolveCanvas ---------------------------------------------------------

test("resolveCanvas: contain scales content to the usable area and centers it", () => {
  const c = resolveCanvas([box("a", 0, 0, 200, 200)], {
    width: 400, height: 400, padding: 0,
  });
  assert.equal(c.scale, 2);
  assert.equal(c.tx, 0);
  assert.equal(c.ty, 0);
  assert.equal(c.fill, 1);
});

test("resolveCanvas: contain scales up as well as down", () => {
  const c = resolveCanvas([box("a", 0, 0, 100, 100)], { width: 500, height: 500, padding: 0 });
  assert.equal(c.scale, 5);
});

test("resolveCanvas: pad never enlarges", () => {
  const c = resolveCanvas([box("a", 0, 0, 100, 100)], {
    width: 500, height: 500, padding: 0, fit: "pad",
  });
  assert.equal(c.scale, 1);
});

test("resolveCanvas: none keeps 1:1 and reports overflow", () => {
  const c = resolveCanvas([box("a", 0, 0, 800, 100)], {
    width: 400, height: 400, padding: 0, fit: "none",
  });
  assert.equal(c.scale, 1);
  assert.equal(c.overflow, true);
});

test("resolveCanvas: the transform maps content origin into the canvas", () => {
  const c = resolveCanvas([box("a", 50, 50, 100, 100)], {
    width: 400, height: 400, padding: 0, align: "top-left",
  });
  // content origin (50,50) must land on the inner box origin (0,0)
  assert.equal(50 * c.scale + c.tx, 0);
  assert.equal(50 * c.scale + c.ty, 0);
});

test("resolveCanvas: alignment shifts the content within the canvas", () => {
  const spec = { width: 400, height: 800, padding: 0 };
  const el = [box("a", 0, 0, 100, 100)];
  assert.equal(resolveCanvas(el, { ...spec, align: "top" }).ty, 0);
  assert.equal(resolveCanvas(el, { ...spec, align: "center" }).ty, 200);
  assert.equal(resolveCanvas(el, { ...spec, align: "bottom" }).ty, 400);
});

test("resolveCanvas: safe area shrinks and offsets the usable box", () => {
  const c = resolveCanvas([box("a", 0, 0, 100, 100)], {
    width: 400, height: 400, padding: 0, safe: { top: 100, bottom: 0, left: 0, right: 0 },
  });
  assert.equal(c.inner.y, 100);
  assert.equal(c.inner.h, 300);
});

test("resolveCanvas: fill reports the aspect mismatch", () => {
  // 4:1 content in a 1:1 canvas fills a quarter of the usable area.
  const c = resolveCanvas([box("a", 0, 0, 400, 100)], { width: 400, height: 400, padding: 0 });
  assert.equal(c.fill, 0.25);
});

// --- SVG / PNG output ------------------------------------------------------

test("toSvg: without a canvas the output stays content-sized", () => {
  const svg = toSvg([box("a", 0, 0, 100, 50)]);
  assert.match(svg, /width="140" height="90"/); // 20px auto padding per side
  assert.doesNotMatch(svg, /<g transform=/);
});

test("toSvg: with a canvas the output is exactly the requested size", () => {
  const svg = toSvg([box("a", 0, 0, 100, 50)], { canvas: { width: 1242, height: 1656 } });
  assert.match(svg, /viewBox="0 0 1242 1656"/);
  assert.match(svg, /width="1242" height="1656"/);
  assert.match(svg, /<g transform="translate\(/);
});

test("toSvg: transparent background omits the backing rect", () => {
  const svg = toSvg([box("a", 0, 0, 100, 50)], {
    canvas: { width: 200, height: 200, background: "transparent" },
  });
  assert.doesNotMatch(svg, /<rect x="0" y="0" width="200"/);
});

test("toSvg: a custom background color is honoured", () => {
  const svg = toSvg([box("a", 0, 0, 10, 10)], {
    canvas: { width: 200, height: 200, background: "#ffeecc" },
  });
  assert.match(svg, /fill="#ffeecc"/);
});

// --- render() integration --------------------------------------------------

test("render: reports the resolved canvas and keeps .excalidraw unscaled", async () => {
  const r = await render([box("a", 0, 0, 100, 100)], {
    formats: ["excalidraw", "svg"],
    canvas: { width: 600, height: 600, padding: 0 },
  });
  assert.equal(r.canvas.width, 600);
  assert.equal(r.canvas.scale, 6);
  const doc = JSON.parse(r.outputs.excalidraw);
  assert.equal(doc.elements[0].width, 100); // authored coordinates untouched
});

test("render: without a canvas the result carries no canvas block", async () => {
  const r = await render([box("a", 0, 0, 100, 100)], { formats: ["svg"] });
  assert.equal(r.canvas, undefined);
});

test("render: a bad canvas throws before anything is produced", async () => {
  await assert.rejects(
    () => render([box("a", 0, 0, 10, 10)], { formats: ["svg"], canvas: { width: 0, height: 0 } }),
    (e) => e instanceof CanvasError && Array.isArray(e.issues)
  );
});

// --- canvas linting --------------------------------------------------------

const codes = (ws) => ws.map((w) => w.code);

test("validate: no canvas checks run without a canvas", () => {
  const ws = validate([box("a", 0, 0, 4000, 100)]);
  assert.ok(!codes(ws).includes("CANVAS_UNDERFILL"));
});

test("validate: flags a wide diagram squeezed into a tall canvas", () => {
  const canvas = resolveCanvas([box("a", 0, 0, 2000, 100)], { width: 1242, height: 1656 });
  const ws = validate([box("a", 0, 0, 2000, 100)], { canvas });
  assert.ok(codes(ws).includes("CANVAS_UNDERFILL"));
  assert.match(ws.find((w) => w.code === "CANVAS_UNDERFILL").message, /stack the nodes vertically/);
});

test("validate: underfill advice flips for a wide canvas", () => {
  const els = [box("a", 0, 0, 100, 2000)];
  const canvas = resolveCanvas(els, { width: 1920, height: 1080 });
  const w = validate(els, { canvas }).find((x) => x.code === "CANVAS_UNDERFILL");
  assert.match(w.message, /spread the nodes horizontally/);
});

test("validate: a well-matched aspect produces no underfill warning", () => {
  const els = [box("a", 0, 0, 900, 1200)];
  const canvas = resolveCanvas(els, { width: 1242, height: 1656 });
  assert.ok(!codes(validate(els, { canvas })).includes("CANVAS_UNDERFILL"));
});

test("validate: flags text that renders too small for the canvas", () => {
  const els = [box("a", 0, 0, 4000, 4000), text("t", 0, 0, 12)];
  const canvas = resolveCanvas(els, { width: 1242, height: 1656 });
  const w = validate(els, { canvas }).find((x) => x.code === "TEXT_TOO_SMALL");
  assert.ok(w);
  assert.deepEqual(w.ids, ["t"]);
});

test("validate: text scaled up past the floor is not flagged", () => {
  const els = [box("a", 0, 0, 400, 500), text("t", 0, 0, 20)];
  const canvas = resolveCanvas(els, { width: 1242, height: 1656 });
  assert.ok(!codes(validate(els, { canvas })).includes("TEXT_TOO_SMALL"));
});

test("resolveCanvas: contain keeps content clear of the safe area by itself", () => {
  const els = [box("a", 0, 0, 100, 100)];
  const canvas = resolveCanvas(els, {
    width: 400, height: 400, padding: 0, safe: { top: 0, right: 0, bottom: 200, left: 0 },
  });
  const bottom = (0 + 100) * canvas.scale + canvas.ty;
  assert.ok(bottom <= 400 - 200, "content must not reach into the safe band");
  assert.ok(!codes(validate(els, { canvas })).includes("CANVAS_SAFE_AREA"));
});

test("resolveCanvas: a safe area still clears under fit:none via alignment", () => {
  const els = [box("a", 0, 350, 100, 40)];
  const canvas = resolveCanvas(els, {
    width: 400, height: 400, padding: 0, fit: "none",
    safe: { top: 0, right: 0, bottom: 200, left: 0 },
  });
  assert.ok(350 * canvas.scale + canvas.ty >= 0);
  assert.ok(390 * canvas.scale + canvas.ty <= 200);
});

test("validate: flags content overflowing a fit:none canvas", () => {
  const els = [box("a", 0, 0, 900, 100)];
  const canvas = resolveCanvas(els, { width: 400, height: 400, padding: 0, fit: "none" });
  assert.ok(codes(validate(els, { canvas })).includes("CANVAS_OVERFLOW"));
});

// --- presets ---------------------------------------------------------------

test("presets: every entry carries the fields the tool layer reads", () => {
  for (const id of presetIds()) {
    const p = getPreset(id);
    assert.ok(p.width > 0 && p.height > 0, `${id} has dimensions`);
    assert.ok(typeof p.ratio === "string", `${id} has a ratio`);
    assert.ok(typeof p.label === "string", `${id} has a label`);
    assert.equal(typeof p.safeVerified, "boolean", `${id} declares safe verification`);
  }
});

test("presets: declared pixel size matches the declared ratio", () => {
  for (const id of presetIds()) {
    const p = getPreset(id);
    const [w, h] = p.ratio.split(":").map(Number);
    assert.ok(
      Math.abs(p.width / p.height - w / h) < 0.02,
      `${id}: ${p.width}x${p.height} does not match ${p.ratio}`
    );
  }
});

test("presets: resolves to plain geometry", () => {
  const { canvas } = presetToCanvas("xhs:cover");
  assert.equal(canvas.width, 1242);
  assert.equal(canvas.height, 1656);
});

test("presets: an unverified safe area is never passed through", () => {
  // Every entry ships unverified today; none may leak a safe area.
  for (const id of presetIds()) {
    const p = getPreset(id);
    if (!p.safeVerified) assert.equal(presetToCanvas(id).canvas.safe, undefined, id);
  }
});

test("presets: unknown id lists the valid ones", () => {
  assert.throws(() => presetToCanvas("weibo:cover"), /unknown canvas preset.*xhs:cover/s);
});

test("presets: a stale entry comes back with a freshness note", () => {
  const future = new Date("2030-01-01");
  const { note } = presetToCanvas("xhs:cover", future);
  assert.match(note, /re-check the ratio/i);
});

test("presets: a fresh entry has no note", () => {
  const p = getPreset("xhs:cover");
  const soonAfter = new Date(p.verifiedAt);
  assert.equal(presetToCanvas("xhs:cover", soonAfter).note, undefined);
});

test("presets: age is measured in whole months", () => {
  const p = getPreset("xhs:cover");
  const d = new Date(p.verifiedAt);
  d.setMonth(d.getMonth() + 14);
  assert.equal(presetAgeMonths(p, d), 14);
});

// --- aspect-aware layout ---------------------------------------------------

test("chooseGrid: the same nodes take different shapes per target", () => {
  const opts = { cellW: 180, cellH: 180 };
  assert.equal(chooseGrid(6, { ...opts, targetAspect: "3:4" }).cols, 2);
  assert.equal(chooseGrid(6, { ...opts, targetAspect: "16:9" }).cols, 3);
});

test("chooseGrid: prefers a full last row over a marginally better aspect", () => {
  // 3x2 is complete; 4x2 fits 16:9 slightly better but strands two holes.
  assert.equal(chooseGrid(6, { targetAspect: "16:9", cellW: 180, cellH: 180 }).cols, 3);
});

test("chooseGrid: honours maxCols", () => {
  assert.ok(chooseGrid(12, { targetAspect: "16:9", cellW: 100, cellH: 100, maxCols: 3 }).cols <= 3);
});

test("chooseGrid: falls back to a single row without a usable target", () => {
  assert.equal(chooseGrid(4, { cellW: 100, cellH: 100 }).cols, 4);
});

test("chooseGrid: reports the block it measured", () => {
  const g = chooseGrid(4, { targetAspect: "1:1", cellW: 100, cellH: 50, colGap: 0, rowGap: 0 });
  assert.equal(g.w, g.cols * 100);
  assert.equal(g.h, g.rows * 50);
  assert.equal(g.aspect, g.w / g.h);
});

test("gridLayout: derives cols from targetAspect when none is given", () => {
  const cells = gridLayout(6, { targetAspect: "3:4", cellW: 180, cellH: 180 });
  assert.equal(new Set(cells.map((c) => c.col)).size, 2);
});

test("gridLayout: an explicit cols still wins", () => {
  const cells = gridLayout(6, { cols: 6, targetAspect: "3:4", cellW: 100, cellH: 100 });
  assert.equal(cells.at(-1).row, 0);
});

test("gridLayout: serpentine reverses alternate rows", () => {
  const cells = gridLayout(6, { cols: 3, cellW: 100, cellH: 50, serpentine: true });
  assert.deepEqual(cells.map((c) => c.col), [0, 1, 2, 2, 1, 0]);
});

test("gridLayout: without serpentine every row runs left to right", () => {
  const cells = gridLayout(6, { cols: 3, cellW: 100, cellH: 50 });
  assert.deepEqual(cells.map((c) => c.col), [0, 1, 2, 0, 1, 2]);
});
