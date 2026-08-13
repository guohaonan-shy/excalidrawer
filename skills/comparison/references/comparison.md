# Comparison recipe

How to compose a left-vs-right comparison diagram with sugar. Read AFTER
clarifying intent (SKILL.md §1). Sugar schema in
[`../../shared/references/sugar.md`](../../shared/references/sugar.md).

## Modeling — dimensions first, not features first

A comparison diagram is a **table drawn as cards**. Model it as rows before
touching coordinates:

- **One row = one dimension**, and the dimension applies to BOTH sides. Rows
  are what the reader scans horizontally; a row that only exists on one side
  breaks the scan.
- **A side that lacks a dimension still gets the row** — fill it with `None`
  / `—` / `Not covered`. The absence IS the comparison ("Writing: None" next
  to "Writing: Write an Email, Academic Discussion" is the whole point).
- **3–6 rows is the sweet spot.** 1–2 rows → the diagram says less than a
  sentence. ≥ 7 rows → a Markdown table beats a picture; say so and offer the
  table instead (still render if the user wants the visual).
- **Keep the two sides' text volume within ~1.5× of each other per row.** A
  4-line left cell next to a 1-line right cell reads as "left is richer",
  which is a claim you may not have meant to make. Trim or split.
- **Dimension order carries the argument**: lead with the dimension where the
  contrast is sharpest, end with the one you want remembered.

## Layout A — symmetric two-column (default)

The workhorse. Two equal columns, a wide gutter, a `VS` badge in the middle.

```text
CANVAS_W  = 1000
LEFT_X    = 40    COL_W = 400
GUTTER    = 120                 → RIGHT_X = LEFT_X + COL_W + GUTTER = 560
TITLE     y = 30,  fontSize 26,  size [CANVAS_W - 80, 34]
HEADER    y = 90,  h = 60        (both sides, same y, same h)
BODY      y = 175, then y += rowH + ROW_GAP (ROW_GAP = 20)
VS badge  x = 460, w = 80, centered in the gutter, y = header row center
```

```text
   row cards — each row is a shared dimension, boxed and level across the gutter
┌──────────────────────┐        ┌──────────────────────┐
│   Product A (head)   │        │   Product B (head)   │   ← same y, same h
└──────────┬───────────┘  VS    └──────────┬───────────┘
┌──────────▼───────────┐        ┌──────────▼───────────┐
│ ┌──────────────────┐ │        │ ┌──────────────────┐ │
│ │ Speaking: 2 tasks│ │        │ │ Speaking: 2 tasks│ │  ← same y, same h
│ ├──────────────────┤ │        │ ├──────────────────┤ │
│ │ Writing: None    │ │        │ │ Writing: 2 tasks │ │  ← same y, same h
│ └──────────────────┘ │        │ └──────────────────┘ │
└──────────────────────┘        └──────────────────────┘

   single panel — each side holds its own list; only the panel edges align
┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐        ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
    • Fluency                      • Fluency
│   • Intelligibility  │        │   • Intelligibility  │
    • Repeat Accuracy              • Language Use
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘        └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

**All text renders centered.** The SVG/PNG exporter emits `text-anchor:
middle` for every text element — `textAlign` is not honored, and a raw
passthrough element can't change it either. Design for centering:

- **`• ` bullet glyphs only when the lines are short and near-equal** (`•
  Fluency` / `• Intelligibility` / `• Language Use`). Centered bullets with
  uneven line lengths leave the dots floating in a ragged column — for
  anything longer, drop the glyphs and use bare lines (`Label: value`, e.g.
  `Writing: None`).
- **Balance line lengths within a cell** — centered lines of wildly different
  width look accidental. 2–4 lines, each roughly the same length.

### Card grammar: header → arrow → body

The two-tier card is what makes the picture read as a comparison instead of a
table screenshot. The header tier is always the same:

| tier | fill | stroke | text |
|---|---|---|---|
| **header** (the side's name) | `bg<Color>` tint | side color | side `textColor`, `fontSize` 17–18 |

Then drop a short arrow from each header into its own body:

```js
{ shape: "arrow", from: "lh", to: "lb" }   // auto-routes bottom → top
{ shape: "arrow", from: "rh", to: "rb" }
```

The body comes in **two named forms**. Pick one per diagram and use it on both
sides — mixing them (row cards left, panel right) reads as a status difference
you didn't mean.

| form | shell | inner | use when |
|---|---|---|---|
| **row cards** | `bg<Color>` tint, solid stroke | one white card per row: `fill: "#ffffff"`, side stroke, side `textColor` | each row is **the same dimension on both sides** |
| **single panel** | `transparent` + `dashed: true`, side stroke | none — the text lines live directly in the panel | each side holds **its own list**, not paired rows |

**The choice rule — is this row the same dimension on both sides?** It's the
modeling rule from the top of this file, applied to visuals:

| example | what a row is | form |
|---|---|---|
| A vs B by *coverage / pricing / scoring* | the same dimension, both sides — the reader scans across | **row cards** |
| "product X's subscores per task" — left has `Repeat Accuracy`, right has `Language Use` | each side's own list; same-name items are coincidence | **single panel** |
| asymmetric (Layout C), where a column already contains sub-cards | the column is already structured | **single panel** / no shell |

Boxing a row that *isn't* a shared dimension is the failure mode to avoid: it
asserts a correspondence that doesn't exist ("Fluency vs Fluency" framed as one
row implies the two are being compared, when they merely share a name).

#### Row cards — geometry

```js
const PAD = 16, GAP = 12, IW = COL_W - PAD * 2;

