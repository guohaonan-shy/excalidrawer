---
type: spec
status: 实现中
tags: [engine, component-layer, layout-components]
summary: 加 stack / panel / axis / legend 四个组件，几何由内容推出，不再手算
related: ["[[2026-10-26-component-layer-grill]]", "[[webp-output-format]]"]
issues: [26]
---

# 组件层：stack、panel、axis、legend

## 验证

| issue | 结论 | 证据 |
|---|---|---|
| #26 Component layer: stack/pack and remaining primitives | 存在 | 2026-10-26 对着 `main`（17d0a7f）用一个不提交的脚本，照 architecture recipe 的写法摆一条长标签条目：条目长到 132 高，撑出 100 高的泳道。详情见「问题」 |

## 问题

### 1. 容器尺寸由模型手填，内容一长就越界

![照 architecture recipe 摆出的泳道，长标签条目撑出泳道、压进下一条](../../raw/component-layer/assets/problem-1-lane-overflow.png)

图中的红圈是标注，不属于渲染输出。

复现：照 architecture recipe 的 A 模式调 `swimlane`，`laneH: 100`、`itemH: 56`、`itemW: 160`，三个条目里放一条 "Payment reconciliation and settlement worker (async, retries)"。这个条目的文字按 160 宽折成 5 行，box 自己长到 132 高，占 y 114→246；它所在的泳道是 92→192，下一条泳道从 210 开始。结果条目撑出本泳道，压进下一条。linter 报了两条 `SHAPE_OVERLAP`（跟两条泳道各重叠约 59% 和 27%），但要修只能让模型自己把 `laneH` 重算一遍。正确的结果应该是：泳道高度由里面最高的条目推出来，这个例子里是 132 加上下内边距。

同一类手算在各 recipe 里的分布（2026-10-26 清点）：

| recipe | 手算的几何 |
|---|---|
| comparison | 一侧外框高度 `PAD*2 + sum(hs) + GAP*(n-1)`、行卡逐个 `y += h + GAP`、表头到正文的固定偏移、Layout C 列内拆分与行 y |
| architecture | `laneH: 100`、子泳道 `SUB_H = 180`、居中排一行 `startX = cell.x + (cell.w - used)/2`、条目 `y = cell.y + 80`、子泳道标签 `cell.y + 14` |
| sequence | 生命线长度 `60 + 52 * stepCount`、步骤固定间距 52 |
| timeline | 轴线终点 `+110`、标记点两侧缺口与末段箭头的整套分段算法、按月份换算 x、时间 / 标题 / 描述三行文字的 `+28` / `+56` 偏移 |
| shared（`semantics.md` 图例） | 样线与文字手摆在 `[x, y+10]`、`[x+50, y]`，行距和放在哪个角都靠手算 |

复现材料：`.tmp/to-spec/layout-components/repro/`（本地，不提交）

### 根因

- 只有横轴的一半（`equalize`：一组格子取同一高度）有组件，主轴的一半（沿一个方向排开、算出容器尺寸）没有。`swimlane` 把 `laneH` 当输入，不从内容推；`fitContainer` 只能在子格摆好之后包一圈，不负责摆。
- 「标题区 + 一组子格」的容器、分段轴线、图例三种结构，各 recipe 都用散文加数字描述，库里没有对应的函数。architecture 模板里有一份推导好的 `sectionH`，但只活在模板里，`generate` 在 0.6.0 删掉后就没人用了。
- 修正：issue 原先说「长标签越界，没有东西能抓到」。实测 linter 抓得到（`SHAPE_OVERLAP`），缺的是不用手算就能构造正确的手段。

## 方案

用户最终得到四个组件：agent 把内容（文字、宽度、子格）交给组件，拿回每个子格的位置和容器尺寸；配色、线型、画成什么形状仍由 recipe 按语义决定。

- **stack**：沿一个方向排一组子格。子格的高度（不写宽度时连宽度一起）由文字量出，容器尺寸由子格撑出。子格本身可以是另一个 stack 或 panel，一次调用拿回所有层的绝对坐标。
- **panel**：标题区加一组子格的容器，标题在上方或左侧一列，子格由 stack 排。
- **axis**：一条带标记点的轴。给出标记点后返回各点坐标、留好缺口的分段线、可选的末段箭头、刻度位置、标签锚点，以及数值到坐标的换算。
- **legend**：一块由「样本 + 文字」行组成的图例。返回每行的样本槽和文字槽，整块可以按角摆到图的范围内或外。

