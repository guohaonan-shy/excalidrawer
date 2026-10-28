# 连线：箭头与线

`arrow`（有方向）和 `line`（没有方向）是 Excalidraw 的两个线性工具。**选 arrow 还是 line、实线还是虚线、粗细、端点**见 [`semantics.md`](semantics.md)；本文件讲字段、自动路由，以及几种常见走法（回边、出入边、标签避让、长距离绕行）。

## 什么时候用

- 两个框之间的连线：按 id 连（L1–L3），路径是横平竖直的折线，不会出现斜线。
- 一段结构线（生命线、轴线、树的父子线）或没有框可以连的线：L4，自己给起点和相对偏移。stack / axis / tree 的结果里的线段已经是 L4 形式，直接画。

## 按 id 连：自动布线（L1–L3）

```js
// L1 — 自动选边 + 自动布线
{ shape: "arrow", from: "<id>", to: "<id>" }

// L2 — 钉住出入边；fromT / toT 沿边滑动连接点（0–1）
{ shape: "arrow", from, to, fromSide: "top"|"right"|"bottom"|"left", toSide,
  fromT?: number, toT?: number }

// L3 — U 形绕行，绕开障碍
{ shape: "arrow", from, to, via: "above"|"below"|"left"|"right", clearance?: number }
```

`line` 同样的寻址：`{ shape: "line", from, to, … }`。

## 通用选项（L1–L4 都适用）

```js
{ ...,
  arrowType?:   "sharp" | "round" | "elbow",        // 默认 "round"
  head?:        Arrowhead | "none",                  // 终点，默认 "arrow"
  startHead?:   Arrowhead | "none",                  // 起点，默认 "none"
  strokeStyle?: "solid" | "dashed" | "dotted",       // dashed?: true 是简写
  strokeWidth?: "thin" | "medium" | "bold" | number, // 1 / 2 / 4
  stroke?, labelT?: number /* 0–1 */, text?: string }

// Arrowhead = "arrow" | "bar" | "circle" | "circle_outline" | "triangle"
//           | "triangle_outline" | "diamond" | "diamond_outline"
```

- `arrowType`：Excalidraw 的三种箭头。`round` 在每个点上平滑（Catmull-Rom 曲线，L 形会变成 S 形的弯）；`sharp` 保持直线段和硬拐角；`elbow` 强制每段横平竖直（斜着的一步补成 L 拐角）并把每个拐角圆化。
- **按 id 连的自动布线连线一律写 `arrowType: "elbow"`**（flowchart、architecture、comparison）：自动布线给出的是直线 / L / Z / U 折线，默认的 `round` 会把折点抹成 S 形，拐弯处像蛇一样扭。
- `startHead` / `head`：两端的箭头，`"none"` 去掉。
- `labelT`：`text` 标签落在路径的哪个位置（0 = 起点，1 = 终点）。
- `dashed: true` 是 `strokeStyle: "dashed"` 的简写。

## line

```js
{ shape: "line", ..., edges?: "sharp" | "round",      // 默认 "sharp"
  strokeWidth?, strokeStyle?, stroke?, text? }
```

`edges: "round"` 像 `round` 箭头一样在点上平滑；`"sharp"` 保持硬拐角。

## L4：手动

L1–L3 都不合适时（自由曲线、自定义多段、没有框可连的结构线），给起点和相对偏移：

```js
{ shape: "arrow" | "line", id?, at: [x, y], points: [[dx, dy], [dx, dy], ...] }
```

`points` 是相对 `at` 的偏移。stack / axis / tree 的 `segments` 就是这个形式。

## 自动布线的规则（好预测走向）

两个按 id 连的框：

- **选边**（没写 `fromSide` / `toSide`）：两框在垂直方向上不相交就走垂直（`bottom` ↔ `top`）；水平方向上不相交就走水平（`right` ↔ `left`）；否则看哪个方向的中心差更大。**垂直方向平局时垂直赢**，适合自上而下 / 分层的图。
- **路径形状**：两个边上的点定下来后，
  - 对齐时走**直线**；
  - 两条边垂直时走 **L 形**（一个拐弯）；
  - 两条边平行但错开时走 **Z 形**（在行进方向的中点拐两次）：箭头沿着出入边的法线离开和到达，不会斜着走。

要指定走法就写明 `fromSide` / `toSide`，或用 `via` 做 U 形绕行。

## 几种常见走法

### 下一步：全自动

```js
{ shape: "arrow", from: "a", to: "b", arrowType: "elbow" }
```

路由器挑相对的两条边，按几何走直线 / L / Z。

### 判断分叉：从菱形的下边出去