// one equalize per dimension → each pair is level across the gutter
const hs = rows.map(([l, r]) => compute_layout({ helper: "equalize", args: {
  cells: [{ w: IW, text: l, fontSize: 14 }, { w: IW, text: r, fontSize: 14 }],
  minH: 44,
}}).h);
const shellH = PAD * 2 + sum(hs) + GAP * (rows.length - 1);
```

Shell per side at `[LEFT_X, BODY_Y]` / `[RIGHT_X, BODY_Y]`, size `[COL_W, shellH]`;
inner cards at `[LEFT_X + PAD, y]` size `[IW, hs[i]]`, advancing
`y += hs[i] + GAP`. When the two sides have a different number of rows, the
shells still share `shellH` (the taller side wins) — leave the short side's
tail empty rather than padding it; the gap says "nothing here".

**Degenerate case**: 1–2 rows, or rows that are a single short phrase each →
skip the nesting and use a single panel. Two boxes inside a box for two lines
of text is more chrome than content.

### The one hard rule: rows share y AND h

Both cards in a row must have identical `at[1]` and identical `size[1]`. This
is the entire reason the diagram is readable, and it's the thing that breaks by
accident: a box's `h` is a **floor**, so the side whose label wraps grows and
the other side doesn't.

**Measure before you build** — `compute_layout` `equalize` returns one height
that fits every cell you hand it. Which cells you hand it depends on the body
form:

- **row cards** → one call per dimension, the two sides' cells together (see
  the geometry block above). Each pair is level, and the shell height falls out
  of the sum.
- **single panel** → one call for the whole body, the two panels together:

```js
const row = compute_layout({ helper: "equalize", args: { cells: [
  { w: COL_W, text: leftBody,  fontSize: 15 },
  { w: COL_W, text: rightBody, fontSize: 15 },
]}});
// → { h, cells:[{w,h,contentH}, …] }   every cell carries the group height

{ shape: "rect", id: "lb", at: [LEFT_X,  BODY_Y], size: [COL_W, row.h],
  fill: "transparent", stroke: "gray", dashed: true, text: leftBody,  fontSize: 15 },
{ shape: "rect", id: "rb", at: [RIGHT_X, BODY_Y], size: [COL_W, row.h],
  fill: "transparent", stroke: "blue", dashed: true, text: rightBody, fontSize: 15,
  textColor: "blue" },
