---
type: spec
status: 正式
tags: [diagram, skills, skill-layers]
summary: 入口 skill 只用自然语言写图，出图和组件用法收进按步骤调用的步骤 skill
related: ["[[2026-10-28-skill-layers-grill]]", "[[layout-components]]", "[[webp-output-format]]"]
issues: [27]
---

# Skill 分层：入口 skill 只写自然语言，步骤 skill 管怎么做

## 验证

| issue | 结论 | 证据 |
|---|---|---|
| #27 Skill refactor: per-type skills in natural language, mechanics in a lower layer | 存在 | 2026-10-27 对着 `origin/release/0.6.0`（91974b3，组件层与 WebP 都已合入）清点 6 个类型 recipe：带两位以上数字的行数跟 issue 写的一字不差（comparison 41 … flowchart 13），没有一处调用新组件；标题字号这条同一规则在 4 份 recipe 里写成了 26、28、26–28 三种。详情见「问题」 |

## 问题

### 1. 类型 recipe 里写满了要模型照抄的数字和调用

2026-10-27 对着 `origin/release/0.6.0` 清点 `skills/<type>/` 下的两份文件（`SKILL.md` 和 `references/<type>.md`）：

| 类型 | recipe 行数 | 带两位以上数字的行 | 代码块 | 提到工具 / helper / sugar 字段的行 | `SKILL.md` 里提到工具或参数的行 |
|---|---|---|---|---|---|
| comparison | 339 | 41 | 10 | 43 | 4 |
| timeline | 159 | 17 | 6 | 25 | 3 |
| architecture | 171 | 16 | 4 | 23 | 2 |
| sequence | 128 | 15 | 2 | 14 | 3 |
| tree | 147 | 14 | 4 | 9 | 5 |
| flowchart | 161 | 13 | 7 | 18 | 3 |

数字是写死的几何：flowchart 的 `NODE_W = 150`、主线 `y = 150`、分支行 `y ≈ 290`；comparison 的「表头 90 → 正文 175」、`CANVAS_W - 80`；sequence 的生命线长度 `60 + 52 * stepCount`。它们只对 recipe 里那个例子成立，内容一长一短就不对；模型照抄的就是这些数。

组件层（#26）已经合进 `release/0.6.0`，但 6 份 recipe 里没有一处调用 stack、panel、axis、legend：`layout-components` spec 里「每个组件替掉 recipe 的哪几处」那张表一条都还没落地。

类型 `SKILL.md` 也在讲机制：tree 的 clarify 里贴了一整段 AskUserQuestion 的 JS 对象，还写着「选『上下』→ `direction: "down"`」；flowchart 的第 3 步写着「坐标用 `compute_layout` 的 `chain` 排」。

### 2. 同一条机制在几份 recipe 里各写一遍，已经写岔了

| 规则 | 出现在 | 写法 |
|---|---|---|
| 标题位置与字号 | flowchart、timeline、architecture、comparison | 都是 `y = 30`；字号 flowchart 28、timeline 28、architecture 26–28、comparison 26 |
| 同一行的格子取同一高度（`equalize`） | 全部 6 份 | 各自一段，comparison 写了 9 处 |
| 带标题的盒子不手填高度（`titledBox`） | flowchart、architecture、comparison | 各自一段 |
| 连线走直角（`arrowType: "elbow"`） | flowchart、architecture、comparison | 各自一句 |

同一件事写三四遍，改一处就要找全另外几处；标题字号已经是没找全的结果。#12 要新加图类型，照现在的样子写，就是再复制一份。

### 3. 类型 skill 靠相对路径一开场整份读进底层

每个类型 `SKILL.md` 开头都是「前置条件：先 Read `../shared/SKILL.md`」，不管这一步用不用得上，开场就把底层的 220 行和它指向的两份参考读进来。指向靠目录相对路径，目录一挪就断；`shared` 自己的 description 写着「deliberately non-triggering」，它名义上是 skill，实际只被当文件读。

复现材料：`.tmp/to-spec/skill-layers/repro/counts.txt`（本地，不提交）

### 根因

- recipe 写成于组件层之前：容器尺寸、行距、轴线分段当时没有组件可调，只能写成数字和公式交给模型算。组件有了，recipe 没跟着改。
- 「某个组件怎么用、能画出什么效果」这一层没有家：`shared` 只收了所有类型都一样的东西（MCP、命名、格式、语义、sugar 字段），组件的用法就落在了每份 recipe 里，各写各的。
- 两层的分界按「哪种图专用 / 几种图共用」切，而不是按「谁、什么时候调」切，所以底层只能整份前置读入。