让"是 / 否"箭头不和主线在菱形左右两条边上抢位置：

```js
{ shape: "arrow", from: "check", to: "fail",
  fromSide: "bottom", toSide: "top", text: "No", arrowType: "elbow" }
{ shape: "arrow", from: "check", to: "save", text: "Yes", arrowType: "elbow" }  // 主线，自动即可
```

一个判断有 **3 个以上分支**时，再用 `fromT` 把下边的出口摊开：`0.3` / `0.5` / `0.7`。多条箭头汇到同一个目标时同理用 `toT`（`0.3` / `0.7`）摊开，别堆在一个点上。

### 回边 / 重试：一对垂直的边

规则：

> **回边永远从主线没用的边出、进。**

主线的箭头占着水平相对的边（右 / 左）。所以回边从 `bottom` 出、进 `left` / `right`，或者反过来，是一对**垂直的边**，路由器把它走成一个干净的 **L 形**：

```js
{ shape: "arrow", from: "fail", to: "input",
  fromSide: "left", toSide: "bottom", text: "retry", arrowType: "elbow" }
```

回边两端正好上下（或左右）对齐时，两条垂直的边连出来就是一条直线，也照样写明出入边，不交给自动选。

**回边不要交给自动选边。** 自动会选"相对的"边，那正是最挤的两条。

### 长距离绕行：`via`

回边要横跨整张图、L 形还是会撞时，用 `via` 的 U 形绕行：

```js
{ shape: "arrow", from: "fail", to: "input",
  fromSide: "bottom", toSide: "bottom",
  via: "below", clearance: 90, text: "retry", arrowType: "elbow" }
```

把连线绕到整行的下方。

**`clearance` 从哪量起：**

- 从两个连接点里**更靠绕行方向的那一个**量起（`via: "below"` 就是更低的那个，`"above"` 是更高的，`"left"` / `"right"` 同理）。连接点是 `fromSide` / `toSide` 定的那条边上的点，不是框的外沿。不写默认 60。
- 它**只看两端，不看沿途别的框**。沿途有比连接点更突出的框，`clearance` 要把它超出的距离也加上，不然线会从那个框里穿过去。
- 出入边建议写成跟 `via` 同一侧（`via: "below"` 配两个 `bottom`）。这时 `clearance` 就是线离框底（`above` 是框顶，左右是框侧）的距离，最好算。

算法：`clearance` = 想留的空隙 + 沿途最突出的框超出那个连接点的距离。

例子：同一排 A、M、C 三个框，顶边都在 y=40，A、C 高 60（连接点 y=100），中间的 M 高 140（框底 y=180）；从 C 回连到 A，两端都写 `bottom`、`via: "below"`：

- `clearance: 50`：绕行横线在 y=150，从 M 中间穿过，Layer A 报 `ARROW_CROSSES_SHAPE`。
- 想让线离 M 的底留 30：M 比连接点多出 180 − 100 = 80，所以填 80 + 30 = **110**，横线在 y=210，Layer A 干净。

### 跨层：竖直落下去

architecture 里跨层的连线写 `fromSide: "bottom"` + `toSide: "top"`，别让自动选：x 偏差大时自动会选水平，而你要的是"落到下一层"。**连线从服务的下边中点出、进下一层服务的上边中点，不写 `fromT` / `toT`，也不为了把线拉直去偏移出入点。** 两个服务正好同列时是一条竖线；没有同列时，不用移动它们，也不用补偏移：肘形线自己在两层之间的空隙里拐成带圆角的 Z 形（竖、横、竖），读者一眼看出是"这个服务连到那个服务"。想少拐弯，只能靠调服务的次序（不改变含义时），不靠偏移出入点。

同一个服务向下连几条线、或几条线汇到同一个服务时，它们共用中点这个出入点，各自在空隙里拐向自己的目标，不用摊开。

### 扇出到一个外框里：连外框，不连里面的卡

用户点名了具体的卡（「Orders 连到 Postgres」）就直接连那两张卡。Layer A（`ARROW_CROSSES_SHAPE`）怎么判，先说清楚：**包住线任一端的框一律不算被穿过**，所以线进到自己所在那层的外壳、再落到里面的卡上，不报；它只报两类：线头线尾都不在其中、却被线横穿的框，比如跳过中间一层时被穿过的那一层外壳，或同一条路上挡着的别的卡。

目标是外框（`bg` 色的壳）里的多张卡、又没有点名其中哪一张时，**把箭头连到外框**，不要连里面的卡：指着某张卡读成「就是它」，指着外框才读成「这一层」。这是读图的取舍，不是 Layer A 的要求：连到卡也不会报警，所以不能拿「没报警」当它画对了的证据。连线照常从中点出入。只有同一对框之间要连两条线、两条会完全重合时，才用 `fromT` / `toT` 把两条错开（不是为了拉直），目标不改：

