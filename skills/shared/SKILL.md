---
name: shared
description: Shared base for the excalidrawer diagram skills (flowchart / timeline / architecture / sequence). Holds the cross-cutting conventions every type skill depends on — MCP precheck + CLI fallback, sugar schema reference, color palette, output file naming, label language, export format selection, and iteration rules. The type skills declare "前置条件：先 Read ../shared/SKILL.md" and rely on this. Not a standalone drawing skill — read it first, then follow the type-specific recipe. 通用约定 / 基座 / sugar / 配色 / 命名 / 导出格式。
allowed-tools: mcp__excalidrawer__render_diagram, mcp__excalidrawer__compute_layout, Bash(npx -y -p excalidrawer*:*), Read, Write(./*.json), AskUserQuestion
---

# excalidrawer shared base

Cross-cutting rules for every diagram type. The type skills
(`flowchart` / `timeline` / `architecture` / `sequence`)
**MUST read this file first** before composing elements. This file is the
single source of truth for the common machinery; the type skills add only
their own clarify questions and layout recipe on top.

## 0. The render loop (shared by all types)

```text
detect type → clarify (AskUserQuestion) → read the type recipe → compose sugar
            → render_diagram → resolve any warnings (§7.5) → give the user the paths → iterate
```

Each type skill owns steps "clarify" and "read recipe + compose"; everything
else (MCP setup, naming, formats, language, iteration) is defined here.

## 1. MCP-first, CLI fallback

Primary path: the **`excalidrawer` MCP server** (`excalidrawer-mcp`, added via
`claude mcp add excalidrawer -- excalidrawer-mcp`). Confirm both tools are
visible before drawing:

- `mcp__excalidrawer__render_diagram(elements, output, formats?, scale?)`
  — translates sugar to raw, validates, writes files. `output` is the path
  **without** extension; one file per requested format is written alongside.
- `mcp__excalidrawer__compute_layout(helper, args)` — pure geometry. Returns
  coordinates only; no elements are emitted. Use for grid/chain/swimlane/etc.

If the MCP tools aren't available (server failed to start, older host,
sandboxed env), fall back to the CLI shipped by the same package:

```bash
npx -y -p excalidrawer@^0.5.11 -c 'excalidrawer render -i elements.json -o ./flowchart-foo'
npx -y -p excalidrawer@^0.5.11 -c "excalidrawer compute-layout --helper gridLayout -a '{...}'"
```

`elements.json` accepts either a bare sugar array or `{ "elements": [...] }`.

## 2. Sugar schema

The element shorthand every recipe composes — shapes, the L1–L4 arrow levels,
auto-routing rules, and the `compute_layout` helpers — lives in
[`references/sugar.md`](references/sugar.md). Read it before composing if you
are unsure of a field. Render order: background rects → arrows → boxes/text
(arrows always render after shapes, so push lifelines/axes as segments where
overlap matters — see the timeline/sequence recipes).

## 3. Colors

The 7-color hand-drawn palette and the per-type color conventions live in
[`references/colors.md`](references/colors.md).

## 4. Clarify before drawing

Always run **AskUserQuestion** (≤ 3 questions per round) before composing,
unless the user already pasted a complete structured spec (full nodes/edges,
ready actor list, milestone list, tiers + services).

- **AskUserQuestion fits**: discrete choice, 2–4 short options, single select
  ("horizontal vs vertical", "include connections? yes / no", "axis style").
- **Natural-language prompt fits**: free-form lists, long descriptions, file
  paths, or > 4 options. Keep an "Other / 自定义" escape so the user can override.

Don't ask anything derivable from the request itself. The **last** clarify
question is always the export format / use case (see §6). The type skill lists
the type-specific questions to ask.

## 5. Output naming (gstack style) + language

Diagrams write to the user's current working directory with semantic file
names — never `outputs/<timestamp>/` subfolders.

| type | filename |
|---|---|
| flowchart | `./flowchart-<name>.{excalidraw,svg,png}` |
| timeline | `./timeline-<name>.{excalidraw,svg,png}` |
| architecture | `./architecture-<name>.{excalidraw,svg,png}` |
| sequence | `./sequence-<name>.{excalidraw,svg,png}` |
| freeform | `./diagram-<name>.{excalidraw,svg,png}` |

`<name>` is a short kebab-case derived from the request (e.g. `login-flow`,
`product-roadmap-2026`). If that file already exists, ask before overwriting
unless the user explicitly said "覆盖" / "overwrite".

**Diagram labels default to English** for visual consistency — Excalifont (the
hand-drawn body font) is Latin-only, so all-English labels render uniformly.
CJK / non-Latin text triggers a system font fallback (PingFang on macOS, Noto
on Linux, Microsoft YaHei on Windows), which renders correctly but visually
mixes hand-drawn Latin with flat CJK glyphs. Honor an explicit request for
another language ("用中文" / "in Chinese"). The skill's own clarifying prompts
and progress messages follow the user's conversation language — separate from
diagram labels.

## 6. Export format selection

Ask this as the **final clarify question** — the answer drives the `formats`
argument to `render_diagram`. The `.excalidraw` file is always included
(editable source, a few KB); the toggle is mostly whether to render PNG
(slowest, ~1 s) and / or SVG.

AskUserQuestion (single-select, header: `Format` / `用途`):

| Option | `formats` | notes |
|---|---|---|
| `Markdown / GitHub` | `["excalidraw", "svg"]` | SVG inlines well in `.md` |
| `Notion / 飞书 / slides / docs` | `["excalidraw", "png"]` | PNG pastes everywhere |
| `打印 / 高清演示` | `["excalidraw", "png"]` + `scale: 3` | retina-quality export |
| `都要 / 不确定`(default) | `["excalidraw", "svg", "png"]` | covers all uses |

If the user already stated the target in the request ("画一个流程图贴 Notion"),
skip the question and infer.

## 7. Render call

```text
mcp__excalidrawer__render_diagram({
  elements: <sugar 数组>,
  output: "./<type>-<name>",   // no extension; gstack naming (§5)
  formats: <per §6>,
  scale: <3 for hi-res presentation; omit otherwise>
})
```

- success: `{ written: [...paths], elementCount: N, warnings? }` — tell the user
  the paths. `.svg` for Markdown / GitHub, `.png` for Notion / 飞书 / slides,
  `.excalidraw` for further editing.
- failure: `{ error, issues: [...] }` — fix the sugar by issue index and retry;
  no files are written on failure.

## 7.5 Quality gate — two layers, and a diagram is done only when BOTH pass

A diagram is **not finished** until it clears both gates below. Layer A is a
deterministic code lint (free, exact, always runs). Layer B is a visual pass you
perform with your own vision on the PNG (catches what geometry can't). Never
report paths to the user while either gate is failing, and never ask the user to
accept a defect — they are all fixable.

### Layer A — deterministic lint (always)

`render_diagram` runs a geometry lint on every success and returns a `warnings`
array **only when something is wrong** (files are still written — warnings are
non-fatal). **A non-empty `warnings` means NOT done: fix the flagged elements and
re-render until `warnings` is absent.**

Each warning is `{ code, ids, message }`; `ids` names the offending element(s),
`message` states the fix:

| code | meaning | fix |
|---|---|---|
| `TEXT_OVERFLOW_X` | a label is wider than its box → spills past the border (looks "off-center") | widen the box `size` to the suggested px, lower `fontSize`, or insert `\n` breaks |
| `TEXT_OVERFLOW_Y` | multi-line text is taller than a fixed box | grow the box height |
| `SHAPE_OVERLAP` | two shapes partially overlap (not clean nesting) | move one, add a gap, or nest one fully inside the other |
| `ARROW_CROSSES_SHAPE` | a connector runs through a module it doesn't connect | reroute with `via` / `fromSide` / `toSide`, or move the module out of the path |
| `LOW_CONTRAST` | label vs fill contrast below 3:1 → unreadable | pick a darker/lighter label color or change the fill (`contrastText()` gives a safe one) |
| `DEGENERATE_ARROW` | an arrow has < 2 real points / start ≈ end → renders as nothing | give it real endpoints (prefer id-anchored `from`/`to` arrows) |

Most `TEXT_OVERFLOW_X` comes from hand-written boxes too narrow for their label —
the sugar path auto-wraps and grows height, so composing via sugar avoids most
warnings by construction. Layer A is the safety net for what still slips through.

### Layer B — visual self-check (required for user-facing diagrams)

The lint proves geometry; only your eyes catch composition. **After Layer A is
clean, `Read` the exported `.png` and score it against this rubric — one explicit
PASS/FAIL per line:**

1. **Labels** — every label sits centered and fully inside its shape; none clipped or touching a border.
2. **Arrows** — each connects the correct two nodes, points the right way, and no line visually plows through an unrelated box or another line.
3. **Spacing** — rows/columns are aligned; gaps are even; nothing is cramped or lost in whitespace.
4. **Canvas** — nothing is cut off at the edges; the diagram is balanced, not crowded to one side.
5. **Readability** — colors are distinguishable and every label is legible against its fill.

If any line is FAIL, fix the elements and re-render, then re-check — **loop until
all five PASS.** Report done only after that. Skip Layer B only for quick,
throwaway diagrams the user won't publish (say so when you skip it).

> Layer B runs at the skill/agent layer, using the vision of the model running
> this skill — the `excalidrawer` package stays deterministic and offline (no LLM
> dependency). Keep it that way: don't push visual judgment into the tool.

## 8. Iteration

Re-render with the **same output filename** unless the user wants both versions
kept — sugar regenerates deterministically (fixed seed per process → clean
diffs). Type-specific iteration tips live at the end of each recipe.
