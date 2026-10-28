/**
 * State machine figure — the order lifecycle, composed the way the
 * `state-machine` entry skill describes it, as runnable code.
 *
 * It exercises every piece the skill names:
 *
 *   - the main path in one row (stack): initial dot → Created → Paid →
 *     Fulfilling → Delivered → final ring;
 *   - a one-level composite state (panel): Fulfilling holds Packing → Shipped;
 *   - a self-loop (same box, same side, `via`): Created "edit items";
 *   - a two-way pair (pinned sides, offset with fromT / toT): Paid ⇄ Cancelled;
 *   - a back-edge over the row (`via: "above"`): Delivered → Fulfilling "return";
 *   - a second final ring for the off-path end state, Cancelled.
 *
 * How each connector is written is in `skills/steps/references/connectors.md`
 * ("自环", "双向转移", "回边", "长距离绕行").
 *
 * Run:  node examples/state-machine-figures.mjs
 * Outputs land next to this file (gitignored, like every rendered artifact).
 */

import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath, pathToFileURL } from "url";

import { stack, render } from "../src/index.mjs";

const dir = dirname(fileURLToPath(import.meta.url));

const FS = 16, STATE_W = 130, DOT = 22, RING = 34, ROW_Y = 150;
const elbow = { arrowType: "elbow" };

export function orderStates() {
  const row = stack({
    dir: "x", gap: 130, align: "center", x: 40, y: ROW_Y,
    cells: [
      { id: "init", w: DOT, h: DOT },
      { id: "created", text: "Created", w: STATE_W, fontSize: FS },
      { id: "paid", text: "Paid", w: STATE_W, fontSize: FS },
      { id: "fulfilling", panel: {
        title: "Fulfilling", titleFontSize: FS, pad: 16, gap: 10,
        body: { dir: "x", gap: 120, align: "center", cells: [
          { id: "packing", text: "Packing", w: STATE_W, fontSize: FS },
          { id: "shipped", text: "Shipped", w: STATE_W, fontSize: FS },
        ] },
      } },
      { id: "delivered", text: "Delivered", w: STATE_W, fontSize: FS },
      { id: "final", w: RING, h: RING },
    ],
  });
  const at = Object.fromEntries(row.children.map((c) => [c.id, c]));
  const fp = at.fulfilling;
  const inner = Object.fromEntries(fp.body.children.map((c) => [c.id, c]));

  // Cancelled sits under Paid, so the two-way pair is two straight vertical lines.
  const paid = at.paid;
  const cancelled = { x: paid.x, y: row.y + row.h + 90, w: paid.w, h: paid.h };
  const cancelRing = { x: cancelled.x + cancelled.w + 100, y: cancelled.y + (cancelled.h - RING) / 2 };

  const state = (id, c, fill, text) =>
    ({ shape: "rect", id, at: [c.x, c.y], size: [c.w, c.h], fill, text, fontSize: FS });
  const ring = (id, x, y) => [
    { shape: "ellipse", id, at: [x, y], size: [RING, RING], fill: "transparent" },
    { shape: "ellipse", at: [x + 8, y + 8], size: [RING - 16, RING - 16], fill: "#1e1e1e" },
  ];

  const els = [
    { shape: "text", at: [40, 24], size: [900, 36], text: "Order lifecycle — state machine", fontSize: 28 },
    // composite state: shell first, then its title and children
    { shape: "rect", id: "fulfilling", at: [fp.x, fp.y], size: [fp.w, fp.h], fill: "bgPurple", stroke: "purple" },
    { shape: "rect", at: [fp.title.x, fp.title.y], size: [fp.title.w, fp.title.h], fill: "transparent", stroke: "transparent", text: fp.title.text, fontSize: fp.title.fontSize },
    state("packing", inner.packing, "purple", "Packing"),
    state("shipped", inner.shipped, "purple", "Shipped"),
    { shape: "ellipse", id: "init", at: [at.init.x, at.init.y], size: [DOT, DOT], fill: "#1e1e1e" },
    state("created", at.created, "blue", "Created"),
    state("paid", paid, "blue", "Paid"),
    state("delivered", at.delivered, "green", "Delivered"),
    ...ring("final", at.final.x, at.final.y),
    state("cancelled", cancelled, "red", "Cancelled"),
    ...ring("final2", cancelRing.x, cancelRing.y),

    // main path
    { shape: "arrow", from: "init", to: "created", fromSide: "right", toSide: "left", ...elbow },
    { shape: "arrow", from: "created", to: "paid", fromSide: "right", toSide: "left", text: "pay [card ok]", ...elbow },
    { shape: "arrow", from: "paid", to: "fulfilling", fromSide: "right", toSide: "left", ...elbow },
    { shape: "arrow", from: "packing", to: "shipped", fromSide: "right", toSide: "left", text: "handed over", ...elbow },
    { shape: "arrow", from: "fulfilling", to: "delivered", fromSide: "right", toSide: "left", ...elbow },
    { shape: "arrow", from: "delivered", to: "final", fromSide: "right", toSide: "left", ...elbow },

    // self-loop: out and back in on Created's free top edge
    { shape: "arrow", from: "created", to: "created", fromSide: "top", toSide: "top", fromT: 0.3, toT: 0.7,
      via: "above", clearance: 30, text: "edit items", ...elbow },
    // two-way pair: each direction takes its own side of the edge
    { shape: "arrow", from: "paid", to: "cancelled", fromSide: "bottom", toSide: "top", fromT: 0.2, toT: 0.2,
      text: "cancel", labelT: 0.5, ...elbow },
    { shape: "arrow", from: "cancelled", to: "paid", fromSide: "top", toSide: "bottom", fromT: 0.8, toT: 0.8,
      text: "restore [admin]", labelT: 0.5, ...elbow },
    { shape: "arrow", from: "created", to: "cancelled", fromSide: "bottom", toSide: "left", text: "cancel", ...elbow },
    { shape: "arrow", from: "cancelled", to: "final2", fromSide: "right", toSide: "left", ...elbow },
    // back-edge over the whole row
    { shape: "arrow", from: "delivered", to: "fulfilling", fromSide: "top", toSide: "top", toT: 0.8,
      via: "above", clearance: 40, text: "return [within 30 days]", ...elbow },
  ];
  return els;
}

// Run directly → write the figure; imported (e.g. by gallery.mjs) → builder only.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const out = await render(orderStates(), { formats: ["excalidraw", "svg", "png"], scale: 2 });
  for (const [fmt, data] of Object.entries(out.outputs)) {
    writeFileSync(join(dir, `state-machine-order.${fmt}`), data);
  }
  const warnings = out.warnings ?? [];
  console.log(
    "state-machine-order.{excalidraw,svg,png} written — " +
    (warnings.length ? `${warnings.length} warning(s): ${warnings.map((w) => `${w.code} ${w.message}`).join("; ")}` : "lint clean")
  );
}
