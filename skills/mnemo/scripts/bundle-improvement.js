"use strict";

// Mnemo owns these procedures; no shared skill library is required.
const fs = require("node:fs");
const path = require("node:path");

function improvementFiles(sourceDir) {
  const common = fs.existsSync(path.join(sourceDir, "references/self-improvement.md"))
    ? sourceDir : path.join(sourceDir, "../mnemo");
  const files = [
    [path.join(common, "references/self-improvement.md"), "references/self-improvement.md"],
    [path.join(common, "references/project-storage.md"), "references/project-storage.md"],
    [path.join(common, "references/handoff-memory.md"), "references/handoff-memory.md"],
    [path.join(common, "references/project-skill-improvement.md"), "references/project-skill-improvement.md"],
    [path.join(common, "references/session-learning.md"), "references/session-learning.md"],
    [path.join(common, "references/project-skill-evaluation.md"), "references/project-skill-evaluation.md"],
    [__filename, "scripts/bundle-improvement.js"],
    [path.join(sourceDir, "SKILL.md"), "SKILL.md"],
  ];
  // Fail before creating a partial package when a required module is missing.
  for (const [file] of files) {
    if (!fs.statSync(file).isFile()) throw new Error(`Missing Mnemo dependency: ${file}`);
  }
  return files;
}

function bundleImprovement(sourceDir, destDir) {
  const files = improvementFiles(sourceDir);
  for (const [source, relative] of files) {
    const dest = path.join(destDir, relative);
    if (path.resolve(source) === path.resolve(dest)) continue;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(source, dest);
  }
}

module.exports = { bundleImprovement, improvementFiles };
