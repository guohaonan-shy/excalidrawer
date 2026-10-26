# excalidrawer sugar schema

The MCP tools `render_diagram` and `compute_layout` (from the `excalidrawer-mcp`
server, added via `claude mcp add excalidrawer -- excalidrawer-mcp`) take
elements in the **sugar shorthand** below. Skills compose arrays of sugar
elements; `render_diagram` translates them into full Excalidraw JSON and writes
the output files.

This file is the **API reference** — what each component is and how to write
its fields. *Which* component and *which* style to use for a given meaning
(arrow vs line, solid vs dashed, bold, colors) is decided in
[`semantics.md`](semantics.md); read that first.

Components: `rect` / `diamond` / `ellipse` / `text` (shapes), `arrow`
(directed connector), `line` (undirected connector).

## Shape sugar

```js
{
  shape:    "rect" | "diamond" | "ellipse" | "text",
  id?:      string,                                  // auto-generated if omitted
  at:       [x, y],                                  // top-left, px
  size:     [w, h],                                  // px
  fill?:    "blue" | "bgBlue" | "#rrggbb" | "transparent",
  stroke?:  "blue" | "#rrggbb",                      // palette key → matching strokeXxx; the SHAPE border
  dashed?:  true,                                    // dashed outline
  text?:    string,                                  // non-empty → auto-binds a centered text child
  textColor?: "blue" | "#rrggbb",                    // label color (since 0.5.9); `stroke` does NOT reach it
  fontSize?: number                                  // default 16; diamond 14
}
```

A non-empty `text` expands a `rect`/`diamond`/`ellipse` into a `[shape, text]`
pair with the text bound (Excalidraw `containerId`), so labels stay centered
when you drag the shape later.

- **`stroke` colors the border; `textColor` colors the label.** `stroke` never
  reaches bound text — to color a label, use `textColor` (palette key or
  `#rrggbb`). Without it the label is the default ink. *(textColor: since 0.5.9.)*
- **Bound text auto-wraps and the box grows to fit** *(since 0.5.9)*. A label
  longer than its `size[w]` wraps to the box width, and the box height grows to
  contain the lines — you no longer hand-insert `\n` or pre-size the box for
  long labels. (Earlier versions rendered long labels overflowing the box.)

## Arrow sugar — id-anchored (auto-routed)

L1-L3 reference shapes by id and produce a clean **orthogonal** path. The
auto-router never draws a bare diagonal.

```js
// L1 — auto sides + auto route
{ shape: "arrow", from: "<id>", to: "<id>" }

// L2 — pinned sides; fromT/toT slide the attach point (0-1) along the edge
{ shape: "arrow", from, to, fromSide: "top"|"right"|"bottom"|"left", toSide,
  fromT?: number, toT?: number }

// L3 — U-route detour around an obstacle
{ shape: "arrow", from, to, via: "above"|"below"|"left"|"right", clearance?: number }
```

Common arrow options (apply to L1-L4):

```js
{ ...,
  arrowType?:   "sharp" | "round" | "elbow",       // default "round"
  head?:        Arrowhead | "none",                 // end,   default "arrow"
  startHead?:   Arrowhead | "none",                 // start, default "none"
  strokeStyle?: "solid" | "dashed" | "dotted",      // dashed?: true is shorthand
  strokeWidth?: "thin" | "medium" | "bold" | number, // 1 / 2 / 4
  labelT?: number /* 0-1 */, text?: string }

// Arrowhead = "arrow" | "bar" | "circle" | "circle_outline" | "triangle"
//           | "triangle_outline" | "diamond" | "diamond_outline"
```

- `arrowType` — Excalidraw's three arrow types. `round` smooths through every
  point (a Catmull-Rom curve, so an L-route becomes an S-ish bend); `sharp`
  keeps straight segments with hard corners; `elbow` forces every segment
  axis-aligned (diagonal steps get an L corner) and rounds each corner.
- `startHead` / `head` — arrowhead at each end; `"none"` removes it.
- `labelT` → where along the path the auto-`text` label sits (0 = start, 1 = end)
- `dashed: true` is shorthand for `strokeStyle: "dashed"`.

## Line sugar

`line` is Excalidraw's Line tool: a connector with no arrowheads. Same
addressing as arrow (L1-L4: `from`/`to` or `at` + `points`), plus:

```js
{ shape: "line", ..., edges?: "sharp" | "round",    // default "sharp"
  strokeWidth?: "thin" | "medium" | "bold" | number, strokeStyle?, stroke?, text? }
```

- `edges: "round"` smooths through the points like a `round` arrow; `"sharp"`
  keeps hard corners.

## Arrow / line sugar — L4 manual escape

When none of L1-L3 fit (curved freeform, multi-segment with custom routing),
specify the anchor and relative offset points:

```js
{ shape: "arrow" | "line", id?, at: [x, y], points: [[dx, dy], [dx, dy], ...] }
```

## Auto-routing rules (so you can predict the shape)

Given two id-anchored boxes:

