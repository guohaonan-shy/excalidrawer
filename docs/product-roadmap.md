# excalidrawer — Product & GTM Roadmap

> Status: living document. Companion to [`roadmap.md`](./roadmap.md) (the
> engineering/versioning roadmap). This one covers **audiences, the marketing
> funnel, the product (open-excalidraw), and monetization**.
> Last updated: 2026-07.

## 1. Two audiences (the core framing)

excalidrawer serves two distinct users, and the split decides both the product
shape and where money can come from.

| | **Developers** | **Non-developers** |
|---|---|---|
| Surface | plugin + MCP + CLI (exists) | desktop / local-web **canvas** with hot-reload (to build) |
| Interaction | "draw the auth flow" inside Claude Code / Codex | launch an app, tune on a canvas, agent runs in the background |
| Status | ✅ shipped, OSS, free | 🔲 not built — this is *open-excalidraw* |
| Role | **adoption + credibility engine** | **free platform canvas** (BYOK) |

Both the developer surface **and** the non-developer canvas stay free and open
(OSS · BYOK · Sponsor) — distribution + credibility + the shared engine.
**Revenue comes from a closed-source paid layer on top** (context→diagram + a
curated template library; see §3), *not* from the tool or the canvas. Non-devs
matter as the audience that paid layer ultimately serves.

**Division of labor (unchanged thesis):** the agent does bulk generation; the
human does fine detail tuning on a canvas. Big/structural work → AI. Small
tweaks (centering, font, spacing) → by hand, which is easier than re-prompting.

## 2. The funnel

```
        Landing page                 ← conversion hub / front door
             ▲
   gallery + blog/Twitter/docs       ← traffic + show-don't-tell (hand-drawn style = the hook)
             ▼
   open-excalidraw (canvas + chat)   ← FREE platform · BYOK · editing surface + funnel
             ▼
   context→diagram + templates       ← the PAID core (closed-source): drop a PDF/video → a clean diagram
```

These are not three parallel choices — they are one funnel. Build the minimum
connected slice, not each piece in isolation.

## 3. Monetization thesis

**The constraint:** the agent runs locally with the user's own key/subscription
(BYOK). You cannot mark up inference. So every credible revenue line monetizes
something *other than tokens*.

### What the field actually does (researched July 2026)

| Project | Model | Monetization | Lesson |
|---|---|---|---|
| **opencode** (anomalyco, MIT) | OSS CLI agent, BYOK free | **Managed inference gateway** (Zen, per-token) + subs (Go $10/mo, Black ~$200/mo). Reported multi-$M ARR in months. | The one inference-adjacent thing BYOK users pay for = curation + one bill + zero config. |
| **openpencil** (ZSeven-W, MIT) | OSS AI vector tool, MCP edits a live canvas, BYOK | **None** (GitHub Sponsors only). | The closest architectural twin — and the default fate: no hosted layer → no revenue. |
| **OpenDesign** (nexu-io, Apache-2.0) | Free desktop, local agent via BYOK | **Managed gateway only** (Open Design Cloud). Thin. | Same gateway idea as opencode, but monetized thinly. |
| **Excalidraw+** | Free OSS canvas | **Hosted collab/sync/sharing**, ~$6–8/user/mo | The canonical "free tool, sell the hosted multiplayer layer." |
| **Obsidian** | Free local app | **Sync $4/mo, Publish $8/mo** | Charge for the network service (sync, publish) that needs a server. |

### Decision (2026-07, final): open-core — the paid layer is *context→diagram + a curated template library*

Keep the deliverable in our domain (diagrams) and put the paid value in the two
genuinely hard things, as a **closed-source** layer over the open engine.

**Key synthesis — templates are the reliability layer for context→diagram.**
Free-form "read a PDF and improvise a diagram" is unreliable; "context → map onto
a curated template → fill it" constrains the output space so quality is stable.
The paid core is ONE thing: **the orchestration that maps unstructured context
onto a curated template library and produces a high-quality diagram.**

**Open-core boundary (keep this line clean or the halves cannibalize):**

| | Open (free · BYOK · Sponsor) | Closed (paid) |
|---|---|---|
| What | engine (render/primitives/CLI/MCP) + open-excalidraw canvas+chat + basic recipes | context→diagram orchestration + curated template library + PDF/video/Notion ingestion |
| One-liner | "you tell it what to draw, it draws" | "you drop raw material, it decides what to draw + draws it well with curated templates" |
| Role | adoption, credibility, the editing surface | the paid moat |

