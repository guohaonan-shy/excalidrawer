# Timeline recipe

How to compose a timeline with sugar. Read AFTER clarifying milestones +
style (SKILL.md §2). Sugar schema in
`sugar.md`.

## Dimensions

- `AXIS_Y = 300` — vertical center of the diagram
- `START_X = 200`, `DX = 260` — first milestone x, between adjacent x's
- `DOT = 22` — milestone marker diameter
- `AXIS_START_X = 90`, `AXIS_END_X = xs.at(-1).x + 110` — axis spans full width

```js
const xs = compute_layout({
  helper: "chain",
  args: { start: { x: START_X, y: AXIS_Y }, count: milestones.length, dx: DX }
}).result;
const AXIS_END_X = xs.at(-1).x + 110;
```

Title at `y = 30`, fontSize `28`, size `[60, AXIS_END_X]`.

## Style A — perched dots (recommended, clarify default)

The axis is **discrete segments** between dots; only the last segment has
an arrowhead. Dots sit centered on the axis y. The axis terminates at each
dot edge, dot interior is clean.

Why segments instead of one continuous arrow? In `render`, arrows always
render *after* shapes regardless of input order — a single axis arrow
would draw on top of the dots even when pushed first. Segments avoid the
problem geometrically.

```js
const DOT_R = DOT / 2;  // 11
const GAP = 4;          // breathing room between segment end and dot edge

const breaks = xs.map(p => ({ left: p.x - DOT_R - GAP, right: p.x + DOT_R + GAP }));
const segments = [{ a: AXIS_START_X, b: breaks[0].left }];
for (let i = 0; i < breaks.length - 1; i++) {
  segments.push({ a: breaks[i].right, b: breaks[i + 1].left });
}
segments.push({ a: breaks.at(-1).right, b: AXIS_END_X, tail: true });

// push axis segments
for (const s of segments) {
  els.push({
    shape: "arrow",
    at: [s.a, AXIS_Y],
    points: [[0, 0], [s.b - s.a, 0]],
    head: s.tail ? "arrow" : "none",
  });
}

// push dots centered on the axis
milestones.forEach((m, i) => {
  els.push({
    shape: "ellipse",
    at: [xs[i].x - DOT_R, AXIS_Y - DOT_R],
    size: [DOT, DOT],
    fill: m.color,
  });
});
```

## Style B — lollipop (dots tangent to axis)

A single-arrow axis spans the whole width; dots offset to the label-side
so the line doesn't pierce them.

```js
els.push({
  shape: "arrow",
  at: [AXIS_START_X, AXIS_Y],
  points: [[0, 0], [AXIS_END_X - AXIS_START_X, 0]],
});

milestones.forEach((m, i) => {
  const above = i % 2 === 1;
  const dotTop = above ? AXIS_Y - DOT : AXIS_Y;   // tangent below or above the axis
  els.push({
    shape: "ellipse",
    at: [xs[i].x - DOT / 2, dotTop],
    size: [DOT, DOT],
    fill: m.color,
  });
});
```

## Label triplet per milestone

Each milestone has 3 stacked text elements (`time` / `label` / `desc`),
alternating above and below the axis to avoid visual crowding.

```js
const TY_ABOVE = AXIS_Y - 100;   // top of the text block when above
const TY_BELOW = AXIS_Y + 22;    // top of the text block when below

milestones.forEach((m, i) => {
  const above = i % 2 === 1;
  const ty = above ? TY_ABOVE : TY_BELOW;
  const x = xs[i].x;
  // time — colored to match the milestone
  els.push({ shape: "text", at: [x - 95, ty],      size: [190, 26], text: m.time,  fontSize: 18, stroke: m.color });
  // label — prominent line (largest font, default black)
  els.push({ shape: "text", at: [x - 95, ty + 28], size: [190, 26], text: m.label, fontSize: 20 });
  // desc — muted explanation (gray, smaller)
  els.push({ shape: "text", at: [x - 105, ty + 56], size: [210, 22], text: m.desc,  fontSize: 13, stroke: "gray" });
});
```

- `time` is colored to match its milestone — visual anchor.
- `label` is the prominent line.
- `desc` is muted (`stroke: "gray"`, fontSize 13).

## Color rotation

```
blue → green → yellow → purple → red → orange → gray → ... (repeat)
```

Adjacent milestones get distinct colors. Color the `time` text and the
dot fill with the same value.

## Uneven time gaps

If real time spacing is uneven (Jan, Mar, Aug, Sep), reflect it in the
x spacing rather than uniform `dx`. Compute x's manually:

```js
const monthsFromStart = [0, 2, 7, 8];   // Jan=0, Mar=2, Aug=7, Sep=8
const SCALE = 50;                       // px per month
const xs = monthsFromStart.map(m => ({ x: START_X + m * SCALE, y: AXIS_Y }));
```

Style A's segments still work — walk `xs` the same way to compute the
break points.

## Common pitfalls

- **Axis line piercing dots** (Style A but with a single axis arrow) →
  arrows always render after shapes; the line draws over dots. → Use
  discrete segments.
- **Two adjacent milestones too close** → text blocks overlap. Default
  `DX = 260` fits ~12-char `label` + ~20-char `desc`. Widen for longer.
- **All same color** → milestones blur. Rotate the palette.
- **Title squeezing the first above-side milestone** → keep title at
  `y = 30`, first above-side block top at `y ≈ 200` (~70 px gap).
- **Desc text too long** → wraps onto two lines and overlaps the next
  milestone's text. → Cap `desc` at ~20 chars; longer goes in a separate
  legend (out of scope for this recipe).
