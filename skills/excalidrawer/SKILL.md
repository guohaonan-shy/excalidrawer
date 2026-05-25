---
name: excalidrawer
description: 用 Excalidraw 手绘风从代码生成图表并导出 .excalidraw / .svg / .png（无需浏览器）。覆盖四种图表类型——流程图 / flowchart / 决策流 / 分支判断 / 审批流 / pipeline；时间线 / timeline / 路线图 / roadmap / 里程碑 / 项目阶段 / Q1Q2Q3Q4；系统架构 / architecture / 分层 / 三层架构 / 微服务 / 服务拓扑 / 数据中台；时序图 / sequence diagram / 多角色交互 / API 调用顺序 / handshake / OAuth 流程——以及自由拓扑（树 / 心智图 / 组织架构）。任何提到 create a diagram / draw a flowchart / 画个流程图 / 架构图 / 时序图 / 时间线 / visualize a process / export to svg / export to png 的场景都触发本 skill。流程：判断类型 → AskUserQuestion clarify → 读对应 reference recipe → 拼 sugar 元素数组 → 调 excalidrawer MCP server 的 render_diagram 输出三种格式。
allowed-tools: mcp__excalidrawer__render_diagram, mcp__excalidrawer__compute_layout, Bash(npx -y -p excalidrawer*:*), Read, Write(./*.json), AskUserQuestion
---

# Excalidrawer skill

One skill, four diagram types — **flowchart / timeline / architecture / sequence** —
plus freeform fallback. Flow: **判断类型 → clarify → 读 recipe → 拼 sugar → render_diagram**。
**不要直接动手拼元素**——先判断类型、问清、读对应 recipe。

## 0. 必读约定

- 跨类型通用约定（clarify 模式 / gstack 文件命名 / MCP fallback / 输出语言 / 输出格式选择 / 迭代） → `references/conventions.md`
- sugar schema 速查（shape / arrow L1-L4 / 自动路由 / helper 列表） → `references/sugar.md`
- 配色 → `references/colors.md`

每种图表类型的具体拼法（节点形状 / 配色 / layout 数值 / 各类边的处理）在它自己的
recipe 里：`references/flowchart.md` / `timeline.md` / `architecture.md` / `sequence.md`。

## 1. 前置检查

确认 MCP 工具可见：`mcp__excalidrawer__render_diagram` 和 `mcp__excalidrawer__compute_layout`。
若不可见（MCP 未配置 / 启动失败），走 `references/conventions.md` §3 的 CLI fallback。

## 2. 判断类型 + Clarify（必）

先把请求映射到一种类型（见 conventions §5），再用 **AskUserQuestion** 问该类型的
2-4 个 load-bearing 问题。**不要猜**。每轮 clarify 的最后一个问题固定是**输出格式 /
使用场景**（选项与 `formats` 映射见 conventions §6；用户原句已说明用途则跳过）。

**diagram label 默认英文**（见 conventions §4）——除非用户明确要中文。
**跳过 clarify 的条件**：用户已粘完整结构化数据（节点+边 / 里程碑列表 / 分层+服务 / actor+步骤）。

### flowchart（流程 / 决策 / 分支）
1. **核心场景** — 自由文本（如「表单提交到落库」「Code review 到合并」）
2. **判断 / 分叉点数量** — 单选：`0 个直线流程` / `1 个单一 yes-no` / `2-3 个多重判断` / `自己列`
3. **方向** — 单选：`horizontal`（默认，节点多时舒展） / `vertical`（节点少时紧凑）
- 可选追问：是否有失败 / 异常分支单独画终点；是否有 retry / back-edge 循环

### timeline（时间线 / 路线图 / 里程碑）
1. **里程碑列表** — 自由文本，每条给 `time`（日期/季度/阶段）+ `label`（短标题）+ `desc`（可选一行）
2. **轴 / 圆点风格** — 单选：`居中穿珠`（圆点居中、轴在珠处断开，最干净，**推荐**） / `lollipop`（圆点切于轴）
- 可选追问：时间跨度不均时是否按真实跨度拉开 x 距离

### architecture（系统架构 / 分层 / 拓扑）
1. **系统核心组成** — 自由文本，让用户列出来你按层分
2. **结构形态** — 单选：`经典分层`（每 tier 一条 lane） / `分层 + 子分组`（tier 内横向再分子 lane） / `自由拓扑`
3. **是否画连线** — 单选：`纯拓扑不画线`（默认） / `画关键流`（3-5 条主流） / `画完整连线`（慎选）
- 可选追问：是否有 API Gateway / MQ / Service Mesh 等独立一层

### sequence（时序 / 多角色交互）
1. **参与角色 / 服务** — 自由文本（如 `User / Client / Auth Server`），按交互顺序定排列
2. **核心交互序列** — 自由文本，能粘步骤更好
3. **返回消息样式** — 单选：`按方向：左→右实线、右→左虚线`（默认） / `按语义：请求实线、响应虚线`（UML） / `全实线`

### 都不是这四种？
树 / 心智图 / 组织架构 / 自由拓扑 → 不读 recipe，直接用 sugar 手摆（schema 见
`references/sugar.md`），输出 `./diagram-<name>.{…}`。

## 3. 读 recipe

`Read references/<type>.md` —— 拿到该类型的 layout 数值、节点形状/配色、各类边的处理、常见坑。

## 4. 拼 sugar 元素

按 recipe 拼一个 sugar 元素数组。坐标需要算时 call `mcp__excalidrawer__compute_layout`
（`chain` 排线性节点、`gridLayout` 网格、`swimlane` 架构 lane、`hubSpoke` 等）。
渲染顺序：背景 rect → 连线 arrow → 盒子/文字（见 sugar.md，避免箭头压字）。

## 5. 渲染

```text
mcp__excalidrawer__render_diagram({
  elements: <sugar 数组>,
  output: "./<type>-<name>",        // 不含扩展名，gstack 风格命名（见 conventions §2）
  formats: <按 §2 最后一问 / conventions §6 选>,
  scale: <高清演示场景传 3，其它略>
})
```

- 成功：`{ written: [...3 paths], elementCount: N }`
- 失败：`{ error, issues: [...] }` —— 按 issue 索引修 sugar 重试，失败时不写文件。

## 6. 给用户

把写出的路径告诉用户。`.svg` 适合 Markdown / GitHub，`.png` 适合 Notion / 飞书 / slides，
`.excalidraw` 留给用户继续编辑。

## 7. 迭代

重渲染时**沿用同一 output 文件名**（sugar 确定性生成，diff 干净），除非用户要保留两版。
各类型常见迭代见对应 recipe 末尾的「Common pitfalls」与下列速查：

- flowchart：拆节点用 `chain` 重排；back-edge 选**垂直**的一对 `fromSide`/`toSide`；多分支用 `fromT` 错开
- timeline：加里程碑 → chain count +1；时间跨度大 → 自定义 x 数组（recipe §Uneven gaps）
- architecture：加层 / 拆子分组（A↔B 模式切换）；加关键连线注意 `fromSide:"bottom"`/`toSide:"top"`
- sequence：加步骤 → 后续 step y 顺移；插 actor → 跨它的 message 补 `labelT`
