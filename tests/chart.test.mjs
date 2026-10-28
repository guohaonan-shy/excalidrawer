import { test } from "node:test";
import assert from "node:assert/strict";

import { render } from "../src/index.mjs";
import { quarterlyRevenue, dailyActiveUsers } from "../examples/chart-figures.mjs";

// The two chart figures are what the `chart` entry skill describes, as code: the
// shipped example has to stay lint-clean and the bars have to grow from the
// baseline upward (the thing a downward-only axis could not do).

const lint = async (els) => (await render(els, { formats: ["svg"] })).warnings ?? [];

test("chart figures: the bar and line examples pass Layer A with zero warnings", async () => {
  assert.deepEqual(await lint(quarterlyRevenue()), []);
  assert.deepEqual(await lint(dailyActiveUsers()), []);
});

test("bar chart: every bar stands on the baseline and is taller the larger its value", () => {
  const els = quarterlyRevenue();
  const bars = els.filter((e) => /^bar-/.test(e.id ?? ""));
  assert.equal(bars.length, 8);
  const baseline = bars[0].at[1] + bars[0].size[1];
  for (const b of bars) {
    assert.equal(b.at[1] + b.size[1], baseline, `${b.id} bottom is the baseline`);
    assert.ok(b.size[1] > 0 && b.at[1] < baseline, `${b.id} rises above it`);
  }
  // series 0: 12.4 14.8 17.1 21.6 — heights follow the values
  const heights = [0, 1, 2, 3].map((i) => bars.find((b) => b.id === `bar-0-${i}`).size[1]);
  assert.deepEqual([...heights].sort((a, b) => a - b), heights);
  assert.ok(Math.abs(heights[3] / heights[0] - 21.6 / 12.4) < 1e-6, "height is proportional to the value (axis starts at 0)");
});

test("bar chart: the grid lines are drawn before the bars", () => {
  const els = quarterlyRevenue();
  const lastGrid = Math.max(...els.map((e, i) => (/^grid-/.test(e.id ?? "") ? i : -1)));
  const firstBar = els.findIndex((e) => /^bar-/.test(e.id ?? ""));
  assert.ok(lastGrid >= 0 && lastGrid < firstBar);
});

test("line chart: the later value is higher on the page, and the value axis starts at a tick, not at 0", () => {
  const els = dailyActiveUsers();
  const line = els.find((e) => e.id === "line-1"); // Mobile 38 -> 88
  const ys = line.points.map(([, y]) => y);
  assert.deepEqual([...ys].sort((a, b) => b - a), ys, "y falls as the value rises");
  assert.ok(els.some((e) => e.text === "30"), "the lowest tick label is 30");
  assert.ok(!els.some((e) => e.text === "0"));
});
