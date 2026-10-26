---
type: raw
source_type: conversation
captured: 2026-10-26
title: 组件层（stack / panel / axis / legend）的范围与接口 grill
tags: [component-layer, layout-components]
related: ["[[layout-components]]"]
---

# 组件层的范围与接口 grill

格式约定：U 是人的原话，逐字保留；A 是 AI 的结论与发现，取证过程略去。问题里的「Q1」等编号只在这场对话内有效。

## A1

现状（对着 `main` 17d0a7f 核）：

- 复现：照 architecture recipe 的 `swimlane`（`laneH: 100`、`itemH: 56`）放一个长标签条目，条目长到 132 高，撑出泳道、压进下一条泳道；linter 报两条 `SHAPE_OVERLAP`。修正 issue 原文：越界抓得到，但修法只能是模型手算 `laneH`。证据图：`assets/problem-1-lane-overflow.png`（红圈是标注，不属于渲染输出）。
- 手算几何最多的地方：comparison 的 shell 公式与 Layout C；architecture 的 `laneH`、居中排一行、`cell.y + 80`；sequence 的生命线长度；timeline 的分段轴线整套算法和三行文字偏移；图例只有 `semantics.md` 里一段手摆代码。
- 已有 `titledBox`、`equalize`；「标题条 + 一组子格」的容器只在 architecture 模板里（`sectionH`）。

照规则已定（可推翻）：返回坐标不返回带样式的元素；库导出、`compute_layout`、`sugar.md` 三处暴露；不改各图类型的 recipe（归 #27）；不动现有 helper 与模板。

第一轮问题：Q1 做哪几个组件（推荐 stack、card、axis、legend 四个都做）；Q2 stack 是否自己量内容（推荐收内容描述，兼容 `{w,h}`，带 equalize 开关）；Q3 嵌套由组件递归（推荐）；Q4 `align` 收 start/center/end，另加 `size` + `justify`（start/center/end/space-between）。

## U1

Q1 同意

Q2 这块其实我有个疑问，就是agent 如何根据内容的描述思考出它的尺寸

Q3 同意

Q4 同意

## A2

agent 不用想尺寸：它给宽度和文字，高度由引擎用 `fitBoundText` 量出（跟渲染器给 box 折行是同一个函数）。实测：`{w:160, text:"Payment reconciliation and settlement worker (async, retries)"}` 折 5 行、`h = 132`；`{w:160, text:"Order Service"}` 1 行、`h = 43`。

第二轮问题：Q2 补充，`w` 可选，不写时取文字单行自然宽度加内边距、超 `maxW`（默认 200）折行；Q5 容器改名 `panel`（recipe 里 card 已指小格子），标题上、左两种都支持；Q6 `axis` 管标记点位置、数值换算、分段线、刻度、标签锚点，不管柱子和数据点；Q7 `legend` 收 `at`，也收 `bounds` + `corner`（inside / outside）；Q8 定名 `stack`、`panel`、`axis`、`legend`。

## U2

是

## 本轮决议

| 议题 | 决议 |
|---|---|
| 范围 | 四个组件都做：stack、panel、axis、legend；实现顺序 stack → panel → axis → legend |
| stack 的输入 | 收内容描述（跟 `equalize` 同一套）并兼容 `{w,h}`；带 equalize 开关 |
| 宽度 | `w` 可选，不写取自然宽度，超 `maxW` 折行 |
| 嵌套 | 组件递归：`cells` 里可以是 `{stack}` 或 `{panel}`，一次返回所有层的绝对坐标 |
| 对齐与分布 | `align`：start / center / end；可选 `size` + `justify`：start / center / end / space-between |
| 容器名与标题位置 | 叫 panel；标题在上方或左侧一列 |
| axis 范围 | 标记点位置（等距或按数值线性换算）、分段线、可选末段箭头、刻度、标签锚点；不画柱子和数据点 |
| legend 摆放 | 收 `at`，也收 `bounds` + `corner` + inside / outside，有 corner 时以它为准 |
| 定名 | stack、panel、axis、legend，已写进 GLOSSARY.md |
