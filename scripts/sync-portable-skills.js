#!/usr/bin/env node
"use strict";

const crypto = require("crypto");
const fs = require("fs");
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

const HOSTS = Object.freeze({
  openclaw: Object.freeze({
    envName: "OPENCLAW_HOME",
    defaultDirectory: ".openclaw",
    displayName: "OpenClaw",
  }),
  hermes: Object.freeze({
    envName: "HERMES_HOME",
    defaultDirectory: ".hermes",
    displayName: "Hermes Agent",
  }),
});

function usage() {
  console.error(
    "Usage: node scripts/sync-portable-skills.js <openclaw|hermes> [--home <dir>] [--include-source-only-skills] [--include-broad-coding-skills] [--uninstall|--unlink]",
  );
}

function parseArgs(argv) {
  if (argv.includes("--help") || argv.includes("-h")) {
    usage();
    process.exit(0);
  }

  const runtime = argv[0];
  if (!Object.hasOwn(HOSTS, runtime)) {
    console.error(`[portable-skills] unsupported runtime: ${runtime || "(missing)"}`);
    usage();
    process.exit(1);
  }

  let homeOverride = null;
  let includeSourceOnlySkills = false;
  let includeBroadCodingSkills = false;
  let unlink = false;

  for (let index = 1; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--home") {
      homeOverride = argv[index + 1];
      if (!homeOverride || homeOverride.startsWith("--")) {
        console.error("[portable-skills] --home requires a directory");
        process.exit(1);
      }
      index += 1;
    } else if (arg === "--include-source-only-skills") {
      includeSourceOnlySkills = true;
    } else if (arg === "--include-broad-coding-skills") {
      includeBroadCodingSkills = true;
    } else if (arg === "--unlink" || arg === "--uninstall") {
      unlink = true;
    } else {
      console.error(`[portable-skills] unknown option: ${arg}`);
      usage();
      process.exit(1);
    }
  }

  return {
    runtime,
    homeOverride,
    includeSourceOnlySkills,
    includeBroadCodingSkills,
    unlink,
  };
}

function resolveHome(options) {
  const host = HOSTS[options.runtime];
  const configured = options.homeOverride || process.env[host.envName];
  const expanded = configured
    ? configured.replace(/^~(?=$|[\\/])/, os.homedir())
    : path.join(os.homedir(), host.defaultDirectory);
  const resolved = path.resolve(expanded);
  if (resolved === path.parse(resolved).root) {
    throw new Error(`Refusing to use a filesystem root as ${host.displayName} home`);
  }
  return resolved;
}

function safeRemove(targetPath) {
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
  return typeof expectedHash === "string" &&
    expectedHash.length > 0 &&
    hashPath(targetPath) === expectedHash;
}

function readManifest(manifestPath) {
  try {
    const value = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    return {
      skills: Array.isArray(value.managedSkills) ? value.managedSkills : [],
      hashes: value.managedAssetHashes?.skills || {},
    };
  } catch {
    return { skills: [], hashes: {} };
  }
}

function hashNamedPaths(rootDirectory, names) {
  const hashes = {};
  for (const name of names) {
    const value = hashPath(path.join(rootDirectory, name));
    if (value) hashes[name] = value;
  }
  return hashes;
}

function uniquePreservePath(preservationRoot, name) {
  const initial = path.join(preservationRoot, name);
  if (!fs.existsSync(initial)) return initial;
  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const candidate = path.join(preservationRoot, `${name}-${suffix}`);
    if (!fs.existsSync(candidate)) return candidate;
  }
  throw new Error(`Could not allocate preservation path for ${name}`);
}

function preservePath(targetPath, preservationRoot, runtime, name, reason) {
  const backupPath = uniquePreservePath(preservationRoot, name);
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  try {
    fs.renameSync(targetPath, backupPath);
  } catch {
    fs.cpSync(targetPath, backupPath, { recursive: true, force: true });
    safeRemove(targetPath);
  }
  console.warn(`[${runtime}-skills] preserved ${reason}: ${targetPath} -> ${backupPath}`);
}

function removeOrPreserveSkill(context, name, reason, expectedHash) {
  const sourcePath = path.join(context.skillsSource, name);
  const targetPath = path.join(context.skillsTarget, name);
  if (!fs.existsSync(targetPath)) return;
  if (
    matchesManagedHash(targetPath, expectedHash) ||
    (fs.existsSync(sourcePath) && pathsMatch(sourcePath, targetPath))
  ) {
    safeRemove(targetPath);
    return;
  }
  preservePath(
    targetPath,
    context.preservationRoot,
    context.runtime,
    name,
    reason,
  );
}

