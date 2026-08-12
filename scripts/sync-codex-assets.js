#!/usr/bin/env node
"use strict";

// Usage:
//   node scripts/sync-codex-assets.js
//   node scripts/sync-codex-assets.js --include-source-only-skills
//   node scripts/sync-codex-assets.js --include-source-only-agents
//   node scripts/sync-codex-assets.js --include-project-skills
//   node scripts/sync-codex-assets.js --include-project-agents
//   node scripts/sync-codex-assets.js --unlink

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
const { pruneStaleAssets } = require("./prune-stale-assets");
const {
  collectSkillFiles,
  syncSkillSourceLibrary,
  writeSkillsCatalog,
} = require("./skill-catalog");
const {
  RUNTIME_SKILL_EXCLUSIONS,
  selectRuntimeSkills,
} = require("./skill-install-policy");

const args = process.argv.slice(2);
const knownArgs = new Set([
  "--include-project-skills",
  "--include-project-agents",
  "--include-source-only-skills",
  "--include-broad-coding-skills",
  "--include-source-only-agents",
  "--include-passive-agents",
  "--include-broad-coding-agents",
  "--unlink",
]);

function usage() {
  console.error(
    "Usage: node scripts/sync-codex-assets.js [--include-project-skills] [--include-project-agents] [--include-source-only-skills] [--include-broad-coding-skills] [--include-source-only-agents] [--unlink]",
  );
}

if (args.includes("--help") || args.includes("-h")) {
  usage();
  process.exit(0);
}
const unknownArg = args.find((arg) => !knownArgs.has(arg));
if (unknownArg) {
  console.error(`[codex-sync] unknown option: ${unknownArg}`);
  usage();
  process.exit(1);
}
const isUnlink = args.includes("--unlink");
// Codex already loads global ~/.codex/skills in every workspace. Mirroring the
// same skills into this repository's .agents/skills makes every description
// appear twice in this project. Keep the mirror available only for isolation
// tests or deliberately project-local installs.
const includeProjectSkills = args.includes("--include-project-skills");
const includeProjectAgents = args.includes("--include-project-agents");
const includeSourceOnlySkills = args.includes("--include-source-only-skills");
const includeBroadCodingSkills = args.includes("--include-broad-coding-skills");
const includeSourceOnlyAgents =
  args.includes("--include-source-only-agents") ||
  args.includes("--include-passive-agents") ||
  args.includes("--include-broad-coding-agents");

const repoRoot = path.resolve(__dirname, "..");
const skillsSrcDir = path.join(repoRoot, "skills");
const agentsSrcDir = path.join(repoRoot, "agents");
const hooksSrcDir = path.join(repoRoot, "hooks");
const codexMnemoHooksSrcDir = path.join(skillsSrcDir, "codex-mnemo", "hooks");

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
const preservationStamp = new Date().toISOString().replace(/[:.]/g, "-");

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function safeRm(targetPath) {
  // Managed-policy removals must fail the sync if the target cannot be
  // removed. Installers use the exit code to avoid reporting a partial sync
  // as successful.
  fs.rmSync(targetPath, { recursive: true, force: true });
}

