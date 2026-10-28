---
name: flowchart
description: Generate a hand-drawn-style Excalidraw flowchart from code and export to .excalidraw / SVG / PNG / WebP — no browser. For decision flows, process diagrams, branching logic, approval pipelines, yes/no trees, retry loops. Triggers on draw a flowchart / create a flow / visualize a process / decision tree. Flow detect → clarify branches & direction → read references/flowchart.md → compose sugar → render_diagram. 中文触发词：流程图 / 决策流 / 分支判断 / 审批流 / 业务流转 / pipeline / 画个流程。
allowed-tools: mcp__excalidrawer__render_diagram, mcp__excalidrawer__compute_layout, Bash(npx -y -p excalidrawer*:*), Read, Write(./*.json), AskUserQuestion
---

# excalidrawer flowchart

## 前置条件

调 skill `steps`（Claude Code 用 Skill 工具调 `excalidrawer:steps`；其他宿主读 `../steps/SKILL.md`），看它的『组件』。

## 1. Clarify（必）

用 **AskUserQuestion** 问 2–4 个 load-bearing 问题；导出格式见 `steps`『出图』的导出格式参考。
**用户已粘完整 nodes + edges 时跳过。**

1. **核心场景** — 自由文本（如「表单提交到落库」「Code review 到合并」）
2. **判断 / 分叉点数量** — 单选：`0 个直线流程` / `1 个单一 yes-no` / `2-3 个多重判断` / `自己列`
3. **方向** — 单选：`horizontal`（默认，节点多时舒展） / `vertical`（节点少时紧凑）
- 可选追问：是否有失败 / 异常分支单独画终点；是否有 retry / back-edge 循环

## 2. 读 recipe

`Read references/flowchart.md` —— 拿到 layout 数值、节点形状/配色、4 类边的处理、常见坑。

## 3. 拼 sugar + 渲染

按 recipe 拼 sugar 数组（坐标用 `compute_layout` 的 `chain` 排线性节点）。
渲染顺序见 `steps`『组件』，render 调用见『出图』：`output: "./flowchart-<name>"`，formats 见『出图』的导出格式参考。
迭代见 recipe 末尾「Common pitfalls」与 `steps`『出图』的迭代。
