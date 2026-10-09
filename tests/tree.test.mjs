import { test } from "node:test";
import assert from "node:assert/strict";
import { treeLayout, tree, validate, wrapText } from "../src/index.mjs";
import { getTool } from "../src/tools/index.mjs";

const sample = {
  label: "Root",
  children: [
    { label: "A", children: ["a1", "a2", "a3"] },
    { label: "B", children: ["b1"] },
    "C",
  ],
};

const overlaps = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

for (const direction of ["right", "down"]) {
  test(`tree (${direction}): parent centered on its children, no two boxes overlap`, () => {
    const t = treeLayout(sample, { direction });
    const byId = new Map(t.nodes.map((n) => [n.id, n]));
    const axis = direction === "right" ? "cy" : "cx";
    for (const n of t.nodes) {
      const kids = t.nodes.filter((k) => k.parent === n.id);
      if (!kids.length) continue;
      const mid = (kids[0][axis] + kids[kids.length - 1][axis]) / 2;
      assert.ok(Math.abs(n[axis] - mid) < 0.01, `${n.id} centered`);
    }
    for (let i = 0; i < t.nodes.length; i++) {
      for (let j = i + 1; j < t.nodes.length; j++) {
        assert.ok(!overlaps(t.nodes[i], t.nodes[j]), `${t.nodes[i].id} vs ${t.nodes[j].id}`);
      }
    }
    assert.equal(byId.get("n-0-0").label, "a1");
  });

  test(`tree (${direction}): one branch per child, every connector axis-aligned`, () => {
    const t = treeLayout(sample, { direction });
    const branches = t.segments.filter((s) => s.kind === "branch");
    assert.equal(branches.length, t.nodes.length - 1);
    for (const s of t.segments) {
      const [dx, dy] = s.points[1];
      assert.ok(dx === 0 || dy === 0, `${s.kind} of ${s.parent} is orthogonal`);
    }
  });

  test(`tree template (${direction}) renders lint-clean`, () => {
    const els = tree({ title: "T", direction: direction === "right" ? "horizontal" : "vertical", root: sample, levels: ["L0", "L1", "L2"] });
    assert.deepEqual(validate(els), []);
  });
}

test("tree: leaves stay in input order along the breadth axis", () => {
  const t = treeLayout(sample, { direction: "right" });
  const leaves = t.nodes.filter((n) => n.leaf).map((n) => n.y);
  assert.deepEqual(leaves, [...leaves].sort((a, b) => a - b));
});

test("tree: a parent taller than its children pushes the band out, not into a neighbour", () => {
  const t = treeLayout(
    { label: "R", children: [{ label: "big\nbig\nbig\nbig\nbig\nbig", children: ["x"] }, { label: "n", children: ["y"] }] },
    { direction: "right", equalize: "none" }
  );
  const [, big, x, n] = t.nodes;
  assert.ok(Math.abs(big.cy - x.cy) < 0.01);
  assert.ok(n.y >= big.y + big.h);
});

test("tree: equalize depth levels every node in a row", () => {
  const t = treeLayout(
    { label: "R", children: ["short", "a much longer label that has to wrap onto more lines"] },
    { direction: "down", widths: 140 }
  );
  const [, a, b] = t.nodes;
  assert.equal(a.h, b.h);
});

test("tree: desc nodes get a titled layout with wrapped text", () => {
  const t = treeLayout({ label: "R", desc: "sub · line" }, {});
  assert.equal(t.nodes[0].titled.title.text, "R");
  assert.equal(t.nodes[0].titled.body.text, "sub · line");
});

test("tree: bad input throws a readable error", () => {
  assert.throws(() => treeLayout(null), /root/);
  assert.throws(() => treeLayout(sample, { direction: "sideways" }), /direction/);
  assert.throws(() => treeLayout({ label: "R", children: [{ id: "x", label: "1" }, { id: "x", label: "2" }] }), /duplicate/);
});

test("tree template: numberLeaves prefixes leaves in reading order", () => {
  const els = tree({ root: sample, numberLeaves: true });
  const texts = els.filter((e) => e.type === "text" && e.containerId).map((e) => e.text.replace(/\n/g, ""));
  assert.ok(texts.includes("1. a1"));
  assert.ok(texts.includes("4. b1"));
  assert.ok(texts.includes("5. C"));
});

test("tree template: connectors are lines; arrowheads turns branches into arrows", () => {
  const plain = tree({ root: sample }).filter((e) => e.id.startsWith("tree-e"));
  assert.ok(plain.length > 0 && plain.every((e) => e.type === "line"));

  const headed = tree({ root: sample, arrowheads: true }).filter((e) => e.id.startsWith("tree-e"));
  assert.ok(headed.some((e) => e.type === "arrow" && e.endArrowhead === "arrow"));
  assert.ok(headed.some((e) => e.type === "line")); // stems and spines stay plain
});

test("compute_layout exposes the tree helper", async () => {
  const out = await getTool("compute_layout").run({ helper: "tree", args: { root: sample, direction: "down" } });
  assert.equal(out.helper, "tree");
  assert.equal(out.result.nodes.length, 8);
});

test("wrapText: CJK closing punctuation never starts a line", () => {
  const wrapped = wrapText("作为学生我想要立刻播放，以便对比。", 11 * 15, 15);
  for (const line of wrapped.split("\n")) assert.ok(!/^[，。]/.test(line), line);
});
