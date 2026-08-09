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
- **In an AI agent** — the MCP server (and the agent plugin's skills) let an
  agent produce a diagram in-context ("draw the auth flow") without leaving the
  conversation.

It produces real `.excalidraw` files, so the output is still fully editable in
Excalidraw afterward — generate the first draft programmatically, hand-tweak if
you want.

## Install

Most users want the **agent plugin** — it bundles the flowchart / timeline /
architecture / sequence skills and wires them to the MCP server, so you can
just say *"draw the auth flow"* inside Claude Code or Codex. The CLI and
library entry points are below for scripting and custom use cases.

### Agent plugin (Claude Code / Codex, recommended)

Two commands and you're done — the plugin bundles the skills **and**
auto-registers the MCP server via its manifest (no global npm install, no
separate `claude mcp add` / `codex mcp add`).

In Claude Code:

```bash
/plugin marketplace add guohaonan-shy/excalidrawer
/plugin install excalidrawer@excalidrawer-dev
```

In Codex:

```bash
codex plugin marketplace add guohaonan-shy/excalidrawer
codex plugin add excalidrawer@excalidrawer-dev
```

Codex reads this repo's `.claude-plugin/marketplace.json` directly, so both
clients get the same skills and the same auto-registered MCP server — verify
with `codex plugin list` / `codex mcp list`.

The MCP server runs via `npx`, so the first invocation downloads the package
into the npx cache (~5-10 s); subsequent runs use the cache.

> Auto-registering the MCP server from the plugin manifest is a plugin-host
> feature. In a client that doesn't install plugins, register the MCP server
> directly — see [MCP Server](#mcp-server) below.

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

Only if you want the two MCP tools **without** the skills. The recommended
Codex path is [the plugin](#agent-plugin-claude-code--codex-recommended), which
brings the skills and this MCP server together — a bare `codex mcp add` gives
you `render_diagram` / `compute_layout` but none of the recipes (palette
conventions, back-edge routing, swimlane parameters, quality gates).

```bash
codex mcp add excalidrawer -- npx -y -p excalidrawer@latest -c excalidrawer-mcp
```

## Agent Skills

The [`skills/`](skills/) directory holds one skill per diagram type plus a
shared base they all read first. They ship as part of the agent plugin above —
Claude Code and Codex both install them.

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
> a manifest that registers it automatically; without the plugin, wire up the
> MCP server per [MCP Server](#mcp-server).

## CLI

```bash
# Render sugar / raw Excalidraw elements to files
excalidrawer render -i elements.json -o docs/diagram
cat elements.json | excalidrawer render -o docs/diagram -f svg,png

# Compute layout coordinates (prints JSON)
excalidrawer compute-layout --helper gridLayout -a '{"count":6,"cols":3,"cellW":140,"cellH":50}'
```

`render` accepts either a bare element array or `{ "elements": [...] }`. The
`render` / `compute-layout` commands share the exact tool definitions the MCP
server uses, so the two surfaces never drift.

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
| `render(elements, opts?)` | `Promise<{ outputs, elementCount }>` | Desugar + render to `{ excalidraw, svg, png }`. `opts.formats` subsets the output; `opts.scale` (1–4) sets PNG scale. |
| `desugar(elements)` | `element[]` | Expand sugar shorthand into raw Excalidraw elements without rendering. |

### Layout helpers

| Function | Description |
|----------|-------------|
| `gridLayout`, `chain`, `swimlane`, `hubSpoke` | Position helpers — coordinates for grids, chains, swimlanes, hub-and-spoke. |
| `edgePoint`, `routeU`, `labelAnchor` | Edge anchors, U-route detours, and label anchors for arrows. |

These back the `compute_layout` MCP tool — see
[`skills/shared/references/sugar.md`](skills/shared/references/sugar.md) for usage.

### Output

| Function | Returns | Description |
|----------|---------|-------------|
| `excalidraw(elements)` | `string` | JSON for a `.excalidraw` file |
| `toSvg(elements)` | `string` | SVG markup with embedded fonts |
| `toPng(elements, scale?)` | `Promise<Buffer>` | PNG buffer (resvg-js native rendering) |

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
