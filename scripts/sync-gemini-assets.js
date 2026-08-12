#!/usr/bin/env node
"use strict";

// Gemini CLI용 Skills/Agents/Hooks 동기화 스크립트
// sync-codex-assets.js를 기반으로 ~/.gemini/ 경로에 에셋 동기화
//
// 사용법:
//   node scripts/sync-gemini-assets.js              # 복사 모드
//   node scripts/sync-gemini-assets.js --include-source-only-skills
//   node scripts/sync-gemini-assets.js --include-source-only-agents
//   node scripts/sync-gemini-assets.js --unlink     # 제거 모드

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
  "--include-source-only-skills",
  "--include-broad-coding-skills",
  "--include-source-only-agents",
  "--include-passive-agents",
  "--include-broad-coding-agents",
  "--unlink",
]);

function usage() {
  console.error(
    "Usage: node scripts/sync-gemini-assets.js [--include-source-only-skills] [--include-broad-coding-skills] [--include-source-only-agents] [--unlink]",
  );
}

if (args.includes("--help") || args.includes("-h")) {
  usage();
  process.exit(0);
}
const unknownArg = args.find((arg) => !knownArgs.has(arg));
if (unknownArg) {
  console.error(`[gemini-sync] unknown option: ${unknownArg}`);
  usage();
  process.exit(1);
}
const isUnlink = args.includes("--unlink");
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

const geminiHome = process.env.GEMINI_HOME
  ? path.resolve(process.env.GEMINI_HOME)
  : path.join(os.homedir(), ".gemini");

const targets = {
  geminiSkills: path.join(geminiHome, "skills"),
  geminiAgents: path.join(geminiHome, "agents"),
  geminiHooks: path.join(geminiHome, "hooks"),
};

const manifestPath = path.join(geminiHome, ".gemini-sync-manifest.json");
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

