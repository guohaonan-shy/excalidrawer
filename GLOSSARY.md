# excalidrawer

excalidrawer 用代码生成手绘风格的 Excalidraw 图。这份术语表收它的布局与组件概念。

## 术语

### 组件层

**stack**：
沿一个方向排一组子格的组件，子格尺寸由内容量出，容器尺寸由子格撑出。
_Avoid_: pack, row, column（只说排列方向时用 dir，不用它们当组件名）

**panel**：
一个标题 slot 加一组子格的容器组件，标题在上方或左侧一列，子格由 stack 排。
_Avoid_: card（recipe 里另指单个小格子）, section, band, shell

**axis**：
一条带 mark 的轴线组件，管 mark 的位置、数值到坐标的换算和 mark 两侧留缺口的分段线。
_Avoid_: segmented axis, timeline line

**legend**：
一块「样本 + 文字」行组成的图例组件，管每行的位置和整块的摆放，样本画成什么由 recipe 定。
_Avoid_: key, color key

**slot**：
组件结果里的一块空位，只有位置和尺寸，往里画什么由调用方定；legend 的 sample、label 和 panel 的 title、body 都是 slot。
_Avoid_: 区域, zone, area, 槽

**mark**：
标记点，调用方给出的轴上一个位置，比如一个里程碑或一根柱子所在处。
_Avoid_: dot, milestone（里程碑是图的内容，不是轴上的点）, point

**tick**：
刻度，axis 按间隔自动生成的轴上位置，跟调用方给出的 mark 是两样东西。
_Avoid_: scale（scale 指数值到坐标的换算）

**overflow**：
超出量，组件给定的长度装不下内容时撑出的像素数，按轴分为 overflow 和 crossOverflow。
_Avoid_: 越界, 溢出

### Skill

**入口 skill**：
用户直接调用的 skill，一种图一个，用自然语言写这种图要问什么、长什么样、常见画坏法。
_Avoid_: 类型 skill, recipe, per-type skill

**步骤 skill**：
入口 skill 走到某一步时调用的 skill，管这一步怎么做，比如出图、组件怎么用。
_Avoid_: 共享 skill, shared base, lower layer, 底层

## 歧义词

- **card**：recipe 里既指单个小格子（comparison 的行卡、timeline 的里程碑卡），也曾被用来指装子格的容器。装子格的容器一律叫 panel，card 只指小格子。
- **label / title / body**：在组件输入里是一段文字，在 legend、panel 的结果里是放这段文字的 slot。单独说时要讲明是文字还是 slot，说「label 文字」或「label slot」。
- **overflow**：既指组件返回的超出量，也被用来说 linter 的文字溢出警告。说「超出量」指组件返回的数字，说「文字溢出」指 linter 警告。
