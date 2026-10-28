/**
 * Pyramid and funnel figures — composed the way the `pyramid` entry skill
 * describes them, as runnable code.
 *
 * Both are one `taper` call plus drawing: each layer's corners become a filled
 * `polygon`, its label is a `text` laid on the `textBox` the component returns
 * (already wrapped), and the right-hand column carries each layer's value; the
 * funnel also writes the conversion rate in the gap between two layers.
 *
 *   - pyramid: narrow at the top, layers listed top to bottom, a short note per layer;
 *   - funnel:  narrow at the bottom, a count per layer and the step conversion.
 *
 * Run:  node examples/pyramid-figures.mjs
 * Outputs land next to this file (gitignored, like every rendered artifact).
 */

import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath, pathToFileURL } from "url";

import { taper, estimateTextWidth, render } from "../src/index.mjs";

const dir = dirname(fileURLToPath(import.meta.url));

const X0 = 60;
const TITLE_Y = 30;
const NOTE_FS = 14;

const title = (text, w, subtitle) => [
  { shape: "text", at: [X0, TITLE_Y], size: [w, 34], text, fontSize: 28 },
  ...(subtitle
    ? [{ shape: "text", at: [X0, 78], size: [w, 22], text: subtitle, fontSize: 16, textColor: "gray" }]
    : []),
];

// A number or note in the right-hand column. The box is as wide as the text, so
// its centered text lands where a left-aligned one would start.
function cell(anchor, text, { fontSize = 16, textColor } = {}) {
  const w = Math.max(28, estimateTextWidth(text, fontSize));
  const h = Math.ceil(fontSize * 1.4);
  return {
    shape: "text", at: [anchor.x, anchor.y - h / 2], size: [w, h], text, fontSize,
    ...(textColor ? { textColor } : {}),
  };
}

function drawLayers(t, { fills, id }) {
  const els = [];
  t.layers.forEach((l, i) => {
    els.push({ shape: "polygon", id: `${id}-${i}`, points: l.corners, fill: fills[i % fills.length], stroke: "blue" });
    const b = l.textBox;
    els.push({ shape: "text", at: [b.x, b.y], size: [b.w, b.h], text: b.text, fontSize: b.fontSize });
  });
  return els;
}

/** Test pyramid: few slow tests on top, many fast ones at the base. */
export function testPyramid() {
  const t = taper({
    narrow: "top",
    width: 560,
    x: X0,
    y: 120,
    layers: [
      { text: "End-to-end", value: "few, slow" },
      { text: "Integration", value: "some" },
      { text: "Component", value: "many" },
      { text: "Unit", value: "most, fast" },
    ],
  });
  const els = [
    ...title("Test pyramid", 620, "fewer, slower checks at the top; more, faster ones below"),
    ...drawLayers(t, { id: "tier", fills: ["blue"] }),
  ];
  t.layers.forEach((l) => els.push(cell(l.valueAnchor, l.value, { fontSize: NOTE_FS, textColor: "gray" })));
  return els;
}

/** Signup funnel: a count per step, the step-to-step conversion in gray between them. */
export function signupFunnel() {
  const t = taper({
    narrow: "bottom",
    width: 560,
    x: X0,
    y: 130,
    layers: [
      { text: "Visited site", value: 10000 },
      { text: "Started signup", value: 4200 },
      { text: "Verified email", value: 1800 },
      { text: "Activated", value: 900 },
      { text: "Paying users", value: 360 },
    ],
  });
  const fills = ["blue", "blue", "blue", "blue", "green"];
  const els = [
    ...title("Signup funnel — where visitors drop off", 700, "gray % = conversion from the previous step"),
    ...drawLayers(t, { id: "step", fills }),
  ];
  t.layers.forEach((l) => els.push(cell(l.valueAnchor, l.value.toLocaleString("en-US"))));
  t.rates.forEach((r) => r.text && els.push(cell(r.anchor, r.text, { fontSize: 13, textColor: "gray" })));
  return els;
}

// For gallery.mjs: `...pyramidFigures` adds both entries.
export const pyramidFigures = { pyramid: testPyramid, funnel: signupFunnel };

// Run directly → write the figures; imported (e.g. by gallery.mjs) → builders only.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const [name, build] of Object.entries({ "pyramid-test": testPyramid, "pyramid-signup": signupFunnel })) {
    const out = await render(build(), { formats: ["excalidraw", "svg", "png"], scale: 2 });
    for (const [fmt, data] of Object.entries(out.outputs)) {
      writeFileSync(join(dir, `${name}.${fmt}`), data);
    }
    const warnings = out.warnings ?? [];
    console.log(
      `${name}.{excalidraw,svg,png} written — ` +
      (warnings.length ? `${warnings.length} warning(s): ${warnings.map((w) => `${w.code} ${w.message}`).join("; ")}` : "lint clean")
    );
  }
}
