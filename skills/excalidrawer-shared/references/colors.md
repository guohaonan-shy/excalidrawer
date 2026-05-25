# Colors

Excalidrawer 7 色 palette，全部为手绘风浅色填充：

| 关键字 | 用途倾向 |
|---|---|
| `yellow` | 起点 / 主体对象 / 用户侧 |
| `blue` | 主线流程 / 服务层 |
| `green` | 成功 / 终态 / 数据存储 |
| `purple` | 外部依赖 / 第三方 |
| `red` | 错误 / 异常 / 警示 |
| `orange` | 判断节点 / 决策点 / 中间状态 |
| `gray` | 基础设施 / 辅助元素 |

## 配色建议

- **同色聚类**：同一语义层用同一颜色（如 architecture 一整层都是 `blue`）
- **决策节点固定 `orange`**：flowchart 里 decision 类型默认 orange，跟流程主色形成对比
- **终态用 `green`**：sequence 最后一步、flowchart 的 end、timeline 的最终里程碑
- **不要超过 4 色**：单图 4 色以内可读性最好；超过会显得花

## 默认颜色循环（不指定时）

按顺序：`yellow → blue → green → purple → red → orange`，跳过 `gray`（gray 仅显式指定时使用）。

timeline 的 items、sequence 的 actors、architecture 的 sections 默认都按这个顺序循环上色。

## 颜色覆盖

任何模版的 schema 都支持在节点级 `color` 字段覆盖默认。例如 flowchart 里把"失败终点"染红：

```json
{ "id": "fail", "label": "Submission Failed", "type": "end", "color": "red" }
```

## 直接传十六进制

模版也接受 `#rrggbb` 字符串（如 `"color": "#a5d8ff"`），但失去 palette 一致性。一般情况下用关键字即可。
