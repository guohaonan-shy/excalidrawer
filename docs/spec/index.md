# spec
> 契约：还没了结的规格，一份一个目录（`<slug>/<slug>.md`，工单在 `<slug>/tickets/`）——做完整个目录删（删前必须先写 ADR）。

| 文件 | summary |
|---|---|
| [[connector-and-gate-fixes]] | 写清绕行 clearance 的量法、Layer B 加孤词一项、箭头标签按实际字宽估 |
| [[example-gallery]] | 公开示例图库：GitHub Pages 单页，每种图一张真实输出，加图只改一处 |
| [[layout-components]] | 加 stack / panel / axis / legend 四个组件，几何由内容推出，不再手算 |
| [[new-diagram-types]] | 0.6.0 加状态机、金字塔/漏斗、柱状/折线、high-level 全景，按图类型并行实现 |
| [[skill-layers]] | 入口 skill 只用自然语言写图，出图和组件用法收进按步骤调用的步骤 skill |
| [[webp-output-format]] | 加 WebP 输出格式，并让 agent 按图的去处选格式 |
