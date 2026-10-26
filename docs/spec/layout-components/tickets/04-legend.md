# 04 — legend：图例的行与摆放

**Blocked by**：无——可立即开工
**设计冻结**：不涉及 UI

## 要建什么

excalidrawer 是代码生成 Excalidraw 图的库 + CLI + MCP server。共享 skill 的 `semantics.md` 现在教 agent 手摆图例：样线放在 `[x, y+10]`，文字放在 `[x+50, y]`；行距、整块多大、放到右下角的坐标，全靠手算。这张工单加布局组件 `legend`：给它几条图例文字，它返回每行的样本槽和文字槽，以及整块的尺寸，还能按角把整块摆到图的范围内或范围外。它只返回坐标。样本画成色块还是线段、用什么颜色，由调用方按语义决定。

**入参**：

| 参数 | 默认 | 意思 |
|---|---|---|
| `items` | 必填，非空 | 每项 `{ label, id? }` |
| `dir` | `"y"` | `y` 竖排，`x` 横排成一行 |
| `sampleW`, `sampleH` | 40, 16 | 样本槽尺寸 |
| `gap` | 8 | 样本到文字的距离 |
| `itemGap` | 竖排 8，横排 24 | 行与行（横排时是项与项）的距离 |
| `fontSize` | 14 | 文字字号 |
| `pad` | 12 | 整块四边内边距 |
| `at` | 无 | 整块左上角 `{x, y}` |
| `bounds` | 无 | 图的范围 `{x, y, w, h}` |
| `corner` | 无 | `top-left` / `top-right` / `bottom-left` / `bottom-right` |
| `place` | `"inside"` | `inside`：贴着 bounds 的内角；`outside`：放在 bounds 外面，跟这个角对齐 |
| `offset` | 16 | 离 bounds 边的距离 |

**返回**：`{ kind: "legend", x, y, w, h, items }`，其中 `items` 每项是 `{ id?, text, sample: { x, y, w, h }, label: { x, y, w, h, fontSize } }`。`text` 是输入的那条文字，`label` 是这条文字的文字槽。全部是绝对坐标。

**规则**：

- 文字槽的宽高用文字测量函数量出，同一行里样本槽和文字槽垂直居中对齐。
- **摆放**：有 `corner` 时以它为准，这时 `bounds` 必填。没有 `corner` 就用 `at`；`at` 也没有，就放在 (0, 0)。
- **`outside`**：上方两个角放在 bounds 上方，下方两个角放在 bounds 下方，左右边缘跟这个角对齐。
- **参数错**（`items` 为空、有 `corner` 没 `bounds`、`corner` 不认识）：抛错，报错写明 `legend` 和出错的参数。

**接入**：照现有 `equalize` 的接法。包入口导出；MCP `compute_layout` 白名单和说明各加一项；`skills/shared/references/sugar.md` 的 helper 列表加一行，说明样本槽怎么画（色块就填满这个框，线段就从框的左中画到右中）；`semantics.md` 里那段手摆图例的示例，改成指向 `legend`；README 的 Layout helpers 表加一行；CHANGELOG 只写在 `Unreleased` 节下（没有就新建）；`CLAUDE.md` 源码布局里 `layout.mjs` 那一行补上 `legend`。

## 验收标准

- [x] 3 条竖排：三行 y 依次递增，间距等于行高加 `itemGap`；整块 `w` 等于 `pad*2 + sampleW + gap + 最宽文字`
- [x] `dir:"x"`：三项在同一行，相邻两项之间隔 `itemGap`
- [x] `bounds` 为 800×500、`corner:"bottom-right"`、`place:"inside"`：整块右边缘和下边缘离 bounds 右下角各 `offset`
- [x] 同上改 `place:"outside"`：整块在 bounds 下方 `offset` 处，右边缘跟 bounds 右边缘对齐
- [x] 只给 `at`：整块左上角就是 `at`
- [x] 有 `corner` 没 `bounds`、`items` 为空：抛错，报错里有 `legend`
- [x] MCP `compute_layout` 用 `helper:"legend"` 能拿到 `result`；`HELPERS` 里有 `legend`；包入口能 import 到 `legend`
- [x] 把结果画成 sugar（样本 rect 加 text）交给 `render`：`warnings` 里没有文字溢出
- [x] `sugar.md`、`semantics.md`、README、CHANGELOG（Unreleased）、`CLAUDE.md` 都按上面改了
- [x] `npm test` 全绿

## 选中的存量回归

- `tests/tools.test.mjs` 里 `compute_layout` 的派发测试：白名单再加一项
- `tests/validate.test.mjs`：验收要靠文字溢出警告不出现来判，要确认 linter 本身没变
- [ ] review 第 1 轮 S3（2026-10-26）：所有数字参数（sampleW、sampleH、gap、itemGap、fontSize、pad、offset，以及 at、bounds 里的坐标与尺寸）传成非数字时抛错，报错写明 legend 和参数名，写法与 stack、panel 已有的数字检查一致；不再返回 NaN 或拼接出来的字符串坐标
