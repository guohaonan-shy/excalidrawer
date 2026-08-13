# Sequence recipe

How to compose a sequence diagram with sugar. Read AFTER clarifying actors
+ messages + return-style (SKILL.md §1). Sugar schema in
[`../../shared/references/sugar.md`](../../shared/references/sugar.md).

## Layout

- `AW = 175`, `AH = 50` — actor header box dimensions
- `ATOP = 50` — top of actor row
- `LIFE_TOP = ATOP + AH = 100` — top of lifelines
- `LIFE_LEN = 440` (or `60 + 52 * stepCount`, whichever larger)
- Actor x-centers: `chain({ start:{x:200, y:0}, count: actors.length, dx: 330 })`
- Step y's: `chain({ start:{x:0, y: LIFE_TOP + 40}, count: steps.length, dy: 52 })`

Title at `y = 10`, fontSize `26`, size width = `cx[last] + 200`.

## Actor row + lifelines

```js
const xs = compute_layout({
  helper: "chain",
  args: { start: { x: 200, y: 0 }, count: actors.length, dx: 330 }
}).result;

for (const [i, actor] of actors.entries()) {
  const cx = xs[i].x;
  // header box
  els.push({
    shape: "rect", id: actor.id,
    at: [cx - AW / 2, ATOP], size: [AW, AH],
    fill: actor.color, text: actor.label, fontSize: 15
  });
  // lifeline = dashed plain line, no arrowhead
  els.push({
    shape: "arrow",
    at: [cx, LIFE_TOP], points: [[0, 0], [0, LIFE_LEN]],
    head: "none", dashed: true, stroke: "gray"
  });
}
```

Actor color rotation (pick visually distinct neighbors):
`yellow → blue → purple → green → red → orange → gray`.

## Messages

Each message is a horizontal L4 arrow between two actor lifeline x's at a
stepped y.

```js
const ys = compute_layout({
  helper: "chain",
  args: { start: { x: 0, y: LIFE_TOP + 40 }, count: steps.length, dy: 52 }
}).result;

const idx = Object.fromEntries(actors.map((a, i) => [a.id, i]));

steps.forEach((s, i) => {
  const y = ys[i].y;
  const fromX = cx[s.from], toX = cx[s.to];
  const span = Math.abs(idx[s.to] - idx[s.from]);
  const arrow = {
    shape: "arrow",
    at: [fromX, y],
    points: [[0, 0], [toX - fromX, 0]],
    text: s.text,
    dashed: <see Response style below>,
  };
  if (span > 1) arrow.labelT = 0.25;   // cross-lifeline label dodge
  els.push(arrow);
});
```

## Response style (from clarify §1)

Pick one rule and apply uniformly:

| Rule | Solid | Dashed |
|---|---|---|
| **By direction** (default) | `toX > fromX` (left → right) | `toX < fromX` (right → left) |
| **By semantics** (UML) | request / call (caller initiates) | response / return |
| **None** | all messages | — |

Set `dashed: true` on the matching arrows; omit for solid.

## Cross-lifeline label placement

When `span > 1` (e.g. actor[0] → actor[2] crosses actor[1]), the auto-label
sits on the crossed lifeline. Always set `labelT: 0.25` for these arrows —
the label slides toward the sender, dodging mid-lifelines.

For adjacent messages (`span === 1`), leave `labelT` unset — auto midpoint
is fine; the dashed lifelines are thin enough that the label crossing
reads OK (this is the mermaid convention).

## Numbering messages

Convention: prefix each step's text with its 1-based number (`"1. Login
request"`, `"2. GET /authorize"`). Helps when the user iterates ("change
step 4").

## Common pitfalls

- **Actor headers at different heights** → a long actor name wraps and grows
  only its own header, so the lifelines start at different y. Run
  `compute_layout` `equalize` over all actor headers and build them at the
  returned `h`, then drop every lifeline from that single baseline.

- **Solid bar lifelines** (using a thin rect instead of dashed arrow) →
  obscures message labels that cross them. → Always use
  `{ shape:"arrow", head:"none", dashed:true, stroke:"gray" }`.
- **All-solid messages** → can't tell requests from responses. → Apply
  one of the §Response style rules.
- **Long arrow with auto-centered label** → label lands on a crossed
  lifeline. → `labelT: 0.25` when `span > 1`.
- **Actor crowding** → message labels overflow into adjacent lanes. →
  Default `dx: 330` fits ~25-char labels; widen to 380+ for longer.
- **Lifeline length too short** → last message arrowhead overruns. →
  `LIFE_LEN = max(440, 60 + 52 * stepCount)`.