拿复现那个例子来说：外层 `stack(dir: "y")` 放两个 `panel(titleSide: "left")`，每个 panel 的 body 是 `stack(dir: "x")`，条目只写文字。泳道高度等于最高条目加内边距（条目宽 160 时是 132 加内边距；不写宽度时按 200 封顶，长标签折 4 行、高 110），不会越界，也用不着 `laneH`。

同一行为的入口，逐个：

| 入口 | 本次 |
|---|---|
| 库：从包入口导出 `stack`、`panel`、`axis`、`legend` | 纳入 |
| MCP `compute_layout`：helper 白名单加四项，工具说明里每项一行参数与返回 | 纳入 |
| CLI `compute-layout --helper`：跟 MCP 共用同一份定义 | 纳入，不用单独改 |
| `skills/shared/references/sugar.md` 的 helper 列表 | 纳入：加四个组件的参数与返回，以及一段怎么配合 sugar 画出来 |
| README 的 Layout helpers 表、`CLAUDE.md` 源码布局里 `layout.mjs` 那一行 | 纳入：列出四个组件 |
| `docs/component-layer.md` 设计笔记 | 纳入：Status 行改成指向这份 spec，Open questions 标明已在这里定 |
| `CHANGELOG.md` | 纳入：只记在 Unreleased 节下，版本号由 #15 发版时写 |
| 各图类型 recipe（`skills/<type>/references/*.md`） | 排除：见 Out of scope |
| 现有 helper（`swimlane`、`gridLayout`、`chain`、`fitContainer`、`titledBox`、`equalize`、`tree`） | 排除：见 Out of scope |
| 内置模板（`src/templates/`） | 排除：见 Out of scope |
| sugar 新增「组件」元素类型（直接展开成 rect + text） | 排除：见 Out of scope |

## User Stories

### 按内容排一组格子（stack）

![stack 的 story 树](../../raw/component-layer/assets/tree-user-stories-1-stack.png)

1. 作为写 recipe 的 agent，我想要给出条目的文字和宽度，就拿回每个条目的位置和容器尺寸，以便不再手写 `laneH`、`shellH` 这类数
2. 作为 agent，我想要条目不写宽度时按文字的自然宽度定宽、超过上限就折行，以便横向一排条目不用逐个定宽
3. 作为 agent，我想要打开 equalize 后同一组格子取同一横轴尺寸，以便一排格子不会因为某个标签折行而参差
4. 作为 agent，我想要给定主轴长度时按 justify 分布，以便在固定宽度的格子里居中排一行条目
5. 作为 agent，我想要在 cells 里直接嵌套 stack 或 panel，一次调用拿回所有层的绝对坐标，以便不用自己平移内层坐标
6. 作为 agent，我想要内容超过给定长度时容器跟着撑大，并告诉我超了多少，以便第一稿不越界，我也知道版式被撑开了

### 带标题的容器（panel）

![panel 的 story 树](../../raw/component-layer/assets/tree-user-stories-2-panel.png)

1. 作为 agent，我想要给出标题和一组子格，就拿回标题区、内容区和每个子格的位置，以便画分层带、对比图的一侧时不用手算标题下的偏移
2. 作为 agent，我想要标题既能放在上方，也能放在左侧一列，以便同一个组件既能画 architecture 的分层表头，也能画 comparison 的侧标题
3. 作为 agent，我想要标题折行时标题区跟着长高、内容区跟着下移，以便长标题不压到子格
4. 作为 agent，我想要外层把几个 panel 拉成同宽时，每个 panel 按新宽度重排内部，以便几层分层带的右边缘对齐

### 画一条轴（axis）

![axis 的 story 树](../../raw/component-layer/assets/tree-user-stories-3-axis.png)

1. 作为画时间线的 agent，我想要给出起点、方向和一组标记点，就拿回标记点坐标和分好的线段（标记点两侧的缺口、末段箭头），以便不再手写分段算法
2. 作为 agent，我想要标记点带数值时按数值线性换算位置，以便间隔不等的里程碑（比如按月份）落在正确位置
3. 作为画图表的 agent，我想要拿到间隔好看的刻度位置和数值到坐标的换算，以便柱状图、折线图按这个换算自己画柱子和点
4. 作为 agent，我想要拿到每个标记点和刻度的标签锚点，标签放在轴的同一侧或上下交替，以便标签不压线、不互相重叠

