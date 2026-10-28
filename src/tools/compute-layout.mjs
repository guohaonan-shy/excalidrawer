import { defineTool } from "./schema.mjs";
import {
  gridLayout, chain, swimlane, hubSpoke, edgePoint, routeU, labelAnchor,
  fitContainer, titledBox, equalize, tree, stack, panel, axis, legend, taper,
} from "../layout.mjs";

/**
 * Each entry maps a flat `args` object onto the helper's positional signature.
 * Helpers destructure only the option keys they know, so passing the whole
 * args object as the options bag is safe.
 */
const DISPATCH = {
  gridLayout:  (a) => gridLayout(a.count, a),
  chain:       (a) => chain(a.start, a.count, a),
  swimlane:    (a) => swimlane(a.lanes, a.items, a),
  hubSpoke:    (a) => hubSpoke(a.center, a.spokeCount, a),
  edgePoint:   (a) => edgePoint(a.target, a.side, a.t),
  routeU:      (a) => routeU(a.from, a.to, a),
  labelAnchor: (a) => labelAnchor(a.points, a),
  fitContainer:(a) => fitContainer(a.children, a),
  titledBox:   (a) => titledBox(a),
  equalize:    (a) => equalize(a.cells, a),
  tree:        (a) => tree(a.root, a),
  stack:       (a) => stack(a),
  panel:       (a) => panel(a),
  axis:        (a) => axis(a),
  legend:      (a) => legend(a),
  taper:       (a) => taper(a),
};

export const HELPERS = Object.keys(DISPATCH);

