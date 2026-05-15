# Changelog

All notable changes to this project are documented here.

See [`docs/roadmap.md`](./docs/roadmap.md) for the forward-looking plan.

## 0.5.7

### Added

- **Sugar shorthand** (`src/sugar.mjs`) — terse `{ shape, at, size, fill, ... }`
  objects translate into full raw Excalidraw elements. Shapes auto-expand to a
  bound `[shape, text]` pair when `text` is non-empty. Arrow sugar has four
  forms:
  - L1 `{ from, to }` — auto sides + auto orthogonal route
  - L2 `{ from, to, fromSide, toSide, fromT?, toT? }` — pinned sides + sliding
    edge anchors
  - L3 `{ from, to, via, clearance? }` — U-route detour (`above` / `below` /
    `left` / `right`)
  - L4 `{ at, points }` — manual escape
- **Auto orthogonal routing** (`autoSides` + `orthoPath`) — pick sides by axis
  disjointness (vertical separation wins ties), then build a straight / L-bend
  / Z-route depending on whether the chosen sides are aligned, perpendicular,
  or parallel-with-offset. Never a bare diagonal.
- **Arrow style options** — `dashed`, `head:"arrow"|"none"`, `labelT` (0–1
  position of the auto-label along the path).
- **Raw passthrough normalizes** — partial raw elements get missing base fields
  (`opacity`, `strokeColor`, `groupIds`, ...) filled in by `base()`. Closes the
  silent "`opacity=NaN`" trap where a partially-specified raw element rendered
  as garbage.
- **`render(elements)` runs `desugar` before validation** — sugar and raw can
  freely mix in the same array.
- `desugar` and `SugarError` (with `.issues`) re-exported from the package root.
- Tests: `tests/sugar.test.mjs` (88 tests total, all green).

### Changed

- `generate -t <type>` now emits a **deprecation warning** to stderr — the
  command still works but will be removed in 0.6.0. Migrate to `render` with
  sugar or raw elements.
- `render_diagram` MCP/CLI tool description now documents the sugar schema.

### Notes

- Additive on the npm package side. `lib` (`src/index.mjs`) stays physically
  importable; CLI + MCP remain the supported public surface.
- The harold-skills plugin migration to *clarify → recipe → sugar → render* is
  tracked separately; plugin versioning decouples from the npm version from
  here on.

## 0.5.6

### Added

- **Shared tool registry** (`src/tools/`) — single source of truth feeding both
  public surfaces. Each tool is declared once with `defineTool`; the CLI and MCP
  server generate their interfaces from it, so they never drift.
  - `render_diagram` — render raw Excalidraw elements to files
  - `compute_layout` — dispatch the layout helpers (single tool, `helper` +
    flat `args`)
- **`render(elements, opts)`** (`src/render.mjs`) — the dumb serializer. Flattens
  + validates minimum element shape (`id` / `type`, no dupes), emits the
  requested formats. No "diagram kind" concept. Throws `ElementValidationError`
  with a per-index `issues` list on bad input.
- **`excalidrawer-mcp` MCP server** (`src/mcp.mjs`) — stdio transport, new `bin`.
  A thin protocol adapter over the shared registry; built on
  `@modelcontextprotocol/sdk`.
- **CLI `render` and `compute-layout` subcommands** — registry-backed, share the
  same tool `run` as the MCP server.
- Tests: `tests/render.test.mjs`, `tests/tools.test.mjs`.

### Notes

- Additive. `generate -t <type>` and `src/templates/` are untouched; existing
  skills on `@^0.5.4` need no update. `lib` (`src/index.mjs`) stays physically
  importable but, from this version on, the *supported* surface is CLI + MCP.

## 0.5.5

### Added

- **Layout helpers** (`src/layout.mjs`) — pure coordinate math, composable with
  the element factories:
  - `gridLayout(count, opts)` — regular grid positions
  - `chain(startXY, count, opts)` — evenly-spaced linear point sequence
  - `swimlane(lanes, items, opts)` — horizontal swimlane bands + item positions
  - `hubSpoke(centerXY, count, opts)` — radial hub-and-spoke positions
  - `edgePoint(target, side, t?)` — shape-aware edge attachment points
    (rectangle / diamond / ellipse)
  - `routeU(fromXY, toXY, opts)` — U-shaped detour path for back-edges / loops
  - `labelAnchor(absPoints, opts)` — pick a non-crossing label position on a path
  - `contrastText(hex)` — WCAG-AA black/white text color for a given fill
  - `triplet(key)` — resolve a color key to its `{ bg, mid, stroke }` tones
- Palette gaps filled: `bgOrange`, `bgGray`, `strokeRed`.
- `node:test` test suite (`tests/layout.test.mjs`); `npm test` now runs it.
- Helper visual demo (`examples/layout-helpers-demo.mjs`).

### Changed

- `swimlane` default `laneGap` is now `24` (was `0`) for clearer lane separation.

### Notes

- Fully additive. Templates and the `generate -t` CLI flag are unchanged;
  existing skills on `@^0.5.4` need no update.
