# excalidrawer roadmap

> Status: living document. Last updated for the 0.5.8 release.

## Vision

Let a user produce a diagram (flowchart / architecture / sequence / timeline / …)
through **natural language + a few clarifying questions** — no JSON, no code
visible to the user. An agent orchestrates: clarify intent → pick a recipe →
fill in coordinates via helpers → render → show the result.

## Architecture

```
┌─────────────────────────────────────────┐
│  Skill / Agent / External user          │
└───────┬──────────────────┬──────────────┘
        │                  │
   ┌────▼────┐        ┌─────▼─────┐
   │  CLI    │        │  MCP      │   ← the two PUBLIC interfaces
   │ wrapper │        │  server   │
   └────┬────┘        └─────┬─────┘
        └─────────┬─────────┘
                  │
          ┌───────▼───────┐
          │  src/lib/     │   ← INTERNAL engine. Not a public contract.
          │  elements     │      May be refactored freely.
          │  layout       │
          │  text         │
          │  export       │
          │  render       │
          └───────────────┘
```

Principles:

- **`lib` is the engine room, not a public API.** From 0.5.6 onward the
  supported surface is **CLI + MCP only**. `lib` may still be physically
  importable (CLI/MCP are built on it), but it is undocumented and unstable.
- **CLI and MCP are thin wrappers.** They do IO + protocol adaptation, no
  business logic.
- **`render` is a dumb serializer.** It takes an array of Excalidraw elements
  (raw or sugar) and emits files. It has no concept of "diagram kind".
- **Templates are not engine logic.** The "what a flowchart looks like"
  opinion moves out of the package and into skill-side **recipes** (markdown
  patterns the agent reads). This kills the "infinitely patch the template"
  trap: new diagram variants become new recipes, not engine changes.

## Versioning rule

- **0.5.x = template-compatible era.** All additive work (helpers, MCP, CLI
  `render`, sugar mode) ships as 0.5.x patches. `generate -t <type>` keeps
  working throughout.
- **0.6.0 = the breaking cut.** `generate -t` template dispatch is removed and
  `src/templates/` is deleted. This is the *only* breaking release; the minor
  bump signals it.

The npm package version and the harold-skills **plugin** version are
**decoupled from 0.5.7 onward**. The plugin declares a minimum npm capability
via `^` pins and re-pins only when it needs a new capability — it does not
track the package lock-step.

## Roadmap

| Version | npm package | harold-skills plugin | Compatibility |
|---|---|---|---|
| **0.5.5** | Layout helpers (`gridLayout`, `chain`, `swimlane`, `hubSpoke`, `edgePoint`, `routeU`, `labelAnchor`, `contrastText`, `triplet`); palette gaps filled (`bgOrange`, `bgGray`, `strokeRed`); `swimlane` default `laneGap: 24`; `node:test` suite; helper demo | **Untouched** — stays pinned at `@^0.5.4`. Helpers are groundwork for later versions, not consumed by current skills. | Additive |
| **0.5.6** ✅ | Shared tool registry (`src/tools/`, `defineTool`); `render(elements)` serializer; CLI `render` + `compute-layout` subcommands; `excalidrawer-mcp` MCP server (`bin`, stdio, `@modelcontextprotocol/sdk`). MCP surface = 2 tools (`render_diagram`, `compute_layout`). `generate -t` untouched. | **Untouched** — MCP server is on npm; validated by stdio JSON-RPC smoke test. | Additive |
| **0.5.7** ✅ | Sugar mode shipped: `desugar` translates `{ shape, at, size, fill, ... }` shorthand → full raw elements (4 arrow forms, auto orthogonal routing via `autoSides` + `orthoPath`, `dashed`/`head`/`fromT`/`toT`/`labelT`). Raw passthrough normalizes (closes the `opacity=NaN` trap). `generate -t` emits a deprecation warning. | **Migration in progress** (npm shipped; plugin side next). Plugin will: declare `mcpServers` in `plugin.json`, rewrite 4 SKILL.md to *clarify → recipe → sugar → render*, add `skills/<name>/recipes/*.md`, retire `custom-api.md`. **Plugin version decouples from npm version here.** | npm additive; skill internals change, user-facing triggers unchanged |
| **0.5.8** ✅ | Automatic CJK font support: `render()` detects CJK characters and loads a system CJK font (PingFang / Noto / YaHei) for PNG rendering; SVG output extends its font-family chain with common CJK family names. Latin-only diagrams unchanged. | Plugin migration shipped: skills repo rewrites `SKILL.md` to *clarify → recipe → sugar → render*; plugin version reset to 0.0.1 (decoupled). | Additive |
| **0.5.9+** | Bug fixes; mid-granularity MCP tools as needed | Recipe iteration based on real usage | Additive |
| **0.6.0** | Remove `generate -t` template dispatch; delete `src/templates/` | Remove residual template references; re-pin `@^0.6.0`; recipes are the only path | **Breaking** |

