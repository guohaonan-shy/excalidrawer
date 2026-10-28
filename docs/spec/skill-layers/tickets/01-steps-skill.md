# 01 — 步骤 skill `steps` 就位：改名、重排、组件用法按组件分份

**Blocked by**：无——可立即开工
**设计冻结**：不涉及 UI

## 背景（你需要知道的）

这个仓库的 agent skill 在 `skills/` 下分两层（术语见根目录 `GLOSSARY.md` 的「Skill」分组）：

- **入口 skill**：用户直接调用，一种图一个（flowchart、timeline、architecture、sequence、comparison、tree）。最终只用自然语言写四步：问清楚 → 构图 → 出图 → 常见画坏法。
- **步骤 skill**：入口 skill 走到某一步时调用，管这一步怎么做。现在叫 `shared`，本工单把它改名为 `steps`。

现在的问题：6 份类型 recipe（各入口 skill 目录下的 `references/<type>.md`）里写满了写死的几何数字和工具调用，同一条机制（标题字号、一行格子一样高、带标题的盒子、直角连线）在几份 recipe 里各写一遍且已写岔（标题字号 26 / 28 / 26–28）。组件层 stack、panel、axis、legend 已经在这个分支上（看 `sugar.md` 的 helper 列表和 `docs/spec/layout-components/layout-components.md`），但没有一份 recipe 用它们。

完整的决定在 `docs/spec/skill-layers/skill-layers.md`（「方案」「实现决策」两节），有疑问以它为准。

## 要建什么

这一刀是「扩张」：`steps` 成为组件用法的唯一家，入口 skill 改成调它，但入口 skill 自己的内容（recipe）先不动、不删——后面 6 张工单各自改写一个入口 skill。做完后任何一种图都能照旧画出来。

1. **改名**：`skills/shared/` → `skills/steps/`，frontmatter `name: steps`。description 改写成给入口 skill 调用的：说清它管出图和组件用法，不作为独立的画图入口触发。
2. **正文重排**成有名字的节，入口 skill 按节名指过来：
   - 「clarify」：提问的通用规则（现在的 §4）。
   - 「组件」：一张「组件 → 去读哪份参考」的表，加读的顺序（先语义，再要用的组件）。
   - 「出图」：MCP 前置与 CLI fallback、命名、标签语言、导出格式参考、render 调用、两层质量关、迭代（现在的 §1、§5–§8）。导出格式参考和 Layer A / Layer B 质量关这两节的内容原样搬，别重写。
   - 「新增一种图类型」：照 spec「新增一种图类型的约定（给 #12）」那 6 条原样写入，把其中的「步骤 skill」落成 `steps`。
3. **参考按组件分份**：每个组件一份，写什么时候用、参数和返回、怎么配合 sugar 画出来、它能画出的效果。至少这些：形状与文字、连线（箭头与线，含自动路由、出入边、回边、标签避让、长距离绕行）、stack（含 equalize、一行格子一样高）、panel（含 titledBox / fitContainer 的旧用法）、axis、legend、tree，以及仍在用的旧排布 helper（chain、gridLayout、swimlane、hub-and-spoke）。现在 `sugar.md` 的字段说明拆进各份，`sugar.md` 不再保留为一整份。
4. **把 6 份 recipe 里的机制搬进对应组件那份**，并按 `layout-components` spec「每个组件替掉 recipe 的哪几处」那张表把手算几何换成组件调用（architecture 两种模式 → stack + panel；comparison 一侧的外框和行 → panel + stack；sequence 生命线长度 → stack 的高；timeline 轴线与缺口 → axis、里程碑三行 → stack；图例 → legend）。表外剩下的数字换成 stack 或旧 helper 的默认值，还留得下的写在组件参考里。每份组件参考里可以有「在某种图里怎么用」的例子。
5. **语义参考**（现在的 `semantics.md`）留作「意思 → 线型、粗细、端点、颜色」，图例一节改用 legend，并加「全图共用的值」：标题字号 28、副标题 16、正文字号（取现有 recipe 的通行值）。
6. **6 个入口 skill 只改指向**：开头的「前置条件：先 Read `../shared/SKILL.md`」换成统一的一句「调 skill `steps`（Claude Code 用 Skill 工具调 `excalidrawer:steps`；其他宿主读 `../steps/SKILL.md`），看它的『<节名>』」。recipe 内容不动。
7. 仓库里其他指向 `skills/shared` 或 `../shared/` 的地方（入口 skill、recipe 里的相对链接、`CLAUDE.md`、README）一起改成 `steps`，不留断链。

## 验收标准
- [ ] `skills/shared/` 不存在，`skills/steps/SKILL.md` 的 `name` 是 `steps`，正文有「clarify」「组件」「出图」「新增一种图类型」四节
- [ ] 导出格式参考和两层质量关的内容跟改名前逐字一致（diff 只有标题、节号）
- [ ] `steps` 的参考里每个组件一份，`layout-components` 替换表的每一行都能在某份组件参考里找到对应写法
- [ ] 标题字号只在语义参考里出现一次，值是 28
- [ ] 6 个入口 skill 开头都是那一句统一的调用，没有 `../shared/` 残留：`grep -rn "shared/" skills CLAUDE.md README.md` 无输出
- [ ] 仓库内所有指向 `skills/` 下文件的 markdown 相对链接都能解析到存在的文件
- [ ] 照 flowchart 入口 skill（recipe 未改）+ `steps` 画 gallery 里的「Pull request to production」流程图，Layer A 无 warning
- [ ] `npm test` 全绿

## 选中的存量回归
- `tests/tools.test.mjs`：`compute_layout` 的 helper 白名单与说明，`steps` 的组件参考要跟它对得上
