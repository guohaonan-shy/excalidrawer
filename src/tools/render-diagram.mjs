import { writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";

import { defineTool } from "./schema.mjs";
import { render, VALID_FORMATS } from "../render.mjs";

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
    "element index — fix and retry.",
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
    scale: {
      type: "number",
      min: 1,
      max: 4,
      default: 2,
      description: "PNG pixel scale multiplier (1–4). Ignored for svg/excalidraw.",
    },
  },
  async run(args) {
    let result;
    try {
      result = await render(args.elements, { formats: args.formats, scale: args.scale });
    } catch (e) {
      // ElementValidationError and SugarError both carry `.issues`.
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
    return { written, elementCount: result.elementCount };
  },
});
