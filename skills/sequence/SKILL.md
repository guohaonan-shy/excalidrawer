---
name: sequence
description: 用 Excalidraw 手绘风生成时序图 / 多角色交互图 / API 调用顺序图。任何提到 sequence diagram / 时序图 / 交互流 / API 调用顺序 / handshake / OAuth 流程 / 异步交互 / 跨服务调用 / RPC 链路 / 谁先谁后 / 协议握手 的场景都触发本 skill。流程:AskUserQuestion clarify → 读 recipe → 拼 sugar(actor 头 + 虚线生命线 + 消息箭头) → 调 excalidrawer MCP server 的 render_diagram 输出 .excalidraw / .svg / .png。
allowed-tools: mcp__excalidrawer__render_diagram, mcp__excalidrawer__compute_layout, Bash(npx -y -p excalidrawer*:*), Read, Write(./sequence-*.json), AskUserQuestion
---

# Sequence skill

把多角色 / 多服务之间的交互画成手绘风时序图。流程:**clarify → 读 recipe → 拼 sugar → render_diagram**。

## 0. 必读约定

- 跨 skill 约定 → `../excalidrawer-shared/references/conventions.md`
- sugar schema → `../excalidrawer-shared/references/sugar.md`
- 配色 → `../excalidrawer-shared/references/colors.md`
- sequence 具体模式(actor 摆位 / 生命线 / 消息样式 / 跨 lifeline label) → `recipes/sequence.md`

## 1. 前置检查

MCP 工具可见。否则走 CLI fallback。

## 2. Clarify(必)

AskUserQuestion 2-3 个问题:

1. **参与的角色 / 服务** —— 自由文本
   - 例:"User / Client / Auth Server" 或 "Frontend / Gateway / Payment / DB"
   - 让用户列出来,你按交互顺序定 actor 排列

2. **核心交互序列** —— 自由文本
   - 例:"OAuth login flow with code exchange"
   - 用户能粘步骤更好;粘不出来用问的方式抽取关键 step

3. **返回 / 响应消息样式** —— AskUserQuestion 单选
   - `按方向区分:左→右实线,右→左虚线`(默认,直观)
   - `按语义区分:请求实线,响应/return 虚线`(标准 UML 风格)
   - `不区分:全实线`(简单交互可用)

4. **输出格式 / 使用场景** —— AskUserQuestion 单选,选项和映射见 `../excalidrawer-shared/references/conventions.md` §6。

**diagram label 默认英文**(见 conventions §4)。

## 3. 读 recipe

`Read recipes/sequence.md` —— actor 摆位、生命线样式、消息间距、跨 lifeline label 的 `labelT` 处理。

## 4. 拼 sugar 元素

骨架:

```js
// title
{ shape: "text", at: [80, 10], size: [TOTAL_W, 32], text: "<title>", fontSize: 26 }

// actor 头(顶部一行)
{ shape: "rect", id: "user", at: [cx - AW/2, ATOP], size: [AW, AH],
  fill: "yellow", text: "User", fontSize: 15 }

// 生命线 = 细虚线无箭头(sugar 没有 line 原语,用 arrow + head:"none" + dashed)
{ shape: "arrow", at: [cx, LIFE_TOP], points: [[0, 0], [0, LIFE_LEN]],
  head: "none", dashed: true, stroke: "gray" }

// 消息 = 横向 L4 箭头
{ shape: "arrow", at: [fromX, y], points: [[0, 0], [toX - fromX, 0]],
  dashed: <按 §2 §3 规则>, text: "1. Login request" }

// 跨多条 lifeline 的消息加 labelT 错开(避开中间 lifeline)
{ shape: "arrow", ..., labelT: 0.25 }
```

actor x positions: `chain({ start: {x:200, y:0}, count: N, dx: 330 })`
step y positions: `chain({ start: {x:0, y: LIFE_TOP + 40}, count: M, dy: 52 })`

## 5. 渲染

```text
mcp__excalidrawer__render_diagram({
  elements: <sugar 数组>,
  output: "./sequence-<name>",
  formats: <按 §2 clarify §4 / conventions §6 选>,
  scale: <高清演示场景传 3,其它略>
})
```

## 6. 给用户

把三个路径告诉用户。时序图通常用 `.png` 贴 docs / Notion。

## 7. 常见迭代

- "加一步" → 在对应 y 加 message arrow,后续 step y 顺移
- "插入一个新 actor" → 加 actor box + lifeline,所有跨它的 message 补 `labelT`
- "返回消息要更明显" → 切换 §3 选项一(按方向区分)
- "actor 太挤,label 溢出" → 增大 actor 间距 dx(默认 330,长 label 可调到 380+)

## 8. 不适用本 skill(路由)

- 决策 / 业务流转 → `flowchart`
- 系统组件 / 分层 → `architecture`
- 时间线 / 路线图 → `timeline`
