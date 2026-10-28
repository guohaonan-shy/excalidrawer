# stack：沿一根轴排一组格子，容器按内容长

`stack` 把一组格子沿一个方向排开，**容器尺寸从内容里算出来**：不用手写 `laneH`、`shellH`、`y += h + GAP`，长标签也推不出容器。它只返回坐标；颜色、线型、画成什么由你定。`equalize` 是它的一个选项，也有单独的 helper。两者都经 `compute_layout` 调用。

## 什么时候用

- 一行或一列格子，宽或高要跟着文字走：流程图的主线、一层里的服务、一组里程碑卡、一列行卡。
- 一组本该**一样高（或一样宽）**的格子：用 `equalize`（见下）。
- 容器里再套容器：stack 里嵌 stack 或 [panel](panel.md)，一次调用拿回所有层的绝对坐标。
- 需要一列的总长：顺序图的步骤列，生命线长度取它的 `h`。

## 参数和返回

```text
stack — { dir:"x"|"y", cells:[cell, …],
          gap?=16, pad?=0, align?:"start"|"center"|"end",
          size?, justify?:"start"|"center"|"end"|"space-between", cross?,
          equalize?, maxW?=200, fontSize?=16, x?, y? }
      → { kind:"stack", x, y, w, h, overflow, crossOverflow,
          children:[{ kind, id?, x, y, w, h, … }] }
```

`cell` 有五种：

| cell | 意思 | 结果的 `kind` |
|---|---|---|
| `{ text, w?, fontSize? }` | 一个带文字的格子，高度按 `w` 折行量出 | `text`（另带 `fontSize`） |
| `{ title, body?, w?, titleFontSize?, bodyFontSize?, padding?, gap? }` | 标题加正文的格子，`titledBox` 的量法 | `titled`（另带 `title`、`body` 两个文字区，各带折行后的 `text`） |
| `{ w, h }` | 尺寸已知的格子 | `box` |
| `{ stack: {…} }` | 嵌套的 stack，参数同上，`x`、`y` 不用写 | `stack` |
| `{ panel: {…} }` | 嵌套的 [panel](panel.md) | `panel` |

- `dir` 是主轴：`"x"` 一行，`"y"` 一列。输入里带的 `id` 原样写回对应的结果，靠它把结果对回你的数据。
- **不写 `w` 的文字格**取最长一行的自然宽度（加左右内边距），超过 `maxW`（默认 200）就按 `maxW` 折行。
- `equalize: true`：所有子格取同一横轴尺寸（行 = 同高，列 = 同宽），文字按新尺寸重新量。嵌套的 stack / panel 被拉大后，按新尺寸重排自己的内部。
- `size` 固定主轴长度（含 `pad`），`justify` 分配多出来的空间（`start` / `center` / `end` / `space-between`）。内容放不下时容器撑大，`overflow` 写超出的像素数（放得下为 0）。
- `cross` 固定横轴长度（含 `pad`）：竖排时不写 `w` 的文字格（和不写 `w` 的 panel）铺满 `cross - pad*2`；有格子比它宽，容器撑大，`crossOverflow` 写撑出多少（没撑大为 0）。
- `align` 是横轴上的对齐（`start` / `center` / `end`）。
- 放在固定宽度的列或画布里时，**检查 `overflow` / `crossOverflow`**：不为 0 说明版式被撑开了。

## 怎么画出来

拿到结果后，每个 `children[i]` 画成一个 `rect`（`kind: "text"` 的带 `text`，直接用 `fontSize`）：

```js
{ shape: "rect", id: c.id, at: [c.x, c.y], size: [c.w, c.h], fill: "blue", text: label, fontSize: c.fontSize }
```

- `kind: "titled"`：画一个不带 `text` 的 `rect`，再把 `title.text`、`body.text`（已折行）作为两个独立的 `text` 元素放在 `title` / `body` 的 `x, y` 上。
- `kind: "box"`：尺寸已知，画 `rect` 并自己决定里面的文字。
- 容器本身需要可见的外壳时，用顶层的 `x, y, w, h` 画一个 `rect`，先画，让里面的格子叠在上面。
- 颜色、线型、字号选择在你手里，按 [`semantics.md`](semantics.md) 定。

## 效果

### 一行格子一样高：`equalize`

框的 `h` 是**下限**：标签折行的框只让自己长高，别的不动，三个声明为 `size: [180, 60]` 的框可能画出 60 / 83 / 60，一行就参差了。所以任何本该读成一行 / 一带的格子都要先量整组的高度，再把这个高度给组里每一个框：标签照样折行居中，框齐平，Layer A 照样生效。

最省事的写法是 stack 的 `equalize: true`（上面）。要在 stack 之外量，用单独的 helper（`compute_layout` 把结果放在 `.result` 里）：

```text
equalize — { cells:[{w,text,fontSize?} | {w,title,body?,…} | {w,h}], minH? }
         → { h, cells:[{ w, h, contentH }] }
```

它返回一个能装下整组的高度，每个格子都带上这个组高。把 `h` 当作该组每个框的 `size[1]`。适用的地方：

- **流程图**同一行的分支、一组并列步骤；
- **architecture** 同一层里的服务；
- **timeline** 同一侧的里程碑卡（偏移才能保持不变）；
- **sequence** 的角色表头（所有生命线从同一条基线往下放）；
- **comparison** 的每一对格子（两侧同一个维度要同 y 同 h）。

一整行同 y 同 h 是 comparison 唯一的硬规矩：不一样高，读者没法横着扫。对每个维度各调一次 `equalize`，把左右两侧的格子一起交给它，量出的 `h` 同时给两边：

