---
name: excalidrawer-timeline
description: 用 Excalidraw 手绘风生成时间线 / 路线图 / 里程碑图。任何提到 timeline / 时间线 / 路线图 / roadmap / milestone / 里程碑 / 项目阶段 / phase / 季度规划 / Q1Q2Q3Q4 / 周计划 / 时间节点 / chronology 的场景都触发本 skill。流程:AskUserQuestion clarify → 读 recipe → 拼 sugar(轴 + 里程碑圆点 + 上下交替标签) → 调 excalidrawer MCP server 的 render_diagram 输出 .excalidraw / .svg / .png。
allowed-tools: mcp__excalidrawer__render_diagram, mcp__excalidrawer__compute_layout, Bash(npx -y -p excalidrawer*:*), Read, Write(./timeline-*.json), AskUserQuestion
---

# Timeline skill

把项目阶段 / 路线图 / 历史里程碑画成手绘风时间线。流程:**clarify → 读 recipe → 拼 sugar → render_diagram**。

## 0. 必读约定

- 跨 skill 约定 → `../excalidrawer-shared/references/conventions.md`
- sugar schema → `../excalidrawer-shared/references/sugar.md`
- 配色 → `../excalidrawer-shared/references/colors.md`
- timeline 具体模式(两种轴/圆点风格、文字布局、配色循环、不等时间间隔) → `recipes/timeline.md`

## 1. 前置检查

MCP 工具可见。否则走 CLI fallback。

## 2. Clarify(必)

AskUserQuestion 2 个问题:

1. **里程碑列表** —— 自由文本
   - 每个里程碑给 3 个字段:`time`(日期 / 季度 / 阶段)、`label`(短标题)、`desc`(可选,一行描述)
   - 例:`Jan 2026 / MVP / Core features ready` ×4 条

2. **轴 / 圆点风格** —— AskUserQuestion 单选
   - `居中穿珠`(圆点居中在轴上,轴在圆点处断开;视觉最干净,**推荐**)
   - `lollipop`(圆点切于轴,偏到 label 同侧)

3. **输出格式 / 使用场景** —— AskUserQuestion 单选,选项和映射见 `../excalidrawer-shared/references/conventions.md` §6。timeline 常用于 slides,默认偏 PNG。

可选追问:
- 如果时间跨度不均(Jan/Mar/Aug/Sep),要不要按真实跨度拉开 x 距离

**diagram label 默认英文**(见 conventions §4)。

## 3. 读 recipe

`Read recipes/timeline.md` —— 两种风格的拼法、文字三件套布局(time/label/desc)、配色循环、不等时间间隔处理。

## 4. 拼 sugar 元素

骨架:

```js
// title
{ shape: "text", at: [60, 30], size: [AXIS_END_X, 38], text: "<title>", fontSize: 28 }

// 节点 x 位置
const xs = mcp__excalidrawer__compute_layout({
  helper: "chain",
  args: { start: {x: 200, y: AXIS_Y}, count: N, dx: 260 }
}).result;

// 轴(两种风格之一,见 recipe)
// 圆点(每个里程碑一个 ellipse,配色循环)
// 每个里程碑:time(顶上,带色) + label(大字) + desc(灰小字),上下交替
```

## 5. 渲染

```text
mcp__excalidrawer__render_diagram({
  elements: <sugar 数组>,
  output: "./timeline-<name>",
  formats: <按 §2 clarify §3 / conventions §6 选>,
  scale: <高清演示场景传 3,其它略>
})
```

## 6. 给用户

把三个路径告诉用户。时间线常用于 slides / 对外汇报,`.png` 优先。

## 7. 常见迭代

- "加一个里程碑" → 加一条数据,chain count + 1,re-render
- "里程碑顺序错了" → 调数据顺序,re-render
- "X 阶段时间跨度大,想视觉上拉开" → 用不等 dx(自定义 x 数组,见 recipe §Uneven gaps)
- "换字段顺序(label 在 time 上面)" → 在 recipe 选项里改

## 8. 不适用本 skill(路由)

- 流程 / 决策 → `excalidrawer-flowchart`
- 系统架构 → `excalidrawer-architecture`
- 多角色交互 → `excalidrawer-sequence`
