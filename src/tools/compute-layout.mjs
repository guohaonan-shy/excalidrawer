import { defineTool } from "./schema.mjs";
import {
  gridLayout, chooseGrid, chain, swimlane, hubSpoke, edgePoint, routeU, labelAnchor,
  fitContainer, titledBox,
} from "../layout.mjs";

/**
 * Each entry maps a flat `args` object onto the helper's positional signature.
 * Helpers destructure only the option keys they know, so passing the whole
 * args object as the options bag is safe.
 */
const DISPATCH = {
  gridLayout:  (a) => gridLayout(a.count, a),
  chooseGrid:  (a) => chooseGrid(a.count, a),
  chain:       (a) => chain(a.start, a.count, a),
  swimlane:    (a) => swimlane(a.lanes, a.items, a),
  hubSpoke:    (a) => hubSpoke(a.center, a.spokeCount, a),
  edgePoint:   (a) => edgePoint(a.target, a.side, a.t),
  routeU:      (a) => routeU(a.from, a.to, a),
  labelAnchor: (a) => labelAnchor(a.points, a),
  fitContainer:(a) => fitContainer(a.children, a),
  titledBox:   (a) => titledBox(a),
};

export const HELPERS = Object.keys(DISPATCH);

export const computeLayout = defineTool({
  name: "compute_layout",
  description:
    "Compute pure coordinates for common diagram layouts. Returns position " +
    "data only — no elements are created. Feed the coordinates into raw " +
    "Excalidraw element objects, then call `render_diagram`.\n" +
    "Pass `helper` plus a flat `args` object:\n" +
    "  gridLayout  — { count, cols?, targetAspect?, cellW, cellH, colGap?, rowGap?, originX?, originY?, serpentine? } → [{x,y,w,h,col,row}]\n" +
    "                omit `cols` and pass `targetAspect` (\"3:4\", 0.75) to have the column count chosen to match that shape; `serpentine` snakes alternate rows so a wrapped linear flow stays connected.\n" +
    "  chooseGrid  — { count, targetAspect, cellW, cellH, colGap?, rowGap?, maxCols? } → {cols,rows,w,h,aspect}\n" +
    "                answers \"what shape should this be?\" before you commit to a layout — use it when rendering to a fixed canvas.\n" +
    "  chain       — { start:{x,y}, count, dx?, dy? } → [{x,y,i}]\n" +
    "  swimlane    — { lanes:[{label,color}], items:[{lane,...}], laneW, laneH, itemW, itemH, laneGap?, itemGap?, headerW?, originX?, originY? } → {laneRects, itemPositions}\n" +
    "  hubSpoke    — { center:{x,y}, spokeCount, radius, startAngleDeg?, clockwise? } → {centerPos, spokePositions}\n" +
    "  edgePoint   — { target:{x,y,w,h,type?}, side:'top'|'right'|'bottom'|'left', t? } → {x,y}\n" +
    "  routeU      — { from:{x,y}, to:{x,y}, side:'above'|'below'|'left'|'right', clearance } → [[dx,dy]...] relative offsets\n" +
    "  labelAnchor — { points:[[x,y]...], padding?, preferSide? } → {x,y,side,segmentIdx}\n" +
    "  fitContainer— { children:[{x,y,w,h}], padding?, minW?, minH? } → {x,y,w,h} (wraps children, equal pad incl. bottom)\n" +
    "  titledBox   — { x, y, w, title, body?, titleFontSize?, bodyFontSize?, padding?, gap? } → {box,title,body} (header+body, auto-height)\n" +
    "On bad input it returns { error }.",
  params: {
    helper: {
      type: "string",
      required: true,
      enum: HELPERS,
      description: "Which layout helper to run.",
    },
    args: {
      type: "object",
      required: true,
      description: "Flat argument object for the chosen helper — see the per-helper shapes above.",
    },
  },
  run(args) {
    const fn = DISPATCH[args.helper];
    if (!fn) return { error: `unknown helper: ${args.helper}. Valid: ${HELPERS.join(", ")}` };
    try {
      return { helper: args.helper, result: fn(args.args || {}) };
    } catch (e) {
      return { error: e.message };
    }
  },
});
