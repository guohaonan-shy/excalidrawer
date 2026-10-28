/**
 * High-level figure — a data-stack overview, composed the way the
 * `architecture` entry skill describes its fourth layout ("左到右的数据全景"),
 * as runnable code.
 *
 * Where the three older layouts say who calls whom, this one says where data
 * flows. It exercises every piece the skill names:
 *
 *   - one panel per stage, laid left to right in one row (stack, equalized so
 *     every stage is as tall as the tallest one; one fixed width, so a long
 *     stage name does not widen its own panel), stage name on top;
 *   - the systems of a stage as one column of cards inside its panel;
 *   - one thick arrow between neighbouring stages, nothing between the systems
 *     of a stage;
 *   - a band under the whole row for what spans every stage (governance,
 *     monitoring, access) — as wide as the row, because the row and the band
 *     are two cells of one equalized column.
 *
 * Run:  node examples/high-level-figures.mjs
 * Outputs land next to this file (gitignored, like every rendered artifact).
 */

import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath, pathToFileURL } from "url";

import { stack, render } from "../src/index.mjs";

const dir = dirname(fileURLToPath(import.meta.url));

const FS = 16, PANEL_W = 200, PANEL_PAD = 16, CARD_W = PANEL_W - PANEL_PAD * 2, STAGE_GAP = 110, BAND_H = 52, ROW_BAND_GAP = 36;

const stages = [
  { name: "Sources", systems: ["App logs", "CRM", "Payments", "Third-party APIs"] },
  { name: "Ingest", systems: ["Kafka", "Fivetran", "Debezium"] },
  { name: "Storage", systems: ["S3 lake", "Snowflake", "ClickHouse"] },
  { name: "Compute", systems: ["dbt", "Spark", "Airflow"] },
  { name: "Consume", systems: ["BI dashboards", "ML models", "Reverse ETL"] },
];
const band = "Governance · Monitoring · Access control — across every stage";

export function dataStack() {
  // One column: the row of stages, then the band. `equalize` makes the band as
  // wide as the row; the row's own `equalize` makes every stage as tall as the
  // tallest one.
  const col = stack({
    dir: "y", gap: ROW_BAND_GAP, equalize: true, x: 40, y: 100,
    cells: [
      { stack: {
        dir: "x", gap: STAGE_GAP, equalize: true,
        cells: stages.map((s) => ({ id: s.name, panel: {
          title: s.name, titleFontSize: 20, w: PANEL_W, pad: PANEL_PAD, gap: 14,
          body: { dir: "y", gap: 14, align: "center", cells: s.systems.map((t) => ({ text: t, w: CARD_W, fontSize: FS })) },
        } })),
      } },
      { id: "band", w: 100, h: BAND_H },
    ],
  });

  const [row, bandBox] = col.children;
  const els = [];
  const title = { shape: "text", at: [40, 30], size: [col.w, 34], text: "Data stack — where data flows", fontSize: 28 };
  els.push(title);

  // stage shells first, then their titles and cards on top
  for (const p of row.children) {
    els.push({ shape: "rect", id: p.id, at: [p.x, p.y], size: [p.w, p.h], fill: "bgBlue", stroke: "blue" });
  }
  for (const p of row.children) {
    els.push({ shape: "rect", at: [p.title.x, p.title.y], size: [p.title.w, p.title.h], fill: "transparent", stroke: "transparent", text: p.title.text, fontSize: p.title.fontSize });
    stages.find((s) => s.name === p.id).systems.forEach((t, i) => {
      const c = p.body.children[i];
      els.push({ shape: "rect", at: [c.x, c.y], size: [c.w, c.h], fill: "#ffffff", stroke: "blue", text: t, fontSize: c.fontSize });
    });
  }
  // the band, as wide as the row
  els.push({ shape: "rect", at: [bandBox.x, bandBox.y], size: [bandBox.w, bandBox.h], fill: "bgPurple", stroke: "purple", text: band, fontSize: FS });

  // one thick arrow between neighbouring stages — no arrows between systems
  for (let i = 0; i < row.children.length - 1; i++) {
    els.push({
      shape: "arrow", from: row.children[i].id, to: row.children[i + 1].id,
      fromSide: "right", toSide: "left", strokeWidth: "bold", arrowType: "elbow",
    });
  }
  return els;
}

// Run directly → write the figure; imported (e.g. by gallery.mjs) → builder only.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const out = await render(dataStack(), { formats: ["excalidraw", "svg", "png"], scale: 2 });
  for (const [fmt, data] of Object.entries(out.outputs)) {
    writeFileSync(join(dir, `architecture-data-stack.${fmt}`), data);
  }
  const warnings = out.warnings ?? [];
  console.log(
    "architecture-data-stack.{excalidraw,svg,png} written — " +
    (warnings.length ? `${warnings.length} warning(s): ${warnings.map((w) => `${w.code} ${w.message}`).join("; ")}` : "lint clean")
  );
}
