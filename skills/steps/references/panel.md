# panel：带标题的容器

`panel` = 一块标题区加一个 [`stack`](stack.md) 的内容区，**尺寸从两者算出来**。凡是容器有个标题的地方都用它：architecture 的一层（左边一列标题、右边一排服务）、comparison 的一侧（上面标题、下面一列行卡）、子泳道。它只返回坐标；标题画成表头 `rect` 还是纯文字、外壳填什么颜色由你定。

说"panel"，不说"card"：card 只指 panel 里的一个小格子。

## 什么时候用

- 一个容器有标题：分层带、一侧的对比栏、子泳道。
- 容器里的内容长度不定：不想再写 `cell.y + 80`、`laneH: 100`、`shellH = PAD*2 + sum(hs) + GAP*(n-1)` 这类手算偏移和高度。
- 一组容器要拉成同宽（一列分层带右边缘对齐）或同高（一行子泳道）。

## 参数和返回

```text
panel — { title, body:{ dir?="y", cells, …stack 参数，不含 x/y },
          titleSide?:"top"|"left"="top", titleFontSize?=18, titleW?,
          pad?=16, gap?=12, w?, x?, y? }
      → { kind:"panel", x, y, w, h, overflow,
          title:{ x, y, w, h, fontSize, text },
          body:<stack 的结果> }
```

- `body` 就是一个 stack 的参数（不带 `x`、`y`；`dir` 默认 `"y"`），所以格子写法、`equalize`、`justify`、`cross` 都照 [`stack.md`](stack.md)。
- `titleSide: "top"`：标题区横跨内宽，内容区在它下方 `gap` 处。标题折行时标题区长高，内容区下移。
- `titleSide: "left"`：标题是左边一整列（`titleW` 宽，不写取自然宽度、最宽 200），**高度等于 panel 的内高**，所以表头 `rect` 能撑满整行；内容区在它右边 `gap` 处。
- `w` 固定整体宽度：内容区拿剩下的（横排 body 按 `justify` 分布，竖排 body 里不写 `w` 的格子铺满）。`w` 比内容窄时 panel 撑大，`overflow` 写超出的像素数（没撑大或没写 `w` 为 0）：panel 放在固定列或画布里时检查它。
- panel 自己也是 stack 的一个格子：`{ panel: {…} }`。外层 stack 打开 `equalize: true` 时，panel 被拉成同宽（竖排）或同高（横排），各自按新尺寸重排：标题重新折行、body 被拉伸、居中的格子仍居中。

## 怎么画出来

- 外壳：用顶层 `x, y, w, h` 画一个 `rect`，先画。
- 标题：画成表头 `rect`（`text: title.text`，已折行），位置尺寸取 `title`；或者只画一个 `text` 元素放在 `title.x, title.y`。
- 内容：每个 `body.children[i]` 照 [`stack.md`](stack.md) 画。

```js
const p = compute_layout({ helper: "panel", args: {
  title: "Business Services", titleSide: "left", titleW: 130,
  body: { dir: "x", gap: 40, align: "center", cells: [{ text: "Orders", w: 160 }, { text: "Payments", w: 160 }] },
  x: 40, y: 92,
}}).result;
els.push({ shape: "rect", at: [p.x, p.y], size: [p.w, p.h], fill: "bgGreen", stroke: "green" });
els.push({ shape: "rect", at: [p.title.x, p.title.y], size: [p.title.w, p.title.h], fill: "bgGreen", stroke: "green", text: p.title.text, fontSize: p.title.fontSize });
for (const c of p.body.children) els.push({ shape: "rect", at: [c.x, c.y], size: [c.w, c.h], fill: "green", text: "…", fontSize: c.fontSize });
```

## 效果

### 分层带：architecture 的一层一条 panel（标题在左）

