# 01 — stack：按内容沿一个方向排一组格子

**Blocked by**：无——可立即开工
**设计冻结**：不涉及 UI

## 要建什么

excalidrawer 是代码生成 Excalidraw 图的库 + CLI + MCP server。agent 画图时现在要手填容器尺寸（比如 architecture recipe 的泳道高 `laneH: 100`）：一个条目的标签一长，自己折行长高，就会撑出容器。这张工单加一个布局组件 `stack`：agent 交给它一组格子的内容，它量出每个格子的尺寸，沿一个方向排开，返回每个格子的绝对位置和整个容器的尺寸。它只返回坐标，不产出元素，也不带颜色。这跟现有布局 helper（`equalize`、`fitContainer`、`tree` 等）的约定一样：纯几何，没有样式。

**入参**（一个对象）：

| 参数 | 默认 | 意思 |
|---|---|---|
| `dir` | 必填 | `"x"` 横排，`"y"` 竖排；这是主轴 |
| `cells` | 必填，非空 | 格子列表，五种写法见下表 |
| `gap` | 16 | 相邻格子沿主轴的间距 |
| `pad` | 0 | 容器四边内边距 |
| `align` | `"start"` | 横轴对齐：`start` / `center` / `end` |
| `size` | 无 | 固定主轴总长（含 pad） |
| `justify` | `"start"` | 有 `size` 时的主轴分布：`start` / `center` / `end` / `space-between` |
| `cross` | 无 | 固定横轴总长（含 pad） |
| `equalize` | false | 所有格子取同一个横轴尺寸 |
| `maxW` | 200 | 不写宽度的文字格，宽度上限 |
| `fontSize` | 16 | 文字格的默认字号 |
| `x`, `y` | 0 | 容器左上角 |

**格子的五种写法**：

| 写法 | 意思 | 结果里的 `kind` |
|---|---|---|
| 带 `text`（`w`、`fontSize` 可选） | 一个带文字的格子。高度是文字按宽度折行后要的高度，量法跟现有 `equalize` 的文字格完全一样（同一个折行测量函数） | `"text"`，另带 `fontSize` |
| 带 `title`（`body`、`w`、`titleFontSize`、`bodyFontSize`、`padding`、`gap` 可选） | 标题加正文的格子，量法跟现有 `titledBox` 一样 | `"titled"`，另带 `title`、`body` 两个文字区（各自 x/y/w/h/fontSize） |
| 只有 `w`、`h` | 尺寸已知的格子 | `"box"` |
| `{ stack: {…} }` | 嵌套的 stack，参数同上，不写 x/y | `"stack"`，带它自己的 `children` |
| `{ panel: {…} }` | 嵌套的 panel：由 02 号工单加，这张只需让它报「不认识的格子」 | — |

**返回**：`{ kind: "stack", x, y, w, h, overflow, children }`。`children` 跟 `cells` 一一对应，每一项都带 `kind` 和绝对坐标 `x, y, w, h`。输入里带的 `id` 原样写回结果。

**规则**：

- **不写宽度**：文字格的宽度取最长一行的自然宽度，再加左右内边距（每边 10，跟 bound text 的内边距同一个常量）；超过 `maxW` 就按 `maxW` 折行。titled 格取标题和正文里最宽的一行，加 `padding*2`，同样受 `maxW` 限制。例子："Order Service"（16 号字）单行宽 129，定宽 149。
- **竖排且给了 `cross`**：不写宽度的格子取内宽 `cross - pad*2`，不再按自然宽度。
- **`equalize`**：取所有格子横轴尺寸的最大值，所有格子都改成这个值；文字格、titled 格按新尺寸重新量。横排时统一高度，竖排时统一宽度。嵌套的 stack 被拉大后，按新的横轴尺寸重排自己的内部。
- **横轴尺寸**：没给 `cross` 时，取最大格子加 `pad*2`。格子横轴比容器内宽小时，按 `align` 放。
- **主轴尺寸**：没给 `size` 时，等于 `pad*2 + 各格子主轴尺寸之和 + gap*(n-1)`，`justify` 不起作用，`overflow` 为 0。给了 `size` 且放得下时，按 `justify` 分布，`overflow` 为 0。给了 `size` 但放不下时，容器撑到内容长度，`overflow` 写超出的像素数，不报错。只有一个格子时，`space-between` 按 `start` 处理。
- **参数错**：抛错，报错写明组件名、哪个参数、哪一项，比如 `stack: cells[2] needs text, title, h, stack or panel`，以及缺 `dir`、`cells` 为空等情况。

