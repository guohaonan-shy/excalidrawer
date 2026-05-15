#!/usr/bin/env node

/**
 * excalidrawer CLI
 *
 * Two eras of commands share this binary:
 *   - render / compute-layout  — registry-backed (src/tools/), the supported
 *     surface going forward. Same tool definitions the MCP server uses.
 *   - generate -t <type>       — legacy template path. Still works through
 *     the 0.5.x line; removed in 0.6.0.
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

import { timeline, flowchart, architecture, sequence } from "./templates/index.mjs";
import { excalidraw } from "./elements.mjs";
import { toSvg, toPng } from "./export.mjs";
import { getTool, parseArgs as parseToolArgs } from "./tools/index.mjs";

const TEMPLATES = { timeline, flowchart, architecture, sequence };

const PKG_VERSION = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "package.json"), "utf-8")
).version;

function usage() {
  console.log(`
excalidrawer — generate Excalidraw diagrams

Usage:
  excalidrawer render --input <file> --output <path> [--format <formats>] [--scale <n>]
  excalidrawer compute-layout --helper <name> [--args <json|file>]
  excalidrawer generate --type <type> [--input <file>] --output <path>   (legacy)

Commands:
  render          Render raw Excalidraw elements to files
  compute-layout  Compute coordinates from a layout helper (prints JSON)
  generate        Generate a diagram from a built-in template (legacy)
  types           List available template types

Options:
  --input, -i     Input JSON file (reads stdin if omitted)
  --output, -o    Output path without extension (e.g. ./docs/diagram)
  --format, -f    Comma-separated formats: excalidraw,svg,png (default: all)
  --scale         PNG pixel scale 1-4 (default: 2)
  --helper        Layout helper name (for compute-layout)
  --args, -a      JSON args object or file path (for compute-layout)
  --type, -t      Template type (for generate)
  --seed, -s      Seed for deterministic IDs (generate only)
  --version, -v   Print package version and exit
  --help, -h      Print this help and exit

Examples:
  excalidrawer render -i elements.json -o ./docs/diagram
  cat elements.json | excalidrawer render -o ./docs/diagram -f svg,png
  excalidrawer compute-layout --helper gridLayout -a '{"count":6,"cols":3,"cellW":140,"cellH":50}'
  excalidrawer generate -t timeline -i data.json -o ./docs/timeline
`.trim());
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--type" || a === "-t") args.type = argv[++i];
    else if (a === "--input" || a === "-i") args.input = argv[++i];
    else if (a === "--output" || a === "-o") args.output = argv[++i];
    else if (a === "--format" || a === "-f") args.format = argv[++i];
    else if (a === "--scale") args.scale = Number(argv[++i]);
    else if (a === "--helper") args.helper = argv[++i];
    else if (a === "--args" || a === "-a") args.argsJson = argv[++i];
    else if (a === "--seed" || a === "-s") args.seed = Number(argv[++i]);
    else if (a === "--help" || a === "-h") args.help = true;
    else if (a === "--version" || a === "-v") args.version = true;
    else if (!args.command) args.command = a;
  }
  return args;
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf-8");
}

function parseJson(raw, label) {
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Error: invalid JSON ${label}`);
    console.error(e.message);
    process.exit(1);
  }
}

/** Read --input file or stdin, parse JSON. */
async function readInput(args, label) {
  const raw = args.input ? readFileSync(args.input, "utf-8") : await readStdin();
  return parseJson(raw, label);
}

// ---------------------------------------------------------------------------
// render — registry-backed
// ---------------------------------------------------------------------------

async function cmdRender(args) {
  if (!args.output) {
    console.error("Error: --output is required");
    process.exit(1);
  }
  const input = await readInput(args, "input");
  // Accept either a bare array or { elements: [...] }.
  const elements = Array.isArray(input) ? input : input.elements;

  const tool = getTool("render_diagram");
  const toolArgs = parseToolArgs(tool.params, {
    elements,
    output: args.output,
    formats: args.format ? args.format.split(",").map((f) => f.trim().toLowerCase()) : undefined,
    scale: args.scale,
  });
  const result = await tool.run(toolArgs);

  if (result.error) {
    console.error(`Error: ${result.error}`);
    if (result.issues) for (const iss of result.issues) console.error(`  - ${iss}`);
    process.exit(1);
  }
  for (const path of result.written) console.log(`  ✓ ${path}`);
  console.log("Done!");
}