```

At the group height the boxes stop growing, so you keep everything bound text
gives you — auto-wrap to the column width, vertical centering, and the
`TEXT_OVERFLOW` lint — *and* the row stays level.

In a single panel, separate the lines with `\n\n`: the blank line is the only
spacing you get, and without it three statements read as one paragraph. (Note
what you give up versus row cards: the lines inside a panel are *not* aligned
across the gutter — only the panel edges are.)

**The one case that still needs standalone text**: a cell with a dimension
**title in one font size and a body in another**. Bound text is single-font, so
measure with `titledBox` per side, feed both heights into `equalize`
(`cells: [{ w, title, body }, …]`), then draw a plain rect at the group height
plus two `{ shape: "text" }` elements at the `titledBox` coordinates. Standalone
text does **not** wrap — insert `\n` yourself (~40 chars per line at
`fontSize: 15` in a 400 px column).

### Headers and the VS badge

```js
// header cards — single line, so bound `text` is safe here
{ shape: "rect", id: "l-head", at: [LEFT_X, 90],  size: [COL_W, 60],
  fill: "gray",  text: leftName,  fontSize: 20 },
{ shape: "rect", id: "r-head", at: [RIGHT_X, 90], size: [COL_W, 60],
  fill: "green", text: rightName, fontSize: 20 },
// VS — plain text, no shape; keep it out of the cards
{ shape: "text", at: [460, 108], size: [80, 24], text: "VS", fontSize: 20,
  textColor: "gray" },
```

A `VS` **text** label is the default. Only draw an ellipse badge behind it if
the user asked for something more decorative — a circle in the gutter competes
with the cards for attention.

## Layout B — center dimension column (three-column)

Use when the dimension names are long, or when the sides' cells are short
enough that repeating the dimension label twice wastes space.

```text
LEFT   x = 40   w = 340
MID    x = 400  w = 200      ← dimension name, centered, no fill (or bgGray)
RIGHT  x = 620  w = 340
```

Cells then carry **only** the value (no `title`), so every cell is plain bound
text — but the row-height rule still holds: pass all three cells (left, middle
dimension label, right) to one `equalize` call and build them at the returned
`h`.

## Layout C — asymmetric (one side splits into sub-cards)

When one side has N parallel options and the other has one (e.g. "two ways to
pay" vs "one way to pay"). The columns stay the same width; only the *inside*
of a column differs.

```text
LEFT_X = 30, COL_W = 430   →   sub-cards: [30, 200] and [260, 200]  (gap 30)
RIGHT_X = 520, COL_W = 430 →   one card spanning the full 430
rows still aligned:  y = 210 (h 120)   y = 350 (h ~64, the "Fits:" footer row)
```

The split side's header **fans out** into its sub-cards; the other side drops
straight down:

```js
{ shape: "arrow", from: "lh", to: "c1", fromSide: "bottom", toSide: "top", fromT: 0.35 },
{ shape: "arrow", from: "lh", to: "c2", fromSide: "bottom", toSide: "top", fromT: 0.65 },
{ shape: "arrow", from: "rh", to: "c3", fromSide: "bottom", toSide: "top" },
```

Pin `fromSide`/`toSide` explicitly — left to auto, a large x-offset makes the
router pick the horizontal axis and the arrow leaves sideways.

**If this layout gets a shell** (a `bg<Color>` rect wrapping the column's
cards), anchor the arrows to the **shell**, not to the cards inside it — an
arrow that ends on an inner card has to cross the shell's border to get there,
and `ARROW_CROSSES_SHAPE` will flag it. Spread the fan with `toT` instead of
aiming at different cards; it also reads better, pointing at "this side's
contents" and letting the two cards inside explain the split themselves:

```js
{ shape: "arrow", from: "lh", to: "ls", fromSide: "bottom", toSide: "top", fromT: 0.3, toT: 0.25 },
{ shape: "arrow", from: "lh", to: "ls", fromSide: "bottom", toSide: "top", fromT: 0.7, toT: 0.75 },
```

Rules that keep it from looking broken:

- **The column outer width never differs between sides** — only the inner
  split does. Unequal column widths read as bias.
- **Narrow sub-cards wrap badly, even though they wrap correctly.** A 200 px
  card fits ~22 characters at `fontSize: 14`; auto-wrap will happily break a
  price line into `$18.75–$62.50 ·` / `10–50 tests`. Nothing lints this — it's
  a copy problem. Split the line yourself (`$18.75–$62.50` / `10–50 tests`) or
  shorten the phrase. Rough budgets: 200 px → ~22 chars, 340 px → ~40,
  430 px → ~52.
- **Sub-cards share the row's height**, and the single card opposite them
  spans that same height — pass every card in the row (both sub-cards *and*
  the full-width one opposite) to a single `equalize` call.
- **The footer row** (`Fits: …` / `Best for: …` / `Verdict: …`) is one card per
  sub-card on the split side and one card on the other side, all sharing y.
  This row is where the reader lands — keep it to one or two lines.

## Colors — two families, and don't paint the loser red

| element | left side (neutral) | right side (argued for) |
|---|---|---|
| header card | `bgGray` fill + `gray` stroke, default ink | `bgBlue` fill + `blue` stroke + `blue` textColor |
| row-cards shell | `bgGray` fill + `gray` stroke | `bgBlue` fill + `blue` stroke |
| row card (inner) | `#ffffff` fill + `gray` stroke, default ink | `#ffffff` fill + `blue` stroke + `blue` textColor |
| single panel | `transparent` + `dashed` + `gray` stroke | `transparent` + `dashed` + `blue` stroke + `blue` textColor |
| VS badge / title | default ink, `gray` textColor | — |

