# 01 — 登记三个新入口 skill 的名字

**Blocked by**：无——可立即开工
**设计冻结**：不涉及 UI

## 要建什么

0.6.0 要加三个新入口 skill：`state-machine`（状态机）、`pyramid`（金字塔与漏斗共用）、`chart`（柱状图与折线图共用）；另外 high-level 全景做成 architecture 的第四种布局，不新建入口 skill。后面四张工单（02–05）由不同的会话并行做，它们原本都要改同几处「列出所有入口 skill 的名单」，每合一张后面的都冲突。这张工单先把三个名字一次登记到所有名单里，之后 02–05 不再碰这几处。

要登记的地方：

- 步骤 skill（`steps`）的 frontmatter 描述和正文开头，列着它服务哪些入口 skill 的那两处名单。
- 步骤 skill「出图」一节的输出命名表：加 `state-machine`、`pyramid`、`chart` 三行，格式跟现有行一样。
- 步骤 skill 开头的「每节读哪几行」行号表：上面两处改动让行号变了，按约定测试报出的正确行号改。
- 仓库根的 agent 说明文档里描述 `skills/` 的一节：入口 skill 名单加上三个名字，说明一句 high-level 是 architecture 的一种布局。
- README 里「Six diagram types」那句改成「Nine diagram types」（三个新 skill 对应的入口还没落地，只改这句话，不加图表格子）。
- 新图类型的设计笔记（`docs/diagram-types.md`）顶上的 Status 行：改成已排进 0.6.0，并链接总 spec `new-diagram-types`。

同一个 PR 里还要带上总 spec 本身（它目前只在 main 上），以及 01–05 五张工单，让并行会话从 `release/0.6.0` 就读得到；spec 索引按脚本重新生成。

## 验收标准

- [x] 步骤 skill 的两处入口 skill 名单都列出 `state-machine`、`pyramid`、`chart`
- [x] 输出命名表有这三行，前缀与 skill 名一致
- [x] 步骤 skill 的行号表与实际小节一致，`npm test` 全绿（含步骤 skill 的约定测试）
- [x] agent 说明文档的 `skills/` 一节列出三个新名字，并写明 high-level 是 architecture 的第四种布局
- [x] README 写「Nine diagram types」，图表格子没有变
- [x] 设计笔记的 Status 行指向总 spec
- [x] `release/0.6.0` 上能读到总 spec 和五张工单；spec 索引包含 `new-diagram-types`
- [x] CHANGELOG 只在 Unreleased 下记一条

## 选中的存量回归

- `tests/skills-steps.test.mjs`：核步骤 skill 的行号表与小节、helper 文档化，这张工单直接改了它核的东西。
- `tests/skills-entry.test.mjs`：从目录发现入口 skill；这张工单不新建目录，跑它确认没把名单写成目录。
