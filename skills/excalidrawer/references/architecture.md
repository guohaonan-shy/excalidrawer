# Architecture recipe

How to compose an architecture diagram with sugar. Read AFTER clarifying
intent (SKILL.md §2). Sugar schema in
`sugar.md`.

## Modeling — get the layers right first

Sanity-check the tier model before placing anything:

- **API Gateway**, **Message Queue / Broker**, **Service Mesh / Sidecar**
  each typically deserves its OWN tier — they're not "just another
  backend." Bundling them into the Business tier produces ugly fan-out
  and forces arrows to skip same-row items.
- Per-tier item count of 1 is fine (single API Gateway). Don't pad.
- Pure-topology diagrams (no connections) tolerate more items per tier
  than connection-heavy ones.

## Two layout modes

### A. Single lane per tier — `swimlane` helper

Default for ≤ 4 items per tier and a clean linear stack. `swimlane` returns
lane bands + item positions in one call.

```js
const HEADER = 130, LANE_W = 760;
compute_layout({
  helper: "swimlane",
  args: {
    lanes: [
      { label: "Frontend",          color: "blue" },
      { label: "API Gateway",       color: "purple" },
      { label: "Business Services", color: "green" },
      { label: "Data",              color: "yellow" },
    ],
    items: [
      { lane: "Frontend", id: "web",  label: "Web App" },
      // ...
    ],
    laneW: LANE_W, laneH: 100, itemW: 160, itemH: 56,
    headerW: HEADER, laneGap: 18, itemGap: 40,
    originX: 40, originY: 92,
  }
})
// → { laneRects, itemPositions }
```

Then for each `laneRect`: push `{ shape:"rect", fill:"bg"+Cap(color), stroke:color, text:label }`.
For each `itemPosition`: push `{ shape:"rect", fill:laneColor, text:item.label }`.

### B. Multi-lane per row — `gridLayout` for sub-lane bands

For tiers with sub-groupings (Frontend tier with Web + Mobile lanes side
by side). `swimlane` doesn't support this; use `gridLayout` directly.

```js
const TIER_W = 130, SUB_W = 380, SUB_H = 180, GAP = 24;
compute_layout({
  helper: "gridLayout",
  args: {
    count: 6, cols: 2,
    cellW: SUB_W, cellH: SUB_H,
    colGap: GAP, rowGap: GAP,
    originX: 40 + TIER_W + GAP,   // leave room for the tier header column on the left
    originY: 100,
  }
})
// → 6 cells in 2 cols × 3 rows
```

Layout:

```
┌──────────┐ ┌──────────────────┐ ┌──────────────────┐
│ Frontend │ │ Web Frontend     │ │ Mobile Frontend  │
│ (header) │ │ [React] [Admin]  │ │ [iOS] [Android]  │
└──────────┘ └──────────────────┘ └──────────────────┘
... etc per row
```

- **Tier header** (far left): one rect spanning the row height with the
  tier name. `fill: "bg"+Cap(tier.color)`, `stroke: tier.color`,
  `fontSize: 18`.
- **Sub-lane** (each grid cell): rect with `fill: "bg"+Cap(tier.color)`,
  `stroke: tier.color` (matches its tier), lane label centered at top
  (`y = cell.y + 14`, `fontSize: 15`, `stroke: tier.color`), items below.
- **Items inside a sub-lane**: chain horizontally, centered.

```js
const used = items.length * ITEM_W + (items.length - 1) * ITEM_GAP;
const startX = cell.x + (cell.w - used) / 2;
chain({ start: { x: startX, y: cell.y + 80 }, count: items.length, dx: ITEM_W + ITEM_GAP })
```

Recommended item dimensions: `ITEM_W = 150`, `ITEM_H = 50`, `ITEM_GAP = 30`,
items y = `cell.y + 80` (leaves ~ 60 px for the lane label).

## Colors per tier

Default rotation, extends to ≥ 4 tiers:

| tier index | lane bg fill | item fill | stroke |
|---|---|---|---|
| 0 — presentation | `bgBlue` | `blue` | `blue` |
| 1 — gateway / middleware | `bgPurple` | `purple` | `purple` |
| 2 — business | `bgGreen` | `green` | `green` |
| 3 — data | `bgYellow` | `yellow` | `yellow` |
| 4+ — supporting | `bgGray` / `bgOrange` | `gray` / `orange` | matching |

Same color family within a tier (light tint for lane bg, mid tone for
items) keeps the visual grammar consistent.

## Connections (only when clarify §2 selected them)

If clarify said "纯拓扑,不画连线" — just don't push any arrows. The lane
composition tells the story by structure alone.

If connections are in scope, the rules:

- **Cross-tier arrow** → set `fromSide:"bottom"` + `toSide:"top"`. Don't
  let auto pick — auto can choose horizontal when x-offset is large; you
  want vertical for "drops down a layer."
- **Item placement matters when arrows exist**. `swimlane`'s left-pack is
  connection-unaware. For connection-heavy layouts, **place items in
  connection-aware columns** with explicit `at` values: connected items
  across tiers share an x. Single-item tiers center over the items they
  connect to.
- **Fan-in / fan-out** → spread `fromT` (fan-out from one source) or
  `toT` (fan-in to one target). Typical values: `0.35` / `0.65` for two
  arrows; `0.3` / `0.5` / `0.7` for three.

## Title

Title at `y = 30`, fontSize `26-28`, size width = the full diagram span:

- swimlane mode: `HEADER + LANE_W`
- multi-lane mode: `TIER_W + GAP + 2 * SUB_W + GAP`

## Common pitfalls

- **API Gateway buried in Business tier** → arrows from the gateway must
  cross same-row items. → Give it its own tier.
- **swimlane left-packs items** → connection-heavy diagrams get diagonal
  spaghetti. → For connection-heavy layouts, place items manually in
  shared columns.
- **Single-item tier sitting at the left of a wide lane** → arrows from
  above sweep awkwardly to it. → Center single items over the items
  they connect to (or center in the lane if pure-topology).
- **Sub-lane label clashing with first item** → keep ≥ 60 px between
  lane top and item top (`items y = cell.y + 80` by default).
