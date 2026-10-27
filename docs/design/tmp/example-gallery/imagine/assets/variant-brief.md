# Brief: one visual-language direction for the excalidrawer example gallery

You are one of several designers working INDEPENDENTLY. Each gets a different random seed. Produce ONE visual language (palette, type, shape, tone) and render it as a specimen fragment. Do not try to be "balanced" or "safe" — commit to a distinct direction. Do not look at other files in assets/variants/ (other designers' work).

## Read first
- Product: /Users/guohaonan/projects/TOEFLAIR-worktree/excalidrawer/issue-25-f2ede6/PRODUCT.md (brand personality, anti-references, WCAG AA)
- Spec (structure is FIXED, do not redesign it): /Users/guohaonan/projects/TOEFLAIR-worktree/excalidrawer/issue-25-f2ede6/docs/spec/example-gallery/example-gallery.md — section 「图库页的结构」
- Look at 2-3 figures in /Users/guohaonan/projects/TOEFLAIR-worktree/excalidrawer/issue-25-f2ede6/docs/design/tmp/example-gallery/imagine/assets/figures/ (real engine output)

## What the page is
A public GitHub Pages single page showing one real engine output per diagram type. The person (project owner) said, verbatim: 「我觉主要是对于设计出来的图表（webp）进行展示，我倾向于字体用我们excalidraw的手写字体，其他的部分我们可以开始imagine」 — i.e. the page is mainly about showing the diagrams; they lean toward using the engine's own handwritten font (Excalifont); everything else is open.

Hard facts / constraints:
- Every figure is an OPAQUE WHITE sheet (the engine paints a white background into both PNG and SVG). Whatever ground you choose, the figure sits on it as a white rectangle. Decide deliberately how the white sheet relates to the page ground (this is a core language decision).
- Figures have very different aspect ratios: flowchart 2520x540 (very wide), architecture 1636x1608 (square), sequence 3940x1948, tree-stories 2238x4898 (very tall). PNGs are at 2x.
- Excalifont must be present prominently (person's preference). How far handwriting extends (headings only? all UI text? the JSON input?) is YOUR call — say why. The Input block is JSON code; it must stay readable.
- Brand: hand-drawn, honest (real output only), restrained (no marketing adjectives, short sentences, ONE accent color, used only for actions), engineering (reproducible, editable files).
- Anti-references: must NOT look like Excalidraw the app or its forks (no floating "island" toolbars, no Excalidraw purple #6965db UI); must NOT look like a generic AI product page (gradients, glow, big slogans).
- WCAG AA: every text/background pair >= 4.5:1. Measure and report the ratios for your role pairs (ground/body text, ground/accent, text on accent).
- Page copy is English.

## Your random seed
SEED_HERE

Use the seed to push yourself off your defaults. Derive something concrete from the characters (e.g. map bytes to a hue or temperature, letters to a place / era / material / printed artifact / profession whose visual culture you then borrow). State in one line how you derived your direction from the seed. Fold that derived reference into the brief above — the result must still serve this product.

## Deliverable: one HTML fragment file
Write: /Users/guohaonan/projects/TOEFLAIR-worktree/excalidrawer/issue-25-f2ede6/docs/design/tmp/example-gallery/imagine/assets/variants/<slug>.html
(<slug> = a short lowercase English name for your direction, 1-2 words, hyphenated, e.g. "blueprint". Pick something evocative of YOUR direction.)

Contract (the board shell inlines your file verbatim into a larger page; break it and your variant won't render):
- No <html>/<head>/<body>. Root element: `<section class="v-<slug>" data-variant="<slug>">…</section>`, followed by one `<style>` and optionally one `<script>`.
- EVERY CSS selector must be prefixed with `.v-<slug>` (including keyframe names: prefix them `<slug>-`). No global selectors, no :root, no body/html rules. Define your tokens as custom properties on `.v-<slug>`.
- The shell already declares @font-face for font-family 'Excalifont' (assets/fonts/Excalifont-Regular.woff2) and 'Virgil' (assets/fonts/Virgil.woff2). Other fonts: only Google Fonts via `@import url(https://fonts.googleapis.com/...)` as the FIRST line of your <style>, or system fonts.
- Asset paths are relative to the board page: `assets/figures/flowchart.png` etc.
- Script: wrap in an IIFE, find your root with `document.querySelector('[data-variant="<slug>"]')`, touch nothing outside it.
- The shell sets `data-state` on your root to one of: `default`, `input-open`, `load-error`. Style all three:
  - default: header + tabs + Flowchart tab active, its figure block with Input collapsed.
  - input-open: same, with the Input disclosure expanded.
  - load-error: gallery.json failed to load — show the page's honest error message (in your tone) with a link to the GitHub repo, in place of tabs+figures.
- The shell toggles class `reduce-motion` on <html>. If you animate, under `html.reduce-motion .v-<slug> …` the animation must be removed but state changes must still be clearly visible.
- Width: the board column is ~800px wide (and must also not break at 375px). Your fragment fills that width. Keep total height reasonable (aim under ~1700px in default state).

What the fragment contains, top to bottom:
1. **Language sheet** (compact, ~350-500px tall): palette swatches with role name + hex + measured contrast ratios; a type specimen (each face you use, with its role and sizes); 3-4 shape samples (tab, button/link, card edge, divider — your shapes); a two-line tone sample (how this direction writes a page subtitle and a download link label).
2. **Gallery slice** — a working miniature of the real page in your language:
   - Page header: "excalidrawer", a one-line positioning sentence (write it in your tone; plain, no adjectives), links "GitHub" (https://github.com/guohaonan-shy/excalidrawer) and "npm" (https://www.npmjs.com/package/excalidrawer).
   - Type tabs, in this order: Flowchart, Architecture, Sequence, Timeline, Comparison, Tree. Tabs must WORK (click switches the figure block; keyboard: arrow keys move between tabs, role="tablist"/"tab"/"tabpanel", aria-selected). Tree has 3 figures stacked.
   - Figure block per figure: the image (alt = name + description), the name and one-line description, an "Input" disclosure (use <details>/<summary> or a button with aria-expanded) whose body shows the source label and the JSON, and three download links: .excalidraw, SVG, PNG (href="#" is fine).
   - Figures (slug / name / description / source label):
     flowchart / Flowchart / Decisions + branches / template: flowchart
     architecture / Architecture / Layered components + connections / template: architecture
     sequence / Sequence / Messages between actors over time / sugar (sequence recipe)
     timeline / Timeline / Milestones on an axis / template: timeline
     comparison / Comparison / A vs B, dimension by dimension / sugar (comparison recipe)
     tree-right / Tree · left → right / Parent → children, split sideways / template: tree
     tree-down / Tree · top → down / Parent → children, split downward / template: tree
     tree-stories / Tree · user-story map / 23 numbered stories in 6 groups / template: tree
   - The Input JSON to show for flowchart (real, use verbatim, pretty-printed): {"title":"Pull request to production","direction":"horizontal","nodes":[{"id":"open","label":"PR opened","type":"start"},{"id":"ci","label":"CI + review"},{"id":"ok","label":"Approved?","type":"decision"},{"id":"merge","label":"Merge to main"},{"id":"fix","label":"Request changes","color":"red"},{"id":"ship","label":"Deploy","type":"end"}],"edges":[{"from":"open","to":"ci"},{"from":"ci","to":"ok"},{"from":"ok","to":"merge","label":"yes"},{"from":"ok","to":"fix","label":"no"},{"from":"merge","to":"ship"}]}
     For the other figures, a short truncated-but-real-looking JSON is fine (e.g. timeline: {"title":"2026 product roadmap","items":[{"label":"Beta","time":"Q1","desc":"Invite-only, 200 teams"},{"label":"Public launch","time":"Q2","desc":"Self-serve signup"},…]}); keep it honest — mark truncation with "…".
   - Tall figures (tree-stories) must not blow the page up: decide how they are capped/scrolled/framed and make it visible.
   - Clicking the image: just make it a link to the PNG (target _blank) — that's the "view full size" behavior.

Fidelity: enough to tell your language apart from others — not polished production. But the gallery slice must work and use the real figures.

## Self-check before you finish
Render your fragment headless (e.g. write a tiny wrapper HTML in your own scratch dir under /private/tmp/claude-501/ that @font-face-loads ../assets/fonts and includes your fragment; or simply load http://127.0.0.1:4525/assets/variants/<slug>.html won't have fonts — better make a wrapper next to it named _preview-<slug>.html in assets/variants/ which you DELETE afterwards). Use Playwright via `npx playwright` or the node `playwright` package if available, otherwise skip with a note. Check: all 3 states render, no layout overflow at 800px and 375px.

## Report back (final message, concise, English)
- slug and file path
- the seed → reference derivation (one line)
- the bet in one sentence (what this direction wagers the page should feel like)
- palette: role / hex / contrast ratios
- fonts: face → role
- how the white figure sheet sits on the ground
- how far handwriting extends and why
- anything you couldn't do
