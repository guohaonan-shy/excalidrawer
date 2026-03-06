---
name: excalidrawer
description: 'Code-first Excalidraw diagram generation with SVG and PNG export. Use when asked to "create a diagram", "draw a flowchart", "generate an architecture diagram", "export diagram to SVG", "export diagram to PNG", or "visualize a process". Produces .excalidraw, .svg, and .png files using the excalidrawer npm package — no browser required.'
---

# Excalidrawer

A code-first diagram generation skill. Instead of generating raw Excalidraw JSON directly, this skill writes a short JavaScript file using the `excalidrawer` npm package, then executes it locally to produce `.excalidraw`, `.svg`, and `.png` outputs.

## Why Code-First

- **Faster**: LLM writes ~30 lines of JS instead of 500+ lines of raw JSON
- **Correct**: coordinates managed by variables, text centering handled automatically
- **Reusable**: diagrams live as readable source code, easy to update
- **Exportable**: one script produces all three formats in one run

## Prerequisites

Install the package in your project:

```bash
npm install excalidrawer
```

Or run examples without installing:

```bash
npx excalidrawer examples/basic.mjs
```

## Core API

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
} from 'excalidrawer';
```

## Color Palette

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

## Step-by-Step Workflow

### Step 1: Understand the diagram request

Identify:
- Diagram type (flowchart, architecture, sequence, ER, mind map)
- Key nodes and their relationships
- Approximate number of elements

### Step 2: Plan layout

Use horizontal left-to-right flow for most diagrams:
- Main flow center Y: pick a `CY` value (e.g. 150)
- Box height: 50–60px, width: 120–160px depending on label length
- Horizontal gap between boxes: 30–50px
- Decision diamonds: `w ≈ 160, h ≈ 70`

For multi-section diagrams, stack sections vertically with section background `rect`.

### Step 3: Write the generation script

```javascript
import { writeFileSync } from "fs";
import { setSeed, box, diamondBox, arrow, textEl, rect, colors, excalidraw, toSvg, toPng } from "excalidrawer";

setSeed(100000); // use a different base per diagram

const CY = 150, BH = 56, BY = CY - BH / 2;

const elements = [
  // title
  textEl("title", 20, 12, 500, 28, "My Diagram", 22),

  // nodes
  ...box("s1", "s1t", 20, BY, 130, BH, colors.yellow, "Start", 15),
  arrow("a1", 150, CY, [[0,0],[40,0]]),
  ...box("s2", "s2t", 190, BY, 150, BH, colors.blue, "Process", 14),
  arrow("a2", 340, CY, [[0,0],[40,0]]),
  ...diamondBox("d1", "d1t", 380, CY-35, 160, 70, colors.orange, "Decision?", 13),

  // Yes branch
  arrow("ayes", 540, CY, [[0,0],[40,0]], { strokeColor: colors.strokeGreen }),
  ...box("s3", "s3t", 580, BY, 130, BH, colors.green, "Done", 15),
];

writeFileSync("diagram.excalidraw", excalidraw(elements));
writeFileSync("diagram.svg", toSvg(elements));
const png = await toPng(elements, 2);
writeFileSync("diagram.png", png);
```

### Step 4: Run the script

```bash
node diagram.mjs
```

### Step 5: Choose output format by use case

| Use case | Format | Reason |
|----------|--------|--------|
| Embed in Markdown / GitHub | `.svg` | Vector, scales perfectly |
| Paste into Lark / Notion / Slides | `.png` | Universal compatibility |
| Edit interactively | `.excalidraw` | Open at excalidraw.com |

## Layout Patterns

### Horizontal flowchart (most common)

```javascript
const CY = 150, BH = 56, BY = CY - BH / 2;
// place boxes left to right, connecting with arrow(id, rightEdgeX, CY, [[0,0],[gap,0]])
```

### Multi-section stacked layout

```javascript
// Section A at y=40, Section B at y=320
const SEC_A_Y = 140; // center Y of section A flow
const SEC_B_Y = 420; // center Y of section B flow

// Section backgrounds
rect("bg-a", 10, 40, 1200, 260, colors.bgYellow, { strokeColor: colors.strokeYellow, strokeStyle: "dashed" })
rect("bg-b", 10, 320, 1200, 280, colors.bgBlue,   { strokeColor: colors.strokeBlue,   strokeStyle: "dashed" })
```

### Decision diamond with Yes/No branches

```javascript
// Diamond center at (cx, cy)
...diamondBox("d1", "d1t", cx - 80, cy - 35, 160, 70, colors.orange, "Ambiguous?", 13),

// No → right (auto-link)
arrow("ano", cx + 80, cy, [[0,0],[40,0]], { strokeColor: colors.strokeGreen }),
textEl("lno", cx + 84, cy - 14, 28, 12, "No", 10, { strokeColor: colors.strokeGreen }),
...box("auto", "autot", cx + 120, cy - 28, 140, 56, colors.green, "Auto-link", 13),

// Yes → down (human in loop)
arrow("ayes", cx, cy + 35, [[0,0],[0,30]], { strokeColor: colors.strokeOrange }),
textEl("lyes", cx + 4, cy + 38, 28, 12, "Yes", 10, { strokeColor: colors.strokeOrange }),
...box("hitl", "hitlt", cx - 70, cy + 65, 140, 52, colors.green, "User Confirms", 13),
```

## Common Mistakes to Avoid

- **Do NOT** use `verticalAlign: "top"` on bound text (it's set correctly inside `box()` and `diamondBox()`)
- **Do NOT** forget to spread `...box(...)` — it returns an array of two elements
- **Do NOT** reuse element IDs across diagrams — use `setSeed()` with a different value per diagram
- **Arrows**: `x, y` is the arrow start point; `points` are relative offsets from that start

## Export Format Decision

When the user asks to export a diagram without specifying format:
- Default to all three: `.excalidraw` + `.svg` + `.png`
- If user says "for Markdown" or "embed in docs" → `.svg`
- If user says "for Lark / Notion / slides" → `.png`
- If user says "I want to edit it" → `.excalidraw`

## References

- Package source: https://github.com/guohaonan-shy/excalidrawer
- Excalidraw element spec: https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/element/types.ts