## 方案

改完以后 skill 分两层，按谁调、什么时候调来分（术语见 `GLOSSARY.md`「Skill」）：

- **入口 skill**：用户直接调用，一种图一个（flowchart、timeline、architecture、sequence、comparison、tree），每个只有一个 `SKILL.md`。正文是一串步骤，用自然语言写：要问用户什么、一张好的这种图长什么样（用到哪些组件、各画出什么效果）、常见的画坏法。不出现坐标、尺寸、字号，不出现工具名和 sugar 字段，没有代码块。走到要「怎么做」的那一步，调步骤 skill、点明看哪一节。
- **步骤 skill**：叫 `steps`（由现在的 `shared` 改名），入口 skill 走到某一步时调用。正文是出图的步骤（MCP 与 CLI、命名、标签语言、导出格式、两层质量关、迭代）；组件的用法按组件分开放在它的参考里，每个组件写什么时候用、参数怎么填、能画出哪些效果。

拿 flowchart 的回边举例：

- 现在：recipe 里写「`fromSide: "left", toSide: "bottom"`，不要让 auto 选边」，附一段 sugar。
- 改完：flowchart 入口 skill 的构图一步写「重试、返回上一步的回边，从主线不用的那条边出、进，拐一个直角——连线怎么指定出入边，看步骤 skill 的连线一节」；步骤 skill 的连线一节写字段、为什么回边不能交给自动选边。

标题字号这类全图共用的值只在步骤 skill 里写一次。

![改完后的两层：入口 skill 按步骤调用步骤 skill](../../raw/skill-layers/assets/architecture-skill-layers.png)

同一行为的入口，逐个：

| 入口 | 本次 |
|---|---|
| 6 个入口 skill（`skills/{flowchart,timeline,architecture,sequence,comparison,tree}/`） | 纳入：`references/<type>.md` 按下面的约定拆开，自然语言部分并进 `SKILL.md`，组件用法进步骤 skill，然后删掉 `references/` |
| 步骤 skill（`skills/shared/` → `skills/steps/`） | 纳入：改名；正文按「步骤 skill 的组成」重排；§6 导出格式参考、§7.5 两层质量关的内容原样搬（#13 已经写成底层该有的样子） |
| `semantics.md`、`sugar.md` | 纳入：semantics 留作「意思 → 样式」的参考，图例改用 legend，加全图共用的值；sugar 的字段说明拆进各组件的参考 |
| 各 skill frontmatter 的 `description` | 纳入：入口 skill 去掉「read references/<type>.md」这类流程描述，触发词不动；步骤 skill 的 description 改写成给入口 skill 调用的 |
| `CLAUDE.md` 的 `skills/` 一节、README 里讲 skill 结构和 `shared` 的段落 | 纳入：改成两层与 `steps` |
| 插件清单（`.claude-plugin/`、`.codex-plugin/`、`.cursor-plugin/`）、`npx skills add` 的安装方式 | 排除：它们打包整个 `skills/` 目录，目录改名、文件增删都不用改清单；Codex 那边能不能调到另一个 skill 在实现时装一次核实 |
| `docs/gallery/` 的图、渲染代码 | 排除：只改 skill 文字，不改渲染 |
| 内置模板与 `generate -t` | 排除：#15 发版时删掉；tree recipe 里「Built-in template (CLI fallback)」一节不搬，因为它指向的命令要删了 |

## User Stories

### 照入口 skill 画一张图

![照入口 skill 画一张图](../../raw/skill-layers/assets/tree-user-stories-1-draw.png)

1. 作为画图的 agent，我想要入口 skill 只告诉我这种图要问什么、长什么样，以便我不会把只适合例子的数字抄进别人的图里
2. 作为画图的 agent，我想要走到哪一步才调步骤 skill 的哪一节，以便开场不用整份读完底层
3. 作为画图的 agent，我想要每个组件在步骤 skill 里只有一份用法，以便两种图里同一个效果（比如标题、回边）画出来一样
4. 作为画图的 agent，我想要容器、行距、轴线这些几何都从组件拿，以便内容变长变短时图不越界
5. 作为用户，我想要改完以后六种图画出来的质量不比现在差，以便这次重构对我是无感的
6. 作为用 Codex 或 `npx skills add` 装的用户，我想要入口 skill 照样调得到步骤 skill，以便不只 Claude Code 能用

