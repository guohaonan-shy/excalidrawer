---
name: excalidrawer-architecture
description: 用 Excalidraw 手绘风生成系统架构图 / 服务拓扑 / 分层组件图。任何提到 architecture / 架构图 / 分层 / 三层架构 / 微服务 / 数据中台 / system topology / service map / module map / tech stack 的场景都触发本 skill。支持单 lane 分层和"一行多 lane"(子分组)两种模式。流程:AskUserQuestion clarify → 读 recipe → 拼 sugar(用 `gridLayout` 或 `swimlane` helper 摆 lane 带) → 调 excalidrawer MCP server 的 render_diagram 输出 .excalidraw / .svg / .png。
allowed-tools: mcp__excalidrawer__render_diagram, mcp__excalidrawer__compute_layout, Bash(npx -y -p excalidrawer*:*), Read, Write(./architecture-*.json), AskUserQuestion
---

# Architecture skill

把用户描述的系统结构画成手绘风架构图。流程:**clarify → 读 recipe → 拼 sugar → render_diagram**。

## 0. 必读约定

- 跨 skill 约定 → `../excalidrawer-shared/references/conventions.md`
- sugar schema → `../excalidrawer-shared/references/sugar.md`
- 配色 → `../excalidrawer-shared/references/colors.md`
- architecture 具体模式(单 lane / 多 lane / 配色 / 是否画连线 / 列对齐) → `recipes/architecture.md`

## 1. 前置检查

确认 MCP 工具可见。否则走 conventions §3 的 CLI fallback。

## 2. Clarify(必)

AskUserQuestion 2-4 个 load-bearing 问题:

1. **系统 / 子系统的核心组成** —— 自由文本
   - 例:"e-commerce:前端 web+移动、后端 API+业务服务、数据 PG+Redis"
   - 让用户列出来,你按层分;不清楚再追问

2. **结构形态** —— AskUserQuestion 单选
   - `经典分层`(每个 tier 一条 lane,如 Frontend / Backend / Data)
   - `分层 + 子分组`(每个 tier 横向再分子 lane,如 Frontend 拆 Web/Mobile)
   - `自由拓扑`(没明显分层,服务平铺)

3. **是否画连线** —— AskUserQuestion 单选
   - `纯拓扑,不画连线`(默认,只展示组成关系)
   - `画关键流`(挑 3-5 条主要数据流标出来)
   - `画完整连线`(慎选,连线密就乱)

4. **输出格式 / 使用场景** —— AskUserQuestion 单选,选项和映射见 `../excalidrawer-shared/references/conventions.md` §6。

可选追问:有没有特殊 tier(API Gateway / Message Queue / Service Mesh 等独立一层)。

**跳过 clarify 的条件**:用户已粘完整结构化数据(分层 + 服务列表),直接 §3。

**diagram label 默认英文**(见 conventions §4)。

## 3. 读 recipe

`Read recipes/architecture.md` —— 单 lane vs 多 lane 模式选择、lane 带数值、列对齐规则(画连线时)、配色策略。

## 4. 拼 sugar 元素

按 recipe 拼。两个主要模式:

**A. 单 lane 分层** —— 用 `swimlane` helper:

```text
mcp__excalidrawer__compute_layout({
  helper: "swimlane",
  args: { lanes:[...], items:[...], laneW, laneH, itemW, itemH, headerW, ... }
})
→ { laneRects, itemPositions }
```

**B. 多 lane 一行** —— 用 `gridLayout` 摆 sub-lane 带:

```text
mcp__excalidrawer__compute_layout({
  helper: "gridLayout",
  args: { count, cols, cellW, cellH, colGap, rowGap, originX, originY }
})
→ [{ x, y, w, h, col, row }, ...]  // 每个 cell 当一个 sub-lane 背景
```

每个 sub-lane:bg 矩形(浅色填充 + 深色 stroke,如 `fill:"bgBlue", stroke:"blue"`)+ 标题文字 + items(用 `chain` 排列)。

画连线时(只在 clarify 选了"画连线"才做):
- 跨层用 `fromSide:"bottom"` + `toSide:"top"`(垂直降下,别让 auto 选)
- fan-in / fan-out 用 `fromT` / `toT` 错开接入点(`0.35` / `0.65`)

## 5. 渲染

```text
mcp__excalidrawer__render_diagram({
  elements: <sugar 数组>,
  output: "./architecture-<name>",
  formats: <按 §2 clarify §4 / conventions §6 选>,
  scale: <高清演示场景传 3,其它略>
})
```

## 6. 给用户

把三个路径告诉用户。复杂架构图建议主推 `.png` 贴 slides。

## 7. 常见迭代

- "加一层 Cache" → 增 lane / sub-lane,resize 整体高度
- "把 Web 和 Mobile 拆开" → 从 A 模式切到 B 模式
- "加一条 Auth → DB 的关键连线" → 单加一条 arrow(注意 fromSide/toSide)
- "用同色调区分前端 / 后端" → 见 recipe 配色策略

## 8. 不适用本 skill(路由)

- 流程 / 决策分支 → `excalidrawer-flowchart`
- 时间线 / 路线图 → `excalidrawer-timeline`
- 多角色交互 / 调用顺序 → `excalidrawer-sequence`
- 真自由拓扑(树 / 心智图) → 手摆 sugar
