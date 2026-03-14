#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

const args = process.argv.slice(2);
const isUnlink = args.includes("--unlink");

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

function installDir(src, dest) {
  safeRm(dest);
  fs.cpSync(src, dest, { recursive: true, force: true });
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
  const manifest = readManifest(manifestPaths.project) || readManifest(manifestPaths.codex) || {};
  const toArray = (v) => (Array.isArray(v) ? v : []);
  return {
    skills: toArray(manifest.managedSkills),
    agents: toArray(manifest.managedAgents),
    hooks: toArray(manifest.managedHooks),
    codexNotifyHooks: toArray(manifest.managedCodexNotifyHooks),
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
    installDir(src, dest);
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
  // agents/ 하위 디렉토리도 동기화 (references/ 등)
  if (mode !== "unlink" && fs.existsSync(agentsSrcDir)) {
    for (const entry of fs.readdirSync(agentsSrcDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const src = path.join(agentsSrcDir, entry.name);
      const dest = path.join(destDir, entry.name);
      safeRm(dest);
      fs.cpSync(src, dest, { recursive: true, force: true });
    }
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

function writeManifest(mode, skillNames, agentNames, hookNames, codexNotifyHookNames) {
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
    managedCodexNotifyHooks: codexNotifyHookNames,
  };

  const projectManifest = manifestPaths.project;
  const codexManifest = manifestPaths.codex;
  ensureDir(path.dirname(projectManifest));
  ensureDir(path.dirname(codexManifest));

  fs.writeFileSync(projectManifest, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  fs.writeFileSync(codexManifest, JSON.stringify(manifest, null, 2) + "\n", "utf8");
}

// SKILL.md에서 description 추출 (YAML 멀티라인 지원)
function extractSkillDescription(skillDir) {
  const skillMd = path.join(skillDir, "SKILL.md");
  if (!fs.existsSync(skillMd)) return "";
  try {
    const content = fs.readFileSync(skillMd, "utf8");
    const lines = content.split("\n");

    // frontmatter description: 필드 찾기
    for (let i = 0; i < lines.length && i < 30; i++) {
      const line = lines[i];
      const match = line.match(/^description:\s*(.*)/);
      if (!match) continue;

      const value = match[1].trim().replace(/^["']|["']$/g, "");
      // 단일 라인 description
      if (value && value !== ">" && value !== "|") {
        return value.replace(/\|/g, "／").slice(0, 120);
      }
      // 멀티라인 (> 또는 |): 다음 들여쓰기 줄들을 수집
      const descLines = [];
      for (let j = i + 1; j < lines.length && j < i + 10; j++) {
        const next = lines[j];
        if (/^\s+\S/.test(next)) {
          descLines.push(next.trim());
        } else {
          break;
        }
      }
      if (descLines.length > 0) {
        return descLines.join(" ").replace(/\|/g, "／").slice(0, 120);
      }
    }

    // fallback: 첫 번째 # 제목
    const headingMatch = content.match(/^#\s+(.+)$/m);
    if (headingMatch) return headingMatch[1].trim().replace(/\|/g, "／").slice(0, 120);
    return "";
  } catch {
    return "";
  }
}

// 스킬 카탈로그 파일 생성 (~/.codex/SKILLS-CATALOG.md)
function generateSkillsCatalog(destHome, skillNames) {
  const lines = [
    "# 사용 가능한 글로벌 스킬 카탈로그",
    "",
    "> 이 파일은 sync-codex-assets.js에 의해 자동 생성됩니다.",
    "> 사용자가 `/스킬명`으로 호출하면, 해당 스킬의 SKILL.md를 읽어 워크플로우를 따르세요.",
    "",
    `총 ${skillNames.length}개 스킬이 설치되어 있습니다.`,
    "",
    "| 스킬 | 설명 | 경로 |",
    "|------|------|------|",
  ];

  for (const name of skillNames) {
    const srcDir = path.join(skillsSrcDir, name);
    const desc = extractSkillDescription(srcDir);
    lines.push(`| ${name} | ${desc} | skills/${name}/SKILL.md |`);
  }

  lines.push("");
  lines.push(`_생성 시각: ${new Date().toISOString()}_`);
  lines.push("");

  const catalogPath = path.join(destHome, "SKILLS-CATALOG.md");
  ensureDir(path.dirname(catalogPath));
  fs.writeFileSync(catalogPath, lines.join("\n"), "utf8");
  return catalogPath;
}

// .md 파일에서 frontmatter description 추출 (에이전트용)
function extractAgentDescription(filePath) {
  if (!fs.existsSync(filePath)) return "";
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length && i < 30; i++) {
      const line = lines[i];
      const match = line.match(/^description:\s*(.*)/);
      if (!match) continue;

      const value = match[1].trim().replace(/^["']|["']$/g, "");
      if (value && value !== ">" && value !== "|") {
        return value.replace(/\|/g, "／").slice(0, 120);
      }
      const descLines = [];
      for (let j = i + 1; j < lines.length && j < i + 10; j++) {
        const next = lines[j];
        if (/^\s+\S/.test(next)) {
          descLines.push(next.trim());
        } else {
          break;
        }
      }
      if (descLines.length > 0) {
        return descLines.join(" ").replace(/\|/g, "／").slice(0, 120);
      }
    }
    return "";
  } catch {
    return "";
  }
}

// 에이전트 카탈로그 파일 생성 (~/.codex/AGENTS-CATALOG.md)
function generateAgentsCatalog(destHome, agentFiles) {
  const entries = Array.from(agentFiles.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const lines = [
    "# 사용 가능한 글로벌 에이전트 카탈로그",
    "",
    "> 이 파일은 sync-codex-assets.js에 의해 자동 생성됩니다.",
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
    const desc = extractAgentDescription(srcPath);
    lines.push(`| ${agentName} | ${desc} | agents/${name} |`);
  }

  lines.push("");
  lines.push(`_생성 시각: ${new Date().toISOString()}_`);
  lines.push("");

  const catalogPath = path.join(destHome, "AGENTS-CATALOG.md");
  ensureDir(path.dirname(catalogPath));
  fs.writeFileSync(catalogPath, lines.join("\n"), "utf8");
  return catalogPath;
}

function run() {
  if (!fs.existsSync(skillsSrcDir)) {
    console.error(`[error] skills directory not found: ${skillsSrcDir}`);
    process.exit(1);
  }

  const mode = isUnlink ? "unlink" : "copy";
  const previous = loadPreviousManaged();

  // Claude 전용 스킬 제외 — Codex에서 사용 불가한 도구(TeamCreate, SendMessage)에 의존하는 스킬
  const CODEX_EXCLUDE_SKILLS = [
    "agent-team",      // Claude Agent Teams 전용 (TeamCreate/SendMessage). Codex용은 agent-team-codex
    "mnemo",           // Claude 전용 장기기억. Codex용은 codex-mnemo
  ];
  const allSkillNames = listDirectories(skillsSrcDir);
  const skillNames = allSkillNames.filter((name) => !CODEX_EXCLUDE_SKILLS.includes(name));
  if (CODEX_EXCLUDE_SKILLS.length > 0) {
    const excluded = allSkillNames.filter((name) => CODEX_EXCLUDE_SKILLS.includes(name));
    if (excluded.length > 0) {
      console.log(`[codex-sync] excluded (claude-only): ${excluded.join(", ")}`);
    }
  }
  const agentFiles = collectAgentFiles();
  const hookFiles = collectHookFiles();
  const codexNotifyHookFiles = collectCodexNotifyHookFiles();
  const agentNames = Array.from(agentFiles.keys()).sort((a, b) => a.localeCompare(b));
  const hookNames = Array.from(hookFiles.keys()).sort((a, b) => a.localeCompare(b));
  const codexNotifyHookNames = Array.from(codexNotifyHookFiles.keys()).sort((a, b) => a.localeCompare(b));

  const targetMatrix = [
    { key: "skills", dest: targets.projectSkills },
    { key: "skills", dest: targets.codexSkills },
    { key: "agents", dest: targets.projectAgents },
    { key: "agents", dest: targets.codexAgents },
    { key: "hooks", dest: targets.projectHooks },
    { key: "hooks", dest: targets.codexHooks },
    { key: "codexNotifyHooks", dest: targets.codexHooks },
  ];

  const currentByKey = {
    skills: mode === "unlink" ? [] : skillNames,
    agents: mode === "unlink" ? [] : agentNames,
    hooks: mode === "unlink" ? [] : hookNames,
    codexNotifyHooks: mode === "unlink" ? [] : codexNotifyHookNames,
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
  syncHooks(targets.codexHooks, codexNotifyHookFiles, mode);

  if (mode === "unlink") {
    safeRm(path.join(repoRoot, ".agents", ".codex-sync-manifest.json"));
    safeRm(path.join(codexHome, ".codex-sync-manifest.json"));
    safeRm(path.join(codexHome, "SKILLS-CATALOG.md"));
    safeRm(path.join(codexHome, "AGENTS-CATALOG.md"));
  } else {
    writeManifest(mode, skillNames, agentNames, hookNames, codexNotifyHookNames);
    // 스킬 + 에이전트 카탈로그 생성
    const skillsCatalog = generateSkillsCatalog(codexHome, skillNames);
    const agentsCatalog = generateAgentsCatalog(codexHome, agentFiles);
    console.log(`[codex-sync] skills_catalog=${skillsCatalog}`);
    console.log(`[codex-sync] agents_catalog=${agentsCatalog}`);
  }

  console.log(`[codex-sync] mode=${mode}`);
  console.log(`[codex-sync] skills=${skillNames.length}`);
  console.log(`[codex-sync] agents=${agentNames.length}`);
  console.log(`[codex-sync] hooks=${hookNames.length}`);
  console.log(`[codex-sync] codex_notify_hooks=${codexNotifyHookNames.length}`);
  console.log(`[codex-sync] project_skills=${targets.projectSkills}`);
  console.log(`[codex-sync] project_hooks=${targets.projectHooks}`);
  console.log(`[codex-sync] codex_skills=${targets.codexSkills}`);
  console.log(`[codex-sync] codex_hooks=${targets.codexHooks}`);
}

run();
