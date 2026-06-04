---
name: flowchart
description: Generate a hand-drawn-style Excalidraw flowchart from code and export to .excalidraw / SVG / PNG — no browser. For decision flows, process diagrams, branching logic, approval pipelines, yes/no trees, retry loops. Triggers on draw a flowchart / create a flow / visualize a process / decision tree. Flow detect → clarify branches & direction → read references/flowchart.md → compose sugar → render_diagram. 中文触发词：流程图 / 决策流 / 分支判断 / 审批流 / 业务流转 / pipeline / 画个流程。
allowed-tools: mcp__excalidrawer__render_diagram, mcp__excalidrawer__compute_layout, Bash(npx -y -p excalidrawer*:*), Read, Write(./*.json), AskUserQuestion
---

# excalidrawer flowchart

## 前置条件（必做）

先用 Read 工具读取 [`../shared/SKILL.md`](../shared/SKILL.md)
——它定义了所有图表类型通用的 MCP 前置检查 / CLI fallback、sugar schema、配色、
文件命名、输出语言、导出格式选择、迭代规则。**缺一不可**，本 skill 只补充流程图专属的
clarify 问题与 layout recipe。

## 1. Clarify（必）

用 **AskUserQuestion** 问 2–4 个 load-bearing 问题，最后一个固定是导出格式（shared §6）。
**用户已粘完整 nodes + edges 时跳过。**

1. **核心场景** — 自由文本（如「表单提交到落库」「Code review 到合并」）
2. **判断 / 分叉点数量** — 单选：`0 个直线流程` / `1 个单一 yes-no` / `2-3 个多重判断` / `自己列`
3. **方向** — 单选：`horizontal`（默认，节点多时舒展） / `vertical`（节点少时紧凑）
- 可选追问：是否有失败 / 异常分支单独画终点；是否有 retry / back-edge 循环

## 2. 读 recipe

`Read references/flowchart.md` —— 拿到 layout 数值、节点形状/配色、4 类边的处理、常见坑。

## 3. 拼 sugar + 渲染

按 recipe 拼 sugar 数组（坐标用 `compute_layout` 的 `chain` 排线性节点）。
渲染顺序与 render 调用见 shared §2 / §7：`output: "./flowchart-<name>"`，formats 按 clarify。
迭代见 recipe 末尾「Common pitfalls」与 shared §8。
