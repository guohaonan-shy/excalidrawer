# 形状与文字

`rect` / `diamond` / `ellipse` / `text` 四种形状元素，是所有图的底（另有一种只给梯形用的 `polygon`，见下面「多边形」）。其他组件（stack、panel、axis、legend、tree、taper）只返回坐标，坐标最后都要画成这里的形状。**选哪种形状、配什么颜色**见 [`semantics.md`](semantics.md)；本文件讲字段怎么填。

## 什么时候用

- 一个带文字的节点、格子、表头、圆点：`rect` / `diamond` / `ellipse` 加 `text`。
- 一段不带框的文字（标题、副标题、标签、说明）：`shape: "text"`。
- 一个标记点（时间线的圆点）：不带文字的 `ellipse`。

## 文字用什么语言

图里的文字默认写英文，用户明确要别的语言才换；规则和原因见 [`SKILL.md`](../SKILL.md#出图) 的「Output naming + language」。要在写第一个节点之前就定下来：语言决定标签的宽度，进而决定节点和布局。

## 字段

```js
{
  shape:    "rect" | "diamond" | "ellipse" | "text",
  id?:      string,                                  // 不写则自动生成；连线和 stack 结果靠 id 对回
  at:       [x, y],                                  // 左上角，px
  size:     [w, h],                                  // px
  fill?:    "blue" | "bgBlue" | "#rrggbb" | "transparent",
  stroke?:  "blue" | "#rrggbb",                      // 调色板键 → 对应的 strokeXxx；这是形状的边框
  dashed?:  true,                                    // 虚线边框
  text?:    string,                                  // 非空 → 自动绑定一个居中的文字
  textColor?: "blue" | "#rrggbb",                    // 文字颜色；`stroke` 不影响它
  fontSize?: number                                  // 默认 16；diamond 14
}
```

- 非空 `text` 会把 `rect` / `diamond` / `ellipse` 展开成 `[形状, 文字]` 一对，文字以 `containerId` 绑定，之后拖动形状文字仍居中。
- **`stroke` 管边框，`textColor` 管文字。** `stroke` 永远不会作用到绑定的文字；要给文字上色就用 `textColor`（调色板键或 `#rrggbb`），不写就是默认墨色。
- **绑定文字自动折行，框跟着长高。** 文字比 `size[0]` 宽就按框宽折行，框高长到装得下所有行，不用手插 `\n`、也不用给长标签预估高度。
- **`text` 形状（独立文字）不折行。** 它没有框可以绑，太长的一行会冲出所在的格子；自己用 `\n` 断行。Layer A 会用 `TEXT_OVERFLOW_X` 报出来（对独立文字放宽 1.2 倍）。
- **所有文字都居中。** SVG / PNG 导出一律按居中画，`textAlign` 不起作用，原样传入的 raw 元素也改不了。所以：`• ` 项目符号只在几行都很短、长度差不多时才用（`• Fluency` / `• Language Use`）；否则丢掉符号，用不带符号的行（`Label: value`）。一个格子里各行长度要接近，2–4 行。
- 框的 `h` 是**下限**，不是定值：折行的标签只让自己的框长高，别的不动。一组本该齐平的框要用 [`stack.md`](stack.md) 的 `equalize` 量出同一个高度再建。

## 节点形状与颜色（流程图一类）

| 意思 | `shape` | `fill` |
|---|---|---|
| 起点 / 终点 | `rect`（自带圆角） | `blue`（起点）/ `green`（终点） |
| 处理 / 输入输出步骤 | `rect` | `blue` |
| 判断（是 / 否，分叉） | `diamond` | `yellow` |
| 错误 / 失败终点 | `rect` | `red` |

不是错误的节点不要用 `fill: "red"`：这套风格里红色读作"坏"，留给真正的错误。

## 状态机的初始点和终止双圈

两个都是 `ellipse`，墨色写 `#1e1e1e`（调色板里没有墨色这个键）：

```js
// 初始：实心小黑点，直径 22；作为主路径 stack 里的一个 { w: 22, h: 22 } 格子
{ shape: "ellipse", id: "init", at: [x, y], size: [22, 22], fill: "#1e1e1e" }

// 终止：外圈空心 34，里面一个实心 18，同心；外圈带 id，箭头连它
{ shape: "ellipse", id: "final", at: [x, y], size: [34, 34], fill: "transparent" },
{ shape: "ellipse", at: [x + 8, y + 8], size: [18, 18], fill: "#1e1e1e" }
```

内圈整个落在外圈里，Layer A 不报重叠。每个终止状态各接一个双圈，不共用。

## 多边形

`shape: "polygon"` 画一个闭合、填了色的多边形，**只为 [`taper`](taper.md) 的梯形层加**，不是通用的多边形绘图：

```js
{ shape: "polygon", id?: string,
  points: [[x, y], ...],                 // 绝对坐标的顶点，至少 3 个，按顺序连；终点回到起点不用重复写
  fill?: "blue" | "#rrggbb",             // 同形状的 fill；不写就是不填
  stroke?: "blue" | "#rrggbb",           // 边框
  dashed?: true }
```

- 没有 `at` / `size` / `text`：位置全在 `points` 里，层名另画一个 `shape: "text"` 压在上面。
- 展开成一个闭合的线条元素（`.excalidraw` 里就是 Excalidraw 的多边形线），SVG / PNG 里带填充。其他 `line` / `arrow` 不管写什么颜色都不填。
- Layer A 把它当成形状，范围取顶点的外接矩形：跟别的形状部分重叠会报 `SHAPE_OVERLAP`，连线穿过会报 `ARROW_CROSSES_SHAPE`；压在它上面的独立文字，按它的填充算对比度。
- 点连不成面（全在一条水平或竖直线上）会报错。连线用 `from` / `to` 连它时，连的是外接矩形的边。

## 混用 sugar 和 raw

同一个数组里可以既有 sugar 元素（有 `shape` 字段），又有 raw Excalidraw 元素（没有 `shape`）。raw 元素原样通过，缺的基础字段补上——从 Excalidraw 导出里贴一段、或手调某一个元素时有用。

### 画在形状后面的线

sugar 的 `line` / `arrow` 总是在所有形状之后画，所以一条要**压在形状下面**的线（图表的网格线、折线图里穿过圆点的折线）用 sugar 写会盖住形状。把它写成 raw 的 `line`，放在数组里它要垫着的形状**之前**：raw 元素按数组顺序画。

```js
// 一条浅灰虚线网格，宽 560，起点 (100, 320)
{ type: "line", id: "grid-30", x: 100, y: 320, width: 560, height: 0,
  points: [[0, 0], [560, 0]], strokeStyle: "dashed", strokeColor: "#adb5bd", strokeWidth: 1 }
```

`points` 是相对 `x, y` 的偏移；`width` / `height` 是 `points` 的包围盒；颜色只能写十六进制（`strokeColor`），描边色取调色板里 `stroke*` 那一组（蓝 `#1971c2`、橙 `#e67700`、绿 `#2f9e44`、紫 `#7048e8`、灰 `#868e96`）。不需要垫在下面的线仍然用 sugar 的 `line`。

## 报错

sugar 元素写错时 `render_diagram` 返回 `{ error, issues: [...] }`，每条 issue 写明出错元素的下标和问题（`unknown fill color`、`arrow "from" references unknown id`、`fromT must be a number in [0,1]`……）。改了再来，失败时不会写任何文件。
