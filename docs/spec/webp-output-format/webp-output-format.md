---
type: spec
status: 完成
tags: [io, export, webp-output-format]
summary: 加 WebP 输出格式，并让 agent 按图的去处选格式
related: ["[[2026-10-23-webp-format-decisions]]"]
issues: [13]
---

# WebP 输出与按用途选格式

## 验证

| issue | 结论 | 证据 |
|---|---|---|
| #13 WebP output + scenario-aware output format selection | 存在 | 2026-10-22 对着 `main`（f838a0e）用一个不提交的测试核：`render` 要 webp 直接报未知格式；不写格式时总是出 excalidraw + svg + png 三份，详情在「问题」 |

## 问题

### 1. 要不到 WebP

复现：用一个最小的矩形调 `render`，`formats` 写 `["webp"]`，得到的是报错「unknown format(s): webp. Valid: excalidraw, svg, png」，没有任何输出。本该拿到一份 WebP 图。

同一张白名单在四个入口各自生效，四处都只认 excalidraw / svg / png：

- 库的 `render()`；
- MCP 工具 `render_diagram` 的 `formats` 参数（复用 `render()`）；
- CLI `render -f`（复用 `render()`）；
- CLI `generate -f`：模板路径绕过 `render()`，自己另写了一份同样的白名单和写文件循环。

库层也没有跟 `toPng` 并列的 WebP 导出函数。

要把图放进 HTML 页面的人，现在只能拿 PNG。实测同一张图，无损 WebP 约为 PNG 的四分之一（见「实现决策」里的体积表）。

复现材料：`.tmp/to-spec/webp-output-format/repro/`（本地，不提交）

### 2. 默认把三种格式全出一遍，选格式只靠 skill 里的一个问题

复现：同一个测试不写 `formats`，`render` 返回的格式是 excalidraw、svg、png 三份。MCP、CLI `render`、CLI `generate` 不写格式时也一样，都是三份。

按用途选格式现在只有一处：共享 skill 第 6 节「Export format selection」，最后一个 clarify 问题问用途，四个选项映射到 `formats`（Markdown / GitHub → svg；Notion / 飞书 / slides → png；打印 / 高清 → png + scale 3；不确定 → 三种全要），用户请求里已经说了去处就跳过问题直接推断。这个表里没有「网页 / HTML」，也没有 WebP。没装 skill、直接调 MCP 的 agent 只能看 `formats` 参数的说明，那里写的也只有 svg / png / excalidraw 三种的用途。

### 根因

- 问题 1：输出格式是写死的白名单，`render()` 一份、CLI `generate` 一份；PNG 由 `@resvg/resvg-js` 出，它目前的最新版（2.6.2）只有 `asPng`，没有 WebP 编码。
- 问题 2：库、MCP、CLI 都没有「去处」这个输入，不写格式就退回「全出」；「按用途选」只活在 skill 的提问表里，表里缺网页这一项。

## 方案

用户最终得到：

- 在格式里写 `webp`，就多拿到一份 `<output>.webp`。它是无损的，像素尺寸跟同一个 `scale` 的 PNG 完全一样，体积约为 PNG 的四分之一。
- 引擎只管「给什么格式出什么格式」，不认图要去哪。选格式由 agent 按场景定：用 skill 画图时说了「放进网页 / 博客 / landing page」，agent 直接出 webp，不再问；从对话推不出去处时才问一句。
- 「什么格式适合放哪」只写在 skill 的底层（共享 skill）一处，各图类型的 skill 不再各自规定「最后一个问题固定问导出格式」。
- 不写格式的老调用方，拿到的东西跟今天一样。

同一行为的入口，逐个：

