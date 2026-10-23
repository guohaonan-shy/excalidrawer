---
type: raw
source_type: conversation
captured: 2026-10-23
title: #13 WebP 输出：编码器与选格式机制的拍板
tags: [output-formats, webp-output-format]
related: ["[[webp-output-format]]"]
---

U 是人的原话，逐字保留；A 是 AI 的结论，只留结论与发现。

## A1

#13 已复现：`render` 要 webp 报未知格式；不写格式时四个入口都出 excalidraw + svg + png。resvg 2.6.2 只能出 PNG，WebP 要加编码依赖。实测无损 WebP 约为 PNG 的四分之一，比有损 q90 还小。两条待定：编码器（推荐 `@jsquash/webp`，约 1 MB wasm，对比 `sharp` 约 28 MB 原生）；引擎要不要认「去处」（推荐只改 skill 和参数说明，引擎不加参数）。

## U1

webp的编码器我同意你的点，我倾向于引擎支持format参数，然后agent根据场景决策用什么格式。格式信息可以放到skills里面，另外，我觉得skill 需要按照writing-for-agent调整，我不想在skill里面写很多定制化的逻辑。

## A2

问范围：只改选格式这一块（共享 skill 的导出格式与 render 调用两节、6 个图类型 skill 里讲格式的几行，其余另开 issue），还是整套 skill 一起按 writing-for-agents 重写。

## U2

这个issue也放进#15里面，作为一个sub-issue，放进0.6.0的feature list

## A3

#15 已是 0.6.0 的 umbrella，整套 skill 的两层重构在 #27。#13 挂成 #15 的 sub-issue、加进 feature list；本 spec 只改导出格式这一块，写进 #27 说的底层。0.6.0 删除 `generate -t`，所以 `generate` 不加 webp。

## 本轮决议

| 议题 | 决议 |
|---|---|
| WebP 编码器 | `@jsquash/webp`（wasm） |
| 引擎认不认「去处」 | 不认，只有 `formats`；agent 按场景选，格式知识放 skill |
| skill 怎么写 | 照 writing-for-agents：格式写成一份参考放共享 skill，不写固定提问流程 |
| 范围与排期 | #13 进 #15 / 0.6.0；整套 skill 重写归 #27；`generate` 不加 webp |