// ---------------------------------------------------------------------------
// compute-layout — registry-backed
// ---------------------------------------------------------------------------

async function cmdComputeLayout(args) {
  if (!args.helper) {
    console.error("Error: --helper is required");
    process.exit(1);
  }
  let helperArgs = {};
  if (args.argsJson) {
    // --args is either an inline JSON string or a file path.
    const looksLikeJson = args.argsJson.trim().startsWith("{");
    const raw = looksLikeJson ? args.argsJson : readFileSync(args.argsJson, "utf-8");
    helperArgs = parseJson(raw, "for --args");
  } else if (!process.stdin.isTTY) {
    helperArgs = await readInput(args, "for --args");
  }

  const tool = getTool("compute_layout");
  const toolArgs = parseToolArgs(tool.params, { helper: args.helper, args: helperArgs });
  const result = await tool.run(toolArgs);

  if (result.error) {
    console.error(`Error: ${result.error}`);
    process.exit(1);
  }
  console.log(JSON.stringify(result.result, null, 2));
}

// ---------------------------------------------------------------------------
// generate — legacy template path
// ---------------------------------------------------------------------------

async function cmdGenerate(args) {
  console.error(
    "warning: `generate -t <type>` is deprecated and will be removed in 0.6.0. " +
    "Migrate to `render` with sugar or raw elements (see README)."
  );
  if (!args.type) {
    console.error("Error: --type is required");
    process.exit(1);
  }
  if (!args.output) {
    console.error("Error: --output is required");
    process.exit(1);
  }
  const templateFn = TEMPLATES[args.type];
  if (!templateFn) {
    console.error(`Unknown diagram type: "${args.type}". Available: ${Object.keys(TEMPLATES).join(", ")}`);
    process.exit(1);
  }

  const data = await readInput(args, "input");

  const REQUIRED_FIELDS = {
    timeline: ["items"],
    flowchart: ["nodes", "edges"],
    architecture: ["sections"],
    sequence: ["actors", "steps"],
  };
  const missing = (REQUIRED_FIELDS[args.type] || []).filter((f) => !data[f] || !Array.isArray(data[f]));
  if (missing.length > 0) {
    console.error(`Error: input JSON missing required field(s): ${missing.join(", ")}`);
    process.exit(1);
  }

  const opts = {};
  if (args.seed != null) opts.seed = args.seed;
  const elements = templateFn(data, opts);

  const VALID_FORMATS = new Set(["excalidraw", "svg", "png"]);
  const formats = args.format
    ? args.format.split(",").map((f) => f.trim().toLowerCase())
    : ["excalidraw", "svg", "png"];
  const unknown = formats.filter((f) => !VALID_FORMATS.has(f));
  if (unknown.length > 0) {
    console.error(`Error: unknown format(s): ${unknown.join(", ")}. Valid: excalidraw, svg, png`);
    process.exit(1);
  }

  mkdirSync(dirname(args.output), { recursive: true });
  for (const fmt of formats) {
    if (fmt === "excalidraw") {
      writeFileSync(`${args.output}.excalidraw`, excalidraw(elements));
      console.log(`  ✓ ${args.output}.excalidraw`);
    } else if (fmt === "svg") {
      writeFileSync(`${args.output}.svg`, toSvg(elements));
      console.log(`  ✓ ${args.output}.svg`);
    } else if (fmt === "png") {
      const png = await toPng(elements, 2);
      writeFileSync(`${args.output}.png`, png);
      console.log(`  ✓ ${args.output}.png`);
    }
  }
  console.log("Done!");
}

// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.version) {
    console.log(PKG_VERSION);
    process.exit(0);
  }
  if (args.help || !args.command) {
    usage();
    process.exit(args.help ? 0 : 1);
  }

  switch (args.command) {
    case "render":
      return cmdRender(args);
    case "compute-layout":
      return cmdComputeLayout(args);
    case "generate":
      return cmdGenerate(args);
    case "types":
      console.log("Available template types:");
      for (const name of Object.keys(TEMPLATES)) console.log(`  - ${name}`);
      process.exit(0);
      break;
    default:
      console.error(`Unknown command: ${args.command}`);
      usage();
      process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
