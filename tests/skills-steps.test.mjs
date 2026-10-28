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

// --- ticket 08: wording the entry skills and steps share --------------------------

const entryText = (t) => read(join(SKILLS, t, "SKILL.md"));
const stepsText = () => read(join(STEPS, "SKILL.md"));
const sectionOf = (body, name) => {
  const m = body.match(new RegExp(`^## ${name}\\s*$[\\s\\S]*?(?=^## |(?![\\s\\S]))`, "m"));
  assert.ok(m, `section not found: ${name}`);
  return m[0];
};

test("the diagram title size appears (as 标题字号) only in the steps semantics reference, across all of skills/", () => {
  const hits = markdownFiles(SKILLS).filter((f) => /标题字号/.test(read(f))).map((f) => relative(SKILLS, f));
  assert.deepEqual(hits, ["steps/references/semantics.md"]);
});

test("no skill file outside the semantics reference restates the diagram title's size or position as a number", () => {
  // catches "标题 y = 30，字号 28", "标题字号 28" and the like; the sub-title (副标题) is a separate value
  const restated = /(?<!副)标题[^\n]{0,20}(?:字号\s*\d|\b28\b|\by\s*=\s*\d)/;
  const hits = [];
  for (const f of markdownFiles(SKILLS)) {
    const rel = relative(SKILLS, f);
    if (rel === "steps/references/semantics.md") continue;
    read(f).split("\n").forEach((l, i) => { if (restated.test(l)) hits.push(`${rel}:${i + 1}`); });
  }
  assert.deepEqual(hits, []);
});

test("every place an entry skill calls steps says the step reads only that section", () => {
  const missing = [];
  for (const t of ENTRY_SKILLS) {
    entryText(t).split("\n").forEach((l, i) => {
      if (l.includes("调 skill `steps`") && !l.includes("这一步只读这一节")) missing.push(`${t}/SKILL.md:${i + 1}`);
    });
  }
  assert.deepEqual(missing, []);
});

test("skipping the questions is one rule: a description that already lists everything means no asking and no reading of the asking rules", () => {
  const skip = "用户的描述已经能列全这张图的全部内容";
  const noRead = "也不去读提问规则";
  const clarify = sectionOf(stepsText(), "clarify");
  assert.ok(clarify.includes(skip) && clarify.includes(noRead), "steps clarify lacks the skip rule");
  assert.ok(!/complete structured spec/.test(clarify), "steps clarify still demands a structured spec");
  for (const t of ENTRY_SKILLS) {
    const body = entryText(t);
    assert.ok(body.includes(skip) && body.includes(noRead), `${t}/SKILL.md lacks the skip rule`);
    assert.ok(!/必须是结构化|完整的节点和连线时，这一步跳过/.test(body), `${t}/SKILL.md still uses the old skip condition`);
  }
});

test("export format is one rule: decide from the conversation, ask one short question only when it cannot be read", () => {
  const rule = "读不出来才在出图时问一句";
  for (const t of ENTRY_SKILLS) assert.ok(entryText(t).includes(rule), `${t}/SKILL.md lacks the export-format rule`);
  const out = sectionOf(stepsText(), "出图");
  assert.ok(out.includes(rule), "steps 出图 lacks the export-format rule");
});

test("steps 出图 CLI part states the compute-layout output shape and how to pass -f", () => {
  const out = sectionOf(stepsText(), "出图");
  assert.match(out, /compute-layout[^\n]*\.result/, "must say the CLI prints the object without MCP's .result wrapper");
  assert.match(out, /-f png\b/, "must show -f png for PNG only");
  assert.match(out, /-f png,excalidraw/, "must show -f with several formats");
});

test("the steps section table gives the line range of each section, and the ranges are right", () => {
  const lines = stepsText().split("\n");
  const heads = [];
  lines.forEach((l, i) => { if (/^## /.test(l)) heads.push({ name: l.slice(3).trim(), start: i + 1 }); });
  heads.forEach((h, k) => { h.end = k + 1 < heads.length ? heads[k + 1].start - 1 : lines.length; });
  // trailing blank line(s) at EOF do not belong to a section
  while (lines[heads.at(-1).end - 1] === "") heads.at(-1).end--;
  // a blank line right before the next heading does not belong to the section either
  for (const h of heads) while (lines[h.end - 1] === "") h.end--;
  for (const h of heads) {
    const row = lines.find((l) => l.startsWith("| [") && l.includes(`(#${h.name})`));
    assert.ok(row, `section table lacks a row for ${h.name}`);
    assert.ok(row.includes(`行 ${h.start}–${h.end}`), `section table: ${h.name} should say 行 ${h.start}–${h.end}`);
  }
});

test("examples/comparison-figures.mjs no longer points at the deleted comparison recipe", () => {
  const head = read(join(ROOT, "examples", "comparison-figures.mjs")).split("\n").slice(0, 25).join("\n");
  assert.ok(!/references\/comparison\.md/.test(head));
  assert.ok(/skills\/steps\/references\/panel\.md/.test(head));
});

test("CLAUDE.md and README.md describe the two layers: no skills/shared, no per-type recipe files", () => {
  for (const f of ["CLAUDE.md", "README.md"]) {
    read(join(ROOT, f)).split("\n").forEach((l, i) => {
      assert.ok(!/skills\/shared/.test(l), `${f}:${i + 1} mentions skills/shared`);
      assert.ok(!/references\/<type>\.md/.test(l), `${f}:${i + 1} mentions references/<type>.md`);
      assert.ok(!/\brecipe/i.test(l), `${f}:${i + 1} still says recipe: ${l.trim().slice(0, 60)}`);
    });
  }
});

test("CHANGELOG.md: this change is recorded under Unreleased only", () => {
  const text = read(join(ROOT, "CHANGELOG.md"));
  const unreleased = text.split(/^## /m).find((s) => s.startsWith("Unreleased"));
  assert.ok(unreleased, "no Unreleased section");
  assert.match(unreleased, /steps/);
  assert.match(unreleased, /entry skill/i);
  assert.ok(!/skills\/shared/.test(unreleased), "Unreleased still points at skills/shared");
});
