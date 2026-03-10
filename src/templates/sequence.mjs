/**
 * Sequence diagram template (swimlane / message-passing style).
 *
 * Input schema:
 * {
 *   title?: string,
 *   actors: [
 *     { label: string, color?: string }   // color: palette key e.g. "yellow"
 *   ],
 *   steps: [
 *     {
 *       actor:  string,           // label of the actor that owns this step box
 *       text:   string,           // box text (use \n for line breaks)
 *       color?: string,           // optional box color override (palette key)
 *       from?:  string,           // source actor label — draws an incoming arrow
 *       arrow?: string,           // label on the arrow (optional)
 *       style?: "solid"|"dashed"  // arrow stroke style (default: "solid")
 *     }
 *   ]
 * }
 *
 * Layout:
 *   - Each actor maps to a vertical column with a header box and a dashed lifeline
 *   - Each step is a box on the actor's column, stacked top-to-bottom
 *   - When `from` is set, a horizontal arrow is drawn from the source actor's
 *     lifeline to the target step box — both at the same Y (box vertical center)
 *   - Column width is auto-computed from the longest actor label
 *   - Actors beyond 5 fall back to a default color cycle
 */

import { setSeed, box, arrow, textEl, colors, excalidraw } from "../elements.mjs";
import { toSvg, toPng } from "../export.mjs";

const COLOR_MAP = {
  yellow: colors.yellow,
  orange: colors.orange,
  blue:   colors.blue,
  green:  colors.green,
  purple: colors.purple,
  red:    colors.red,
  gray:   colors.gray,
};

const COLOR_CYCLE = [
  colors.yellow,
  colors.blue,
  colors.purple,
  colors.orange,
  colors.green,
  colors.red,
];

/** Rough text-width estimator (no canvas). CJK ≈ fontSize, ASCII ≈ 0.62×. */
function estimateWidth(text, fontSize) {
  let w = 0;
  for (const ch of text) w += ch.charCodeAt(0) > 0x7f ? fontSize : fontSize * 0.62;
  return Math.ceil(w);
}

/**
 * Generate sequence diagram elements from structured data.
 *
 * @param {object} data - { title?, actors, steps }
 * @param {object} [opts] - { seed?: number }
 * @returns {Array} Excalidraw element array
 */
export function sequence(data, opts = {}) {
  setSeed(opts.seed ?? 500000);

  const { title, actors, steps } = data;

  // ── Layout constants ──────────────────────────────────────────────
  const MARGIN     = 25;
  const COL_GAP    = 45;
  const BOX_H      = 75;
  const ROW_GAP    = 38;
  const ROW_STEP   = BOX_H + ROW_GAP;
  const HEADER_H   = 52;
  const HEADER_Y   = title ? 56 : 20;
  const START_Y    = HEADER_Y + HEADER_H + 44;
  const HEADER_FONT = 14;
  const STEP_FONT  = 12;

  // ── Column width: fit longest actor label + padding ───────────────
  const maxActorLabelW = Math.max(
    ...actors.map((a) => estimateWidth(a.label, HEADER_FONT))
  );
  const COL_W = Math.max(160, maxActorLabelW + 40);

  // ── Build actor index & column centers ───────────────────────────
  const actorIndex = new Map(actors.map((a, i) => [a.label, i]));
  const colX  = actors.map((_, i) => MARGIN + i * (COL_W + COL_GAP));
  const colCX = colX.map((x) => x + COL_W / 2);
  const TOTAL_W = MARGIN + actors.length * COL_W + (actors.length - 1) * COL_GAP + MARGIN;

  const elements = [];

  // ── Title ─────────────────────────────────────────────────────────
  if (title) {
    elements.push(
      textEl("seq-title", MARGIN, 10, TOTAL_W - MARGIN * 2, 36, title, 22, {
        textAlign: "center",
      })
    );
  }

  // ── Actor headers ─────────────────────────────────────────────────
  actors.forEach((actor, i) => {
    const color = COLOR_MAP[actor.color] ?? COLOR_CYCLE[i % COLOR_CYCLE.length];
    elements.push(
      ...box(`seq-hR${i}`, `seq-hT${i}`, colX[i], HEADER_Y, COL_W, HEADER_H,
        color, actor.label, HEADER_FONT)
    );
  });

  // ── Lifelines (dashed vertical) ───────────────────────────────────
  const lifelineH = ROW_STEP * steps.length + ROW_GAP;
  actors.forEach((_, i) => {
    elements.push(
      arrow(`seq-ll${i}`, colCX[i], HEADER_Y + HEADER_H,
        [[0, 0], [0, lifelineH]],
        { strokeStyle: "dashed", strokeColor: "#ced4da", strokeWidth: 1, endArrowhead: "none" }
      )
    );
  });

  // ── Steps & arrows ────────────────────────────────────────────────
  steps.forEach((step, i) => {
    const actorIdx = actorIndex.get(step.actor) ?? 0;
    const bx  = colX[actorIdx];
    const by  = START_Y + i * ROW_STEP;
    const bcy = by + BOX_H / 2;   // vertical center — this is the arrow Y

    // Resolve box color: step override > actor default > cycle
    const actorColor = COLOR_MAP[actors[actorIdx]?.color] ?? COLOR_CYCLE[actorIdx % COLOR_CYCLE.length];
    const boxColor   = step.color ? (COLOR_MAP[step.color] ?? actorColor) : actorColor;

    // Step box
    elements.push(
      ...box(`seq-sR${i}`, `seq-sT${i}`, bx, by, COL_W, BOX_H, boxColor, step.text, STEP_FONT)
    );

    // Incoming arrow — Y aligned to this box's vertical center
    if (step.from != null) {
      const fromIdx = actorIndex.get(step.from) ?? 0;
      const fromCX  = colCX[fromIdx];
      const goRight = colCX[actorIdx] > fromCX;

      // Start: source lifeline center; End: near edge of target box
      const startX = fromCX;
      const endX   = goRight ? bx : bx + COL_W;

      elements.push(
        arrow(`seq-ar${i}`, startX, bcy,
          [[0, 0], [endX - startX, 0]],
          {
            strokeColor: "#495057",
            strokeWidth: 1.5,
            strokeStyle: step.style || "solid",
            roundness: { type: 2 },
          }
        )
      );

      // Arrow label (above the arrow, white background)
      if (step.arrow) {
        const lw = 110;
        elements.push(
          textEl(`seq-albl${i}`,
            (startX + endX) / 2 - lw / 2, bcy - 17,
            lw, 16, step.arrow, 11,
            { strokeColor: "#868e96", textAlign: "center", backgroundColor: "#ffffff" }
          )
        );
      }
    }
  });

  return elements;
}

export { excalidraw, toSvg, toPng };
