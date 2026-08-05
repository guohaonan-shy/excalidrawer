/**
 * Canvas presets — the platform knowledge layer.
 *
 * This module is a LOOKUP TABLE, not part of the rendering engine. Nothing in
 * src/ imports it except the tool layer (src/tools/render-diagram.mjs), which
 * resolves `canvas.preset` into plain geometry before handing it to render().
 * Keeping it out of the engine means:
 *   - platform data can change without touching any rendering logic
 *   - engine tests never depend on what a platform's aspect ratio is today
 *   - a caller that already knows its pixels can ignore this file entirely
 *
 * Data lives in ./social.json. See the `$comment` block there for what each
 * field means and why `safe` starts unverified.
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const DATA = JSON.parse(readFileSync(join(__dirname, "social.json"), "utf-8"));

/** Presets older than this (in months) get a freshness note on use. */
export const STALE_AFTER_MONTHS = 12;

const BY_ID = new Map(DATA.presets.map((p) => [p.id, p]));

/**
 * @param {string} id - preset id, e.g. "xhs:cover"
 * @returns {object|null} the raw preset entry, or null if unknown
 */
export function getPreset(id) {
  return BY_ID.get(id) ?? null;
}

/**
 * @param {string} [platform] - optional filter, e.g. "xiaohongshu"
 * @returns {object[]} preset entries
 */
export function listPresets(platform) {
  return platform ? DATA.presets.filter((p) => p.platform === platform) : [...DATA.presets];
}

/** @returns {string[]} every known preset id, in declaration order. */
export function presetIds() {
  return DATA.presets.map((p) => p.id);
}

/**
 * Months elapsed since a preset was last checked against its platform.
 *
 * @param {object} preset
 * @param {Date} [now] - injectable for tests
 * @returns {number} whole months, or Infinity when the entry carries no date
 */
export function presetAgeMonths(preset, now = new Date()) {
  if (!preset || !preset.verifiedAt) return Infinity;
  const then = new Date(preset.verifiedAt);
  if (Number.isNaN(then.getTime())) return Infinity;
  const months =
    (now.getFullYear() - then.getFullYear()) * 12 + (now.getMonth() - then.getMonth());
  return Math.max(0, months);
}

/**
 * Resolve a preset id into the plain geometry that render() understands.
 *
 * `safe` is only passed through when the entry has been measured on a real
 * device (`safeVerified: true`). An unverified safe area would make the linter
 * warn about a band nobody has confirmed is actually covered — worse than
 * having no safe area at all.
 *
 * @param {string} id
 * @param {Date} [now] - injectable for tests
 * @returns {{ canvas: object, note?: string }}
 * @throws {Error} on an unknown id, listing the valid ones
 */
export function presetToCanvas(id, now = new Date()) {
  const preset = getPreset(id);
  if (!preset) {
    throw new Error(
      `unknown canvas preset: "${id}". Known presets: ${presetIds().join(", ")}`
    );
  }

  const canvas = { width: preset.width, height: preset.height };
  if (preset.safe && preset.safeVerified) canvas.safe = { ...preset.safe };

  const age = presetAgeMonths(preset, now);
  if (age >= STALE_AFTER_MONTHS) {
    const since = Number.isFinite(age) ? `${age} months ago` : "never";
    return {
      canvas,
      note:
        `preset "${id}" was last verified ${since} (${preset.verifiedAt ?? "no date"}). ` +
        `Platform sizes drift — re-check the ratio before publishing.`,
    };
  }

  return { canvas };
}
