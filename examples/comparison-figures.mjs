/**
 * Comparison figures — the three worked examples from the `comparison` skill
 * recipe (`skills/comparison/references/comparison.md`), as runnable code.
 *
 * Each figure exercises a different rule, which is why these three are also the
 * eval fixtures in `docs/agent-eval.md`:
 *
 *   coverage   — Layout A, ROW CARDS. Rows are dimensions shared by both sides,
 *                so each pair is boxed and levelled (one `equalize` per row).
 *   subscores  — Layout A, SINGLE PANEL. Each side holds its own list, so the
 *                rows are NOT boxed — same-name items are coincidence, not a
 *                comparison.
 *   pricing    — Layout C, asymmetric. One side splits into sub-cards; a single
 *                `equalize` call spans both sub-cards and the full-width card
 *                opposite them, so the row cannot skew.
 *
 * Run:  node examples/comparison-figures.mjs
 * Outputs land next to this file (gitignored, like every rendered artifact).
 */

import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

import { equalize, render } from "../src/index.mjs";

const dir = dirname(fileURLToPath(import.meta.url));

const PAD = 16, GAP = 12;
const bg = (c) => "bg" + c[0].toUpperCase() + c.slice(1);

// --- 1. coverage — row cards ------------------------------------------------

function coverage() {
  const W = 1000, LX = 40, CW = 400, RX = 560, IW = CW - PAD * 2, FS = 14, BY = 180;
  const rows = [
    ["Speaking: Listen & Repeat, Interview", "Speaking: Listen & Repeat, Interview"],
    ["Writing: None", "Writing: Write an Email, Academic Discussion"],
    ["Scoring: 1–6 band (internal 0–5 conversion)", "Scoring: 1–6 band, direct"],
  ];

  // One equalize per dimension: the pair is level across the gutter, and the
  // shell height falls out of the sum instead of being hand-picked.
  const hs = rows.map(([l, r]) =>
    equalize([{ w: IW, text: l, fontSize: FS }, { w: IW, text: r, fontSize: FS }], { minH: 44 }).h
  );
  const shellH = PAD * 2 + hs.reduce((a, b) => a + b, 0) + GAP * (rows.length - 1);

  const els = [
    { shape: "text", at: [40, 30], size: [W - 80, 34], text: "MySpeakingScore vs TOEFLAIR: coverage", fontSize: 22 },
    { shape: "rect", id: "lh", at: [LX, 90], size: [CW, 60], fill: bg("gray"), stroke: "gray", text: "MySpeakingScore", fontSize: 18 },
    { shape: "rect", id: "rh", at: [RX, 90], size: [CW, 60], fill: bg("blue"), stroke: "blue", text: "TOEFLAIR", fontSize: 18, textColor: "blue" },
    { shape: "arrow", from: "lh", to: "lb" },
    { shape: "arrow", from: "rh", to: "rb" },
    { shape: "rect", id: "lb", at: [LX, BY], size: [CW, shellH], fill: bg("gray"), stroke: "gray" },
    { shape: "rect", id: "rb", at: [RX, BY], size: [CW, shellH], fill: bg("blue"), stroke: "blue" },
    { shape: "text", at: [460, BY + shellH / 2 - 16], size: [80, 28], text: "VS", fontSize: 22, textColor: "gray" },
  ];
  let y = BY + PAD;
  rows.forEach(([l, r], i) => {
    els.push({ shape: "rect", at: [LX + PAD, y], size: [IW, hs[i]], fill: "#ffffff", stroke: "gray", text: l, fontSize: FS });
    els.push({ shape: "rect", at: [RX + PAD, y], size: [IW, hs[i]], fill: "#ffffff", stroke: "blue", text: r, fontSize: FS, textColor: "blue" });
    y += hs[i] + GAP;
  });
  return els;
}

// --- 2. subscores — single panel --------------------------------------------

function subscores() {
  const LX = 40, CW = 360, RX = 460, BY = 175;
  // Short, near-equal lines, so centered bullet glyphs read fine here.
  const L = "• Fluency\n• Intelligibility\n• Repeat Accuracy";
  const R = "• Fluency\n• Intelligibility\n• Language Use\n• Organization";
  const row = equalize([{ w: CW, text: L, fontSize: 15 }, { w: CW, text: R, fontSize: 15 }], { minH: 120 });
  return [
    { shape: "text", at: [40, 30], size: [780, 34], text: "MySpeakingScore's subscores, by task", fontSize: 22 },
    { shape: "rect", id: "lh", at: [LX, 90], size: [CW, 60], fill: bg("gray"), stroke: "gray", text: "Listen & Repeat", fontSize: 17 },
    { shape: "rect", id: "rh", at: [RX, 90], size: [CW, 60], fill: bg("gray"), stroke: "gray", text: "Interview", fontSize: 17 },
    { shape: "arrow", from: "lh", to: "lb" },
    { shape: "arrow", from: "rh", to: "rb" },
    { shape: "rect", id: "lb", at: [LX, BY], size: [CW, row.h], fill: "transparent", stroke: "gray", dashed: true, text: L, fontSize: 15 },
    { shape: "rect", id: "rb", at: [RX, BY], size: [CW, row.h], fill: "transparent", stroke: "gray", dashed: true, text: R, fontSize: 15 },
  ];
}