**The moat is the template library + output quality + ingestion depth — NOT the
prompts** (they leak/replicate). Treat the large, curated, tested, styled
**template library as the core defensible asset**. Hand-drawn style is one style
knob, not the identity.

**Contested space — the edge must stack up.** Competitors: Napkin.ai, Eraser AI,
Whimsical AI, Mermaid, Excalidraw's own text-to-diagram, native ChatGPT/Claude.
Our edge holds only if we combine: ① real editable `.excalidraw` output (not a
locked image) ② hand-drawn aesthetic ③ deeper context ingestion (video/PDF/Notion,
beyond a one-line prompt) ④ curated templates ⑤ the canvas+chat tuning loop.
Without ③ and ④ we're just another text→diagram tool.

**Lead with the highest-pain context source** — PDF (design docs/specs) or video
(recorded meetings/lectures): sharpest pain, highest differentiation. markdown /
Notion ingest easily but differentiate little. Recommend launching on PDF or video.

**Distribution:** the closed orchestration ships as a hosted service or licensed
app, not an OSS npm/skill. Open stays "tell it what to draw" (recipes drive
adoption); closed is "drop raw context, it decides."

### Paths considered & rejected

| Path | Why not (for us) |
|---|---|
| **Managed inference gateway** (opencode Zen / OpenDesign Cloud) | Wrong audience + scale; thin reseller margin. Only works at opencode-scale. |
| **Hosted collaboration / sync** (Excalidraw+ model) | Not our strength; heavy infra; competes with Excalidraw+ on its home turf. |
| **A blog / Twitter content tool** (deliverable = the post) | Can't beat Typefully/Jasper/etc.; diagrams-as-hero too thin. They stay **marketing + free feeders**; a blog/markdown becomes a future **context source**, not the product. |
| **Sponsorware / template marketplace** | Sponsors: near-zero median ceiling. Marketplace: needs scale we won't have early. |

**Execution discipline — the one rule:** take ONE paid thing (one context source)
to real users/revenue before building the next.

### Scenarios = free feeders + marketing (NOT the paid product)

