# excalidrawer

Code-first Excalidraw diagram generation — CLI, MCP server, built-in templates, and SVG/PNG export.

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
- **In an AI agent** — the MCP server and Claude Code / Cursor / Codex skill let an
  agent produce a diagram in-context ("draw the auth flow") without leaving the
  conversation.

It produces real `.excalidraw` files, so the output is still fully editable in
Excalidraw afterward — generate the first draft programmatically, hand-tweak if
you want.

## Install

excalidrawer has three entry points; pick whichever fits.

### CLI & MCP server

Install globally:

```bash
npm install -g excalidrawer
```

This puts two commands on your PATH:

- `excalidrawer` — the CLI (`render`, `compute-layout`, `generate`)
- `excalidrawer-mcp` — the MCP server that MCP clients launch

See [MCP Server](#mcp-server) below for client configuration (Claude Code,
Claude Desktop, Codex).

### Library

Only needed if you want the programmatic API for [custom scripts](#custom-scripts):

```bash
npm install excalidrawer
```

## MCP Server

`excalidrawer-mcp` is a stdio MCP server exposing two tools:

| Tool | What it does |
|------|--------------|
| `render_diagram` | Render an array of sugar shorthand or raw Excalidraw elements to `.excalidraw` / `.svg` / `.png` files. |
| `compute_layout` | Compute coordinates from a layout helper (grid, chain, swimlane, hub-and-spoke, edge anchors, U-routing, label anchors). |

### Claude Code

```bash
npm install -g excalidrawer
claude mcp add excalidrawer -- excalidrawer-mcp
```

Verify with `claude mcp list` — it should report `✓ Connected`.

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)
or `%APPDATA%\Claude\claude_desktop_config.json` (Windows), then restart the app:

```json
{
  "mcpServers": {
    "excalidrawer": {
      "command": "excalidrawer-mcp"
    }
  }
}
```

### Codex

Add to `~/.codex/config.toml`:

```toml
[mcp_servers.excalidrawer]
command = "excalidrawer-mcp"
```

## Agent Skill

