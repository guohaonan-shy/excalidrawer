import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// Shared by the skills-* tests (not a test file itself: `node --test tests/*.test.mjs`
// does not pick it up). The entry skills are found by looking at skills/, never by a
// hard-coded list, so a new diagram type is covered by every entry-skill check the
// moment its directory exists.

/**
 * Entry skills = every directory under skillsDir except `steps` that holds a SKILL.md.
 * Returns the directory names, sorted.
 */
export function entrySkillDirs(skillsDir) {
  return readdirSync(skillsDir)
    .filter((n) => n !== "steps")
    .filter((n) => statSync(join(skillsDir, n)).isDirectory())
    .filter((n) => existsSync(join(skillsDir, n, "SKILL.md")))
    .sort();
}