整张图是一个竖排 stack，每层一个 `titleSide: "left"` 的 panel，body 是横排 stack；外层 `equalize: true` 让各层同宽（右边缘对齐）。**所有层的 `titleW` 写成同一个值**，否则每层按自己标题的自然宽度取，标题列宽窄不一，内容区的左边缘就错开了。body 加 `align: "center"`，标题折成两行的层里服务格子垂直居中，不贴在顶上；同时加 `justify: "center"`，层被外层 `equalize` 拉宽后服务在带里居中铺开，不然服务全打包在左边、右边空一大块。画连线时外层 stack 的 `gap` 要放大到箭头装得下（不画连线的 18 不够，取 56 上下），否则箭头只剩一个头。

```js
compute_layout({ helper: "stack", args: {
  dir: "y", gap: 18, equalize: true, x: 40, y: 100,
  cells: layers.map((layer) => ({ panel: {
    title: layer.label, titleSide: "left", titleW: 130,
    body: { dir: "x", gap: 40, align: "center", cells: layer.items.map((l) => ({ text: l, w: 160 })) },
  } })),
}})
```

每层配色：外壳 `bg<Color>` 加同色 `stroke`，标题 `rect` 同底色、`fontSize: 18`，服务格子填中间色。一层一个色系，层与层不同色：

| 层 | 外壳 / 标题 | 服务格子 |
|---|---|---|
| 表现层 | `bgBlue` + `blue` | `blue` |
| 网关 / 中间件 | `bgPurple` + `purple` | `purple` |
| 业务 | `bgGreen` + `green` | `green` |
| 数据 | `bgYellow` + `yellow` | `yellow` |
| 辅助 | `bgGray` / `bgOrange` | `gray` / `orange` |

标题 `title` 的 `fontSize` 取返回值里的 `title.fontSize`，不要另写。

带连线的分层带：各层的服务照常在带里居中，**不要为了对齐把整层平移**（层的条目数不同时，平移会让一层偏右、另一层偏左，整张图失衡）。想让互相连接的服务跨层竖直对齐，先在不改变含义的前提下调这一层的服务次序，让它们尽量落在同一列；仍有错位时用连线的 `fromT` / `toT` 补，见 [`connectors.md`](connectors.md) 的「跨层」。

### 层里再分子泳道（标题在上）

一层之内横向再分几个子泳道（Web 前端和 Mobile 前端并排）：每个子泳道一个 `titleSide: "top"` 的 panel，body 是横排 stack 且 `justify: "center"`；**同一行的子泳道**放进一个 `equalize: true` 的横排 stack，高度一致；整层的表头再用一个 `titleSide: "left"` 的 panel 把这一行包起来：

```js
{ panel: { title: "Frontend", titleSide: "left", titleW: 130, body: { dir: "x", gap: 24, equalize: true, cells: [
  { panel: { title: "Web Frontend",    titleSide: "top", body: { dir: "x", gap: 30, justify: "center", cells: [{ text: "React", w: 150 }, { text: "Admin", w: 150 }] } } },
  { panel: { title: "Mobile Frontend", titleSide: "top", body: { dir: "x", gap: 30, justify: "center", cells: [{ text: "iOS", w: 150 }, { text: "Android", w: 150 }] } } },
] } } }
```

子泳道的标签就是 panel 的 `title`（画成文字，字色同层色）。子泳道被外层 `equalize` 拉宽后，`justify: "center"` 让条目仍旧居中，不用算起点。

条目是"标题加要点"的小块（不只一行标签）时，用 `{ title, body }` 格子，不要写死 `ITEM_H`。

### 对比图的一侧：标题在上，下面一列行卡

comparison 的一侧是一个 `titleSide: "top"` 的 panel，body 是竖排 stack，列宽由 `w` 定（`w` 里包含 panel 自己的 `pad`，body 内宽 = `w - pad*2`）。两侧并排放进一个横排 stack，中间 `gap` 留给 VS。**两侧同一维度的行必须同 y 同 h**：先对每个维度用 [`equalize`](stack.md) 量出一对的高度，再把 `{ w: 内宽, h }` 写进两侧 body 的格子；行卡自己用 `text` 绑文字。

