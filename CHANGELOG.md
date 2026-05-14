# Changelog

All notable changes to this project are documented here.

See [`docs/roadmap.md`](./docs/roadmap.md) for the forward-looking plan.

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
