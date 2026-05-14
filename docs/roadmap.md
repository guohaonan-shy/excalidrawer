# excalidrawer roadmap

> Status: living document. Last updated for the 0.5.6 release.

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
| **0.5.7** | Sugar JSON mode (shorthand → raw translation); `generate -t` emits a deprecation warning; bug fixes surfaced by skill migration | **Migration starts.** `plugin.json` declares `mcpServers`; 4 SKILL.md rewritten to the *clarify → helper → compose → render* flow; `skills/<name>/recipes/*.md` added; `custom-api.md` retired (the "write custom JS" path is gone — the escape hatch becomes raw-elements JSON). **Plugin version decouples from npm version here.** | npm additive; skill internals change, user-facing triggers unchanged |
| **0.5.8+** | Bug fixes; mid-granularity MCP tools as needed | Recipe iteration based on real usage | Additive |
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

### JSON input: sugar + raw

- **Raw** — 1:1 with Excalidraw element schema. Verbose, but copy-pasteable
  from Excalidraw web exports. The escape hatch.
- **Sugar** — semantic shorthand (`{ shape: "rect", at: [x,y], size: [w,h],
  fill: "blue", text: "..." }`). The 90% path. `render` translates sugar → raw
  internally.

### Recipes vs templates

Templates baked diagram opinions into the engine, so every new variant meant an
engine change. Recipes are markdown patterns living in the skills repo: the
agent reads the relevant recipe, then composes element JSON using helpers for
coordinates. New variants = new recipes, zero engine churn. Recipes live in
`skills/<name>/recipes/*.md` (skill-specific, not plugin-shared).