- **Side picking** (when `fromSide`/`toSide` omitted): if the boxes are
  vertically disjoint, the connection is vertical (`bottom`↔`top`); if
  horizontally disjoint, it's horizontal (`right`↔`left`); else falls back
  to whichever axis has the larger center-delta. **Vertical separation wins
  ties** — suits top-down / layered diagrams.

- **Route shape**: after sides resolve to two edge points,
  - **straight** when the points are axis-aligned;
  - **L-bend** (one turn) when the chosen sides are perpendicular;
  - **Z-route** (two turns at the travel-axis midpoint) when sides are
    parallel with an offset — the arrow leaves and arrives along its sides'
    normals, not diagonally.

To force a specific route, set explicit `fromSide`/`toSide`, or use `via:
"above" | "below" | "left" | "right"` for a U-route detour.

## Geometry helpers — call via `compute_layout`

```text
gridLayout  — { count, cols, cellW, cellH, colGap?, rowGap?, originX?, originY? }
              → [{ x, y, w, h, col, row }]
chain       — { start: {x,y}, count, dx?, dy? }
              → [{ x, y, i }]
swimlane    — { lanes:[{label,color}], items:[{lane,...}], laneW, laneH, itemW, itemH,
                laneGap?, itemGap?, headerW?, originX?, originY? }
              → { laneRects, itemPositions }
hubSpoke    — { center:{x,y}, spokeCount, radius, startAngleDeg?, clockwise? }
              → { centerPos, spokePositions }
edgePoint   — { target:{x,y,w,h,type?}, side, t? }   → { x, y }
routeU      — { from:{x,y}, to:{x,y}, side, clearance }  → [[dx,dy]...] relative
labelAnchor — { points:[[x,y]...], padding?, preferSide? } → { x, y, side, segmentIdx }
titledBox   — { x, y, w, title, body?, titleFontSize?, bodyFontSize?, padding?, gap? }
              → { box, title, body }   (header + body, auto-height)
fitContainer— { children:[{x,y,w,h}], padding?, minW?, minH? } → { x, y, w, h }
equalize    — { cells:[{w,text,fontSize?} | {w,title,body?,...} | {w,h}], minH? }
              → { h, cells:[{ w, h, contentH }] }
stack       — { dir:"x"|"y", cells:[{text,w?,fontSize?} | {title,body?,w?,...} | {w,h} | {stack:{…}} | {panel:{…}}],
                gap?=16, pad?=0, align?:"start"|"center"|"end", size?, justify?, cross?,
                equalize?, maxW?=200, fontSize?=16, x?, y? }
              → { kind:"stack", x, y, w, h, overflow, children:[{ kind, id?, x, y, w, h, … }] }
panel       — { title, body:{ dir?="y", cells, …stack options, no x/y }, titleSide?:"top"|"left"="top",
                titleFontSize?=18, titleW?, pad?=16, gap?=12, w?, x?, y? }
              → { kind:"panel", x, y, w, h, overflow, title:{ x, y, w, h, fontSize, text }, body:<stack result> }
axis        — { from:{x,y}, dir?:'x'|'y', marks?:[{value?,label?,id?}], domain?:[min,max], length?,
                spacing?, extend?:[before,after], gap?, arrow?:'none'|'end', ticks?:{step?|count?},
                labelSide?:'before'|'after'|'alternate', labelOffset? }
              → { kind:'axis', from, to, marks:[{id?,value?,label?,x,y,t,labelAnchor:{x,y,side}}],
                  ticks:[{value,x,y,labelAnchor}], segments:[{at,points,arrow}],
                  scale:{domain,origin,pxPerUnit} }
legend      — { items:[{label,id?}], dir?, sampleW?, sampleH?, gap?, itemGap?, fontSize?, pad?,
                at?:{x,y}, bounds?:{x,y,w,h}, corner?, place?, offset? }
              → { kind:"legend", x, y, w, h,
                  items:[{ id?, text, sample:{x,y,w,h}, label:{x,y,w,h,fontSize} }] }
```

**`equalize` — build every sibling box at the returned `h`.** A box's `h` is a
*floor*: a label that wraps grows its own box and nothing else, so three boxes
declared `size: [180, 60]` can render 60 / 83 / 60 and leave the row ragged.
Measure the group first, then pass the group `h` to every box in it — the label
still wraps and centers, the boxes stay level, and the lint still applies.
Use it for any set of shapes meant to read as one row / one band: same-row
flowchart branches, items in one architecture tier, milestone cards, actor
headers, and every paired cell in a comparison.

**`stack` — lay cells along one axis; the container is sized from the content.**
Give it each cell's content (`text`, or `title` + `body`, or a known `w` + `h`,
or a nested `{ stack: {…} }`) and it returns every cell's absolute `x, y, w, h`
and the container's `w, h`, so no lane height or shell height is typed by hand
and a long label can't push a cell out of its container. `dir` is the main
axis (`"x"` a row, `"y"` a column). A cell without `w` gets its natural width
(capped at `maxW`, default 200, then it wraps). `equalize: true` gives every
cell the same cross-axis size (row: same height; column: same width).
`size` fixes the main-axis length and `justify` spreads the spare room
(`start` / `center` / `end` / `space-between`); if the content doesn't fit, the
container grows and `overflow` says by how many px. In a column, `cross` fixes
the width and width-less cells fill `cross - pad*2`.