function hashPath(targetPath, options = {}) {
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
        if (entry === "node_modules" && !options.includeNodeModules) continue;
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

function pathsMatch(left, right, options = {}) {
  try {
    const leftHash = hashPath(left, options);
    return leftHash !== null && leftHash === hashPath(right, options);
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

function uniqueBackupPath(homeRoot, kind, name) {
  const base = path.join(
    homeRoot,
    "_olympus-preserved",
    preservationStamp,
    kind,
  );
  const initial = path.join(base, name);
  if (!fs.existsSync(initial)) return initial;
  const parsed = path.parse(name);
  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const candidate = path.join(base, `${parsed.name}-${suffix}${parsed.ext}`);
    if (!fs.existsSync(candidate)) return candidate;
  }
  throw new Error(`Could not allocate preservation path for ${name}`);
}

function preservePath(targetPath, homeRoot, kind, name, reason) {
  const backupPath = uniqueBackupPath(homeRoot, kind, name);
  ensureDir(path.dirname(backupPath));
  try {
    fs.renameSync(targetPath, backupPath);
  } catch {
    fs.cpSync(targetPath, backupPath, { recursive: true, force: true });
    safeRm(targetPath);
  }
  console.warn(`[codex-sync] preserved ${reason}: ${targetPath} -> ${backupPath}`);
}

function preparePathForChange(
  sourcePath,
  targetPath,
  homeRoot,
  kind,
  name,
  reason,
  removeExact = false,
  expectedHash = null,
) {
  if (!fs.existsSync(targetPath)) return;
  if (matchesManagedHash(targetPath, expectedHash)) {
    if (removeExact) safeRm(targetPath);
    return;
  }
  if (
    sourcePath &&
    fs.existsSync(sourcePath) &&
    pathsMatch(sourcePath, targetPath, {
      includeNodeModules: removeExact,
    })
  ) {
    if (removeExact) safeRm(targetPath);
    return;
  }
  preservePath(targetPath, homeRoot, kind, name, reason);
}

function removeDirIfEmpty(dirPath) {
  try {
    if (fs.existsSync(dirPath) && fs.readdirSync(dirPath).length === 0) {
      fs.rmdirSync(dirPath);
    }
  } catch {
    // Local-only files or concurrent readers mean the directory should stay.
  }
}

function cleanupManagedAgentSubdirectories(destDir, homeRoot, previousHashes = {}) {
  if (!fs.existsSync(agentsSrcDir)) return;
  for (const entry of fs.readdirSync(agentsSrcDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      preparePathForChange(
        path.join(agentsSrcDir, entry.name),
        path.join(destDir, entry.name),
        homeRoot,
        "agent-support",
        entry.name,
        "same-name agent support directory disabled by runtime policy",
        true,
        previousHashes[entry.name],
      );
    }
  }
}

function hasNestedNodeModules(src) {
  const stack = [src];
  while (stack.length > 0) {
    const current = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name === "node_modules") return true;
      stack.push(path.join(current, entry.name));
    }
  }
  return false;
}

function isInsideNodeModules(srcRoot, candidatePath) {
  const rel = path.relative(srcRoot, candidatePath);
  if (!rel || rel.startsWith("..")) return false;
  return rel.split(path.sep).includes("node_modules");
}

function copyDir(src, dest, skipNodeModules = false, skipSkillMd = false) {
  const skillMdSrc = skipSkillMd ? path.resolve(src, "SKILL.md") : null;
  const filter =
    skipNodeModules || skipSkillMd
      ? (candidatePath) => {
          if (skipNodeModules && isInsideNodeModules(src, candidatePath)) return false;
          // SKILL.md는 syncSkills가 원자적으로 먼저 복사하므로 cpSync(force)가
          // unlink-재기록하지 않게 제외 — "failed to read SKILL.md" 윈도우 차단.
          if (skillMdSrc && path.resolve(candidatePath) === skillMdSrc) return false;
          return true;
        }
      : undefined;
  fs.cpSync(src, dest, { recursive: true, force: true, filter });
}

function atomicCopyFile(src, dest) {
  // temp에 복사 후 atomic rename — 동시 reader가 부재/절단 파일을 보지 않게 함
  // (sync 중 "failed to read SKILL.md" 윈도우 제거). rename 불가 시 직접 복사로 폴백.
  const tmp = `${dest}.${process.pid}.tmp`;
  try {
    fs.copyFileSync(src, tmp);
    fs.renameSync(tmp, dest);
  } catch {
    try {
      fs.rmSync(tmp, { force: true });
    } catch {
      // no-op
    }
    fs.copyFileSync(src, dest);
  }
}

