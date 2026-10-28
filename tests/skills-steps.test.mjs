import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { HELPERS } from "../src/tools/compute-layout.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS = join(ROOT, "skills");
const STEPS = join(SKILLS, "steps");
const REFS = join(STEPS, "references");
const ENTRY_SKILLS = ["flowchart", "timeline", "architecture", "sequence", "comparison", "tree"];

const read = (p) => readFileSync(p, "utf8");
const refFiles = () => readdirSync(REFS).filter((f) => f.endsWith(".md"));

const CALL_STEPS =
  "调 skill `steps`（Claude Code 用 Skill 工具调 `excalidrawer:steps`；其他宿主读 `../steps/SKILL.md`），看它的『组件』。";

/** Every tracked-looking markdown file outside node_modules / .git. */
function markdownFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".git" || name === ".tmp") continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) markdownFiles(p, out);
    else if (name.endsWith(".md")) out.push(p);
  }
  return out;
}

// --- rename ------------------------------------------------------------------

test("the base skill is called steps: skills/shared is gone", () => {
  assert.equal(existsSync(join(SKILLS, "shared")), false, "skills/shared must not exist");
  assert.ok(existsSync(join(STEPS, "SKILL.md")), "skills/steps/SKILL.md must exist");
  const fm = read(join(STEPS, "SKILL.md")).split("---")[1];
  assert.match(fm, /^name: steps$/m);
});

test("steps SKILL.md has the four named sections entry skills point at", () => {
  const body = read(join(STEPS, "SKILL.md"));
  for (const h of ["clarify", "组件", "出图", "新增一种图类型"]) {
    assert.match(body, new RegExp(`^## ${h}\\s*$`, "m"), `missing section: ${h}`);
  }
});

// --- component references ------------------------------------------------------

test("steps 组件 table lists every reference file, and each listed file exists", () => {
  const body = read(join(STEPS, "SKILL.md"));
  const listed = [...body.matchAll(/\]\(references\/([\w-]+\.md)\)/g)].map((m) => m[1]);
  assert.ok(listed.length > 0, "no reference links found");
  for (const f of listed) assert.ok(existsSync(join(REFS, f)), `listed but missing: ${f}`);
  for (const f of refFiles()) assert.ok(listed.includes(f), `reference not listed in the table: ${f}`);
});

test("sugar.md is gone: the field notes live in per-component references", () => {
  assert.equal(existsSync(join(REFS, "sugar.md")), false);
  for (const f of ["semantics", "shapes", "connectors", "stack", "panel", "axis", "legend", "tree", "classic-layouts"]) {
    assert.ok(existsSync(join(REFS, `${f}.md`)), `missing reference: ${f}.md`);
  }
});

test("every compute_layout helper is documented in some steps reference", () => {
  const all = refFiles().map((f) => read(join(REFS, f))).join("\n");
  for (const h of HELPERS) {
    assert.ok(new RegExp("\\b" + h + "\\b").test(all), `helper not documented in steps references: ${h}`);
  }
});

test("the diagram title size is written once, in the semantics reference, and is 28", () => {
  const hits = refFiles().filter((f) => /标题字号/.test(read(join(REFS, f))));
  assert.deepEqual(hits, ["semantics.md"]);
  const sem = read(join(REFS, "semantics.md"));
  assert.equal([...sem.matchAll(/标题字号[^\n]*/g)].length, 1);
  assert.match(sem.match(/标题字号[^\n]*/)[0], /28/);
});

// --- entry skills point at steps --------------------------------------------------

test("every entry skill opens with the unified steps call", () => {
  for (const t of ENTRY_SKILLS) {
    const body = read(join(SKILLS, t, "SKILL.md"));
    assert.ok(body.includes(CALL_STEPS), `${t}/SKILL.md lacks the unified steps call`);
  }
});

// --- no dangling shared ---------------------------------------------------------

test("no skills/ file, CLAUDE.md or README.md points at the old shared skill", () => {
  const files = [...markdownFiles(SKILLS), join(ROOT, "CLAUDE.md"), join(ROOT, "README.md")];
  for (const f of files) {
    const lines = read(f).split("\n");
    lines.forEach((l, i) => {
      assert.ok(!/shared\//.test(l), `${relative(ROOT, f)}:${i + 1} still mentions shared/`);
    });
  }
});

test("markdown relative links that point into skills/ resolve to existing files", () => {
  const broken = [];
  for (const f of markdownFiles(ROOT)) {
    const text = read(f);
    for (const m of text.matchAll(/\]\(([^)\s]+)\)/g)) {
      let target = m[1].split("#")[0];
      if (!target || /^[a-z]+:/i.test(target) || target.startsWith("/")) continue;
      const abs = resolve(dirname(f), target);
      const into = abs === SKILLS || abs.startsWith(SKILLS + "/");
      const fromSkills = f.startsWith(SKILLS + "/");
      if (!into && !fromSkills) continue;
      if (!existsSync(abs)) broken.push(`${relative(ROOT, f)} -> ${m[1]}`);
    }
  }
  assert.deepEqual(broken, []);
});
