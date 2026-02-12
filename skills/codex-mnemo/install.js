#!/usr/bin/env node
// Codex-Mnemo (장기기억 시스템) 설치/제거 스크립트
//
// 사용법:
//   node skills/codex-mnemo/install.js              # 설치
//   node skills/codex-mnemo/install.js --uninstall  # 제거
//
// Codex-Mnemo 핵심 구성요소:
//   - 훅: save-turn (notify 이벤트로 User+Assistant 대화 자동 저장)
//   - AGENTS.md 규칙: 응답 태그, 과거 대화 검색

const fs = require("fs");
const path = require("path");
const os = require("os");

// ── 설정 ──
const args = process.argv.slice(2);
const isUninstall = args.includes("--uninstall");
const isWindows = process.platform === "win32";

// 소스 디렉토리 (이 스크립트 위치)
const sourceDir = path.resolve(__dirname);

// Codex 글로벌 디렉토리
const codexDir = path.join(os.homedir(), ".codex");

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

// ── AGENTS.md 규칙 머지 ──
const MARKER_START = "<!-- CODEX-MNEMO:START -->";
const MARKER_END = "<!-- CODEX-MNEMO:END -->";

function installAgentsMdRules(agentsMdPath, templatePath) {
  let content = "";
  try {
    content = fs.readFileSync(agentsMdPath, "utf8");
  } catch {
    content = "";
  }

  const template = fs.readFileSync(templatePath, "utf8");

  // 기존 Codex-Mnemo 규칙 제거
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

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── TOML config.toml 처리 ──
// 외부 라이브러리 없이 단순 문자열 조작으로 notify 설정 관리

function buildNotifyCommand(hooksDir) {
  const d = normalizePath(hooksDir);
  if (isWindows) {
    return `powershell -ExecutionPolicy Bypass -File "${d}/save-turn.ps1"`;
  } else {
    return `bash "${d}/save-turn.sh"`;
  }
}

function installTomlNotify(configPath, notifyCmd) {
  let content = "";
  try {
    content = fs.readFileSync(configPath, "utf8");
  } catch {
    content = "";
  }

  // notify = [...] 줄 찾기 (한 줄 또는 여러 줄)
  const notifyLineRegex = /^notify\s*=\s*\[.*?\]$/m;
  const notifyMultilineRegex = /^notify\s*=\s*\[\s*\n([\s\S]*?)\]/m;

  // TOML 리터럴 문자열(작은따옴표)로 감싸서 내부 큰따옴표 보존
  const newNotifyLine = `notify = ['${notifyCmd}']`;

  if (notifyLineRegex.test(content)) {
    // 기존 한 줄 notify가 있으면 교체
    const oldMatch = content.match(notifyLineRegex)[0];
    if (oldMatch !== newNotifyLine) {
      console.log(`      ⚠️  기존 notify 설정 덮어쓰기: ${oldMatch}`);
    }
    content = content.replace(notifyLineRegex, newNotifyLine);
  } else if (notifyMultilineRegex.test(content)) {
    // 기존 여러 줄 notify가 있으면 교체
    console.log("      ⚠️  기존 notify 설정(멀티라인) 덮어쓰기");
    content = content.replace(notifyMultilineRegex, newNotifyLine);
  } else {
    // notify 설정이 없으면 추가
    if (content.length > 0 && !content.endsWith("\n")) {
      content += "\n";
    }
    content += `\n${newNotifyLine}\n`;
  }

  ensureDir(path.dirname(configPath));
  fs.writeFileSync(configPath, content, "utf8");
}

function removeTomlNotify(configPath) {
  try {
    let content = fs.readFileSync(configPath, "utf8");

    // 한 줄 notify 제거
    content = content.replace(/^notify\s*=\s*\[.*?\]\s*\n?/m, "");
    // 여러 줄 notify 제거
    content = content.replace(/^notify\s*=\s*\[\s*\n[\s\S]*?\]\s*\n?/m, "");

    fs.writeFileSync(configPath, content, "utf8");
    return true;
  } catch {
    return false;
  }
}

// ── 설치 ──
function install() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  CODEX-MNEMO: Codex CLI 장기기억 시스템 설치                   ║
║  기억의 여신 Mnemosyne에서 유래                                ║
╚═══════════════════════════════════════════════════════════════╝
`);

  const hooksDir = path.join(codexDir, "hooks");
  const configPath = path.join(codexDir, "config.toml");
  const agentsMdPath = path.join(codexDir, "AGENTS.md");

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

  // [2/3] config.toml notify 설정
  console.log("\n[2/3] config.toml notify 설정 중...");
  const notifyCmd = buildNotifyCommand(hooksDir);
  installTomlNotify(configPath, notifyCmd);
  console.log(`      notify = ['${notifyCmd}']`);
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
║  CODEX-MNEMO 설치 완료!                                        ║
╠═══════════════════════════════════════════════════════════════╣
║  설치된 구성요소:                                              ║
║  - 훅: save-turn (notify로 대화 자동 저장)                    ║
║  - AGENTS.md: 응답 태그, 과거 검색 규칙                       ║
╠═══════════════════════════════════════════════════════════════╣
║  사용법:                                                       ║
║  - 대화는 자동으로 conversations/에 저장됩니다                 ║
║  - 응답 끝에 #tags를 추가하면 자동으로 캡처됩니다             ║
║  - "이전에 ~했었지?" 라고 물으면 자동 검색됩니다              ║
╠═══════════════════════════════════════════════════════════════╣
║  Codex CLI를 재시작하면 적용됩니다.                            ║
╚═══════════════════════════════════════════════════════════════╝
`);
}

// ── 제거 ──
function uninstall() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  CODEX-MNEMO: Codex CLI 장기기억 시스템 제거                   ║
╚═══════════════════════════════════════════════════════════════╝
`);

  const hooksDir = path.join(codexDir, "hooks");
  const configPath = path.join(codexDir, "config.toml");
  const agentsMdPath = path.join(codexDir, "AGENTS.md");

  // [1/3] 훅 파일 제거
  console.log("[1/3] 훅 파일 제거 중...");
  const hookFiles = ["save-turn.ps1", "save-turn.sh"];
  for (const file of hookFiles) {
    if (removeFile(path.join(hooksDir, file))) {
      console.log(`      - ${file} 제거됨`);
    }
  }
  console.log("      완료!");

  // [2/3] config.toml notify 설정 제거
  console.log("\n[2/3] config.toml notify 설정 제거 중...");
  if (removeTomlNotify(configPath)) {
    console.log("      제거됨");
  }
  console.log("      완료!");

  // [3/3] AGENTS.md 규칙 제거
  console.log("\n[3/3] AGENTS.md 장기기억 규칙 제거 중...");
  if (uninstallAgentsMdRules(agentsMdPath)) {
    console.log("      제거됨");
  }
  console.log("      완료!");

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  CODEX-MNEMO 제거 완료!                                        ║
╠═══════════════════════════════════════════════════════════════╣
║  참고: 대화 기록 (conversations/)은 보존됩니다.                ║
║  완전히 삭제하려면 수동으로 삭제하세요.                        ║
╠═══════════════════════════════════════════════════════════════╣
║  Codex CLI를 재시작하면 적용됩니다.                            ║
╚═══════════════════════════════════════════════════════════════╝
`);
}

// ── 실행 ──
if (!fs.existsSync(codexDir)) {
  console.log(`참고: ${codexDir} 폴더가 없어 생성합니다.`);
  ensureDir(codexDir);
}

if (isUninstall) {
  uninstall();
} else {
  install();
}