### 放一块图例（legend）

![legend 的 story 树](../../raw/component-layer/assets/tree-user-stories-4-legend.png)

1. 作为 agent，我想要给出几条文字，就拿回每行的样本槽、文字槽和整块尺寸，以便样本画成色块还是线段由我按语义定
2. 作为 agent，我想要给出图的范围和一个角，图例就自己摆到这个角上（图内或图外），以便不再手算右下角的坐标
3. 作为 agent，我想要图例既能竖排，也能横排成一行，以便放在图下方时不占高度

### 从各个入口调用

![各入口的 story 树](../../raw/component-layer/assets/tree-user-stories-5-surfaces.png)

1. 作为用 MCP 的 agent，我想要 `compute_layout` 的 helper 列表里有这四个组件，说明里写着各自的参数和返回，以便不读源码就能调
2. 作为 CLI 用户，我想要 `compute-layout --helper stack` 等命令能直接跑，以便在脚本里用
3. 作为库的调用方，我想要从包入口 import 这四个函数，以便在自己的代码里组合
4. 作为 #27 的会话，我想要在 `sugar.md` 和这份 spec 里查到每个组件的接口，以及它替掉 recipe 的哪几处，以便照着改 recipe
5. 作为传错参数的调用方，我想要拿到一句说清哪个参数错了的报错，以便自己改正

## 实现决策

### 四个组件只返回坐标

返回位置和尺寸，不返回 Excalidraw 元素，也不带颜色、线型。recipe 拿坐标去拼 sugar 元素。依据：`src/layout.mjs` 开头写着 "pure math, no styling decisions"，现有 11 个 helper 全都只返回坐标；`docs/component-layer.md` 的工作规则：「会让你把同一个数写两遍的进代码，带审美判断的留在 recipe」。

### 共用的约定

- 坐标都是绝对坐标。每个组件都收 `x`、`y`（容器左上角，默认 0），axis 收 `from`。
- 每个结果都带 `kind`（`"stack"` / `"panel"` / `"text"` / `"titled"` / `"box"` / `"axis"` / `"legend"`）和 `x, y, w, h`。
- 输入里带的 `id` 原样写回对应的结果，agent 靠它把结果对回自己的数据。
- 线段沿用 `tree` 的格式：`{ at: [x, y], points: [[0,0],[dx,dy]] }`，直接画成 sugar 的 `shape: "line"` 或 `arrow`。依据：产品已有做法（`tree` 的 `segments`）。
- 文字测量一律走 `fitBoundText` / `titledBox`，跟渲染器用同一套数。依据：`equalize` 的现有做法。
- 参数错了就抛错，报错写明组件名、哪个参数、哪一项（例：`stack: cells[2] needs text, title, h, stack or panel`）。`compute_layout` 已经会把抛错转成 `{ error }`。依据：现有 helper 的写法。

### stack 的接口

```text
stack({
  dir: "x" | "y",                 // 主轴方向，必填
  cells: [cell],                  // 非空
  gap = 16, pad = 0,
  align = "start",                // 横轴：start | center | end
  size?,                          // 固定主轴长度（含 pad）
  justify = "start",              // 有 size 时生效：start | center | end | space-between
  cross?,                         // 固定横轴长度（含 pad）
  equalize = false,               // 所有子格取同一横轴尺寸
  maxW = 200, fontSize = 16,      // 不写宽度的文字格用
  x = 0, y = 0,
})
→ { kind: "stack", x, y, w, h, overflow, children: [result] }
```

cell 收五种（出自 grill，人在 Q2、Q3 同意）：

| cell | 意思 | 结果的 `kind` |
|---|---|---|
| `{ text, w?, fontSize? }` | 一个带文字的格子，高度按 `w` 折行量出 | `text`，另带 `fontSize` |
| `{ title, body?, w?, titleFontSize?, bodyFontSize?, padding?, gap? }` | 标题加正文的格子，`titledBox` 的量法 | `titled`，另带 `title`、`body` 两个文字区 |
| `{ w, h }` | 尺寸已知的格子 | `box` |
| `{ stack: {…} }` | 嵌套的 stack，参数同上，`x`、`y` 不用写 | `stack` |
| `{ panel: {…} }` | 嵌套的 panel | `panel` |

