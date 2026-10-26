---
type: raw
source_type: conversation
captured: 2026-10-26
title: 示例图库的三个开放问题怎么定
tags: [example-gallery, site]
related: ["[[example-gallery]]"]
---

U 是人的原话，A 是 AI 的结论。讨论发生在 #25 的 issue 会话审核阶段。

## A1

复现结论：#25 存在。仓库没开 GitHub Pages（`gh api …/pages` 404）；npm 包不含 `docs/`；`excalidrawer.soloworks.io` 连不上；README 里 8 张图只有 PNG，看不到输入、拿不到 `.excalidraw`；重跑 `node examples/gallery.mjs` 零 diff。

三个开放问题的推荐：

- 图库放在哪：GitHub Pages，本仓库里一个无构建步骤的静态 HTML 单页，Actions workflow 只部署图库目录；每种图一个 tab，tab 里有图、生成它的输入、`.excalidraw` 下载。落地页不存在、不在本仓库，选它会让 #25 赶不上 0.6.0。开 Pages 要人在仓库设置里点。页面碰 UI，按流程走设计阶段。
- 刷新方式：手动跑脚本并提交，加一个 `--check` 模式在 PR CI 里跑，生成结果跟已提交的不一致就报红。比对 `.excalidraw` 和 SVG，不比 PNG（跨平台光栅化可能差几个像素）。
- 兼作 agent-eval 对照样本：这次不做。agent-eval 没排期，对照样本要提示词加结构断言，图库要好看有代表性，绑在一起改一个就改了公开页面。共用的只是生成函数。

给 #12 的约定：在 `examples/gallery.mjs` 的图表里加一项（slug、名字、一句说明、生成函数），跑一次脚本，图库页和 README 表格都随之更新。

截图：`assets/problem-1-readme-only.png` 是 GitHub 上 README *What it makes* 一节的表格（2026-10-26 截），红圈圈出一格：图下只有名字和一句说明，没有输入、没有源文件下载。

## U1

三条都按你的推荐定：GitHub Pages 单页、手动刷新加检查、不兼作 agent-eval 样本。

## 本轮决议

| 议题 | 决议 |
|---|---|
| 图库放在哪 | GitHub Pages，本仓库里的静态单页，Actions 只部署图库目录 |
| 每次发版重新生成还是手动刷新 | 手动跑脚本提交，PR CI 跑 `--check` 拦住过期的图 |
| 要不要兼作 agent-eval 的对照样本 | 这次不做，只共用生成函数 |
