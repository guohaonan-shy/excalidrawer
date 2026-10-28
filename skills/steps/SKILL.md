---
name: steps
description: Step skill for the excalidrawer entry skills (flowchart / timeline / architecture / sequence / comparison / tree). An entry skill calls it when it reaches a step and points at one section - "clarify" (how to ask), "组件" (which reference to read for each component - shapes, connectors, stack, panel, axis, legend, tree, classic layouts - plus the shared visual semantics), "出图" (MCP precheck + CLI fallback, file naming, label language, export formats, render call, the two-layer quality gate, iteration), "新增一种图类型" (the checklist for adding a diagram type). Not a standalone drawing entry - do not trigger it on a drawing request; the entry skill for that diagram type comes first. 步骤 skill / 出图 / 组件用法 / 命名 / 导出格式 / 质量关。
allowed-tools: mcp__excalidrawer__render_diagram, mcp__excalidrawer__compute_layout, Bash(npx -y -p excalidrawer*:*), Read, Write(./*.json), AskUserQuestion
---

# excalidrawer steps

The entry skills (`flowchart` / `timeline` / `architecture` / `sequence` /
`comparison` / `tree`) say what to ask, what a good diagram of their type looks
like, and how it goes wrong. Everything about *how to do a step* lives here, in
four named sections. An entry skill calls this skill at the step it needs and
names the section; read **that section only** and the references it points to,
not the whole file.

| section | lines (read only these) | when an entry skill sends you here |
|---|---|---|
| [clarify](#clarify) | 行 33–55 | the "ask the user" step |
| [组件](#组件) | 行 57–88 | the "compose the diagram" step - which component to use and how to fill its fields |
| [出图](#出图) | 行 90–260 | the "render and deliver" step |
| [新增一种图类型](#新增一种图类型) | 行 262–287 | writing a new entry skill |

To read one section, open this file with an offset at its first line and a limit of its length (the line numbers are checked by `tests/skills-steps.test.mjs`, which tells you the right ones if you change the file).

The loop an entry skill walks:

```text
detect type → clarify → pick components & styles (组件) → compose sugar
            → render_diagram (出图) → resolve warnings (quality gate)
            → give the user the paths → iterate
```

## clarify

用户的描述已经能列全这张图的全部内容（节点和分叉去向、里程碑、角色和消息、层与服务、对比的两侧和维度、树的层级……）就不问，也不去读提问规则。入口 skill 在这一步开头写的是同一句话，所以它不会为此来读这一节；只有要问的时候才读下面。

Otherwise run **AskUserQuestion** (≤ 3 questions per round) before composing.
The entry skill lists the type-specific questions; a choice about *how to draw*
(layout, axis style, return-message style, split direction) that the content
cannot settle is still asked when the user didn't say, even if the content is
complete.

- **AskUserQuestion fits**: discrete choice, 2–4 short options, single select
  ("horizontal vs vertical", "include connections? yes / no", "axis style").
- **Natural-language prompt fits**: free-form lists, long descriptions, file
  paths, or > 4 options. Keep an "Other / 自定义" escape so the user can override.

Don't ask anything derivable from the request itself — that includes the
export format (see *Export format reference* under 出图). "The user picked X →
which parameter" is written in the component reference the choice feeds, not in
the entry skill.

If the user's description leaves a load-bearing style question open (which
calls are async? which modules are planned?), ask it here rather than guess —
a wrong dashed line misleads more than none.

## 组件

Read in this order:

1. [`references/semantics.md`](references/semantics.md) first - it decides
   **which** component and style a meaning maps to (arrow vs line, solid /
   dashed / dotted, stroke weight, arrowheads, elbow vs round, colors) and
   holds the values every diagram shares (title size, subtitle size, body
   size). It is short, and it is where "the user said *async* / *optional* /
   *planned*" turns into parameters.
2. Then only the component references the diagram uses:

| component | read it when | reference |
|---|---|---|
| shapes & text | every diagram: `rect` / `diamond` / `ellipse` / `text`, colors, label wrapping, mixing raw elements | [`shapes.md`](references/shapes.md) |
| connectors | any arrow or line: id-anchored routing, pinned sides, back-edges, label dodging, long-haul detours, `edgePoint` / `routeU` / `labelAnchor`, L4 manual form | [`connectors.md`](references/connectors.md) |
| stack | cells in a row or column whose container is sized from content; **`equalize`** (one height for a row of cells); lifeline length from a step column; a milestone's text rows | [`stack.md`](references/stack.md) |
| panel | a container with a heading: layer bands, comparison sides, sub-lanes; the older `titledBox` / `fitContainer` | [`panel.md`](references/panel.md) |
| axis | a marked line: a timeline spine, a chart axis, value → coordinate | [`axis.md`](references/axis.md) |
| legend | any custom meaning of line style or color | [`legend.md`](references/legend.md) |
| tree | one root fanning out to children | [`tree.md`](references/tree.md) |
| classic layouts | the older placement helpers still in use: `chain`, `gridLayout`, `swimlane`, `hubSpoke` | [`classic-layouts.md`](references/classic-layouts.md) |

Precedence when they disagree: the user's explicit request → the entry
skill's convention for its type → `semantics.md` → component defaults. An
entry skill only restates a rule when it narrows or overrides it (e.g.
sequence narrows "dashed" to mean *response*).

Render order: background rects → connectors (arrows / lines) → boxes / text.
Connectors always render after shapes, so push lifelines and axes as separate
segments where a connector must not draw over a shape - see `axis.md` and
`stack.md`.

## 出图

### MCP-first, CLI fallback

Primary path: the **`excalidrawer` MCP server** (`excalidrawer-mcp`, added via
`claude mcp add excalidrawer -- excalidrawer-mcp`). Confirm both tools are
visible before drawing:

- `mcp__excalidrawer__render_diagram(elements, output, formats?, scale?)`
  — translates sugar to raw, validates, writes files. `output` is the path
  **without** extension; one file per requested format is written alongside.
- `mcp__excalidrawer__compute_layout(helper, args)` — pure geometry. Returns
  coordinates only; no elements are emitted. Use for stack / panel / axis /
  legend / tree and the classic layouts.

If the MCP tools aren't available (server failed to start, older host,
sandboxed env), fall back to the CLI shipped by the same package:

```bash
npx -y -p excalidrawer@^0.5.13 -c 'excalidrawer render -i elements.json -o ./flowchart-foo'
npx -y -p excalidrawer@^0.5.13 -c "excalidrawer compute-layout --helper gridLayout -a '{...}'"
```

`elements.json` accepts either a bare sugar array or `{ "elements": [...] }`.

The CLI and the MCP tools return slightly different shapes and take formats
differently:

- `compute-layout` prints the result object directly, with no `.result` wrapper.
  MCP's `compute_layout` returns `{ helper, result }`, which is why the
  component references write `.result` - on the CLI read the printed object itself.
- `render` writes `excalidraw,svg,png` unless told otherwise. For PNG only,
  pass `-f png`; for several formats, a comma list with no spaces, e.g.
  `-f png,excalidraw` (MCP: `formats: ["png", "excalidraw"]`).

### Output naming (gstack style) + language

Diagrams write to the user's current working directory with semantic file
names — never `outputs/<timestamp>/` subfolders.

| type | filename |
|---|---|
| flowchart | `./flowchart-<name>.{excalidraw,svg,png}` |
| timeline | `./timeline-<name>.{excalidraw,svg,png}` |
| architecture | `./architecture-<name>.{excalidraw,svg,png}` |
| sequence | `./sequence-<name>.{excalidraw,svg,png}` |
| comparison | `./comparison-<name>.{excalidraw,svg,png}` |
| tree | `./tree-<name>.{excalidraw,svg,png}` |
| freeform | `./diagram-<name>.{excalidraw,svg,png}` |

`<name>` is a short kebab-case derived from the request (e.g. `login-flow`,
`product-roadmap-2026`). If that file already exists, ask before overwriting
unless the user explicitly said "覆盖" / "overwrite".

**Diagram labels default to English** for visual consistency — Excalifont (the
hand-drawn body font) is Latin-only, so all-English labels render uniformly.
CJK / non-Latin text triggers a system font fallback (PingFang on macOS, Noto
on Linux, Microsoft YaHei on Windows), which renders correctly but visually
mixes hand-drawn Latin with flat CJK glyphs. Honor an explicit request for
another language ("用中文" / "in Chinese" / "keep the original wording").

What does **not** count as a request: chatting in Chinese, or pasting source
material (a spec, a numbered list, an outline) written in Chinese. Translate
that content into English labels. Keep numbering, keep proper nouns and
product names as written, and keep the meaning of each item intact. Only the
labels change language; the structure stays the same. If you are unsure whether the user
wants the original language kept, ask it as one clarify option rather than
guessing.

The skill's own clarifying prompts and progress messages follow the user's
conversation language — separate from diagram labels.

### Export format reference

`formats` follows where the diagram will land. Each format has one home:

| format | goes where | why |
|---|---|---|
| `excalidraw` | anywhere the diagram may be edited again | editable source, a few KB |
| `svg` | Markdown / GitHub | vector, inlines in `.md` |
| `png` | Notion / 飞书 / slides | pastes everywhere |
| `webp` | web pages / blogs / landing pages | lossless, about a quarter of the PNG's size |

`scale` (1–4) enlarges the export for `png` / `webp`; use 3 for print or a
high-resolution deck.

不先问导出格式：对话里读得出图要去哪就直接定（"画一个流程图贴 Notion"），读不出来才在出图时问一句。Choose the formats directly when the destination can be read from the
conversation, and keep `excalidraw` alongside so the diagram stays editable.
Ask one short question about where the diagram will go only when the
conversation doesn't say - at this step, not in clarify. Leave `formats` out to
get excalidraw + svg + png.

### Render call

```text
mcp__excalidrawer__render_diagram({
  elements: <sugar 数组>,
  output: "./<type>-<name>",   // no extension; gstack naming above
  formats: <per the export format reference>,
  scale: <3 for hi-res presentation; omit otherwise>
})
```

- success: `{ written: [...paths], elementCount: N, warnings? }` — tell the user
  the paths.
- failure: `{ error, issues: [...] }` — fix the sugar by issue index and retry;
  no files are written on failure. Each issue names the element index and the
  problem (`unknown fill color`, `arrow "from" references unknown id`,
  `fromT must be a number in [0,1]`, ...).

### Quality gate — two layers, and a diagram is done only when BOTH pass

A diagram is **not finished** until it clears both gates below. Layer A is a
deterministic code lint (free, exact, always runs). Layer B is a visual pass you
perform with your own vision on the exported bitmap (catches what geometry can't). Never
report paths to the user while either gate is failing, and never ask the user to
accept a defect — they are all fixable.

#### Layer A — deterministic lint (always)

`render_diagram` runs a geometry lint on every success and returns a `warnings`
array **only when something is wrong** (files are still written — warnings are
non-fatal). **A non-empty `warnings` means NOT done: fix the flagged elements and
re-render until `warnings` is absent.** On the CLI fallback path the same lint
prints to **stderr** (`⚠ N quality warning(s)`, 0.5.13+) — read it there, it is
the same gate. **Nothing on stderr means Layer A passed** (the line is printed
only when there are warnings); do not wait for a "no warnings" message.

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

#### Layer B — visual self-check (required for user-facing diagrams)

The lint proves geometry; only your eyes catch composition. **After Layer A is
clean, `Read` the exported bitmap (`.png` or `.webp`) and score it against this
rubric — one explicit PASS/FAIL per line.** When `formats` produced no bitmap
(only `svg` / `excalidraw`), also export a `png` just for this check (it can stay out of the
files you report):

1. **Labels** — every label sits centered and fully inside its shape; none clipped or touching a border. A label that wraps so its last line is a single word also FAILS: shorten the sentence, or break it yourself with `\n` at a sensible place so the lines come out close in length.
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

### Iteration

Re-render with the **same output filename** unless the user wants both versions
kept — sugar regenerates deterministically (fixed seed per process → clean
diffs). Type-specific iteration tips live in the entry skill's "常见画坏法".

## 新增一种图类型

给加新图类型（#12）的人。入口 skill 的写法和照做的清单都在这里，不用去读现有的入口 skill。

### 入口 skill 的写法

一种图只有 `SKILL.md` 一个文件，正文用中文；frontmatter 的 `description` 保持中英双语触发词，`allowed-tools` 保留。正文是固定的四步：

1. **问清楚**：这种图要问用户什么、哪些情况可以不问。提问的通用规则调 `steps`，看「clarify」。
2. **构图**：一张好的这种图长什么样：讲清什么、几种布局变体各适合什么内容、用到哪些组件、每个组件在这里画出什么效果、配色倾向。组件的参数调 `steps`，看对应组件那一份参考。
3. **出图**：调 `steps`，看「出图」（命名、格式、质量关、迭代）。
4. **常见画坏法**：画坏了长什么样、为什么、改哪一步。

调 `steps` 的写法统一成一句：「调 skill `steps`（Claude Code 用 Skill 工具调 `excalidrawer:steps`；其他宿主读 `../steps/SKILL.md`），看它的『<节名>』」。

- **不许写**：坐标、尺寸、间距、字号这类几何数字（带不带 px 都算）；工具名（`render_diagram`、`compute_layout`）；sugar 字段名和取值（`fromSide`、`arrowType: "elbow"` 这类）；代码块（只放 ASCII 示意图的 `text` 块除外）。
- **可以写**：组件名（stack、panel、axis、legend、连线、tree 这类，用来指向 `steps` 的那一节）；内容上的数量判断，比如「每个父节点 1–8 个孩子最好看」，它们说的是内容，不是几何。

### 照做的清单

1. 新建 `skills/<type>/SKILL.md`，按「入口 skill 的写法」的四步写；遵守「不许写」，测试会查。
2. 构图里用到的每个组件，先在 `steps` 的参考里找；有就在构图一步写组件名和它画出的效果，没有的用法加进那个组件的参考。要一个还不存在的组件，先开组件层的 issue。
3. `steps`「出图」里的命名表加一行 `<type>-<name>`。
4. `CLAUDE.md` 的 `skills/` 一节、README 的图类型列表加上它；`docs/gallery/` 加一张图（`node examples/gallery.mjs` 生成）。
5. 插件清单不用改。
6. 用新入口 skill 照一个真实请求画一张图，Layer A、Layer B 都过，才算写完。