已定的边界情形：

- **不写宽度**：文字格取最长一行的宽度加左右内边距（每边 10，即 bound text 的内边距），超过 `maxW` 就按 `maxW` 折行。实测 "Order Service" 单行宽 129，定宽约 149；那条长标签单行宽 606，按 200 折行。titled 格取标题和正文里最宽的一行加 `padding*2`，同样受 `maxW` 限制。依据：人在 grill 里同意的 Q2 补充。
- **纵向 stack 给了 `cross`**：不写宽度的格子取内宽（`cross - pad*2`），不再按自然宽度。comparison 的整列行卡就是这种：定列宽，行卡铺满。依据：最小改动；这样不用多加一个 `stretch` 对齐值。
- **equalize**：取所有子格横轴尺寸的最大值，所有子格都改成这个值，文字按新尺寸重新量。横向 stack 统一高度，纵向 stack 统一宽度。嵌套的 stack / panel 被拉大后，按新尺寸重排自己的内部（panel 场景 4）。
- **横轴尺寸**：没给 `cross` 时，取最大子格加 `pad*2`。
- **主轴尺寸**：没给 `size` 时，等于 `pad*2 + Σ 子格 + gap*(n-1)`，`justify` 不起作用。给了 `size` 但内容放不下时，容器撑到内容的长度，`overflow` 写超出的像素数；放得下时 `overflow` 为 0。依据：「第一稿就可用」（`PRODUCT.md` 设计原则），宁可撑大也不越界，同时让 agent 知道。
- **space-between 只有一个子格**：按 start 处理。

### panel 的接口

```text
panel({
  title,                           // 必填，可以带 "\n"
  titleSide = "top",               // top | left
  titleFontSize = 18,
  titleW?,                         // 只对 left 有效：标题列宽，不写按自然宽度，受 maxW 限制
  pad = 16, gap = 12,              // 外框内边距；标题区和内容区之间的距离
  body: { …stack 参数，不含 x/y },  // 默认 dir 为 "y"
  w?,                              // 固定整体宽度
  x = 0, y = 0,
})
→ { kind: "panel", x, y, w, h,
    title: { x, y, w, h, fontSize },
    body:  { kind: "stack", x, y, w, h, overflow, children } }
```

- `top`：标题区宽度等于 panel 内宽，标题按这个宽度折行、量出高度；内容区在它下方 `gap` 处。
- `left`：标题区是左边一整列，高度等于 panel 内高，这样表头 rect 能撑满整行，标题文字由 recipe 在这个区域里居中；内容区在它右边 `gap` 处。
- panel 的宽度：写了 `w` 就用 `w`，内容区随之变宽，按 body 的 `justify` 分布；没写就由内容撑出。
- 依据：`top` 覆盖 comparison 的侧标题和 architecture 子泳道的标签，`left` 覆盖 architecture 的分层表头（`swimlane` 的 `headerW` 列）。命名出自 grill：recipe 里 card 已经指单个小格子，装子格的容器叫 panel（`GLOSSARY.md`）。

### axis 的接口

```text
axis({
  from: { x, y },                       // 起点，必填
  dir = "x",                            // x：向右；y：向下
  marks: [{ value?, label?, id? }],     // 可以为空
  domain?: [min, max],                  // 数值范围；mark 都带 value 时不写就取它们的最小、最大值
  length?,                              // 轴长；不写时 = spacing * (n-1) + extend 两端
  spacing = 160,                        // 不按数值摆时，标记点的等距
  extend = [0, 0],                      // 首个标记点之前、末个之后多出的长度
  gap = 0,                              // 每个标记点两侧各断开的长度，0 时不断开
  arrow = "none",                       // none | end：末段画成箭头
  ticks?: { step? , count? },           // 要刻度时写；step 优先，否则按 count（默认 5）取好看的间隔
  labelSide = "after",                  // before | after | alternate；x 轴的 before 是上方，y 轴的 before 是左侧
  labelOffset = 12,
})
→ { kind: "axis", from, to,
    marks: [{ id?, value?, label?, x, y, t, labelAnchor: { x, y, side } }],   // t：在轴上的比例位置，0 到 1
    ticks: [{ value, x, y, labelAnchor }],
    segments: [{ at, points, arrow }],
    scale: { domain, origin, pxPerUnit } }
```