| 入口 | 本次 |
|---|---|
| 库 `render()` | 纳入：认 `webp`，`outputs.webp` 是 Buffer |
| 库导出函数 | 纳入：新增 `toWebp(elements, scale)`，与 `toPng` 并列，从包入口导出 |
| MCP `render_diagram` | 纳入：`formats` 认 `webp`，写 `.webp` 文件；参数说明只列可选值，用途不写在这里 |
| CLI `render -f` | 纳入：认 `webp`，帮助文字列出它 |
| CLI `generate -f` | 排除：见 Out of scope |
| 共享 skill 里讲导出格式和 render 调用的两节 | 纳入：改写成一份「格式 → 适合放哪」的参考，加上「推得出就选，推不出才问」 |
| 6 个图类型 skill 里讲导出格式的那几行 | 纳入：改成指向共享 skill 的那份参考 |
| README 的 API 表和 CLI 用法 | 纳入：列出 webp 与 `toWebp` |
| `docs/output-formats.md` 设计笔记 | 纳入：Status 行改成指向这份 spec |
| README 的 gallery 图（`docs/gallery/`） | 排除：见 Out of scope |

## User Stories

### 导出 WebP

![导出 WebP 的 story 树](assets/tree-user-stories-1-export-webp.png)

1. 作为调用 `render_diagram` 的 agent，我想要在 `formats` 里写 `webp` 就得到一个 `.webp` 文件，以便把图直接放进 HTML 页面
2. 作为 CLI 用户，我想要 `render -f webp` 输出 webp，以便在脚本里拿到同一种格式
3. 作为库的调用方，我想要 `render()` 返回 `outputs.webp`，并且有一个跟 `toPng` 并列的 `toWebp`，以便在自己的脚本里直接用
4. 作为放大导出的用户，我想要 `scale` 对 webp 一样生效、像素尺寸跟同 scale 的 PNG 一致，以便换格式不换清晰度
5. 作为网页作者，我想要 webp 是无损的、体积约为同图 PNG 的四分之一，以便页面加载快又不糊字
6. 作为已有的调用方，我想要不写 `formats` 时输出跟以前一样，以便升级不打断我的流程

### 按用途选格式

![按用途选格式的 story 树](assets/tree-user-stories-2-pick-by-use.png)

1. 作为用 skill 画图的人，我想要说了「放进网页」之后 agent 直接选 webp、不再问我，以便少答一个问题
2. 作为没说图要放哪的人，我想要 agent 先问一句去处再选格式，以便拿到的格式能直接用
3. 作为维护 skill 的人，我想要格式和去处的对应只在共享 skill 里写一处，以便加一种格式只改一个地方

## 实现决策

### WebP 用无损编码

依据：实测（2026-10-22，本地，3 张 gallery 图里成功渲染的 2 张，scale 2）：

| 图 | PNG | WebP 无损 | WebP 有损 q90 |
|---|---|---|---|
| architecture（1636×1608） | 89 KB | 22 KB | 85 KB |
| tree-stories（2238×4898） | 529 KB | 131 KB | 315 KB |

这类图是大块纯色加文字的线稿，无损比 q90 有损还小得多，而且不糊字。所以只出无损，不暴露质量参数（「默认改动最小」）。两个候选编码器出的体积几乎一样，这条不随编码器选择变。

复现材料：`.tmp/to-spec/webp-output-format/repro/encoder-probe.mjs`

### WebP 从同一次光栅化来，`scale` 照 PNG

WebP 跟 PNG 共用同一次 resvg 光栅化（同样的字体加载、白底、`scale` 倍率），只在最后一步编码不同。依据：产品已有的做法是 `scale` 管所有位图（MCP 参数说明写着它对 svg / excalidraw 无效），webp 是位图，照办。`scale` 的说明文字从「PNG pixel scale」改成「PNG / WebP」。

### 不写格式时的默认不变

不写 `formats` 时仍然只出 excalidraw + svg + png，webp 不加进默认。依据：「默认改动最小」，加进默认会让每次渲染多一次编码（实测 0.4–1.6 秒）、多一个文件；已有调用方的输出也会变。

### WebP 编码器用 `@jsquash/webp`

resvg 自己出不了 WebP，要加一个编码依赖。两个候选实测出的文件体积几乎一样（上表），选 `@jsquash/webp`（wasm）而不是 `sharp`（原生 libvips）：

