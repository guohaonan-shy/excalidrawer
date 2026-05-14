import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

import { toJsonSchema, parseArgs } from "../src/tools/schema.mjs";
import { ALL_TOOLS, getTool, CORE_TOOLS } from "../src/tools/index.mjs";

const el = (id, type = "rectangle") => ({ id, type, x: 0, y: 0, width: 10, height: 10 });

// --- schema ----------------------------------------------------------------

test("toJsonSchema: builds properties + required from params", () => {
  const schema = toJsonSchema({
    name: { type: "string", description: "d", required: true },
    count: { type: "number", description: "d", min: 1, max: 9 },
    mode: { type: "string", description: "d", enum: ["a", "b"] },
    items: { type: "array", description: "d", items: "string" },
  });
  assert.equal(schema.type, "object");
  assert.deepEqual(schema.required, ["name"]);
  assert.equal(schema.properties.count.minimum, 1);
  assert.equal(schema.properties.count.maximum, 9);
  assert.deepEqual(schema.properties.mode.enum, ["a", "b"]);
  assert.deepEqual(schema.properties.items.items, { type: "string" });
});

test("parseArgs: throws on missing required", () => {
  assert.throws(
    () => parseArgs({ x: { type: "string", description: "d", required: true } }, {}),
    /missing required argument: x/
  );
});

test("parseArgs: fills defaults", () => {
  const out = parseArgs({ scale: { type: "number", description: "d", default: 2 } }, {});
  assert.equal(out.scale, 2);
});

test("parseArgs: throws on type mismatch", () => {
  assert.throws(
    () => parseArgs({ n: { type: "number", description: "d" } }, { n: "x" }),
    /must be number/
  );
});

test("parseArgs: throws on enum violation", () => {
  assert.throws(
    () => parseArgs({ m: { type: "string", description: "d", enum: ["a"] } }, { m: "z" }),
    /must be one of: a/
  );
});

test("parseArgs: accepts arrays and objects", () => {
  const out = parseArgs(
    { arr: { type: "array", description: "d" }, obj: { type: "object", description: "d" } },
    { arr: [1], obj: { k: 1 } }
  );
  assert.deepEqual(out.arr, [1]);
  assert.deepEqual(out.obj, { k: 1 });
});

// --- registry --------------------------------------------------------------

test("registry: exposes render_diagram and compute_layout as core tools", () => {
  assert.deepEqual(CORE_TOOLS.map((t) => t.name).sort(), ["compute_layout", "render_diagram"]);
  assert.equal(getTool("render_diagram").name, "render_diagram");
  assert.equal(getTool("nope"), undefined);
});

test("registry: every tool has name, description, params, run", () => {
  for (const t of ALL_TOOLS) {
    assert.equal(typeof t.name, "string");
    assert.ok(t.description.length > 20);
    assert.equal(typeof t.params, "object");
    assert.equal(typeof t.run, "function");
  }
});

// --- render_diagram tool ---------------------------------------------------

test("render_diagram: writes files and returns paths", async () => {
  const out = join(tmpdir(), `excalidrawer-test-${Date.now()}`);
  const tool = getTool("render_diagram");
  const result = await tool.run({
    elements: [el("a"), el("b")],
    output: out,
    formats: ["excalidraw", "svg"],
  });
  assert.deepEqual(result.written, [`${out}.excalidraw`, `${out}.svg`]);
  assert.equal(result.elementCount, 2);
  assert.ok(existsSync(`${out}.excalidraw`));
  assert.match(readFileSync(`${out}.svg`, "utf-8"), /<svg/);
  rmSync(`${out}.excalidraw`);
  rmSync(`${out}.svg`);
});

test("render_diagram: returns structured error on bad elements", async () => {
  const tool = getTool("render_diagram");
  const result = await tool.run({
    elements: [{ type: "rectangle" }, el("ok")],
    output: join(tmpdir(), "should-not-write"),
  });
  assert.ok(result.error);
  assert.equal(result.issues.length, 1);
  assert.equal(result.written, undefined);
});

// --- compute_layout tool ---------------------------------------------------

test("compute_layout: dispatches gridLayout", () => {
  const tool = getTool("compute_layout");
  const result = tool.run({
    helper: "gridLayout",
    args: { count: 4, cols: 2, cellW: 100, cellH: 50 },
  });
  assert.equal(result.helper, "gridLayout");
  assert.equal(result.result.length, 4);
  assert.equal(result.result[0].w, 100);
});

test("compute_layout: dispatches edgePoint", () => {
  const tool = getTool("compute_layout");
  const result = tool.run({
    helper: "edgePoint",
    args: { target: { x: 0, y: 0, w: 100, h: 100, type: "rectangle" }, side: "right" },
  });
  assert.deepEqual(result.result, { x: 100, y: 50 });
});

test("compute_layout: unknown helper returns error", () => {
  const tool = getTool("compute_layout");
  const result = tool.run({ helper: "bogus", args: {} });
  assert.match(result.error, /unknown helper: bogus/);
});

test("compute_layout: helper throwing is caught as error", () => {
  const tool = getTool("compute_layout");
  const result = tool.run({ helper: "edgePoint", args: { target: { x: 0, y: 0, w: 10, h: 10 }, side: "diagonal" } });
  assert.ok(result.error);
});