### 维护步骤 skill

![维护步骤 skill](../../raw/skill-layers/assets/tree-user-stories-2-maintain.png)

1. 作为维护者，我想要改一个组件的用法只改步骤 skill 一处，以便不会再出现四份 recipe 里四个字号
2. 作为维护者，我想要入口 skill 里一旦混进几何数字、工具名、sugar 字段或代码块，测试就红，以便约定不靠记性守住

### 新增一种图类型（#12）

![新增一种图类型](../../raw/skill-layers/assets/tree-user-stories-3-new-type.png)

1. 作为加新图类型的人，我想要一份照着做的清单：要写哪些文件、各写什么、不许写什么，以便不用读完六种现有入口 skill 去猜
2. 作为加新图类型的人，我想要步骤 skill 里已有的组件直接引用，缺的用法加进步骤 skill 而不是写进自己的入口 skill，以便下一种图也能用上

## 实现决策

### 入口 skill 的写法

依据：issue 原文「describe each type only in natural language … No coordinates, no sizes, no API calls」；人在 grill 里定的「一个是用户直接调用的，另一个则是调用的过程中，根据具体的步骤调用的」，以及同意按步骤写（Q6）。

- 一种图只有 `SKILL.md` 一个文件，正文用中文（6 份类型 `SKILL.md` 的正文现在都是中文；从英文 recipe 搬来的内容译成中文）。frontmatter 的 `description` 保持中英双语触发词；`allowed-tools` 保留，它是宿主读的权限声明。
- 正文是固定的四步，删掉现在开头的「前置条件：先读 `../shared/SKILL.md`」：
  1. **问清楚**：这种图要问用户什么、哪些情况可以不问。提问的通用规则（一轮问几题、什么时候用选择题）调步骤 skill，看「clarify」。
  2. **构图**：一张好的这种图长什么样：讲清什么、几种布局变体各适合什么内容、用到哪些组件、每个组件在这里画出什么效果、配色倾向。组件的参数调步骤 skill，看对应组件那一节。
  3. **出图**：调步骤 skill，看「出图」（命名、格式、质量关、迭代）。
  4. **常见画坏法**：画坏了长什么样、为什么、改哪一步。
- **不许写**：坐标、尺寸、间距、字号这类几何数字（带不带 px 都算）；工具名（`render_diagram`、`compute_layout`）；sugar 字段名和取值（`fromSide`、`arrowType: "elbow"` 这类）；代码块（只放 ASCII 示意图的 `text` 块除外，tree 的分裂方向预览就是这种）。
- **可以写**：组件名（stack、panel、axis、legend、连线、tree 这类，用来指向步骤 skill 的那一节，人在 grill Q2 定的）；内容上的数量判断，比如「每个父节点 1–8 个孩子最好看」「叶子平均超过 15 个字推荐左右分裂」，它们说的是内容，不是几何。
- clarify 的问题和选项用自然语言写；「用户选了某项 → 传哪个参数」的映射写在对应组件那一节。

### 步骤 skill 的组成

依据：人在 grill 里同意的 Q1（一个步骤 skill，组件内容放在它的参考里按需读）、Q2（按组件组织）、Q7（改名 `steps`）。

- 名字 `steps`，目录 `skills/steps/`。Claude Code 插件里的调用名是 `excalidrawer:steps`，`npx skills add` 装出来是 `steps`。
- 它是模型可调用的 skill：description 写给入口 skill 调用，说清它管出图和组件用法，并且不作为独立的画图入口触发。
- 正文（`SKILL.md`）是出图的步骤和通用规则，每节一个名字，入口 skill 用节名指过来：
  - **clarify**：提问的通用规则（现在 shared §4）；
  - **组件**：一张「组件 → 去读哪份参考」的表，加读的顺序；
  - **出图**：MCP 前置与 CLI fallback、命名、标签语言、导出格式参考、render 调用、两层质量关、迭代（现在 shared §1、§5–§8 的内容，§6、§7.5 原样搬）；
  - **新增一种图类型**：见下面的约定。
