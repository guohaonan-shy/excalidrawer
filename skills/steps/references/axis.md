# axis：一条带标记点的轴

`axis` 给出一条轴的标记点坐标、已经在标记点两侧断开的线段、可选的刻度，以及"数值 → 坐标"的换算。**它只返回坐标**：圆点、标签文字、刻度线都由你画。

## 什么时候用

- 时间线的主轴：里程碑圆点等距，或按月份 / 日期换算位置。
- 图表的坐标轴（柱状图、折线图，见 [`chart` 入口 skill](../../chart/SKILL.md)）：竖着向上长的数值轴，好看的刻度间隔，加上 `scale` 把数据值换成坐标。
- 任何"一条线上串着几个点"的东西。

## 参数和返回

```text
axis — { from:{x,y}, dir?:"x"|"y"|"up"="x", marks?:[{value?,label?,id?}], domain?:[min,max],
         length?, spacing?=160, extend?:[before,after]=[0,0], gap?=0, arrow?:"none"|"end"="none",
         ticks?:{step?|count?}, labelSide?:"before"|"after"|"alternate"="after", labelOffset?=12 }
     → { kind:"axis", from, to,
         marks:[{ id?, value?, label?, x, y, t, labelAnchor:{x,y,side} }],
         ticks:[{ value, x, y, labelAnchor }],
         segments:[{ at, points, arrow }],
         scale:{ domain, origin, pxPerUnit } }
```

- `dir: "x"` 向右，`"y"` 向下，`"up"` 向上。`from` 是轴的起点，`to` 是终点。`"up"` 是图表数值轴的方向：起点是基线，数值越大 mark、tick 离基线越高；它的标签侧跟 `"y"` 一样（`before` 在左，`after` 在右）。
- **摆位**：所有 mark 都带 `value` 时，按 `domain` 线性换算到轴上（`extend` 以内的那一段）；都不带时按 `spacing` 等距，写了 `length` 就均分；有的带有的不带会报错。`extend` 是第一个标记点之前、最后一个之后多出来的轴长（轴的"尾巴"）。
- **缺口**：`gap` 是每个标记点两侧各断开多长（取圆点半径加一点留白），`0` 不断开。线段因此永远不会穿过圆点。
- **箭头**：`arrow: "end"` 把最后一段标成箭头（时间朝那边流）。
- **刻度**：`ticks: { step }` 或 `{ count }` 在 `domain` 内按 1 / 2 / 5 × 10ⁿ 的倍数加刻度，最多 1000 个（更多会报错，调大 `step` 或调小 `count`）。
- **标签**：`labelAnchor` 是标签文字的参考点，`side` 说明文字在锚点的哪一侧；x 轴的 `before` 在上方，y 轴的 `before` 在左侧。`labelSide: "alternate"` 让第 1、3、5… 个标记点在 `before` 侧，第 2、4… 个在 `after` 侧。
- **换算**：不在标记点上的数值用 `scale`：沿轴方向的坐标 = `origin + (v - domain[0]) * pxPerUnit`（`dir: "x"` 是 x，`"y"` 和 `"up"` 是 y）。`"up"` 的 `origin` 是基线的 y，`pxPerUnit` 是负数（值越大 y 越小），所以同一个公式给出的是页面坐标，不用再翻一次。
- **`domain` 只许首小于等于尾**：想让数值从上往下变大，不是把 `domain` 倒过来写（会报错），而是换方向（`"y"`）。

## 怎么画出来

- **线段**：每一段画成 L4 的 `line`：`{ shape: "line", at: seg.at, points: seg.points }`；`seg.arrow` 为 true 的画成 `shape: "arrow"`。
- **圆点**：`{ shape: "ellipse", at: [m.x - r, m.y - r], size: [2*r, 2*r], fill }`，`r` 是半径；`gap` 取 `r` 加一点留白。
- **标签**：`shape: "text"` 放在 `labelAnchor` 上，按 `side` 摆。
- 为什么用分段而不是一条贯穿的箭头：渲染时箭头永远画在形状后面，一条贯穿的轴线会画到圆点上面，即使先推进数组也一样。分段在几何上避开了这个问题。

## 效果

### 用户的选择 → 参数（timeline 入口 skill 的 clarify）

| 用户选了 | 怎么传 |
|---|---|
| 居中穿珠（推荐） | 写 `gap`（圆点半径加留白），圆点画在 mark 上，轴被分成若干段；末段 `arrow: "end"` |
| lollipop | 不写 `gap`，整条是一根箭头；圆点偏向标签那一侧，见下面「Lollipop」 |
| 时间点不均，按真实跨度拉开 | 每个 mark 带 `value`，写 `domain` 和 `length`，见下面「间隔不均」 |
| 只关心先后，等距 | 不带 `value`，用 `spacing` |

### 居中穿珠（推荐）：圆点居中在轴上，轴在珠处断开

```js
const ax = compute_layout({ helper: "axis", args: {
  from: { x: 90, y: 300 }, dir: "x",
  marks: milestones.map((m) => ({ label: m.label })),
  spacing: 260,            // 相邻里程碑的间距
  extend: [110, 110],      // 轴在首尾圆点之外各多出这么长
  gap: 15,                 // 圆点半径 11 + 留白 4
  arrow: "end",
  labelSide: "alternate",  // 时间 / 标题 / 描述的文字上下交替，避免挤在一边
}}).result;

for (const s of ax.segments) els.push({ shape: s.arrow ? "arrow" : "line", at: s.at, points: s.points });
ax.marks.forEach((k, i) => els.push({ shape: "ellipse", at: [k.x - 11, k.y - 11], size: [22, 22], fill: milestones[i].color }));
```

