#!/usr/bin/env node
"use strict";

// Gemini CLI용 Skills/Agents/Hooks 동기화 스크립트
// sync-codex-assets.js를 기반으로 ~/.gemini/ 경로에 에셋 동기화
//
// 사용법:
//   node scripts/sync-gemini-assets.js              # 복사 모드
//   node scripts/sync-gemini-assets.js --unlink     # 제거 모드

const fs = require("fs");
const os = require("os");
const path = require("path");

const args = process.argv.slice(2);
const isUnlink = args.includes("--unlink");

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
    // 실행 권한 설정 (Linux/Mac)
    if (process.platform !== "win32" && name.endsWith(".sh")) {
      try { fs.chmodSync(dest, 0o755); } catch { /* no-op */ }
    }
  }
}

function writeManifest(mode, skillNames, agentNames, hookNames) {
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
  };

  ensureDir(path.dirname(manifestPath));
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
}

// Gemini settings.json에 enableAgents: true 설정
function ensureAgentsEnabled() {
  const settingsPath = path.join(geminiHome, "settings.json");
  let settings = {};
  try {
    settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
  } catch {
    settings = {};
  }
  if (!settings.enableAgents) {
    settings.enableAgents = true;
    ensureDir(path.dirname(settingsPath));
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n", "utf8");
  }
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

// 스킬 카탈로그 파일 생성 (~/.gemini/SKILLS-CATALOG.md)
function generateSkillsCatalog(destHome, skillNames) {
  const lines = [
    "# 사용 가능한 글로벌 스킬 카탈로그",
    "",
    "> 이 파일은 sync-gemini-assets.js에 의해 자동 생성됩니다.",
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

function run() {
  if (!fs.existsSync(skillsSrcDir)) {
    console.error(`[error] skills directory not found: ${skillsSrcDir}`);
    process.exit(1);
  }

  const mode = isUnlink ? "unlink" : "copy";
  const previous = loadPreviousManaged();
  const skillNames = listDirectories(skillsSrcDir);
  const agentFiles = collectAgentFiles();
  const hookFiles = collectHookFiles();
  const agentNames = Array.from(agentFiles.keys()).sort((a, b) => a.localeCompare(b));
  const hookNames = Array.from(hookFiles.keys()).sort((a, b) => a.localeCompare(b));

  const targetDirs = [
    { key: "skills", dest: targets.geminiSkills },
    { key: "agents", dest: targets.geminiAgents },
    { key: "hooks", dest: targets.geminiHooks },
  ];

  const currentByKey = {
    skills: mode === "unlink" ? [] : skillNames,
    agents: mode === "unlink" ? [] : agentNames,
    hooks: mode === "unlink" ? [] : hookNames,
  };

  for (const item of targetDirs) {
    cleanupStaleEntries(item.dest, previous[item.key], currentByKey[item.key]);
  }

  pruneAgentFiles(targets.geminiAgents, currentByKey.agents);

  syncSkills(targets.geminiSkills, skillNames, mode);
  syncAgents(targets.geminiAgents, agentFiles, mode);
  syncHooks(targets.geminiHooks, hookFiles, mode);

  if (mode === "unlink") {
    safeRm(manifestPath);
    safeRm(path.join(geminiHome, "SKILLS-CATALOG.md"));
  } else {
    writeManifest(mode, skillNames, agentNames, hookNames);
    // 에이전트 사용을 위해 enableAgents 설정
    ensureAgentsEnabled();
    // 스킬 카탈로그 생성
    const catalogPath = generateSkillsCatalog(geminiHome, skillNames);
    console.log(`[gemini-sync] catalog=${catalogPath}`);
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