- 参考（`references/`）：
  - **语义**：一个意思用什么线型、粗细、端点、颜色（现在的 `semantics.md`），加全图共用的值：标题字号 28、副标题 16、正文字号。图例改用 legend。
  - **每个组件一份**：形状与文字、连线（箭头与线，含自动路由和出入边）、stack（含 equalize）、panel、axis、legend、tree，以及仍在用的旧排布 helper（chain、gridLayout、swimlane、hub-and-spoke）。每份写：什么时候用、参数和返回、怎么配合 sugar 画出来、它能画出的效果（比如连线这份写回边、标签避让、长距离绕行；stack 这份写一行格子一样高）。现在 `sugar.md` 里的字段说明拆进各份，recipe 里的机制按它用的组件归进各份。
- 入口 skill 调它的写法统一成一句：「调 skill `steps`（Claude Code 用 Skill 工具调 `excalidrawer:steps`；其他宿主读 `../steps/SKILL.md`），看它的『<节名>』」。依据：人同意的 Q3，写 skill 名、带路径兜底，所有装法都调得到。

标题字号 28 的依据：flowchart、timeline 两份 recipe 写 28，architecture 写 26–28，只有 comparison 写 26；内置 timeline 模板的标题也是 28（「产品已有的统一做法」，多数实例为准）。comparison 改成 28 后由 Layer B 看图核一遍不挤。

### 每份 recipe 里的几何换成组件

照 `layout-components` spec「每个组件替掉 recipe 的哪几处」那张表逐条换，表里每一行都要落地：换完的用法写进步骤 skill 对应组件那一份，入口 skill 只写效果和组件名。依据：那份 spec 是人定过的清单。表外剩下的数字（flowchart 的节点宽、主线 y 等）换成 stack 排或旧排布 helper 的默认值；还留得下的数字进步骤 skill，不留在入口 skill。

### Codex 与 skills.sh 安装下的调用

实现时按 README 的方式各装一次：Claude Code 插件、Codex 插件、`npx skills add` 整仓安装，在每种装法下让一个入口 skill 走到「出图」一步，确认调到了步骤 skill。哪种装法调不到，在 PR 里写明卡在哪，不为它另改写法（依据：人同意的 Q3，「验证不了的话，在 PR 里说明」）。

### 新增一种图类型的约定（给 #12）

照做的清单，实现时原样写进步骤 skill 的「新增一种图类型」一节，#12 照它写：

1. 新建 `skills/<type>/SKILL.md`，按「入口 skill 的写法」的四步写；遵守「不许写」，测试会查。
2. 构图里用到的每个组件，先在步骤 skill 的参考里找；有就在构图一步写组件名和它画出的效果，没有的用法加进那个组件的参考。要一个还不存在的组件，先开组件层的 issue。
3. 步骤 skill「出图」里的命名表加一行 `<type>-<name>`。
4. `CLAUDE.md` 的 `skills/` 一节、README 的图类型列表加上它；`docs/gallery/` 加一张图（`node examples/gallery.mjs` 生成）。
5. 插件清单不用改。
6. 用新入口 skill 照一个真实请求画一张图，Layer A、Layer B 都过，才算写完。

### 防回退的测试

加一个 `node --test` 测试，扫 `skills/` 下除 `steps/` 外每个入口 skill 的正文（frontmatter 之后）：出现代码块（`text` 块除外）、两个工具名、sugar 字段名、带 px 的数字或 `x =` / `y =` 这样的坐标写法，就红，报出文件、行号和命中的词。组件名不禁。依据：用户故事「维护步骤 skill 2」，以及 #12 要靠它守约定。

## 技术方案总览

### 后端

不涉及：只改 skill 文档，加一个扫文档的测试。

### 前端内部

不涉及。

### 前端交互

不涉及。

## 测试决策

| 变的是什么 | 仪器 | 本次 |
|---|---|---|
| 纯逻辑、数据转换、状态机 | TDD 单元测试 | 碰到：入口 skill 的「不许写」扫描，先写会红的测试（拿现在的 6 份 skill 跑，必红） |
| API 契约（路由、schema、序列化） | TDD API 测试 | 不涉及 |
| DB schema、迁移、并发与事务语义 | 真 DB 测试 | 不涉及 |
| LLM 输出质量（prompt 改动） | eval（确定性断言） | 碰到：skill 就是 prompt。每种图一条固定请求，子代理只读新 skill 画图，断言 Layer A 无 warning；Layer B 由人对着 `docs/gallery/` 的同类型图看 |
| 视觉正确性 | UI 实现环 | 不涉及：没有 UI |
| 端到端用户流程 | 浏览器端到端测试 | 不涉及 |