function removeDestinationEntriesMissingFromSource(sourcePath, targetPath) {
  if (!fs.existsSync(targetPath)) return;
  for (const entry of fs.readdirSync(targetPath, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const sourceEntry = path.join(sourcePath, entry.name);
    const targetEntry = path.join(targetPath, entry.name);
    if (!fs.existsSync(sourceEntry)) {
      safeRemove(targetEntry);
      continue;
    }
    const sourceStat = fs.statSync(sourceEntry);
    const targetStat = fs.statSync(targetEntry);
    if (sourceStat.isDirectory() && targetStat.isDirectory()) {
      removeDestinationEntriesMissingFromSource(sourceEntry, targetEntry);
    } else if (sourceStat.isDirectory() !== targetStat.isDirectory()) {
      safeRemove(targetEntry);
    }
  }
}

function copySkill(context, name, expectedHash) {
  const sourcePath = path.join(context.skillsSource, name);
  const targetPath = path.join(context.skillsTarget, name);
  if (
    fs.existsSync(targetPath) &&
    !matchesManagedHash(targetPath, expectedHash) &&
    !pathsMatch(sourcePath, targetPath)
  ) {
    preservePath(
      targetPath,
      context.preservationRoot,
      context.runtime,
      name,
      "same-name skill before managed replacement",
    );
  }
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  removeDestinationEntriesMissingFromSource(sourcePath, targetPath);
  fs.cpSync(sourcePath, targetPath, {
    recursive: true,
    force: true,
    filter: (candidate) => !candidate.split(path.sep).includes("node_modules"),
  });
  removeDestinationEntriesMissingFromSource(sourcePath, targetPath);
}

function removeDirectoryIfEmpty(directory) {
  try {
    if (fs.existsSync(directory) && fs.readdirSync(directory).length === 0) {
      fs.rmdirSync(directory);
    }
  } catch {
    // User-owned siblings keep the host directory alive.
  }
}

function run() {
  const options = parseArgs(process.argv.slice(2));
  const runtimeHome = resolveHome(options);
  const repoRoot = path.resolve(__dirname, "..");
  const skillsSource = path.join(repoRoot, "skills");
  const skillsTarget = path.join(runtimeHome, "skills");
  const manifestPath = path.join(runtimeHome, ".olympus-skills-sync-manifest.json");
  const preservationStamp = new Date().toISOString().replace(/[:.]/g, "-");
  const context = {
    runtime: options.runtime,
    skillsSource,
    skillsTarget,
    preservationRoot: path.join(
      runtimeHome,
      "_olympus-preserved",
      preservationStamp,
      "skills",
    ),
  };

  const allSkillFiles = collectSkillFiles(skillsSource);
  const allSkillNames = Array.from(allSkillFiles.keys());
  const previous = readManifest(manifestPath);
  const selection = selectRuntimeSkills(
    allSkillNames,
    RUNTIME_SKILL_EXCLUSIONS[options.runtime],
    options.includeSourceOnlySkills,
    options.includeBroadCodingSkills,
  );

  if (options.unlink) {
    const previousSet = new Set(previous.skills);
    for (const name of allSkillNames) {
      const targetPath = path.join(skillsTarget, name);
      if (!fs.existsSync(targetPath)) continue;
      if (previousSet.has(name)) {
        removeOrPreserveSkill(
          context,
          name,
          "modified managed skill during unlink",
          previous.hashes[name],
        );
      } else if (pathsMatch(path.join(skillsSource, name), targetPath)) {
        safeRemove(targetPath);
      }
    }
    safeRemove(manifestPath);
    safeRemove(path.join(runtimeHome, "SKILLS-CATALOG.md"));
    safeRemove(path.join(runtimeHome, ".olympus", "source-skills"));
    safeRemove(path.join(runtimeHome, ".olympus", "runtime-modules"));
    removeDirectoryIfEmpty(path.join(runtimeHome, ".olympus"));
    removeDirectoryIfEmpty(skillsTarget);
    removeDirectoryIfEmpty(runtimeHome);
    console.log(`[${options.runtime}-skills] mode=unlink`);
    console.log(`[${options.runtime}-skills] skills=0`);
    return;
  }

  fs.mkdirSync(skillsTarget, { recursive: true });
  const selected = new Set(selection.skillNames);
  for (const name of new Set([
    ...previous.skills,
    ...selection.defaultDisabledNames,
    ...selection.runtimeExcludedNames,
  ])) {
    if (!selected.has(name)) {
      removeOrPreserveSkill(
        context,
        name,
        "same-name skill disabled by runtime policy",
        previous.hashes[name],
      );
    }
  }
  for (const name of selection.skillNames) {
    copySkill(context, name, previous.hashes[name]);
  }

  const compatibleSkillFiles = new Map(
    Array.from(allSkillFiles.entries()).filter(
      ([name]) => !selection.runtimeExcludedNames.includes(name),
    ),
  );
  const sourceSkillFiles = syncSkillSourceLibrary(runtimeHome, compatibleSkillFiles);
  const catalogPath = writeSkillsCatalog(
    runtimeHome,
    sourceSkillFiles,
    `${options.runtime}-sync`,
    { activeSkillNames: selection.skillNames },
  );
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        mode: "copy",
        tier: "skills-only",
        runtime: options.runtime,
        syncedAt: new Date().toISOString(),
        source: skillsSource,
        skillsDir: skillsTarget,
        managedSkills: selection.skillNames,
        managedAssetHashes: {
          skills: hashNamedPaths(skillsTarget, selection.skillNames),
        },
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );

  console.log(`[${options.runtime}-skills] tier=skills-only`);
  console.log(`[${options.runtime}-skills] source-only: ${selection.defaultDisabledNames.join(", ")}`);
  console.log(`[${options.runtime}-skills] excluded (runtime adapters): ${selection.runtimeExcludedNames.join(", ")}`);
  console.log(`[${options.runtime}-skills] mode=copy`);
  console.log(`[${options.runtime}-skills] skills=${selection.skillNames.length}`);
  console.log(`[${options.runtime}-skills] home=${runtimeHome}`);
  console.log(`[${options.runtime}-skills] catalog=${catalogPath}`);
}

try {
  run();
} catch (error) {
  console.error(`[portable-skills] ${error.message}`);
  process.exit(1);
}
