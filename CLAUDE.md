# excalidrawer

Code-first Excalidraw diagram generation — CLI, MCP server, built-in templates, and SVG/PNG export. No browser required. Pure ESM (`"type": "module"`), Node.

## Entry points

- **Library** — `import 'excalidrawer'` (`src/index.mjs`); subpath `excalidrawer/templates`.
- **CLI** — `excalidrawer` bin → `src/cli.mjs`. Commands: `render`, `compute-layout`, `generate`, `types`.
- **MCP server** — `excalidrawer-mcp` bin → `src/mcp.mjs`. stdio server exposing `render_diagram` and `compute_layout`.

The `render` / `compute-layout` CLI commands and the MCP tools share the exact same tool definitions (`src/tools/`), so the two surfaces never drift.

## Dev commands

```bash
npm test              # node --test tests/*.test.mjs
npm run test:example  # node examples/basic.mjs
```

## Source layout

- `src/elements.mjs` — primitive builders: `box`, `diamondBox`, `arrow`, `textEl`, `rect`, `ellipse`.
- `src/layout.mjs` — layout helpers: `row`, `grid`, plus gridLayout / chain / swimlane / hub-and-spoke / edge anchors / U-routing / label anchors.
- `src/sugar.mjs` — sugar shorthand element parsing.
- `src/render.mjs` — serializes elements to the render output.
- `src/export.mjs` — `excalidraw()` (JSON), `toSvg()` (embedded fonts), `toPng()` (resvg-js native).
- `src/text.mjs`, `src/fonts/` — text measurement + font handling (auto-loads system CJK font for Chinese/Japanese/Korean text).
- `src/templates/` — `timeline`, `flowchart`, `architecture`, `sequence`.
- `src/tools/` — shared MCP/CLI tool definitions.
- `tests/` — `node --test` files: cjk, layout, render, sugar, tools.
- `skills/` — Claude Code skills, one folder per diagram type (`excalidrawer-flowchart`, `excalidrawer-timeline`, `excalidrawer-architecture`, `excalidrawer-sequence`) plus `excalidrawer-shared` (a non-triggering reference pack: `references/{conventions,sugar,colors}.md`). Skill names are prefixed `excalidrawer-` so they don't collide with other authors' generic `flowchart`/`timeline` skills when installed standalone via skills.sh. Each diagram skill links into the shared pack via relative paths (`../excalidrawer-shared/references/…`) and reads its own `recipes/<type>.md`. Installable standalone via `npx skills add guohaonan-shy/excalidrawer` (skills.sh). This is a *copy* of the canonical plugin in the [harold-skills](https://github.com/guohaonan-shy/harold-skills) marketplace — keep both in sync when editing skill content. The skills.sh channel does not auto-configure MCP, so the shared skill documents the `claude mcp add excalidrawer` prerequisite.

## CLI usage

```bash
# Render sugar / raw Excalidraw elements to files (.excalidraw + .svg + .png by default)
excalidrawer render -i elements.json -o docs/diagram
cat elements.json | excalidrawer render -o docs/diagram -f svg,png

# Compute layout coordinates (prints JSON)
excalidrawer compute-layout --helper gridLayout -a '{"count":6,"cols":3,"cellW":140,"cellH":50}'

# Generate from a built-in template; list types
excalidrawer generate -t timeline -i data.json -o docs/timeline
excalidrawer types
```

`render` accepts either a bare element array or `{ "elements": [...] }`.

## Built-in templates

| Type | Input shape |
|------|-------------|
| `timeline` | `{ title, items: [{ label, time, desc, color? }] }` |
| `flowchart` | `{ title?, direction?, nodes: [{ id, label, type?, color? }], edges: [{ from, to, label? }] }` (node types: `start`, `end`, `process`, `decision`, `io`) |
| `architecture` | `{ title?, sections: [{ label, color?, items }], connections? }` |
| `sequence` | `{ title?, actors: [{ label, color? }], steps: [{ actor, text, from?, arrow?, style? }] }` |

## Library API

```javascript
import { setSeed, box, arrow, textEl, colors, excalidraw, toSvg, toPng } from "excalidrawer";

setSeed(100000);
const elements = [
  textEl("title", 20, 12, 500, 28, "My Flow", 22),
  ...box("s1", "s1t", 20, 92, 130, 56, colors.yellow, "Start", 15),
  arrow("a1", 150, 120, [[0,0],[40,0]]),
  ...box("s2", "s2t", 190, 92, 150, 56, colors.blue, "Process", 14),
];
writeFileSync("diagram.excalidraw", excalidraw(elements));
writeFileSync("diagram.svg", toSvg(elements));
writeFileSync("diagram.png", await toPng(elements, 2));
```

Colors: `colors.blue/green/yellow/purple/red/orange/gray`, `colors.bg*` (section backgrounds), `colors.stroke*` (stroke accents).

## Notes

- `arrow` points are relative `[dx, dy]` offsets from the arrow's `x, y` origin.
- PNG rendering uses `@resvg/resvg-js` (fast native, no headless browser).
- The Claude Code **skills** ship two ways: as a copy in `skills/` here (installable via `npx skills add`, skills.sh channel) and as a plugin in the [harold-skills](https://github.com/guohaonan-shy/harold-skills) marketplace (auto-configures MCP; new skill features land there first). This npm package (CLI + library + MCP) is the canonical home for the engine.
- Version lives in `package.json` (currently 0.5.8); changes tracked in `CHANGELOG.md`.
