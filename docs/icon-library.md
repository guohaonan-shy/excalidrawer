# Design note: hand-drawn-style icon primitives

**Status:** planned — direction agreed 2026-08-17, not yet scheduled to a
version. Related to [`component-layer.md`](component-layer.md) (tracked as
its own issue since it's a primitive-content problem, not a layout-math
problem).

## Motivation

[cathrynlavery/diagram-design](https://github.com/cathrynlavery/diagram-design)
ships `primitive-icons.md`: a 55-icon monochrome `currentColor` SVG library
(Tabler Icons MIT + Simple Icons CC0), organized by category (Compute,
People, Network, Data, Kubernetes, …), copy-pasted into their generated HTML.

That doesn't transfer directly. Their whole output is flat SVG, so a flat
icon fits. **Excalidrawer's identity is the hand-drawn roughjs rendering** —
pasting a clean flat glyph into a sketchy diagram would look visibly out of
place, a seam every other shape doesn't have.

## What "matching our style" means

To actually match, an icon needs to render through Excalidraw's own sketchy
rendering path — authored as a `line`/`freedraw` element (a `points` array),
not an embedded flat SVG or raster image. That's a real primitive-content
problem: geometry, not layout.

## Candidate approaches

1. **Hand-author a small curated set** directly as Excalidraw `line` point
   arrays — perfect style match, but slow to grow; realistically a fixed
   small library (server, database, cloud, user/actor, queue, API/gateway,
   cache, storage, browser, lock, warning, check, loop-arrow — the common
   architecture/dataflow vocabulary).
2. **Path-to-polyline conversion** from an existing monochrome icon set
   (e.g. Tabler Icons, MIT) — sample an SVG path into a polyline for a `line`
   element. Gets breadth, but needs enough fidelity that the icon still
   reads correctly at typical in-diagram scale (~24–40px); worth a spike
   before committing to it as the primary path.
3. **Flat escape hatch** — Excalidraw's `image` element (base64 in `files`)
   can embed an icon exactly, un-sketchy. Not a style match, but simple and
   exact; could exist as an explicit "flat mode" a recipe opts into when
   fidelity matters more than consistency, distinct from the sketchy
   primitive set.

## Relation to the component layer (#15)

Icons are content that gets placed *inside* a component's slot — an
architecture item card with a leading icon, a data-platform node type icon —
not a layout concern by themselves. Worth sequencing alongside or after the
`stack`/pack work so icon placement has a slot to sit in rather than another
set of hand-positioned coordinates.

## Scope for v1

Start with approach 1 — a small hand-authored set (~15–20 icons) covering
the architecture/data-platform vocabulary — rather than committing to
automated conversion (approach 2) up front.

## Open questions

- Where do these live in code — `src/icons.mjs` exporting point-array
  builders, or sugar shorthand (`{ shape: "icon", name: "server", at, size }`)?
- Do icons recolor via the existing `colors` palette (stroke color), same as
  other elements?
- Should `validate.mjs` (the Layer A linter) know about icons for
  overlap/contrast checks, or treat them as opaque content?
- If approach 2 is ever pursued: Tabler Icons (MIT) / Simple Icons (CC0) are
  fine as a *shape reference* to re-derive simplified stroke paths from —
  not redistributing their SVG files as-is.
