#!/usr/bin/env node
"use strict";

const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { writeAgentsCatalog } = require("./agent-catalog");
const { collectAgentFiles } = require("./agent-files");
const { DEFAULT_RUNTIME_AGENT_ALLOWLIST, selectRuntimeAgents } = require("./agent-install-policy");
const { pruneStaleAssets } = require("./prune-stale-assets");
const { collectSkillFiles, syncSkillSourceLibrary, writeSkillsCatalog } = require("./skill-catalog");
const { RUNTIME_SKILL_EXCLUSIONS, selectRuntimeSkills } = require("./skill-install-policy");

const argv = process.argv.slice(2);
const knownArgs = new Set([
  "--include-source-only-skills",
  "--include-broad-coding-skills",
  "--include-source-only-agents",
  "--include-passive-agents",
  "--include-broad-coding-agents",
  "--unlink",
]);

function usage() {
  console.error("Usage: node scripts/sync-antigravity-assets.js [--include-source-only-skills] [--include-broad-coding-skills] [--include-source-only-agents] [--unlink]");
}

if (argv.includes("--help") || argv.includes("-h")) {
  usage();
  process.exit(0);
}
const unknown = argv.find((arg) => !knownArgs.has(arg));
if (unknown) {
  console.error(`[antigravity-sync] unknown option: ${unknown}`);
  usage();
  process.exit(1);
}

const mode = argv.includes("--unlink") ? "unlink" : "copy";
const includeSourceOnlySkills = argv.includes("--include-source-only-skills");
const includeBroadCodingSkills = argv.includes("--include-broad-coding-skills");
const includeSourceOnlyAgents = argv.some((arg) => [
  "--include-source-only-agents",
  "--include-passive-agents",
  "--include-broad-coding-agents",
].includes(arg));

const repoRoot = path.resolve(__dirname, "..");
const skillsSource = path.join(repoRoot, "skills");
const agentsSource = path.join(repoRoot, "agents");
const hooksSource = path.join(repoRoot, "hooks");
const googleHome = process.env.ANTIGRAVITY_HOME
  ? path.resolve(process.env.ANTIGRAVITY_HOME)
  : path.join(os.homedir(), ".gemini");
const cliHome = path.join(googleHome, "antigravity-cli");
const configHome = path.join(googleHome, "config");
const targets = {
  skills: path.join(cliHome, "skills"),
  agents: path.join(configHome, "agents"),
  hooks: path.join(configHome, "hooks"),
};
const manifestPath = path.join(cliHome, ".olympus-sync-manifest.json");
const legacyManifestPath = path.join(googleHome, ".gemini-sync-manifest.json");
const preserveStamp = new Date().toISOString().replace(/[:.]/g, "-");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, "utf8")); } catch { return null; }
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function safeRemove(targetPath) {
  fs.rmSync(targetPath, { recursive: true, force: true });
}

function removeIfEmpty(dirPath) {
  try {
    if (fs.existsSync(dirPath) && fs.readdirSync(dirPath).length === 0) fs.rmdirSync(dirPath);
  } catch {
    // User-owned siblings keep the directory alive.
  }
}

function hashPath(targetPath) {
  if (!fs.existsSync(targetPath)) return null;
  const hash = crypto.createHash("sha256");
  function visit(current, relative) {
    const stat = fs.lstatSync(current);
    const normalized = relative.replace(/\\/g, "/");
    if (stat.isSymbolicLink()) {
      hash.update(`link\0${normalized}\0${fs.readlinkSync(current)}\0`);
      return;
    }
    if (stat.isDirectory()) {
      hash.update(`dir\0${normalized}\0`);
      for (const entry of fs.readdirSync(current).sort()) {
        if (entry === "node_modules") continue;
        visit(path.join(current, entry), path.join(relative, entry));
      }
      return;
    }
    hash.update(`file\0${normalized}\0`);
    hash.update(fs.readFileSync(current));
    hash.update("\0");
  }
  visit(targetPath, path.basename(targetPath));
  return hash.digest("hex");
}

function matchesHash(targetPath, expected) {
  if (!expected || !fs.existsSync(targetPath)) return false;
  try { return hashPath(targetPath) === expected; } catch { return false; }
}

function pathsMatch(left, right) {
  if (!left || !right || !fs.existsSync(left) || !fs.existsSync(right)) return false;
  try { return hashPath(left) === hashPath(right); } catch { return false; }
}

