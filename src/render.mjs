/**
 * render — the dumb serializer.
 *
 * Takes an array of Excalidraw elements (raw schema), validates the minimum
 * shape, and emits the requested serialized formats. It has no concept of
 * "diagram kind" — composition (what a flowchart looks like) lives in
 * skill-side recipes, not here.
 *
 * IO (writing files) is the caller's job; render only produces strings/buffers.
 */

import { excalidraw } from "./elements.mjs";
import { toSvg, toPng } from "./export.mjs";

export const VALID_FORMATS = ["excalidraw", "svg", "png"];

/** Thrown when elements fail minimum-shape validation. Carries `.issues`. */
export class ElementValidationError extends Error {
  constructor(issues) {
    super(`invalid elements: ${issues.length} issue(s)`);
    this.name = "ElementValidationError";
    this.issues = issues;
  }
}

/**
 * Validate the minimum element shape. Returns an array of issue strings;
 * empty array means valid. Each element must be an object with a string
 * `id` and a string `type`.
 */
export function validateElements(elements) {
  const issues = [];
  if (!Array.isArray(elements)) {
    return ["elements must be an array"];
  }
  if (elements.length === 0) {
    return ["elements array is empty"];
  }
  const seen = new Set();
  elements.forEach((el, i) => {
    if (typeof el !== "object" || el === null || Array.isArray(el)) {
      issues.push(`element[${i}]: must be an object`);
      return;
    }
    if (typeof el.id !== "string" || el.id === "") {
      issues.push(`element[${i}]: missing string "id"`);
    } else if (seen.has(el.id)) {
      issues.push(`element[${i}]: duplicate id "${el.id}"`);
    } else {
      seen.add(el.id);
    }
    if (typeof el.type !== "string" || el.type === "") {
      issues.push(`element[${i}] (id=${el.id ?? "?"}): missing string "type"`);
    }
  });
  return issues;
}

/**
 * @param {Array} elements - raw Excalidraw elements (may be nested; flattened)
 * @param {{ formats?: string[], scale?: number }} [opts]
 * @returns {Promise<{ outputs: Record<string,string|Buffer>, formats: string[], elementCount: number }>}
 * @throws {ElementValidationError}
 */
export async function render(elements, opts = {}) {
  const flat = Array.isArray(elements) ? elements.flat(Infinity) : elements;

  const issues = validateElements(flat);
  if (issues.length > 0) throw new ElementValidationError(issues);

  const formats = opts.formats && opts.formats.length ? opts.formats : VALID_FORMATS;
  const unknown = formats.filter((f) => !VALID_FORMATS.includes(f));
  if (unknown.length > 0) {
    throw new Error(`unknown format(s): ${unknown.join(", ")}. Valid: ${VALID_FORMATS.join(", ")}`);
  }

  const scale = opts.scale ?? 2;
  const outputs = {};
  for (const fmt of formats) {
    if (fmt === "excalidraw") outputs.excalidraw = excalidraw(flat);
    else if (fmt === "svg") outputs.svg = toSvg(flat);
    else if (fmt === "png") outputs.png = await toPng(flat, scale);
  }

  return { outputs, formats, elementCount: flat.length };
}
