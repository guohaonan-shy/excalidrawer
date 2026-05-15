# excalidrawer

Code-first Excalidraw diagram generation — CLI, MCP server, built-in templates, and SVG/PNG export.

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

## Claude Code Skill (moved)

> ⚠️ **The Claude Code skill has moved to the [harold-skills](https://github.com/guohaonan-shy/harold-skills) marketplace** and was rebuilt as a 4-skill plugin (`flowchart` / `timeline` / `architecture` / `sequence`) with `AskUserQuestion`-driven clarification. New features only land there.
>
> **Install the new version:**
> ```text
> /plugin marketplace add guohaonan-shy/harold-skills
> /plugin install excalidrawer
> /reload-plugins
> ```
>
> The previous single-skill install (`npx skills add guohaonan-shy/excalidrawer`) **still works but is frozen** — it won't receive updates. To migrate:
> ```bash
> rm ~/.claude/skills/excalidrawer
> npx skills remove excalidrawer    # if you used npx skills add
> # then run the /plugin commands above
> ```

This npm package itself is unchanged — the `excalidrawer` CLI and `import 'excalidrawer'` continue to work and stay maintained here.

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

## AI Skill

The bundled skill teaches AI assistants to use templates and the API instead of generating raw JSON.

```bash
npx skills add https://github.com/guohaonan-shy/excalidrawer --skill excalidrawer --agent claude-code
npx skills add https://github.com/guohaonan-shy/excalidrawer --skill excalidrawer --agent cursor
npx skills add https://github.com/guohaonan-shy/excalidrawer --skill excalidrawer --agent github-copilot
```

## License

MIT
