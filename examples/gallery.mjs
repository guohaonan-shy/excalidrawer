/**
 * README gallery — one figure per diagram type, rendered into docs/gallery/.
 *
 * Deterministic (every template seeds itself), so re-running only changes the
 * images when the engine changes. Regenerate before a release:
 *
 *   node examples/gallery.mjs
 *
 * Unlike the other examples, these PNGs are committed (see .gitignore) — the
 * README embeds them.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import {
  flowchart, architecture, timeline, tree, equalize,
  render, excalidraw, toPng, validate, autoRegisterCjkFont,
} from "../src/index.mjs";
import { coverage } from "./comparison-figures.mjs";
import { storiesEn, skills, skillsLR } from "./tree-figures.mjs";

const outDir = new URL("../docs/gallery/", import.meta.url).pathname;
mkdirSync(outDir, { recursive: true });

// Sequence: the browser-cache read/write flow from a real spec (report audio
// prefetch & shared cache). Built from sugar the way the `sequence` skill
// recipe composes it — header row, dashed lifelines, phase bands, one labelled
// message per row — rather than with the built-in template.
function cacheSequence() {
  const actors = [
    ["up", "Upload pipeline", "yellow"],
    ["pl", "Player / report page", "yellow"],
    ["src", "Audio source\n(getAudio)", "blue"],
    ["mem", "Page memory\n(tab JS heap)", "green"],
    ["cache", "Browser cache\n(Cache API, disk)", "green"],
    ["net", "Server / storage", "purple"],
  ];
  // [from, to, label, response?, new in this spec?] — a string is a phase band.
  const rows = [
    "Write — after the server confirms an upload",
    ["up", "net", "1. POST recording + Idempotency-Key"],
    ["net", "up", "2. 200 confirmed (failure: stop, cache untouched)", true],
    ["up", "cache", "3. put(session+question, take audio, key, writtenAt)", false, true],
    "Read — prefetch on report open (5 s budget) and every play click use the same call",
    ["pl", "src", "4. getAudio(logical key, url source)", false, true],
    ["src", "mem", "5. in memory? yes -> return", false, true],
    ["src", "cache", "6. match: not expired + key equal?", false, true],
    ["cache", "src", "7. hit -> compressed audio", true, true],
    ["src", "net", "8. miss -> GET url (in-flight download is shared)", false, true],
    ["net", "src", "9. 403 -> refetch report data, GET new url once", true, true],
    ["src", "mem", "10. store compressed audio", false, true],
    ["src", "cache", "11. put(key, audio, writtenAt)", false, true],
    ["src", "pl", "12. ready -> decode clip, play", true, true],
  ];

  const X0 = 40, COL = 340, W = 230, TOP = 64, FS = 15, MSG_FS = 14, ROW = 52, BAND_H = 40;
  // One height for the whole header row, so two-line names don't leave it ragged.
  const headH = equalize(actors.map(([, label]) => ({ w: W, text: label, fontSize: FS })), { minH: 56 }).h;
  const cx = Object.fromEntries(actors.map(([id], i) => [id, X0 + i * COL + W / 2]));
  const right = X0 + (actors.length - 1) * COL + W;

  const els = [{ shape: "text", at: [X0, 14], size: [right - X0, 36], text: "Report audio — browser cache read / write", fontSize: 24 }];
  let y = TOP + headH + 24;
  const body = [];
  for (const r of rows) {
    if (typeof r === "string") {
      body.push({ shape: "rect", at: [X0, y], size: [right - X0, BAND_H], fill: "gray", text: r, fontSize: MSG_FS });
      y += BAND_H + 24;
      continue;
    }
    const [from, to, label, response, isNew] = r;
    const x1 = cx[from], x2 = cx[to];
    body.push({ shape: "text", at: [Math.min(x1, x2), y], size: [Math.abs(x2 - x1), 18], text: label, fontSize: MSG_FS });
    body.push({
      shape: "arrow", at: [x1, y + 24], points: [[0, 0], [x2 - x1, 0]],
      ...(response ? { dashed: true } : {}), ...(isNew ? { stroke: "red" } : {}),
    });
    y += ROW;
  }
  const bottom = y + 8;

  // Lifelines first, so bands and labels sit on top of them.
  actors.forEach(([id]) => els.push({ shape: "line", at: [cx[id], TOP + headH], points: [[0, 0], [0, bottom - TOP - headH]], strokeStyle: "dashed", stroke: "gray" }));
  actors.forEach(([id, label, fill], i) => els.push({ shape: "rect", id, at: [X0 + i * COL, TOP], size: [W, headH], fill, text: label, fontSize: FS }));
  els.push(...body);
  els.push({ shape: "arrow", at: [X0, bottom + 28], points: [[0, 0], [60, 0]], stroke: "red" });
  els.push({ shape: "text", at: [X0 + 72, bottom + 18], size: [370, 20], text: "red = new in this spec;  dashed = response", fontSize: MSG_FS });
  return els;
}

const figures = {
  flowchart: () => flowchart({
    title: "Pull request to production",
    direction: "horizontal",
    nodes: [
      { id: "open", label: "PR opened", type: "start" },
      { id: "ci", label: "CI + review" },
      { id: "ok", label: "Approved?", type: "decision" },
      { id: "merge", label: "Merge to main" },
      { id: "fix", label: "Request changes", color: "red" },
      { id: "ship", label: "Deploy", type: "end" },
    ],
    edges: [
      { from: "open", to: "ci" },
      { from: "ci", to: "ok" },
      { from: "ok", to: "merge", label: "yes" },
      { from: "ok", to: "fix", label: "no" },
      { from: "merge", to: "ship" },
    ],
  }),

  architecture: () => architecture({
    title: "Web app architecture",
    sections: [
      { label: "Clients", color: "blue", items: ["Web app", "iOS app", "Admin console"] },
      { label: "Edge", color: "purple", items: ["CDN", "API gateway"] },
      { label: "Services", color: "green", items: ["Auth", "Orders", "Payments", "Notifications"] },
      { label: "Data", color: "orange", items: ["Postgres", "Redis", "Object storage"] },
    ],
    connections: [
      { from: "Web app", to: "CDN" },
      { from: "API gateway", to: "Orders" },
      { from: "Orders", to: "Postgres" },
    ],
  }),

  sequence: cacheSequence, // sugar, composed the way the sequence skill recipe does

  timeline: () => timeline({
    title: "2026 product roadmap",
    items: [
      { label: "Beta", time: "Q1", desc: "Invite-only, 200 teams" },
      { label: "Public launch", time: "Q2", desc: "Self-serve signup" },
      { label: "Teams plan", time: "Q3", desc: "SSO + shared workspaces" },
      { label: "API", time: "Q4", desc: "Public REST API + webhooks" },
    ],
  }),

  comparison: coverage, // sugar — rendered through render()

  "tree-right": () => tree(skillsLR),
  "tree-down": () => tree(skills),
  "tree-stories": () => tree(storiesEn),
};

for (const [name, build] of Object.entries(figures)) {
  const els = build();
  const isSugar = els.some((e) => e.shape);
  let png, warnings;
  if (isSugar) {
    const out = await render(els, { formats: ["png"], scale: 2 });
    png = out.outputs.png;
    warnings = out.warnings;
  } else {
    autoRegisterCjkFont(els);
    png = await toPng(els, 2);
    warnings = validate(els);
  }
  writeFileSync(`${outDir}${name}.png`, png);
  console.log(`${name}.png — ${warnings.length ? `${warnings.length} warning(s): ${warnings.map((w) => w.code).join(", ")}` : "lint clean"}`);
}
