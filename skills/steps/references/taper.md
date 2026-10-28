# taper：逐层收窄的梯形

`taper` 给出一摞梯形每一层的四个角、放层名的文字框、右侧数值的锚点，以及相邻两层之间转化率的锚点。上窄是**金字塔**，下窄是**漏斗**。**它只返回坐标**：梯形、文字都由你画。

## 什么时候用

- 金字塔：一组有层级的项，底层支撑上层（需求层次、测试金字塔、数据分层）。
- 漏斗：一串带数的阶段，逐步流失（注册转化、销售管线、招聘漏斗）。
- 层宽只跟层序有关，不跟数值成比例：按数值缩放时，转化率低的最后一两层会窄到放不下字。数值写在层的右边，不靠宽度表达。

## 参数和返回

```text
taper — { layers:[string | {text, value?}] (自上而下), width, narrow?:"top"|"bottom"="top",
          minWidth?=0.3*width, layerH?=56, gap?=12, fontSize?=16, valueGap?=24, x?=0, y?=0 }
      → { kind:"taper", narrow, x, y, w, h, cx,
          layers:[{ index, text, value?, x, y, w, h,
                    corners:[[x,y]×4],                 // 左上、右上、右下、左下
                    textBox:{ x, y, w, h, fontSize, text },
                    valueAnchor?:{ x, y } }],
          rates:[{ from, to, anchor:{x,y}, ratio?, text? }] }
```

- **层的顺序永远是自上而下**，不管往哪头收窄。金字塔的第一项是塔尖，漏斗的第一项是入口。用户按"底层在前"说（需求层次从生理需求说起）时，你先反过来再传。
- `narrow: "top"` 是金字塔（默认），`"bottom"` 是漏斗。`width` 是整张图最宽那条边：金字塔是最下一层的底边，漏斗是第一层的顶边。
- **层宽等步收窄**：最宽的那条边每过一层往里缩同样的一步，所以斜边连起来是一条直线（被层间的缝断开）。`minWidth` 是最窄那条边的宽度，默认 `width` 的 30%，步长由它倒推；层名很长或层很多时调大它，不要靠缩字号。
- **文字框**：宽度是这一层最窄那条边减去两侧留白，高度是折行后的行数。放不下就折行，`textBox.text` 已经带好 `\n`，按它原样画；折行后装不下的层会自己长高，下面的层跟着往下挪，所以不要自己算每层的 y，一律取返回的。`textBox` 整个落在梯形里。
- **`layers[i].x, y, w, h`** 是这一层梯形的外接矩形，`corners` 是四个顶点。
- **`valueAnchor`**：只有带 `value` 的层才有。所有层的数值锚点在同一列（整张图右边缘往右 `valueGap`），纵向对着这一层的中线。它是数值文字的**左中**：`at: [anchor.x, anchor.y - 文字高 / 2]`。
- **`rates`**：每一对相邻层都有一项（N 层就有 N-1 项），不论这些层有没有给数、给的是不是数字；`anchor` 在两层之间的缝里，跟数值同一列。`ratio`（下一层除以上一层）和 `text`（写好的百分比，`"40%"`、`"12.5%"`）只在两层的 `value` 都是数字、上一层大于 0 时才带上。所以用户只给转化率、每层没有数时，传不带 `value` 的层，转化率文字自己写在对应的 `anchor` 上；`value` 写成 `"10,000"`、`"1.2M"` 这类字符串时只摆数值，也没有 `text`，要转化率就自己算好再写在 `anchor` 上。
- 参数错了会抛出点名 `taper` 和那个参数的错。

## 怎么画出来

```js
const f = compute_layout({ helper: "taper", args: {
  layers: [{ text: "Visited", value: 1000 }, { text: "Signed up", value: 400 },
           { text: "Activated", value: 120 }, { text: "Paying users", value: 30 }],
  narrow: "bottom", width: 560, x: 40, y: 100,
}}).result;
```

对每一层 `l`：

- **梯形**：`{ shape: "polygon", id: "layer-0", points: l.corners, fill: "blue" }`。多边形见 [`shapes.md`](shapes.md) 的「多边形」。
- **层名**：`{ shape: "text", at: [b.x, b.y], size: [b.w, b.h], text: b.text, fontSize: b.fontSize }`，`b = l.textBox`。文字压在梯形上，Layer A 按梯形的填充算对比度：浅色填充配默认墨色字。
- **数值**：`{ shape: "text", at: [l.valueAnchor.x, l.valueAnchor.y - 11], size: [宽, 22], text: String(l.value) }`，宽度按位数留；左对齐的效果靠"文字自己居中、框刚好够宽"得到，别把框做得比字宽很多。
- **转化率**：同样摆成一个 `text`，`at: [r.anchor.x, r.anchor.y - 9]`，字号 13、`textColor` 用灰，写 `r.text`；`r.text` 缺的那一项（没有数，或数不是数字）写用户给的转化率。夹在两个数值之间的灰字需要一句说明（副标题里写"灰字 = 相邻两步的转化率"）。

## 效果

- 金字塔 5 层以内最好读，超过就把相近的层并起来。塔尖那一层最窄，名字要短。
- 漏斗 3–6 层。最后一层的数很小时，层依然跟别的层一样宽一档，数值照写。
- 颜色不要每层一个：整座塔或整个漏斗一种填充，要强调的那一层（流失最多的、用户点名的）换一色，规则见 [`semantics.md`](semantics.md) 的「颜色」。
