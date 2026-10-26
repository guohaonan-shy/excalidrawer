# 02 — panel：标题区加一组子格的容器

**Blocked by**：01 — stack
**设计冻结**：不涉及 UI

## 要建什么

excalidrawer 是代码生成 Excalidraw 图的库 + CLI + MCP server。01 号工单加了布局组件 `stack`：按内容沿一个方向排一组格子，只返回坐标。这张工单在它上面加 `panel`：一个「标题区 + 内容区」的容器，内容区就是一个 stack。各图类型里都有这种结构：architecture 的分层带，标题在左边单独一列，条目横排在右；comparison 的一侧，标题在上，行卡竖排在下。agent 现在得手算标题下面的偏移（比如 `cell.y + 80`）和容器高度，标签一长就越界。

`panel` 也只返回坐标，标题区画成表头 rect 还是只写一行字，由调用方决定。术语：装子格的容器叫 panel，不叫 card（card 在 recipe 里指单个小格子），见仓库根目录的 `GLOSSARY.md`。

**入参**：

| 参数 | 默认 | 意思 |
|---|---|---|
| `title` | 必填 | 标题文字，可以带换行 |
| `titleSide` | `"top"` | `top`：标题在上方；`left`：标题在左侧单独一列 |
| `titleFontSize` | 18 | 标题字号 |
| `titleW` | 无 | 只对 `left` 有效：标题列宽。不写时取标题的自然宽度（跟 stack 文字格的规则一样，受 `maxW` 200 限制） |
| `pad` | 16 | 外框内边距 |
| `gap` | 12 | 标题区与内容区之间的距离 |
| `body` | 必填 | 内容区的 stack 参数（不含 x/y），`dir` 默认 `"y"` |
| `w` | 无 | 固定整体宽度 |
| `x`, `y` | 0 | 左上角 |

**返回**：`{ kind: "panel", x, y, w, h, title: { x, y, w, h, fontSize }, body: <stack 的结果> }`，全部是绝对坐标。

**规则**：

- `top`：标题区宽度等于 panel 内宽，标题按这个宽度折行、量出高度；内容区在标题区下方 `gap` 处。标题折行时，标题区跟着长高，内容区跟着下移。
- `left`：标题区是左边一整列，高度等于 panel 内高，这样表头 rect 能撑满整行；内容区在标题区右边 `gap` 处。
- 写了 `w`：内容区宽度随之变化，按 body 的 `justify` 分布。没写：panel 的宽度由内容撑出。
- 在 stack 里嵌套：stack 的格子可以写成 `{ panel: {…} }`（01 号工单留了这个口，现在要接上）。外层 stack 打开 `equalize` 把几个 panel 拉成同宽时，每个 panel 按新宽度重排内部。
- 参数错（缺 `title`、缺 `body`、`titleSide` 不认识）：抛错，报错写明 `panel` 和出错的参数。

**接入**：照 01 号工单接 `stack` 的方式接 `panel`：包入口导出；`compute_layout` 白名单和说明各加一项；`sugar.md` 的 helper 列表加一行；README 的 Layout helpers 表加一行；CHANGELOG 的 `Unreleased` 节加一条；`CLAUDE.md` 里 `layout.mjs` 那一行补上 `panel`。

## 验收标准

- [x] `top`：标题区在 `pad` 内，宽等于内宽；内容区 y 等于标题区底边加 `gap`；panel 的 `h` 等于 `pad*2 + 标题高 + gap + 内容高`
- [x] 标题长到折两行时，标题区更高，内容区整体下移同样的距离
- [x] `left`：标题区高度等于 panel 内高；内容区 x 等于标题区右边加 `gap`；写了 `titleW` 时标题列就是这个宽
- [x] 写了 `w` 且 body `justify:"center"`：内容区里的格子水平居中
- [x] 外层 `stack(dir:"y", equalize:true)` 里放两个标题长短不同的 panel：两个 panel 同宽，各自内容区跟着变宽，居中的格子仍然居中
- [x] 复现例子：外层 `stack(dir:"y")` 放两个 `panel(titleSide:"left")`，title 分别是 "Business Services" 和 "Data"，body 是 `stack(dir:"x")`。第一个 body 放 "Order Service" 和 "Payment reconciliation and settlement worker (async, retries)"，第二个放 "Postgres"，条目都只写文字。把结果拼成 sugar（每个 panel 一个 rect，每个条目一个带文字的 rect）交给 `render`：第一个 panel 的高度 ≥ 132 + 上下内边距；`warnings` 里没有 `SHAPE_OVERLAP`（实测：条目宽 160 即复现脚本的 itemW 时，长标签 132 高，panel ≥ 132 + 32；条目只写文字、不限宽时按 maxW 200 封顶，长标签 110 高，panel = 条目高 + 32，同样无 SHAPE_OVERLAP）
- [x] 缺 `title`、缺 `body`：抛错，报错里有 `panel` 和参数名
- [x] MCP `compute_layout` 用 `helper:"panel"` 能拿到 `result`；`HELPERS` 里有 `panel`；包入口能 import 到 `panel`
- [x] `sugar.md`、README、CHANGELOG（Unreleased）、`CLAUDE.md` 都补上了 panel
- [x] `npm test` 全绿

## 选中的存量回归

- 01 号工单新加的 stack 测试：panel 改动了 stack 的格子分派（新增 `{panel}`），嵌套和 equalize 的重排可能被连带改坏
- `tests/validate.test.mjs`：复现验收要靠 `SHAPE_OVERLAP` 不出现来判，要确认 linter 本身的行为没变
- `tests/tools.test.mjs` 里 `compute_layout` 的派发测试：白名单再加一项
- [ ] review 第 1 轮 S2（2026-10-26）：写了 w 但内容放不下时，panel 照旧撑大，结果多一个 overflow，等于撑出的像素数；没撑大时为 0。标题在上方、在左侧两种都要；compute_layout 的说明和 sugar.md 里 panel 的返回补上 overflow