**接入**（四个组件都照这个方式接，参照现有的 `equalize` 怎么接的）：

- 从包入口导出 `stack`。
- MCP 工具 `compute_layout` 的 helper 白名单加 `stack`，参数平铺进 `args`；工具说明里加一行参数与返回。CLI 的 `compute-layout --helper` 用的是同一份定义，不用单独改。
- `skills/shared/references/sugar.md` 的 helper 列表加 `stack` 一行，再加一小段说明：拿到结果后，每个格子画成一个 rect（或带文字的 rect）。
- README 的 Layout helpers 表加一行。
- `CHANGELOG.md`：只写在 `Unreleased` 节下（没有就新建这一节），不改版本号。
- `docs/component-layer.md`：开头的 Status 行改成「已立项，见 spec `layout-components`」；Open questions 里每条补一句已在 spec 里定了（组件返回坐标；模板不改写；跟现有 helper 并列）。
- `CLAUDE.md` 的源码布局里，`layout.mjs` 那一行补上 `stack`（02、03、04 号工单会各自再补自己的名字）。

现有 helper 一个都不改。

## 验收标准

- [x] 横排三个只写文字的格子：返回的 `w`、`h` 等于 `pad*2 + Σ宽 + gap*2` 和最高格子加 `pad*2`；每个格子的 x 依次递增，间距等于 `gap`
- [x] 一个格子写 "Payment reconciliation and settlement worker (async, retries)"，`w:160`：它的 `h` 是 132，跟 `equalize` 对同一格子量出的高度一致
- [x] 不写 `w` 的 "Order Service" 宽 149；不写 `w` 的长标签宽等于 `maxW`，并且已经折行
- [x] `equalize:true` 横排、其中一个格子折成 3 行：三个格子 `h` 相同，等于折行那个格子的高度
- [x] 竖排给 `cross:400`、`pad:16`：不写宽度的格子宽 368
- [x] 两个 80 宽的格子，`size:400`：`justify` 取 start、center、end、space-between 时，位置分别是贴左、两侧空白相等、贴右、首尾贴边；`size:100` 时容器宽等于内容宽，`overflow` 大于 0
- [x] `align` 取 start、center、end 时，矮格子分别贴上、居中、贴下（横排）
- [x] 嵌套：外层竖排里放一个 `{stack:{dir:"x",…}}`，内层格子拿到的是绝对坐标（等于外层给它的位置加内层偏移）；外层 `equalize` 拉宽后，内层按新宽度重排
- [x] 输入的 `id` 出现在对应结果上
- [x] 缺 `dir`、`cells` 为空、格子写法不认识：抛错，报错里有 `stack` 和出错的参数
- [x] MCP `compute_layout` 用 `helper:"stack"` 调用能拿到 `result`，参数错时拿到 `{ error }`；`HELPERS` 里有 `stack`
- [x] 从包入口能 import 到 `stack`
- [x] `sugar.md`、README、CHANGELOG（Unreleased）、`docs/component-layer.md`、`CLAUDE.md` 都按上面改了
- [x] `npm test` 全绿

## 选中的存量回归

- `tests/layout.test.mjs` 里 `equalize` 的测试：stack 复用同一套测量，改动测量函数的调用方式可能让它们变红
- `tests/tools.test.mjs` 里 `compute_layout` 的派发测试（「dispatches equalize」「unknown helper returns error」「helper throwing is caught as error」）：白名单和说明文字要改
- `tests/tree.test.mjs`：`tree` 也用同一套测量，验证没被连带改坏
