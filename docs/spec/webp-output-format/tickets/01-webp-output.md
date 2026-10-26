# 01 — 无损 WebP 输出，并把格式选择写成共享 skill 里的一份参考

**Blocked by**：无——可立即开工
**设计冻结**：不涉及 UI

## 要建什么

调用方在格式里写 `webp`，就多拿到一份无损 WebP 图；agent 按图的去处选格式，「什么格式适合放哪」只在共享 skill 里写一处。

引擎侧：

- 库的 `render()` 认 `webp`，返回值里 `outputs.webp` 是 Buffer。
- 新增 `toWebp(elements, scale)`，跟 `toPng` 并列，从包入口导出。WebP 跟 PNG 出自同一次光栅化（同样的字体加载、白底、`scale`），只有最后一步编码不同：把光栅化得到的 RGBA 像素直接交给编码器做无损编码，不经 PNG 再解码，不暴露质量参数。
- 编码器用 `@jsquash/webp`（wasm，加进 dependencies）。它面向浏览器写，Node 里要自己读包里的 wasm 文件初始化，只初始化一次。
- 不写格式时仍然只出 excalidraw + svg + png 三份：「可选格式」和「默认格式」是两份不同的清单，webp 只进前一份。
- MCP `render_diagram` 的 `formats` 认 `webp` 并写出 `<output>.webp`；参数说明只列可选值和「不写时出 excalidraw / svg / png」，不再写各格式的用途。`scale` 的说明从「PNG pixel scale」改成对 PNG / WebP 生效。
- CLI `render -f webp` 写出 `<output>.webp`，帮助文字列出 webp，`--scale` 说明同上。
- CLI `generate` 不动：它那份单独的格式白名单不加 webp（0.6.0 会删掉整条 `generate` 路径）。

skill 侧：

- 共享 skill 里讲导出格式的那一节，改写成一份格式参考：每种格式一行「适合放哪、为什么」——excalidraw：要继续编辑；svg：Markdown / GitHub，矢量、能内联；png：Notion / 飞书 / slides，到处能贴；webp：网页 / 博客 / landing page，体积约为 PNG 的四分之一、无损；`scale`：放大导出，对 png / webp 生效。再加一句做法：从对话里推得出图的去处就直接选格式，推不出才问一句去处。原来那张「四个固定选项的提问表」删掉。
- 共享 skill 里讲 clarify（「最后一个问题总是导出格式」）和 render 调用（`formats` 的来源）的地方，改成指向这份参考。
- 6 个图类型 skill（flowchart、timeline、architecture、sequence、comparison、tree）里「最后一个固定是导出格式」「formats 按 clarify」这几行，改成一句指向共享 skill 那份参考的话；它们的 description 里提到的导出格式列表补上 WebP。
- 写法照「同一个意思只放一处、用正向说法写目标行为、不写成必须照走的分支逻辑」。

文档侧：

- README 的库 API 表列出 `toWebp`，CLI 用法列出 webp。
- `docs/output-formats.md` 设计笔记的 Status 行改成指向 spec `webp-output-format`。
- CHANGELOG 的 Unreleased 节记下这次改动（没有 Unreleased 节就加一个，不改版本号）。

## 验收标准

- [x] 用一个最小矩形调 `render(..., { formats: ["webp"] })`：`outputs.webp` 是 Buffer，第 0–4 字节是 `RIFF`、第 8–12 字节是 `WEBP`，返回的格式只有 webp
- [x] 同一个矩形分别要 png 和 webp、`scale` 都是 3：两张图解出来的宽高相同
- [x] WebP 是无损编码（VP8L 块，不是有损的 VP8 块）
- [x] 不写 `formats` 时返回的格式恰好是 excalidraw、svg、png
- [x] 未知格式仍报错，报错里列出的可选值包含 webp
- [x] `toWebp` 能从包入口 import，跟 `toPng` 并列
- [x] MCP `render_diagram` 传 `formats: ["webp"]` 写出 `<output>.webp`
- [x] CLI `render -f webp` 写出 `<output>.webp`
- [x] 全量测试 `npm test` 通过，`npm run test:example` 跑通
- [x] 格式与去处的对应只在共享 skill 出现一次；6 个图类型 skill 里只剩指向格式参考的话，不再各写格式规则（review 第 2 轮人接受，2026-10-26）；共享 skill 里写着「推得出就选，推不出才问去处」，没有固定选项的提问表（人工核对）
- [x] README、`docs/output-formats.md`、CHANGELOG Unreleased 按「要建什么」更新
- [x] review 第 1 轮 S1（2026-10-26）：同一次调用同时要 png 和 webp 时，整张图只光栅化一次，两种格式从同一份像素分别编码；两份文件像素逐字节相同、尺寸相同，有测试证明光栅化只发生一次
- [x] review 第 1 轮 S2（2026-10-26）：共享 skill 里画完后的看图自检，改成读导出的位图（PNG 或 WebP 都行）；只出了 SVG、没有位图时，额外出一份 PNG 专门用来自检

## 选中的存量回归

- `tests/render.test.mjs`：`render()` 的格式白名单和默认格式就在这一刀里改，默认三份、未知格式报错这两类断言最容易被「把 webp 加进白名单」顺手带坏。
- `tests/tools.test.mjs`：MCP `render_diagram` 与 CLI `render` 共用的工具定义改了参数说明和格式处理，这里覆盖它的调用与写文件。
