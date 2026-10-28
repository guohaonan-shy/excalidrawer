import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Guard for the entry-skill convention (docs/spec/skill-layers): an entry skill
// (`skills/<type>/SKILL.md`, everything under skills/ except `steps/`) is written
// in natural language only. Its body (after the frontmatter) must not carry
// geometry, tool names, sugar fields or code blocks - those belong to the step
// skill `steps`. Component names (stack, panel, axis, ...) and counts about the
// content ("1-8 children") are allowed.

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS = join(ROOT, "skills");

const TOOL_NAMES = ["render_diagram", "compute_layout", "compute-layout"];

// Sugar fields / helper identifiers that are unmistakably code, banned anywhere.
const SUGAR_FIELDS = [
  "fromSide", "toSide", "arrowType", "fromT", "toT", "labelT",
  "startArrowhead", "endArrowhead", "strokeStyle", "strokeWidth",
  "fontSize", "textColor", "titleFontSize", "bodyFontSize",
  "titledBox", "fitContainer", "edgePoint", "routeU", "labelAnchor",
  "gridLayout", "hubSpoke",
];

// Field names that are also ordinary words: banned only in a code-looking form
// (`word` in backticks, `word:` or `word=` followed by a value).
const GENERIC_FIELDS = [
  "via", "dashed", "gap", "pad", "align", "justify", "cross", "maxW",
  "size", "fill", "stroke", "at", "from", "to", "edges", "clearance", "shape",
];

const wordRe = (names) => new RegExp(`\\b(${names.join("|")})\\b`);
const RULES = [
  { re: new RegExp(`(${TOOL_NAMES.join("|")})`), name: (m) => m[1] },
  { re: wordRe(SUGAR_FIELDS), name: (m) => m[1] },
  {
    re: new RegExp(`\`(${GENERIC_FIELDS.join("|")})\`|\\b(${GENERIC_FIELDS.join("|")})\\s*[:=]\\s*[\\["'\\d-]`),
    name: (m) => m[1] || m[2],
  },
  { re: /\d+(\.\d+)?\s*px\b/i, name: (m) => m[0] },
  // x = 150, y ≈ 290
  { re: /\b[xy]\s*(=|≈|~)\s*-?\d+/, name: (m) => m[0] },
];

/**
 * Scan the text of one entry skill. Returns [{ line, word }] with 1-based line
 * numbers of the whole file (frontmatter lines count, they are just not scanned).
 */
export function scanEntrySkill(text) {
  const lines = text.split("\n");
  let i = 0;
  if (lines[0] === "---") {
    i = 1;
    while (i < lines.length && lines[i] !== "---") i++;
    i++; // past the closing ---
  }
  const findings = [];
  let fence = null; // info string of the open fenced block
  for (; i < lines.length; i++) {
    const line = lines[i];
    const f = line.match(/^\s*```(.*)$/);
    if (f) {
      if (fence === null) {
        fence = f[1].trim();
        if (fence !== "text") findings.push({ line: i + 1, word: "代码块 ```" + fence });
      } else {
        fence = null;
      }
      continue;
    }
    for (const rule of RULES) {
      const m = line.match(rule.re);
      if (m) findings.push({ line: i + 1, word: rule.name(m) });
    }
  }
  return findings;
}

/** Entry skills = every directory under skillsDir except `steps`. */
export function entrySkillDirs(skillsDir) {
  return readdirSync(skillsDir)
    .filter((n) => n !== "steps" && statSync(join(skillsDir, n)).isDirectory())
    .sort();
}

/** Scan every entry skill under skillsDir. Returns ["<type>/SKILL.md:<line>: <word>"]. */
export function scanSkillsDir(skillsDir) {
  const out = [];
  for (const name of entrySkillDirs(skillsDir)) {
    const text = readFileSync(join(skillsDir, name, "SKILL.md"), "utf8");
    for (const f of scanEntrySkill(text)) out.push(`${name}/SKILL.md:${f.line}: ${f.word}`);
  }
  return out;
}

const fm = "---\nname: x\ndescription: d render_diagram 12px\nallowed-tools: mcp__excalidrawer__render_diagram\n---\n";

// --- the scanner itself ---------------------------------------------------------

test("scanner flags coordinates, px numbers, tool names, sugar fields and code blocks, with line numbers", () => {
  const body = [
    "# t",                              // 6
    "",                                 // 7
    "主线放在 y = 150 的位置。",         // 8
    "分支行 y ≈ 290。",                 // 9
    "宽度 150px。",                     // 10
    "调 `render_diagram` 出图。",       // 11
    "回边用 fromSide 指定。",           // 12
    "```js",                            // 13
    "const a = 1;",                     // 14
    "```",                              // 15
    "连线写成 `via`。",                 // 16
    "arrowType: \"elbow\"",             // 17
  ].join("\n");
  const found = scanEntrySkill(fm + body).map((f) => `${f.line}:${f.word}`);
  assert.deepEqual(found, [
    "8:y = 150",
    "9:y ≈ 290",
    "10:150px",
    "11:render_diagram",
    "12:fromSide",
    "13:代码块 ```js",
    "16:via",
    "17:arrowType",
  ]);
});

test("scanner lets frontmatter, text blocks, component names and content counts through", () => {
  const body = [
    "# t",
    "主线是一排 stack，层是 panel，轴是 axis，另有 legend 和 tree。",
    "每个父节点 1–8 个孩子最好看；叶子平均超过 15 个字推荐左右分裂；颜色不超过四种。",
    "节点带说明（比如 `ui · visual · ux` 这样的小字）时用灰色。",
    "从 A 到 B，from 这一步到下一步。",
    "```text",
    "[ Start ] → [ Process ]",
    "```",
  ].join("\n");
  assert.deepEqual(scanEntrySkill(fm + body), []);
});

test("scanner works on a skills directory: reports file and line, skips steps/", () => {
  const dir = mkdtempSync(join(tmpdir(), "skills-scan-"));
  try {
    const real = readFileSync(join(SKILLS, "flowchart", "SKILL.md"), "utf8");
    mkdirSync(join(dir, "flowchart"));
    writeFileSync(join(dir, "flowchart", "SKILL.md"), real.trimEnd() + "\n\n主线 y = 150\n");
    mkdirSync(join(dir, "steps"));
    writeFileSync(join(dir, "steps", "SKILL.md"), "---\nname: steps\n---\ny = 150, render_diagram, 40px\n```js\n```\n");
    const lastLine = real.trimEnd().split("\n").length + 2;
    assert.deepEqual(scanSkillsDir(dir), [`flowchart/SKILL.md:${lastLine}: y = 150`]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- the real entry skills ------------------------------------------------------

test("the six entry skills are the directories next to steps, and each holds only SKILL.md", () => {
  assert.deepEqual(entrySkillDirs(SKILLS), ["architecture", "comparison", "flowchart", "sequence", "timeline", "tree"]);
  for (const name of entrySkillDirs(SKILLS)) {
    assert.deepEqual(readdirSync(join(SKILLS, name)), ["SKILL.md"], `${name}/ must only hold SKILL.md`);
  }
});

test("entry skills carry no geometry, tool names, sugar fields or code blocks", () => {
  assert.deepEqual(scanSkillsDir(SKILLS), []);
});
