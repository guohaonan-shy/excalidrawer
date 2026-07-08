import { test } from "node:test";
import assert from "node:assert/strict";

import { validate } from "../src/validate.mjs";
import { box, rect, arrow, textEl } from "../src/elements.mjs";
import { render } from "../src/render.mjs";

function codes(warnings) {
  return warnings.map((w) => w.code);
}

test("clean, well-sized diagram produces no warnings", () => {
  const els = [
    ...box("b1", "b1t", 0, 0, 160, 60, "#a5d8ff", "Start", 16),
    arrow("a1", 160, 30, [[0, 0], [60, 0]]),
    ...box("b2", "b2t", 220, 0, 160, 60, "#b2f2bb", "End", 16),
  ].flat();
  assert.deepEqual(validate(els), []);
});

test("bound text wider than its box is flagged TEXT_OVERFLOW_X", () => {
  // Long label in a narrow box, no wrapping (raw box() never wraps).
  const els = box("b1", "b1t", 0, 0, 80, 50, "#a5d8ff",
    "A really long label that cannot fit", 16).flat();
  const w = validate(els);
  assert.ok(codes(w).includes("TEXT_OVERFLOW_X"), "expected overflow-x");
  assert.ok(w[0].ids.includes("b1") && w[0].ids.includes("b1t"));
});

test("bound text shorter than its box does not warn", () => {
  const els = box("b1", "b1t", 0, 0, 240, 60, "#a5d8ff", "OK", 16).flat();
  assert.deepEqual(codes(validate(els)), []);
});

test("multi-line text taller than a fixed box is flagged TEXT_OVERFLOW_Y", () => {
  const els = box("b1", "b1t", 0, 0, 400, 30, "#a5d8ff",
    "line one\nline two\nline three", 16).flat();
  assert.ok(codes(validate(els)).includes("TEXT_OVERFLOW_Y"));
});

test("partial overlap between two boxes is flagged SHAPE_OVERLAP", () => {
  const els = [
    rect("r1", 0, 0, 100, 100, "#a5d8ff"),
    rect("r2", 50, 50, 100, 100, "#b2f2bb"), // overlaps r1 by 50x50 = 25%
  ];
  const w = validate(els);
  assert.ok(codes(w).includes("SHAPE_OVERLAP"));
});

test("full containment (section around item) does NOT warn", () => {
  const els = [
    rect("section", 0, 0, 400, 200, "#e7f5ff"),
    rect("item", 20, 20, 100, 60, "#a5d8ff"), // fully inside section
  ];
  assert.deepEqual(codes(validate(els)), []);
});

test("adjacent boxes with a gap do not warn", () => {
  const els = [
    rect("r1", 0, 0, 100, 60, "#a5d8ff"),
    rect("r2", 140, 0, 100, 60, "#b2f2bb"),
  ];
  assert.deepEqual(codes(validate(els)), []);
});

test("zero-length arrow is flagged DEGENERATE_ARROW", () => {
  const els = [arrow("a1", 10, 10, [[0, 0], [0, 0]])];
  assert.ok(codes(validate(els)).includes("DEGENERATE_ARROW"));
});

test("a real arrow does not warn", () => {
  const els = [arrow("a1", 0, 0, [[0, 0], [120, 0]])];
  assert.deepEqual(codes(validate(els)), []);
});

test("standalone title text uses a looser tolerance", () => {
  // Fits within its declared width — no warning.
  const els = [textEl("t", 0, 0, 500, 30, "My Diagram Title", 22)];
  assert.deepEqual(codes(validate(els)), []);
});

test("arrow passing through a non-endpoint box is flagged ARROW_CROSSES_SHAPE", () => {
  const els = [
    rect("a", 0, 0, 80, 60, "#a5d8ff"),
    rect("mid", 200, 0, 80, 60, "#ffd43b"), // sits in the path
    rect("b", 400, 0, 80, 60, "#b2f2bb"),
    // straight arrow from a's right edge to b's left edge, over `mid`
    arrow("ar", 80, 30, [[0, 0], [320, 0]]),
  ];
  const w = validate(els);
  assert.ok(codes(w).includes("ARROW_CROSSES_SHAPE"));
  const crossing = w.find((x) => x.code === "ARROW_CROSSES_SHAPE");
  assert.ok(crossing.ids.includes("ar") && crossing.ids.includes("mid"));
});

test("arrow ending at a box (endpoint) is NOT flagged as crossing", () => {
  const els = [
    rect("a", 0, 0, 80, 60, "#a5d8ff"),
    rect("b", 200, 0, 80, 60, "#b2f2bb"),
    arrow("ar", 80, 30, [[0, 0], [120, 0]]), // ends at b's left edge
  ];
  assert.ok(!codes(validate(els)).includes("ARROW_CROSSES_SHAPE"));
});

test("low-contrast label on a fill is flagged LOW_CONTRAST", () => {
  // white text on yellow fill — unreadable
  const els = box("b1", "b1t", 0, 0, 200, 60, "#ffd43b", "Hi", 16,
    { }).flat();
  // force the bound text color to near-white
  const txt = els.find((e) => e.id === "b1t");
  txt.strokeColor = "#ffffff";
  assert.ok(codes(validate(els)).includes("LOW_CONTRAST"));
});

test("default dark text on a light palette fill does NOT warn", () => {
  const els = box("b1", "b1t", 0, 0, 200, 60, "#a5d8ff", "Readable", 16).flat();
  assert.ok(!codes(validate(els)).includes("LOW_CONTRAST"));
});

test("render() surfaces warnings in its result", async () => {
  const els = box("b1", "b1t", 0, 0, 60, 40, "#a5d8ff",
    "text far too wide for this tiny box", 16).flat();
  const res = await render(els, { formats: ["excalidraw"] });
  assert.ok(Array.isArray(res.warnings));
  assert.ok(res.warnings.length > 0);
});

test("sugar-wrapped boxes stay clean through render()", async () => {
  // The sugar path wraps + grows; a reasonably-wide box should not warn.
  const res = await render(
    [{ shape: "rect", id: "n1", at: [0, 0], size: [200, 60], text: "Process the incoming request", fill: "blue" }],
    { formats: ["excalidraw"] }
  );
  assert.deepEqual(codes(res.warnings), []);
});
