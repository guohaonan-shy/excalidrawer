# excalidrawer sugar schema

The MCP tools `render_diagram` and `compute_layout` (from the `excalidrawer-mcp`
server, added via `claude mcp add excalidrawer -- excalidrawer-mcp`) take
elements in the **sugar shorthand** below. Skills compose arrays of sugar
elements; `render_diagram` translates them into full Excalidraw JSON and writes
the output files.

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
{ ..., dashed?: true, head?: "arrow" | "none", labelT?: number /* 0-1 */, text?: string }
```

- `head: "none"` → no arrowhead (use for plain lines / lifelines)
- `labelT` → where along the path the auto-`text` label sits (0 = start, 1 = end)

## Arrow sugar — L4 manual escape

When none of L1-L3 fit (curved freeform, multi-segment with custom routing),
specify the anchor and relative offset points:

```js
{ shape: "arrow", id?, at: [x, y], points: [[dx, dy], [dx, dy], ...] }
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
```

**`equalize` — build every sibling box at the returned `h`.** A box's `h` is a
*floor*: a label that wraps grows its own box and nothing else, so three boxes
declared `size: [180, 60]` can render 60 / 83 / 60 and leave the row ragged.
Measure the group first, then pass the group `h` to every box in it — the label
still wraps and centers, the boxes stay level, and the lint still applies.
Use it for any set of shapes meant to read as one row / one band: same-row
flowchart branches, items in one architecture tier, milestone cards, actor
headers, and every paired cell in a comparison.

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
