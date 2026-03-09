---
name: excalidrawer
description: 'Code-first Excalidraw diagram generation with SVG and PNG export. Use when asked to "create a diagram", "draw a flowchart", "generate an architecture diagram", "export diagram to SVG", "export diagram to PNG", or "visualize a process". Produces .excalidraw, .svg, and .png files using the excalidrawer npm package — no browser required.'
---

# Excalidrawer

A diagram generation tool with built-in templates and a CLI. For supported diagram types, just provide JSON data and run the CLI. For custom diagrams, write a short JS script using the library API.

## Prerequisites

Install this skill:

```bash
npx skills add https://github.com/guohaonan-shy/excalidrawer --skill excalidrawer
```

Install the npm package in your project:

```bash
npm install excalidrawer
```

## Workflow: Template-Based (Preferred)

For supported diagram types (timeline, etc.), use the CLI directly — no script needed.

### Step 1: Identify the diagram type

Check if the request matches a built-in template:

| Type | Use for |
|------|---------|
| `timeline` | Project timelines, roadmaps, milestones |

Run `npx excalidrawer types` to see all available types.

### Step 2: Create a JSON data file

Write a JSON file matching the template's schema (see Template Schemas below).

### Step 3: Run the CLI

```bash
npx excalidrawer generate --type <type> --input data.json --output ./path/to/output
```

CLI options:
- `--type, -t` — Diagram type (required)
- `--input, -i` — Input JSON file (reads stdin if omitted)
- `--output, -o` — Output path without extension (required)
- `--format, -f` — Comma-separated: `excalidraw,svg,png` (default: all three)
- `--seed, -s` — Seed for deterministic IDs

Examples:
```bash
# Generate all formats
npx excalidrawer generate -t timeline -i timeline.json -o docs/timeline

# Only SVG and PNG
npx excalidrawer generate -t timeline -i timeline.json -o docs/timeline -f svg,png

# Pipe from stdin
echo '{"title":"My Timeline","items":[...]}' | npx excalidrawer generate -t timeline -o out/timeline
```

## Template Schemas

### Timeline

Input JSON:
```json
{
  "title": "Project Timeline",
  "items": [
    {
      "label": "Milestone 1",
      "time": "Jan",
      "desc": "Description line 1\nline 2"
    },
    {
      "label": "Milestone 2",
      "time": "Mar",
      "desc": "Another description",
      "color": "#a5d8ff"
    }
  ]
}
```

Fields:
- `title` (string) — Diagram title displayed at top
- `items` (array) — Milestones in chronological order
  - `label` (string) — Milestone name (displayed in colored box)
  - `time` (string) — Time label (displayed near the axis)
  - `desc` (string) — Description text. Use `\n` for line breaks.
  - `color` (string, optional) — Box fill color. If omitted, cycles through: yellow → blue → green → purple → red → orange

## Workflow: Custom Script (Fallback)

For diagram types not covered by templates, write a JS script using the library API.

### Core API

```javascript
import {
  setSeed,      // setSeed(n) — set seed for deterministic IDs
  box,          // box(rid, tid, x, y, w, h, bg, text, fontSize?) → [rect, text]
  diamondBox,   // diamondBox(rid, tid, x, y, w, h, bg, text, fontSize?) → [diamond, text]
  arrow,        // arrow(id, x, y, points, extra?) → arrow element
  textEl,       // textEl(id, x, y, w, h, text, fontSize, extra?) → text element
  rect,         // rect(id, x, y, w, h, bg, extra?) → rectangle
  colors,       // semantic color palette
  excalidraw,   // excalidraw(elements) → JSON string for .excalidraw file
  toSvg,        // toSvg(elements) → SVG string
  toPng,        // toPng(elements, scale?) → Promise<Buffer>
  timeline,     // timeline(data, opts?) → elements array (also usable as library)
} from 'excalidrawer';
```

### Color Palette

```javascript
colors.blue      // "#a5d8ff"  — info / process steps
colors.green     // "#b2f2bb"  — success / output
colors.yellow    // "#ffd43b"  — start / highlight
colors.purple    // "#d0bfff"  — AI / service layer
colors.red       // "#ffc9c9"  — external / warning
colors.orange    // "#ffec99"  — decision / human-in-loop
colors.gray      // "#e9ecef"  — secondary / misc

// Lighter section backgrounds
colors.bgBlue / colors.bgGreen / colors.bgYellow / colors.bgPurple

// Stroke accents
colors.strokeBlue / colors.strokeGreen / colors.strokeYellow / colors.strokeOrange
```

### Script Example

```javascript
import { writeFileSync } from "fs";
import { setSeed, box, arrow, textEl, colors, excalidraw, toSvg, toPng } from "excalidrawer";

setSeed(100000);
const CY = 150, BH = 56, BY = CY - BH / 2;

const elements = [
  textEl("title", 20, 12, 500, 28, "My Diagram", 22),
  ...box("s1", "s1t", 20, BY, 130, BH, colors.yellow, "Start", 15),
  arrow("a1", 150, CY, [[0,0],[40,0]]),
  ...box("s2", "s2t", 190, BY, 150, BH, colors.blue, "Process", 14),
];

writeFileSync("diagram.excalidraw", excalidraw(elements));
writeFileSync("diagram.svg", toSvg(elements));
writeFileSync("diagram.png", await toPng(elements, 2));
```

Run: `node diagram.mjs`

## Common Mistakes to Avoid

- **Do NOT** forget to spread `...box(...)` — it returns an array of two elements
- **Do NOT** reuse element IDs — use `setSeed()` with different values per diagram
- **Arrows**: `x, y` is the start point; `points` are relative offsets

## Export Format Decision

- Default to all three: `.excalidraw` + `.svg` + `.png`
- "for Markdown / GitHub" → `.svg`
- "for Lark / Notion / slides" → `.png`
- "I want to edit it" → `.excalidraw`

## References

- Package source: https://github.com/guohaonan-shy/excalidrawer
- Excalidraw element spec: https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/element/types.ts
