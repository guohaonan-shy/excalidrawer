# 08 — 防回退的扫描测试、文档与三种装法的验证

**Blocked by**：02、03、04、05、06、07（6 个入口 skill 都改写完）
**设计冻结**：不涉及 UI

## 背景（你需要知道的）

`skills/` 下分两层（术语见根目录 `GLOSSARY.md` 的「Skill」分组）：入口 skill（一种图一个，用户直接调用，只用自然语言写）和步骤 skill `steps`（入口 skill 走到某一步时调用，管出图和组件用法）。前面的工单已经把 6 个入口 skill 改写完。约定是：入口 skill 正文不许出现几何数字、工具名、sugar 字段、代码块。这张工单让这条约定由测试守住，并补齐文档。完整的决定在 `docs/spec/skill-layers/skill-layers.md`。

## 要建什么

1. **扫描测试**（`node --test`，放 `tests/` 下，照 `tests/tools.test.mjs` 的写法，用 `node:fs` 读 `skills/`，不 mock）：扫 `skills/` 下除 `steps/` 外每个入口 skill 的正文（frontmatter 之后）。出现代码块（`text` 块除外）、`render_diagram` / `compute_layout`、sugar 字段名、带 px 的数字或 `x =` / `y =` 这样的坐标写法，就红，报出文件、行号和命中的词。组件名不禁；内容上的数量（如「1–8 个孩子」）不禁。先写会红的用例（往一个临时入口 skill 正文里放一行 `y = 150`），再让它对现有 6 份全绿。
2. **文档**：`CLAUDE.md` 的 `skills/` 一节改成两层与 `steps`（入口 skill 只有 `SKILL.md`、`steps` 的参考按组件分份、扫描测试守约定）；README 里讲 skill 结构和 `shared` 的段落同步；`CHANGELOG.md` 只在 Unreleased 节下记这次改动（版本号与 0.6.0 条目由发版时写）。
3. **三种装法的验证**：按 README 的方式各装一次——Claude Code 插件、Codex 插件、`npx skills add` 整仓安装——每种装法下让 flowchart 入口 skill 走到「出图」一步，确认调到了 `steps`。调不到的，在 PR 描述里写明哪种装法、卡在哪，不为它另改写法。
4. 全仓搜一遍 recipe、`references/<type>.md`、`shared` 的残留提法，改掉或确认是历史段落。

> 人的决定（2026-10-28）：「第一题选 A，第二题选 B」。
> - 第一题 A：步骤 skill 的「clarify」和 6 份入口 skill 统一成「用户的描述已经能列全这张图的全部内容（节点和分叉去向、里程碑、层与服务……）就不问，也不去读提问规则」；原先「必须是结构化清单才跳过」的说法改掉。
> - 第二题 B：语义参考的「一张图不超过 4 种颜色」不改，时序图沿用「同类角色同色」。
>
> 另外这张工单一并做完前几张交回、归给收尾的几件（详情见共享笔记）：6 份入口 skill 每处「看它的『…』」后补「这一步只读这一节」（comparison 已有）；步骤 skill「出图」的 CLI 小节补三句：CLI 的 compute-layout 直接打印对象、没有 MCP 的 `.result` 外壳，只要 PNG 写 `-f png`、多种格式写 `-f png,excalidraw`；步骤 skill 开头的节表方便按节读（比如写每节的行号范围或在 SKILL.md 开头列节名）；入口 skill 的「导出格式从对话里推」与「出图」的「推不出来就问一句」措辞统一；stack 参考里时序图步骤列的宽度取法与角色间距的推法写清；`examples/comparison-figures.mjs` 文件头注释改成指向步骤 skill 的 panel 参考。

> 人的决定（2026-10-28）：「选A」——内容说全时只免掉内容上的问题；「怎么画」的选择从内容推不出来、用户也没说的，照问一题（timeline、sequence、comparison、tree 现有的那句例外保留）。

## 验收标准
- [x] 在任一入口 skill 正文里加一行 `y = 150`，`npm test` 红，报出这一行；删掉后全绿
- [x] 6 个入口 skill 现状下扫描测试全绿
- [x] 标题字号在 `skills/` 里只出现在 `steps` 的语义参考一处
- [x] `CLAUDE.md`、README 不再提 `skills/shared` 或「type recipe 在 `references/<type>.md`」
- [x] `CHANGELOG.md` 的改动只在 Unreleased 节下
- [ ] 三种装法的验证结果写进 PR 描述（每种：调到 / 没调到 + 卡在哪） ⏭ 延后 → PR 交付验收：三种装法都真装过，静态可发现性已验（交回的 verified 有逐项结果）；让模型实际走到「出图」一步没跑成（临时配置目录里没有登录凭据，不为此拷贝凭据），描述由编排者写进 PR，要人看过再认
- [x] 「用户已说全就不问、不读提问规则」在步骤 skill 的 clarify 和 6 份入口 skill 里是同一个说法（人的决定第一题）
- [x] 6 份入口 skill 每处调用步骤 skill 的地方都带「这一步只读这一节」
- [x] 步骤 skill「出图」的 CLI 小节写明 `.result` 外壳的差别和 `-f` 的写法
- [x] `examples/comparison-figures.mjs` 不再指向已删的 recipe
- [x] `npm test` 全绿
- [x] review 第 1 轮 E4（2026-10-28）：步骤 skill「出图」的 CLI 兜底写明：stderr 没有输出就是 Layer A 通过（有告警时才打印 `⚠ N quality warning(s)`）
- [x] review 第 2 轮 S2（2026-10-28）：扫描对连线的点列字段、形状的文字字段也生效——按代码的样子（字段名后跟冒号和值）写进入口 skill 正文就红；普通行文里出现这两个词不红——工单 08 验收原话「出现……sugar 字段名……就红，报出文件、行号和命中的词」

## 选中的存量回归
- `tests/tools.test.mjs`：同在 `tests/` 下读工具定义，新测试不能改动它的行为
