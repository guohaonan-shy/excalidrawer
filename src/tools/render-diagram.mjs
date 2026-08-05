import { writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";

import { defineTool } from "./schema.mjs";
import { render, VALID_FORMATS } from "../render.mjs";
import { presetIds, presetToCanvas } from "../presets/index.mjs";

export const renderDiagram = defineTool({
  name: "render_diagram",
  description:
    "Render an array of diagram elements to .excalidraw / .svg / .png files. " +
    "The terminal step of diagram creation.\n" +
    "Elements use the sugar shorthand:\n" +
    "  shape:   { shape:'rect'|'diamond'|'ellipse'|'text', id?, at:[x,y], " +
    "size:[w,h], fill?, stroke?, dashed?, text?, textColor?, fontSize? } " +
    "— non-empty `text` auto-binds a centered text child. `stroke` colors the " +
    "border, `textColor` (palette key or #rrggbb) colors the label.\n" +
    "  arrow:   { shape:'arrow', from, to, fromSide?, toSide?, fromT?, toT?, " +
    "via?, head?:'arrow'|'none', dashed?, labelT?, text? } " +
    "— id-anchored arrows auto-route orthogonally (straight / L-bend / Z-route). " +
    "`via:'above'|'below'|'left'|'right'` gives a U-route detour. " +
    "Escape hatch: { shape:'arrow', at:[x,y], points:[[dx,dy]...] }.\n" +
    "Raw Excalidraw elements also pass through; missing base fields are filled in. " +
    "Use `compute_layout` for geometry (grids, chains, swimlanes, hub-and-spoke, " +
    "edge anchors, U-routing, label anchors). " +
    "On invalid input it returns { error, issues } listing each problem by " +
    "element index — fix and retry. " +
    "On success it returns { written, elementCount, warnings? }. `warnings` is a " +
    "non-fatal quality lint (text overflow, shape overlap, degenerate arrows); " +
    "each has { code, ids, message }. Treat a non-empty `warnings` as NOT DONE — " +
    "fix the flagged elements and re-render until it is absent.\n" +
    "Pass `canvas` when the image must come out at a specific size (a social " +
    "cover, a slide, a print page) instead of being sized by its content. " +
    "Lay the diagram out FOR that shape — a wide flow forced into a 3:4 cover " +
    "gets scaled down until it is unreadable, which is what CANVAS_UNDERFILL " +
    "and TEXT_TOO_SMALL report.",
  params: {
    elements: {
      type: "array",
      items: "object",
      required: true,
      description: "Sugar shorthand or raw Excalidraw elements (may be nested; flattened). Sugar elements carry a `shape` field; raw elements pass through with missing base fields auto-filled.",
    },
    output: {
      type: "string",
      required: true,
      description: "Output path WITHOUT extension, e.g. ./docs/auth-flow — one file per format is written alongside it.",
    },
    formats: {
      type: "array",
      items: "string",
      description: `Subset of [${VALID_FORMATS.join(", ")}]. Omit for all three. svg suits Markdown/GitHub, png suits slides/Notion, excalidraw is editable.`,
    },
    canvas: {
      type: "object",
      description:
        "Fixed output size for svg/png. Omit for content-sized output (the default). " +
        `Either { preset } — one of: ${presetIds().join(", ")} — or explicit ` +
        "{ width, height } / { ratio, width } / { ratio, height } (ratio like \"3:4\"). " +
        "Optional: padding (default 6% of the short edge), safe { top,right,bottom,left } " +
        "for platform UI that covers the image, fit ('contain' scales to fit — default; " +
        "'pad' only ever shrinks; 'none' keeps 1:1), align ('center' default, or " +
        "top/bottom/left/right/top-left/...), background (hex, or 'transparent'). " +
        "Explicit fields override the preset's. The .excalidraw output keeps the " +
        "authored coordinates either way.",
    },
    scale: {
      type: "number",
      min: 1,
      max: 4,
      description:
        "PNG multiplier. With `canvas` the pixel size is already exact, so this " +
        "defaults to 1 and only matters for supersampling; without one it defaults " +
        "to 2 (retina). Ignored for svg/excalidraw.",
    },
  },
  async run(args) {
    // Resolve a platform preset into plain geometry before the engine sees it.
    // Explicitly-passed fields win over the preset's.
    let canvas = args.canvas;
    let presetNote;
    if (canvas && canvas.preset != null) {
      const { preset, ...explicit } = canvas;
      try {
        const resolved = presetToCanvas(preset);
        presetNote = resolved.note;
        canvas = { ...resolved.canvas, ...explicit };
      } catch (e) {
        return { error: e.message };
      }
    }

    let result;
    try {
      result = await render(args.elements, { formats: args.formats, scale: args.scale, canvas });
    } catch (e) {
      // ElementValidationError, SugarError and CanvasError all carry `.issues`.
      if (Array.isArray(e.issues)) return { error: e.message, issues: e.issues };
      return { error: e.message };
    }

    mkdirSync(dirname(args.output) || ".", { recursive: true });
    const written = [];
    for (const [fmt, content] of Object.entries(result.outputs)) {
      const ext = fmt === "excalidraw" ? "excalidraw" : fmt;
      const path = `${args.output}.${ext}`;
      writeFileSync(path, content);
      written.push(path);
    }
    const out = { written, elementCount: result.elementCount };
    if (result.canvas) out.canvas = result.canvas;
    if (presetNote) out.note = presetNote;
    if (result.warnings && result.warnings.length > 0) {
      out.warnings = result.warnings;
    }
    return out;
  },
});