function removeDestEntriesMissingFromSource(src, dest, skipNodeModules = false) {
  if (!fs.existsSync(dest)) return;

  for (const entry of fs.readdirSync(dest, { withFileTypes: true })) {
    const destPath = path.join(dest, entry.name);
    // Dependency caches are intentionally outside the managed source hash and
    // must never be treated as stale user content.
    if (entry.name === "node_modules") continue;
    if (skipNodeModules && isInsideNodeModules(dest, destPath)) continue;

    const srcPath = path.join(src, entry.name);
    if (!fs.existsSync(srcPath)) {
      safeRm(destPath);
      continue;
    }

    const srcStat = fs.statSync(srcPath);
    const destStat = fs.statSync(destPath);
    if (srcStat.isDirectory() && destStat.isDirectory()) {
      removeDestEntriesMissingFromSource(srcPath, destPath, skipNodeModules);
      continue;
    }

    if (srcStat.isDirectory() !== destStat.isDirectory()) {
      safeRm(destPath);
    }
  }
}

function filesMatch(src, dest) {
  try {
    const srcStat = fs.statSync(src);
    const destStat = fs.statSync(dest);
    if (!srcStat.isFile() || !destStat.isFile()) return false;
    if (srcStat.size !== destStat.size) return false;
    return fs.readFileSync(src).equals(fs.readFileSync(dest));
  } catch {
    return false;
  }
}

function copyFileIfChanged(src, dest) {
  if (filesMatch(src, dest)) return;
  atomicCopyFile(src, dest);
}

function listDirectories(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b));
}

