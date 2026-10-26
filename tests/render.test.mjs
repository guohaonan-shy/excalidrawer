import { test } from "node:test";
import assert from "node:assert/strict";

import { render, validateElements, ElementValidationError } from "../src/render.mjs";

const el = (id, type = "rectangle") => ({ id, type, x: 0, y: 0, width: 10, height: 10 });

test("validateElements: accepts a valid element array", () => {
  assert.deepEqual(validateElements([el("a"), el("b")]), []);
});

test("validateElements: rejects a non-array", () => {
  assert.deepEqual(validateElements("nope"), ["elements must be an array"]);
});

test("validateElements: rejects an empty array", () => {
  assert.deepEqual(validateElements([]), ["elements array is empty"]);
});

test("validateElements: flags missing id", () => {
  const issues = validateElements([{ type: "rectangle" }]);
  assert.equal(issues.length, 1);
  assert.match(issues[0], /element\[0\]: missing string "id"/);
});

test("validateElements: flags missing type", () => {
  const issues = validateElements([{ id: "a" }]);
  assert.equal(issues.length, 1);
  assert.match(issues[0], /missing string "type"/);
});

test("validateElements: flags duplicate id", () => {
  const issues = validateElements([el("dup"), el("dup")]);
  assert.equal(issues.length, 1);
  assert.match(issues[0], /duplicate id "dup"/);
});

test("validateElements: flags non-object element", () => {
  const issues = validateElements([el("a"), 42]);
  assert.equal(issues.length, 1);
  assert.match(issues[0], /element\[1\]: must be an object/);
});

test("render: produces excalidraw + svg for the requested formats", async () => {
  const { outputs, formats, elementCount } = await render([el("a"), el("b")], {
    formats: ["excalidraw", "svg"],
  });
  assert.deepEqual(formats, ["excalidraw", "svg"]);
  assert.equal(elementCount, 2);
  assert.equal(typeof outputs.excalidraw, "string");
  assert.equal(typeof outputs.svg, "string");
  assert.equal(outputs.png, undefined);
  assert.match(outputs.excalidraw, /"type": "excalidraw"/);
});

test("render: flattens nested element arrays", async () => {
  const { elementCount } = await render([[el("a")], [el("b"), el("c")]], {
    formats: ["excalidraw"],
  });
  assert.equal(elementCount, 3);
});

test("render: throws ElementValidationError with issues on bad input", async () => {
  await assert.rejects(
    () => render([{ type: "rectangle" }], { formats: ["svg"] }),
    (e) => {
      assert.ok(e instanceof ElementValidationError);
      assert.equal(e.issues.length, 1);
      return true;
    }
  );
});

test("render: throws on unknown format", async () => {
  await assert.rejects(
    () => render([el("a")], { formats: ["pdf"] }),
    /unknown format/
  );
});

test("render: produces a png buffer when requested", async () => {
  const { outputs } = await render([el("a")], { formats: ["png"], scale: 1 });
  assert.ok(Buffer.isBuffer(outputs.png));
  assert.ok(outputs.png.length > 0);
});

// --- webp ------------------------------------------------------------------

const rectEl = { id: "r", type: "rectangle", x: 10, y: 10, width: 120, height: 60 };

/** PNG width/height from the IHDR chunk. */
const pngSize = (buf) => ({ w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) });

/** Lossless WebP (RIFF > "VP8L") width/height: two 14-bit fields after the 0x2f signature. */
function webpLosslessSize(buf) {
  assert.equal(buf.toString("ascii", 12, 16), "VP8L");
  assert.equal(buf[20], 0x2f);
  const bits = buf.readUInt32LE(21);
  return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 };
}

test("render: webp is a Buffer with a RIFF/WEBP header and is the only format returned", async () => {
  const { outputs, formats } = await render([rectEl], { formats: ["webp"] });
  assert.deepEqual(formats, ["webp"]);
  assert.deepEqual(Object.keys(outputs), ["webp"]);
  assert.ok(Buffer.isBuffer(outputs.webp));
  assert.equal(outputs.webp.toString("ascii", 0, 4), "RIFF");
  assert.equal(outputs.webp.toString("ascii", 8, 12), "WEBP");
});

test("render: webp is lossless (VP8L chunk, not lossy VP8)", async () => {
  const { outputs } = await render([rectEl], { formats: ["webp"] });
  assert.equal(outputs.webp.toString("ascii", 12, 16), "VP8L");
});

test("render: webp and png at the same scale decode to the same dimensions", async () => {
  const { outputs } = await render([rectEl], { formats: ["png", "webp"], scale: 3 });
  const png = pngSize(outputs.png);
  const webp = webpLosslessSize(outputs.webp);
  assert.deepEqual(webp, png);
  // scale 3 really applied: 3x the scale-1 render
  const one = await render([rectEl], { formats: ["png"], scale: 1 });
  assert.equal(png.w, pngSize(one.outputs.png).w * 3);
});

test("render: with no formats given, returns exactly excalidraw, svg, png", async () => {
  const { formats, outputs } = await render([rectEl]);
  assert.deepEqual(formats, ["excalidraw", "svg", "png"]);
  assert.deepEqual(Object.keys(outputs), ["excalidraw", "svg", "png"]);
});

test("render: unknown-format error lists webp among the valid formats", async () => {
  await assert.rejects(
    () => render([rectEl], { formats: ["pdf"] }),
    (e) => /unknown format/.test(e.message) && /webp/.test(e.message)
  );
});

test("package entry exports toWebp alongside toPng", async () => {
  const mod = await import("../src/index.mjs");
  assert.equal(typeof mod.toPng, "function");
  assert.equal(typeof mod.toWebp, "function");
  const buf = await mod.toWebp([{ id: "r", type: "rectangle", x: 0, y: 0, width: 20, height: 20 }], 1);
  assert.equal(buf.toString("ascii", 8, 12), "WEBP");
});
