# 形状与文字

`rect` / `diamond` / `ellipse` / `text` 四种形状元素，是所有图的底。其他组件（stack、panel、axis、legend、tree）只返回坐标，坐标最后都要画成这里的形状。**选哪种形状、配什么颜色**见 [`semantics.md`](semantics.md)；本文件讲字段怎么填。

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

## 混用 sugar 和 raw

同一个数组里可以既有 sugar 元素（有 `shape` 字段），又有 raw Excalidraw 元素（没有 `shape`）。raw 元素原样通过，缺的基础字段补上——从 Excalidraw 导出里贴一段、或手调某一个元素时有用。

## 报错

sugar 元素写错时 `render_diagram` 返回 `{ error, issues: [...] }`，每条 issue 写明出错元素的下标和问题（`unknown fill color`、`arrow "from" references unknown id`、`fromT must be a number in [0,1]`……）。改了再来，失败时不会写任何文件。
