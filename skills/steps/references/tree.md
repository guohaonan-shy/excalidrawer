# tree：从一个根往下分的层级

`tree` 把"一个根 → 孩子 → 孙子"排成整洁的树：**每个父节点正好在自己孩子的中点，各子树互不重叠，连线只走层与层之间的空隙**。它只返回坐标和已经是 L4 形式的连线段；颜色、画成什么由你定。

## 什么时候用

分类、组织架构、用户故事地图（根 → 场景 → 故事）、文件 / 模块树、类别 → 条目的拆解。**布局必须来自 `tree`，不要手算坐标**，也不要用流程图那种"整层居中"的写法：整层居中让父节点离自己的孩子很远。一个叶子长高，整棵树下面的东西都得跟着挪，这是整棵树上的算术，不是目测能做对的。

## 参数和返回

```js
compute_layout({ helper: "tree", args: {
  root: {
    label: "Report audio prefetch",
    children: [
      { label: "Right after practice", children: ["1. Prompt audio plays instantly…", "2. …"] },
      { label: "Player",               children: ["10. …", "11. …"] },
    ],
  },
  direction: "right",         // "right"（根在左）| "down"（根在上）
  originX: 40, originY: 90,   // 标题上面留出空间
}})
```

孩子可以是裸字符串（叶子），或 `{ label, desc?, id?, children? }`。你在节点上加的任何额外字段（比如 `color`）会原样回到 `node.data` 上。

返回：

- `nodes[]` — `{ id, parent, depth, leaf, label, fontSize, x, y, w, h, titled? }`，按阅读顺序。`h` 已经算过折行和等高。
- `segments[]` — 连线，已经是 **L4 形式** `{ kind, at, points }`。每个父节点：一条 `stem`（父 → 主干）、一条 `spine`（沿主干）、每个孩子一条 `branch`（主干 → 孩子）。
- `levels[]` — 每一层占的带（给层名标注用）。
- `bounds` — 整棵树的 `{ x, y, w, h }`。

可选参数：

| 参数 | 默认 | 什么时候改 |
|---|---|---|
| `widths` | 按层从最长标签自动取（right：≤ 280，最深一层 ≤ 420；down：≤ 220） | 某层要更窄 / 更宽，传 `[根, 第 1 层, 第 2 层…]` |
| `fontSize` | 各层 `[20, 16, 15]` | 更大的根、更小的叶子 |
| `equalize` | right：`"siblings"`，down：`"depth"` | `"depth"` 让一列里每个框同高；`"none"` 各取各的 |
| `levelGap` / `siblingGap` / `groupGap` | right 72/16/32，down 64/24/40 | 更密或更松 |

### 用户的选择 → 参数（tree 入口 skill 的 clarify）

| 用户选了 | 怎么传 |
|---|---|
| 上下分裂（根在上） | `direction: "down"` |
| 左右分裂（根在左） | `direction: "right"` |
| 叶子带编号 | 原文有编号就保留在叶子标签里（见下面「怎么画出来」）；原文没有编号时，自己按阅读顺序给叶子加 `1.`、`2.` … |
| 每层标注层名 | 画层名标注（见下面「怎么画出来」） |
| 都不要 | 都不加 |

叶子是长句（用户故事、需求）或数量多（> 8）时左右分裂更好看，叶子是短词、总数 ≤ 8 时上下分裂更好看，像组织架构图；入口 skill 的 clarify 按这条标推荐项。

## 怎么画出来

```js
const sugar = [
  { shape: "text", at: [40, 30], size: [bounds.w, 34], text: TITLE, fontSize: TITLE_SIZE },   // 标题的位置和字号见 semantics.md §9
  // 连线先画，框的边压在主干的端点上
  ...segments.map((s) => ({ shape: "line", at: s.at, points: s.points, stroke: "#495057" })),
  ...nodes.map((n) => ({
    shape: "rect", id: n.id, at: [n.x, n.y], size: [n.w, n.h],
    fill: FILL(n), stroke: STROKE(n), text: n.label, fontSize: n.fontSize,
  })),
];
```

样板里的 `FILL(n)` / `STROKE(n)` 按下面「一个分支一个色系」那张表取：`n.depth` 是层数（根是 0），`n.leaf` 表示它是不是叶子；你加在节点上的 `color` 回到 `n.data.color`；第一层的节点各自属于一个分支，下面的节点沿着 `n.parent` 往上找到第一层的祖先，取它的色系。`TITLE` 是标题文字，`TITLE_SIZE` 取 `semantics.md` §9 里标题的字号。

`n.h` 原样传下去：它是等高之后的高度，跟 sugar 自己的折行用同一套量法（`fitBoundText`），所以框不会再长一次。

- **有 `desc` 的节点**（第二行更小的字，比如 `ui · visual · ux`）：节点带的是 `titled` 块，不是绑定的标签。画一个不带 `text` 的 `rect`（取 `titled.box`），再画两个 `shape: "text"`：`titled.title`（`text: titled.title.text`，`fontSize: titled.title.fontSize`）和 `titled.body`（`textColor: "#495057"`）。
- **层名标注**（`Root / Category / Skill`）：`down` 时，在树的左边每个 `levels[d]` 行的垂直中点放一个 `text`，`originX` 给它留位置（标注宽度 + 32）；`right` 时在每个 `levels[d]` 列的上方放标注，`originY` 下移 32 左右。
- **叶子编号**：原文有编号就保留在叶子标签里（`"7. As a student on a slow network…"`），读者会互相对照。
- 连线默认是**没有箭头的 `line`**：树的方向已经由根的位置表达，每条枝上加箭头只是噪声。只有边真的表示"流向"时才换 `arrow`（`semantics.md` §1）。

## 效果

### 一个分支一个色系

| 节点 | 填充 | 描边 |
|---|---|---|
| 根 | `yellow`（焦点） | 默认 |
| 第一层**有孩子**的节点 | 依次取 `blue, green, purple, red, orange, gray` 的下一个 | 默认 |
| 它下面的所有节点 | 该分支的浅色：`bgBlue`、`bgGreen`… | 该分支的强调色：`blue`、`green`… |
| 第一层的**叶子**（扁平树） | `bgBlue` | `blue` |

一整个分支读成一个色系，实色 / 浅色的区别无需图例就表达了"组 vs 成员"。用户给某个节点指定了颜色，它保留，子树继承。

### 方向与宽度

- **right**：叶子是句子（用户故事、需求）时，给最深一层一个宽列（自动上限 420），让文字折成 2–3 行。画布向下长，嵌进文档的 PNG 没问题。
- **down**：叶子是短词且不多于 8 个，读起来像组织架构图。叶子更多画布会非常宽，换 `right`。长句塞进 220 宽的框会折成又高又窄的条，也换 `right`。
- 一个分组有 12 个叶子会变成很高的一列，拆成两个分组，不要为了省空间跳过一层。

### 改了就重算

节点生成后手动挪一个，会破坏所有祖先的居中。要改就改输入（顺序、`widths`、间距），再调一次 helper。

### 中文标签

标签宽度估算和字体回退都已处理；分组标签保持短（≤ ~10 个字符），中间那一列才不会很宽。
