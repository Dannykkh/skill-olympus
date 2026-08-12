#!/usr/bin/env node
"use strict";

const fs = require("fs");
const crypto = require("crypto");
const os = require("os");
const path = require("path");
const { writeAgentsCatalog } = require("./agent-catalog");
const { collectAgentFiles } = require("./agent-files");
const {
  DEFAULT_RUNTIME_AGENT_ALLOWLIST,
  selectRuntimeAgents,
} = require("./agent-install-policy");

function usage() {
  console.error(
    "Usage: node scripts/sync-claude-agents.js [dest-home] [--include-source-only-agents] [--unlink]",
  );
}

const args = process.argv.slice(2);
let destHome = null;
let includeSourceOnlyAgents = false;
let isUnlink = false;

for (const arg of args) {
  if (arg === "--help" || arg === "-h") {
    usage();
    process.exit(0);
  }
  if (
    arg === "--include-source-only-agents" ||
    arg === "--include-passive-agents" ||
    arg === "--include-broad-coding-agents"
  ) {
    includeSourceOnlyAgents = true;
    continue;
  }
  if (arg === "--unlink") {
    isUnlink = true;
    continue;
  }
  if (arg.startsWith("-")) {
    console.error(`[claude-agent-sync] unknown option: ${arg}`);
    usage();
    process.exit(1);
  }
  if (!destHome) {
    destHome = path.resolve(arg === "~" ? os.homedir() : arg);
    continue;
  }
  console.error(`[claude-agent-sync] unknown argument: ${arg}`);
  usage();
  process.exit(1);
}

const repoRoot = path.resolve(__dirname, "..");
const agentsSrcDir = path.join(repoRoot, "agents");
const skillsSrcDir = path.join(repoRoot, "skills");
const claudeHome = destHome || path.join(os.homedir(), ".claude");
const agentsDestDir = path.join(claudeHome, "agents");
const manifestPath = path.join(claudeHome, ".claude-agents-sync-manifest.json");
const preservationStamp = new Date().toISOString().replace(/[:.]/g, "-");
const preservationRoot = path.join(
  claudeHome,
  "_olympus-preserved",
  preservationStamp,
  "agents",
);

function safeRm(targetPath) {
  // Policy changes must surface removal failures to the installer instead of
  // reporting a partial sync as successful.
  fs.rmSync(targetPath, { recursive: true, force: true });
}

function hashPath(targetPath) {
  if (!fs.existsSync(targetPath)) return null;
  const hash = crypto.createHash("sha256");

  function visit(currentPath, relativePath) {
    const stat = fs.lstatSync(currentPath);
    const normalized = relativePath.replace(/\\/g, "/");
    if (stat.isSymbolicLink()) {
      hash.update(`link\0${normalized}\0${fs.readlinkSync(currentPath)}\0`);
      return;
    }
    if (stat.isDirectory()) {
      hash.update(`dir\0${normalized}\0`);
      for (const entry of fs.readdirSync(currentPath).sort()) {
        if (entry === "node_modules") continue;
        visit(path.join(currentPath, entry), path.join(relativePath, entry));
      }
      return;
    }
    hash.update(`file\0${normalized}\0`);
    hash.update(fs.readFileSync(currentPath));
    hash.update("\0");
  }

  visit(targetPath, path.basename(targetPath));
  return hash.digest("hex");
}

function pathsMatch(left, right) {
  try {
    const leftHash = hashPath(left);
    return leftHash !== null && leftHash === hashPath(right);
  } catch {
    return false;
  }
}

function matchesManagedHash(targetPath, expectedHash) {
  if (typeof expectedHash !== "string" || expectedHash.length === 0) return false;
  try {
    return hashPath(targetPath) === expectedHash;
  } catch {
    return false;
  }
}

function hashNamedPaths(rootDir, names) {
  const hashes = {};
  for (const name of names) {
    const value = hashPath(path.join(rootDir, name));
    if (value) hashes[name] = value;
  }
  return hashes;
}

