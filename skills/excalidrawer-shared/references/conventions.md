# excalidrawer plugin conventions

Cross-skill rules. Each SKILL.md's §0 必读约定 段 links here.

## 1. Clarify before drawing

Always run AskUserQuestion (1-3 questions) before composing elements, unless
the user has already pasted a complete structured spec (full nodes/edges,
ready actor list, etc.).

- **AskUserQuestion fits**: discrete choice with 2-4 short options, single
  select. Examples: "horizontal vs vertical", "include connections? yes / no",
  "axis style: dots between segments / dots tangent to axis".
- **Natural-language prompt fits**: free-form lists, long descriptions, file
  paths, or > 4 options. Keep an "Other / 自定义" escape so the user can override.

Total: ≤ 3 questions per round. Don't ask things derivable from the request
itself.

## 2. Output naming (gstack style)

Diagrams write to the user's current working directory with semantic file
names — never `outputs/<timestamp>/` subfolders.

| skill | filename |
|---|---|
| flowchart | `./flowchart-<name>.{excalidraw,svg,png}` |
| timeline | `./timeline-<name>.{excalidraw,svg,png}` |
| architecture | `./architecture-<name>.{excalidraw,svg,png}` |
| sequence | `./sequence-<name>.{excalidraw,svg,png}` |

`<name>` is a short kebab-case derived from the request (e.g. `login-flow`,
`product-roadmap-2026`). When a file with that name already exists, ask before
overwriting unless the user explicitly said "覆盖" / "overwrite".

## 3. MCP-first, CLI fallback

Primary path: the **`excalidrawer` MCP server** declared in `plugin.json`'s
`mcpServers`. Tools available in every session that loads this plugin:

- `mcp__excalidrawer__render_diagram(elements, output, formats?, scale?)`
  — translates sugar to raw, validates, writes files. `output` is the path
  **without** extension; one file per requested format is written alongside.
- `mcp__excalidrawer__compute_layout(helper, args)` — pure geometry. Returns
  coordinates only; no elements are emitted. Use for grid/chain/swimlane/etc.

If the MCP tools aren't available (server failed to start, older host,
sandboxed env), fall back to the CLI shipped by the same package:

```bash
npx -y -p excalidrawer@^0.5.7 -c 'excalidrawer render -i elements.json -o ./flowchart-foo'
npx -y -p excalidrawer@^0.5.7 -c "excalidrawer compute-layout --helper gridLayout -a '{...}'"
```

`elements.json` accepts either a bare sugar array or `{ "elements": [...] }`.

## 4. Output language

Diagram **labels default to English** for visual consistency. Excalifont
(the hand-drawn body font) is Latin-only, so all-English labels render in
a uniform hand-drawn style. CJK / non-Latin text triggers a system font
fallback (PingFang on macOS, Noto on Linux, Microsoft YaHei on Windows),
which renders correctly but visually mixes the hand-drawn Latin and the
flat-style CJK glyphs.

Honor an explicit user request for another language ("用中文" / "in
Chinese" / "Auf Deutsch") — the auto CJK font fallback handles rendering
in the npm package (see package 0.5.8 changelog).

The skill's own **clarifying prompts and progress messages** follow the
user's conversation language — separate from diagram labels.

## 5. Skill scope — route to the right skill

If a request clearly fits a sibling skill in this plugin, route to it:

- 决策流程 / yes-no 分支 / 业务流转 → **excalidrawer-flowchart**
- 时间线 / 路线图 / 里程碑 / 项目阶段 → **excalidrawer-timeline**
- 系统架构 / 分层 / 服务拓扑 / 微服务 → **excalidrawer-architecture**
- 多角色交互 / API 调用顺序 / handshake → **excalidrawer-sequence**

If it fits **none** of the four (org chart, mind map, tree, custom topology),
compose manually with sugar — the schema (`sugar.md`) supports
arbitrary shapes and arrows. Output goes to `./diagram-<name>.{excalidraw,svg,png}`.

## 6. Output format selection

Ask this as the **final clarify question** — the answer drives the `formats`
argument to `render_diagram`. The `.excalidraw` file is always included
(editable source, a few KB); the toggle is mostly about whether to render
PNG (slowest format, ~1 s for a typical diagram) and / or SVG.

AskUserQuestion (single-select, header: `Format` / `用途`):

| Option | `formats` | notes |
|---|---|---|
| `Markdown / GitHub` | `["excalidraw", "svg"]` | SVG inlines well in `.md` |
| `Notion / 飞书 / slides / docs` | `["excalidraw", "png"]` | PNG pastes everywhere |
| `打印 / 高清演示` | `["excalidraw", "png"]` + `scale: 3` | retina-quality export |
| `都要 / 不确定`(default) | `["excalidraw", "svg", "png"]` | covers all uses |

If the user already stated the target in the original request ("画一个流程图贴 Notion"),
skip the question and infer.

## 7. Iteration

After the first render, common follow-ups: rename a node, add a branch,
swap colors, tighten spacing. Re-render with the **same output filename**
unless the user wants to keep both — sugar element JSON regenerates
deterministically (the npm package uses a fixed seed sequence per process).
