# Design note: draw.io import

**Status:** planned — direction agreed 2026-08-17, not yet scheduled to a
version. Written after reading
[cathrynlavery/diagram-design](https://github.com/cathrynlavery/diagram-design)'s
`scripts/drawio_extract.py` (MIT licensed — ~850 lines).

Split out from [`mermaid-import.md`](mermaid-import.md): same "redraw, never
convert" framing (discard source coordinates/palette/fonts, keep
content/relationships/grouping), but a materially different parsing problem —
draw.io's real container formats, not a text DSL — so tracked as its own
effort rather than a line item in the Mermaid work.

## Why this is harder than Mermaid

`.drawio` isn't one format. Their extractor has to handle:

- Raw XML `mxfile`/`mxGraphModel`
- The deflate + base64 + urlencode payload draw.io actually writes by default
- PNG with an embedded `mxfile` metadata chunk (walking the PNG chunk stream)
- SVG with an embedded `content` attribute
- Geometry resolution through the parent-chain-relative `mxGeometry` (a
  node's absolute position depends on its ancestors, not just its own record)
- Shape-family classification (AWS/Azure/GCP/Kubernetes/Cisco/BPMN/ER/UML
  icon vocabularies, swimlanes, tables, lifelines)

Plus untrusted-input hardening they explicitly built for: XXE guard (reject
DTD/ENTITY declarations), zip-bomb guard (cap decompression size).

## Scope, if pursued

Same target shape as Mermaid: extractor → structured IR → map onto an
existing skill's template input (`architecture`, `flowchart`, or whichever
their type-guessing heuristic — sequence/er/swimlane/flowchart/state/
architecture/nested/tree — lands on) → deterministic `render`, not an
LLM hand-redraw step.

## Open questions

- Is the multi-format decoding (XML / deflate-payload / PNG-embedded /
  SVG-embedded) worth reimplementing, or is there a lighter-weight path (e.g.
  only support the most common export format and document the rest as
  unsupported)?
- How much of their shape-family classification table is worth porting vs.
  starting narrower (plain boxes/arrows only, no icon-family detection) for a
  first cut?
- Lower priority than [`mermaid-import.md`](mermaid-import.md) — sequence
  after Mermaid ships and reuse whatever IR→template plumbing that work
  produces.
