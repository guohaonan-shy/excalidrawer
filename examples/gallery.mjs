/**
 * README gallery — one figure per diagram type, rendered into docs/gallery/.
 *
 * Deterministic (every template seeds itself), so re-running only changes the
 * images when the engine changes. Regenerate before a release:
 *
 *   node examples/gallery.mjs
 *
 * Unlike the other examples, these PNGs are committed (see .gitignore) — the
 * README embeds them.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import {
  flowchart, architecture, sequence, timeline, tree,
  render, excalidraw, toPng, validate, autoRegisterCjkFont,
} from "../src/index.mjs";
import { coverage } from "./comparison-figures.mjs";
import { stories, skills, skillsLR } from "./tree-figures.mjs";

const outDir = new URL("../docs/gallery/", import.meta.url).pathname;
mkdirSync(outDir, { recursive: true });

const figures = {
  flowchart: () => flowchart({
    title: "Pull request to production",
    direction: "horizontal",
    nodes: [
      { id: "open", label: "PR opened", type: "start" },
      { id: "ci", label: "CI + review" },
      { id: "ok", label: "Approved?", type: "decision" },
      { id: "merge", label: "Merge to main" },
      { id: "fix", label: "Request changes", color: "red" },
      { id: "ship", label: "Deploy", type: "end" },
    ],
    edges: [
      { from: "open", to: "ci" },
      { from: "ci", to: "ok" },
      { from: "ok", to: "merge", label: "yes" },
      { from: "ok", to: "fix", label: "no" },
      { from: "merge", to: "ship" },
    ],
  }),

  architecture: () => architecture({
    title: "Web app architecture",
    sections: [
      { label: "Clients", color: "blue", items: ["Web app", "iOS app", "Admin console"] },
      { label: "Edge", color: "purple", items: ["CDN", "API gateway"] },
      { label: "Services", color: "green", items: ["Auth", "Orders", "Payments", "Notifications"] },
      { label: "Data", color: "orange", items: ["Postgres", "Redis", "Object storage"] },
    ],
    connections: [
      { from: "Web app", to: "CDN" },
      { from: "API gateway", to: "Orders" },
      { from: "Orders", to: "Postgres" },
    ],
  }),

  sequence: () => sequence({
    title: "OAuth authorization code flow",
    actors: [{ label: "User" }, { label: "App" }, { label: "Auth server" }, { label: "API" }],
    steps: [
      { actor: "App", from: "User", text: "Sign in" },
      { actor: "Auth server", from: "App", text: "Redirect to /authorize" },
      { actor: "App", from: "Auth server", text: "Authorization code", style: "dashed" },
      { actor: "Auth server", from: "App", text: "Exchange code for token" },
      { actor: "App", from: "Auth server", text: "Access token", style: "dashed" },
      { actor: "API", from: "App", text: "GET /me (Bearer token)" },
      { actor: "App", from: "API", text: "Profile", style: "dashed" },
    ],
  }),

  timeline: () => timeline({
    title: "2026 product roadmap",
    items: [
      { label: "Beta", time: "Q1", desc: "Invite-only, 200 teams" },
      { label: "Public launch", time: "Q2", desc: "Self-serve signup" },
      { label: "Teams plan", time: "Q3", desc: "SSO + shared workspaces" },
      { label: "API", time: "Q4", desc: "Public REST API + webhooks" },
    ],
  }),

  comparison: coverage, // sugar — rendered through render()

  "tree-right": () => tree(skillsLR),
  "tree-down": () => tree(skills),
  "tree-cjk": () => tree(stories),
};

for (const [name, build] of Object.entries(figures)) {
  const els = build();
  const isSugar = els.some((e) => e.shape);
  let png, warnings;
  if (isSugar) {
    const out = await render(els, { formats: ["png"], scale: 2 });
    png = out.outputs.png;
    warnings = out.warnings;
  } else {
    autoRegisterCjkFont(els);
    png = await toPng(els, 2);
    warnings = validate(els);
  }
  writeFileSync(`${outDir}${name}.png`, png);
  console.log(`${name}.png — ${warnings.length ? `${warnings.length} warning(s): ${warnings.map((w) => w.code).join(", ")}` : "lint clean"}`);
}