function uniquePreservePath(kind, name) {
  const base = path.join(googleHome, "_olympus-preserved", preserveStamp, kind);
  ensureDir(base);
  let candidate = path.join(base, name);
  for (let suffix = 2; fs.existsSync(candidate); suffix += 1) {
    const parsed = path.parse(name);
    candidate = path.join(base, `${parsed.name}-${suffix}${parsed.ext}`);
  }
  return candidate;
}

function preserve(targetPath, kind, name, reason) {
  const backupPath = uniquePreservePath(kind, name);
  try {
    fs.renameSync(targetPath, backupPath);
  } catch {
    fs.cpSync(targetPath, backupPath, { recursive: true, force: true });
    safeRemove(targetPath);
  }
  console.warn(`[antigravity-sync] preserved ${reason}: ${targetPath} -> ${backupPath}`);
}

function prepareReplacement(sourcePath, targetPath, kind, name, expectedHash) {
  if (!fs.existsSync(targetPath)) return;
  if (matchesHash(targetPath, expectedHash) || pathsMatch(sourcePath, targetPath)) return;
  preserve(targetPath, kind, name, `modified same-name ${kind}`);
}

function removeManaged(sourcePath, targetPath, kind, name, expectedHash) {
  if (!fs.existsSync(targetPath)) return;
  if (matchesHash(targetPath, expectedHash) || pathsMatch(sourcePath, targetPath)) {
    safeRemove(targetPath);
    return;
  }
  preserve(targetPath, kind, name, `modified managed ${kind}`);
}

function copyDirectory(sourcePath, targetPath) {
  safeRemove(targetPath);
  fs.cpSync(sourcePath, targetPath, {
    recursive: true,
    force: true,
    filter: (candidate) => !candidate.split(path.sep).includes("node_modules"),
  });
}

function hashNames(root, names) {
  const values = {};
  for (const name of names) {
    const hash = hashPath(path.join(root, name));
    if (hash) values[name] = hash;
  }
  return values;
}

function managedState(manifest) {
  const value = manifest || {};
  const group = (name) => value.managedAssetHashes?.[name] || {};
  return {
    skills: Array.isArray(value.managedSkills) ? value.managedSkills : [],
    agents: Array.isArray(value.managedAgents) ? value.managedAgents : [],
    hooks: Array.isArray(value.managedHooks) ? value.managedHooks : [],
    supportDirectories: Array.isArray(value.managedSupportDirectories) ? value.managedSupportDirectories : [],
    hashes: {
      skills: group("skills"),
      agents: group("agents"),
      hooks: group("hooks"),
      supportDirectories: group("supportDirectories"),
    },
  };
}

function collectHookFiles() {
  const files = new Map();
  const name = "antigravity-hook.js";
  const sourcePath = path.join(hooksSource, name);
  if (fs.existsSync(sourcePath)) files.set(name, sourcePath);
  return files;
}

function removeLegacyGeneratedPath(targetPath, kind) {
  if (!fs.existsSync(targetPath)) return;
  if (targetPath.endsWith("-CATALOG.md")) {
    const content = fs.readFileSync(targetPath, "utf8");
    if (/gemini-sync|설치 과정에서 자동 생성/.test(content)) {
      safeRemove(targetPath);
      return;
    }
  }
  preserve(targetPath, kind, path.basename(targetPath), "legacy Gemini generated path");
}

function migrateLegacyGeminiAssets() {
  const legacyManifest = readJson(legacyManifestPath);
  if (!legacyManifest) return;
  const legacy = managedState(legacyManifest);
  const legacyRoots = {
    skills: path.join(googleHome, "skills"),
    agents: path.join(googleHome, "agents"),
    hooks: path.join(googleHome, "hooks"),
  };
  for (const key of ["skills", "agents", "hooks"]) {
    for (const name of legacy[key]) {
      const sourceRoot = key === "skills" ? skillsSource : key === "agents" ? agentsSource : hooksSource;
      removeManaged(
        path.join(sourceRoot, name),
        path.join(legacyRoots[key], name),
        `legacy-gemini-${key}`,
        name,
        legacy.hashes[key][name],
      );
    }
    removeIfEmpty(legacyRoots[key]);
  }
  for (const name of legacy.supportDirectories) {
    removeManaged(
      path.join(agentsSource, name),
      path.join(legacyRoots.agents, name),
      "legacy-gemini-agent-support",
      name,
      legacy.hashes.supportDirectories[name],
    );
  }
  removeLegacyGeneratedPath(path.join(googleHome, "SKILLS-CATALOG.md"), "legacy-gemini-catalog");
  removeLegacyGeneratedPath(path.join(googleHome, "AGENTS-CATALOG.md"), "legacy-gemini-catalog");
  removeLegacyGeneratedPath(path.join(googleHome, ".olympus"), "legacy-gemini-library");
  safeRemove(legacyManifestPath);
  console.log("[antigravity-sync] migrated Olympus-managed Gemini CLI assets");
}

