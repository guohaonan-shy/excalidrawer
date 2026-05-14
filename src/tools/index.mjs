/**
 * Tool registry — single source of truth for the CLI and MCP surfaces.
 *
 * CORE_TOOLS ships in 0.5.6. EXTENDED_TOOLS is reserved for 0.5.8+
 * (mid-granularity tools added on demand) and keeps the default schema
 * token cost low.
 */

import { renderDiagram } from "./render-diagram.mjs";
import { computeLayout } from "./compute-layout.mjs";

export { defineTool, toJsonSchema, parseArgs } from "./schema.mjs";

export const CORE_TOOLS = [renderDiagram, computeLayout];
export const EXTENDED_TOOLS = [];

/** All tools combined — consumed by both src/mcp.mjs and src/cli.mjs. */
export const ALL_TOOLS = [...CORE_TOOLS, ...EXTENDED_TOOLS];

/** Look up a tool by name. */
export function getTool(name) {
  return ALL_TOOLS.find((t) => t.name === name);
}