export const computeLayout = defineTool({
  name: "compute_layout",
  description:
    "Compute pure coordinates for common diagram layouts. Returns position " +
    "data only — no elements are created. Feed the coordinates into raw " +
    "Excalidraw element objects, then call `render_diagram`.\n" +
    "Pass `helper` plus a flat `args` object:\n" +
    "  gridLayout  — { count, cols, cellW, cellH, colGap?, rowGap?, originX?, originY? } → [{x,y,w,h,col,row}]\n" +
    "  chain       — { start:{x,y}, count, dx?, dy? } → [{x,y,i}]\n" +
    "  swimlane    — { lanes:[{label,color}], items:[{lane,...}], laneW, laneH, itemW, itemH, laneGap?, itemGap?, headerW?, originX?, originY? } → {laneRects, itemPositions}\n" +
    "  hubSpoke    — { center:{x,y}, spokeCount, radius, startAngleDeg?, clockwise? } → {centerPos, spokePositions}\n" +
    "  edgePoint   — { target:{x,y,w,h,type?}, side:'top'|'right'|'bottom'|'left', t? } → {x,y}\n" +
    "  routeU      — { from:{x,y}, to:{x,y}, side:'above'|'below'|'left'|'right', clearance } → [[dx,dy]...] relative offsets\n" +
    "  labelAnchor — { points:[[x,y]...], padding?, preferSide? } → {x,y,side,segmentIdx}\n" +
    "  fitContainer— { children:[{x,y,w,h}], padding?, minW?, minH? } → {x,y,w,h} (wraps children, equal pad incl. bottom)\n" +
    "  titledBox   — { x, y, w, title, body?, titleFontSize?, bodyFontSize?, padding?, gap? } → {box,title,body} (header+body, auto-height)\n" +
    "  equalize    — { cells:[{w,text,fontSize?}|{w,title,body?,...}|{w,h}], minH? } → {h, cells:[{w,h,contentH}]} " +
    "(one height that fits the whole group — build every sibling box at `h` so a wrapped label can't leave the row ragged)\n" +
    "  tree        — { root:{label,desc?,id?,children?:[node|string]}, direction?:'right'|'down', widths?:[perDepth], fontSize?, minH?, " +
    "levelGap?, siblingGap?, groupGap?, equalize?:'depth'|'siblings'|'none', originX?, originY? } → " +
    "{nodes:[{id,parent,depth,leaf,label,fontSize,x,y,w,h,titled?}], segments:[{kind,at,points}], levels, bounds} " +
    "(tidy tree: parents centered on their children, subtrees never overlap; each segment is ready L4 form — draw it as shape:'line')\n" +
    "  stack       — { dir:'x'|'y', cells:[{text,w?,fontSize?}|{title,body?,w?,...}|{w,h}|{stack:{…}}], gap?=16, pad?=0, align?:'start'|'center'|'end', " +
    "size?, justify?:'start'|'center'|'end'|'space-between', cross?, equalize?, maxW?=200, fontSize?=16, x?, y? } → " +
    "{kind:'stack',x,y,w,h,overflow,crossOverflow,children:[{kind:'text'|'titled'|'box'|'stack',id?,x,y,w,h,...}]} " +
    "(lays cells along one axis and sizes the container from their content — absolute coordinates, no hand-typed heights; " +
    "cells without w get their natural width, capped at maxW; a size / cross that cannot hold the content makes the container grow, " +
    "and overflow / crossOverflow report the px past size / cross, 0 otherwise; draw each child as a rect)\n" +
    "  panel       — { title, body:{dir?='y',cells,…stack options without x/y}, titleSide?:'top'|'left'='top', titleFontSize?=18, titleW?, " +
    "pad?=16, gap?=12, w?, x?, y? } → " +
    "{kind:'panel',x,y,w,h,overflow,title:{x,y,w,h,fontSize,text},body:<stack result>} " +
    "(title area + a stack of cells, sized from both: top = title above the body, left = a title column as tall as the panel; " +
    "a w smaller than the content makes the panel grow and overflow reports the px past w, 0 otherwise; " +
    "a cell of a stack can be {panel:{…}}; draw the panel as a rect, title as a header rect or text, body.children as rects)\n" +
    "  axis        — { from:{x,y}, dir?:'x'|'y', marks?:[{value?,label?,id?}], domain?:[min,max], length?, spacing?, extend?:[before,after], gap?, " +
    "arrow?:'none'|'end', ticks?:{step?|count?} (max 1000 ticks), labelSide?:'before'|'after'|'alternate', labelOffset? } → " +
    "{kind:'axis',from,to,marks:[{id?,value?,label?,x,y,t,labelAnchor:{x,y,side}}],ticks:[{value,x,y,labelAnchor}],segments:[{at,points,arrow}],scale:{domain,origin,pxPerUnit}} " +
    "(marked line: each segment is ready L4 form — draw it as shape:'line', or 'arrow' when arrow is true; value v sits at origin+(v-domain[0])*pxPerUnit along the axis)\n" +
    "  legend      — { items:[{label,id?}], dir?:'y'|'x', sampleW?, sampleH?, gap?, itemGap?, fontSize?, pad?, at?:{x,y}, " +
    "bounds?:{x,y,w,h}, corner?:'top-left'|'top-right'|'bottom-left'|'bottom-right', place?:'inside'|'outside', offset? } → " +
    "{kind:'legend',x,y,w,h,items:[{id?,text,sample:{x,y,w,h},label:{x,y,w,h,fontSize}}]} " +
    "(rows of a sample slot + a text slot; draw the sample as a filled rect, or a line from the slot's left-middle to right-middle; with `corner` + `bounds` the block places itself)\n" +
    "  taper       — { layers:[string|{text,value?}] (top to bottom), width, narrow?:'top'|'bottom'='top' ('top' = pyramid, 'bottom' = funnel), minWidth?=0.3*width, " +
    "layerH?=56, gap?=12, fontSize?=16, valueGap?=24, x?, y? } → " +
    "{kind:'taper',narrow,x,y,w,h,cx,layers:[{index,text,value?,x,y,w,h,corners:[[x,y]×4 tl,tr,br,bl],textBox:{x,y,w,h,fontSize,text},valueAnchor?:{x,y}}],rates:[{from,to,ratio,text,anchor:{x,y}}]} " +
    "(stacked trapezoids that narrow by the same step per layer — values never change the shape; draw each layer's corners as shape:'polygon', " +
    "textBox as a centered text (its text is already wrapped; a layer whose label wraps grows taller), valueAnchor / rates[].anchor as left-middle of the number's text)\n" +
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
