/**
 * Basic example: generate a flowchart, export to .excalidraw / .svg / .png
 */

import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

import {
  setSeed, box, diamondBox, arrow, textEl, rect, colors, excalidraw, toSvg, toPng,
} from "../src/index.mjs";

const dir = dirname(fileURLToPath(import.meta.url));

setSeed(100000);

const CY = 120;          // center Y of main flow
const BH = 56;           // box height
const BY = CY - BH / 2; // box top Y

const elements = [
  textEl("title", 20, 12, 600, 28, "User Registration Flow", 22),

  // Steps
  ...box("s1", "s1t", 20,  BY, 130, BH, colors.yellow, "Start", 15),
  arrow("a1", 150, CY, [[0,0],[40,0]]),

  ...box("s2", "s2t", 190, BY, 150, BH, colors.blue, "Enter Email", 14),
  arrow("a2", 340, CY, [[0,0],[40,0]]),

  ...box("s3", "s3t", 380, BY, 155, BH, colors.blue, "Verify Email", 14),
  arrow("a3", 535, CY, [[0,0],[40,0]]),

  ...diamondBox("d1", "d1t", 575, CY - 40, 160, 80, colors.orange, "Valid?", 13),

  // Yes → continue
  arrow("ayes", 735, CY, [[0,0],[40,0]], { strokeColor: colors.strokeGreen }),
  textEl("lyes", 739, CY - 14, 30, 12, "Yes", 10, { strokeColor: colors.strokeGreen }),
  ...box("s4", "s4t", 775, BY, 150, BH, colors.green, "Set Password", 14),
  arrow("a4", 925, CY, [[0,0],[40,0]]),
  ...box("s5", "s5t", 965, BY, 120, BH, colors.green, "Done", 16),

  // No → loop back down
  arrow("ano", 655, CY + 40, [[0,0],[0,60],[-465,60],[-465,-60]], { strokeColor: colors.strokeOrange }),
  textEl("lno", 659, CY + 44, 28, 12, "No", 10, { strokeColor: colors.strokeOrange }),
];

// Write .excalidraw
writeFileSync(join(dir, "basic.excalidraw"), excalidraw(elements));
console.log("basic.excalidraw written");

// Write .svg
writeFileSync(join(dir, "basic.svg"), toSvg(elements));
console.log("basic.svg written");

// Write .png
const png = await toPng(elements, 2);
writeFileSync(join(dir, "basic.png"), png);
console.log("basic.png written");
