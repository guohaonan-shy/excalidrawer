---
name: timeline
description: Generate a hand-drawn-style Excalidraw timeline from code and export to .excalidraw / SVG / PNG — no browser. For timelines, roadmaps, project milestones, release phases, Q1–Q4 plans. Triggers on draw a timeline / roadmap / milestones / project phases. Flow detect → clarify milestones & axis style → read references/timeline.md → compose sugar → render_diagram. 中文触发词：时间线 / 路线图 / roadmap / 里程碑 / 项目阶段 / 发布计划 / Q1Q2Q3Q4。
allowed-tools: mcp__excalidrawer__render_diagram, mcp__excalidrawer__compute_layout, Bash(npx -y -p excalidrawer*:*), Read, Write(./*.json), AskUserQuestion
---

# excalidrawer timeline

## 前置条件（必做）

先用 Read 工具读取 [`../shared/SKILL.md`](../shared/SKILL.md)
——它定义了所有图表类型通用的 MCP 前置检查 / CLI fallback、sugar schema、配色、
文件命名、输出语言、导出格式选择、迭代规则。**缺一不可**，本 skill 只补充时间线专属的
clarify 问题与 layout recipe。

## 1. Clarify（必）

用 **AskUserQuestion** 问 load-bearing 问题，最后一个固定是导出格式（shared §6）。
**用户已粘完整里程碑列表时跳过结构性提问。**

1. **里程碑列表** — 自由文本，每条给 `time`（日期/季度/阶段）+ `label`（短标题）+ `desc`（可选一行）
2. **轴 / 圆点风格** — 单选：`居中穿珠`（圆点居中、轴在珠处断开，最干净，**推荐**） / `lollipop`（圆点切于轴）
- 可选追问：时间跨度不均时是否按真实跨度拉开 x 距离

## 2. 读 recipe

`Read references/timeline.md` —— 拿到坐标尺寸、两种轴风格的画法、label 三行排布、不均匀间距处理。

## 3. 拼 sugar + 渲染

按 recipe 拼 sugar 数组（`chain` 排里程碑 x）。渲染顺序与 render 调用见 shared §2 / §7：
`output: "./timeline-<name>"`，formats 按 clarify。迭代见 recipe 末尾「Common pitfalls」与 shared §8。