- **seam**：
  - `skills/` 目录的文件内容：扫描测试从这里读。抓得到入口 skill 混进几何、调用、字段、代码块；抓不到步骤 skill 写错、入口 skill 的描述含糊。
  - `render_diagram`（或 CLI `render`）的返回：eval 从这里读 `warnings`。抓得到组件调用写错导致的越界、重叠；抓不到构图难看，那部分靠 Layer B 和人看图。
- **增量功能测试**：
  - 前置：实现完成的分支。步骤：对 6 种图各起一个只读 `skills/` 的子代理，给它这一类型 gallery 图对应的请求（比如「画一个 PR 到上线的流程，失败可以重试」），让它照入口 skill 画。期望：6 张图 Layer A 无 warning；跟 gallery 同类型的图放在一起，构图不比它差；子代理的过程里能看到它在构图、出图两步才去读步骤 skill 的对应节。覆盖：照入口 skill 画一张图 1、2、3、4、5。
  - 前置同上。步骤：Claude Code 插件、Codex 插件、`npx skills add` 三种装法各装一次，让 flowchart 走到「出图」。期望：三种都调到了步骤 skill；调不到的在 PR 里写明。覆盖：照入口 skill 画一张图 6。
  - 前置同上。步骤：在任一入口 skill 里加一行 `y = 150`，跑 `npm test`。期望：扫描测试红，报出这一行。覆盖：维护步骤 skill 2。
  - 前置同上。步骤：grep 步骤 skill 和 6 份入口 skill 里的标题字号。期望：只在步骤 skill 出现一次。覆盖：维护步骤 skill 1、照入口 skill 画一张图 3。
  - 前置同上。步骤：读步骤 skill 的「新增一种图类型」一节，对一种假想类型（比如漏斗图）照清单列出要写的文件。期望：不用读任何现有入口 skill 就能走完。覆盖：新增一种图类型 1、2。
- **prompt / eval 变动**：6 份入口 skill 全部改写，步骤 skill 改名重排、参考按组件重组。eval 是上面的 6 条固定请求，结果作为 PR 的交付证据，不进 `tests/`（要起子代理，不确定）。
- **照着谁写**：扫描测试照 `tests/tools.test.mjs` 的写法；用 `node:fs` 读 `skills/`，不 mock。

## Out of scope

- 改渲染、组件、helper 的代码：组件层已经在 #26 做完，这里只消费。
- `docs/gallery/` 重新生成：渲染没变，图不变。
- 插件清单与安装方式：打包整个 `skills/`，不用改。
- 内置模板与 `generate -t`：#15 发版时删；tree recipe 里讲模板 fallback 的一节不搬。
- 把 skill 正文改成英文、或做中英双份：正文语言跟现在的类型 `SKILL.md` 一致，要改另开 issue。
- 把步骤 skill 再拆成几个（比如出图一个、组件一个）：每张图两样都要用，拆开不会多出触发途径，只多一条常驻 description（人在 grill Q1 定的）。
- harold-skills 里那套独立的 skill：两边各自迭代（`CLAUDE.md`「Notes」），这里只改本仓库的 `skills/`。

## 关联

- 讨论：[[2026-10-28-skill-layers-grill]]。
- 覆盖：#27 Skill refactor: per-type skills in natural language, mechanics in a lower layer。
- [[layout-components]]（#26，已合进 `release/0.6.0`）：本 spec 消费它的四个组件和「每个组件替掉 recipe 的哪几处」那张表。它先。
- [[webp-output-format]]（#13，已合进 `release/0.6.0`）：已经把 shared §6 改成导出格式参考、§7.5 改成 PNG 或 WebP 自检；本 spec 原样搬这两节，不重做。它先。
- #12 New diagram types（搁置，在本 spec 之后）：照本 spec「新增一种图类型的约定」写新图。本 spec 先。
- #15 0.6.0 feature list：本 spec 的实现 PR 合进 `release/0.6.0`；CHANGELOG 只写 Unreleased，版本条目由 #15 写。#15 删 `generate -t` 时不用再改 skill。
- [[example-gallery]]（#25，搁置）：不重叠；它展示 gallery 图，本 spec 不改图。
- #24 CJK 折行后拉丁行退回手写字体：管字体选择，不重叠。
- #17 Hand-drawn-style icon primitives：以后作为新组件进步骤 skill 的参考，不重叠。
- #16、#14：生态接入、draw.io 导入，不重叠。#16 接新的 agent runtime 时要用到本 spec 的「其他宿主读路径」兜底。
