#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

const args = process.argv.slice(2);
const isUnlink = args.includes("--unlink");
const isLinkMode = args.includes("--link");

const repoRoot = path.resolve(__dirname, "..");
const skillsSrcDir = path.join(repoRoot, "skills");
const agentsSrcDir = path.join(repoRoot, "agents");
const hooksSrcDir = path.join(repoRoot, "hooks");

const codexHome = process.env.CODEX_HOME
  ? path.resolve(process.env.CODEX_HOME)
  : path.join(os.homedir(), ".codex");

const targets = {
  projectSkills: path.join(repoRoot, ".agents", "skills"),
  projectAgents: path.join(repoRoot, ".agents", "agents"),
  projectHooks: path.join(repoRoot, ".agents", "hooks"),
  codexSkills: path.join(codexHome, "skills"),
  codexAgents: path.join(codexHome, "agents"),
  codexHooks: path.join(codexHome, "hooks"),
};

const manifestPaths = {
  project: path.join(repoRoot, ".agents", ".codex-sync-manifest.json"),
  codex: path.join(codexHome, ".codex-sync-manifest.json"),
};

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function safeRm(targetPath) {
  try {
    fs.rmSync(targetPath, { recursive: true, force: true });
  } catch {
    // no-op
  }
}

function listDirectories(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b));
}

function linkDir(src, dest) {
  if (process.platform === "win32") {
    fs.symlinkSync(src, dest, "junction");
  } else {
    fs.symlinkSync(src, dest, "dir");
  }
}

function installDir(src, dest, useLink) {
  safeRm(dest);
  if (useLink) {
    linkDir(src, dest);
  } else {
    fs.cpSync(src, dest, { recursive: true, force: true });
  }
}

function collectAgentFiles() {
  const files = new Map();

  if (fs.existsSync(agentsSrcDir)) {
    for (const name of fs.readdirSync(agentsSrcDir).sort()) {
      const src = path.join(agentsSrcDir, name);
      if (name.toLowerCase().endsWith(".md") && fs.statSync(src).isFile()) {
        files.set(name, src);
      }
    }
  }

  for (const skillName of listDirectories(skillsSrcDir)) {
    const embeddedAgentsDir = path.join(skillsSrcDir, skillName, "agents");
    if (!fs.existsSync(embeddedAgentsDir)) continue;
    for (const name of fs.readdirSync(embeddedAgentsDir).sort()) {
      const src = path.join(embeddedAgentsDir, name);
      if (name.toLowerCase().endsWith(".md") && fs.statSync(src).isFile()) {
        files.set(name, src);
      }
    }
  }

  return files;
}

function collectHookFiles() {
  const files = new Map();
  if (!fs.existsSync(hooksSrcDir)) return files;

  const allowedExt = new Set([".ps1", ".sh", ".js"]);
  for (const name of fs.readdirSync(hooksSrcDir).sort()) {
    const src = path.join(hooksSrcDir, name);
    if (!fs.statSync(src).isFile()) continue;
    if (!allowedExt.has(path.extname(name).toLowerCase())) continue;
    files.set(name, src);
  }
  return files;
}

