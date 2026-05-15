import { test } from "node:test";
import assert from "node:assert/strict";

import { render } from "../src/render.mjs";

test("CJK auto: SVG font-family chain extends with CJK fallback names when CJK text is present", async () => {
  const result = await render(
    [{ shape: "rect", id: "a", at: [0, 0], size: [200, 60], text: "登录验证" }],
    { formats: ["svg"] }
  );
  assert.match(result.outputs.svg, /PingFang SC/);
  assert.match(result.outputs.svg, /Noto Sans CJK SC/);
});

test("CJK auto: PNG renders without throwing for CJK text", async () => {
  const result = await render(
    [{ shape: "rect", id: "a", at: [0, 0], size: [200, 60], text: "你好世界" }],
    { formats: ["png"], scale: 1 }
  );
  assert.ok(Buffer.isBuffer(result.outputs.png));
  assert.ok(result.outputs.png.length > 0);
});

test("CJK auto: Latin-only text doesn't add CJK fallback families", async () => {
  // Run AFTER a CJK test to verify the per-batch flag resets; module-level
  // `_hasCjkText` flips back to false for a Latin-only render.
  const result = await render(
    [{ shape: "rect", id: "a", at: [0, 0], size: [200, 60], text: "Hello World" }],
    { formats: ["svg"] }
  );
  assert.doesNotMatch(result.outputs.svg, /PingFang SC/);
});
