---
name: tree
description: Generate a hand-drawn-style Excalidraw tree diagram from code and export to .excalidraw / SVG / PNG — no browser. For hierarchies that grow from one root — taxonomies, org charts, user-story maps (root → scenario → story), mind-map-like outlines, category → item breakdowns, file/module trees. Left-to-right or top-down tidy layout; parents centered on their children, no crossing edges. Triggers on draw a tree / hierarchy diagram / org chart / taxonomy / breakdown. Flow detect → clarify root, levels & direction → read references/tree.md → compute_layout tree → compose sugar → render_diagram. 中文触发词：树状图 / 树形图 / 层级图 / 组织架构图 / 分类树 / 用户故事地图 / 拆解图 / 脑图式大纲。
allowed-tools: mcp__excalidrawer__render_diagram, mcp__excalidrawer__compute_layout, Bash(npx -y -p excalidrawer*:*), Read, Write(./*.json), AskUserQuestion
---

# excalidrawer tree

## 前置条件（必做）

先用 Read 工具读取 [`../shared/SKILL.md`](../shared/SKILL.md)
——它定义了所有图表类型通用的 MCP 前置检查 / CLI fallback、sugar schema、配色、
文件命名、输出语言、导出格式选择、迭代规则。**缺一不可**，本 skill 只补充树状图专属的
clarify 问题与 layout recipe。

## 1. Clarify（必）

用 **AskUserQuestion** 问 load-bearing 问题，最后一个固定是导出格式（shared §6）。

1. **根 + 层级内容** — 自由文本。一个根，下面每层是什么（`场景 → 用户故事`、
   `类别 → skill`）。每个父节点 1–8 个孩子最佳；超过就再分一层。
   **用户已给出完整层级（如带标题分组的编号列表、缩进大纲）时跳过本问**——直接把
   标题当分组、条目当叶子。
2. **分裂方向（必问）** — 父节点向孩子分裂是上下还是左右，这决定整张图的形状，
   内容本身推不出来，所以**即使用户给了完整层级也要问**；只有用户已明说方向
   （「横向」「从左到右」「组织架构图那样」）时才跳过。单选，带 preview，
   按叶子长度把其中一项标 `(Recommended)` 并放第一位：

   ```js
   {
     question: "父节点和孩子怎么展开？",
     header: "分裂方向",
     multiSelect: false,
     options: [
       { label: "上下分裂（根在上）",
         description: "孩子排在父节点下方一行，像组织架构图。叶子是短词、总数 ≤ 8 时最好看。",
         preview: "        [ 根 ]\n          │\n   ┌──────┼──────┐\n [ A ]  [ B ]  [ C ]\n   │\n ┌─┴─┐\n[a1][a2]" },
       { label: "左右分裂（根在左）",
         description: "孩子排在父节点右侧一列，一行一个叶子。叶子是长句（用户故事、需求）或数量多时最好看。",
         preview: "         ┌─ [ a1 ]\n   ┌─[ A ]┤\n   │     └─ [ a2 ]\n[根]┼─[ B ]── [ b1 ]\n   │\n   └─[ C ]── [ c1 ]" },
     ],
   }
   ```

   选「上下」→ `direction: "down"`；选「左右」→ `direction: "right"`。
   叶子平均超过 ~15 个字或总叶子数 > 8 时推荐「左右」，否则推荐「上下」。
3. **叶子编号 / 层级标注** — 多选：`叶子带编号`（原文有编号就保留） /
   `每层标注层名`（如 Root / Category / Skill） / `都不要`

## 2. 读 recipe

`Read references/tree.md` —— 拿到 `compute_layout` `tree` 的入参、把结果映射成
sugar 的写法（节点 rect + 连接线 L4 arrow）、配色继承规则、宽度选择、常见坑。

## 3. 拼 sugar + 渲染

**不要手算坐标**——先调 `compute_layout({ helper: "tree", args: { root, direction, … } })`，
它保证父节点居中于自己的孩子、子树互不重叠、连线只走层间空隙。再按 recipe 把
`nodes` / `segments` 一一映射成 sugar。渲染顺序与 render 调用见 shared §2 / §7：
`output: "./tree-<name>"`，formats 按 clarify。迭代见 recipe 末尾「Common pitfalls」与 shared §8。
