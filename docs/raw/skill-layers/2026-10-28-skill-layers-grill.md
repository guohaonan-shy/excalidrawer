---
type: raw
source_type: conversation
captured: 2026-10-28
title: #27 skill 分层的 grill
tags: [skill-layers, skills]
related: ["[[skill-layers]]"]
---

# #27 skill 分层的 grill

U 是人的原话，逐字保留；A 是 AI 的结论，取证过程略去。

## A1

对着 `origin/release/0.6.0` 复现了 issue：6 份类型 recipe 带两位以上数字的行数跟 issue 一致，没有一处调用 stack / panel / axis / legend；标题字号在 4 份 recipe 里写成 26、28、26–28。起草 spec，留两条待定：类型专属机制在底层按效果组织（推荐）还是按类型分篇；底层新文件叫「画法」「做法」还是「效果」。

## U1

类型是用户调用的入口，用/writing-for-agents来将组件的内容加入其中。shared应该改成共享的skills吧？

## A2

理解为：类型 skill 是用户调用的入口；底层改成正经的 skill，由类型 skill 调用而不是按相对路径读；组件内容按 writing-for-agents 写进底层。提出四题：

- Q1 底层做成一个共享 skill（组件内容放它的 references 按需读）还是两个。推荐一个。
- Q2 组件内容按组件组织，效果写在产生它的组件下，类型 skill 指向组件名（组件名因此不再禁）。
- Q3 调用写 skill 名加路径兜底，兼顾 Codex 与 `npx skills add`；Codex 实际怎么调在实现时验证。
- Q4 术语「类型 skill / 共享 skill」。

## U2

Q1 同意

Q2 同意

Q3 同意

Q4 我觉得反而从分层角度来说，一个是用户直接调用的，另一个则是调用的过程中，根据具体的步骤调用的

## A3

按「谁、什么时候调」重新起名并据此改入口 skill 的结构：

- Q5 术语「入口 skill」（用户直接调用，一种图一个）/「步骤 skill」（入口 skill 走到某一步时调用）。
- Q6 入口 skill 写成四步（问清楚 → 构图 → 出图 → 常见画坏法），到哪步调步骤 skill 的哪一节，删掉开头「先读 shared」的前置条件。

## U3

Q5 同意 

Q6 同意

## A4

术语写进 `GLOSSARY.md`「Skill」分组。问 Q7：步骤 skill 的目录名和 `name` 改成 `steps`（推荐）、保留 `shared`、还是 `diagram-steps`。

## U4

没问题

## 本轮决议

| 议题 | 决议 |
|---|---|
| 两层怎么分 | 按谁、什么时候调分：入口 skill 由用户直接调用，步骤 skill 由入口 skill 走到某一步时调用 |
| 步骤 skill 几个 | 一个；组件内容放在它的参考里按需读 |
| 组件内容怎么组织 | 按组件，效果写在产生它的组件下；入口 skill 可以写组件名 |
| 怎么调到步骤 skill | 写 skill 名加路径兜底；Codex 与 skills.sh 下实现时验证，不行就在 PR 说明 |
| 术语 | 入口 skill、步骤 skill，进 `GLOSSARY.md` |
| 入口 skill 结构 | 四步：问清楚、构图、出图、常见画坏法；按步调用步骤 skill 的对应节 |
| 步骤 skill 名字 | `steps`（由 `shared` 改名） |
