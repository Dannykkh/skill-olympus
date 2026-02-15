#!/usr/bin/env node
// Gemini-Mnemo (장기기억 시스템) 설치/제거 스크립트
//
// 사용법:
//   node skills/gemini-mnemo/install.js              # 설치
//   node skills/gemini-mnemo/install.js --uninstall  # 제거
//
// Gemini-Mnemo 핵심 구성요소:
//   - 훅: save-turn (AfterAgent 이벤트로 User+Assistant 대화 자동 저장)
//   - AGENTS.md 규칙: 응답 태그, 과거 대화 검색
//   - context.fileName: AGENTS.md 로드 보장 (Gemini CLI 최신 설정)

const fs = require("fs");
const path = require("path");
const os = require("os");

// ── 설정 ──
const args = process.argv.slice(2);
const isUninstall = args.includes("--uninstall");
const isWindows = process.platform === "win32";

// 소스 디렉토리 (이 스크립트 위치)
const sourceDir = path.resolve(__dirname);

// Gemini 글로벌 디렉토리
const geminiDir = path.join(os.homedir(), ".gemini");

// ── 유틸리티 함수 ──
function normalizePath(p) {
  return p.replace(/\\/g, "/");
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function removeFile(filePath) {
  try {
    fs.unlinkSync(filePath);
    return true;
  } catch {
    return false;
  }
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return {};
  }
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

// ── AGENTS.md 규칙 머지 ──
const MARKER_START = "<!-- GEMINI-MNEMO:START -->";
const MARKER_END = "<!-- GEMINI-MNEMO:END -->";

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function installAgentsMdRules(agentsMdPath, templatePath) {
  let content = "";
  try {
    content = fs.readFileSync(agentsMdPath, "utf8");
  } catch {
    content = "";
  }

  const template = fs.readFileSync(templatePath, "utf8");

  // 기존 Gemini-Mnemo 규칙 제거
  const regex = new RegExp(
    `\\n?${escapeRegex(MARKER_START)}[\\s\\S]*?${escapeRegex(MARKER_END)}\\n?`,
    "g"
  );
  content = content.replace(regex, "").trim();

  // 새 규칙 추가
  const rulesBlock = `\n\n${MARKER_START}\n${template}\n${MARKER_END}`;
  content = content + rulesBlock + "\n";

  ensureDir(path.dirname(agentsMdPath));
  fs.writeFileSync(agentsMdPath, content, "utf8");
}

function uninstallAgentsMdRules(agentsMdPath) {
  try {
    let content = fs.readFileSync(agentsMdPath, "utf8");
    const regex = new RegExp(
      `\\n?${escapeRegex(MARKER_START)}[\\s\\S]*?${escapeRegex(MARKER_END)}\\n?`,
      "g"
    );
    content = content.replace(regex, "").trim();
    fs.writeFileSync(agentsMdPath, content + "\n", "utf8");
    return true;
  } catch {
    return false;
  }
}

// ── 훅 설정 (settings.json) ──
// Gemini CLI는 Claude Code와 동일한 settings.json hooks 형식 사용

function buildHookCommand(hooksDir) {
  const d = normalizePath(hooksDir);
  if (isWindows) {
    return `powershell -ExecutionPolicy Bypass -File "${d}/save-turn.ps1"`;
  } else {
    return `bash "${d}/save-turn.sh"`;
  }
}

function mergeHooksConfig(settingsPath, hookCommand) {
  const settings = readJson(settingsPath);
  settings.hooks = settings.hooks || {};
  settings.hooks.AfterAgent = settings.hooks.AfterAgent || [];

  // 기존 gemini-mnemo 훅이 있는지 확인
  const exists = settings.hooks.AfterAgent.some(h =>
    Array.isArray(h.hooks) &&
    h.hooks.some(cmd => cmd && typeof cmd.command === "string" && cmd.command.includes("save-turn"))
  );

  if (!exists) {
    settings.hooks.AfterAgent.push({
      matcher: "",
      hooks: [{
        type: "command",
        command: hookCommand
      }]
    });
  }

  writeJson(settingsPath, settings);
}

function removeHooksConfig(settingsPath) {
  const settings = readJson(settingsPath);
  if (!settings.hooks) return;

  if (settings.hooks.AfterAgent) {
    const cleaned = [];

    for (const h of settings.hooks.AfterAgent) {
      if (!Array.isArray(h.hooks)) {
        cleaned.push(h);
        continue;
      }

      const hooks = h.hooks.filter(
        cmd => !(cmd && typeof cmd.command === "string" && cmd.command.includes("save-turn"))
      );

      if (hooks.length > 0) {
        cleaned.push({ ...h, hooks });
      }
    }

    settings.hooks.AfterAgent = cleaned;

    if (settings.hooks.AfterAgent.length === 0) {
      delete settings.hooks.AfterAgent;
    }
  }

  if (Object.keys(settings.hooks).length === 0) {
    delete settings.hooks;
  }

  writeJson(settingsPath, settings);
}

// ── 컨텍스트 파일명 설정 (settings.json > context.fileName) ──
// Gemini CLI 기본 컨텍스트 파일은 GEMINI.md이지만,
// AGENTS.md를 사용하려면 context.fileName에 명시해야 합니다.

function normalizeContextFileNames(currentValue) {
  if (typeof currentValue === "string") {
    return [currentValue];
  }
  if (Array.isArray(currentValue)) {
    return currentValue.filter(v => typeof v === "string" && v.trim().length > 0);
  }
  return [];
}

function mergeContextFileName(settingsPath) {
  const settings = readJson(settingsPath);
  settings.context = settings.context || {};

  const current = normalizeContextFileNames(settings.context.fileName);
  const isEmpty = current.length === 0;
  const merged = [...current];

  // 최초 설정 시 기본값 GEMINI.md를 유지하면서 AGENTS.md를 추가
  if (isEmpty) {
    merged.push("AGENTS.md", "GEMINI.md");
  } else if (!merged.includes("AGENTS.md")) {
    merged.push("AGENTS.md");
  }

  settings.context.fileName = merged;
  writeJson(settingsPath, settings);
  return merged;
}

function removeContextFileName(settingsPath) {
  const settings = readJson(settingsPath);
  if (!settings.context || settings.context.fileName === undefined) return;

  const current = settings.context.fileName;

  if (typeof current === "string") {
    if (current === "AGENTS.md") {
      delete settings.context.fileName;
    }
  } else if (Array.isArray(current)) {
    const next = current.filter(v => v !== "AGENTS.md");
    if (next.length === 0) {
      delete settings.context.fileName;
    } else if (next.length === 1) {
      settings.context.fileName = next[0];
    } else {
      settings.context.fileName = next;
    }
  }

  if (Object.keys(settings.context).length === 0) {
    delete settings.context;
  }

  writeJson(settingsPath, settings);
}

// ── 설치 ──
function install() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  GEMINI-MNEMO: Gemini CLI 장기기억 시스템 설치                 ║
║  기억의 여신 Mnemosyne에서 유래                                ║
╚═══════════════════════════════════════════════════════════════╝
`);

  const hooksDir = path.join(geminiDir, "hooks");
  const settingsPath = path.join(geminiDir, "settings.json");
  const agentsMdPath = path.join(geminiDir, "AGENTS.md");

  // [1/3] 훅 파일 복사
  console.log("[1/3] 훅 파일 설치 중...");
  ensureDir(hooksDir);

  const hookFile = isWindows ? "save-turn.ps1" : "save-turn.sh";
  const src = path.join(sourceDir, "hooks", hookFile);
  const dest = path.join(hooksDir, hookFile);

  if (fs.existsSync(src)) {
    copyFile(src, dest);
    if (!isWindows) {
      fs.chmodSync(dest, 0o755);
    }
    console.log(`      - ${hookFile}`);
  } else {
    console.error(`      오류: ${src} 파일을 찾을 수 없습니다.`);
    process.exit(1);
  }
  console.log("      완료!");

  // [2/3] settings.json AfterAgent 훅 + context.fileName 설정
  console.log("\n[2/3] settings.json AfterAgent 훅 설정 중...");
  const hookCommand = buildHookCommand(hooksDir);
  mergeHooksConfig(settingsPath, hookCommand);
  const contextFiles = mergeContextFileName(settingsPath);
  console.log(`      AfterAgent → ${hookFile}`);
  console.log(`      context.fileName → ${JSON.stringify(contextFiles)}`);
  console.log("      완료!");

  // [3/3] AGENTS.md 규칙 설치
  console.log("\n[3/3] AGENTS.md 장기기억 규칙 설치 중...");
  const templatePath = path.join(sourceDir, "templates", "agents-md-rules.md");
  if (fs.existsSync(templatePath)) {
    installAgentsMdRules(agentsMdPath, templatePath);
    console.log("      완료!");
  } else {
    console.log("      템플릿 없음, 건너뜀");
  }

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  GEMINI-MNEMO 설치 완료!                                       ║
╠═══════════════════════════════════════════════════════════════╣
║  설치된 구성요소:                                              ║
║  - 훅: save-turn (AfterAgent로 대화 자동 저장)               ║
║  - AGENTS.md: 응답 태그, 과거 검색 규칙                       ║
╠═══════════════════════════════════════════════════════════════╣
║  사용법:                                                       ║
║  - 대화는 자동으로 conversations/에 저장됩니다                 ║
║  - 응답 끝에 #tags를 추가하면 자동으로 캡처됩니다             ║
║  - "이전에 ~했었지?" 라고 물으면 자동 검색됩니다              ║
╠═══════════════════════════════════════════════════════════════╣
║  Gemini CLI를 재시작하면 적용됩니다.                           ║
╚═══════════════════════════════════════════════════════════════╝
`);
}

