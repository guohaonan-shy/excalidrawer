# 04 — architecture 入口 skill 改写成只用自然语言

**Blocked by**：01 — 步骤 skill `steps` 就位
**设计冻结**：不涉及 UI

## 背景（你需要知道的）

`skills/` 下分两层（术语见根目录 `GLOSSARY.md` 的「Skill」分组）：入口 skill 由用户直接调用、一种图一个；步骤 skill `steps` 在入口 skill 走到某一步时被调用，管怎么做：出图、各组件的用法（每个组件一份参考）。01 已经把 6 份 recipe 里的组件用法搬进了 `steps`，但 architecture 入口 skill 还留着它的 recipe（`skills/architecture/references/architecture.md`），里面有写死的坐标、尺寸、字号、sugar 片段。

完整的决定在 `docs/spec/skill-layers/skill-layers.md`「入口 skill 的写法」一节，有疑问以它为准。

## 要建什么

architecture 入口 skill（架构图）只剩一个 `SKILL.md`，用户说「画个架构图」时，agent 照它四步走，到「怎么做」时才调 `steps` 的对应节：

1. **问清楚**：这种图要问用户什么、哪些情况可以不问（沿用现在 clarify 的问题，用自然语言写选项）。提问的通用规则指向 `steps` 的「clarify」。「用户选了某项 → 传哪个参数」的映射不写在这里，确认它在 `steps` 对应组件那份里（没有就补进去）。
2. **构图**：一张好的架构图长什么样——讲清什么、几种布局变体各适合什么内容、用到哪些组件、每个组件在这里画出什么效果、配色倾向。组件参数指向 `steps` 对应组件那一份。
3. **出图**：指向 `steps` 的「出图」。
4. **常见画坏法**：画坏了长什么样、为什么、回到哪一步改。

recipe 里的内容逐段处置：自然语言的描述译成中文并进 `SKILL.md`；机制（字段、参数、坐标、公式）确认已在 `steps` 对应组件那份里，没有就补进那份，然后从这里删掉。最后删除 `skills/architecture/references/`。frontmatter 的 `description` 去掉「read references/architecture.md」这类流程描述，触发词不动；`allowed-tools` 保留。所有指向 `steps` 的写法用统一的一句：「调 skill `steps`（Claude Code 用 Skill 工具调 `excalidrawer:steps`；其他宿主读 `../steps/SKILL.md`），看它的『<节名>』」。

**正文不许写**：坐标、尺寸、间距、字号这类几何数字（带不带 px 都算）；工具名 `render_diagram`、`compute_layout`；sugar 字段名和取值；代码块（只放 ASCII 示意图的 `text` 块除外）。**可以写**：组件名（stack、panel、axis、legend、连线、tree 等），内容上的数量判断（比如「每个父节点 1–8 个孩子」）。

只改 `skills/architecture/` 和 `steps` 的组件参考（补缺）；不改别的入口 skill。

## 验收标准
- [x] `skills/architecture/` 下只有 `SKILL.md`
- [x] 正文是「问清楚 / 构图 / 出图 / 常见画坏法」四步，没有「前置条件：先读」那一句
- [x] 正文没有代码块（`text` 块除外）、没有 `render_diagram` / `compute_layout`、没有 sugar 字段名、没有几何数字
- [x] recipe 里每一段都有去处：自然语言在 `SKILL.md`，机制在 `steps` 某份组件参考里（PR 描述里附逐段去处表）
- [x] 起一个只读 `skills/` 的子代理，照这个入口 skill 画：gallery 里「Web app architecture」那张分层架构。Layer A 无 warning，Layer B 五条全 PASS；PNG 作为交付证据，跟 `docs/gallery/` 同类型的图放一起比，构图不比它差
- [x] 子代理的过程里，它是在构图、出图两步才读 `steps` 的对应节，不是开场整份读
- [x] `npm test` 全绿
- [x] 人验反馈（2026-10-28）：「模块之间的连线，没有从矩形的中点到中点」——连线要从模块中点出、进模块中点，不为了拉直去偏移出入点；上下对不齐时让直角折线自己拐（gallery 原图那种带圆角的 Z 形），并改掉步骤 skill 里「用 fromT/toT 补齐拉直」的写法
- [x] 人验反馈（2026-10-28）：「这一层的名称外围感觉不需要矩形」——层名只画文字，不画外框
- [x] review 第 1 轮 E3（2026-10-28）：连线参考「扇出到一个外框里」的说法与实际一致：连线穿过包住它端点的那层外壳不报 ARROW_CROSSES_SHAPE（照实际渲染核对后写），跟前一句「只要线没有穿过别的框，Layer A 不会报」读起来不矛盾
- [x] review 第 1 轮 S1（2026-10-28）：用户把层和服务说全了就不问，也不去读提问规则；没交代同步异步、计划中的调用一律画实线；第 1 步末尾「异步与计划中的服务没说就问」改成只在本来就要提问时顺带问——人的批示「S1 选 A」

## 选中的存量回归
- 无（只改 skill 文字；渲染测试不受影响）
