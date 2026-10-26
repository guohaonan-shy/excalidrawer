# excalidrawer

excalidrawer 用代码生成手绘风格的 Excalidraw 图。这份术语表收它的布局与组件概念。

## 术语

### 组件层

**stack**：
沿一个方向排一组子格的组件，子格尺寸由内容量出，容器尺寸由子格撑出。
_Avoid_: pack, row, column（只说排列方向时用 dir，不用它们当组件名）

**panel**：
标题区加一组子格的容器组件，标题在上方或左侧一列，子格由 stack 排。
_Avoid_: card（recipe 里另指单个小格子）, section, band, shell

**axis**：
一条带标记点的轴线组件，管标记点位置、数值到坐标的换算和标记点两侧留缺口的分段线。
_Avoid_: segmented axis, timeline line

**legend**：
一块「样本 + 文字」行组成的图例组件，管每行的位置和整块的摆放，样本画成什么由 recipe 定。
_Avoid_: key, color key

## 歧义词

- **card**：recipe 里既指单个小格子（comparison 的行卡、timeline 的里程碑卡），也曾被用来指装子格的容器。装子格的容器一律叫 panel，card 只指小格子。
