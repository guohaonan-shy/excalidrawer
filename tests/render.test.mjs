import { test } from "node:test";
import assert from "node:assert/strict";
import { inflateSync } from "node:zlib";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

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

// --- png + webp share one rasterization -------------------------------------

/** Decode an 8-bit RGBA PNG (what resvg writes) to raw RGBA bytes. */
function decodePng(buf) {
  assert.equal(buf[24], 8, "bit depth 8");
  assert.equal(buf[25], 6, "color type RGBA");
  const { w, h } = pngSize(buf);
  const idat = [];
  for (let p = 8; p < buf.length; ) {
    const len = buf.readUInt32BE(p);
    if (buf.toString("ascii", p + 4, p + 8) === "IDAT") idat.push(buf.subarray(p + 8, p + 8 + len));
    p += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * 4;
  const out = Buffer.alloc(stride * h);
  const paeth = (a, b, c) => {
    const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  for (let y = 0; y < h; y++) {
    const ft = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const v = raw[y * (stride + 1) + 1 + x];
      const a = x >= 4 ? out[y * stride + x - 4] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = x >= 4 && y > 0 ? out[(y - 1) * stride + x - 4] : 0;
      const pred = [0, a, b, (a + b) >> 1, paeth(a, b, c)][ft];
      out[y * stride + x] = (v + pred) & 0xff;
    }
  }
  return out;
}

/** Decode a WebP buffer to raw RGBA bytes with @jsquash/webp's decoder. */
async function decodeWebp(buf) {
  const require = createRequire(import.meta.url);
  const { default: decode, init } = await import("@jsquash/webp/decode.js");
  await init(await WebAssembly.compile(readFileSync(require.resolve("@jsquash/webp/codec/dec/webp_dec.wasm"))));
  const img = await decode(buf);
  return Buffer.from(img.data.buffer, img.data.byteOffset, img.data.byteLength);
}

test("render: png and webp requested together decode to byte-identical pixels", async () => {
  const { outputs } = await render([rectEl], { formats: ["png", "webp"], scale: 2 });
  const png = decodePng(outputs.png);
  const webp = await decodeWebp(outputs.webp);
  assert.equal(webp.length, png.length);
  assert.ok(webp.equals(png));
});

test("render: png + webp in one call rasterize the diagram exactly once", async () => {
  // The native rasterizer is the system boundary: count its render() calls.
  const { Resvg } = await import("@resvg/resvg-js");
  const original = Resvg.prototype.render;
  let calls = 0;
  Resvg.prototype.render = function (...args) {
    calls++;
    return original.apply(this, args);
  };
  try {
    await render([rectEl], { formats: ["png", "webp"] });
    assert.equal(calls, 1, "png + webp share one rasterization");
    calls = 0;
    await render([rectEl], { formats: ["webp"] });
    assert.equal(calls, 1, "webp alone rasterizes once");
  } finally {
    Resvg.prototype.render = original;
  }
});