## Design notes

### Why 0.5.6 and 0.5.7 are split

0.5.6 lands the *package capability* (MCP server, raw `render`) while skills
stay on the old path. This validates "the MCP server starts, raw render works"
in isolation. 0.5.7 is when skills actually migrate. Package bugs and skill
bugs surface in separate rounds instead of tangled together.

### Why the shared tool registry (0.5.6)

Studied `open-pencil`'s MCP implementation: every tool is declared once with a
`defineTool` schema, and adapters generate the AI-chat, CLI, and MCP surfaces
from it (`ALL_TOOLS` is "used by MCP server and CLI"). We adopted the same
single-source pattern — `src/tools/` — so excalidrawer's two public surfaces
(CLI + MCP) can never drift, and adding a tool in 0.5.8+ is one definition, not
two hand-written wrappers.

What we did *not* copy: open-pencil ships ~30 tools because it edits a
**stateful live canvas** (CRUD on a scene graph — `updateNode`, `setFill`,
`reparentNode`, …). excalidrawer is **stateless one-shot** (compose JSON →
render files), so the tool surface is intentionally tiny: `render_diagram`
(create + emit) and `compute_layout` (one dispatch tool for the geometry
helpers, analogous to open-pencil's `calc`). `contrastText` / `triplet` stay
out of the tool surface — they belong in skill recipes' color guidance.

### JSON input: sugar + raw (0.5.7)

- **Raw** — 1:1 with Excalidraw element schema. Verbose, but copy-pasteable
  from Excalidraw web exports. The escape hatch. Partial raw elements get
  missing base fields auto-filled (no more silent `opacity=NaN`).
- **Sugar** — semantic shorthand. The 90% path:
  - shape: `{ shape:"rect"|"diamond"|"ellipse"|"text", id?, at, size, fill?,
    stroke?, dashed?, text?, fontSize? }` — non-empty `text` auto-binds a
    centered child.
  - arrow: `{ shape:"arrow", from, to, fromSide?, toSide?, fromT?, toT?, via?,
    head?, dashed?, labelT?, text? }`.

### Arrow auto-routing (0.5.7)

Spike work across the 4 diagram types surfaced that "diagonal arrow between
non-aligned edge points" is the dominant ugliness mode. So id-anchored arrows
now auto-route orthogonally:

- `autoSides(fromBox, toBox)` picks sides by **axis disjointness** (two boxes
  vertically separated → vertical connection regardless of horizontal offset),
  falling back to center-delta magnitude only when boxes overlap on both axes.
- `orthoPath(start, end, fromSide, toSide)` builds:
  - **straight** when the edge points are axis-aligned;
  - **L-bend** when the two sides are perpendicular;
  - **Z-route** (two turns at the travel-axis midpoint) when sides are parallel
    with a perpendicular offset — so the arrow leaves and arrives along its
    sides' normals.

Recipes still drive *which* sides to use (e.g. flowchart back-edges:
perpendicular pair → L-bend; sequence: explicit message direction). The engine
only guarantees that the chosen sides resolve to a clean orthogonal path.

### Recipes vs templates

Templates baked diagram opinions into the engine, so every new variant meant an
engine change. Recipes are markdown patterns living in the skills repo: the
agent reads the relevant recipe, then composes element JSON using helpers for
coordinates. New variants = new recipes, zero engine churn. Recipes live in
`skills/<name>/recipes/*.md` (skill-specific, not plugin-shared).
