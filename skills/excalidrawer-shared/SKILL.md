---
name: excalidrawer-shared
description: Shared reference pack for the excalidrawer diagram skills (flowchart / timeline / architecture / sequence). Not invoked directly — the four diagram skills read its references/ files (conventions, sugar schema, color palette). If a user asks to draw a diagram, use the matching diagram skill instead.
---

# excalidrawer-shared

Shared knowledge for the four excalidrawer diagram skills. **Do not invoke this
skill on its own** — it holds reference material the diagram skills load.

The sibling skills (`flowchart`, `timeline`, `architecture`, `sequence`) link
into the files here with relative paths like `../excalidrawer-shared/references/sugar.md`,
so this folder must install alongside them under the same `skills/` directory.

## References

- `references/conventions.md` — cross-skill rules: clarify-before-drawing,
  gstack-style output naming, MCP-first / CLI fallback, output language,
  skill routing, output-format selection, iteration.
- `references/sugar.md` — the sugar shorthand schema accepted by the
  `render_diagram` / `compute_layout` MCP tools (shapes, arrow levels L1–L4,
  auto-routing rules, geometry helpers).
- `references/colors.md` — the 7-color hand-drawn palette and usage guidance.

## Prerequisite for the diagram skills

The diagram skills call the `excalidrawer-mcp` MCP server's
`mcp__excalidrawer__render_diagram` and `mcp__excalidrawer__compute_layout`
tools. Installing skills via `npx skills add` does **not** configure that
server — add it once:

```bash
npm install -g excalidrawer
claude mcp add excalidrawer -- excalidrawer-mcp
```

If the MCP tools are unavailable, the skills fall back to the `excalidrawer`
CLI (see `references/conventions.md` §3).