function installDir(src, dest, skipSkillMd = false) {
  const skipNodeModules = hasNestedNodeModules(src) && fs.existsSync(dest);
  ensureDir(dest);
  removeDestEntriesMissingFromSource(src, dest, skipNodeModules);
  copyDir(src, dest, skipNodeModules, skipSkillMd);
  removeDestEntriesMissingFromSource(src, dest, skipNodeModules);
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

function collectCodexNotifyHookFiles() {
  const files = new Map();
  if (!fs.existsSync(codexMnemoHooksSrcDir)) return files;

  const allowedExt = new Set([".ps1", ".sh", ".js"]);
  for (const name of fs.readdirSync(codexMnemoHooksSrcDir).sort()) {
    const src = path.join(codexMnemoHooksSrcDir, name);
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
  const state = (manifest) => {
    const value = manifest || {};
    const list = (key) => (Array.isArray(value[key]) ? value[key] : []);
    const hashGroup = (key) => {
      const hashes = value.managedAssetHashes;
      return hashes && hashes[key] && typeof hashes[key] === "object"
        ? hashes[key]
        : {};
    };
    return {
      skills: list("managedSkills"),
      agents: list("managedAgents"),
      hooks: list("managedHooks"),
      codexNotifyHooks: list("managedCodexNotifyHooks"),
      supportDirectories: list("managedSupportDirectories"),
      hashes: {
        skills: hashGroup("skills"),
        agents: hashGroup("agents"),
        hooks: hashGroup("hooks"),
        codexNotifyHooks: hashGroup("codexNotifyHooks"),
        supportDirectories: hashGroup("supportDirectories"),
      },
    };
  };
  return {
    // Never merge these states. The repository mirror and CODEX_HOME may be
    // synchronized in different runs or against different temporary homes.
    project: state(readManifest(manifestPaths.project)),
    codex: state(readManifest(manifestPaths.codex)),
  };
}

function cleanupStaleEntries(destDir, previousNames, currentNames, options = {}) {
  ensureDir(destDir);
  const currentSet = new Set(currentNames);
  for (const name of previousNames) {
    if (!currentSet.has(name)) {
      const targetPath = path.join(destDir, name);
      if ((options.sourceRoot || options.sourceForName) && options.homeRoot && options.kind) {
        const sourcePath = options.sourceForName
          ? options.sourceForName(name)
          : path.join(options.sourceRoot, name);
        preparePathForChange(
          sourcePath,
          targetPath,
          options.homeRoot,
          options.kind,
          name,
          options.reason || "same-name managed asset removed by runtime policy",
          true,
          options.previousHashes && options.previousHashes[name],
        );
      } else {
        safeRm(targetPath);
      }
    }
  }
}

function prepareSelectedEntries(
  destDir,
  names,
  sourceRoot,
  homeRoot,
  kind,
  previousHashes = {},
) {
  for (const name of names) {
    preparePathForChange(
      path.join(sourceRoot, name),
      path.join(destDir, name),
      homeRoot,
      kind,
      name,
      `same-name ${kind} before managed replacement`,
      false,
      previousHashes[name],
    );
  }
}

function prepareSelectedAgentEntries(destDir, files, homeRoot, previousHashes = {}) {
  for (const [name, sourcePath] of files.entries()) {
    preparePathForChange(
      sourcePath,
      path.join(destDir, name),
      homeRoot,
      "agents",
      name,
      "same-name agent before managed replacement",
      false,
      previousHashes[name],
    );
  }
}

function prepareSelectedHookEntries(
  destDir,
  files,
  homeRoot,
  kind,
  previousHashes = {},
) {
  for (const [name, sourcePath] of files.entries()) {
    preparePathForChange(
      sourcePath,
      path.join(destDir, name),
      homeRoot,
      kind,
      name,
      "same-name hook before managed replacement",
      false,
      previousHashes[name],
    );
  }
}

function syncSkills(destDir, skillNames, mode) {
  ensureDir(destDir);
  for (const skillName of skillNames) {
    const src = path.join(skillsSrcDir, skillName);
    const dest = path.join(destDir, skillName);
    if (mode === "unlink") {
      continue;
    }
    // Keep SKILL.md present as early as possible. Codex can scan ~/.codex/skills
    // while this sync is running; an empty freshly-created skill directory causes
    // "failed to read file" warnings during startup.
    const skillMd = path.join(src, "SKILL.md");
    if (fs.existsSync(skillMd)) {
      ensureDir(dest);
      copyFileIfChanged(skillMd, path.join(dest, "SKILL.md"));
    }
    installDir(src, dest, true);
  }
}

function validateSkillInstall(destDir, skillNames) {
  const missing = [];
  for (const skillName of skillNames) {
    const skillMd = path.join(destDir, skillName, "SKILL.md");
    if (!fs.existsSync(skillMd)) {
      missing.push(skillMd);
    }
  }
  if (missing.length > 0) {
    throw new Error(`Missing SKILL.md after sync:\n${missing.join("\n")}`);
  }
}

function syncAgents(
  destDir,
  agentFiles,
  mode,
  homeRoot,
  previousSupportHashes = {},
) {
  if (mode === "unlink" || agentFiles.size === 0) {
    cleanupManagedAgentSubdirectories(destDir, homeRoot, previousSupportHashes);
    removeDirIfEmpty(destDir);
    return;
  }
  ensureDir(destDir);
  for (const [name, src] of agentFiles.entries()) {
    const dest = path.join(destDir, name);
    copyFileIfChanged(src, dest);
  }
  // agents/ 하위 디렉토리도 동기화 (references/ 등)
  if (mode !== "unlink" && fs.existsSync(agentsSrcDir)) {
    for (const entry of fs.readdirSync(agentsSrcDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const src = path.join(agentsSrcDir, entry.name);
      const dest = path.join(destDir, entry.name);
      preparePathForChange(
        src,
        dest,
        homeRoot,
        "agent-support",
        entry.name,
        "same-name agent support directory before managed replacement",
        false,
        previousSupportHashes[entry.name],
      );
      installDir(src, dest);
    }
  }
}

function syncHooks(destDir, hookFiles, mode) {
  ensureDir(destDir);
  for (const [name, src] of hookFiles.entries()) {
    const dest = path.join(destDir, name);
    if (mode === "unlink") {
      continue;
    }
    copyFileIfChanged(src, dest);
  }
}

function writeManifest(
  mode,
  skillNames,
  agentNames,
  hookNames,
  codexNotifyHookNames,
  projectSkillsEnabled,
  projectAgentsEnabled,
) {
  const supportDirectoryNames =
    agentNames.length > 0 && fs.existsSync(agentsSrcDir)
      ? fs
        .readdirSync(agentsSrcDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
      : [];
  const common = {
    mode,
    syncedAt: new Date().toISOString(),
    project: {
      skillsDir: projectSkillsEnabled ? targets.projectSkills : null,
      skillsEnabled: projectSkillsEnabled,
      agentsDir: projectAgentsEnabled ? targets.projectAgents : null,
      agentsEnabled: projectAgentsEnabled,
    },
    codex: {
      home: codexHome,
      skillsDir: targets.codexSkills,
      agentsDir: targets.codexAgents,
    },
  };
  const projectManifestData = {
    ...common,
    scope: "project",
    scopeRoot: repoRoot,
    managedSkills: projectSkillsEnabled ? skillNames : [],
    managedAgents: projectAgentsEnabled ? agentNames : [],
    managedHooks: hookNames,
    managedCodexNotifyHooks: [],
    managedSupportDirectories: projectAgentsEnabled ? supportDirectoryNames : [],
    managedAssetHashes: {
      skills: projectSkillsEnabled
        ? hashNamedPaths(targets.projectSkills, skillNames)
        : {},
      agents: projectAgentsEnabled
        ? hashNamedPaths(targets.projectAgents, agentNames)
        : {},
      hooks: hashNamedPaths(targets.projectHooks, hookNames),
      codexNotifyHooks: {},
      supportDirectories: projectAgentsEnabled
        ? hashNamedPaths(targets.projectAgents, supportDirectoryNames)
        : {},
    },
  };
  const codexManifestData = {
    ...common,
    scope: "codex-home",
    scopeRoot: codexHome,
    managedSkills: skillNames,
    managedAgents: agentNames,
    managedHooks: hookNames,
    managedCodexNotifyHooks: codexNotifyHookNames,
    managedSupportDirectories: supportDirectoryNames,
    managedAssetHashes: {
      skills: hashNamedPaths(targets.codexSkills, skillNames),
      agents: hashNamedPaths(targets.codexAgents, agentNames),
      hooks: hashNamedPaths(targets.codexHooks, hookNames),
      codexNotifyHooks: hashNamedPaths(
        targets.codexHooks,
        codexNotifyHookNames,
      ),
      supportDirectories: hashNamedPaths(
        targets.codexAgents,
        supportDirectoryNames,
      ),
    },
  };

  const projectManifest = manifestPaths.project;
  const codexManifest = manifestPaths.codex;
  ensureDir(path.dirname(projectManifest));
  ensureDir(path.dirname(codexManifest));

  fs.writeFileSync(
    projectManifest,
    JSON.stringify(projectManifestData, null, 2) + "\n",
    "utf8",
  );
  fs.writeFileSync(
    codexManifest,
    JSON.stringify(codexManifestData, null, 2) + "\n",
    "utf8",
  );
}

function run() {
  if (!fs.existsSync(skillsSrcDir)) {
    console.error(`[error] skills directory not found: ${skillsSrcDir}`);
    process.exit(1);
  }

  const mode = isUnlink ? "unlink" : "copy";
  const previous = loadPreviousManaged();

  // CLI별 어댑터가 따로 있거나 Codex 런타임과 무관한 스킬 제외
  const allSkillFiles = collectSkillFiles(skillsSrcDir);
  const allSkillNames = Array.from(allSkillFiles.keys());
  const { skillNames, runtimeExcludedNames, defaultDisabledNames } = selectRuntimeSkills(
    allSkillNames,
    RUNTIME_SKILL_EXCLUSIONS.codex,
    includeSourceOnlySkills,
    includeBroadCodingSkills,
  );
  if (runtimeExcludedNames.length > 0) {
    console.log(`[codex-sync] excluded (cli-specific): ${runtimeExcludedNames.join(", ")}`);
  }
  if (defaultDisabledNames.length > 0) {
    console.log(
      `[codex-sync] source-only skills: ${defaultDisabledNames.join(", ")}`,
    );
  }
  const allAgentFiles = collectAgentFiles(agentsSrcDir, skillsSrcDir);
  const { agentFiles, defaultDisabledNames: defaultDisabledAgentNames } =
    selectRuntimeAgents(allAgentFiles, includeSourceOnlyAgents);
  if (defaultDisabledAgentNames.length > 0) {
    console.log(
      `[codex-sync] source-only agents: ${defaultDisabledAgentNames.join(", ")}`,
    );
  }
  const hookFiles = collectHookFiles();
  const codexNotifyHookFiles = collectCodexNotifyHookFiles();
  const agentNames = Array.from(agentFiles.keys()).sort((a, b) => a.localeCompare(b));
  const hookNames = Array.from(hookFiles.keys()).sort((a, b) => a.localeCompare(b));
  const codexNotifyHookNames = Array.from(codexNotifyHookFiles.keys()).sort((a, b) => a.localeCompare(b));

  const projectHome = path.join(repoRoot, ".agents");
  const globalSkillOptions = {
    sourceRoot: skillsSrcDir,
    homeRoot: codexHome,
    kind: "skills",
    previousHashes: previous.codex.hashes.skills,
  };
  const projectSkillOptions = {
    sourceRoot: skillsSrcDir,
    homeRoot: projectHome,
    kind: "skills",
    previousHashes: previous.project.hashes.skills,
  };
  const globalAgentOptions = {
    sourceForName: (name) => allAgentFiles.get(name),
    homeRoot: codexHome,
    kind: "agents",
    previousHashes: previous.codex.hashes.agents,
  };
  const projectAgentOptions = {
    sourceForName: (name) => allAgentFiles.get(name),
    homeRoot: projectHome,
    kind: "agents",
    previousHashes: previous.project.hashes.agents,
  };
  const projectHookOptions = {
    sourceForName: (name) => hookFiles.get(name),
    homeRoot: projectHome,
    kind: "hooks",
    previousHashes: previous.project.hashes.hooks,
  };
  const globalHookOptions = {
    sourceForName: (name) => hookFiles.get(name),
    homeRoot: codexHome,
    kind: "hooks",
    previousHashes: previous.codex.hashes.hooks,
  };
  const globalNotifyHookOptions = {
    sourceForName: (name) => codexNotifyHookFiles.get(name),
    homeRoot: codexHome,
    kind: "hooks",
    previousHashes: previous.codex.hashes.codexNotifyHooks,
  };
  const targetMatrix = [
    {
      key: "skills",
      dest: targets.codexSkills,
      previousNames: previous.codex.skills,
      cleanupOptions: globalSkillOptions,
    },
    {
      key: "agents",
      dest: targets.codexAgents,
      previousNames: previous.codex.agents,
      cleanupOptions: globalAgentOptions,
    },
    {
      key: "hooks",
      dest: targets.projectHooks,
      previousNames: previous.project.hooks,
      cleanupOptions: projectHookOptions,
    },
    {
      key: "hooks",
      dest: targets.codexHooks,
      previousNames: previous.codex.hooks,
      cleanupOptions: globalHookOptions,
    },
    {
      key: "codexNotifyHooks",
      dest: targets.codexHooks,
      previousNames: previous.codex.codexNotifyHooks,
      cleanupOptions: globalNotifyHookOptions,
    },
  ];
  if (includeProjectSkills || mode === "unlink") {
    targetMatrix.unshift({
      key: "skills",
      dest: targets.projectSkills,
      previousNames: previous.project.skills,
      cleanupOptions: projectSkillOptions,
    });
  }
  if (includeProjectAgents || mode === "unlink") {
    targetMatrix.unshift({
      key: "agents",
      dest: targets.projectAgents,
      previousNames: previous.project.agents,
      cleanupOptions: projectAgentOptions,
    });
  }

  const currentByKey = {
    skills: mode === "unlink" ? [] : skillNames,
    agents: mode === "unlink" ? [] : agentNames,
    hooks: mode === "unlink" ? [] : hookNames,
    codexNotifyHooks: mode === "unlink" ? [] : codexNotifyHookNames,
  };

  if (mode !== "unlink") {
    pruneStaleAssets(path.join(repoRoot, ".agents"));
    pruneStaleAssets(codexHome);
    if (!includeSourceOnlySkills) {
      // The policy itself is authoritative even if an older or mismatched
      // manifest no longer remembers these previously installed directories.
      cleanupStaleEntries(
        targets.codexSkills,
        defaultDisabledNames,
        [],
        {
          ...globalSkillOptions,
          reason: "same-name skill disabled by runtime policy",
        },
      );
    }
    cleanupStaleEntries(targets.codexSkills, runtimeExcludedNames, [], {
      ...globalSkillOptions,
      reason: "same-name skill excluded for Codex",
    });
    if (!includeSourceOnlyAgents) {
      cleanupStaleEntries(
        targets.codexAgents,
        defaultDisabledAgentNames,
        [],
        {
          ...globalAgentOptions,
          reason: "same-name agent disabled by runtime policy",
        },
      );
    }
    if (!includeProjectSkills) {
      cleanupStaleEntries(
        targets.projectSkills,
        previous.project.skills,
        [],
        projectSkillOptions,
      );
      removeDirIfEmpty(targets.projectSkills);
    }
    if (!includeProjectAgents) {
      cleanupStaleEntries(
        targets.projectAgents,
        previous.project.agents,
        [],
        projectAgentOptions,
      );
      cleanupManagedAgentSubdirectories(
        targets.projectAgents,
        projectHome,
        previous.project.hashes.supportDirectories,
      );
      removeDirIfEmpty(targets.projectAgents);
    }
  }

  for (const item of targetMatrix) {
    cleanupStaleEntries(
      item.dest,
      item.previousNames,
      currentByKey[item.key],
      item.cleanupOptions,
    );
  }

  if (mode === "unlink") {
    cleanupStaleEntries(
      targets.codexSkills,
      allSkillNames,
      [],
      globalSkillOptions,
    );
    cleanupStaleEntries(
      targets.codexAgents,
      Array.from(allAgentFiles.keys()),
      [],
      globalAgentOptions,
    );
    cleanupStaleEntries(
      targets.projectSkills,
      allSkillNames,
      [],
      projectSkillOptions,
    );
    cleanupStaleEntries(
      targets.projectAgents,
      Array.from(allAgentFiles.keys()),
      [],
      projectAgentOptions,
    );
    cleanupStaleEntries(
      targets.projectHooks,
      hookNames,
      [],
      projectHookOptions,
    );
    cleanupStaleEntries(
      targets.codexHooks,
      hookNames,
      [],
      globalHookOptions,
    );
    cleanupStaleEntries(
      targets.codexHooks,
      codexNotifyHookNames,
      [],
      globalNotifyHookOptions,
    );
  } else {
    prepareSelectedEntries(
      targets.codexSkills,
      skillNames,
      skillsSrcDir,
      codexHome,
      "skills",
      previous.codex.hashes.skills,
    );
    prepareSelectedAgentEntries(
      targets.codexAgents,
      agentFiles,
      codexHome,
      previous.codex.hashes.agents,
    );
    if (includeProjectSkills) {
      prepareSelectedEntries(
        targets.projectSkills,
        skillNames,
        skillsSrcDir,
        projectHome,
        "skills",
        previous.project.hashes.skills,
      );
    }
    if (includeProjectAgents) {
      prepareSelectedAgentEntries(
        targets.projectAgents,
        agentFiles,
        projectHome,
        previous.project.hashes.agents,
      );
    }
    prepareSelectedHookEntries(
      targets.projectHooks,
      hookFiles,
      projectHome,
      "hooks",
      previous.project.hashes.hooks,
    );
    prepareSelectedHookEntries(
      targets.codexHooks,
      hookFiles,
      codexHome,
      "hooks",
      previous.codex.hashes.hooks,
    );
    prepareSelectedHookEntries(
      targets.codexHooks,
      codexNotifyHookFiles,
      codexHome,
      "hooks",
      previous.codex.hashes.codexNotifyHooks,
    );
  }

  if (includeProjectSkills || mode === "unlink") {
    syncSkills(targets.projectSkills, skillNames, mode);
  }
  syncSkills(targets.codexSkills, skillNames, mode);
  if (mode !== "unlink") {
    if (includeProjectSkills) {
      validateSkillInstall(targets.projectSkills, skillNames);
    }
    validateSkillInstall(targets.codexSkills, skillNames);
  }
  if (includeProjectAgents || mode === "unlink") {
    syncAgents(
      targets.projectAgents,
      agentFiles,
      mode,
      projectHome,
      previous.project.hashes.supportDirectories,
    );
  }
  syncAgents(
    targets.codexAgents,
    agentFiles,
    mode,
    codexHome,
    previous.codex.hashes.supportDirectories,
  );
  syncHooks(targets.projectHooks, hookFiles, mode);
  syncHooks(targets.codexHooks, hookFiles, mode);
  syncHooks(targets.codexHooks, codexNotifyHookFiles, mode);

  if (mode === "unlink") {
    safeRm(path.join(repoRoot, ".agents", ".codex-sync-manifest.json"));
    safeRm(path.join(codexHome, ".codex-sync-manifest.json"));
    safeRm(path.join(codexHome, "SKILLS-CATALOG.md"));
    safeRm(path.join(codexHome, "AGENTS-CATALOG.md"));
    safeRm(path.join(codexHome, ".olympus", "source-skills"));
    safeRm(path.join(codexHome, ".olympus", "runtime-modules"));
  } else {
    // 스킬 + 에이전트 카탈로그 생성
    const compatibleSkillFiles = new Map(
      Array.from(allSkillFiles.entries()).filter(
        ([name]) => !runtimeExcludedNames.includes(name),
      ),
    );
    const sourceSkillFiles = syncSkillSourceLibrary(codexHome, compatibleSkillFiles);
    const skillsCatalog = writeSkillsCatalog(
      codexHome,
      sourceSkillFiles,
      "codex-sync",
      { activeSkillNames: skillNames },
    );
    const agentsCatalog = writeAgentsCatalog(
      codexHome,
      agentFiles,
      "codex-sync",
      {
        activeAgentNames: includeSourceOnlyAgents
          ? agentNames
          : DEFAULT_RUNTIME_AGENT_ALLOWLIST,
      },
    );
    writeManifest(
      mode,
      skillNames,
      agentNames,
      hookNames,
      codexNotifyHookNames,
      includeProjectSkills,
      includeProjectAgents,
    );
    console.log(`[codex-sync] skills_catalog=${skillsCatalog}`);
    console.log(`[codex-sync] agents_catalog=${agentsCatalog}`);
  }

  console.log(`[codex-sync] mode=${mode}`);
  console.log(`[codex-sync] skills=${skillNames.length}`);
  console.log(`[codex-sync] agents=${agentNames.length}`);
  console.log(`[codex-sync] hooks=${hookNames.length}`);
  console.log(`[codex-sync] codex_notify_hooks=${codexNotifyHookNames.length}`);
  console.log(
    `[codex-sync] project_skills=${
      includeProjectSkills ? targets.projectSkills : "disabled (use --include-project-skills)"
    }`,
  );
  console.log(
    `[codex-sync] project_agents=${
      includeProjectAgents ? targets.projectAgents : "disabled (use --include-project-agents)"
    }`,
  );
  console.log(`[codex-sync] project_hooks=${targets.projectHooks}`);
  console.log(`[codex-sync] codex_skills=${targets.codexSkills}`);
  console.log(`[codex-sync] codex_hooks=${targets.codexHooks}`);
}

run();
