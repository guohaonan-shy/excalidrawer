# Design note: agent-runtime ecosystem integration

**Status:** thinking out loud. Nothing here is scheduled. Written 2026-08-17.

## Current state

Skills target Claude Code and Codex, installed either as the bundled plugin
(`.claude-plugin/`, `.codex-plugin/`) or à la carte per skill via
`npx skills add` (skills.sh channel) — see the repo scope note in
[`CLAUDE.md`](../CLAUDE.md).

## Direction

Package the same skills/recipes for other agent runtimes — **Pi, DeepSeek,
Hermes** — so diagram generation isn't limited to the Claude/Codex ecosystem.

diagram-design already does something like this: `.claude-plugin/`,
`.codex-plugin/`, and a separate `prompts/` folder for Pi, all pointing at
the same underlying skill content. That's a reasonable model to follow —
one shared skill/recipe source, one manifest per runtime.

## Open questions

- What does each target runtime's skill/tool-plugin format actually look
  like? Unresearched — Pi, DeepSeek, and Hermes each likely have their own
  manifest shape.
- Prerequisite either way: keep the MCP server (`render_diagram` /
  `compute_layout`) as the single source of truth for the two tools, so
  adding a runtime is "new manifest + skill text," not new engine code.
- Does this stay in this repo, or is it a separate per-runtime package like
  the harold-skills split noted in [`CLAUDE.md`](../CLAUDE.md)?
