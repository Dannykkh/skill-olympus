#!/usr/bin/env node
"use strict";

const fs = require("fs");
const crypto = require("crypto");
const os = require("os");
const path = require("path");
const {
  collectSkillFiles,
  syncSkillSourceLibrary,
  writeSkillsCatalog,
} = require("./skill-catalog");
const {
  RUNTIME_SKILL_EXCLUSIONS,
  selectRuntimeSkills,
} = require("./skill-install-policy");

const repoRoot = path.resolve(__dirname, "..");
const skillsSrcDir = path.join(repoRoot, "skills");
const args = process.argv.slice(2);
const knownFlags = new Set([
  "--include-source-only-skills",
  "--include-broad-coding-skills",
  "--unlink",
]);

function usage() {
  console.error(
    "Usage: node scripts/sync-claude-skills.js [dest-home] [--include-source-only-skills] [--include-broad-coding-skills] [--unlink]",
  );
}

if (args.includes("--help") || args.includes("-h")) {
  usage();
  process.exit(0);
}
const unknownFlag = args.find(
  (arg) => arg.startsWith("-") && !knownFlags.has(arg),
);
if (unknownFlag) {
  console.error(`[claude-skills] unknown option: ${unknownFlag}`);
  usage();
  process.exit(1);
}
const includeSourceOnlySkills = args.includes("--include-source-only-skills");
const includeBroadCodingSkills = args.includes("--include-broad-coding-skills");
const isUnlink = args.includes("--unlink");

let destHome = null;
for (const arg of args) {
  if (arg.startsWith("--")) continue;
  if (destHome) {
    console.error(`[claude-skills] unexpected argument: ${arg}`);
    process.exit(1);
  }
  destHome = path.resolve(
    arg === "~" ? os.homedir() : arg.replace(/^~[\\/]/, `${os.homedir()}${path.sep}`),
  );
}
destHome = destHome || path.join(os.homedir(), ".claude");

const destSkillsDir = path.join(destHome, "skills");
const manifestPath = path.join(destHome, ".claude-skills-sync-manifest.json");
const preservationStamp = new Date().toISOString().replace(/[:.]/g, "-");
const preservationRoot = path.join(
  destHome,
  "_olympus-preserved",
  preservationStamp,
  "skills",
);
function safeRm(targetPath) {
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
  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const candidate = path.join(preservationRoot, `${name}-${suffix}`);
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
    `[claude-skills] preserved ${reason}: ${targetPath} -> ${backupPath}`,
  );
}

function removeOrPreserveSkill(name, reason, expectedHash) {
  const src = path.join(skillsSrcDir, name);
  const dest = path.join(destSkillsDir, name);
  if (!fs.existsSync(dest)) return;
  if (matchesManagedHash(dest, expectedHash)) {
    safeRm(dest);
    return;
  }
  if (
    fs.existsSync(src) &&
    pathsMatch(src, dest, { includeNodeModules: true })
  ) {
    safeRm(dest);
    return;
  }
  preservePath(dest, name, reason);
}

function readPreviousManaged() {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    return {
      skills: Array.isArray(manifest.managedSkills) ? manifest.managedSkills : [],
      hashes:
        manifest.managedAssetHashes &&
        manifest.managedAssetHashes.skills &&
        typeof manifest.managedAssetHashes.skills === "object"
          ? manifest.managedAssetHashes.skills
          : {},
    };
  } catch {
    return { skills: [], hashes: {} };
  }
}

function copySkill(name, expectedHash) {
  const src = path.join(skillsSrcDir, name);
  const dest = path.join(destSkillsDir, name);
  if (fs.existsSync(dest)) {
    if (matchesManagedHash(dest, expectedHash) || pathsMatch(src, dest)) {
      // An exact managed copy can be updated in place. This also preserves
      // dependency caches that are intentionally omitted from hashing.
    } else {
      preservePath(dest, name, "same-name skill before managed replacement");
    }
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  removeDestEntriesMissingFromSource(src, dest);
  fs.cpSync(src, dest, { recursive: true, force: true });
  removeDestEntriesMissingFromSource(src, dest);
}

function run() {
  const allSkillFiles = collectSkillFiles(skillsSrcDir);
  const allSkillNames = Array.from(allSkillFiles.keys());
  const previous = readPreviousManaged();
  const {
    skillNames,
    runtimeExcludedNames,
    defaultDisabledNames,
  } = selectRuntimeSkills(
    allSkillNames,
    RUNTIME_SKILL_EXCLUSIONS.claude,
    includeSourceOnlySkills,
    includeBroadCodingSkills,
  );

  if (isUnlink) {
    const previousSet = new Set(previous.skills);
    for (const name of allSkillNames) {
      const src = path.join(skillsSrcDir, name);
      const dest = path.join(destSkillsDir, name);
      if (!fs.existsSync(dest)) continue;
      if (previousSet.has(name)) {
        removeOrPreserveSkill(
          name,
          "modified managed skill during unlink",
          previous.hashes[name],
        );
      } else if (pathsMatch(src, dest)) {
        safeRm(dest);
      }
    }
    safeRm(manifestPath);
    safeRm(path.join(destHome, "SKILLS-CATALOG.md"));
    safeRm(path.join(destHome, ".olympus", "source-skills"));
    safeRm(path.join(destHome, ".olympus", "runtime-modules"));
    console.log("[claude-skills] mode=unlink");
    console.log("[claude-skills] skills=0");
    return;
  }

  fs.mkdirSync(destSkillsDir, { recursive: true });
  const selected = new Set(skillNames);
  for (const name of new Set([
    ...previous.skills,
    ...defaultDisabledNames,
    ...runtimeExcludedNames,
  ])) {
    if (!selected.has(name)) {
      removeOrPreserveSkill(
        name,
        "same-name skill disabled by runtime policy",
        previous.hashes[name],
      );
    }
  }
  for (const name of skillNames) copySkill(name, previous.hashes[name]);

  const compatibleSkillFiles = new Map(
    Array.from(allSkillFiles.entries()).filter(
      ([name]) => !runtimeExcludedNames.includes(name),
    ),
  );
  const sourceSkillFiles = syncSkillSourceLibrary(destHome, compatibleSkillFiles);
  const catalogPath = writeSkillsCatalog(destHome, sourceSkillFiles, "claude-sync", {
    activeSkillNames: skillNames,
  });
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        mode: "copy",
        syncedAt: new Date().toISOString(),
        source: skillsSrcDir,
        skillsDir: destSkillsDir,
        managedSkills: skillNames,
        managedAssetHashes: {
          skills: hashNamedPaths(destSkillsDir, skillNames),
        },
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );

  console.log(`[claude-skills] source-only: ${defaultDisabledNames.join(", ")}`);
  console.log(`[claude-skills] excluded (cli-specific): ${runtimeExcludedNames.join(", ")}`);
  console.log("[claude-skills] mode=copy");
  console.log(`[claude-skills] skills=${skillNames.length}`);
  console.log(`[claude-skills] catalog=${catalogPath}`);
}

run();
