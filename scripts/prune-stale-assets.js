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
  // Agents deleted in v6.17.0 because a skill of the same name owns the content.
  // The same old-install gap applies to them as to the block below.
  "api-tester.md",
  "code-reviewer.md",
  "database-schema-designer.md",
  "dotnet-coding-standards.md",
  "fullstack-coding-standards.md",
  "wpf-coding-standards.md",
  // Reference agents deleted in 2026-10: none was installed, read by a skill or
  // spawned after the entrypoint-only runtime (v5.0.0). Installs older than v5.0.0
  // may still register them, and the source-based disable pass can no longer
  // see them once the sources are gone.
  "ai-ml.md",
  "api-comparator.md",
  "architect.md",
  "ascii-ui-mockup-generator.md",
  "backend-dotnet.md",
  "backend-spring.md",
  "bilingual-dev.md",
  "codebase-pattern-finder.md",
  "database-mysql.md",
  "database-postgresql.md",
  "debugger.md",
  "desktop-wpf.md",
  "documentation.md",
  "explore-agent.md",
  "feature-tracker.md",
  "frontend-react.md",
  "mermaid-diagram-specialist.md",
  "migration-helper.md",
  "naming-conventions.md",
  "performance-engineer.md",
  "python-fastapi-guidelines.md",
  "python-spec.md",
  "qa-engineer.md",
  "qa-writer.md",
  "react-best-practices.md",
  "security-reviewer.md",
  "spec-interviewer.md",
  "stitch-developer.md",
  "tdd-coach.md",
  "typescript-spec.md",
  "ui-ux-designer.md",
  "web-preview-guide.md",
  "writing-guidelines.md",
  "writing-specialist.md",
  // The last two compatibility prompts were deleted with the custom-agent
  // install pipeline; their skills already held the delegation rules.
  "chronos-worker.md",
  "gotcha-analyzer.md",
];

// Left behind by the removed custom-agent install pipeline. The catalog is
// deleted only when it carries the generator's own header; the shared
// references directory is moved like any other stale agent asset.
const STALE_AGENT_SUPPORT_DIRS = ["references"];
const STALE_GENERATED_FILES = [".claude-agents-sync-manifest.json"];
const LEGACY_AGENTS_CATALOG = "AGENTS-CATALOG.md";
const LEGACY_CATALOG_MARKER = "설치 과정에서 자동 생성됩니다";

const STALE_SKILL_DIRS = [
  "deploy-server",
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
  for (const name of STALE_AGENT_SUPPORT_DIRS) {
    const movedTo = moveToBackup(path.join(agentsDir, name), backupRoot, "agents");
    if (movedTo) moved.push({ kind: "agent-support", name, path: movedTo });
  }
  try {
    if (fs.existsSync(agentsDir) && fs.readdirSync(agentsDir).length === 0) {
      fs.rmdirSync(agentsDir);
    }
  } catch {
    // A directory holding the user's own agents must remain.
  }

  for (const name of STALE_GENERATED_FILES) {
    const target = path.join(root, name);
    if (!fs.existsSync(target)) continue;
    fs.rmSync(target, { force: true });
    moved.push({ kind: "generated", name, path: null });
  }
  const catalog = path.join(root, LEGACY_AGENTS_CATALOG);
  if (fs.existsSync(catalog) && fs.readFileSync(catalog, "utf8").includes(LEGACY_CATALOG_MARKER)) {
    fs.rmSync(catalog, { force: true });
    moved.push({ kind: "generated", name: LEGACY_AGENTS_CATALOG, path: null });
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

  console.log(`[prune-stale] ${label}cleaned ${result.moved.length} stale assets (moved ones are in ${result.backupRoot})`);
  for (const item of result.moved) {
    console.log(`  - ${item.kind}: ${item.name}${item.path ? "" : " (deleted, generated)"}`);
  }
}

if (require.main === module) {
  runCli();
}

module.exports = {
  STALE_AGENT_FILES,
  STALE_AGENT_SUPPORT_DIRS,
  STALE_GENERATED_FILES,
  STALE_SKILL_DIRS,
  pruneStaleAssets,
};
