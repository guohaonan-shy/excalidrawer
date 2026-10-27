# example-gallery · imagine 轮次记录

板子怎么重建：`node assets/build-board.mjs`（把 `assets/variants/*.html` 片段拼进 `board.html`；变种标签文字在脚本的 `variants` 表里）。给子代理的需求原文：`assets/variant-brief.md`。自检截图：`_selfcheck/`。

## 第 1 轮 · 2026-10-26

**人的原话**：「我觉主要是对于设计出来的图表（webp）进行展示，我倾向于字体用我们excalidraw的手写字体，其他的部分我们可以开始imagine」
**人点名留下**：无（第一轮）

**种子**：PUQ4rKafj+dBr7aT → fieldbook；+fGjVhm78zMwbrcJ → galley；uZoJ9rsqEFQEyQzN → card-catalog；OGwMLqmPRP/gnsUM → meniscus（加限制：底色必须纯白，禁暖纸隐喻和红色 accent）；oD3mFpVMzwCMt+/2 → viewbox（加限制：底色必须深色 L*<20，禁暖纸隐喻、红色 accent 和霓虹开发者风）。后两个是前三个收敛成同一族之后补派的。

**交付原文**：

要看哪里：board.html（全部）；逐个：board.html?variant=meniscus、board.html?variant=viewbox、board.html?variant=fieldbook、board.html?variant=card-catalog、board.html?variant=galley；每个都能加 &state=input-open / &state=load-error
变种：
- meniscus（白底）：赌页面是一张连续的引擎画布。纯白底，跟图同一种白，图不加框、不加阴影，靠左侧一根刻度尺分块；手写只用在名字和标题上，说明文字用 Instrument Sans；accent 是橄榄绿 #4B6A00
- viewbox（暗底）：赌图是暗房里唯一亮着的东西。深石板底 #0F151D，白图夹在灯箱里，所有 UI 都比图暗；人写的话全部手写，机器给的信息（文件名、尺寸）用窄体 sans；accent 是琥珀 #E7B54A
- fieldbook（暖纸 A）：赌页面像工程师的野外记录本。buff 方格纸，白图用四个相角贴上；标题、tab、图名、说明手写，表格标签、文件名、JSON 用等宽；accent 是锈红 #B23A0E
- card-catalog（暖纸 B）：赌页面像图书馆卡片抽屉。马尼拉底，白卡带硬边、背后错开一张卡；手写加打字机字体 Courier Prime；accent 是印章红 #A0281C
- galley（暖纸 C）：赌页面像印刷厂的校样台。灰纸板底，白校样带平移硬阴影和裁切标记；手写铺到所有句子，连下载链接也手写；accent 是胭脂红 #A3122D
- 如实说：A、B、C 是同一族（暖纸底 + 红系 accent + 手写配等宽或打字机），彼此只差处理。真正不同的方向是 3 个：暖纸、白底、暗底。
改了什么：第一轮从零出。所有变种的图都是 assets/figures/ 里引擎真画的 PNG，tab 能切（Tree 下面堆 3 张），Input 能展开，flowchart 的输入 JSON 一字不改用的真数据。
还开着的问题：
1. 白图放在什么底上：这是这一轮真正要定的，三种关系是贴在纸上、化进白页、暗处唯一亮的东西。推荐白底（meniscus）：PRODUCT.md 写了「页面看起来就是引擎画出来的」，白底下页面和图是同一张纸。
2. 手写体铺到哪，可以跟底色分开选。推荐比 meniscus 多铺一档：名字、tab、说明、语气句都手写，按钮、文件名、JSON 不手写。你说过倾向手写体，meniscus 只把手写用在名字上，铺得太少。
3. 每个变种都带了跟自己隐喻有关的小标签（「LEVEL BOOK / SHEET 1」「PROOF 01/08」「mL 刻度」「films clipped」）。推荐选定方向后把这类字样去掉，只留形状：PRODUCT.md 要求「克制」，这些字样是装饰性的文案。
4. 要不要做深色主题。推荐只做一套：引擎出的图永远是白底，深色主题里图会变成一块块白板。选 viewbox 的话，它本身就是深色的唯一一套。
5. 页头那句定位，每个变种各写了一句。推荐等方向定了再统一定这句，这一轮不用比较文案。
要人回的：底色选哪种（白底 meniscus / 暗底 viewbox / 暖纸 A、B、C 里点一个），手写体要铺多宽（只到名字 / 所有句子 / 连链接也手写）；或者告诉我往哪个方向再推一格。
七节进度：能填的有四节。「高度记录」：语言这一档是自动打开的（项目没有 DESIGN.md），从零做，结构由 spec 定了不重开。「结构」：照 spec「图库页的结构」。「约束与素材」：图是不透明白底、Excalifont/Virgil、WCAG AA、PRODUCT.md 的反面参照。「意图」只有草稿：要靠你这次选底色来定。空着的有三节。「变种裁决」：等你选。「待打磨清单」：现在只有我记下的几条（375px 宽时 flowchart 太小、只能点开看大图；除 flowchart 外其他图的输入 JSON 是截断或拼出来的，实现时会换成 gallery.json 里的真数据），你还没提过执行层的意见。「验收矩阵」：缺你两个回答，一是要不要深色主题，二是手机宽度算不算必须覆盖；状态名先定为 default、input-open、load-error，再加一个 tree（多张图堆叠）。
要人判的取舍：
1. 底色：白底、暗底、暖纸三选一。推荐白底，理由同问题 1。暗底的好处是图最突出；代价是整站很重，而且跟 README、npm 上的白底观感断开。
建议调研的问题：极高的图（tree-stories 是 2238×4898）在图库里一般怎么放，框内滚动还是缩略图点开 → 推荐固定高度的框内滚动，旁边一行字写明「可以滚动或点开看全图」（5 个变种都已经这样渲染了）

**生图记录**：没有生图。
