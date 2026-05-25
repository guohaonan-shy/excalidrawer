---
name: excalidrawer-flowchart
description: 用 Excalidraw 手绘风生成流程图 / 决策流 / 分支判断图。任何提到 flowchart / 流程图 / 决策树 / decision flow / branching / 判断分支 / yes-no 流程 / 表单校验流 / 业务流转 / 审批流 / pipeline 流程 / process diagram 的场景都触发本 skill。流程:AskUserQuestion clarify → 读 recipe → 拼 sugar 元素数组 → 调 excalidrawer MCP server 的 render_diagram 输出 .excalidraw / .svg / .png。
allowed-tools: mcp__excalidrawer__render_diagram, mcp__excalidrawer__compute_layout, Bash(npx -y -p excalidrawer*:*), Read, Write(./flowchart-*.json), AskUserQuestion
---

# Flowchart skill

把用户描述的流程画成手绘风 flowchart。流程:**clarify → 读 recipe → 拼 sugar → render_diagram**。**不要直接动手拼元素**——先问清,再读 recipe。

## 0. 必读约定

- 跨 skill 约定(clarify 模式 / gstack 文件命名 / MCP fallback / 语言) → `../excalidrawer-shared/references/conventions.md`
- sugar schema 速查(shape / arrow L1-L4 / 自动路由 / helper 列表) → `../excalidrawer-shared/references/sugar.md`
- 配色 → `../excalidrawer-shared/references/colors.md`
- flowchart 具体模式(节点形状 / 配色 / back-edge / decision 分支 / 间距数值) → `recipes/flowchart.md`

## 1. 前置检查

确认 MCP 工具可见:`mcp__excalidrawer__render_diagram` 和 `mcp__excalidrawer__compute_layout`。若不可见(MCP 启动失败),走 conventions §3 的 CLI fallback。

## 2. Clarify(必)

用户描述往往很模糊("帮我画个流程图")。**不要猜**——用 AskUserQuestion 问 2-3 个 load-bearing 问题:

1. **流程的核心场景** —— 自由文本(自然语言模板)
   - 例:"用户提交表单到数据落库的全过程" / "Code review 通过到合并主干的步骤"

2. **判断 / 分叉点数量** —— AskUserQuestion 单选
   - 选项:`0 个,直线流程` / `1 个,单一 yes/no 判断` / `2-3 个,多重判断` / `自己列出来`

3. **方向** —— AskUserQuestion 单选
   - 选项:`horizontal`(默认,节点多时舒展) / `vertical`(节点少 / 列数少时紧凑)

4. **输出格式 / 使用场景** —— AskUserQuestion 单选,选项和映射见 `../excalidrawer-shared/references/conventions.md` §6。如果用户已在原问句里说明了用途("贴 Notion"),跳过。

可选追问(看场景):
- 是否有失败 / 异常分支需要单独画终点
- 是否有 retry / back-edge 循环

**跳过 clarify 的条件**:用户已粘完整结构化数据(节点列表 + 边),直接 §3。

**diagram label 默认英文**(见 conventions §4)。除非用户明确要中文,标签都用英文以保持手绘风一致。

## 3. 读 recipe

`Read recipes/flowchart.md` —— 节点形状对应、配色、layout 数值、back-edge 规则、decision 分支用 `fromT`/`toT` 错开。

## 4. 拼 sugar 元素

按 recipe 拼一个 sugar 元素数组。常见模式:

```js
// title
{ shape: "text", at: [40, 30], size: [WIDTH, 36], text: "<title>", fontSize: 28 }

// process 节点(矩形)、decision 节点(菱形)、start/end(圆角矩形)
{ shape: "rect",    id: "start", at: [x, y], size: [W, H], fill: "blue",   text: "Start" }
{ shape: "diamond", id: "check", at: [x, y], size: [W, H], fill: "yellow", text: "Valid?" }

// 边:默认 auto sides + 自动正交路由(直线/L/Z)
{ shape: "arrow", from: "start", to: "check" }

// 显式选边(decision 分支必从 bottom 出)
{ shape: "arrow", from: "check", to: "fail", fromSide: "bottom", toSide: "top", text: "No" }

// back-edge / retry → 选垂直的一对边,auto 自动 L 拐弯
{ shape: "arrow", from: "fail", to: "check", fromSide: "left", toSide: "bottom", text: "retry" }
```

坐标需要算时 call `mcp__excalidrawer__compute_layout`:
- `chain` 排横向 / 竖向节点
- `gridLayout` 网格摆位

## 5. 渲染

```text
mcp__excalidrawer__render_diagram({
  elements: <sugar 数组>,
  output: "./flowchart-<name>",          // 不含扩展名,gstack 风格命名
  formats: <按 §2 clarify §4 / conventions §6 选>,
  scale: <高清演示场景传 3,其它略>
})
```

- 成功:`{ written: [...3 paths], elementCount: N }`
- 失败:`{ error, issues: [...] }` —— 按 issue 索引修 sugar 重试

## 6. 给用户

把三个路径告诉用户。`.svg` 适合 Markdown / GitHub,`.png` 适合 Notion / 飞书 / slides,`.excalidraw` 留给用户继续编辑。

## 7. 常见迭代

- "把 X 节点拆成两步" → 改节点数组,用 `chain` 重排 x
- "X 失败回到 Y 重试" → 加 back-edge arrow,`fromSide` / `toSide` 选**垂直**的一对边(见 recipe)
- "决策点多分支" → 从 decision 出的多条 arrow 设不同 `fromT`(0.3 / 0.5 / 0.7)错开接出点
- "字太挤" → 缩短 label,或加 subtitle text 元素

## 8. 不适用本 skill(路由)

- 时间线 / 路线图 / 里程碑 → `excalidrawer-timeline` skill
- 系统架构 / 分层组件 → `excalidrawer-architecture` skill
- 多角色交互 / API 调用顺序 → `excalidrawer-sequence` skill
- 树状 / 心智图 / 自由拓扑 → 直接用 sugar 手摆,输出 `./diagram-<name>.{...}`(见 conventions §5)
