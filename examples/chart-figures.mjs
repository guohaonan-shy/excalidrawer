/**
 * Chart figures — a bar chart, a line chart, a 100% stacked bar chart and a pie,
 * composed the way the `chart` entry skill describes them, as runnable code.
 *
 * No chart component: bars and lines come from `axis`, the pie from `pie`.
 *
 *   - the value axis is `axis` with `dir: "up"` (0 on the baseline, larger values
 *     higher), its `ticks` give the tick labels and the grid-line heights, its
 *     `scale` turns a data value into a y coordinate;
 *   - the category / time axis is `axis` along x, one valueless mark per category
 *     spread so the marks sit at the middle of equal bands;
 *   - grid lines and the polyline of a line chart are raw `line` elements placed
 *     first in the array: sugar `line`s are always drawn after the shapes, which
 *     would put them over the bars and the dots (see `shapes.md`, "画在形状后面的线");
 *   - the legend is `legend`;
 *   - a 100% stacked bar is the bar chart's frame on a 0–100 value axis, each
 *     column's segments stacked from the baseline by running total; a segment too
 *     thin for its number puts it outside the bar on a short leader;
 *   - a pie is one `pie` call: each slice's points become a filled `polygon`, its
 *     label a `text` on the returned `textBox` — inside the slice, or outside on
 *     the returned `leader` when the slice is too small to hold it.
 *
 * Run:  node examples/chart-figures.mjs
 * Outputs land next to this file (gitignored, like every rendered artifact).
 */

import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath, pathToFileURL } from "url";

import { axis, legend, pie, render, colors } from "../src/index.mjs";

const dir = dirname(fileURLToPath(import.meta.url));

const X0 = 100, PLOT_W = 560, BASE_Y = 470, PLOT_H = 300, MARGIN = 40;
const CANVAS_W = X0 + PLOT_W + MARGIN;
const FS = 16, SMALL = 14;
const GRID = "#adb5bd";

const title = (text, w = CANVAS_W) =>
  ({ shape: "text", at: [MARGIN, 30], size: [w - MARGIN, 34], text, fontSize: 28 });

// A raw (not sugar) line, so it stays where it is in the array — behind the shapes
// that come after it.
const rawLine = (id, x, y, points, extra) => {
  const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
  return {
    type: "line", id, x, y, points, roundness: null,
    width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys),
    ...extra,
  };
};

/** The shared frame: value axis (up) + category axis (x), grid, tick labels, unit. */
function frame({ domain, tickCount, tickStep, categories, unit, tickText = String }) {
  const band = PLOT_W / categories.length;
  const vAxis = axis({
    from: { x: X0, y: BASE_Y }, dir: "up", domain, length: PLOT_H,
    ticks: tickStep ? { step: tickStep } : { count: tickCount }, labelSide: "before",
  });
  const cAxis = axis({
    from: { x: X0, y: BASE_Y }, dir: "x", length: PLOT_W,
    extend: [band / 2, band / 2], marks: categories.map((label) => ({ label })), labelOffset: 12,
  });
  const yOf = (v) => vAxis.scale.origin + (v - vAxis.scale.domain[0]) * vAxis.scale.pxPerUnit;

  // Behind everything: dashed grid at every tick above the baseline.
  const behind = vAxis.ticks
    .filter((t) => t.value !== domain[0])
    .map((t) => rawLine(`grid-${t.value}`, X0, t.y, [[0, 0], [PLOT_W, 0]],
      { strokeStyle: "dashed", strokeColor: GRID, strokeWidth: 1 }));

  const labels = [
    ...vAxis.ticks.map((t) => ({
      shape: "text", at: [t.labelAnchor.x - 40, t.labelAnchor.y - 11], size: [40, 22],
      text: tickText(t.value), fontSize: SMALL,
    })),
    ...cAxis.marks.map((m) => ({
      shape: "text", at: [m.x - band / 2 + 4, m.labelAnchor.y], size: [band - 8, 22],
      text: m.label, fontSize: FS,
    })),
    ...(unit ? [{ shape: "text", at: [X0 - 50, BASE_Y - PLOT_H - 40], size: [100, 22], text: unit, fontSize: SMALL }] : []),
  ];
  const axes = [...vAxis.segments, ...cAxis.segments]
    .map((s) => ({ shape: "line", at: s.at, points: s.points }));
  return { band, vAxis, cAxis, yOf, behind, labels, axes };
}

