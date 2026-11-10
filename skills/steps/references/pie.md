# pie：饼图

`pie` 给出每一片扇形的轮廓顶点、放标签（名称 + 百分比）的文字框，以及标签放不进片里时那条引线。**它只返回坐标**：扇形、文字、引线都由你画。

## 什么时候用

- 一个整体分成几块，每块占多少（构成、来源占比、收件人分布），块数 2–6。
- 不是比大小：几块之间谁大谁小、要读准差几个点，用柱状图；随时间变的占比，用 100% 堆叠柱（见 [`axis.md`](axis.md) 的「100% 堆叠柱」）。

## 参数和返回

```text
pie — { slices:[{label, value, valueText?}], r?=120, cx?=r, cy?=r, startDeg?=-90,
        fontSize?=16, decimals?=1, insideW?=r, outsideW?=180, leader?:[radial, horizontal]=[22,14], arcStep?=6 }
    → { kind:"pie", cx, cy, r, total,
        slices:[{ index, label, value, share, valueText, startDeg, endDeg, midDeg,
                  points:[[x,y]...],                         // 圆心 + 弧上的点；整圆没有圆心
                  placement:"inside"|"outside",
                  textBox:{ x, y, w, h, fontSize, text },
                  leader?:{ at:[x,y], points:[[x,y]...] } }],  // 只有 outside 的才有
        bounds:{ x, y, w, h } }
```

- **顺序**：按 `slices` 给的顺序，从 `startDeg`（-90 是 12 点钟方向）开始顺时针排。没有天然顺序的类别先按数值从大到小排好再传；有固定顺序的（和另一张图共用一套颜色和顺序）按那个顺序。
- **占比**：`share` 是这一片占总数的比例，`valueText` 是写在标签上的百分比，`decimals` 位小数（`"13.3%"`）；用户给的就是整数百分比时传 `decimals: 0`。某一片要写别的（`"1.2k"`），给它 `valueText`。`value` 为 0 的那一项没有扇形，返回里也没有它，`index` 照旧对应输入里的位置。
- **标签放哪**：放得进这一片（名称折行后加百分比这一块，四边离弧和两条半径都留着空）就放在片里；放不进就**外移**：引线从这一片弧的正中出发，径向向外一段，再水平拐到圆的这一侧的标签列，标签贴着引线的末端。小片的标签不会丢——放不下就外移，不是省掉。同一侧的几个外移标签会上下错开，不互相压；被错开的标签，引线跟着拐过去，水平那一段不会穿过圆。
- **`textBox.text`** 已经带好 `\n`：第一行起是折行后的名称，最后一行是百分比。按它原样画，不要自己拼。
- **`bounds`** 包住圆和所有标签。外移的标签可能伸到圆的上方、左右两边，画布和标题的位置按 `bounds` 留，不按圆。
- 参数错了会抛出点名 `pie` 和那个参数的错。

## 怎么画出来

```js
const p = compute_layout({ helper: "pie", args: {
  slices: [{ label: "Search", value: 46 }, { label: "Direct", value: 31 },
           { label: "Social", value: 15 }, { label: "Referral", value: 5.5 }, { label: "Email", value: 2.5 }],
  r: 140, cx: 350, cy: 300,
}}).result;
```

先画所有扇形，再画所有标签和引线（标签压在扇形上面）：

- **扇形**：`{ shape: "polygon", id: "slice-0", points: s.points, fill: "blue", stroke: "gray" }`。多边形见 [`shapes.md`](shapes.md) 的「多边形」；相邻的扇形共用一条半径，Layer A 按真实轮廓比，不会报重叠。
- **标签**：`{ shape: "text", at: [b.x, b.y], size: [b.w, b.h], text: b.text, fontSize: b.fontSize }`，`b = s.textBox`。片里的标签按扇形的填充算对比度：浅色填充配默认墨色字。
- **引线**：`{ shape: "line", at: s.leader.at, points: s.leader.points, stroke: "gray" }`。

**放位置**：标题下面留一段空，再放饼图。外移标签会伸到圆的上方，所以先用 `cy: 0` 算一次，拿到 `bounds.y`（标签最高处离圆心多远），再把 `cy` 设成"标题底边 + 空隙 − bounds.y"重算一次。完整可跑的例子是 `examples/chart-figures.mjs` 的 `pieFigure`。

## 效果

- 不配图例：名称和数字写在片上（或片旁），读者不用在图例和扇形之间来回对。
- 颜色每片一种，用浅色的不同色相（蓝、橙、紫、绿、灰的顺序），不用一个色系的深浅：深浅暗示一个顺序，类别之间没有。不用红色。
- 片数超过 6，或有好几片都小于 3%，标签会挤成一串：把小的并成"其他"，或改用横向柱状图。
- 半径 140 左右配 16 号字：四分之一大小的片放得下 8 个字符左右的英文名称（或 4–5 个汉字），名称再长或片再小就外移。名称长（超过 15 个字符）时会折成两三行，不用手动断。