```js
// 每个维度一次 → 左右一对在间隙两侧齐平；列宽 400、panel 内边距 16 → 内宽 368
const hs = rows.map(([l, r]) => compute_layout({ helper: "equalize", args: {
  cells: [{ w: 368, text: l, fontSize: 14 }, { w: 368, text: r, fontSize: 14 }], minH: 44,
}}).result.h);
// 两侧各一个 panel，body 的格子写成 { w: 368, h: hs[i] }，见 panel.md
```

### 格子里再分格：嵌套

一格之内先排一行、下面再接一行，用 stack 里嵌 stack，一次调用拿回所有层的绝对坐标。比如 comparison 里一侧拆成并排的两张子卡、下方一行总结：

```js
compute_layout({ helper: "stack", args: {
  dir: "y", gap: 20, x: 30, y: 200,
  cells: [
    { stack: { dir: "x", gap: 30, equalize: true,
               cells: [{ text: "Monthly\n$29", w: 200 }, { text: "Annual\n$290", w: 200 }] } },
    { text: "Fits: small teams", w: 430 },
  ],
}})
```

子卡等高（`equalize: true`），整列宽 430。**一侧的外壳宽度永远不因内部拆分而变**：两侧的列外宽相同，只有里面的拆法不同，列宽不一样会读成偏向。窄子卡折行折得对但不一定好看（200 宽的格子大约装 22 个字符）：自己把"价格 · 用量"拆成两行，或缩短短语；大致预算 200 宽 ≈ 22 字符、340 ≈ 40、430 ≈ 52。

### 一列步骤：顺序图的生命线

顺序图的步骤用一列 stack 排，每步是一个文字格（消息文字，宽取它跨的距离），箭头画在格子的底边；**生命线的长度取这个 stack 的 `h`**（再加一点尾巴），不再靠 `60 + 52 * stepCount` 这种公式，步数一多一少也不会不够长。

```js
const steps = compute_layout({ helper: "stack", args: {
  dir: "y", gap: 14, x: 0, y: lifelineTop + 10,
  cells: messages.map((m) => ({ text: m.text, w: 330, fontSize: 14 })),
}}).result;
// 第 i 步的 y = steps.children[i].y；生命线：{ shape: "line", at: [cx, lifelineTop], points: [[0, 0], [0, steps.h + 30]] }
```

### 一个里程碑的三行文字

时间线上每个里程碑的"时间 / 标题 / 描述"三行，各是一个竖排 stack 里的文字格，`align: "center"` 让它们以里程碑为中心；三行的间距由 `gap` 定，不再写 `+28` / `+56`：

```js
compute_layout({ helper: "stack", args: {
  dir: "y", gap: 2, align: "center", x: cx - 105, y: top,
  cells: [{ text: m.time, w: 190, fontSize: 18 }, { text: m.label, w: 190, fontSize: 20 }, { text: m.desc, w: 210, fontSize: 13 }],
}})
```

三行都画成无边框透明的 `rect`，文字绑在里面（这样文字在格子里垂直居中，上下两侧的文字块到轴的距离才一致；单独的 `text` 元素是顶对齐，会把距离拉得不一样）：`{ shape: "rect", at: [c.x, c.y], size: [c.w, c.h], fill: "transparent", stroke: "transparent", text, fontSize, textColor }`。

`time` 的文字用里程碑的颜色（`textColor`），`label` 最醒目（默认墨色），`desc` 灰色小字（`textColor` 取灰）。`yellow` 的文字压在白底上对比不够（Layer A 报 `LOW_CONTRAST`），`orange` 也只有约 3.0:1，同样会报，所以 `time` 取 `yellow` 里程碑时用默认墨色。`desc` 的格宽按文字量定：用户给的描述比默认格宽装得下的长时，放宽格宽（相邻里程碑的间距够的话），不要让它折成两行。同一侧的里程碑卡要等高时，把各卡的 stack 放进 `equalize` 再画。

### 一行里不同宽度的节点：流程图主线

流程图的主线是一个横排 stack：不写 `w` 就按各节点文字取自然宽度，`equalize: true` 让这一行等高，支线（判断分叉下面那一行）另起一个 stack，放在主线下方；`gap` 留够箭头和标签的位置（主线相邻节点之间大约 70）。竖排的流程图换 `dir: "y"`。给整行定一个固定宽度时，用 `size` + `justify: "space-between"`。

```js
compute_layout({ helper: "stack", args: {
  dir: "x", gap: 70, equalize: true, x: 40, y: 150,
  cells: [{ text: "PR opened" }, { text: "CI + review" }, { text: "Approved?" }, { text: "Merge to main" }, { text: "Deploy" }],
}})
```

**判断菱形不要写成文字格**：菱形能放文字的区域比外框小，按文字量出的高度装不下标签。把它写成已知尺寸的格子 `{ w: 170, h: 100 }`（`kind: "box"`），画成 `shape: "diamond"` 并自己绑文字；它比同一行的矩形高，所以这一行不要开 `equalize`（矩形节点之间要齐平就分别放进一个 `equalize` 过的子 stack，或让 `align: "center"` 把它们在行内垂直居中）。

### 在固定宽度里居中排一行

```js
{ stack: { dir: "x", gap: 30, size: 330, justify: "center", cells: items.map((l) => ({ text: l, w: 150 })) } }
```

固定宽度的容器（子泳道、一层的内容区）里把一行条目居中，不用手算 `startX = cell.x + (cell.w - used) / 2`。这通常在 [panel](panel.md) 的 `body` 里写。
