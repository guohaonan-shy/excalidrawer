# legend：图例

`legend` 给出图例每一行的 **sample slot** 和 **label slot**，以及整块的尺寸，还能自己摆到图的某个角上。**样本画成什么由你按 [`semantics.md`](semantics.md) 定**：色块还是线段、实线还是虚线、多粗。它只返回坐标。

## 什么时候用

图里用了自定义含义时：虚线 = 计划中的服务、紫色线 = 异步调用、粗线 = 主路径。实线 / 虚线区分请求 / 响应这类通用约定不需要图例（`semantics.md` §0 原则 3）。图例 ≤ 3 行；需要更多行，说明这张图承载的含义太多，先拆图。

## 参数和返回

```text
legend — { items:[{label,id?}], dir?:"y"|"x"="y", sampleW?=40, sampleH?=16,
           gap?=8, itemGap?=8 (dir:"x" 时默认 24), fontSize?=14, pad?=12,
           at?:{x,y}, bounds?:{x,y,w,h}, corner?:"top-left"|"top-right"|"bottom-left"|"bottom-right",
           place?:"inside"|"outside"="inside", offset?=16 }
       → { kind:"legend", x, y, w, h,
           items:[{ id?, text, sample:{x,y,w,h}, label:{x,y,w,h,fontSize} }] }
```

- 每个 item 返回一个 `sample` slot 和一个 `label` slot，垂直方向互相居中；`text` 是输入的文字，`label` 是放它的 label slot。
- `dir: "x"` 把各项排成一行（放在图下方时不占高度）。
- **摆放**：有 `corner` 时以它为准，此时 `bounds`（图的范围）必填；没有 `corner` 就用 `at`（块的左上角）；都没有就在 (0, 0)。`place: "inside"` 贴着 `bounds` 的那个角往里缩 `offset`；`place: "outside"` 放在 `bounds` 外面：上方两个角放在上方，下方两个角放在下方，左右跟那个角对齐。
- 参数错了会抛出点名 `legend` 和那个参数的错。

## 怎么画出来

```js
const lg = compute_layout({ helper: "legend", args: {
  items: [{ label: "planned (Q3)" }, { label: "async" }],
  bounds: { x: 0, y: 0, w: 800, h: 500 }, corner: "bottom-right",
}}).result;
```

对每个 `item`：

- **线型样本**：从 sample slot 的左中画到右中，用图里同样的 `strokeStyle` / `strokeWidth` / `stroke`：
  `{ shape: "line", at: [s.x, s.y + s.h / 2], points: [[0, 0], [s.w, 0]], strokeStyle: "dashed" }`
- **色块样本**：填满 sample slot：`{ shape: "rect", at: [s.x, s.y], size: [s.w, s.h], fill: "green" }`
- **文字**：`{ shape: "text", at: [l.x, l.y], size: [l.w, l.h], text: item.text, fontSize: l.fontSize }`

图例整块的 `x, y, w, h` 可以不画外壳，也可以画一个浅色 `rect`，先画，让样本和文字叠在上面。把图例放进画布时，画布的宽高要算上图例（`place: "outside"` 时更要）。

## 效果

- 图的右下角一块小图例，三行以内：`corner: "bottom-right"`，默认 `place: "inside"`。
- 时间线、顺序图下方的一行图例：`dir: "x"`，`corner: "bottom-left"`，`place: "outside"`。
