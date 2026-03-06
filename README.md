# excalidrawer

Code-first Excalidraw diagram generation with SVG and PNG export — no browser required.

## Why

The standard approach to generating Excalidraw diagrams with AI asks the LLM to write 500+ lines of raw JSON directly. This is slow, error-prone, and produces diagrams that are hard to update.

`excalidrawer` gives you a small, declarative API. Write ~30 lines of JavaScript, run it locally, get `.excalidraw` + `.svg` + `.png` in one step.

## Install

```bash
npm install excalidrawer
```

## Quick Start

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

```bash
node diagram.mjs
# diagram.excalidraw  — open in excalidraw.com
# diagram.svg         — embed in Markdown / GitHub
# diagram.png         — paste into Lark / Notion / slides
```

## API

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

### Output

| Function | Returns | Description |
|----------|---------|-------------|
| `excalidraw(elements)` | `string` | JSON for `.excalidraw` file |
| `toSvg(elements)` | `string` | SVG markup |
| `toPng(elements, scale?)` | `Promise<Buffer>` | PNG buffer (requires `sharp`) |

### Colors

```javascript
import { colors } from "excalidrawer";

colors.blue / colors.green / colors.yellow / colors.purple / colors.red / colors.orange / colors.gray
colors.bgBlue / colors.bgGreen / colors.bgYellow / colors.bgPurple  // lighter section backgrounds
colors.strokeBlue / colors.strokeGreen / colors.strokeYellow / colors.strokeOrange  // stroke accents
```

## AI Skill

Install the bundled skill for GitHub Copilot, Claude Code, Cursor, and other compatible AI assistants:

```bash
# Claude Code
cp -r node_modules/excalidrawer/skill/SKILL.md ~/.claude/skills/excalidrawer/SKILL.md

# Or copy the skill folder
cp -r node_modules/excalidrawer/skill ~/.claude/skills/excalidrawer
```

The skill teaches the AI to use this package's API instead of generating raw JSON — resulting in faster, more accurate diagram generation.

## License

MIT
