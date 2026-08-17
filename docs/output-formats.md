# Design note: output format selection

**Status:** planned — direction agreed 2026-08-17, not yet scheduled to a
version.

## Current state

`render()` emits `.excalidraw` + `.svg` + `.png` together by default;
`opts.formats` already lets a caller subset that list (see API Reference in
the README). There's no WebP output, and no notion of picking a default
based on where the diagram is going.

## Requested changes

1. **Add WebP** as an output format alongside svg/png/excalidraw.
2. **Scenario-aware default selection** instead of always emitting
   everything — e.g. a diagram destined for a Markdown doc wants `svg`; one
   destined for an HTML page wants `webp`/`png`.

## Candidate mechanisms (not decided, not mutually exclusive)

- **Infer from context** — a `target` hint (`"markdown" | "html" | "slide"`,
  or inferred from the output path's sibling file type) maps to a format
  preset.
- **Ask when ambiguous** — a skill-level `AskUserQuestion` clarify step
  ("where will this be used?") before calling `render_diagram`, for cases
  where the target isn't inferable from context.

Likely both: infer when a signal exists, ask when it doesn't.

## Open question

`toPng` uses `@resvg/resvg-js` (native, no browser). Need to check whether it
(or a small additional dependency) can emit WebP directly, or whether WebP
has to be a re-encode of the PNG buffer.