| | `@jsquash/webp` | `sharp` |
|---|---|---|
| 装进 `node_modules` 的体积 | 约 1 MB | 约 28 MB（含平台预编译包） |
| 原生二进制 | 没有，各平台一样 | 有，预编译包缺失的平台要现场编译 |
| 编码耗时（上表两张图） | 0.4 s / 1.6 s | 1.0 s / 0.8 s |

编码输入是 resvg 光栅化后的 RGBA 像素，不经 PNG 再解码。它面向浏览器写，Node 里要自己读 wasm 文件初始化，原型里几行就通。

依据：人在本会话里的原话「webp的编码器我同意你的点」（2026-10-23）。

### 引擎只认 `formats`，按场景选格式归 agent

引擎不加 `target` 一类的「去处」参数，也不从输出路径猜；`formats` 仍是唯一的格式输入，不写时按上一节的默认。agent 按场景决定传什么，「什么格式适合放哪」的知识只放在 skill 里。

依据：人在本会话里的原话「我倾向于引擎支持format参数，然后agent根据场景决策用什么格式。格式信息可以放到skills里面」（2026-10-23）。

### skill 里的格式选择写成参考，不写成固定流程

共享 skill 讲导出格式的那一节改写成一份参考：每种格式一行「适合放哪、为什么」（excalidraw：要继续编辑；svg：Markdown / GitHub，矢量、内联好；png：Notion / 飞书 / slides，到处能贴；webp：网页，体积小；`scale`：放大导出），再加一句做法：从对话里推得出图的去处就直接选，推不出才问一句去处。它取代现在那张「四个固定选项的 AskUserQuestion」表。

各图类型 skill 里「最后一个问题固定是导出格式」「formats 按 clarify」这几行，改成一句指向共享 skill 的那份参考；`render_diagram` 的 `formats` 参数说明只列可选值，用途不在引擎里再写一份。

写法照 `idea-loop:writing-for-agents`：同一个意思只放一处（单一事实来源），用正向的说法写目标行为，不写成必须照走的分支逻辑。

依据：人在本会话里的原话「我觉得skill 需要按照writing-for-agent调整，我不想在skill里面写很多定制化的逻辑」（2026-10-23）。范围只到导出格式这一块：整套 skill 按两层结构重写是 #27 的事，人把 #13 放进了 #15（0.6.0 feature list）跟 #27 并列（原话「这个issue也放进#15里面，作为一个sub-issue，放进0.6.0的feature list」）。这里写的参考就落在 #27 说的「底层」，#27 动手时不用再搬。

## 技术方案总览

### 后端

不涉及：这是一个本地库 / CLI / MCP stdio 工具，没有服务端、数据库或第三方调用。数据流只有一条：元素 → 光栅化 → PNG 或 WebP 编码 → 写文件。

### 前端内部

不涉及。

### 前端交互

不涉及。

## 测试决策

| 变的是什么 | 仪器 | 本次 |
|---|---|---|
| 纯逻辑、数据转换、状态机 | TDD 单元测试 | 碰到：`render()` 认 webp、默认格式不变、未知格式报错；WebP 字节是合法的 WebP、尺寸等于同 scale 的 PNG |
| API 契约（路由、schema、序列化） | TDD API 测试 | 碰到：MCP `render_diagram` 写出 `.webp` 文件；CLI `render -f webp` 写出文件 |
| DB schema、迁移、并发与事务语义 | 真 DB 测试 | 不涉及 |
| LLM 输出质量（prompt 改动） | eval（确定性断言） | 不涉及（skill 文字改动没有 eval 套件，见下） |
| 视觉正确性 | UI 实现环 | 不涉及：WebP 与 PNG 出自同一次光栅化，像素一致由单元测试的尺寸断言加无损编码保证 |
| 端到端用户流程 | 浏览器端到端测试 | 不涉及 |

