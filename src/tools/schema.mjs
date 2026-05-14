/**
 * Tool definition schema — single source of truth.
 *
 * Each tool is defined once with `defineTool`. Adapters generate:
 *   - MCP tools (JSON Schema params)  — src/mcp.mjs
 *   - CLI subcommands                 — src/cli.mjs
 * so the CLI and MCP surfaces never drift.
 *
 * A tool's `run(args)` returns a plain JSON-serializable object. A result
 * carrying an `error` string is treated as a structured failure (the agent
 * is expected to read it and retry); anything thrown is an unexpected fault.
 */

/**
 * @typedef {Object} ParamDef
 * @property {"string"|"number"|"boolean"|"object"|"array"} type
 * @property {string} description
 * @property {boolean} [required]
 * @property {unknown} [default]
 * @property {string[]} [enum]
 * @property {number} [min]
 * @property {number} [max]
 * @property {"string"|"number"|"object"} [items]  element type when type==="array"
 */

/**
 * @param {{ name: string, description: string, params: Record<string, ParamDef>, run: (args: object) => object | Promise<object> }} def
 */
export function defineTool(def) {
  return def;
}

/** Convert a tool's params map into a JSON Schema object (for MCP). */
export function toJsonSchema(params) {
  const properties = {};
  const required = [];
  for (const [name, p] of Object.entries(params)) {
    const prop = { type: p.type, description: p.description };
    if (p.enum) prop.enum = p.enum;
    if (p.min != null) prop.minimum = p.min;
    if (p.max != null) prop.maximum = p.max;
    if (p.type === "array") prop.items = { type: p.items || "object" };
    if (p.default !== undefined) prop.default = p.default;
    properties[name] = prop;
    if (p.required) required.push(name);
  }
  return { type: "object", properties, required, additionalProperties: false };
}

/**
 * Validate + fill defaults for an already-typed args object (MCP path: args
 * arrive as typed JSON; CLI path coerces strings before calling this).
 * Throws on missing required, wrong type, or bad enum value.
 */
export function parseArgs(params, raw = {}) {
  const out = {};
  for (const [name, p] of Object.entries(params)) {
    let v = raw[name];
    if (v === undefined || v === null) {
      if (p.required) throw new Error(`missing required argument: ${name}`);
      if (p.default !== undefined) out[name] = p.default;
      continue;
    }
    const ok =
      p.type === "array" ? Array.isArray(v)
      : p.type === "object" ? typeof v === "object" && !Array.isArray(v)
      : typeof v === p.type;
    if (!ok) throw new Error(`argument "${name}" must be ${p.type}, got ${Array.isArray(v) ? "array" : typeof v}`);
    if (p.enum && !p.enum.includes(v)) {
      throw new Error(`argument "${name}" must be one of: ${p.enum.join(", ")}`);
    }
    out[name] = v;
  }
  return out;
}
