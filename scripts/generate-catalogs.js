#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const skillsSrcDir = path.join(repoRoot, "skills");
const agentsSrcDir = path.join(repoRoot, "agents");

function usage() {
  console.error(
    "Usage: node scripts/generate-catalogs.js <dest-home> [--source <name>] [--exclude <skill>]...",
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

function listDirectories(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

function extractFrontmatterDescription(filePath, fallbackHeading = true) {
  if (!fs.existsSync(filePath)) return "";
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length && i < 30; i += 1) {
      const match = lines[i].match(/^description:\s*(.*)/);
      if (!match) continue;

      const value = match[1].trim().replace(/^["']|["']$/g, "");
      if (value && value !== ">" && value !== "|") {
        return value.replace(/\|/g, "／").slice(0, 120);
      }

      const descLines = [];
      for (let j = i + 1; j < lines.length && j < i + 10; j += 1) {
        const next = lines[j];
        if (!/^\s+\S/.test(next)) break;
        descLines.push(next.trim());
      }
      if (descLines.length > 0) {
        return descLines.join(" ").replace(/\|/g, "／").slice(0, 120);
      }
    }

    if (fallbackHeading) {
      const headingMatch = content.match(/^#\s+(.+)$/m);
      if (headingMatch) return headingMatch[1].trim().replace(/\|/g, "／").slice(0, 120);
    }
    return "";
  } catch {
    return "";
  }
}

function extractSkillDescription(skillDir) {
  return extractFrontmatterDescription(path.join(skillDir, "SKILL.md"), true);
}

function collectAgentFiles() {
  const files = new Map();

  if (fs.existsSync(agentsSrcDir)) {
    for (const name of fs.readdirSync(agentsSrcDir).sort()) {
      const src = path.join(agentsSrcDir, name);
      if (name.toLowerCase() === "memory.md") continue;
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
        if (files.has(name)) continue;
        files.set(name, src);
      }
    }
  }

  return files;
}

function generateSkillsCatalog(skillNames) {
  const lines = [
    "# 사용 가능한 글로벌 스킬 카탈로그",
    "",
    `> 이 파일은 ${source} 설치 과정에서 자동 생성됩니다.`,
    "> 사용자가 `/스킬명`으로 호출하면, 해당 스킬의 SKILL.md를 읽어 워크플로우를 따르세요.",
    "",
    `총 ${skillNames.length}개 스킬이 설치되어 있습니다.`,
    "",
    "| 스킬 | 설명 | 경로 |",
    "|------|------|------|",
  ];

  for (const name of skillNames) {
    const desc = extractSkillDescription(path.join(skillsSrcDir, name));
    lines.push(`| ${name} | ${desc} | skills/${name}/SKILL.md |`);
  }

  lines.push("");
  lines.push(`_생성 시각: ${new Date().toISOString()}_`);
  lines.push("");
  return lines.join("\n");
}

function generateAgentsCatalog(agentFiles) {
  const entries = Array.from(agentFiles.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const lines = [
    "# 사용 가능한 글로벌 에이전트 카탈로그",
    "",
    `> 이 파일은 ${source} 설치 과정에서 자동 생성됩니다.`,
    "> 에이전트는 특정 작업 유형에 최적화된 전문가 모드입니다.",
    "> 작업에 맞는 에이전트가 있으면 해당 에이전트의 .md 파일을 읽어 지침을 따르세요.",
    "",
    `총 ${entries.length}개 에이전트가 설치되어 있습니다.`,
    "",
    "| 에이전트 | 설명 | 경로 |",
    "|----------|------|------|",
  ];

  for (const [name, srcPath] of entries) {
    const agentName = name.replace(/\.md$/i, "");
    const desc = extractFrontmatterDescription(srcPath, false);
    lines.push(`| ${agentName} | ${desc} | agents/${name} |`);
  }

  lines.push("");
  lines.push(`_생성 시각: ${new Date().toISOString()}_`);
  lines.push("");
  return lines.join("\n");
}

if (!fs.existsSync(skillsSrcDir)) {
  console.error(`[catalogs] skills directory not found: ${skillsSrcDir}`);
  process.exit(1);
}

const skillNames = listDirectories(skillsSrcDir).filter((name) => !excludeSkills.has(name));
const agentFiles = collectAgentFiles();
const skillsCatalogPath = path.join(destHome, "SKILLS-CATALOG.md");
const agentsCatalogPath = path.join(destHome, "AGENTS-CATALOG.md");

ensureDir(destHome);
fs.writeFileSync(skillsCatalogPath, generateSkillsCatalog(skillNames), "utf8");
fs.writeFileSync(agentsCatalogPath, generateAgentsCatalog(agentFiles), "utf8");

console.log(`[catalogs] skills_catalog=${skillsCatalogPath}`);
console.log(`[catalogs] agents_catalog=${agentsCatalogPath}`);
