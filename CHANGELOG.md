# Changelog

All notable changes to this project are documented here.

See [`docs/roadmap.md`](./docs/roadmap.md) for the forward-looking plan.

## 0.5.12

_engine 0.5.12 · plugin 0.0.3_

### Changed

- **`box()` / `diamondBox()` are now correct by construction.** They wrap the
  label to the box's inner width and grow the box height to contain it (only
  when needed — a short label in a roomy box is untouched), so bound text no
  longer spills out the bottom or sides. Previously only the sugar path did this;
  the raw primitives (used by templates and library callers) placed text at the
  container's fixed size and relied on the renderer, so a long label overflowed.
  `h` is now a floor, not a fixed height — callers that positioned elements
  directly below a `box()` assuming a fixed height may need to read the returned
  rect height.
- The wrap-and-grow logic is extracted into a single source of truth,
  `fitBoundText(text, boxW, boxH, fontSize) → { text, height }` (exported from
  the package root), shared by `box`/`diamondBox` and the sugar path. Layer A's
  `TEXT_OVERFLOW_X` lint now only fires on the true residual: an unbreakable
  token (long URL/word) wider than a fixed box, or hand-authored raw elements.

### Version alignment

- Plugin manifests bumped and unified to **0.0.3** across `.claude-plugin`,
  `.cursor-plugin`, and `.codex-plugin` (cursor/codex had drifted at 0.0.1) —
  they bundle `skills/`, whose §7.5 quality gate changed in 0.5.11.
- The MCP dependency pin (`.claude-plugin/plugin.json`) and the SKILL.md CLI
  fallback commands are lifted to `excalidrawer@^0.5.11` — the floor where the
  `warnings` field the §7.5 gate depends on first appears.

## 0.5.11

### Added

- **Deterministic quality linter (`validate`)** — a geometry safety net that runs
  automatically on every `render` / `render_diagram` success and returns a
  non-fatal `warnings` array (only when something is wrong). Catches the defects
  that repeatedly make AI-generated diagrams look wrong:
  - `TEXT_OVERFLOW_X` / `TEXT_OVERFLOW_Y` — a label wider/taller than its box
    (the root cause of "text not centered": it centers but spills past the border).
  - `SHAPE_OVERLAP` — two shapes partially overlap (full containment / nesting is
    left alone as intentional).
  - `ARROW_CROSSES_SHAPE` — a node-to-node connector runs through a module it
    doesn't connect ("line over a module"). Backbone lines (timeline axis,
    sequence lifelines) are excluded — only arrows anchored to a shape at both
    ends are checked.
  - `LOW_CONTRAST` — label vs fill contrast below WCAG 3:1 (unreadable label),
    via relative-luminance math.
  - `DEGENERATE_ARROW` — an arrow with < 2 real points or start ≈ end.

  Each warning is `{ code, ids, message }` with an actionable fix. Exported as
  `validate(elements)` for library use. All four built-in templates lint clean.
- **Two-layer skill quality gate** — `skills/shared/SKILL.md` §7.5 codifies that a
  diagram is done only when BOTH pass: Layer A (resolve every lint `warning`) and
  Layer B (a required visual self-check — `Read` the PNG and score it PASS/FAIL
  against an explicit rubric, loop until clean). Layer B runs at the skill/agent
  layer using the model's own vision; the package stays deterministic and
  LLM-free.

## 0.5.10

### Added

- **`fitContainer` and `titledBox` layout helpers** (exposed via `compute_layout`).
  Both are pure coordinate math, consistent with the other layout helpers.
  - `fitContainer({ children, padding?, minW?, minH? })` → `{x,y,w,h}` sizes a
    container to wrap already-placed children with **equal padding on all four
    sides, including the bottom** — the edge most often left flush against the
    content or floating in a loose gap when a container height was hand-authored.
  - `titledBox({ x, y, w, title, body?, titleFontSize?, bodyFontSize?, padding?, gap? })`
    → `{ box, title, body }` geometry for a header line over a body block (e.g. a
    bullet list) inside one auto-sized rect, with the header and body free to use
    different font sizes (the case a single bound-text box can't express). Render
    `rect(box)` first, then the two `textEl`s on top.
  - The flowchart and architecture recipes now point to these helpers instead of
    hand-sizing content boxes.

## 0.5.9

### Added

- **`textColor` on shape sugar** — a `textColor` field (palette key or
  `#rrggbb`) colors a shape's label. Before this, `stroke` only reached the
  shape border, so bound text always rendered the default ink (`#1e1e1e`) and
  the only way to color a label was to hand-author a raw text element. Now
  `textColor` applies to both a standalone `text` shape and the bound text of a
  rect / diamond / ellipse; `stroke` still controls the border independently.
  Unknown values raise a `SugarError` like other color fields.

### Fixed

- **Bound text no longer overflows its box.** The SVG renderer (`renderBoundText`)
  splits bound text only on existing `\n` and never re-wraps to the container,
  so a label longer than its box rendered as one centered line spilling out
  both sides (and tall text spilled below). Only the template generators
  pre-wrapped; hand-composed sugar got raw text. The sugar path now wraps bound
  text to the box's inner width and grows the box height (and its bbox, so
  arrows stay anchored) to contain the vertically-centered lines — growing only
  when the text needs the room; short labels in roomy boxes are untouched.

### Tests

- `tests/sugar.test.mjs`: `textColor` (bound text, standalone text, palette key,
  unknown value) and bound-text wrapping + height-growth + untouched-short-label.

## 0.5.8

### Added

- **Automatic CJK font support** (`autoRegisterCjkFont` in `src/export.mjs`).
  When element text contains Chinese / Japanese / Korean characters,
  `render()` discovers the first available system CJK font (PingFang on
  macOS, Noto Sans CJK / WenQuanYi on Linux, Microsoft YaHei / SimSun on
  Windows) and registers it with `resvg-js` so PNG output renders CJK
  glyphs instead of empty boxes. Latin-only diagrams pay nothing.
- SVG output extends its `font-family` chain with common CJK family names
  (`PingFang SC`, `Hiragino Sans`, `Noto Sans CJK SC`, `Microsoft YaHei`,
  ...) so the viewer's locally installed CJK font picks up the glyphs —
  without bloating the SVG with a multi-MB embedded font.
- `autoRegisterCjkFont` re-exported from the package root. Library users
  calling `toSvg`/`toPng` directly can invoke it themselves.
- Tests: `tests/cjk.test.mjs`.

### Notes

- Auto-loaded CJK fonts are **not** embedded in SVG (a full PingFang.ttc
  is ~25 MB). For fully portable SVG (renders on systems without CJK
  fonts), call `registerFonts(["/path/to/font.ttc"])` manually — that
  path is embedded as a `@font-face` data URL.

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