function removeDestEntriesMissingFromSource(src, dest) {
  if (!fs.existsSync(dest)) return;
  for (const entry of fs.readdirSync(dest, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (!fs.existsSync(srcPath)) {
      safeRm(destPath);
      continue;
    }
    const srcStat = fs.statSync(srcPath);
    const destStat = fs.statSync(destPath);
    if (srcStat.isDirectory() && destStat.isDirectory()) {
      removeDestEntriesMissingFromSource(srcPath, destPath);
    } else if (srcStat.isDirectory() !== destStat.isDirectory()) {
      safeRm(destPath);
    }
  }
}

function uniqueBackupPath(name) {
  const initial = path.join(preservationRoot, name);
  if (!fs.existsSync(initial)) return initial;
  const parsed = path.parse(name);
  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const candidate = path.join(
      preservationRoot,
      `${parsed.name}-${suffix}${parsed.ext}`,
    );
    if (!fs.existsSync(candidate)) return candidate;
  }
  throw new Error(`Could not allocate preservation path for ${name}`);
}

function preservePath(targetPath, name, reason) {
  const backupPath = uniqueBackupPath(name);
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  try {
    fs.renameSync(targetPath, backupPath);
  } catch {
    fs.cpSync(targetPath, backupPath, { recursive: true, force: true });
    safeRm(targetPath);
  }
  console.warn(
    `[claude-agent-sync] preserved ${reason}: ${targetPath} -> ${backupPath}`,
  );
}

function preparePath(
  src,
  dest,
  name,
  reason,
  removeExact = false,
  expectedHash = null,
) {
  if (!fs.existsSync(dest)) return;
  if (matchesManagedHash(dest, expectedHash)) {
    if (removeExact) safeRm(dest);
    return;
  }
  if (src && fs.existsSync(src) && pathsMatch(src, dest)) {
    if (removeExact) safeRm(dest);
    return;
  }
  preservePath(dest, name, reason);
}

function readPreviousManaged() {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    return {
      agents: Array.isArray(manifest.managedAgents)
        ? manifest.managedAgents
        : [],
      supportDirectories: Array.isArray(manifest.managedSupportDirectories)
        ? manifest.managedSupportDirectories
        : [],
      hashes: {
        agents:
          manifest.managedAssetHashes &&
          manifest.managedAssetHashes.agents &&
          typeof manifest.managedAssetHashes.agents === "object"
            ? manifest.managedAssetHashes.agents
            : {},
        supportDirectories:
          manifest.managedAssetHashes &&
          manifest.managedAssetHashes.supportDirectories &&
          typeof manifest.managedAssetHashes.supportDirectories === "object"
            ? manifest.managedAssetHashes.supportDirectories
            : {},
      },
    };
  } catch {
    return {
      agents: [],
      supportDirectories: [],
      hashes: { agents: {}, supportDirectories: {} },
    };
  }
}

