#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { generateAgentsCatalog } = require("./agent-catalog");
const { collectAgentFiles } = require("./agent-files");
const {
  DEFAULT_RUNTIME_AGENT_ALLOWLIST,
  selectRuntimeAgents,
} = require("./agent-install-policy");
const {
  collectSkillFiles,
  syncSkillSourceLibrary,
  writeSkillsCatalog,
} = require("./skill-catalog");
const { selectRuntimeSkills } = require("./skill-install-policy");

const repoRoot = path.resolve(__dirname, "..");
const skillsSrcDir = path.join(repoRoot, "skills");
const agentsSrcDir = path.join(repoRoot, "agents");

function usage() {
  console.error(
    "Usage: node scripts/generate-catalogs.js <dest-home> [--source <name>] [--exclude <skill>]... [--include-source-only-skills] [--include-source-only-agents]",
  );
}

function expandHome(inputPath) {
  if (inputPath === "~") return os.homedir();
  if (inputPath.startsWith(`~${path.sep}`) || inputPath.startsWith("~/") || inputPath.startsWith("~\\")) {
    return path.join(os.homedir(), inputPath.slice(2));
  }
  return inputPath;
}

const args = process.argv.slice(2);
let destHome = null;
let source = "installer";
const excludeSkills = new Set();
let includeSourceOnlySkills = false;
let includeBroadCodingSkills = false;
let includeSourceOnlyAgents = false;

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === "--help" || arg === "-h") {
    usage();
    process.exit(0);
  }
  if (arg === "--source") {
    if (!args[i + 1]) {
      console.error("[catalogs] --source requires a value");
      usage();
      process.exit(1);
    }
    source = args[i + 1];
    i += 1;
    continue;
  }
  if (arg === "--exclude") {
    if (!args[i + 1]) {
      console.error("[catalogs] --exclude requires a value");
      usage();
      process.exit(1);
    }
    excludeSkills.add(args[i + 1]);
    i += 1;
    continue;
  }
  if (arg === "--include-source-only-skills") {
    includeSourceOnlySkills = true;
    continue;
  }
  if (arg === "--include-broad-coding-skills") {
    includeBroadCodingSkills = true;
    continue;
  }
  if (
    arg === "--include-source-only-agents" ||
    arg === "--include-passive-agents" ||
    arg === "--include-broad-coding-agents"
  ) {
    includeSourceOnlyAgents = true;
    continue;
  }
  if (arg.startsWith("-")) {
    console.error(`[catalogs] unknown option: ${arg}`);
    usage();
    process.exit(1);
  }
  if (!destHome) {
    destHome = path.resolve(expandHome(arg));
    continue;
  }
  console.error(`[catalogs] unknown argument: ${arg}`);
  usage();
  process.exit(1);
}

if (!destHome) {
  usage();
  process.exit(1);
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

if (!fs.existsSync(skillsSrcDir)) {
  console.error(`[catalogs] skills directory not found: ${skillsSrcDir}`);
  process.exit(1);
}

const allSkillFiles = collectSkillFiles(skillsSrcDir);
const allSkillNames = Array.from(allSkillFiles.keys());
const { skillNames, runtimeExcludedNames } = selectRuntimeSkills(
  allSkillNames,
  Array.from(excludeSkills),
  includeSourceOnlySkills,
  includeBroadCodingSkills,
);
const compatibleSkillFiles = new Map(
  Array.from(allSkillFiles.entries()).filter(
    ([name]) => !runtimeExcludedNames.includes(name),
  ),
);
const allAgentFiles = collectAgentFiles(agentsSrcDir, skillsSrcDir);
const { agentFiles } = selectRuntimeAgents(
  allAgentFiles,
  includeSourceOnlyAgents,
);
const skillsCatalogPath = path.join(destHome, "SKILLS-CATALOG.md");
const agentsCatalogPath = path.join(destHome, "AGENTS-CATALOG.md");

ensureDir(destHome);
const sourceSkillFiles = syncSkillSourceLibrary(destHome, compatibleSkillFiles);
writeSkillsCatalog(destHome, sourceSkillFiles, source, {
  activeSkillNames: skillNames,
});
fs.writeFileSync(
  agentsCatalogPath,
  generateAgentsCatalog(agentFiles, source, {
    activeAgentNames: DEFAULT_RUNTIME_AGENT_ALLOWLIST,
  }),
  "utf8",
);

console.log(`[catalogs] skills_catalog=${skillsCatalogPath}`);
console.log(`[catalogs] agents_catalog=${agentsCatalogPath}`);