```js
const hs = rows.map(([l, r]) => /* equalize 一对格子，见 stack.md */);
const side = (title, rows) => ({ panel: {
  title, titleSide: "top", w: 400,
  body: { dir: "y", gap: 12, cells: rows.map((_, i) => ({ w: 368, h: hs[i] })) },
} });
compute_layout({ helper: "stack", args: { dir: "x", gap: 120, x: 40, y: 90, cells: [side(leftName, leftRows), side(rightName, rightRows)] } })
```

- 两侧行数不同：外层横排 stack 加 `equalize: true`，两个 panel 取同一个高度，行少的一侧尾部留白，不补格子，空着本身在说"这里没有"（要补的是 `—` / `None` 这样的文字行，不是空白）。
- 每侧行数少（1–2 行、每行一个短语）时别嵌套：用单个面板（外壳透明 + 虚线，文字直接写在里面，行与行之间空一行 `\n\n`），盒子里再套两个盒子是装饰多过内容。
- 两侧各是自己的清单、不是同一个维度时（`Fluency` 对 `Language Use`），也用单个面板：框住不是共同维度的行等于声明了一种不存在的对应。
- 一对一对的行卡：外壳 `bg<Color>` 实线，里面每行一张白卡（`fill: "#ffffff"`、本侧 `stroke`、`textColor`）。

表头 → 正文的小箭头、VS、三列版式见下。

### 对比图的表头与 VS

两侧表头是同 y 同 h 的 `rect`（单行名字，直接绑文字），表头填 `bg<Color>` 加本侧 `stroke` 和 `textColor`；表头往自己的正文放一个短箭头（[`connectors.md`](connectors.md)）。`VS` 是普通文字，放在间隙正中、表头行的垂直中点；不要在间隙里画圆形徽标，那会和卡片抢注意力。间隙 ≥ 100，徽标不能压到任何 rect（`SHAPE_OVERLAP`）。

### 三列版式（中间一列写维度名）

维度名很长、单元格很短时，每行三格：左值、中间维度名、右值。三格同 y 同 h：把三个格子一起交给 `equalize`，用返回的 `h` 建。格子里只写值（不带 `title`），所以都是普通绑定文字。

### 旧的写法：`titledBox` 和 `fitContainer`

不带 panel 时仍可用的两个 helper：

```text
titledBox    — { x, y, w, title, body?, titleFontSize?, bodyFontSize?, padding?, gap? }
               → { box, title, body }   (表头 + 正文，自动高度，上下内边距相等)
fitContainer — { children:[{x,y,w,h}], padding?, minW?, minH? } → { x, y, w, h }
               (把已经放好的子框包起来，四边内边距相等，含底部)
```

- 一个框里有**标题 + 要点**时，别手填高度：手填的高度要么让最后一行贴着下边，要么悬在松散的空白里。用 `titledBox` 量出来；先画 `rect(box…)`，再画两个 `text`。
- 一组已经摆好的节点外面要套一个外框：用 `fitContainer`，外框高度永远不手写。
- 新的布局先考虑 panel / stack；这两个只在已经有一堆摆好的坐标、只差一个壳时用。

## architecture 的提问选项对应哪种写法

architecture 入口 skill 的「结构形态」问题，用户选了哪项，就用哪种写法：

| 用户选 | 写法 |
|---|---|
| 经典分层 | 上面「分层带」：竖排 stack，每层一个 `titleSide: "left"` 的 panel，外层 `equalize: true` |
| 分层加子分组 | 上面「层里再分子泳道」：整层的表头 panel 包一行 `equalize` 过的子泳道 panel |
| 自由拓扑 | 不用 panel 分层带：按分组摆用 [`classic-layouts.md`](classic-layouts.md) 的 `gridLayout`，围着一个中心摆用 `hubSpoke`；连线按 id 连，见 [`connectors.md`](connectors.md) |

「是否画连线」的三个选项（不画 / 关键流 / 完整连线）不对应参数：选了不画就不往元素数组里放任何箭头。
