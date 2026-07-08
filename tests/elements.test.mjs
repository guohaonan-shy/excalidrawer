import { test } from "node:test";
import assert from "node:assert/strict";

import { box, diamondBox } from "../src/elements.mjs";
import { validate } from "../src/validate.mjs";

// box()/diamondBox() are correct by construction: a long (breakable) label is
// wrapped to the inner width and the box grows in height to contain it, so it
// never overflows and never trips the linter.

test("box() wraps a long label and grows height (no overflow warning)", () => {
  const [rectEl, textEl] = box("b1", "b1t", 0, 0, 160, 50, "#a5d8ff",
    "A fairly long label that would overflow a fixed box", 16);
  // grew taller than the requested 50 to fit the wrapped lines
  assert.ok(rectEl.height > 50, `expected growth, got ${rectEl.height}`);
  // rect and text stay the same height (text is vertically centered in it)
  assert.equal(rectEl.height, textEl.height);
  // wrapping inserted line breaks
  assert.ok(textEl.text.includes("\n"));
  assert.deepEqual(validate([rectEl, textEl]), []);
});

test("box() leaves a short label in a roomy box untouched", () => {
  const [rectEl, textEl] = box("b1", "b1t", 0, 0, 240, 60, "#a5d8ff", "OK", 16);
  assert.equal(rectEl.height, 60); // no growth
  assert.equal(textEl.text, "OK"); // no wrapping
  assert.deepEqual(validate([rectEl, textEl]), []);
});

test("diamondBox() wraps + grows the same way", () => {
  const [dia, textEl] = diamondBox("d1", "d1t", 0, 0, 140, 50, "#ffd43b",
    "Is the incoming request valid and authorized?", 14);
  assert.ok(dia.height > 50);
  assert.equal(dia.height, textEl.height);
  assert.deepEqual(validate([dia, textEl]), []);
});

test("box() height growth is deterministic (same input → same height)", () => {
  const a = box("b1", "b1t", 0, 0, 120, 40, "#a5d8ff", "repeatable growth check here", 16);
  const b = box("b2", "b2t", 0, 0, 120, 40, "#a5d8ff", "repeatable growth check here", 16);
  assert.equal(a[0].height, b[0].height);
});