- 摆位：所有 mark 都带 `value` 时按 `domain` 线性换算到轴上（`extend` 之内的那一段）；都不带时按 `spacing` 等距，写了 `length` 就均分；有的带有的不带：抛错。依据：两种摆法分别对应 timeline 的等距与按月份两种写法；混着写没有能对上的语义。
- 好看的间隔：取 1、2、5 乘以 10 的整数次幂里，使刻度数最接近 `count` 的那个，刻度落在它的整数倍上。
- `scale` 给 #12 的图表用：数值 `v` 的坐标是 `origin + (v - domain[0]) * pxPerUnit`，沿轴方向。
- 标签锚点是标签文字的参考点，`side` 说明文字放在锚点的哪一侧，recipe 照着摆 text 元素。`alternate` 时第 1、3、5… 个标记点在 before 侧，第 2、4… 个在 after 侧（timeline 上下交替的写法）。
- 不管：柱子、折线、数据点、网格线。依据：人在 grill Q6 同意的范围；这些归 #12。

### legend 的接口

```text
legend({
  items: [{ label, id? }],              // 非空
  dir = "y",                            // y：竖排；x：横排成一行
  sampleW = 40, sampleH = 16,
  gap = 8,                              // 样本到文字
  itemGap = 8,                          // 行与行（横排时是项与项，默认改为 24）
  fontSize = 14, pad = 12,
  at?: { x, y },
  bounds?: { x, y, w, h }, corner?: "top-left" | "top-right" | "bottom-left" | "bottom-right",
  place = "inside", offset = 16,        // inside：贴着 bounds 内角；outside：放在 bounds 外，跟这个角对齐
})
→ { kind: "legend", x, y, w, h,
    items: [{ id?, text, sample: { x, y, w, h }, label: { x, y, w, h, fontSize } }] }   // text 是输入的 label 文字，label 是它的文字槽
```

- 摆放：有 `corner` 时以它为准，此时 `bounds` 必填；没有 `corner` 就用 `at`；都没有就放在 (0, 0)。`outside` 时，上方两个角放在 bounds 上方，下方两个角放在 bounds 下方，左右跟角对齐。依据：人在 grill Q7 同意。
- 样本槽只是一个框：画色块就填这个框，画线段就从框的左中画到右中。画什么由 recipe 按 `semantics.md` 决定。

### 跟现有 helper、模板的关系

四个组件跟现有 helper 并列，现有 helper 一个不改。`swimlane` 的固定 `laneH` 留着，旧调用照常能跑；recipe 换用 stack / panel 是 #27 的事。模板也不改写到组件上：`generate` 在 0.6.0 删掉，模板只剩库里的直接调用，没有收益。依据：「默认改动最小」。

### 实现中补记的边界做法

工单没写、执行方实现时定的几处，人在 PR #32 的第 1 次停下里批了照现在留下（原话「第二题选 A」，2026-10-26）：

- stack：带标题的格子，结果的标题区、正文区还带上折行后的文字，调用方照量过的样子画。
- stack：竖排且给了 `cross` 时，嵌套的子 stack 保持自然宽度；只有不写宽度的文字格、带标题的格子铺满。
- panel：被定宽或被外层拉宽、比内容需要的宽时，竖排 body 里不写宽度的格子铺满，横排 body 按 `justify` 分布。
- axis：最后一个标记点正好在轴终点时，箭头画在它前面那一段上、指向它。
- axis：自动挑刻度间隔时，两种间隔离 `count` 一样近，取较小的。
- axis：两个标记点的缺口重叠时合并成一个；切出来短于 4 像素的线段丢掉（退化箭头的阈值）。
- axis：给了 `domain` 却算不出正的轴长时抛错，提示写 `length`；没有 `domain` 时 `scale` 的 `domain`、`pxPerUnit` 为 null。

### 每个组件替掉 recipe 的哪几处（给 #27）