| Scenario | Role |
|---|---|
| **Obsidian plugin** | free adoption feeder (big reach into local-first users) |
| **Notion connector** | free feeder; also a later paid **context source** |
| **blog / Twitter** | marketing channels (show-don't-tell); blog/markdown is a later **context source** |

**Feeders (free, 引流):** open-excalidraw canvas+chat + Notion + Obsidian + the OSS
core — build audience and funnel into the paid tool.

## 4. Phased roadmap

Each phase lists tasks with a rough size and dependency. Phase 0 is cheap and
unlocks everything; the paid layer (Phase 3) is gated on product + demand.

> **Active now (2026-07):** ① **open-excalidraw (canvas + chat, BYOK)** — primary.
> ② **gallery + landing page** — in parallel. ③ **Paid product form (Phase 3)** —
> ⏸ deferred, needs market research before committing to a shape.

### Phase 0 — Foundation & shopfront (cheap, now)
- ✅ **Quality gate** — deterministic lint + visual self-check (shipped 0.5.11 /
  0.5.12). Output is now reliably good enough to show off.
- 🔲 **Gallery assets** — a curated set of excellent example diagrams (all four
  types + the hand-drawn style shown off). Raw material for the landing page AND
  blog. _Size: S._
- 🔲 **Landing page** — gallery-first, minimal, static (GitHub Pages / Vercel).
  Positioning: agent-native · code-first · no browser. One install CTA + a
  Sponsor button. _Size: S–M. Depends on: gallery._

### Phase 1 — Content marketing / demand (ongoing, cheap)
- 🔲 **Desensitized blog+diagram cookbook** — extract the generic
  "blog skill + excalidrawer" workflow into a repo example (strip product
  internals). _Size: S._
- 🔲 **Publish 1–2 real posts** that embed the SVGs — show-don't-tell; each post
  is both SEO content and a live demo. Notion stays a soft example, not an
  integration. _Size: M, recurring._

### Phase 2 — open-excalidraw = canvas + chat (the atomic unit) [FREE · BYOK · Sponsor]
Keep it deliberately SMALL — it's platform investment that pays back by being
*reused by the studio*, not by earning on its own. Sponsor won't fund it.
- 🔲 **Canvas** — embed `@excalidraw/excalidraw` (MIT) as a **component inside our
  own shell** (prefer this over hard-forking the whole app — embedding keeps
  upstream updates free; only fork if we must change canvas internals). _Size: M._
- 🔲 **Chat / 对话 panel** — a conversational sidebar (BYOK to the user's local
  agent) that generates and edits the visual on the canvas. This is the
  "generate + tune ONE visual conversationally" atomic unit. _Size: M._
- 🔲 **`serve` + file loop** — local server, **file-watch hot-reload** when the
  agent rewrites the file, **save-back** to disk. **One-way** (AI generates →
  human tunes), no bidirectional merge. Reuses `validate()`. _Size: S–M._
- 🔲 **(Later) Desktop packaging** — wrap as a native app (Tauri > Electron for
  size) for non-devs who want a real app. _Size: M._

### Phase 3 — PAID: context→diagram + curated templates (closed-source) [the revenue bet]
Closed-source orchestration over the open engine; ships as a hosted service or
licensed app. Reuses the Phase 2 canvas+chat as the tuning surface. **Launch on
ONE high-pain context source** (recommend PDF or video) before adding others.
- 🔲 **Validate cheaply first** — hand-deliver the outcome ("drop this PDF/recording
  → get a clean architecture diagram") to a handful of ICP users, confirm someone
  pays *before* building. _Size: S._
- 🔲 **Curated template library** — the core defensible asset: a large, tested,
  styled set of diagram templates the orchestration maps context onto. _Size: L, ongoing._
- 🔲 **Context ingestion (one source first)** — PDF or video → structure →
  template selection → diagram. The hard engineering + orchestration core.
  _Size: L. Gated on validation._
- 🔲 **Pricing** — simple monthly sub; BYOK or a small included quota so inference
  cost is neutralized. You sell the orchestration + template library, not tokens.
- 🔲 **Add context sources** — markdown / Notion / more, reusing the same core
  once the first source has paying users. _Size: M each._

### Phase 4 — Free feeders + replicate
- 🔲 **Obsidian plugin / Notion connector** as FREE adoption feeders into the
  funnel (audience overlaps open-excalidraw). Not revenue — reach. _Size: M each._
- 🔲 **Add the second context source** to the paid tool only after the first has
  paying users. Team/enterprise (SSO, admin) is a much-later option, not a
  near-term motion.

## 5. Open decisions (need input)

- **Naming of the non-dev product.** "Open Excalidraw" collides with the
  Excalidraw brand (SEO competition with the incumbent, upstream goodwill risk).
  Prefer an excalidrawer-brand name: `excalidrawer studio` / `serve` / `canvas`.
- **Desktop vs local-web first.** Recommendation: local-web (`serve`) first
  (cheaper, same core), package as desktop (Tauri) later.
- **Excalidraw: embed vs hard-fork.** ✅ Lean embed `@excalidraw/excalidraw` as a
  component inside our own shell (chat panel lives in the shell); hard-fork only
  if we must modify canvas internals — forking incurs an upstream-sync debt.
- **Architecture fork.** open-excalidraw's canvas is a *stateful* surface, which
  the engine roadmap deliberately kept out ("stateless one-shot"). The one-way
  `serve` model keeps state in the **file + editor**, not in the MCP tool
  surface — so the package stays stateless. Do NOT adopt the open-pencil "~30
  CRUD tools on a live scene graph" model unless we consciously reverse that.
- **Which context source launches the paid tool.** Recommend PDF or video
  (sharpest pain, highest differentiation); markdown / Notion later.
- **Monetization sequencing.** ✅ Decided (2026-07): open-core. Engine + canvas +
  feeders = OSS/BYOK/Sponsor; revenue = a **closed-source** context→diagram +
  curated-template tool, one context source at a time. No managed gateway.

## 6. Parallelizable workstreams

Early tasks are largely independent and can be worked concurrently:
- **A. Gallery generation** (Phase 0) — independent.
- **B. Landing page scaffold** (Phase 0) — can start in parallel; wires in
  gallery assets when ready.
- **C. Blog cookbook + first post** (Phase 1) — independent of A/B.
- **D. `serve` spike** (Phase 2) — independent prototype; validates the
  hot-reload loop before committing to the full MVP.

Serial dependencies begin at Phase 3 (the paid tool needs the product +
validated demand).