// --- 3. pricing — asymmetric -------------------------------------------------

function pricing() {
  const LX = 30, SUB = 200, MID = 260, RX = 520, CW = 430, RY = 215, FS = 14;
  const c1 = "One-time credit pack\n\n$18.75–$62.50\n10–50 tests\nExpires in 3 months";
  const c2 = "Monthly subscription\n\n$15–$50/mo\n10–50 tests\nResets each cycle";
  const c3 = "One-time window: 1 / 3 / 6 months\n\n$20 · $51 · $90\nUnlimited across all 4 task types · no auto-renew";
  const f1 = "Fits: occasional practice,\ntopping up before a test date";
  const f2 = "Fits: steady, cyclical prep";
  const f3 = "Fits: any practice rhythm — within the window you bought";

  // Both sub-cards AND the full-width card opposite go into one call — that is
  // what keeps an asymmetric row from skewing.
  const r1 = equalize([{ w: SUB, text: c1, fontSize: FS }, { w: SUB, text: c2, fontSize: FS }, { w: CW, text: c3, fontSize: FS }]);
  const FY = RY + r1.h + 30;
  const r2 = equalize([{ w: SUB, text: f1, fontSize: 13 }, { w: SUB, text: f2, fontSize: 13 }, { w: CW, text: f3, fontSize: 13 }]);

  return [
    { shape: "text", at: [30, 30], size: [920, 34], text: "Paying for practice, by usage pattern", fontSize: 22 },
    { shape: "rect", id: "lh", at: [LX, 90], size: [CW, 64], fill: bg("gray"), stroke: "gray", text: "MySpeakingScore — two ways to pay", fontSize: 17 },
    { shape: "rect", id: "rh", at: [RX, 90], size: [CW, 64], fill: bg("blue"), stroke: "blue", text: "TOEFLAIR — one way to pay", fontSize: 17, textColor: "blue" },
    // Pin the sides: left to auto, a large x-offset makes the router go sideways.
    { shape: "arrow", from: "lh", to: "c1", fromSide: "bottom", toSide: "top", fromT: 0.35 },
    { shape: "arrow", from: "lh", to: "c2", fromSide: "bottom", toSide: "top", fromT: 0.65 },
    { shape: "arrow", from: "rh", to: "c3", fromSide: "bottom", toSide: "top" },
    { shape: "rect", id: "c1", at: [LX, RY], size: [SUB, r1.h], fill: bg("gray"), stroke: "gray", text: c1, fontSize: FS },
    { shape: "rect", id: "c2", at: [MID, RY], size: [SUB, r1.h], fill: bg("gray"), stroke: "gray", text: c2, fontSize: FS },
    { shape: "rect", id: "c3", at: [RX, RY], size: [CW, r1.h], fill: bg("blue"), stroke: "blue", text: c3, fontSize: FS, textColor: "blue" },
    { shape: "rect", at: [LX, FY], size: [SUB, r2.h], fill: "transparent", stroke: "gray", dashed: true, text: f1, fontSize: 13 },
    { shape: "rect", at: [MID, FY], size: [SUB, r2.h], fill: "transparent", stroke: "gray", dashed: true, text: f2, fontSize: 13 },
    { shape: "rect", at: [RX, FY], size: [CW, r2.h], fill: "transparent", stroke: "blue", dashed: true, text: f3, fontSize: 13, textColor: "blue" },
  ];
}

for (const [name, fn] of [["coverage", coverage], ["subscores", subscores], ["pricing", pricing]]) {
  const out = await render(fn(), { formats: ["excalidraw", "svg", "png"], scale: 2 });
  for (const [fmt, data] of Object.entries(out.outputs)) {
    writeFileSync(join(dir, `comparison-${name}.${fmt}`), data);
  }
  const warnings = out.warnings ?? [];
  console.log(
    `comparison-${name}.{excalidraw,svg,png} written — ` +
    (warnings.length ? `${warnings.length} warning(s): ${warnings.map((w) => w.code).join(", ")}` : "lint clean")
  );
}
