# excalidrawer

Code-first Excalidraw diagram generation with built-in templates, CLI, and SVG/PNG export.

## Install

**AI Skill** — works with Claude Code, GitHub Copilot, Cursor, Codex, Windsurf, and [30+ other AI assistants](https://github.com/vercel-labs/skills):

```bash
npx skills add https://github.com/guohaonan-shy/excalidrawer --skill excalidrawer
```

**npm package**:

```bash
npm install excalidrawer
```

## Quick Start: CLI Templates

For supported diagram types, just provide JSON data — no code needed.

```bash
# Generate timeline from JSON
npx excalidrawer generate -t timeline -i data.json -o docs/timeline

# Only SVG and PNG
npx excalidrawer generate -t timeline -i data.json -o docs/timeline -f svg,png

# List available types
npx excalidrawer types
```

### Built-in Templates

| Type | Use for | Input |
|------|---------|-------|
| `timeline` | Project timelines, roadmaps, milestones | `{ title, items: [{ label, time, desc, color? }] }` |
| `flowchart` | Process flows, decision trees | `{ title?, direction?, nodes: [{ id, label, type?, color? }], edges: [{ from, to, label? }] }` |
| `architecture` | System architecture, layered diagrams | `{ title?, sections: [{ label, color?, items }], connections? }` |

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

### Output

| Function | Returns | Description |
|----------|---------|-------------|
| `excalidraw(elements)` | `string` | JSON for `.excalidraw` file |
| `toSvg(elements)` | `string` | SVG markup with embedded fonts |
| `toPng(elements, scale?)` | `Promise<Buffer>` | PNG buffer (uses Playwright for font rendering) |

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