// ── 제거 ──
function uninstall() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  GEMINI-MNEMO: Gemini CLI 장기기억 시스템 제거                 ║
╚═══════════════════════════════════════════════════════════════╝
`);

  const hooksDir = path.join(geminiDir, "hooks");
  const settingsPath = path.join(geminiDir, "settings.json");
  const agentsMdPath = path.join(geminiDir, "AGENTS.md");

  // [1/3] 훅 파일 제거
  console.log("[1/3] 훅 파일 제거 중...");
  const hookFiles = ["save-turn.ps1", "save-turn.sh"];
  for (const file of hookFiles) {
    if (removeFile(path.join(hooksDir, file))) {
      console.log(`      - ${file} 제거됨`);
    }
  }
  console.log("      완료!");

  // [2/3] settings.json 훅/컨텍스트 설정 제거
  console.log("\n[2/3] settings.json AfterAgent 훅 설정 제거 중...");
  removeHooksConfig(settingsPath);
  removeContextFileName(settingsPath);
  console.log("      context.fileName에서 AGENTS.md 제거");
  console.log("      완료!");

  // [3/3] AGENTS.md 규칙 제거
  console.log("\n[3/3] AGENTS.md 장기기억 규칙 제거 중...");
  if (uninstallAgentsMdRules(agentsMdPath)) {
    console.log("      제거됨");
  }
  console.log("      완료!");

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  GEMINI-MNEMO 제거 완료!                                       ║
╠═══════════════════════════════════════════════════════════════╣
║  참고: 대화 기록 (conversations/)은 보존됩니다.                ║
║  완전히 삭제하려면 수동으로 삭제하세요.                        ║
╠═══════════════════════════════════════════════════════════════╣
║  Gemini CLI를 재시작하면 적용됩니다.                           ║
╚═══════════════════════════════════════════════════════════════╝
`);
}

// ── 실행 ──
if (!fs.existsSync(geminiDir)) {
  console.log(`참고: ${geminiDir} 폴더가 없어 생성합니다.`);
  ensureDir(geminiDir);
}

if (isUninstall) {
  uninstall();
} else {
  install();
}
