# 05 — high-level 全景：architecture 的第四种布局

**Blocked by**：01 — 登记三个新入口 skill 的名字
**设计冻结**：不涉及 UI

## 要建什么

用户说「画个数据栈全景」，由现有的 architecture 入口 skill 接住，选一种新的「左到右的数据全景」布局，画出数据从哪来、经过哪几段、到哪去的端到端一张图，比如「数据源 → 采集 → 存储 → 计算 → 消费」。不新建入口 skill，输出文件名仍是 `architecture-<名字>`。

architecture 现在有三种布局（经典分层、分层加子分组、自由拓扑），讲的都是「谁调用谁」：层上下叠、层里服务横排、服务之间画调用。全景讲的是「数据往哪流」，在 architecture 入口 skill 里加成第四种：

- 构图：每段一个 panel，从左到右排成一行，段名在 panel 顶上；段里的系统竖排成一列。段与段之间一条粗箭头，不画段内系统之间的连线。贯穿所有段的能力（治理、监控、权限）画成整排下方的一条横带，宽度等于整排。用到的组件跟另外三种一样：panel、stack、连线。
- 问清楚多一问：要讲的是调用关系（分层），还是数据流向（全景）；用户的话已经说明的不问。全景的内容（有哪几段、每段里有哪些系统、有没有贯穿的横带）说全了就不问。
- 常见画坏法补上全景的：段高参差、段间箭头压到 panel、横带和整排不等宽、在段内画了系统之间的连线。
- frontmatter 的触发词补上「数据全景」「data stack」「high-level」这几个说法（已有「数据中台 / data platforms」）。

只有这张工单改 architecture 入口 skill，不碰别的共享文件（README 图库脚本只加一行调用，README 加一格，CHANGELOG 加一条）。

示例：一个新的 high-level figures 模块出一张全景，README *What it makes* 加一格。

## 验收标准

- [x] architecture 入口 skill 的构图列出第四种布局，写清它讲什么、什么时候选它、各组件在这里画出什么效果
- [x] 问清楚一步多了「调用关系还是数据流向」这一问，并写明什么情况下不问
- [x] architecture 入口 skill 仍通过入口 skill 约定测试
- [x] 示例全景含 5 段、一条贯穿横带，Layer A 零警告；图库脚本连跑两次 PNG 字节一致；重跑后别的图的 PNG 没变
- [x] 照一个真实请求（「画个数据栈全景」）用 architecture 入口 skill 画一张，选到全景布局，Layer A、Layer B 都过，PR 里附图
- [x] CHANGELOG 只在 Unreleased 下记一条
- [x] 不改 #12 的 issue 状态

## 选中的存量回归

- `tests/skills-entry.test.mjs`：architecture 入口 skill 变长，正文约定不能破。