### Lollipop：圆点切在轴的一侧

轴不断开（`gap` 不写），整条是一根箭头；圆点偏向标签那一侧，让线不穿过它：

```js
// ax.segments 只有一段 arrow:true
const above = k.labelAnchor.side === "before";   // 圆点跟着标签所在的一侧
els.push({ shape: "ellipse", at: [k.x - 11, above ? k.y - 22 : k.y], size: [22, 22], fill });
```

圆点占了轴一侧的 22 px，标签锚点默认离轴 12 px，会压到圆点：把 `labelOffset` 加上圆点直径。

### 间隔不均：按月份、按日期

mark 带 `value`，位置自动按数值线性换算，不用再手算：

```js
marks: [0, 2, 7, 8].map((v) => ({ value: v, label: monthName(v) })),   // Jan=0, Mar=2, Aug=7, Sep=8
domain: [0, 8], length: 640, extend: [110, 110], gap: 15, arrow: "end",
```

两个值离得很近时文字块会重叠：把 `length` 放长，或错开 `labelSide`。

### 图表坐标轴

一张柱状图或折线图要两条轴：**数值轴**和**类别轴**（或时间轴）。图表不是组件：柱子、折线、圆点、网格线都用这两条轴的返回值自己画。完整可跑的例子是 `examples/chart-figures.mjs`。

```js
// 数值轴：向上长，0 在基线，100 在基线上方一个轴长
const v = compute_layout({ helper: "axis", args: {
  from: { x: 100, y: 470 }, dir: "up", domain: [0, 100], length: 300,
  ticks: { count: 5 }, labelSide: "before",
}}).result;

// 类别轴：每个类别一个不带 value 的 mark。让 mark 落在等宽分带的正中：
// 两头各留半个分带（extend），mark 在中间均分
const band = 560 / categories.length;
const c = compute_layout({ helper: "axis", args: {
  from: { x: 100, y: 470 }, dir: "x", length: 560,
  extend: [band / 2, band / 2], marks: categories.map((label) => ({ label })),
}}).result;
```

- **刻度文字**放在 `v.ticks[i].labelAnchor`（`side` 是 `before`，文字在锚点左侧）。数值轴的下限要落在一个刻度上，所以折线图的数值轴想从 40 起就写 `domain: [40, 90]`，下限就是整齐的第一个刻度；柱状图从 0 起。
- **数据值 → y**：`y = v.scale.origin + (value - v.scale.domain[0]) * v.scale.pxPerUnit`，`"up"` 的 `pxPerUnit` 是负数，直接得到页面 y。
- **类别文字**放在 `c.marks[i].labelAnchor`（轴下方），宽度取一个分带减去一点留白。
- **轴线**：两条轴的 `segments` 各画成一条 `line`，不加箭头。
- **网格线**：每个刻度（基线那个除外）一条浅灰虚线，从数值轴画到图的右边。**网格线用 raw 的 `line`，放在数组最前面**：sugar 的 `line` 总是画在所有形状上面，会盖住柱子。写法见 [`shapes.md`](shapes.md) 的「画在形状后面的线」。
- **柱子**（竖）：每个类别的分带里，一个系列一根 `rect`。柱子底边是基线，顶边是 `y(值)`：`at: [x, y(值)]`，`size: [柱宽, 基线 y - y(值)]`。多系列的同一个类别，柱子并排紧贴，整组居中在 mark 上，组宽约取分带的 70%。
- **柱顶的数值**：一个 `text` 放在柱顶上方，宽度等于柱宽加一点，写不下的长数字缩小字号。
- **折线**：一个系列的所有点依次连成一条线，用 raw 的 `line`（`points` 相对第一个点），颜色用该色系的描边色，放在圆点前面；圆点是 `ellipse`（直径约 10，填同一个描边色），压在线上。末点右侧一个 `text` 写数值。
- **图例**：多系列时用 [`legend.md`](legend.md)，放在图的右上角、图的外面。样本画成与系列同色的色块。
- **轴标题**（可选）：一个 `text`，数值轴的写在轴顶上方、靠左；类别轴的写在类别文字下方。单位写进数值轴标题。

#### 横着的柱状图（类别名长、类别多）

类别沿竖轴往下排，柱子向右长：数值轴是 `dir: "x"`（起点在左下，刻度文字 `after` 在下方），类别轴是 `dir: "y"`（起点在左上，`labelSide: "before"` 把类别名放在轴左侧）。`scale` 此时给的是 x：`x = origin + (value - domain[0]) * pxPerUnit`，柱子 `at: [基线 x, 类别 mark 的 y - 柱高 / 2]`、`size: [x(值) - 基线 x, 柱高]`，数值写在柱子右端外侧。网格线是竖的。类别名放得下的地方要给够：轴左侧留出最长类别名的宽度。

### 里程碑旁边的文字

每个里程碑的"时间 / 标题 / 描述"三行不要再手写偏移：用 [`stack.md`](stack.md) 的竖排 stack 排，位置取 `mark.labelAnchor`：`side` 是 `before` 的，stack 的底边落在锚点上方；是 `after` 的，stack 的顶边落在锚点下方。相邻里程碑太近会让文字块重叠：默认 260 的间距装得下约 12 个字符的标题加 20 个字符的描述，更长就放宽；描述超过 ~20 个字会折行、压到邻居，要么缩短，要么放进图例。

文字块和标题：轴的 y 要按**上侧**文字块的高度往下放，让上侧第一块的顶边离标题底边至少约 70 的空隙（标题的位置和字号见 [`semantics.md`](semantics.md) §9）；轴放得太靠上，标题会贴着第一块文字。
