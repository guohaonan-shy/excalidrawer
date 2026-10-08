# Tree recipe

How to compose a tree diagram with sugar elements. Read this AFTER clarifying
intent (SKILL.md §1). Sugar schema basics live in
[`../../shared/references/sugar.md`](../../shared/references/sugar.md) —
this file only covers tree-specific composition.

## The rule: layout comes from `compute_layout` `tree`, never by hand

A tree looks right only when every parent sits at the midpoint of its own
children and no subtree drifts into its neighbour. That is arithmetic over the
whole tree (a tall leaf pushes everything below it), so don't eyeball it — and
don't use the `flowchart` recipe either: it centers each *layer* across the
canvas, so a parent ends up nowhere near its own children.

```js
compute_layout({ helper: "tree", args: {
  root: {
    label: "报告页音频预取",
    children: [
      { label: "刚练完看报告", children: ["1. 原句音频立刻能播…", "2. …"] },
      { label: "播放器",       children: ["10. …", "11. …"] },
    ],
  },
  direction: "right",         // "right" (root left) | "down" (root on top)
  originX: 40, originY: 90,   // leave ~50px above for the title
}})
```

A child may be a bare string (a leaf) or `{ label, desc?, id?, children? }`.
Any extra field you put on a node (e.g. `color`) comes back on `node.data`.

Returns:

- `nodes[]` — `{ id, parent, depth, leaf, label, fontSize, x, y, w, h, titled? }`
  in reading order. `h` already accounts for wrapping and equalizing.
- `segments[]` — the connectors, each already in **sugar L4 form**
  `{ kind, at, points }`. Per parent: one `stem` (parent → trunk), one `spine`
  (along the trunk), one `branch` per child (trunk → child).
- `levels[]` — the band each depth occupies (for level captions).
- `bounds` — `{ x, y, w, h }` of the whole tree.

Useful args (all optional):

| arg | default | when to change |
|---|---|---|
| `widths` | auto per depth from the longest label (right: ≤ 280, deepest level ≤ 420; down: ≤ 220) | a depth should be narrower/wider than auto — pass `[root, level1, level2…]` |
| `fontSize` | `[20, 16, 15]` per depth | larger root, smaller leaves |
| `equalize` | right: `"siblings"`, down: `"depth"` | `"depth"` makes every box in a column the same height; `"none"` lets each fit itself |
| `levelGap` / `siblingGap` / `groupGap` | right 72/16/32, down 64/24/40 | denser or airier |

## Map the result to sugar

```js
const sugar = [
  { shape: "text", at: [40, 28], size: [bounds.w, 34], text: TITLE, fontSize: 24 },
  // connectors first so box borders paint over the trunk ends
  ...segments.map((s) => ({ shape: "arrow", at: s.at, points: s.points, head: "none", stroke: "#495057" })),
  ...nodes.map((n) => ({
    shape: "rect", id: n.id, at: [n.x, n.y], size: [n.w, n.h],
    fill: FILL(n), stroke: STROKE(n), text: n.label, fontSize: n.fontSize,
  })),
];
```

Pass `n.h` through unchanged — it is the equalized height, and it agrees with
sugar's own wrapping (same `fitBoundText` math), so boxes won't grow again.

**`desc` nodes** (a smaller second line, like `ui · visual · ux`): the node has
a `titled` block instead of a bound label. Draw `rect` at `titled.box` with no
`text`, then two `shape: "text"` elements at `titled.title` (`text:
titled.title.text`, `fontSize: titled.title.fontSize`) and `titled.body`
(`textColor: "#495057"`).

**Level captions** (`Root / Category / Skill`): for `down`, put a `text` left
of the tree at each `levels[d]` row's vertical middle — pass `originX` with
room for it (≈ caption width + 32). For `right`, put the caption above each
`levels[d]` column and shift `originY` down by ~32.

**Numbered leaves**: if the source list is numbered, keep its numbers in the
leaf labels (`"7. 作为网络很慢的学生…"`) — readers cross-reference them.

## Color: one hue per branch

| node | fill | stroke |
|---|---|---|
| root | `yellow` — the focal node | default |
| first-level node **with children** | next of `blue, green, purple, red, orange, gray` | default |
| everything under it | the branch's tint: `bgBlue`, `bgGreen`, … | the branch's accent: `blue`, `green`, … |
| first-level **leaf** (flat tree) | `bgBlue` | `blue` |

So a whole branch reads as one family, and the solid/tint split shows
"group vs member" without a legend. A node the user names a color for keeps
it, and its subtree inherits it.

## Choosing direction and widths

Direction is the user's call — SKILL.md §1 always asks it (上下分裂 → `"down"`,
左右分裂 → `"right"`). The notes below are what the recommended option is
based on, and what to tune once it's picked.

- **Right** when leaves are sentences (user stories, requirements): give the
  deepest level a wide column (auto caps at 420) and let text wrap to 2–3
  lines. The canvas grows downward; that is fine for a doc-embedded PNG.
- **Down** when leaves are short words and there are ≤ ~8 of them: it reads
  like an org chart. More leaves than that makes the canvas very wide — switch
  to `right`.

## Built-in template (CLI fallback)

The same layout + coloring is available as a template, useful from the CLI:

```bash
npx -y -p excalidrawer excalidrawer generate -t tree -i tree.json -o ./tree-<name>
```

```json
{ "title": "…", "direction": "horizontal", "numberLeaves": true,
  "levels": ["Root", "Scenario", "Story"],
  "root": { "label": "…", "children": [ { "label": "…", "children": ["…"] } ] } }
```

`direction`: `"horizontal"` (root left) or `"vertical"` (root top).
`numberLeaves` prefixes `1.`, `2.` … in reading order — skip it if labels
already carry numbers. `arrowheads: true` puts heads on child branches
(default is plain connectors, as hierarchies usually are drawn).

## Common pitfalls

- **Arrowheads everywhere.** A tree's direction is implied by the root's
  position; heads on every branch add noise. Use `head: "none"` on all
  segments unless the edges mean "flows to".
- **Hand-placing nodes after the helper.** Moving one node breaks the
  centering of every ancestor. Change the input (order, widths, gaps) and
  call the helper again.
- **Skipping a level to save space.** A group with 12 leaves becomes a very
  tall column; split it into two groups instead.
- **`down` with long leaves.** Sentences in a 220px box wrap into tall narrow
  strips. Use `right`.
- **CJK labels.** Width estimation and font fallback are handled; nothing
  special to do — but keep group labels short (≤ ~10 chars) so the middle
  column stays narrow.
