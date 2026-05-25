# Flowchart recipe

How to compose a flowchart with sugar elements. Read this AFTER clarifying
intent (see SKILL.md §2). Sugar schema basics live in
`sugar.md` — this file only covers
flowchart-specific composition.

## Layout

Pick a direction from clarify §2.

**Horizontal** (left-to-right) — default for ≤ 5 mainline nodes:

```text
[ Start ] → [ Process ] → < Decision > → [ End ]
                                ↓
                            [ Fail Path ]
```

Use `compute_layout` `chain` to place mainline x positions:

```js
chain({ start: { x: 40, y: 150 }, count: N, dx: NODE_W + 70 })
```

Defaults that work:

- `NODE_W = 150`, `NODE_H = 60`
- Mainline `y = 150`; off-row branches (decision → fail) one row below at
  `y ≈ 290` (~80 px gap).

**Vertical** (top-to-bottom) — default for ≥ 6 nodes or a pure decision tree:

```js
chain({ start: { x: 100, y: 80 }, count: N, dy: NODE_H + 50 })
```

Either way, leave room above the first node for the title (~ 100 px).

## Node types

| Intent | sugar `shape` | `fill` |
|---|---|---|
| Start / End | `rect` (rounded corners built in) | `blue` (start) / `green` (end) |
| Process / IO step | `rect` | `blue` |
| Decision (yes/no, branching) | `diamond` | `yellow` |
| Error / fail terminus | `rect` | `red` |

Don't pass `fill:"red"` for non-error nodes — red reads as "bad" in this
visual style. Reserve it.

## Title + subtitle

- Title at `y = 30`, fontSize `28`, size width = full diagram span.
- Optional subtitle at `y = 78`, fontSize `16`, `stroke: "gray"`.
- Mainline first node at `y ≈ 150` (leaves ~48 px gap below subtitle).

## Edges — 4 patterns

### 1. Linear next step — auto everything

```js
{ shape: "arrow", from: "a", to: "b" }
```

The auto-router picks facing sides and straight / L-bend / Z-route as the
geometry dictates.

### 2. Decision branch — force `bottom` exit from the diamond

So the yes/no arrow doesn't compete with the mainline edges on the diamond's
horizontal sides:

```js
{ shape: "arrow", from: "check", to: "fail",
  fromSide: "bottom", toSide: "top", text: "No" }
{ shape: "arrow", from: "check", to: "save", text: "Yes" }  // mainline — auto is fine
```

If a decision has **3+ branches**, also set `fromT` to spread the bottom
exit points: `fromT: 0.3`, `0.5`, `0.7`.

### 3. Back-edge / retry loop — perpendicular side pair

The rule:

> **A back-edge always exits and enters on edges the mainline doesn't use.**

Mainline arrows occupy the horizontal facing edges (right/left). So a
back-edge should exit `bottom` and enter `left`/`right`, or exit `left`/
`right` and enter `bottom` — a **perpendicular pair**. The auto-router
turns a perpendicular pair into a clean **L-bend**.

```js
{ shape: "arrow", from: "fail", to: "input",
  fromSide: "left", toSide: "bottom", text: "retry" }
```

**Do not let auto pick the sides for back-edges.** Auto chooses "facing"
edges, which are the congested ones.

### 4. Long-haul detour — `via` U-route (rare)

When a back-edge has to cross the whole diagram and an L-bend would still
collide, use `via`:

```js
{ shape: "arrow", from: "fail", to: "input",
  fromSide: "bottom", toSide: "bottom",
  via: "below", clearance: 90, text: "retry" }
```

This loops the connection below the entire row.

## Edge labels

- Short tags (`Yes` / `No` / `OK` / `Fail`) — use the arrow's `text` field
  directly. Auto-placement is fine for adjacent edges.
- When an arrow crosses *another box* near its midpoint, set
  `labelT: 0.25` (closer to sender) or `0.75` (closer to receiver) to dodge.

## Common pitfalls

- **Auto-side picks the wrong edge for back-edges.** → Always set explicit
  perpendicular sides on back-edges.
- **Multiple arrows converging on one decision target.** → Spread `toT`
  (`0.3` / `0.7`) so they don't pile up on the same edge point.
- **Title overlapping the first node.** → Reserve `y < 100` for title +
  optional subtitle; first node at `y ≈ 150`.
- **Red used as a "highlight" color.** → Red reads as "bad case." Use
  blue/green for mainline; red only on error terminals.
