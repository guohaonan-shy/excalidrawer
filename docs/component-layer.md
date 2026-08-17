# Design note: the missing component layer

**Status:** planned — direction agreed 2026-08-17, not yet scheduled to a
version; tracked from the [README roadmap](../README.md#roadmap). Written
2026-08-13, after the 0.5.13 work (`equalize`) surfaced the same problem
three times. Updated 2026-08-17: reading [cathrynlavery/diagram-design](https://github.com/cathrynlavery/diagram-design)
confirmed this is a real differentiator, not wasted effort — they have *zero*
code-level components (SVG idioms copy-pasted per type in markdown,
consistency enforced by 9 post-hoc CI linters). `equalize`/`stack` construct
correctly by design instead of catching drift after the fact. The composite
types in [`diagram-types.md`](diagram-types.md) — tree (recursive stack),
pyramid (tapered stack) — will need this layer to avoid the same hardcoded-
geometry trap the architecture/comparison recipes hit; sequence that work
together rather than adding types first and components later.

## The observation

Across the five skill recipes, the same structure keeps being described in
prose: **a container holding a row or stack of children, sized by measuring
those children.**

- `architecture` — a tier band: label + a horizontal row of item cards
- `comparison` — a side's shell: header + a vertical stack of row cards
- `comparison` (Layout C) — a column shell: two sub-cards side by side, then a
  footer row
- `timeline` — a milestone card: time label + title + desc
- `sequence` — an actor header + the lifeline dropping from it

These are components in everything but name. They are currently expressed at
three different layers, at three very different fidelities:

| layer | form | state |
|---|---|---|
| `src/templates/*.mjs` | real components — the arithmetic is in code | correct, but each template owns a **whole diagram**; not composable, and `generate` is deprecated for 0.6.0 |
| `src/layout.mjs` | pure geometry helpers | composable, but they only cover the pieces (`gridLayout`, `swimlane`, `titledBox`, `fitContainer`, `equalize`) |
| `skills/*/references/*.md` | components described in prose, assembled by the model at runtime | adapts to intent — but where the math is missing it **degrades into magic numbers** |

That last row is the concrete problem. From the architecture recipe today:

```text
laneW: LANE_W, laneH: 100, itemW: 160, itemH: 56       ← hardcoded
chain({ start: { x: startX, y: cell.y + 80 }, ... })   ← hardcoded
"items y = cell.y + 80 (leaves ~60px for the lane label)"
```

The same quantity in `src/templates/architecture.mjs:125` is *derived*:

```js
const sectionH = SECTION_LABEL_H + SECTION_PAD + maxItemH + SECTION_PAD * 2;
```

The template computes it; the recipe tells the model to type `100` and `80`.
A long label overflows the band and nothing catches it. This is the same class
of defect `equalize` fixed one level up (a wrapped label growing alone and
leaving a row ragged) — just one layer higher, at the container.

## What is actually repeating

Not a component. **Two operations:**

- **align (cross axis)** — a set of siblings takes one common size.
  This is `equalize`, shipped in 0.5.13.
- **pack (main axis)** — `container = pad*2 + Σ children + gap*(n-1)`, and the
  children's positions along that axis. This is still copy-pasted, in prose and
  in magic numbers.

The `architecture` tier band and the `comparison` shell are the *same thing in
two orientations* — one packs items horizontally, the other packs rows
vertically. That is why the same formula shows up in both.

Put plainly: we are re-inventing a very small flexbox for diagrams, and only
half of it exists.

### Candidate: `stack`

```text
stack — { cells:[{w,h}], dir:"x"|"y", pad?, gap?, align? }
      → { container:{w,h}, children:[{x,y,w,h}] }
```

`equalize` fixes the cross-axis size; `stack` places along the main axis and
returns the container size. Together they'd remove the arithmetic from the
architecture lane, the comparison shell, and the Layout C split column.

The highest-value first use is **replacing `laneH: 100` / `cell.y + 80` in the
architecture recipe with a derivation** — the point isn't fewer lines, it's
killing a silent failure mode.

## Where the line should sit

The package's stated design intent (`src/layout.mjs` header) is: primitives +
layout math + palette; diagram-kind opinions live in templates or skill
recipes; the helpers are the bridge — *pure math, no styling decisions.*

Templates are the cautionary tale for crossing that line: they bundled math,
styling, and whole-diagram layout together. The result is usable but not
adaptable, and it's being retired. **Whole-diagram customization is the wrong
granularity** — nobody wants to override one padding value by forking a
template.

But "no styling in code" is too coarse a rule, and this is the refinement worth
recording:

> A component's **structure** can be pinned. Its **palette and line style
> should follow the content.**

Concretely, for a card component:

| pinned in code (structural) | decided per diagram (semantic) |
|---|---|
| padding, gap, nesting depth | which side is neutral vs argued-for |
| header / body / footer proportions | `gray` vs `blue` vs `green` |
| corner radius, stroke weight | solid vs dashed outline |
| how children are packed and aligned | which content goes in which slot |

The left column is mechanics — writing those numbers twice is how diagrams
drift. The right column is a taste call, and it is *load-bearing*: this repo's
own comparison figures needed dashed-transparent panels in one figure and
tinted shells with white row cards in another, chosen from the content
("is this row the same dimension on both sides?"), not from a component
default. Freezing those into code means changing them requires a package
release, and every existing diagram changes with it.

**Working rule:** anything that would make you write the same number twice
belongs in code; anything that encodes a taste judgement belongs in the recipe.
`equalize` and `stack` are above that line. "The shell is `bgBlue`, the inner
cards are white" is below it.

## Open questions

- Does a component API return **elements** (styled) or **geometry** (slots the
  recipe fills)? Geometry-returning keeps the line above clean, but the model
  still has to place every rect. A middle form — return slot rects with a
  suggested role (`header` / `body` / `footer`) — may be the sweet spot.
- If components ship, do the four templates get rebuilt on top of them, or stay
  frozen until `generate` is removed in 0.6.0?
- Does `stack` subsume `gridLayout` / `chain` / `swimlane`, or sit beside them?
  (`swimlane` is arguably `stack(dir:"y")` of `stack(dir:"x")` with a header
  column.)
