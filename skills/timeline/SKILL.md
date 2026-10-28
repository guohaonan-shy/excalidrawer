---
name: timeline
description: Generate a hand-drawn-style Excalidraw timeline from code and export to .excalidraw / SVG / PNG / WebP — no browser. For timelines, roadmaps, project milestones, release phases, Q1–Q4 plans. Triggers on draw a timeline / roadmap / milestones / project phases. Flow detect → clarify milestones & axis style → read references/timeline.md → compose sugar → render_diagram. 中文触发词：时间线 / 路线图 / roadmap / 里程碑 / 项目阶段 / 发布计划 / Q1Q2Q3Q4。
allowed-tools: mcp__excalidrawer__render_diagram, mcp__excalidrawer__compute_layout, Bash(npx -y -p excalidrawer*:*), Read, Write(./*.json), AskUserQuestion
---

# excalidrawer timeline

## 前置条件

调 skill `steps`（Claude Code 用 Skill 工具调 `excalidrawer:steps`；其他宿主读 `../steps/SKILL.md`），看它的『组件』。

## 1. Clarify（必）

用 **AskUserQuestion** 问 load-bearing 问题；导出格式见 `steps`『出图』的导出格式参考。
**用户已粘完整里程碑列表时跳过结构性提问。**

1. **里程碑列表** — 自由文本，每条给 `time`（日期/季度/阶段）+ `label`（短标题）+ `desc`（可选一行）
2. **轴 / 圆点风格** — 单选：`居中穿珠`（圆点居中、轴在珠处断开，最干净，**推荐**） / `lollipop`（圆点切于轴）
- 可选追问：时间跨度不均时是否按真实跨度拉开 x 距离

## 2. 读 recipe

`Read references/timeline.md` —— 拿到坐标尺寸、两种轴风格的画法、label 三行排布、不均匀间距处理。

## 3. 拼 sugar + 渲染

按 recipe 拼 sugar 数组（`chain` 排里程碑 x）。渲染顺序见 `steps`『组件』，render 调用见『出图』：
`output: "./timeline-<name>"`，formats 见『出图』的导出格式参考。迭代见 recipe 末尾「Common pitfalls」与 `steps`『出图』的迭代。
