---
name: architecture
description: Generate a hand-drawn-style Excalidraw architecture diagram from code and export to .excalidraw / SVG / PNG / WebP — no browser. For system architecture, layered components, service topology, 3-tier / microservices / data platforms. Triggers on draw an architecture diagram / system design / layered diagram / service topology. Flow detect → clarify layers & connections → read references/architecture.md → compose sugar → render_diagram. 中文触发词：架构图 / 系统架构 / 分层 / 三层架构 / 微服务 / 服务拓扑 / 数据中台。
allowed-tools: mcp__excalidrawer__render_diagram, mcp__excalidrawer__compute_layout, Bash(npx -y -p excalidrawer*:*), Read, Write(./*.json), AskUserQuestion
---

# excalidrawer architecture

## 前置条件

调 skill `steps`（Claude Code 用 Skill 工具调 `excalidrawer:steps`；其他宿主读 `../steps/SKILL.md`），看它的『组件』。

## 1. Clarify（必）

用 **AskUserQuestion** 问 load-bearing 问题；导出格式见 `steps`『出图』的导出格式参考。
**用户已粘完整分层 + 服务时跳过结构性提问。**

1. **系统核心组成** — 自由文本，让用户列出来你按层分
2. **结构形态** — 单选：`经典分层`（每 tier 一条 lane） / `分层 + 子分组`（tier 内横向再分子 lane） / `自由拓扑`
3. **是否画连线** — 单选：`纯拓扑不画线`（默认） / `画关键流`（3-5 条主流） / `画完整连线`（慎选）
- 可选追问：是否有 API Gateway / MQ / Service Mesh 等独立一层

## 2. 读 recipe

`Read references/architecture.md` —— 拿到分层建模、两种 layout 模式（swimlane / gridLayout 子分组）、
配色按 tier 轮转、连线规则。

## 3. 拼 sugar + 渲染

按 recipe 拼 sugar 数组（`swimlane` 排单 lane、`gridLayout` 排子分组）。渲染顺序见 `steps`『组件』，render 调用见『出图』：`output: "./architecture-<name>"`，formats 见『出图』的导出格式参考。迭代见 recipe 末尾「Common
pitfalls」与 `steps`『出图』的迭代。
