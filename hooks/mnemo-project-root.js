#!/usr/bin/env node
"use strict";

// Shared path contract for the Claude and Codex hooks. Stored markers contain
// no absolute path, so a project and its history can move together.
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");

function forbidden(candidate) {
  const root = path.resolve(candidate);
  const key = root.toLowerCase();
  if (root === path.parse(root).root || key === path.resolve(os.homedir()).toLowerCase()) return true;
  if (/(?:^|[\\/])\.(?:claude|codex|gemini|grok)(?:[\\/]|$)/i.test(root)) return true;
  const excluded = [os.tmpdir(), process.env.TEMP, process.env.TMP,
    process.env.CLAUDE_CONFIG_DIR, process.env.CLAUDE_HOME, process.env.CODEX_HOME,
    process.env.ANTIGRAVITY_HOME, process.env.GEMINI_HOME, process.env.GEMINI_CLI_HOME,
    process.env.GROK_HOME, process.env.GROK_CONFIG_DIR].filter(Boolean);
  return excluded.some((value) => {
    const base = path.resolve(value).toLowerCase();
    return key === base || key.startsWith(base + path.sep);
  });
}

function resolveRoot(candidate, explicit = false) {
  if (process.platform === "win32" && typeof candidate === "string") {
    candidate = candidate.replace(/^\/([a-z])\//i, "$1:/");
    if (!/^(?:[a-z]:[\\/]|\\\\[^\\]+\\[^\\]+)/i.test(candidate)) return null;
  }
  if (typeof candidate !== "string" || !path.isAbsolute(candidate) || forbidden(candidate)) return null;
  let start = path.resolve(candidate);
  if (!fs.existsSync(start) || !fs.statSync(start).isDirectory()) return null;
  // An unrelated outer marker must never capture an independent Git project.
  try {
    const gitRoot = execFileSync("git", ["-C", start, "rev-parse", "--show-toplevel"], {
      encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 3000,
    }).trim();
    if (gitRoot && !forbidden(gitRoot)) return path.resolve(gitRoot);
  } catch { /* A non-Git project uses its supplied workspace boundary. */ }
  if (!explicit) {
    for (let current = start; !forbidden(current); current = path.dirname(current)) {
      const marker = path.join(current, ".mnemo-root");
      if (fs.existsSync(marker) && fs.statSync(marker).isFile()) return current;
      const parent = path.dirname(current);
      if (parent === current) break;
    }
    // Preserve the existing build-output use case without treating arbitrary
    // ancestor memory files as project metadata.
    const match = start.match(/^(.*?)[\\/](?:bin|obj|dist|build|out|target|node_modules)(?:[\\/]|$)/i);
    if (match && !forbidden(match[1]) && fs.existsSync(match[1])) start = match[1];
  }
  return start;
}

function resolveClaude(payload) {
  const workspace = payload.project_root || payload.workspace_root || process.env.CLAUDE_PROJECT_DIR;
  if (workspace) return resolveRoot(workspace, true);
  if (payload.cwd) return resolveRoot(payload.cwd);
  // Transcript metadata is a fallback, never the lossy encoded directory name.
  if (payload.transcript_path && fs.existsSync(payload.transcript_path)) {
    for (const line of fs.readFileSync(payload.transcript_path, "utf8").split(/\r?\n/)) {
      try {
        const record = JSON.parse(line);
        if (record.cwd) return resolveRoot(record.cwd);
      } catch { /* A partial JSONL record is not a workspace declaration. */ }
    }
  }
  return null;
}

if (require.main === module) {
  let resolved = null;
  try {
    resolved = process.argv[2] === "--claude"
      ? resolveClaude(JSON.parse(fs.readFileSync(0, "utf8").replace(/^\uFEFF+/, "")))
      : resolveRoot(process.argv[2], process.argv[3] === "--explicit");
  } catch { /* Invalid metadata must not create history in the hook cwd. */ }
  if (resolved) process.stdout.write(resolved);
  else process.exitCode = 2;
}
module.exports = { resolveRoot, resolveClaude, forbidden };
