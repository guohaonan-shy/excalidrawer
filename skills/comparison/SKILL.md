---
name: comparison
description: Generate a hand-drawn-style Excalidraw left-vs-right comparison diagram from code and export to .excalidraw / SVG / PNG — no browser. For A vs B product comparisons, before/after, old vs new approach, us vs them, option trade-offs, pros and cons. Triggers on compare A and B / A vs B / before and after / side-by-side / 对比图. Flow detect → clarify sides & dimensions → read references/comparison.md → compose sugar → render_diagram. 中文触发词：对比 / 对比图 / 左右对比 / A 和 B 的区别 / 优劣势 / 改造前后 / 新旧方案 / 竞品对比 / 两种方案对比。
allowed-tools: mcp__excalidrawer__render_diagram, mcp__excalidrawer__compute_layout, Bash(npx -y -p excalidrawer*:*), Read, Write(./*.json), AskUserQuestion
---

# excalidrawer comparison

## 前置条件（必做）

先用 Read 工具读取 [`../shared/SKILL.md`](../shared/SKILL.md)
——它定义了所有图表类型通用的 MCP 前置检查 / CLI fallback、sugar schema、配色、
文件命名、输出语言、导出格式选择、迭代规则。**缺一不可**，本 skill 只补充左右对比专属的
clarify 问题与 layout recipe。

## 1. Clarify（必）

用 **AskUserQuestion** 问 load-bearing 问题，最后一个固定是导出格式（shared §6）。
**用户已给出两侧名称 + 完整维度列表时跳过结构性提问。**

1. **两侧是什么 + 对比维度** — 自由文本。要的是「左侧名 / 右侧名」加一组**双侧都适用**的
   维度（coverage、pricing、feedback depth…）。某侧在该维度上没有内容不是问题——写
   `None` / `—` 本身就是对比结论。3–6 个维度最佳。
2. **版式** — 单选：
   - `对称双栏 + VS`（两侧同宽、逐行对齐，**推荐**）
   - `中列写维度名的三栏`（维度名长、单元格短时更省地方）
   - `非对称`（一侧拆成多张子卡，如「两种付费方式 vs 一种」）
3. **立场** — 单选：`中立`（两侧同权重，blue vs purple） /
   `有倾向`（右侧为主张侧，green 强调；左侧 gray 表示现状，**不用 red**）

## 2. 读 recipe

`Read references/comparison.md` —— 拿到画布网格（列宽 / gutter / 行 y）、
**行对齐硬规则**（同一维度左右必须同 y 同 h —— 盒子的 `h` 是下限，先用
`compute_layout` 的 `equalize` 量出整行高度再建）、**两种 body 形态**（`行卡` /
`单面板`）及其选择判据（这一行在两侧是不是同一个维度）、三种版式的坐标、配色与
文案陷阱。

## 3. 拼 sugar + 渲染

按 recipe 拼 sugar 数组（先 `compute_layout` 的 `equalize` 量出整行高度，再把这个
高度传给该行的每个 rect）。渲染顺序与 render 调用见 shared §2 / §7：
`output: "./comparison-<name>"`，
formats 按 clarify。一图一个对比轴——换个轴就是新的一张图（`comparison-<pair>-<axis>`）。
迭代见 recipe 末尾「Common pitfalls」与 shared §8。