- **Default pairing is `gray` (neutral / status quo) vs `blue` (your side).**
  The colored side also gets `textColor` — colored text is what makes one
  column read as "the answer" without shouting. Two families plus ink, nothing
  more (shared `references/colors.md`: ≤ 4 colors per diagram; a comparison
  wants 2). `green` works too, but reads as "success/done" rather than "this
  one" — use it when the right side really is the end state (after / fixed).
- **Never `red` for the other side.** `red` means *error* in this palette —
  it turns a comparison into an accusation, and it's the single fastest way to
  make an honest diagram look like an ad. `gray` says "the status quo" and is
  more persuasive.
- **Neutral comparisons** (A vs B with no winner — "two valid approaches") use
  `blue` vs `purple` and identical stroke weight on both sides.
- **Emphasis, when clarify asked for it**, goes on the winning side (mid-tone
  fill instead of `bg*` tint), never as a de-emphasis of the other side.

## Title

`y = 30`, `fontSize: 26`, width `CANVAS_W - 80`. State the axis of comparison,
not just the names: `"MySpeakingScore vs TOEFLAIR: coverage"` beats
`"MySpeakingScore vs TOEFLAIR"`. One diagram = one axis; a second axis is a
second diagram (`-coverage`, `-pricing`, `-feedback` suffixes).

## Common pitfalls

- **Rows drift out of alignment** → you built the boxes before measuring.
  `equalize` the row, then build every card at the returned `h`.
- **Row cards used for a list that isn't a shared dimension** → boxing
  `Fluency` opposite `Fluency` asserts a comparison that isn't there. Per-side
  lists get a single panel; only shared dimensions get row cards.
- **Arrow ending on a card inside a shell** → it crosses the shell border and
  trips `ARROW_CROSSES_SHAPE`. Anchor to the shell and spread with `toT`.
- **One side has fewer rows** → don't compress it; fill the gap with `—` /
  `None`. The blank IS information.
- **Gutter too narrow** → `VS` collides with the cards. Keep ≥ 100 px, and
  never let the badge overlap a rect (`SHAPE_OVERLAP` will flag an ellipse
  badge that does).
- **Unequal column widths** → reads as bias even when the content is fair.
- **A cell wall of text** → cap at 4 lines; anything longer belongs in the
  prose next to the diagram.
- **Hand-picked panel height larger than its content** → a band of dead space
  under the last line, on both sides. Let `equalize` derive the height; never
  type a round number like `h: 190` and hope.
- **≥ 7 dimensions** → offer a Markdown table; a picture stops adding value.
- **Standalone text overflowing its column** → only bites in the title+body
  case, because standalone `{shape:"text"}` does NOT auto-wrap; insert `\n`
  yourself or the line runs past the card border. Layer A catches it
  (`TEXT_OVERFLOW_X`, 1.2× tolerance for standalone text) on both the MCP and
  CLI paths.
- **Bullet glyphs / left-aligned mental model** → text is always centered
  (renderer-level); `•` prefixes and hanging indents don't survive.

## Iteration

Same axis, changed content → re-render to the same filename. A *different*
axis of comparison → a new file (`comparison-<pair>-<axis>`), not an extra
column on the existing one.
</invoke>
