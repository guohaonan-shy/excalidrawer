# 旧排布 helper：chain、gridLayout、swimlane、hubSpoke

四个更早的排布 helper，仍然在用。它们**只按你给的固定尺寸算位置，不看内容**：格子的高度、泳道的高度是你写的数，标签折行了它们也不会跟着变。所以：内容长短不定的一排 / 一列 / 一层优先用 [`stack`](stack.md) 和 [`panel`](panel.md)；下面这几种场景它们更合适。都经 `compute_layout` 调用，返回坐标，不创建元素。

```text
chain       — { start:{x,y}, count, dx?, dy? }                          → [{ x, y, i }]
gridLayout  — { count, cols, cellW, cellH, colGap?=24, rowGap?=24, originX?, originY? }
                                                                         → [{ x, y, w, h, col, row }]
swimlane    — { lanes:[{label,color}], items:[{lane,...}], laneW, laneH, itemW, itemH,
                laneGap?=24, itemGap?=24, headerW?=120, originX?, originY? }
                                                                         → { laneRects, itemPositions }
hubSpoke    — { center:{x,y}, spokeCount, radius, startAngleDeg?=-90, clockwise?=true }
                                                                         → { centerPos, spokePositions }
```

## chain：等距的一串点

从 `start` 起，每步前进 `(dx, dy)`，返回 `count` 个点。适合**每一步间距本来就相等**的线性排列：

- 顺序图里角色的 x（`dx` 大约 330，装得下约 25 个字符的消息标签；标签更长就放宽到 380 以上，否则标签会冲进邻居的泳道），表头 `rect` 以这个 x 为中心。角色表头先用 [`equalize`](stack.md) 量一个统一的高度，再把所有生命线从同一条基线往下放。表头配色在相邻角色之间取差别大的：`yellow → blue → purple → green → orange → gray`（红不给表头：红读作出错，留给强调的消息）；同类的角色同色，不同类的相邻角色才要差别大。
- 流程图的主线（横排或竖排）优先用 [`stack`](stack.md)：节点宽高按文字取，不是等距。只有每个节点尺寸都固定、间距本来就相等的竖排判断树才用 `chain({ start, count, dy })`，`dy` 是节点高加一段间隔。

## gridLayout：规整的格子

`count` 个同尺寸的格子排成 `cols` 列，返回每个格子的 `x, y, w, h, col, row`。适合**所有格子本来就同尺寸**的网格：一屏的卡片、一排排的图标。格子里文字不定长时先用 `equalize` 量一个统一的高度再传 `cellH`。

## swimlane：一层一条泳道

`lanes` 按自上而下排，每条泳道返回一个 `laneRects[i]`（含表头列的宽度 `headerW + laneW`）；`items` 按所属泳道自左向右打包，返回 `itemPositions[i]`（`{ x, y, w, h, item }`），在泳道里垂直居中。画法：每个 `laneRect` 一个 `rect`（`fill: "bg" + Cap(color)`、`stroke: color`、`text: label`）；每个 `itemPosition` 一个 `rect`（`fill: laneColor`、`text: item.label`）。

两个局限，要看清再选它：

- **`itemH` / `laneH` 是下限，不是承诺**：某个条目的长标签折行会撑高它自己，带就不平了。先对这一层的条目跑 `equalize`，把返回的 `h` 当作 `itemH`，并据此定泳道的高度。
- **条目是左对齐打包的，不看连线**：连线多的架构图会拉出斜线。连线多时手工给条目放位置，让互相连接的条目跨层共用一个 x；只有一个条目的层居中在它连接的条目上方。

要让每层按内容自动定高、标题列对齐、条目居中，改用 [`panel.md`](panel.md) 里"分层带"的写法（`stack` 嵌 `panel(titleSide: "left")`）。

## hubSpoke：辐射状

一个中心加 N 个辐条，围着中心均匀分布：`radius` 是中心到辐条中心的距离，`startAngleDeg` 默认 -90（正上方），`clockwise` 默认顺时针。返回 `centerPos` 和 `spokePositions`（每个带 `angleDeg`、`i`）。适合"一个中心，几个外围"的图（服务和它的几个依赖）。辐条数较多时放大 `radius`，否则相邻辐条的框会互相压。
