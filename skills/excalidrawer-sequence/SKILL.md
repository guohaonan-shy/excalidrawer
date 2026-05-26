---
name: excalidrawer-sequence
description: Generate a hand-drawn-style Excalidraw sequence diagram from code and export to .excalidraw / SVG / PNG — no browser. For sequence diagrams, multi-actor interactions, API call order, handshakes, OAuth / auth flows, request-response chains. Triggers on draw a sequence diagram / interaction flow / call order / handshake. Flow detect → clarify actors & messages & return-style → read references/sequence.md → compose sugar → render_diagram. 中文触发词：时序图 / 序列图 / 多角色交互 / API 调用顺序 / 握手 / OAuth 流程 / 请求响应。
allowed-tools: mcp__excalidrawer__render_diagram, mcp__excalidrawer__compute_layout, Bash(npx -y -p excalidrawer*:*), Read, Write(./*.json), AskUserQuestion
---

# excalidrawer sequence

## 前置条件（必做）

先用 Read 工具读取 [`../excalidrawer-shared/SKILL.md`](../excalidrawer-shared/SKILL.md)
——它定义了所有图表类型通用的 MCP 前置检查 / CLI fallback、sugar schema、配色、
文件命名、输出语言、导出格式选择、迭代规则。**缺一不可**，本 skill 只补充时序图专属的
clarify 问题与 layout recipe。

## 1. Clarify（必）

用 **AskUserQuestion** 问 load-bearing 问题，最后一个固定是导出格式（shared §6）。
**用户已粘完整 actor + 步骤时跳过结构性提问。**

1. **参与角色 / 服务** — 自由文本（如 `User / Client / Auth Server`），按交互顺序定排列
2. **核心交互序列** — 自由文本，能粘步骤更好
3. **返回消息样式** — 单选：`按方向：左→右实线、右→左虚线`（默认） / `按语义：请求实线、响应虚线`（UML） / `全实线`

## 2. 读 recipe

`Read references/sequence.md` —— 拿到坐标尺寸、actor row + lifeline 画法、message 箭头、
返回样式三规则、跨 lifeline label 处理。

## 3. 拼 sugar + 渲染

按 recipe 拼 sugar 数组（`chain` 排 actor x 与 step y）。渲染顺序与 render 调用见 shared §2 / §7：
`output: "./sequence-<name>"`，formats 按 clarify。迭代见 recipe 末尾「Common pitfalls」与 shared §8。
