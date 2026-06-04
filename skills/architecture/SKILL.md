---
name: architecture
description: Generate a hand-drawn-style Excalidraw architecture diagram from code and export to .excalidraw / SVG / PNG — no browser. For system architecture, layered components, service topology, 3-tier / microservices / data platforms. Triggers on draw an architecture diagram / system design / layered diagram / service topology. Flow detect → clarify layers & connections → read references/architecture.md → compose sugar → render_diagram. 中文触发词：架构图 / 系统架构 / 分层 / 三层架构 / 微服务 / 服务拓扑 / 数据中台。
allowed-tools: mcp__excalidrawer__render_diagram, mcp__excalidrawer__compute_layout, Bash(npx -y -p excalidrawer*:*), Read, Write(./*.json), AskUserQuestion
---

# excalidrawer architecture

## 前置条件（必做）

先用 Read 工具读取 [`../shared/SKILL.md`](../shared/SKILL.md)
——它定义了所有图表类型通用的 MCP 前置检查 / CLI fallback、sugar schema、配色、
文件命名、输出语言、导出格式选择、迭代规则。**缺一不可**，本 skill 只补充架构图专属的
clarify 问题与 layout recipe。

## 1. Clarify（必）

用 **AskUserQuestion** 问 load-bearing 问题，最后一个固定是导出格式（shared §6）。
**用户已粘完整分层 + 服务时跳过结构性提问。**

1. **系统核心组成** — 自由文本，让用户列出来你按层分
2. **结构形态** — 单选：`经典分层`（每 tier 一条 lane） / `分层 + 子分组`（tier 内横向再分子 lane） / `自由拓扑`
3. **是否画连线** — 单选：`纯拓扑不画线`（默认） / `画关键流`（3-5 条主流） / `画完整连线`（慎选）
- 可选追问：是否有 API Gateway / MQ / Service Mesh 等独立一层

## 2. 读 recipe

`Read references/architecture.md` —— 拿到分层建模、两种 layout 模式（swimlane / gridLayout 子分组）、
配色按 tier 轮转、连线规则。

## 3. 拼 sugar + 渲染

按 recipe 拼 sugar 数组（`swimlane` 排单 lane、`gridLayout` 排子分组）。渲染顺序与 render 调用见
shared §2 / §7：`output: "./architecture-<name>"`，formats 按 clarify。迭代见 recipe 末尾「Common
pitfalls」与 shared §8。