function syncNamedDirectories(names, previous, allSources) {
  const current = new Set(mode === "copy" ? names : []);
  for (const name of previous.skills) {
    if (current.has(name)) continue;
    removeManaged(path.join(skillsSource, name), path.join(targets.skills, name), "skills", name, previous.hashes.skills[name]);
  }
  if (mode === "unlink") {
    for (const name of names) {
      removeManaged(path.join(skillsSource, name), path.join(targets.skills, name), "skills", name, previous.hashes.skills[name]);
    }
    return;
  }
  for (const name of names) {
    const sourcePath = path.join(skillsSource, name);
    const targetPath = path.join(targets.skills, name);
    prepareReplacement(sourcePath, targetPath, "skills", name, previous.hashes.skills[name]);
    copyDirectory(sourcePath, targetPath);
  }
  for (const name of allSources) {
    if (names.includes(name)) continue;
    const targetPath = path.join(targets.skills, name);
    if (fs.existsSync(targetPath) && previous.skills.includes(name)) {
      removeManaged(path.join(skillsSource, name), targetPath, "skills", name, previous.hashes.skills[name]);
    }
  }
}

function syncNamedFiles(files, targetRoot, key, previous) {
  const currentNames = mode === "copy" ? Array.from(files.keys()) : [];
  for (const name of previous[key]) {
    if (currentNames.includes(name)) continue;
    removeManaged(files.get(name), path.join(targetRoot, name), key, name, previous.hashes[key][name]);
  }
  if (mode === "unlink") {
    for (const [name, sourcePath] of files) {
      removeManaged(sourcePath, path.join(targetRoot, name), key, name, previous.hashes[key][name]);
    }
    return;
  }
  ensureDir(targetRoot);
  for (const [name, sourcePath] of files) {
    const targetPath = path.join(targetRoot, name);
    prepareReplacement(sourcePath, targetPath, key, name, previous.hashes[key][name]);
    fs.copyFileSync(sourcePath, targetPath);
    if (process.platform !== "win32" && name.endsWith(".js")) fs.chmodSync(targetPath, 0o755);
  }
}

function writeManifest(skillNames, agentNames, hookNames, supportDirectories) {
  writeJson(manifestPath, {
    mode: "copy",
    syncedAt: new Date().toISOString(),
    antigravity: {
      googleHome,
      cliHome,
      skillsDir: targets.skills,
      agentsDir: targets.agents,
      hooksDir: targets.hooks,
    },
    managedSkills: skillNames,
    managedAgents: agentNames,
    managedHooks: hookNames,
    managedSupportDirectories: supportDirectories,
    managedAssetHashes: {
      skills: hashNames(targets.skills, skillNames),
      agents: hashNames(targets.agents, agentNames),
      hooks: hashNames(targets.hooks, hookNames),
      supportDirectories: hashNames(targets.agents, supportDirectories),
    },
  });
}