```js
{ shape: "arrow", from: "lh", to: "ls", fromSide: "bottom", toSide: "top", fromT: 0.3, toT: 0.25, arrowType: "elbow" },
{ shape: "arrow", from: "lh", to: "ls", fromSide: "bottom", toSide: "top", fromT: 0.7, toT: 0.75, arrowType: "elbow" },
```

这样读起来是"指向这一侧的内容"，里面的两张卡自己说明怎么分。大 x 偏移下自动会选水平轴、箭头从侧面出去，所以出入边要明写。

### 表头指向正文

comparison 里每个表头往自己的正文放一个短箭头，自动从下边到上边：

```js
{ shape: "arrow", from: "lh", to: "lb", arrowType: "elbow" }
```

## 标签

- 短标签（`Yes` / `No` / `OK` / `Fail`）：直接用箭头的 `text`，相邻的两个框之间自动摆放就行。
- 箭头很短（主线相邻节点间距大约 70）时，菱形出口上的「Yes」这类标签可能压到箭头头：写 `labelT: 0.3` 把它往起点挪。
- 箭头的中点附近要穿过**别的框**，或箭头很长、自动标签落在被它横跨的线上时：`labelT: 0.25`（靠近发送方）或 `0.75`（靠近接收方）躲开。
- 跨生命线的消息（跨过中间的角色，`span > 1`）总是 `labelT: 0.25`，标签往发送方滑，躲开中间的生命线；相邻两个角色之间（`span === 1`）不写 `labelT`，自动居中即可（生命线很细，标签压上去读起来没问题，这是 mermaid 的惯例）。消息文字比两条相邻生命线之间还长时，往发送方挪也躲不开所有中间的线：生命线是细灰虚线，文字被它擦过读起来没问题，不要为此逐条手算 `labelT`，要躲就放宽角色间距。

## 顺序图里的消息

每条消息是两条生命线 x 之间、某个 y 上的一条水平 L4 箭头：

```js
{ shape: "arrow", at: [fromX, y], points: [[0, 0], [toX - fromX, 0]],
  text: s.text, strokeStyle: "solid" | "dashed", labelT: span > 1 ? 0.25 : undefined }
```

虚线在顺序图里只表示**响应**（把 `semantics.md` §2 里"虚线"的几种意思收窄成一种）；还要表示异步就用颜色（`stroke: "purple"`）或 `(async)` 标签，不要再来第二种虚线。

**用户的选择 → 参数**：clarify 里问"返回消息样式"，选哪项就按哪一行给每条消息写 `strokeStyle`，整张图统一用一条规则：

| 用户选 | 实线（不写 `strokeStyle`） | 虚线（`strokeStyle: "dashed"`） |
|---|---|---|
| **按方向**（默认；用户没选就这样） | `toX > fromX`（左 → 右） | `toX < fromX`（右 → 左） |
| **按语义**（UML） | 请求 / 调用（调用方发起） | 响应 / 返回 |
| **全实线** | 所有消息 | — |

每条消息的文字前缀它的序号（`"1. Login request"`），用户说"改第 4 步"时好对上。每条消息的 y 取自 [`stack.md`](stack.md) 的步骤列。

## 先画谁

渲染顺序固定：背景矩形 → 连线 → 框和文字。连线永远在形状之后画，所以输入顺序救不了"线画在圆点上面"：要让线不盖住某个形状，就把线拆成线段、在形状两侧断开（见 [`axis.md`](axis.md) 的 `segments`）。

## 辅助 helper：`compute_layout`

```text
edgePoint   — { target:{x,y,w,h,type?}, side, t? }   → { x, y }
routeU      — { from:{x,y}, to:{x,y}, side, clearance }  → [[dx,dy]...] 相对偏移
labelAnchor — { points:[[x,y]...], padding?, preferSide? } → { x, y, side, segmentIdx }
```

- `edgePoint`：一个框某条边上 `t`（0–1）处的点，手写 L4 线时用来拿起点。
- `routeU`：从一点到另一点、绕开障碍的 U 形折线（`side` 是绕的方向，`clearance` 的量法同 `via`，见上面「长距离绕行：`via`」：从两点里更靠绕行方向的那个量起，只看两端、不看沿途的框），返回相对偏移，可以直接当 L4 的 `points`。
- `labelAnchor`：给一条折线（绝对坐标）找放标签的位置，返回点和所在线段。
