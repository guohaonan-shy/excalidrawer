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
- `skills/` — one skill per diagram type plus a shared base, modeled on [lark-cli](https://github.com/larksuite/cli/tree/main/skills):
  - `skills/shared/` — the read-first base. `SKILL.md` holds every cross-cutting rule (MCP precheck + CLI fallback, output naming, label language, export-format selection, render call, iteration); `references/` holds `sugar.md` + `colors.md`. Its description is deliberately non-triggering so it is not invoked as a standalone diagram skill.
  - `skills/excalidrawer-{flowchart,timeline,architecture,sequence}/` — each declares a **前置条件: read `../shared/SKILL.md` first** (live sibling, lark-style), then adds only its own clarify questions + `references/<type>.md` recipe. Recipes reference the shared schema at `../../shared/references/sugar.md`.
  - **Why live sibling, not self-contained copies:** a whole-repo / plugin install lays all skill folders flat as siblings under `.agents/skills/`, so `../shared/` resolves. The only degraded path is `npx skills add … --skill <one>`, which pulls a single folder and leaves the sibling ref dangling — so the README steers users to install everything (plugin or whole-repo) and documents installing `shared` alongside any single skill. This keeps shared docs single-source (no 4× duplication, no sync script).
  - Skills do NOT configure MCP; `shared/SKILL.md` §1 documents the `claude mcp add excalidrawer -- excalidrawer-mcp` prerequisite.
- `.claude-plugin/` (`plugin.json` + `marketplace.json`, `source: "."`), `.cursor-plugin/`, `.codex-plugin/` — multi-platform plugin manifests (superpowers-style) that bundle the whole `skills/` folder. Plugin version starts at `0.0.1`, independent of the npm package version. The plugin path and the per-skill `npx skills add` path share the same `skills/` source — one source, two install surfaces.

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
- This repo is the open-source home for the **npm package (CLI + library + MCP) and the diagram skills** under `skills/`. The skills install two ways from the same source: as a multi-platform **plugin** (`.claude-plugin/` / `.cursor-plugin/` / `.codex-plugin/`) or à la carte via **`npx skills add`** (skills.sh channel). A separate, more elaborate skill set also lives in the personal [harold-skills](https://github.com/guohaonan-shy/harold-skills) marketplace; the two share a common ancestor but iterate independently (see memory).
- Version lives in `package.json` (currently 0.5.8); changes tracked in `CHANGELOG.md`.
