#!/usr/bin/env node

/**
 * excalidrawer CLI
 *
 * render / compute-layout are registry-backed (src/tools/): the same tool
 * definitions the MCP server uses. The legacy `generate -t <type>` template
 * path was removed in 0.6.0.
 */

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

import { getTool, parseArgs as parseToolArgs } from "./tools/index.mjs";

const PKG_VERSION = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "package.json"), "utf-8")
).version;

function usage() {
  console.log(`
excalidrawer — generate Excalidraw diagrams

Usage:
  excalidrawer render --input <file> --output <path> [--format <formats>] [--scale <n>]
  excalidrawer compute-layout --helper <name> [--args <json|file>]

Commands:
  render          Render raw Excalidraw elements to files
  compute-layout  Compute coordinates from a layout helper (prints JSON)

Options:
  --input, -i     Input JSON file (reads stdin if omitted)
  --output, -o    Output path without extension (e.g. ./docs/diagram)
  --format, -f    Comma-separated formats: excalidraw,svg,png,webp (default: excalidraw,svg,png)
  --scale         Pixel scale 1-4 for png / webp (default: 2)
  --helper        Layout helper name (for compute-layout)
  --args, -a      JSON args object or file path (for compute-layout)
  --version, -v   Print package version and exit
  --help, -h      Print this help and exit

Examples:
  excalidrawer render -i elements.json -o ./docs/diagram
  cat elements.json | excalidrawer render -o ./docs/diagram -f svg,png
  excalidrawer compute-layout --helper gridLayout -a '{"count":6,"cols":3,"cellW":140,"cellH":50}'
`.trim());
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--input" || a === "-i") args.input = argv[++i];
    else if (a === "--output" || a === "-o") args.output = argv[++i];
    else if (a === "--format" || a === "-f") args.format = argv[++i];
    else if (a === "--scale") args.scale = Number(argv[++i]);
    else if (a === "--helper") args.helper = argv[++i];
    else if (a === "--args" || a === "-a") args.argsJson = argv[++i];
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
  printWarnings(result.warnings);
  console.log("Done!");
}

/**
 * Surface the quality lint on stdout's sibling stream. The files are already
 * written (warnings are non-fatal), but a silent CLI made the linter invisible
 * on the fallback path the skills document — so print, and print to stderr so
 * anything parsing stdout keeps working.
 */
function printWarnings(warnings) {
  if (!warnings || warnings.length === 0) return;
  console.error(`  ⚠ ${warnings.length} quality warning(s):`);
  for (const w of warnings) {
    console.error(`    - [${w.code}] ${w.ids.join(", ")}: ${w.message}`);
  }
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
    case "types":
      console.error(
        `Error: \`${args.command}\` was removed in 0.6.0. ` +
        "Use `render` with sugar or raw elements (see README)."
      );
      process.exit(1);
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
