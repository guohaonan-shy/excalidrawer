# Design note: new diagram types

**Status:** planned — direction agreed 2026-08-17, not yet scheduled to a
version. Written after reading
[cathrynlavery/diagram-design](https://github.com/cathrynlavery/diagram-design)
(27 diagram types, no code renderer — see the contrast noted in
[`component-layer.md`](component-layer.md)).

## Candidate types

Prioritized for near-term addition (own-use cases first):

- **State machine** — states + transitions + guards
- **Tree** — parent → children hierarchy
- **Pyramid / funnel** — ranked hierarchy or drop-off
- **Bar chart** — categorical comparison
- **Line chart** — trend over time
- **High-level** — end-to-end data-stack view (variant of `architecture`)

## Selection principle

Not every type in diagram-design's 27 is worth porting. Prefer types where:

1. Hand-drawn Excalidraw style is a genuine fit (not fighting the medium), and
2. The geometry can be constructed correctly by our existing layout helpers
   (`gridLayout`, `chain`, `swimlane`, `equalize`, …) rather than eyeballed.

Bar/line charts are a deliberate exception — they're on the list because
they're a real personal use case, not because hand-drawn style helps them.
Scope them narrowly (simple categorical/trend charts, not axis-precise data
viz) rather than trying to become a charting library.

## Open questions

- Each new type = a new skill folder under the current per-type-skill
  architecture, unless it's better framed as a recipe variant of an existing
  skill (e.g. "high-level" as an `architecture` recipe variant rather than a
  standalone skill — depends on how much its layout actually differs).
- Composite types (tree, pyramid) likely need the `stack`/pack primitives
  discussed in [`component-layer.md`](component-layer.md) before their
  recipes can avoid hardcoded geometry — sequence these together, not
  independently.

## Example gallery

Bundled with the type work, not a separate effort: as types are added,
"what does this look like" needs a browsable answer — for us (regression
eyeballing) and for anyone evaluating the project. Prompted by
diagram-design's own tabbed gallery
(https://cathrynlavery.github.io/diagram-design/) — a static page with one
example per diagram type.

Candidate approach:

- One example `.svg` (and maybe `.png`) per skill/type, generated
  deterministically (`setSeed` + fixed input), committed or built as a step.
- `examples/comparison-figures.mjs` (referenced in
  [`component-layer.md`](component-layer.md)) is already this pattern for
  `comparison` — extend the same idea to every skill instead of introducing a
  new mechanism.
- A static page (self-contained HTML, no build step) embedding those SVGs,
  hosted via GitHub Pages — mirrors diagram-design's approach, adapted to our
  output being real `.excalidraw`/`.svg` rather than hand-authored HTML.

Open questions specific to the gallery:

- Regenerated on every release vs. committed once per type and refreshed
  manually?
- Does this live in this repo (`docs/gallery/` + Pages) or become its own
  small static site?
- Should it double as the fixture set for [`agent-eval.md`](agent-eval.md)'s
  "known-good target" comparisons, so one asset serves both display and
  regression testing?