function syncAgentSupportDirectories(include, previousHashes) {
  if (!fs.existsSync(agentsSrcDir)) return;
  for (const entry of fs.readdirSync(agentsSrcDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const src = path.join(agentsSrcDir, entry.name);
    const dest = path.join(agentsDestDir, entry.name);
    preparePath(
      src,
      dest,
      entry.name,
      include
        ? "same-name support directory before managed replacement"
        : "same-name support directory disabled by runtime policy",
      !include,
      previousHashes[entry.name],
    );
    if (include) {
      fs.mkdirSync(agentsDestDir, { recursive: true });
      removeDestEntriesMissingFromSource(src, dest);
      fs.cpSync(src, dest, {
        recursive: true,
        force: true,
      });
      removeDestEntriesMissingFromSource(src, dest);
    }
  }
}

const allAgentFiles = collectAgentFiles(agentsSrcDir, skillsSrcDir);
const { agentFiles, defaultDisabledNames } = selectRuntimeAgents(
  allAgentFiles,
  includeSourceOnlyAgents,
);
const previous = readPreviousManaged();

if (isUnlink) {
  for (const name of new Set([
    ...previous.agents,
    ...allAgentFiles.keys(),
  ])) {
    preparePath(
      allAgentFiles.get(name),
      path.join(agentsDestDir, name),
      name,
      "modified or user-owned same-name agent during unlink",
      true,
      previous.hashes.agents[name],
    );
  }
  const sourceSupportDirectories = fs.existsSync(agentsSrcDir)
    ? fs
      .readdirSync(agentsSrcDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
    : [];
  for (const name of new Set([
    ...previous.supportDirectories,
    ...sourceSupportDirectories,
  ])) {
    preparePath(
      path.join(agentsSrcDir, name),
      path.join(agentsDestDir, name),
      name,
      "modified or user-owned same-name support directory during unlink",
      true,
      previous.hashes.supportDirectories[name],
    );
  }
  try {
    if (fs.existsSync(agentsDestDir) && fs.readdirSync(agentsDestDir).length === 0) {
      fs.rmdirSync(agentsDestDir);
    }
  } catch {
    // A directory containing unrelated local agents must remain.
  }
  safeRm(manifestPath);
  safeRm(path.join(claudeHome, "AGENTS-CATALOG.md"));
  console.log("[claude-agent-sync] mode=unlink");
  console.log("[claude-agent-sync] agents=0");
  process.exit(0);
}

if (agentFiles.size > 0) {
  fs.mkdirSync(agentsDestDir, { recursive: true });
  for (const [name, src] of agentFiles.entries()) {
    const dest = path.join(agentsDestDir, name);
    preparePath(
      src,
      dest,
      name,
      "same-name agent before managed replacement",
      false,
      previous.hashes.agents[name],
    );
    fs.copyFileSync(src, dest);
  }
}
syncAgentSupportDirectories(
  includeSourceOnlyAgents && agentFiles.size > 0,
  previous.hashes.supportDirectories,
);

if (!includeSourceOnlyAgents) {
  // The policy is authoritative even when an older installer did not track
  // which files it copied. Modified or user-owned same-name files are moved to
  // a recovery directory instead of being deleted.
  for (const name of defaultDisabledNames) {
    const src = allAgentFiles.get(name);
    const dest = path.join(agentsDestDir, name);
    preparePath(
      src,
      dest,
      name,
      "same-name agent disabled by runtime policy",
      true,
      previous.hashes.agents[name],
    );
  }
}

try {
  if (fs.existsSync(agentsDestDir) && fs.readdirSync(agentsDestDir).length === 0) {
    fs.rmdirSync(agentsDestDir);
  }
} catch {
  // Preserve local-only files and tolerate concurrent readers.
}

const agentsCatalogPath = writeAgentsCatalog(
  claudeHome,
  agentFiles,
  "claude-agent-sync",
  {
    activeAgentNames: includeSourceOnlyAgents
      ? Array.from(agentFiles.keys())
      : DEFAULT_RUNTIME_AGENT_ALLOWLIST,
  },
);

fs.writeFileSync(
  manifestPath,
  JSON.stringify(
    {
      mode: "copy",
      syncedAt: new Date().toISOString(),
      source: agentsSrcDir,
      agentsDir: agentsDestDir,
      managedAgents: Array.from(agentFiles.keys()),
      managedSupportDirectories:
        includeSourceOnlyAgents && fs.existsSync(agentsSrcDir)
          ? fs
            .readdirSync(agentsSrcDir, { withFileTypes: true })
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name)
          : [],
      managedAssetHashes: {
        agents: hashNamedPaths(agentsDestDir, Array.from(agentFiles.keys())),
        supportDirectories: hashNamedPaths(
          agentsDestDir,
          includeSourceOnlyAgents && fs.existsSync(agentsSrcDir)
            ? fs
              .readdirSync(agentsSrcDir, { withFileTypes: true })
              .filter((entry) => entry.isDirectory())
              .map((entry) => entry.name)
            : [],
        ),
      },
    },
    null,
    2,
  ) + "\n",
  "utf8",
);

console.log(`[claude-agent-sync] agents=${agentFiles.size}`);
if (defaultDisabledNames.length > 0) {
  console.log(
    `[claude-agent-sync] source-only agents: ${defaultDisabledNames.join(", ")}`,
  );
}
console.log(`[claude-agent-sync] agents_catalog=${agentsCatalogPath}`);
console.log(`[claude-agent-sync] destination=${agentsDestDir}`);
