# Design note: evaluating recipes across agents and models

**Status:** thinking out loud. Nothing here is scheduled. Written 2026-08-13.

## Why this needs to exist

The npm package is deterministic: same sugar in, same bytes out. **The skills
are not.** A recipe is prose executed by whatever model is driving, so the
output quality is a function of (recipe × model × host). Today we have no way
to answer basic questions:

- Does a smaller model still call `equalize` before building a row, or does it
  hardcode heights and ship a ragged diagram?
- Does it pick the right body form (row cards vs single panel) from the choice
  rule, or default to whatever appeared first in the recipe?
- Does it actually re-render until Layer A warnings are gone, or report the
  paths and stop?
- When a recipe grows a new rule, does adherence to the *old* rules drop?

That last one is the real reason to build this. Every rule added to a recipe
competes for the model's attention with the rules already there. Without
measurement, recipe growth is unfalsifiable.

## What already exists (most of a harness)

1. **A deterministic scorer.** `validate()` returns `{code, ids, message}` per
   defect. A run that ends with non-empty `warnings` failed Layer A — no
   judgement needed, no vision needed.
2. **Fixtures with known-good targets.** `examples/comparison-figures.mjs`
   builds three comparison figures in code — the reference output the recipe is
   supposed to produce. Each exercises a different rule:
   - `comparison-coverage` — row cards; paired dimensions must share y and h
   - `comparison-subscores` — single panel; per-side lists must *not* be boxed
     into rows (the choice rule)
   - `comparison-pricing` — Layout C; fan-out arrows must anchor to the shell,
     and a footer row must stay level across an asymmetric split
3. **A two-layer gate already written down** — `skills/shared/SKILL.md` §7.5.
   Layer A is machine-checkable; Layer B is a visual rubric.

## The part worth building: structural assertions

The insight that makes this cheap: **most of what a recipe asserts is checkable
from the `.excalidraw` JSON, without vision and without a judge model.**

The output is plain JSON with `x / y / width / height / type / text`. So:

```text
row alignment    for each pair of cards in a row: same y, same height
column symmetry  both sides' shells: same width
gutter           no element intersects the VS gutter band
containment      every inner card sits fully inside its shell
palette          at most 2 color families + ink
overflow         validate() warnings == []
```

Every one of those is a `for` loop over an array. A benchmark built on them
gives a **hard score** per run, and the fuzzy visual rubric is only needed for
what's left (does it look balanced? is the copy sensible?).

## Sketch of the harness

```text
fixtures/            one prompt per case + the structural assertions it must satisfy
runners/             per-agent adapters (Claude Code, Codex, Cursor, bare API + MCP)
score.mjs            run → .excalidraw → assertions + validate() → per-case pass/fail
report.md            model × case matrix, plus iterations-to-clean
```

Metrics worth recording per run, beyond pass/fail:

- **iterations to clean** — how many render calls before `warnings` is empty.
  A model that gets there in three tries is meaningfully worse than one that
  gets there in one, even though both "pass".
- **rule adherence** — did it call `compute_layout equalize` at all? (Visible in
  the transcript; a cheap proxy for "followed the recipe" vs "got lucky".)
- **choice-rule accuracy** — on the subscores fixture, boxing the per-side lists
  into row cards is the interesting failure: the diagram lints clean and looks
  fine, but asserts a correspondence that doesn't exist. This is the case that
  separates "follows instructions" from "understood the model".
- **regression on recipe growth** — re-run the whole matrix when a recipe
  changes, not just the case the change targeted.

## Open questions

- Where does the prompt come from? A fixed natural-language brief per fixture
  ("compare X and Y on coverage / pricing / scoring") keeps it honest, but the
  clarify step (`AskUserQuestion`) means a run isn't fully autonomous. Options:
  pre-answer the clarify questions in the prompt, or add a non-interactive mode.
- Do we score the *diagram* or the *transcript*? Both matter — a model can
  produce a clean diagram while ignoring the recipe (and will then fail on the
  next, harder case).
- Is Layer B model-judged (fast, noisy, circular if the judge is the same model)
  or human-spot-checked (slow, trustworthy)? Probably: structural assertions in
  CI, human review on a sample.
- Cross-host, not just cross-model: the same model in Claude Code vs Codex vs
  Cursor sees different tool affordances and a different prompt envelope. The
  matrix likely needs both axes.
