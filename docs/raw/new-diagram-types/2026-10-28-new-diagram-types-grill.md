---
type: raw
source_type: conversation
captured: 2026-10-28
title: 新图类型总 spec 的待定项
tags: [new-diagram-types, new-diagram-types]
related: ["[[new-diagram-types]]"]
---

U 是人的原话，A 是 AI 的结论。之前的范围决定（五种图全进 0.6.0、先出总 spec 再按类型并行实现）由 #15 会话转达，写在 spec「实现决策」第一条。

## A1

总 spec 草稿留了四个待定项：high-level 是 architecture 的变体还是独立 skill；柱状 / 折线一个 skill 还是两个；金字塔 / 漏斗一个 skill 还是两个；新名字。复现发现两处组件缺口：axis 不能向上、线条导出丢填充。

## U1

几个问题：
1 high level 和architecture有什么区别吗？
2 柱状图和折线图，金字塔和漏斗按照推荐来吧

## A2

architecture 讲谁调谁：层上下叠、层内服务横排、服务之间画调用。high-level 讲数据往哪流：段左右排、段内系统竖排、只画段间流向，底部一条贯穿横带。组件相同（panel、stack、连线），推荐做成 architecture 的第四种布局。对照图：`docs/spec/new-diagram-types/assets/architecture-vs-high-level.png`。柱状 / 折线、金字塔 / 漏斗各合成一个 skill，已写进 spec。

## U2

high-level 做成 architecture 的第四种布局。

## U3

新名字都用推荐：state-machine、pyramid、chart、taper、"up"。

## 本轮决议

| 议题 | 决议 |
|---|---|
| 柱状图和折线图 | 一个入口 skill `chart` |
| 金字塔和漏斗 | 一个入口 skill `pyramid` |
| high-level | architecture 的第四种布局，不单开 skill |
| 新名字 | `state-machine`、`pyramid`、`chart`、梯形组件 `taper`、axis 向上 `"up"` |
