import { writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";

import { defineTool } from "./schema.mjs";
import { render, ElementValidationError, VALID_FORMATS } from "../render.mjs";

export const renderDiagram = defineTool({
  name: "render_diagram",
  description:
    "Render an array of Excalidraw elements to .excalidraw / .svg / .png files. " +
    "This is the terminal step of diagram creation — call it once you have a " +
    "complete element array. Elements use the raw Excalidraw schema; each needs " +
    "at minimum a unique string `id` and a string `type` (rectangle, diamond, " +
    'ellipse, text, arrow). Use `compute_layout` first if you need help placing ' +
    "elements (grids, chains, swimlanes, hub-and-spoke, edge anchors, routing). " +
    "On invalid input it returns { error, issues } listing each problem by " +
    "element index — fix those and call again.",
  params: {
    elements: {
      type: "array",
      items: "object",
      required: true,
      description: "Raw Excalidraw element objects (may be nested arrays; flattened automatically).",
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
      if (e instanceof ElementValidationError) {
        return { error: e.message, issues: e.issues };
      }
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
