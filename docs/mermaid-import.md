# Design note: Mermaid import

**Status:** planned — direction agreed 2026-08-17, not yet scheduled to a
version. Written after reading [cathrynlavery/diagram-design](https://github.com/cathrynlavery/diagram-design)'s
`scripts/mermaid_extract.py` (MIT licensed — ~1300 lines, parses Mermaid text
into a structured IR digest).

## What we can do that they can't

diagram-design's pipeline stops at "text → structured IR digest for the LLM
to read" — the LLM then hand-writes SVG from that digest, following their
"redraw, never convert" philosophy. We can go one step further: **text → IR
→ our existing sugar/template input shape → deterministic `render`**. No
hand-redrawing step, because the layout engine already computes coordinates.

Mermaid `flowchart`/`graph` maps almost directly onto the `flowchart` skill's
`{nodes, edges}` template input; `sequenceDiagram` maps onto `sequence`'s
`{actors, steps}`.

## Scope for v1

- `flowchart` / `graph` → `flowchart` skill
- `sequenceDiagram` → `sequence` skill

Deferred, lower ROI right now:

- `stateDiagram-v2`, `erDiagram` — would need the corresponding skill to
  exist first (see [`diagram-types.md`](diagram-types.md) for state; ER isn't
  currently on the list).

draw.io import is a separate effort — see
[`drawio-import.md`](drawio-import.md) — not scoped into this one even though
the two share the same "redraw, never convert" framing.

## Open questions

- Where does parsing live — a new CLI subcommand
  (`excalidrawer import-mermaid`), an MCP tool, or a skill-level step that
  reads Mermaid source and hands structured JSON to the existing
  `render_diagram` tool?
- Their extractor is worth reading for the hard parts (shape-delimiter
  classification, edge-operator styles, subgraph/container handling,
  resource caps against pathological input) even though our target output
  differs — port ideas, not necessarily code.
