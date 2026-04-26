#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

const STALE_AGENT_FILES = [
  "MEMORY.md",
  "analyzer.md",
  "code-review-checklist.md",
  "communication-excellence-coach.md",
  "fullstack-development-workflow.md",
  "general-purpose.md",
  "humanizer-guidelines.md",
  "react-useeffect-guidelines.md",
  "reducing-entropy.md",
  "web-preview-development.md",
];

const STALE_SKILL_DIRS = [
  "multi-ai-orchestration",
  "pmworker",
  "qa-test-planner",
  "reducing-entropy",
  "stitch-design-md",
  "stitch-enhance-prompt",
  "stitch-loop",
  "stitch-react",
  "workpm-mcp",
];

function timestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function uniquePath(targetPath) {
  if (!fs.existsSync(targetPath)) return targetPath;
  const parsed = path.parse(targetPath);
  for (let i = 2; i < 1000; i++) {
    const candidate = path.join(parsed.dir, `${parsed.name}-${i}${parsed.ext}`);
    if (!fs.existsSync(candidate)) return candidate;
  }
  throw new Error(`Could not allocate backup path for ${targetPath}`);
}

function moveToBackup(src, backupRoot, subdir) {
  if (!fs.existsSync(src)) return null;
  const destDir = path.join(backupRoot, subdir);
  ensureDir(destDir);
  const dest = uniquePath(path.join(destDir, path.basename(src)));
  try {
    fs.renameSync(src, dest);
  } catch {
    fs.cpSync(src, dest, { recursive: true, force: true });
    fs.rmSync(src, { recursive: true, force: true });
  }
  return dest;
}

function pruneStaleAssets(rootDir, options = {}) {
  const root = path.resolve(rootDir);
  const backupBase = options.backupBase
    ? path.resolve(options.backupBase)
    : path.join(root, "_pruned-stale-olympus");
  const backupRoot = path.join(backupBase, timestamp(options.now));
  const moved = [];

  const agentsDir = path.join(root, "agents");
  for (const name of STALE_AGENT_FILES) {
    const movedTo = moveToBackup(path.join(agentsDir, name), backupRoot, "agents");
    if (movedTo) moved.push({ kind: "agent", name, path: movedTo });
  }

  const skillsDir = path.join(root, "skills");
  for (const name of STALE_SKILL_DIRS) {
    const movedTo = moveToBackup(path.join(skillsDir, name), backupRoot, "skills");
    if (movedTo) moved.push({ kind: "skill", name, path: movedTo });
  }

  return { root, backupRoot, moved };
}

function parseArgs(argv) {
  const args = [...argv];
  const root = args.shift();
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--backup-base" && args[i + 1]) {
      options.backupBase = args[++i];
    } else if (arg === "--label" && args[i + 1]) {
      options.label = args[++i];
    }
  }
  return { root, options };
}

function runCli() {
  const { root, options } = parseArgs(process.argv.slice(2));
  if (!root) {
    console.error("Usage: node scripts/prune-stale-assets.js <install-root> [--label <name>]");
    process.exit(1);
  }

  const result = pruneStaleAssets(root, options);
  const label = options.label ? `${options.label}: ` : "";
  if (result.moved.length === 0) {
    console.log(`[prune-stale] ${label}no stale assets found`);
    return;
  }

  console.log(`[prune-stale] ${label}moved ${result.moved.length} stale assets to ${result.backupRoot}`);
  for (const item of result.moved) {
    console.log(`  - ${item.kind}: ${item.name}`);
  }
}

if (require.main === module) {
  runCli();
}

module.exports = {
  STALE_AGENT_FILES,
  STALE_SKILL_DIRS,
  pruneStaleAssets,
};