function legendEls(items, fills) {
  const lg = legend({
    items: items.map((label) => ({ label })), dir: "x", fontSize: SMALL,
    bounds: { x: X0, y: BASE_Y - PLOT_H, w: PLOT_W, h: PLOT_H }, corner: "top-right", place: "outside",
  });
  return lg.items.flatMap((it, i) => [
    { shape: "rect", at: [it.sample.x, it.sample.y], size: [it.sample.w, it.sample.h], fill: fills[i] },
    { shape: "text", at: [it.label.x, it.label.y], size: [it.label.w, it.label.h], text: it.text, fontSize: it.label.fontSize },
  ]);
}

// --- bar chart ---------------------------------------------------------------

export function quarterlyRevenue() {
  const categories = ["Q1", "Q2", "Q3", "Q4"];
  const series = [
    { name: "FY2025", fill: "blue", values: [12.4, 14.8, 17.1, 21.6] },
    { name: "FY2026", fill: "orange", values: [15.2, 18.9, 22.4, 27.5] },
  ];
  const f = frame({ domain: [0, 40], tickCount: 4, categories, unit: "$M" });
  const groupW = f.band * 0.7, barW = groupW / series.length;

  const bars = [], values = [];
  categories.forEach((_, i) => {
    const left = f.cAxis.marks[i].x - groupW / 2;
    series.forEach((s, j) => {
      const x = left + j * barW, top = f.yOf(s.values[i]);
      // from the baseline up: the bar's bottom is the baseline, its top is the scaled value
      bars.push({ shape: "rect", id: `bar-${j}-${i}`, at: [x, top], size: [barW, BASE_Y - top], fill: s.fill });
      // the value sits just above the bar's top
      values.push({ shape: "text", at: [x - 4, top - 26], size: [barW + 8, 22], text: String(s.values[i]), fontSize: SMALL });
    });
  });

  return [
    title("Quarterly revenue, FY2025 vs FY2026"),
    ...f.behind, ...bars, ...values, ...f.axes, ...f.labels,
    ...legendEls(series.map((s) => s.name), series.map((s) => s.fill)),
  ];
}

// --- line chart --------------------------------------------------------------

export function dailyActiveUsers() {
  const categories = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];
  const series = [
    { name: "Web", fill: colors.strokeBlue, stroke: "blue", values: [52, 55, 58, 61, 63, 68, 71, 75] },
    { name: "Mobile", fill: colors.strokeOrange, stroke: "orange", values: [38, 44, 51, 57, 66, 72, 81, 88] },
  ];
  // The value axis starts at a tick (30), not at 0.
  const f = frame({ domain: [30, 90], tickCount: 6, categories, unit: "DAU (k)" });

  const lines = [], dots = [], last = [];
  series.forEach((s, j) => {
    const pts = s.values.map((v, i) => [f.cAxis.marks[i].x, f.yOf(v)]);
    lines.push(rawLine(`line-${j}`, pts[0][0], pts[0][1], pts.map(([x, y]) => [x - pts[0][0], y - pts[0][1]]),
      { strokeColor: s.fill, strokeWidth: 2 }));
    pts.forEach(([x, y], i) =>
      dots.push({ shape: "ellipse", at: [x - 5, y - 5], size: [10, 10], fill: s.fill, stroke: s.stroke }));
    const [lx, ly] = pts[pts.length - 1];
    last.push({ shape: "text", at: [lx + 10, ly - 11], size: [40, 22], text: String(s.values[s.values.length - 1]), fontSize: SMALL });
  });

  return [
    title("Daily active users by platform, 2026"),
    ...f.behind, ...lines, ...dots, ...last, ...f.axes, ...f.labels,
    ...legendEls(series.map((s) => s.name), series.map((s) => s.fill)),
  ];
}

// --- 100% stacked bar chart ----------------------------------------------------

/**
 * One column per category, each 100% tall, its segments stacked from the
 * baseline in series order. `columns[i].values` are shares of that column (they
 * are scaled to sum to 100, so rounded inputs like 3.1 + 81.3 + 12.5 + 3.1 still
 * fill the column exactly); a zero share has no segment.
 */