function readManifest(manifestPath) {
  try {
    return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch {
    return null;
  }
}

function loadPreviousManaged() {
  const manifest = readManifest(manifestPaths.project) || readManifest(manifestPaths.codex) || {};
  const toArray = (v) => (Array.isArray(v) ? v : []);
  return {
    skills: toArray(manifest.managedSkills),
    agents: toArray(manifest.managedAgents),
    hooks: toArray(manifest.managedHooks),
  };
}

function cleanupStaleEntries(destDir, previousNames, currentNames) {
  ensureDir(destDir);
  const currentSet = new Set(currentNames);
  for (const name of previousNames) {
    if (!currentSet.has(name)) {
      safeRm(path.join(destDir, name));
    }
  }
}

function syncSkills(destDir, skillNames, mode) {
  ensureDir(destDir);
  for (const skillName of skillNames) {
    const src = path.join(skillsSrcDir, skillName);
    const dest = path.join(destDir, skillName);
    if (mode === "unlink") {
      safeRm(dest);
      continue;
    }
    installDir(src, dest, mode === "link");
  }
}

function syncAgents(destDir, agentFiles, mode) {
  ensureDir(destDir);
  for (const [name, src] of agentFiles.entries()) {
    const dest = path.join(destDir, name);
    if (mode === "unlink") {
      safeRm(dest);
      continue;
    }
    fs.copyFileSync(src, dest);
  }
}

function pruneAgentFiles(destDir, currentNames) {
  ensureDir(destDir);
  const currentSet = new Set(currentNames);
  for (const entry of fs.readdirSync(destDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const name = entry.name;
    if (!name.toLowerCase().endsWith(".md")) continue;
    if (!currentSet.has(name)) {
      safeRm(path.join(destDir, name));
    }
  }
}

function syncHooks(destDir, hookFiles, mode) {
  ensureDir(destDir);
  for (const [name, src] of hookFiles.entries()) {
    const dest = path.join(destDir, name);
    if (mode === "unlink") {
      safeRm(dest);
      continue;
    }
    fs.copyFileSync(src, dest);
  }
}

function writeManifest(mode, skillNames, agentNames, hookNames) {
  const manifest = {
    mode,
    syncedAt: new Date().toISOString(),
    project: {
      skillsDir: targets.projectSkills,
      agentsDir: targets.projectAgents,
    },
    codex: {
      home: codexHome,
      skillsDir: targets.codexSkills,
      agentsDir: targets.codexAgents,
    },
    managedSkills: skillNames,
    managedAgents: agentNames,
    managedHooks: hookNames,
  };

  const projectManifest = manifestPaths.project;
  const codexManifest = manifestPaths.codex;
  ensureDir(path.dirname(projectManifest));
  ensureDir(path.dirname(codexManifest));

  fs.writeFileSync(projectManifest, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  fs.writeFileSync(codexManifest, JSON.stringify(manifest, null, 2) + "\n", "utf8");
}

function run() {
  if (!fs.existsSync(skillsSrcDir)) {
    console.error(`[error] skills directory not found: ${skillsSrcDir}`);
    process.exit(1);
  }

  const mode = isUnlink ? "unlink" : isLinkMode ? "link" : "copy";
  const previous = loadPreviousManaged();
  const skillNames = listDirectories(skillsSrcDir);
  const agentFiles = collectAgentFiles();
  const hookFiles = collectHookFiles();
  const agentNames = Array.from(agentFiles.keys()).sort((a, b) => a.localeCompare(b));
  const hookNames = Array.from(hookFiles.keys()).sort((a, b) => a.localeCompare(b));

  const targetMatrix = [
    { key: "skills", dest: targets.projectSkills },
    { key: "skills", dest: targets.codexSkills },
    { key: "agents", dest: targets.projectAgents },
    { key: "agents", dest: targets.codexAgents },
    { key: "hooks", dest: targets.projectHooks },
    { key: "hooks", dest: targets.codexHooks },
  ];

  const currentByKey = {
    skills: mode === "unlink" ? [] : skillNames,
    agents: mode === "unlink" ? [] : agentNames,
    hooks: mode === "unlink" ? [] : hookNames,
  };

  for (const item of targetMatrix) {
    cleanupStaleEntries(item.dest, previous[item.key], currentByKey[item.key]);
  }

  pruneAgentFiles(targets.projectAgents, currentByKey.agents);
  pruneAgentFiles(targets.codexAgents, currentByKey.agents);

  syncSkills(targets.projectSkills, skillNames, mode);
  syncSkills(targets.codexSkills, skillNames, mode);
  syncAgents(targets.projectAgents, agentFiles, mode);
  syncAgents(targets.codexAgents, agentFiles, mode);
  syncHooks(targets.projectHooks, hookFiles, mode);
  syncHooks(targets.codexHooks, hookFiles, mode);

  if (mode === "unlink") {
    safeRm(path.join(repoRoot, ".agents", ".codex-sync-manifest.json"));
    safeRm(path.join(codexHome, ".codex-sync-manifest.json"));
  } else {
    writeManifest(mode, skillNames, agentNames, hookNames);
  }

  console.log(`[codex-sync] mode=${mode}`);
  console.log(`[codex-sync] skills=${skillNames.length}`);
  console.log(`[codex-sync] agents=${agentNames.length}`);
  console.log(`[codex-sync] hooks=${hookNames.length}`);
  console.log(`[codex-sync] project_skills=${targets.projectSkills}`);
  console.log(`[codex-sync] project_hooks=${targets.projectHooks}`);
  console.log(`[codex-sync] codex_skills=${targets.codexSkills}`);
  console.log(`[codex-sync] codex_hooks=${targets.codexHooks}`);
}

run();