- **seam**：
  - `render(elements, { formats, scale })` 的返回值：抓得到格式白名单、默认值、WebP 字节和尺寸；抓不到写文件和 CLI 参数解析。
  - 工具层（MCP `render_diagram.run` 与 CLI `render` 进程）：抓得到 `.webp` 文件真的写出来；抓不到编码细节（上一个 seam 管）。
- **增量功能测试**：
  - 前置：一个最小矩形。步骤：`render(..., { formats: ["webp"] })`。期望：`outputs.webp` 是 Buffer，第 8–12 字节是 `WEBP`；没有别的格式。覆盖：导出 WebP 1、3。
  - 前置：同一个矩形。步骤：分别要 `png` 和 `webp`，`scale` 都是 3。期望：两张图解出来宽高相同。覆盖：导出 WebP 4、5。
  - 前置：同一个矩形。步骤：不写 `formats`。期望：格式恰好是 excalidraw、svg、png。覆盖：导出 WebP 6。
  - 前置：同一个矩形的元素文件。步骤：CLI `render -f webp`；MCP `render_diagram` 传 `formats: ["webp"]`。期望：各自写出 `<output>.webp`。覆盖：导出 WebP 1、2。
  - 前置：改完的共享 skill 和 6 个图类型 skill。期望：格式与去处的对应只在共享 skill 出现一次，图类型 skill 里只有指向它的一句；共享 skill 里写着「推得出就选，推不出才问去处」，没有固定选项的提问表。人工核对，不写测试。覆盖：按用途选格式 1–3。
- **prompt / eval 变动**：无 prompt/eval 变动。skill 文字改动没有 eval 套件，按上一条人工核对。
- **照着谁写**：`tests/render.test.mjs`（`render()` 的格式与返回值断言）、`tests/tools.test.mjs`（MCP / CLI 共用工具定义的调用）。

## Out of scope

- **CLI `generate -f webp`**：`generate -t` 模板路径在 0.6.0 删除（#15「Also scheduled for 0.6.0」），#13 也排进了 0.6.0，给一条要删的路径加格式没有用户。它那份单独的格式白名单随路径一起删。
- **整套 skill 按两层结构重写**：归 #27；这里只改导出格式这一块。
- **引擎认「去处」（`target` 参数、从输出路径猜）**：人定了引擎只认 `formats`，见「引擎只认 `formats`，按场景选格式归 agent」。
- **README gallery 图换成 WebP**：gallery 的 PNG 是给 GitHub README 看的，GitHub 两种都能显示，换格式不解决任何人的问题；要换另开 issue。
- **有损 WebP / 质量参数**：实测有损在这类图上比无损还大，没有使用场景。
- **AVIF、JPEG 等其他位图格式**：issue 没提，也没有调用方要。
- **把 webp 加进默认输出**：见「不写格式时的默认不变」。

## 关联

- 覆盖的 issue：#13 WebP output + scenario-aware output format selection
- 所属：#15 0.6.0 feature list（#13 是它的 sub-issue）
- 设计笔记：`docs/output-formats.md`（2026-08-17 的方向记录，本 spec 取代其中的「Candidate mechanisms」和「Open question」）
- 相邻还没完成的 issue（都查过，均无 spec）：
  - #27 skill 两层重构：同在 0.6.0。本 spec 只改导出格式那一块，写进 #27 说的底层；谁先合都不冲突，后合的那个对一下共享 skill 里讲导出格式的那节即可。
  - #26 组件层、#12 新图类型、#25 示例 gallery：改元素层、加图类型或示例，不碰导出，无重叠。
  - #10 Mermaid → Excalidraw、#14 draw.io import：输入侧格式转换，跟输出格式不重叠。
  - #16 agent runtime 生态接入：它若给别的 runtime 暴露 `render_diagram`，会连带拿到 webp，无需协调。
  - #17 手绘图标、#24 CJK 标签折行后拉丁行的字体：不碰导出。
- 相关 spec、ADR：无（`docs/adr/` 为空，`docs/spec/` 里没有别的 spec）。
