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