| recipe 里的写法 | 换成 |
|---|---|
| architecture A 模式 `laneH: 100` + `swimlane` | 外层 `stack(dir:"y")`，每层一个 `panel(titleSide:"left")`，body 是 `stack(dir:"x")`；外层打开 `equalize` 让各层同宽 |
| architecture B 模式 `SUB_H = 180`、`cell.y + 14`、`cell.y + 80`、`startX = cell.x + (cell.w - used)/2` | 每个子泳道一个 `panel(titleSide:"top")`，body 是 `stack(dir:"x", justify:"center")`；一行子泳道是 `stack(dir:"x", equalize:true)` |
| comparison 一侧 `shellH = PAD*2 + sum(hs) + GAP*(n-1)`、`y += h + GAP`、表头 90 → 正文 175 | 一侧一个 `panel(titleSide:"top")`，body 是 `stack(dir:"y", cross: 列宽)`；两侧行高对齐仍用 `equalize` |
| comparison Layout C 列内拆成两个子卡 + 下方一行 | `stack(dir:"y")` 里嵌一个 `stack(dir:"x", equalize:true)` |
| sequence 生命线长度 `60 + 52 * stepCount` | 步骤用 `stack(dir:"y")` 排，生命线长度取它的 `h` |
| timeline 轴线终点、缺口、末段箭头、按月份换算 | `axis`（`gap` 取圆点半径加留白，`arrow:"end"`，按月份时 mark 带 `value`） |
| timeline 时间 / 标题 / 描述三行的 `+28` / `+56` | 每个里程碑一个 `stack(dir:"y", gap: …)`，三个 text 格 |
| `semantics.md` 图例的手摆坐标 | `legend` + `corner` |

## 技术方案总览

### 后端

不涉及：这是本地库、CLI、MCP stdio 工具，没有服务端、数据库或第三方调用。数据流只有一条：agent 调 `compute_layout`（或库函数）→ 组件量文字、算坐标 → 返回坐标 → agent 拼 sugar 元素 → `render_diagram`。

### 前端内部

不涉及：没有缓存或状态，四个组件都是纯函数。

### 前端交互

不涉及：不碰 UI。

## 测试决策

| 变的是什么 | 仪器 | 本次 |
|---|---|---|
| 纯逻辑、数据转换、状态机 | TDD 单元测试 | 碰到：四个组件的几何都是纯函数，按 story 逐条写会红的测试 |
| API 契约（路由、schema、序列化） | TDD API 测试 | 碰到：`compute_layout` 白名单和说明多四项，每项一条派发测试 |
| DB schema、迁移、并发与事务语义 | 真 DB 测试 | 不涉及 |
| LLM 输出质量（prompt 改动） | eval（确定性断言） | 不涉及：`sugar.md` 只加参考说明，不改 recipe 的流程 |
| 视觉正确性 | UI 实现环 | 不涉及 UI；改用下面「增量功能测试」里的 linter 断言（渲染后 `warnings` 为空） |
| 端到端用户流程 | 浏览器端到端测试 | 不涉及 |

- **seam**：
  - 库导出的四个函数。能抓到：几何对不对、边界情形、报错。漏掉：MCP 的参数映射。
  - `compute_layout` 工具的 `run()`。能抓到：白名单里有、参数平铺能映射到函数、抛错转成 `{ error }`。漏掉：几何细节（交给上一个 seam）。
