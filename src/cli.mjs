#!/usr/bin/env node

/**
 * excalidrawer CLI
 *
 * Usage:
 *   excalidrawer generate --type timeline --input data.json --output ./out/diagram
 *   echo '{ ... }' | excalidrawer generate --type timeline --output ./out/diagram
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";
import { timeline, flowchart, architecture } from "./templates/index.mjs";
import { excalidraw } from "./elements.mjs";
import { toSvg, toPng } from "./export.mjs";

const TEMPLATES = { timeline, flowchart, architecture };

function usage() {
  console.log(`
excalidrawer — generate diagrams from JSON data

Usage:
  excalidrawer generate --type <type> [--input <file>] --output <path> [--format <formats>] [--seed <n>]

Commands:
  generate    Generate a diagram from JSON input
  types       List available diagram types

Options:
  --type, -t      Diagram type (e.g. timeline)
  --input, -i     Input JSON file (reads stdin if omitted)
  --output, -o    Output path without extension (e.g. ./docs/timeline)
  --format, -f    Comma-separated formats: excalidraw,svg,png (default: all)
  --seed, -s      Seed for deterministic IDs (default: auto)

Examples:
  excalidrawer generate -t timeline -i data.json -o ./docs/timeline
  cat data.json | excalidrawer generate -t timeline -o ./docs/timeline
  excalidrawer generate -t timeline -i data.json -o ./out -f svg,png
  excalidrawer types
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
    else if (a === "--seed" || a === "-s") args.seed = Number(argv[++i]);
    else if (a === "--help" || a === "-h") args.help = true;
    else if (!args.command) args.command = a;
  }
  return args;
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf-8");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.command) {
    usage();
    process.exit(args.help ? 0 : 1);
  }

  if (args.command === "types") {
    console.log("Available diagram types:");
    for (const name of Object.keys(TEMPLATES)) {
      console.log(`  - ${name}`);
    }
    process.exit(0);
  }

  if (args.command !== "generate") {
    console.error(`Unknown command: ${args.command}`);
    usage();
    process.exit(1);
  }

  // Validate required args
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

  // Read input data
  let raw;
  if (args.input) {
    raw = readFileSync(args.input, "utf-8");
  } else {
    raw = await readStdin();
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error("Error: Invalid JSON input");
    console.error(e.message);
    process.exit(1);
  }

  // Generate elements
  const opts = {};
  if (args.seed != null) opts.seed = args.seed;
  const elements = templateFn(data, opts);

  // Determine formats
  const formats = args.format
    ? args.format.split(",").map((f) => f.trim())
    : ["excalidraw", "svg", "png"];

  // Ensure output directory exists
  mkdirSync(dirname(args.output), { recursive: true });

  // Write outputs
  for (const fmt of formats) {
    switch (fmt) {
      case "excalidraw":
        writeFileSync(`${args.output}.excalidraw`, excalidraw(elements));
        console.log(`  ✓ ${args.output}.excalidraw`);
        break;
      case "svg":
        writeFileSync(`${args.output}.svg`, toSvg(elements));
        console.log(`  ✓ ${args.output}.svg`);
        break;
      case "png": {
        const png = await toPng(elements, 2);
        writeFileSync(`${args.output}.png`, png);
        console.log(`  ✓ ${args.output}.png`);
        break;
      }
      default:
        console.error(`Unknown format: ${fmt}`);
    }
  }

  console.log("Done!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
