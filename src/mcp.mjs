#!/usr/bin/env node

/**
 * excalidrawer-mcp — Model Context Protocol server (stdio transport).
 *
 * A thin protocol adapter: it does no business logic of its own. Every tool
 * is pulled from the shared registry in src/tools/, the same registry the
 * CLI uses, so the two public surfaces never drift.
 *
 * Run:  excalidrawer-mcp
 * Register in an MCP client with command "excalidrawer-mcp" (or
 * "npx excalidrawer excalidrawer-mcp").
 */

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { ALL_TOOLS, toJsonSchema, parseArgs, getTool } from "./tools/index.mjs";

const PKG_VERSION = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "package.json"), "utf-8")
).version;

const server = new Server(
  { name: "excalidrawer", version: PKG_VERSION },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: ALL_TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: toJsonSchema(t.params),
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const tool = getTool(req.params.name);
  if (!tool) {
    return {
      content: [{ type: "text", text: `Unknown tool: ${req.params.name}` }],
      isError: true,
    };
  }
  try {
    const args = parseArgs(tool.params, req.params.arguments || {});
    const result = await tool.run(args);
    const isError = !!(result && typeof result === "object" && "error" in result);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      isError,
    };
  } catch (e) {
    return {
      content: [{ type: "text", text: `Error: ${e.message}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