After the call, draw each child as a `rect` (with `text` for `kind: "text"`)
at its `x, y, w, h`; for `kind: "titled"` draw the rect and put `title.text` /
`body.text` (already wrapped) at `title` / `body`'s `x, y` as separate `text`
elements. Draw the container itself as a `rect` from the top-level `x, y, w, h`
when it needs a visible shell. Colors and line styles stay your call.

**`panel` — a title area plus a `stack` of cells, sized from both.** Use it
wherever a container has a heading: an architecture layer band (title column on
the left, items in a row on the right) or one side of a comparison (title on
top, row cards below). The `body` is a `stack`'s options (no `x` / `y`; `dir`
defaults to `"y"`), so no `cell.y + 80` offset or hand-typed container height is
left to get wrong. `titleSide: "top"` puts the title area across the inner width,
`gap` above the body; a title that wraps makes the area taller and moves the
body down. `titleSide: "left"` makes the title a column (`titleW` wide, or its
natural width capped at 200) as tall as the panel's inner height, so a header
rect can fill the whole row, with the body `gap` to its right. `w` fixes the
overall width: the body gets what is left (a row body spreads it by its
`justify`, a column body's width-less cells fill it); a `w` smaller than the
content lets the panel grow, and `overflow` is how many px it grew past `w`
(0 when it fits or `w` is unset) — check it when the panel sits in a fixed column
or canvas. A panel is also a stack cell, `{ panel: {…} }`,
and an outer `equalize: true` gives panels one width (column) or one height
(row), re-flowing each inside: titles re-wrap, the body is stretched, centered
cells stay centered.

After the call, draw `title` as a header `rect` with `text: title.text` (already
wrapped; or just a `text` element at `title.x, title.y`), the container as a
`rect` from the top-level `x, y, w, h`, and each `body.children[i]` as for a
`stack`. Say "panel", not "card": a card is one small cell inside it.

**`axis` — a marked line, drawn from `segments`.** It returns coordinates
only; the dots, labels and tick strokes are yours to draw. Marks sit at
`marks[i].x/y` (centered there), their label belongs at `labelAnchor`. The line
comes back as `segments`, already broken `gap` px either side of every mark so
it never runs through a dot: draw each one as the sugar L4 form
`{ shape: "line", at: seg.at, points: seg.points }`, and as `shape: "arrow"` when
`seg.arrow` is true (`arrow: "end"` flags the last segment). Mark `value`s are
placed linearly over `domain`; without values the marks are `spacing` apart.
For a value that is not a mark, use `scale`: along the axis its coordinate is
`origin + (v - domain[0]) * pxPerUnit` (x for `dir:"x"`, y for `"y"`).
`ticks: { step }` or `{ count }` adds ticks at 1 / 2 / 5 × 10ⁿ multiples inside
the domain. Use it for the spine of a timeline or a chart axis.

**`legend` — coordinates for each row's sample and text; you decide what the
sample looks like.** Each item comes back with a `sample` slot and a `label`
slot, vertically centered on each other, plus the size of the whole block.
Draw the sample to match what it stands for (see `semantics.md` §8): a color
swatch fills the whole `sample` box (`shape: "rect"` at `[sample.x, sample.y]`,
`size: [sample.w, sample.h]`); a line sample runs from the box's left-middle
to its right-middle (`shape: "line"`, `at: [sample.x, sample.y + sample.h/2]`,
`points: [[0, 0], [sample.w, 0]]`, with the `strokeStyle` / `strokeWidth` it
documents). The text is a `shape: "text"` at `[label.x, label.y]` with
`size: [label.w, label.h]` and `fontSize: label.fontSize`. `dir: "x"` puts the
items on one row (default `itemGap` 24 instead of 8). To park it, pass the
diagram's extent as `bounds` plus a `corner`: `place: "inside"` (default) tucks
it `offset` (16) in from that corner; `place: "outside"` puts it just above
(top corners) or below (bottom corners) the bounds, flush with that side. With
no `corner`, `at` is the block's top-left (default 0, 0). Bad arguments throw
an error naming `legend` and the argument.

Use these for placement math. Element creation always goes through
`render_diagram` with sugar.

## Mixing sugar and raw

The same array may contain sugar elements (have a `shape` field) and raw
Excalidraw elements (no `shape` field). Raw elements pass through with
missing base fields filled in — useful when copy-pasting an Excalidraw export
or hand-tuning one element.

## Errors

A malformed sugar element causes `render_diagram` to return
`{ error, issues: [...] }`. Each issue names the offending element index and
the problem (`unknown fill color`, `arrow "from" references unknown id`,
`fromT must be a number in [0,1]`, ...). Fix and retry — no files are
written on failure.