export function stackedFigure({ title: heading, series, columns, fills, decimals = 1 }) {
  const f = frame({
    domain: [0, 100], tickStep: 25, categories: columns.map((c) => c.label), tickText: (v) => `${v}%`,
  });
  const barW = Math.min(f.band * 0.5, 96);
  // A segment shorter than one line of its number (plus room above and below) is too thin to hold it.
  const insideMin = SMALL * 1.25 + 8;

  const segs = [], inside = [], outside = [];
  columns.forEach((col, i) => {
    const sum = col.values.reduce((t, v) => t + v, 0);
    const x = f.cAxis.marks[i].x - barW / 2;
    let run = 0, floor = -Infinity;
    const thin = [];
    col.values.forEach((v, j) => {
      if (v <= 0) return;
      const yBot = f.yOf((run / sum) * 100);
      run += v;
      const yTop = f.yOf((run / sum) * 100);
      segs.push({ shape: "rect", id: `seg-${i}-${j}`, at: [x, yTop], size: [barW, yBot - yTop], fill: fills[j] });
      const text = `${v.toFixed(decimals)}%`;
      const mid = (yTop + yBot) / 2;
      if (yBot - yTop >= insideMin) {
        inside.push({ shape: "text", at: [x, mid - 11], size: [barW, 22], text, fontSize: SMALL });
      } else {
        thin.push({ mid, text });
      }
    });
    // Outside labels sit right of the bar, top to bottom, never closer than one line apart.
    thin.sort((p, q) => p.mid - q.mid).forEach(({ mid, text }) => {
      const y = Math.max(mid, floor);
      floor = y + 22;
      const lx = x + barW;
      outside.push({ shape: "line", at: [lx + 2, mid], points: [[0, 0], [8, y - mid], [14, y - mid]], stroke: "gray" });
      outside.push({ shape: "text", at: [lx + 18, y - 11], size: [52, 22], text, fontSize: SMALL });
    });
  });

  return [
    title(heading),
    ...f.behind, ...segs, ...inside, ...f.axes, ...f.labels, ...outside,
    ...legendEls(series, fills),
  ];
}

export const supportTickets = () => stackedFigure({
  title: "Support tickets by channel, 2026",
  series: ["Email", "Chat", "Phone", "Forum"],
  fills: ["blue", "orange", "purple", "green"],
  columns: [
    { label: "Q1", values: [52.0, 30.5, 15.0, 2.5] },
    { label: "Q2", values: [44.0, 38.0, 14.5, 3.5] },
    { label: "Q3", values: [37.5, 45.0, 13.0, 4.5] },
    { label: "Q4", values: [31.0, 52.5, 10.5, 6.0] },
  ],
});

// --- pie ----------------------------------------------------------------------

/** A pie centered under the title; the top of its labels (or of the circle) sits a fixed gap below it. */
export function pieFigure({ title: heading, slices, fills, r = 140, decimals = 1 }) {
  // Lay it out once to learn how far the outside labels reach above the circle, then place it.
  const probe = pie({ slices, r, cx: CANVAS_W / 2, cy: 0, decimals });
  const p = pie({ slices, r, cx: CANVAS_W / 2, cy: 110 - probe.bounds.y, decimals });
  const els = [title(heading)];
  for (const s of p.slices) {
    els.push({ shape: "polygon", id: `slice-${s.index}`, points: s.points, fill: fills[s.index % fills.length], stroke: "gray" });
  }
  for (const s of p.slices) {
    const b = s.textBox;
    els.push({ shape: "text", at: [b.x, b.y], size: [b.w, b.h], text: b.text, fontSize: b.fontSize });
    if (s.leader) els.push({ shape: "line", at: s.leader.at, points: s.leader.points, stroke: "gray" });
  }
  return els;
}

export const trafficSources = () => pieFigure({
  title: "Website visits by source, 2026",
  fills: ["blue", "orange", "purple", "green", "gray"],
  slices: [
    { label: "Search", value: 46 },
    { label: "Direct", value: 31 },
    { label: "Social", value: 15 },
    { label: "Referral", value: 5.5 },
    { label: "Email", value: 2.5 },
  ],
});

// Run directly → write the figures; imported (e.g. by gallery.mjs) → builders only.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const [name, build] of [
    ["chart-bar-revenue", quarterlyRevenue], ["chart-line-dau", dailyActiveUsers],
    ["chart-stacked-tickets", supportTickets], ["chart-pie-traffic", trafficSources],
  ]) {
    const out = await render(build(), { formats: ["excalidraw", "svg", "png"], scale: 2 });
    for (const [fmt, data] of Object.entries(out.outputs)) writeFileSync(join(dir, `${name}.${fmt}`), data);
    const warnings = out.warnings ?? [];
    console.log(
      `${name}.{excalidraw,svg,png} written — ` +
      (warnings.length ? `${warnings.length} warning(s): ${warnings.map((w) => `${w.code} ${w.message}`).join("; ")}` : "lint clean"),
    );
  }
}