- **增量功能测试**：
  1. 前置：复现里的三个条目（含那条长标签）。步骤：用 `stack(dir:"y")` 套两个 `panel(titleSide:"left")`，每个 body 是 `stack(dir:"x")`，条目只写文字；把结果拼成 sugar 交给 `render`。期望：泳道高度等于最高条目加上下内边距（条目宽 160 时 ≥ 132 + 上下内边距），`warnings` 里没有 `SHAPE_OVERLAP`。人的决定（2026-10-26）：「第一题选 A」，132 只在条目宽 160 时成立，代码不动。覆盖：stack 1、2、5，panel 1、2。
  2. 前置：一行三个文字格，第二个折成 3 行。步骤：`stack(dir:"x", equalize:true)`。期望：三个子格 `h` 相同，等于折行那个的高度。覆盖：stack 3。
  3. 前置：两个 80 宽的格子，`size: 400`。步骤：分别用 `justify` 的四个值。期望：start 时第一个格子贴左内边距；center 时两侧空白相等；end 时最后一个贴右；space-between 时首尾贴边、中间均分。再把 `size` 改成 100，期望容器宽为内容宽、`overflow > 0`。覆盖：stack 4、6。
  4. 前置：外层纵向 stack 里两个 panel，标题长短不同。步骤：打开 equalize。期望：两个 panel 同宽，各自 body 的宽度跟着变，`justify:"center"` 时子格居中。覆盖：panel 3、4。
  5. 前置：4 个 mark，`value` 分别为 0、1、2、6（月）。步骤：`axis({ from, length: 600, gap: 10, arrow: "end" })`。期望：mark 的 x 按 0 / 100 / 200 / 600 摆；线段在每个 mark 两侧断开 10；最后一段 `arrow: true`。覆盖：axis 1、2。
  6. 前置：`domain [0, 87]`，`ticks: { count: 5 }`。期望：刻度落在 0、20、40、60、80；`scale` 换算 87 得到轴上正确的位置；`labelSide:"alternate"` 时锚点上下交替。覆盖：axis 3、4。
  7. 前置：3 条图例，`bounds` 为 800×500 的图。步骤：`corner:"bottom-right"`，inside、outside 各一次。期望：inside 时右下角距 bounds 右下角各 `offset`；outside 时整块在 bounds 下方、右边缘对齐；`dir:"x"` 时三项一行。覆盖：legend 1、2、3。
  8. 前置：无。步骤：MCP `compute_layout` 依次调四个 helper，以及一条缺参数的调用。期望：前四次都有 `result`，最后一次是 `{ error }` 且报错里写着组件名和参数名；`HELPERS` 里含四个名字。覆盖：从各个入口调用 1、2、5。
  9. 前置：无。步骤：`import { stack, panel, axis, legend } from "excalidrawer"`。期望：四个都是函数。覆盖：从各个入口调用 3。
- **从各个入口调用 4**（文档）不写自动化测试，由 pr-review 的 Spec 轴核 `sugar.md` 和 README 是否列全。
- **prompt / eval 变动**：无 prompt/eval 变动。
- **照着谁写**：几何测试照 `tests/layout.test.mjs` 里 `equalize`、`fitContainer` 的写法，`tree` 的测试在 `tests/tree.test.mjs`；派发测试照 `tests/tools.test.mjs` 的「compute_layout: dispatches equalize」；渲染加 linter 的断言照 `tests/validate.test.mjs`。

## Out of scope

- **改写各图类型的 recipe**：把 recipe 里的数字换成组件调用是 #27 的范围。这份 spec 的「每个组件替掉 recipe 的哪几处」就是交给它的清单。
- **改现有 helper**（`swimlane` 改成从内容推 `laneH` 等）：组件已经覆盖这些场景，改旧 helper 会改变已有调用的输出（「默认改动最小」）。
- **把模板改写到组件上**：`generate` 在 0.6.0 删掉，没有收益。
- **sugar 新增组件元素类型**（比如 `{ shape: "panel" }` 直接展开成 rect + text）：配色和线型要跟着内容走，组件只给几何（「四个组件只返回坐标」）。
- **图表的柱子、折线、数据点、网格线**：归 #12 的新图类型。
- **图标作为子格内容**：归 #17。
- **`docs/gallery/` 的图**：本次不改渲染，gallery 图不变。

## 关联

- 讨论记录：[[2026-10-26-component-layer-grill]]
- 覆盖的 issue：#26 Component layer: stack/pack and remaining primitives
- 设计笔记：`docs/component-layer.md`（本 spec 回答了它的 Open questions：返回坐标；模板不改写；跟现有 helper 并列）
- 相邻还没完成的：
  - #27 Skill refactor（搁置，等本 spec 合进 `main` 后开）：消费本 spec 的组件，按「每个组件替掉 recipe 的哪几处」改 recipe。本 spec 先。
  - #12 New diagram types（搁置，在 #27 之后）：金字塔用 stack，柱状图、折线图用 axis 的 `scale` 和 legend。本 spec 先。
  - #15 0.6.0 feature list：本 spec 的实现 PR 合进 `release/0.6.0`，版本号和 CHANGELOG 的版本条目由 #15 发版时写。
  - [[webp-output-format]]（#13，实现中）：改共享 skill 的导出格式一节；本 spec 只改 `sugar.md` 的 helper 列表，两边不碰同一段，没有先后。
  - #25 Public example gallery：不重叠。
  - #17 Hand-drawn-style icon primitives：图标是子格里的内容，不是布局，不重叠。
  - #24 CJK 折行后拉丁行退回手写字体：文字测量相关，但它管的是字体选择，不改测量结果，不重叠。