function uniqueBackupPath(kind, name) {
  const base = path.join(
    geminiHome,
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

function preservePath(targetPath, kind, name, reason) {
  const backupPath = uniqueBackupPath(kind, name);
  ensureDir(path.dirname(backupPath));
  try {
    fs.renameSync(targetPath, backupPath);
  } catch {
    fs.cpSync(targetPath, backupPath, { recursive: true, force: true });
    safeRm(targetPath);
  }
  console.warn(`[gemini-sync] preserved ${reason}: ${targetPath} -> ${backupPath}`);
}

function preparePathForChange(
  sourcePath,
  targetPath,
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
  preservePath(targetPath, kind, name, reason);
}

function removeDirIfEmpty(dirPath) {
  try {
    if (fs.existsSync(dirPath) && fs.readdirSync(dirPath).length === 0) {
      fs.rmdirSync(dirPath);
    }
  } catch {
    // Preserve local-only files and tolerate concurrent readers.
  }
}

function cleanupManagedAgentSubdirectories(destDir, previousHashes = {}) {
  if (!fs.existsSync(agentsSrcDir) || !fs.existsSync(destDir)) return;
  for (const entry of fs.readdirSync(agentsSrcDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      preparePathForChange(
        path.join(agentsSrcDir, entry.name),
        path.join(destDir, entry.name),
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

function readManifest() {
  try {
    return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch {
    return null;
  }
}

function loadPreviousManaged() {
  const manifest = readManifest() || {};
  const toArray = (v) => (Array.isArray(v) ? v : []);
  const hashGroup = (key) => {
    const hashes = manifest.managedAssetHashes;
    return hashes && hashes[key] && typeof hashes[key] === "object"
      ? hashes[key]
      : {};
  };
  return {
    skills: toArray(manifest.managedSkills),
    agents: toArray(manifest.managedAgents),
    hooks: toArray(manifest.managedHooks),
    supportDirectories: toArray(manifest.managedSupportDirectories),
    hashes: {
      skills: hashGroup("skills"),
      agents: hashGroup("agents"),
      hooks: hashGroup("hooks"),
      supportDirectories: hashGroup("supportDirectories"),
    },
  };
}

function cleanupStaleEntries(destDir, previousNames, currentNames, options = {}) {
  ensureDir(destDir);
  const currentSet = new Set(currentNames);
  for (const name of previousNames) {
    if (!currentSet.has(name)) {
      const targetPath = path.join(destDir, name);
      if ((options.sourceRoot || options.sourceForName) && options.kind) {
        const sourcePath = options.sourceForName
          ? options.sourceForName(name)
          : path.join(options.sourceRoot, name);
        preparePathForChange(
          sourcePath,
          targetPath,
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
  kind,
  previousHashes = {},
) {
  for (const name of names) {
    preparePathForChange(
      path.join(sourceRoot, name),
      path.join(destDir, name),
      kind,
      name,
      `same-name ${kind} before managed replacement`,
      false,
      previousHashes[name],
    );
  }
}

function prepareSelectedAgentEntries(destDir, files, previousHashes = {}) {
  for (const [name, sourcePath] of files.entries()) {
    preparePathForChange(
      sourcePath,
      path.join(destDir, name),
      "agents",
      name,
      "same-name agent before managed replacement",
      false,
      previousHashes[name],
    );
  }
}

function prepareSelectedHookEntries(destDir, files, previousHashes = {}) {
  for (const [name, sourcePath] of files.entries()) {
    preparePathForChange(
      sourcePath,
      path.join(destDir, name),
      "hooks",
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
    // Keep SKILL.md present as early as possible. Gemini/Codex-style skill
    // loaders may scan while this sync is running.
    const skillMd = path.join(src, "SKILL.md");
    if (fs.existsSync(skillMd)) {
      ensureDir(dest);
      atomicCopyFile(skillMd, path.join(dest, "SKILL.md"));
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

function syncAgents(destDir, agentFiles, mode, previousSupportHashes = {}) {
  if (mode === "unlink" || agentFiles.size === 0) {
    cleanupManagedAgentSubdirectories(destDir, previousSupportHashes);
    removeDirIfEmpty(destDir);
    return;
  }
  ensureDir(destDir);
  for (const [name, src] of agentFiles.entries()) {
    const dest = path.join(destDir, name);
    fs.copyFileSync(src, dest);
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
    fs.copyFileSync(src, dest);
    // 실행 권한 설정 (Linux/Mac)
    if (process.platform !== "win32" && name.endsWith(".sh")) {
      try { fs.chmodSync(dest, 0o755); } catch { /* no-op */ }
    }
  }
}

function writeManifest(mode, skillNames, agentNames, hookNames) {
  const supportDirectoryNames =
    agentNames.length > 0 && fs.existsSync(agentsSrcDir)
      ? fs
        .readdirSync(agentsSrcDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
      : [];
  const manifest = {
    mode,
    syncedAt: new Date().toISOString(),
    gemini: {
      home: geminiHome,
      skillsDir: targets.geminiSkills,
      agentsDir: targets.geminiAgents,
      hooksDir: targets.geminiHooks,
    },
    managedSkills: skillNames,
    managedAgents: agentNames,
    managedHooks: hookNames,
    managedSupportDirectories: supportDirectoryNames,
    managedAssetHashes: {
      skills: hashNamedPaths(targets.geminiSkills, skillNames),
      agents: hashNamedPaths(targets.geminiAgents, agentNames),
      hooks: hashNamedPaths(targets.geminiHooks, hookNames),
      supportDirectories: hashNamedPaths(
        targets.geminiAgents,
        supportDirectoryNames,
      ),
    },
  };

  ensureDir(path.dirname(manifestPath));
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
}

// Older Olympus releases wrote an unsupported top-level key. Current Gemini
// uses experimental.enableAgents and enables it by default, so respect the
// runtime default and any explicit user setting.
function removeLegacyAgentToggle() {
  const settingsPath = path.join(geminiHome, "settings.json");
  if (!fs.existsSync(settingsPath)) return false;
  let settings;
  try {
    settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
  } catch {
    return false;
  }
  if (!Object.prototype.hasOwnProperty.call(settings, "enableAgents")) return false;
  delete settings.enableAgents;
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n", "utf8");
  return true;
}

function run() {
  if (!fs.existsSync(skillsSrcDir)) {
    console.error(`[error] skills directory not found: ${skillsSrcDir}`);
    process.exit(1);
  }

  const mode = isUnlink ? "unlink" : "copy";
  const previous = loadPreviousManaged();

  // Gemini 전용 어댑터가 따로 있거나 Gemini 런타임과 무관한 스킬 제외
  const allSkillFiles = collectSkillFiles(skillsSrcDir);
  const allSkillNames = Array.from(allSkillFiles.keys());
  const { skillNames, runtimeExcludedNames, defaultDisabledNames } = selectRuntimeSkills(
    allSkillNames,
    RUNTIME_SKILL_EXCLUSIONS.gemini,
    includeSourceOnlySkills,
    includeBroadCodingSkills,
  );
  if (runtimeExcludedNames.length > 0) {
    console.log(`[gemini-sync] excluded (cli-specific): ${runtimeExcludedNames.join(", ")}`);
  }
  if (defaultDisabledNames.length > 0) {
    console.log(
      `[gemini-sync] source-only skills: ${defaultDisabledNames.join(", ")}`,
    );
  }
  const allAgentFiles = collectAgentFiles(agentsSrcDir, skillsSrcDir);
  const { agentFiles, defaultDisabledNames: defaultDisabledAgentNames } =
    selectRuntimeAgents(allAgentFiles, includeSourceOnlyAgents);
  if (defaultDisabledAgentNames.length > 0) {
    console.log(
      `[gemini-sync] source-only agents: ${defaultDisabledAgentNames.join(", ")}`,
    );
  }
  const hookFiles = collectHookFiles();
  const agentNames = Array.from(agentFiles.keys()).sort((a, b) => a.localeCompare(b));
  const hookNames = Array.from(hookFiles.keys()).sort((a, b) => a.localeCompare(b));

  const skillCleanupOptions = {
    sourceRoot: skillsSrcDir,
    kind: "skills",
    previousHashes: previous.hashes.skills,
  };
  const agentCleanupOptions = {
    sourceForName: (name) => allAgentFiles.get(name),
    kind: "agents",
    previousHashes: previous.hashes.agents,
  };
  const hookCleanupOptions = {
    sourceForName: (name) => hookFiles.get(name),
    kind: "hooks",
    previousHashes: previous.hashes.hooks,
  };
  const targetDirs = [
    {
      key: "skills",
      dest: targets.geminiSkills,
      cleanupOptions: skillCleanupOptions,
    },
    {
      key: "agents",
      dest: targets.geminiAgents,
      cleanupOptions: agentCleanupOptions,
    },
    {
      key: "hooks",
      dest: targets.geminiHooks,
      cleanupOptions: hookCleanupOptions,
    },
  ];

  const currentByKey = {
    skills: mode === "unlink" ? [] : skillNames,
    agents: mode === "unlink" ? [] : agentNames,
    hooks: mode === "unlink" ? [] : hookNames,
  };

  if (mode !== "unlink") {
    pruneStaleAssets(geminiHome);
    if (!includeSourceOnlySkills) {
      // Enforce the policy even when an old or missing manifest cannot account
      // for directories installed by an earlier Olympus release.
      cleanupStaleEntries(
        targets.geminiSkills,
        defaultDisabledNames,
        [],
        {
          ...skillCleanupOptions,
          reason: "same-name skill disabled by runtime policy",
        },
      );
    }
    cleanupStaleEntries(targets.geminiSkills, runtimeExcludedNames, [], {
      ...skillCleanupOptions,
      reason: "same-name skill excluded for Gemini",
    });
    if (!includeSourceOnlyAgents) {
      cleanupStaleEntries(
        targets.geminiAgents,
        defaultDisabledAgentNames,
        [],
        {
          ...agentCleanupOptions,
          reason: "same-name agent disabled by runtime policy",
        },
      );
    }
  }

  for (const item of targetDirs) {
    cleanupStaleEntries(
      item.dest,
      previous[item.key],
      currentByKey[item.key],
      item.cleanupOptions,
    );
  }

  if (mode === "unlink") {
    cleanupStaleEntries(
      targets.geminiSkills,
      allSkillNames,
      [],
      skillCleanupOptions,
    );
    cleanupStaleEntries(
      targets.geminiAgents,
      Array.from(allAgentFiles.keys()),
      [],
      agentCleanupOptions,
    );
    cleanupStaleEntries(
      targets.geminiHooks,
      hookNames,
      [],
      hookCleanupOptions,
    );
  } else {
    prepareSelectedEntries(
      targets.geminiSkills,
      skillNames,
      skillsSrcDir,
      "skills",
      previous.hashes.skills,
    );
    prepareSelectedAgentEntries(
      targets.geminiAgents,
      agentFiles,
      previous.hashes.agents,
    );
    prepareSelectedHookEntries(
      targets.geminiHooks,
      hookFiles,
      previous.hashes.hooks,
    );
  }

  syncSkills(targets.geminiSkills, skillNames, mode);
  if (mode !== "unlink") {
    validateSkillInstall(targets.geminiSkills, skillNames);
  }
  syncAgents(
    targets.geminiAgents,
    agentFiles,
    mode,
    previous.hashes.supportDirectories,
  );
  syncHooks(targets.geminiHooks, hookFiles, mode);

  if (mode === "unlink") {
    safeRm(manifestPath);
    safeRm(path.join(geminiHome, "SKILLS-CATALOG.md"));
    safeRm(path.join(geminiHome, "AGENTS-CATALOG.md"));
    safeRm(path.join(geminiHome, ".olympus", "source-skills"));
    safeRm(path.join(geminiHome, ".olympus", "runtime-modules"));
  } else {
    if (removeLegacyAgentToggle()) {
      console.log("[gemini-sync] removed legacy top-level enableAgents setting");
    }
    // 스킬 + 에이전트 카탈로그 생성
    const compatibleSkillFiles = new Map(
      Array.from(allSkillFiles.entries()).filter(
        ([name]) => !runtimeExcludedNames.includes(name),
      ),
    );
    const sourceSkillFiles = syncSkillSourceLibrary(geminiHome, compatibleSkillFiles);
    const skillsCatalog = writeSkillsCatalog(
      geminiHome,
      sourceSkillFiles,
      "gemini-sync",
      { activeSkillNames: skillNames },
    );
    const agentsCatalog = writeAgentsCatalog(
      geminiHome,
      agentFiles,
      "gemini-sync",
      {
        activeAgentNames: includeSourceOnlyAgents
          ? agentNames
          : DEFAULT_RUNTIME_AGENT_ALLOWLIST,
      },
    );
    writeManifest(mode, skillNames, agentNames, hookNames);
    console.log(`[gemini-sync] skills_catalog=${skillsCatalog}`);
    console.log(`[gemini-sync] agents_catalog=${agentsCatalog}`);
  }

  console.log(`[gemini-sync] mode=${mode}`);
  console.log(`[gemini-sync] skills=${skillNames.length}`);
  console.log(`[gemini-sync] agents=${agentNames.length}`);
  console.log(`[gemini-sync] hooks=${hookNames.length}`);
  console.log(`[gemini-sync] gemini_skills=${targets.geminiSkills}`);
  console.log(`[gemini-sync] gemini_agents=${targets.geminiAgents}`);
  console.log(`[gemini-sync] gemini_hooks=${targets.geminiHooks}`);
}

run();
