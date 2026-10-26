# 03 — axis：带标记点的分段轴

**Blocked by**：无——可立即开工
**设计冻结**：不涉及 UI

## 要建什么

excalidrawer 是代码生成 Excalidraw 图的库 + CLI + MCP server。timeline recipe 现在让 agent 手写一整套轴线算法：轴线终点要多出 110，每个圆点两侧要把轴线断开留缺口，最后一段要画成箭头，按月份摆的时候还得手算 x。之后的柱状图、折线图（另一个 issue）也需要坐标轴：刻度位置，以及数值到坐标的换算。这张工单加布局组件 `axis`，把这些算好返回。它只返回坐标；柱子、折线、数据点、网格线都不归它管。

**入参**：

| 参数 | 默认 | 意思 |
|---|---|---|
| `from` | 必填 | 起点 `{x, y}` |
| `dir` | `"x"` | `x` 向右，`y` 向下 |
| `marks` | `[]` | 标记点列表，每项可带 `value`、`label`、`id` |
| `domain` | 无 | 数值范围 `[min, max]`；mark 都带 `value` 时不写，就取它们的最小值和最大值 |
| `length` | 无 | 轴总长；不写时等于 `spacing*(n-1)` 加两端 `extend` |
| `spacing` | 160 | 不按数值摆时，标记点之间的等距 |
| `extend` | `[0, 0]` | 第一个标记点之前、最后一个之后多出的长度 |
| `gap` | 0 | 每个标记点两侧各断开多长；0 表示不断开，整条是一段 |
| `arrow` | `"none"` | `end`：最后一段画成箭头 |
| `ticks` | 无 | 要刻度时写 `{ step }` 或 `{ count }`（count 默认 5） |
| `labelSide` | `"after"` | `before` / `after` / `alternate`；x 轴上 before 是上方，y 轴上 before 是左侧 |
| `labelOffset` | 12 | 标签锚点离轴线的距离 |

**返回**：`{ kind: "axis", from, to, marks, ticks, segments, scale }`

- `marks`：每项 `{ id?, value?, label?, x, y, t, labelAnchor: { x, y, side } }`。`t` 是这个点在轴上的比例位置，0 到 1。
- `ticks`：每项 `{ value, x, y, labelAnchor }`；没要刻度时是空数组。
- `segments`：每段 `{ at: [x, y], points: [[0,0],[dx,dy]], arrow }`。这跟现有 `tree` helper 返回的线段格式一样，调用方直接画成 sugar 的 `line`，`arrow` 为真的那段画成 `arrow`。
- `scale`：`{ domain, origin, pxPerUnit }`。数值 v 在轴上的坐标是 `origin + (v - domain[0]) * pxPerUnit`（沿轴方向）。

**规则**：

- **摆位**：mark 都带 `value` 时，按 `domain` 线性换算到 `extend` 以内的那一段；都不带时按 `spacing` 等距，写了 `length` 就在 `extend` 以内均分。有的带、有的不带：抛错。
- **好看的间隔**：给了 `step` 就用它；否则在 1、2、5 乘以 10 的整数次幂里，挑刻度数最接近 `count` 的间隔，刻度落在间隔的整数倍上，范围不超出 `domain`。
- **`alternate`**：第 1、3、5… 个标记点的标签在 before 侧，第 2、4… 个在 after 侧。
- **参数错**（缺 `from`、`dir` 不认识、value 有的有有的没有）：抛错，报错写明 `axis` 和出错的参数。

**接入**：照现有 `equalize` 的接法。包入口导出；MCP `compute_layout` 白名单和说明各加一项；`skills/shared/references/sugar.md` 的 helper 列表加一行，并说明 segments 怎么画；README 的 Layout helpers 表加一行；CHANGELOG 只写在 `Unreleased` 节下（没有就新建）；`CLAUDE.md` 源码布局里 `layout.mjs` 那一行补上 `axis`。现有 helper 和 timeline 模板都不改。

## 验收标准

- [x] 4 个 mark，value 为 0、1、2、6，`length:600`：x 依次是 `from.x` 加 0、100、200、600
- [x] 3 个不带 value 的 mark，`spacing:160`：间距都是 160，`to` 在最后一个点之后 `extend[1]` 处
- [x] `gap:10`：线段在每个 mark 两侧各断开 10；`gap:0`：只有一段
- [x] `arrow:"end"`：只有最后一段 `arrow` 为真
- [x] `domain:[0, 87]`、`ticks:{count:5}`：刻度是 0、20、40、60、80；`scale` 换算 87 正好落在轴的终点（不算 extend）
- [x] `labelSide:"alternate"`：锚点在上下两侧交替；`dir:"y"` 时 before 在左
- [x] value 有的有有的没有：抛错，报错里有 `axis`
- [x] MCP `compute_layout` 用 `helper:"axis"` 能拿到 `result`；`HELPERS` 里有 `axis`；包入口能 import 到 `axis`
- [x] 把 segments 画成 sugar 的 `line` / `arrow` 交给 `render`：不报错，`warnings` 里没有退化箭头（degenerate arrow）
- [x] `sugar.md`、README、CHANGELOG（Unreleased）、`CLAUDE.md` 都补上了 axis
- [x] `npm test` 全绿

## 选中的存量回归

- `tests/linear.test.mjs`：axis 的线段要画成 line / arrow，要确认线性元素的行为没变
- `tests/tools.test.mjs` 里 `compute_layout` 的派发测试：白名单再加一项
- `tests/tree.test.mjs`：axis 沿用 tree 的线段格式，确认格式约定没被改
- [x] review 第 1 轮 C1（2026-10-26）：axis 的源码说明里不用术语表列为避免的叫法（GLOSSARY.md 在 axis 下写明 _Avoid_: segmented axis, timeline line），统一叫 axis
- [x] review 第 1 轮 S1（2026-10-26）：数值范围首尾相等（一个带数值的标记点、所有值相同、或 domain 写成 [3,3]）又要刻度时，调用正常返回：只出一个刻度，落在这个值上，标记点照旧在起点；配一条回归测试，确认这三种输入都在合理时间内返回
- [x] review 第 1 轮 S3（2026-10-26）：axis 的数字参数（spacing、labelOffset、gap、length、extend、ticks 的 step 和 count、mark 的 value）传成非数字时抛错，报错写明 axis 和参数名，写法与 stack、panel 已有的数字检查一致；不再返回 NaN 坐标