A single self-contained `excalidrawer` skill lives in this repo's
[`skills/`](skills/) directory. It is agent-agnostic — installable into Claude
Code, Cursor, Codex, and any other agent the [`skills`](https://www.skills.sh)
CLI supports. It covers four diagram types — flowchart, timeline, architecture,
and sequence (plus freeform). Given a request, it clarifies intent with a couple
of `AskUserQuestion` prompts, reads the matching recipe under `references/`,
composes sugar elements, then calls the MCP server's `render_diagram` tool to
emit `.excalidraw` / `.svg` / `.png`.

| Diagram type | Use for | Trigger keywords |
|--------------|---------|------------------|
| flowchart | Decision flows, process diagrams, branching logic | flowchart, 流程图, decision tree, yes/no, approval flow |
| timeline | Timelines, roadmaps, project milestones | timeline, 时间线, roadmap, milestone, Q1/Q2 phases |
| architecture | System architecture, layered components, topology | architecture, 架构图, 3-tier, microservices, data platform |
| sequence | Sequence diagrams, multi-actor interactions, call chains | sequence diagram, 时序图, interaction, handshake, OAuth |

### Install via npx (skills.sh)

```bash
# 1. Add the MCP server the skill calls (skills.sh does not configure MCP for you)
npm install -g excalidrawer
claude mcp add excalidrawer -- excalidrawer-mcp

# 2. Install the skill
npx skills add guohaonan-shy/excalidrawer -y -g
```

`-y` auto-confirms; `-g` installs globally. The CLI keeps one canonical copy of
the skill — `~/.agents/skills/excalidrawer/` for `-g`, or the project's
`.agents/skills/excalidrawer/` without it — and symlinks each detected agent to
it (Claude Code → `~/.claude/skills/`, Cursor / Codex → `.agents/…`), so every
agent shares a single source of truth (pass `--copy` for independent copies
instead). The skill is self-contained (its recipes and references live inside the
one folder), so a single-skill install pulls in everything it needs. It then
shows up in the agent's skill menu and fires on the natural-language keywords
above.

## CLI

```bash
# Render sugar / raw Excalidraw elements to files
excalidrawer render -i elements.json -o docs/diagram
cat elements.json | excalidrawer render -o docs/diagram -f svg,png

# Compute layout coordinates (prints JSON)
excalidrawer compute-layout --helper gridLayout -a '{"count":6,"cols":3,"cellW":140,"cellH":50}'

# Generate from a built-in template (legacy)
excalidrawer generate -t timeline -i data.json -o docs/timeline
excalidrawer types
```

`render` accepts either a bare element array or `{ "elements": [...] }`. The
`render` / `compute-layout` commands share the exact tool definitions the MCP
server uses, so the two surfaces never drift.

## Quick Start: CLI Templates

For supported diagram types, just provide JSON data — no code needed.

```bash
# Generate timeline from JSON
excalidrawer generate -t timeline -i data.json -o docs/timeline

# Only SVG and PNG
excalidrawer generate -t timeline -i data.json -o docs/timeline -f svg,png

# List available types
excalidrawer types
```

### Built-in Templates

| Type | Use for | Input |
|------|---------|-------|
| `timeline` | Project timelines, roadmaps, milestones | `{ title, items: [{ label, time, desc, color? }] }` |
| `flowchart` | Process flows, decision trees | `{ title?, direction?, nodes: [{ id, label, type?, color? }], edges: [{ from, to, label? }] }` |
| `architecture` | System architecture, layered diagrams | `{ title?, sections: [{ label, color?, items }], connections? }` |
| `sequence` | Sequence diagrams, interaction flows | `{ title?, actors: [{ label, color? }], steps: [{ actor, text, from?, arrow?, style? }] }` |

### Timeline

```json
{
  "title": "Project Timeline",
  "items": [
    { "label": "MVP", "time": "Jan", "desc": "Core features ready" },
    { "label": "Beta", "time": "Mar", "desc": "User testing" },
    { "label": "Launch", "time": "Jun", "desc": "Public release" }
  ]
}
```

### Flowchart

Node types: `start`, `end`, `process`, `decision`, `io`

```json
{
  "title": "Login Flow",
  "direction": "horizontal",
  "nodes": [
    { "id": "start", "label": "Start", "type": "start" },
    { "id": "input", "label": "Enter Credentials", "type": "process" },
    { "id": "check", "label": "Valid?", "type": "decision" },
    { "id": "ok", "label": "Dashboard", "type": "end" },
    { "id": "err", "label": "Show Error", "type": "process" }
  ],
  "edges": [
    { "from": "start", "to": "input" },
    { "from": "input", "to": "check" },
    { "from": "check", "to": "ok", "label": "Yes" },
    { "from": "check", "to": "err", "label": "No" }
  ]
}
```

### Architecture

```json
{
  "title": "System Architecture",
  "sections": [
    { "label": "Frontend", "color": "blue", "items": ["Web App", "Mobile App"] },
    { "label": "Backend", "color": "green", "items": ["API Gateway", "Auth Service"] },
    { "label": "Data", "color": "yellow", "items": ["PostgreSQL", "Redis"] }
  ],
  "connections": [
    { "from": "Web App", "to": "API Gateway" },
    { "from": "API Gateway", "to": "PostgreSQL" }
  ]
}
```

### Sequence

```json
{
  "title": "OAuth Login Flow",
  "actors": [
    { "label": "User", "color": "yellow" },
    { "label": "Client", "color": "blue" },
    { "label": "Auth Server", "color": "purple" }
  ],
  "steps": [
    { "actor": "User", "text": "1. Login request" },
    { "actor": "Client", "text": "2. Start callback server", "from": "User" },
    { "actor": "Auth Server", "text": "3. Show login page", "from": "Client", "arrow": "GET /authorize" },
    { "actor": "User", "text": "4. User authorizes", "from": "Auth Server", "style": "dashed" },
    { "actor": "Client", "text": "5. Receive token", "color": "green", "from": "Auth Server", "arrow": "200 OK" }
  ]
}
```

## Custom Scripts

For diagram types not covered by templates, use the library API directly:

```javascript
import { writeFileSync } from "fs";
import { setSeed, box, arrow, textEl, colors, excalidraw, toSvg, toPng } from "excalidrawer";

setSeed(100000);
const CY = 120, BH = 56, BY = CY - BH / 2;

const elements = [
  textEl("title", 20, 12, 500, 28, "My Flow", 22),
  ...box("s1", "s1t", 20,  BY, 130, BH, colors.yellow, "Start", 15),
  arrow("a1", 150, CY, [[0,0],[40,0]]),
  ...box("s2", "s2t", 190, BY, 150, BH, colors.blue,   "Process", 14),
  arrow("a2", 340, CY, [[0,0],[40,0]]),
  ...box("s3", "s3t", 380, BY, 130, BH, colors.green,  "Done", 15),
];

writeFileSync("diagram.excalidraw", excalidraw(elements));
writeFileSync("diagram.svg", toSvg(elements));
writeFileSync("diagram.png", await toPng(elements, 2));
```

## API Reference

### Elements

| Function | Returns | Description |
|----------|---------|-------------|
| `box(rid, tid, x, y, w, h, bg, text, fontSize?)` | `[rect, text]` | Rounded rectangle with centered label |
| `diamondBox(rid, tid, x, y, w, h, bg, text, fontSize?)` | `[diamond, text]` | Diamond with centered label |
| `arrow(id, x, y, points, extra?)` | element | Arrow; `points` are relative `[dx, dy]` offsets |
| `textEl(id, x, y, w, h, text, fontSize, extra?)` | element | Standalone text |
| `rect(id, x, y, w, h, bg, extra?)` | element | Plain rounded rectangle |
| `ellipse(id, x, y, w, h, bg, extra?)` | element | Ellipse |

### Layout helpers

| Function | Description |
|----------|-------------|
| `row(count, startX, y, itemW, gap, builder)` | Horizontal row of items |
| `grid(cols, count, startX, startY, itemW, itemH, gapX, gapY, builder)` | Grid of items |

### Templates (programmatic)

| Function | Description |
|----------|-------------|
| `timeline(data, opts?)` | Generate timeline elements from JSON data |
| `flowchart(data, opts?)` | Generate flowchart elements from JSON data |
| `architecture(data, opts?)` | Generate architecture diagram elements from JSON data |
| `sequence(data, opts?)` | Generate sequence diagram elements from JSON data |

### Output

| Function | Returns | Description |
|----------|---------|-------------|
| `excalidraw(elements)` | `string` | JSON for `.excalidraw` file |
| `toSvg(elements)` | `string` | SVG markup with embedded fonts |
| `toPng(elements, scale?)` | `Promise<Buffer>` | PNG buffer (uses resvg-js for fast native rendering) |

### Colors

```javascript
import { colors } from "excalidrawer";

colors.blue / colors.green / colors.yellow / colors.purple / colors.red / colors.orange / colors.gray
colors.bgBlue / colors.bgGreen / colors.bgYellow / colors.bgPurple  // section backgrounds
colors.strokeBlue / colors.strokeGreen / colors.strokeYellow / colors.strokeOrange  // stroke accents
```

## License

MIT