function run() {
  if (!fs.existsSync(skillsSource)) throw new Error(`skills directory not found: ${skillsSource}`);
  migrateLegacyGeminiAssets();

  const allSkillFiles = collectSkillFiles(skillsSource);
  const allSkillNames = Array.from(allSkillFiles.keys());
  const selection = selectRuntimeSkills(
    allSkillNames,
    RUNTIME_SKILL_EXCLUSIONS.antigravity,
    includeSourceOnlySkills,
    includeBroadCodingSkills,
  );
  const allAgentFiles = collectAgentFiles(agentsSource, skillsSource);
  const agentSelection = selectRuntimeAgents(allAgentFiles, includeSourceOnlyAgents);
  const hookFiles = collectHookFiles();
  const previous = managedState(readJson(manifestPath));

  if (selection.runtimeExcludedNames.length > 0) {
    console.log(`[antigravity-sync] excluded (cli-specific): ${selection.runtimeExcludedNames.join(", ")}`);
  }
  if (selection.defaultDisabledNames.length > 0) {
    console.log(`[antigravity-sync] source-only skills: ${selection.defaultDisabledNames.join(", ")}`);
  }
  if (agentSelection.defaultDisabledNames.length > 0) {
    console.log(`[antigravity-sync] source-only agents: ${agentSelection.defaultDisabledNames.join(", ")}`);
  }

  if (mode === "copy") {
    pruneStaleAssets(cliHome, { backupBase: path.join(googleHome, "_olympus-preserved") });
  }
  syncNamedDirectories(
    mode === "unlink" ? allSkillNames : selection.skillNames,
    previous,
    allSkillNames,
  );
  for (const name of selection.runtimeExcludedNames) {
    removeManaged(
      path.join(skillsSource, name),
      path.join(targets.skills, name),
      "runtime-excluded-skill",
      name,
      previous.hashes.skills[name],
    );
  }
  syncNamedFiles(agentSelection.agentFiles, targets.agents, "agents", previous);
  syncNamedFiles(hookFiles, targets.hooks, "hooks", previous);

  const supportDirectories = [];
  if (mode === "copy" && agentSelection.agentFiles.size > 0 && fs.existsSync(agentsSource)) {
    for (const entry of fs.readdirSync(agentsSource, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const sourcePath = path.join(agentsSource, entry.name);
      const targetPath = path.join(targets.agents, entry.name);
      prepareReplacement(sourcePath, targetPath, "agent-support", entry.name, previous.hashes.supportDirectories[entry.name]);
      copyDirectory(sourcePath, targetPath);
      supportDirectories.push(entry.name);
    }
  } else {
    for (const name of previous.supportDirectories) {
      removeManaged(path.join(agentsSource, name), path.join(targets.agents, name), "agent-support", name, previous.hashes.supportDirectories[name]);
    }
  }

  if (mode === "unlink") {
    safeRemove(manifestPath);
    safeRemove(path.join(cliHome, "SKILLS-CATALOG.md"));
    safeRemove(path.join(cliHome, "AGENTS-CATALOG.md"));
    safeRemove(path.join(cliHome, ".olympus", "source-skills"));
    safeRemove(path.join(cliHome, ".olympus", "runtime-modules"));
  } else {
    for (const name of selection.skillNames) {
      const skillMd = path.join(targets.skills, name, "SKILL.md");
      if (!fs.existsSync(skillMd)) throw new Error(`missing SKILL.md after sync: ${skillMd}`);
    }
    const compatibleSkillFiles = new Map(
      Array.from(allSkillFiles.entries()).filter(([name]) => !selection.runtimeExcludedNames.includes(name)),
    );
    const sourceSkillFiles = syncSkillSourceLibrary(cliHome, compatibleSkillFiles);
    const skillsCatalog = writeSkillsCatalog(cliHome, sourceSkillFiles, "antigravity-sync", {
      activeSkillNames: selection.skillNames,
    });
    const agentsCatalog = writeAgentsCatalog(cliHome, agentSelection.agentFiles, "antigravity-sync", {
      activeAgentNames: includeSourceOnlyAgents
        ? Array.from(agentSelection.agentFiles.keys())
        : DEFAULT_RUNTIME_AGENT_ALLOWLIST,
    });
    writeManifest(
      selection.skillNames,
      Array.from(agentSelection.agentFiles.keys()),
      Array.from(hookFiles.keys()),
      supportDirectories,
    );
    console.log(`[antigravity-sync] skills_catalog=${skillsCatalog}`);
    console.log(`[antigravity-sync] agents_catalog=${agentsCatalog}`);
  }

  removeIfEmpty(targets.skills);
  removeIfEmpty(targets.agents);
  removeIfEmpty(targets.hooks);
  console.log(`[antigravity-sync] mode=${mode}`);
  console.log(`[antigravity-sync] skills=${mode === "copy" ? selection.skillNames.length : 0}`);
  console.log(`[antigravity-sync] agents=${mode === "copy" ? agentSelection.agentFiles.size : 0}`);
  console.log(`[antigravity-sync] hooks=${mode === "copy" ? hookFiles.size : 0}`);
  console.log(`[antigravity-sync] antigravity_skills=${targets.skills}`);
  console.log(`[antigravity-sync] antigravity_agents=${targets.agents}`);
  console.log(`[antigravity-sync] antigravity_hooks=${targets.hooks}`);
}

try {
  run();
} catch (error) {
  console.error(`[antigravity-sync] ${error.message || error}`);
  process.exit(1);
}
