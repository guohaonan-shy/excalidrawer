# excalidrawer

Code-first Excalidraw diagram generation — CLI, MCP server, and SVG/PNG export.

## Why not just use Excalidraw directly?

[Excalidraw](https://excalidraw.com) is a fantastic *drawing* tool — you open a
canvas and arrange boxes by hand. excalidrawer is a *generation* tool: it turns
code (or a structured spec, or an agent's intent) into the same hand-drawn-style
diagrams, with **no browser and no manual dragging**.

Use Excalidraw when a human is sketching once. Reach for excalidrawer when the
diagram needs to come out of an automated pipeline:

- **In code / scripts** — build diagrams from data, keep them in version control,
  and regenerate deterministically (fixed seed → clean diffs) instead of
  re-dragging boxes every time the source changes.
- **In CI / docs builds** — render `.svg` / `.png` as a build step so the diagrams
  in your README or docs site never drift from the system they describe.
- **In an AI agent** — the MCP server (and the Claude Code plugin's skills) let an
  agent produce a diagram in-context ("draw the auth flow") without leaving the
  conversation.

It produces real `.excalidraw` files, so the output is still fully editable in
Excalidraw afterward — generate the first draft programmatically, hand-tweak if
you want.

## Install

Most users want the **agent plugin** — it bundles the flowchart / timeline /
architecture / sequence skills and wires them to the MCP server, so you can
just say *"draw the auth flow"* inside Claude Code. The CLI and library entry
points are below for scripting and custom use cases.

### Agent plugin (Claude Code, recommended)

Two commands and you're done — the plugin bundles the skills **and**
auto-registers the MCP server via its manifest (no global npm install, no
separate `claude mcp add`):

```bash
/plugin marketplace add guohaonan-shy/excalidrawer
/plugin install excalidrawer@excalidrawer-dev
```

The MCP server runs via `npx -y -p excalidrawer@latest -c excalidrawer-mcp`, so
the first invocation downloads the package into the npx cache (~5-10 s);
subsequent runs use the cache.

> Plugin-manifest auto-MCP is a Claude-Code feature. In Cursor, Codex, or
> Claude Desktop, register the MCP server directly — see
> [MCP Server](#mcp-server) below.

### CLI & MCP server only

If you only want the binaries (e.g. to script `excalidrawer render` in a build):

```bash
npm install -g excalidrawer
```

This puts two commands on your PATH:

- `excalidrawer` — the CLI (`render`, `compute-layout`)
- `excalidrawer-mcp` — the MCP server that MCP clients launch

### Library

Only needed for the programmatic API (see [Custom Scripts](#custom-scripts)):

```bash
npm install excalidrawer
```

## MCP Server

`excalidrawer-mcp` is a stdio MCP server exposing two tools:

| Tool | What it does |
|------|--------------|
| `render_diagram` | Render an array of sugar shorthand or raw Excalidraw elements to `.excalidraw` / `.svg` / `.png` files. |
| `compute_layout` | Compute coordinates from a layout helper (grid, chain, swimlane, hub-and-spoke, edge anchors, U-routing, label anchors). |

Each command below registers the server with
`npx -y -p excalidrawer@latest -c excalidrawer-mcp` — no global install needed,
and always the latest published version.

### Claude Code

```bash
claude mcp add excalidrawer -- npx -y -p excalidrawer@latest -c excalidrawer-mcp
```

Verify with `claude mcp list` — it should report `✓ Connected`.

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)
or `%APPDATA%\Claude\claude_desktop_config.json` (Windows), then restart the app:

```json
{
  "mcpServers": {
    "excalidrawer": {
      "command": "npx",
      "args": ["-y", "-p", "excalidrawer@latest", "-c", "excalidrawer-mcp"]
    }
  }
}
```

### Codex

```bash
codex mcp add excalidrawer -- npx -y -p excalidrawer@latest -c excalidrawer-mcp
```

## Agent Skills

The [`skills/`](skills/) directory holds one skill per diagram type plus a
shared base they all read first. They ship as part of the Claude Code plugin
above.

| Skill | Use for | Trigger keywords |
|-------|---------|------------------|
| `flowchart` | Decision flows, process diagrams, branching logic | flowchart, 流程图, decision tree, yes/no, approval flow |
| `timeline` | Timelines, roadmaps, project milestones | timeline, 时间线, roadmap, milestone, Q1/Q2 phases |
| `architecture` | System architecture, layered components, topology | architecture, 架构图, 3-tier, microservices, data platform |
| `sequence` | Sequence diagrams, multi-actor interactions, call chains | sequence diagram, 时序图, interaction, handshake, OAuth |
| `shared` | Common base — conventions, sugar schema, palette, output rules (read first, not invoked directly) | — |

Each type skill declares a prerequisite — *read `../shared/SKILL.md`
first* — so the cross-cutting rules live in one place instead of being copied
four times. Given a request, a type skill clarifies intent with a couple of
`AskUserQuestion` prompts, reads its recipe under `references/`, composes sugar
elements, then calls the MCP server's `render_diagram` tool to emit
`.excalidraw` / `.svg` / `.png`.

> All skills call the `excalidrawer-mcp` server. The plugin install above ships
> a manifest that registers it automatically; for any other client, wire up the
> MCP server per [MCP Server](#mcp-server).

## CLI

```bash
# Render sugar / raw Excalidraw elements to files
excalidrawer render -i elements.json -o docs/diagram
cat elements.json | excalidrawer render -o docs/diagram -f svg,png

# Render at a fixed size (social cover, slide, print page)
excalidrawer render -i elements.json -o cover --preset xhs:cover
excalidrawer render -i elements.json -o cover --canvas '{"ratio":"3:4","width":1242}'
excalidrawer presets          # list the built-in canvas presets

# Compute layout coordinates (prints JSON)
excalidrawer compute-layout --helper gridLayout -a '{"count":6,"cols":3,"cellW":140,"cellH":50}'
```

`render` accepts either a bare element array or `{ "elements": [...] }`. The
`render` / `compute-layout` commands share the exact tool definitions the MCP
server uses, so the two surfaces never drift.

## Fixed-size output

By default a diagram is as big as its content. Pass a `canvas` when the target
has a fixed shape — a 小红书 cover, a 16:9 slide, an A4 page:

```javascript
const { outputs, canvas } = await render(elements, {
  formats: ["png"],
  canvas: { ratio: "3:4", width: 1242 },   // or { preset: "xhs:cover" }
});
// canvas → { width: 1242, height: 1656, scale: 1.7, fill: 0.77 }
```

The PNG comes out at exactly that pixel size; the `.excalidraw` file keeps the
authored coordinates so it stays editable. Also accepts `padding`, `safe` (a
band platform UI covers — content is laid out clear of it), `fit`
(`contain` / `pad` / `none`), `align`, and `background`.

**Lay out for the target shape rather than scaling into it.** A wide flow forced
into a 3:4 cover gets shrunk until it is unreadable, which the linter reports as
`CANVAS_UNDERFILL` / `TEXT_TOO_SMALL`. `chooseGrid` picks the arrangement that
matches a target ratio — six nodes become 3×2 on a slide and 2×3 on a cover:

```javascript
import { chooseGrid, gridLayout } from "excalidrawer";

const { cols } = chooseGrid(6, { targetAspect: "3:4", cellW: 300, cellH: 120 });
const cells = gridLayout(6, { cols, cellW: 300, cellH: 120, serpentine: true });
```

Presets are a plain lookup table (`excalidrawer/presets`), kept out of the
rendering engine so platform data can change independently. Each entry records
when its ratio was last verified; stale ones come back with a note.

## Custom Scripts

`render()` takes the same sugar shorthand the MCP server uses and returns the
rendered outputs — drop it into any script:

```javascript
import { writeFileSync } from "fs";
import { render } from "excalidrawer";

const elements = [
  { shape: "rect", id: "start",   at: [20, 80],  size: [130, 56], fill: "yellow", text: "Start" },
  { shape: "rect", id: "process", at: [240, 80], size: [150, 56], fill: "blue",   text: "Process" },
  { shape: "rect", id: "done",    at: [460, 80], size: [130, 56], fill: "green",  text: "Done" },
  { shape: "arrow", from: "start",   to: "process" },
  { shape: "arrow", from: "process", to: "done" },
];

const { outputs } = await render(elements, { formats: ["excalidraw", "svg", "png"] });
writeFileSync("diagram.excalidraw", outputs.excalidraw);
writeFileSync("diagram.svg", outputs.svg);
writeFileSync("diagram.png", outputs.png);
```

The full sugar schema (shapes, arrows, layout helpers, `fill` / `stroke` /
`textColor`) is documented in
[`skills/shared/references/sugar.md`](skills/shared/references/sugar.md).

## API Reference

### Core

| Function | Returns | Description |
|----------|---------|-------------|
| `render(elements, opts?)` | `Promise<{ outputs, elementCount, canvas? }>` | Desugar + render to `{ excalidraw, svg, png }`. `opts.formats` subsets the output; `opts.scale` (1–4) sets PNG scale; `opts.canvas` pins the output size. |
| `desugar(elements)` | `element[]` | Expand sugar shorthand into raw Excalidraw elements without rendering. |
| `resolveCanvas(elements, spec)` | `object` | Work out how content sits in a fixed canvas — scale, offset, fill fraction. |

### Layout helpers

| Function | Description |
|----------|-------------|
| `gridLayout`, `chain`, `swimlane`, `hubSpoke` | Position helpers — coordinates for grids, chains, swimlanes, hub-and-spoke. |
| `chooseGrid` | Picks the column count whose block best matches a `targetAspect` — the aspect-aware counterpart to `gridLayout`. |
| `edgePoint`, `routeU`, `labelAnchor` | Edge anchors, U-route detours, and label anchors for arrows. |

These back the `compute_layout` MCP tool — see
[`skills/shared/references/sugar.md`](skills/shared/references/sugar.md) for usage.

### Output

| Function | Returns | Description |
|----------|---------|-------------|
| `excalidraw(elements)` | `string` | JSON for a `.excalidraw` file |
| `toSvg(elements, opts?)` | `string` | SVG markup with embedded fonts; `opts.canvas` fixes the output size |
| `toPng(elements, scaleOrOpts?)` | `Promise<Buffer>` | PNG buffer (resvg-js native rendering); accepts `{ scale, canvas }` |

`excalidraw` / `toSvg` / `toPng` take already-desugared elements; call
`desugar()` first if you're starting from sugar.

### Colors

```javascript
import { colors } from "excalidrawer";

colors.blue / colors.green / colors.yellow / colors.purple / colors.red / colors.orange / colors.gray
colors.bgBlue / colors.bgGreen / colors.bgYellow / colors.bgPurple  // section backgrounds
colors.strokeBlue / colors.strokeGreen / colors.strokeYellow / colors.strokeOrange  // stroke accents
```

In sugar, set `fill` for the background, `stroke` for the border, and
`textColor` (palette key or `#rrggbb`) for a bound label.

## License

MIT
