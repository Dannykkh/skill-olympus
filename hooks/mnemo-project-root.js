#!/usr/bin/env node
"use strict";

// Shared path contract for all Mnemo adapters and Python helpers. Markers contain
// no absolute path, so a project and its history can move together.
const fs = require("fs");
const path = require("path");
const os = require("os");

function forbidden(candidate, { allowTemp = false } = {}) {
  const root = path.resolve(candidate);
  const key = root.toLowerCase();
  if (root === path.parse(root).root || key === path.resolve(os.homedir()).toLowerCase()) return true;
  if (/(?:^|[\\/])\.(?:claude|codex|gemini|grok)(?:[\\/]|$)/i.test(root)) return true;
  const excluded = [...(allowTemp ? [] : [os.tmpdir(), process.env.TEMP, process.env.TMP]),
    process.env.CLAUDE_CONFIG_DIR, process.env.CLAUDE_HOME, process.env.CODEX_HOME,
    process.env.ANTIGRAVITY_HOME, process.env.GEMINI_HOME, process.env.GEMINI_CLI_HOME,
    process.env.GROK_HOME, process.env.GROK_CONFIG_DIR].filter(Boolean);
  return excluded.some((value) => {
    const absolute = path.resolve(value);
    const base = (fs.existsSync(absolute) ? fs.realpathSync.native(absolute) : absolute).toLowerCase();
    return key === base || key.startsWith(base + path.sep);
  });
}

function absolutePath(candidate) {
  if (process.platform === "win32" && typeof candidate === "string") {
    candidate = candidate.replace(/^\/([a-z])\//i, "$1:/");
    if (!/^(?:[a-z]:[\\/]|\\\\[^\\]+\\[^\\]+)/i.test(candidate)) return null;
  }
  return typeof candidate === "string" && path.isAbsolute(candidate) ? path.resolve(candidate) : null;
}

function realPath(candidate) {
  if (fs.existsSync(candidate)) return fs.realpathSync.native(candidate);
  // Resolve existing parents too: a missing file below a junction is not local.
  if (fs.lstatSync(candidate, { throwIfNoEntry: false })) throw new Error("dangling link");
  const parent = path.dirname(candidate);
  return parent === candidate ? candidate : path.join(realPath(parent), path.basename(candidate));
}

function contained(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (relative !== ".." && !relative.startsWith(".." + path.sep) && !path.isAbsolute(relative));
}

function validatePath(candidate, options = {}) {
  const absolute = absolutePath(candidate);
  if (!absolute || forbidden(absolute, options)) return null;
  try {
    const resolved = realPath(absolute);
    return forbidden(resolved, options) ? null : resolved;
  } catch { return null; }
}

function storageSafe(root) {
  const visited = new Set();
  function visit(target) {
    const resolved = realPath(target);
    if (!contained(root, resolved)) return false;
    if (!fs.existsSync(resolved) || visited.has(resolved)) return true;
    visited.add(resolved);
    if (!fs.statSync(resolved).isDirectory()) return true;
    return fs.readdirSync(resolved).every((name) => visit(path.join(resolved, name)));
  }
  try {
    return [".mnemo-root", "MEMORY.md", "memory", "conversations", "docs/handoffs"]
      .every((name) => visit(path.join(root, name)));
  } catch { return false; }
}

function resolveRoot(candidate, explicit = false, options = {}) {
  const start = validatePath(candidate, options);
  if (!start) return null;
  if (!fs.existsSync(start)) return options.allowMissing && explicit ? start : null;
  if (!fs.statSync(start).isDirectory()) return null;
  let marker = null;
  let root = null;
  // Walk the actual filesystem: inherited GIT_DIR/GIT_WORK_TREE, a missing Git
  // executable, and safe.directory must not redirect or fragment Mnemo storage.
  for (let current = start; ; current = path.dirname(current)) {
    if (fs.existsSync(path.join(current, ".git"))) {
      root = validatePath(current, options);
      if (!root) return null;
      break;
    }
    if (forbidden(current, options)) break;
    if (!marker && fs.statSync(path.join(current, ".mnemo-root"), { throwIfNoEntry: false })?.isFile()) marker = current;
    if (path.dirname(current) === current) break;
  }
  root ||= explicit ? start : marker;
  return root && storageSafe(root) ? root : null;
}

function resolveWorkspace(payload, workspaceKeys, cwdKeys, environmentRoot) {
  for (const key of workspaceKeys) {
    if (payload[key]) return resolveRoot(payload[key], true);
  }
  const cwd = cwdKeys.map((key) => payload[key]).find(Boolean);
  if (cwd) return resolveRoot(cwd);
  // A hint cannot promote an unmarked launcher/ancestor into a workspace.
  return environmentRoot ? resolveRoot(environmentRoot) : null;
}

function resolveClaude(payload) {
  if (payload.project_root || payload.workspace_root || payload.cwd || process.env.CLAUDE_PROJECT_DIR) {
    return resolveWorkspace(payload, ["project_root", "workspace_root"], ["cwd"], process.env.CLAUDE_PROJECT_DIR);
  }
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

function resolveCodex(payload) {
  return resolveWorkspace(payload, ["project-root", "project_root", "workspace-root", "workspace_root"],
    ["cwd", "working-directory", "working_directory"], process.env.CODEX_WORKSPACE_ROOT);
}

function resolveGrok(payload) {
  return resolveWorkspace(payload, ["workspaceRoot"], ["cwd"]);
}

function resolveAntigravity(payload) {
  if (payload.workspacePath) return resolveRoot(payload.workspacePath, true);
  if (Array.isArray(payload.workspacePaths) && payload.workspacePaths.length) {
    const roots = [...new Set(payload.workspacePaths.map((value) => resolveRoot(value, true)).filter(Boolean))];
    if (payload.workspacePaths.length === 1) return roots[0] || null;
    const cwd = validatePath(payload.cwd || payload.workingDirectory);
    const matches = cwd ? roots.filter((root) => contained(root, cwd)) : [];
    return matches.length === 1 ? matches[0] : null;
  }
  return resolveWorkspace(payload, [], ["cwd", "workingDirectory"]);
}

if (require.main === module) {
  let resolved = null;
  try {
    const mode = process.argv[2];
    const adapters = { "--claude": resolveClaude, "--codex": resolveCodex, "--grok": resolveGrok, "--antigravity": resolveAntigravity };
    const recovery = process.argv.includes("--recovery");
    const options = { allowTemp: recovery, allowMissing: recovery };
    resolved = adapters[mode]
      ? adapters[mode](JSON.parse(fs.readFileSync(0, "utf8").replace(/^\uFEFF+/, "")))
      : mode === "--validate" ? validatePath(process.argv[3], options)
        : resolveRoot(mode, process.argv.includes("--explicit"), options);
  } catch { /* Invalid metadata must not create history in the hook cwd. */ }
  if (resolved) process.stdout.write(resolved);
  else process.exitCode = 2;
}
module.exports = { resolveRoot, resolveClaude, resolveCodex, resolveGrok, resolveAntigravity, validatePath, storageSafe, forbidden };
