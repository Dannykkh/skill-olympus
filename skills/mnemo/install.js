#!/usr/bin/env node
// Mnemo (장기기억 시스템) 설치/제거 스크립트
//
// 사용법:
//   node skills/mnemo/install.js              # 설치
//   node skills/mnemo/install.js --check      # 헬스체크 (설치 상태 확인)
//   node skills/mnemo/install.js --uninstall  # 제거
//
// Mnemo 핵심 구성요소:
//   - 훅: save-conversation, save-response (대화 자동 저장)
//   - CLAUDE.md 규칙: 응답 태그, 과거 대화 검색, MEMORY.md 자동 업데이트

const fs = require("fs");
const path = require("path");
const os = require("os");

// ── 설정 ──
const args = process.argv.slice(2);
const isUninstall = args.includes("--uninstall");
const isCheck = args.includes("--check");
const isWindows = process.platform === "win32";

// 소스 디렉토리 (이 스크립트 위치)
const sourceDir = path.resolve(__dirname);

// Claude 글로벌 디렉토리
const claudeDir = path.join(os.homedir(), ".claude");

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

// ── CLAUDE.md 규칙 머지 ──
const MARKER_START = "<!-- MNEMO:START -->";
const MARKER_END = "<!-- MNEMO:END -->";

function installClaudeMdRules(claudeMdPath, templatePath) {
  let content = "";
  try {
    content = fs.readFileSync(claudeMdPath, "utf8");
  } catch {
    content = "";
  }

  const template = fs.readFileSync(templatePath, "utf8");

  // 기존 Mnemo 규칙 제거
  const regex = new RegExp(`\\n?${MARKER_START}[\\s\\S]*?${MARKER_END}\\n?`, "g");
  content = content.replace(regex, "").trim();

  // 새 규칙 추가
  const rulesBlock = `\n\n${MARKER_START}\n${template}\n${MARKER_END}`;
  content = content + rulesBlock + "\n";

  ensureDir(path.dirname(claudeMdPath));
  fs.writeFileSync(claudeMdPath, content, "utf8");
}

function uninstallClaudeMdRules(claudeMdPath) {
  try {
    let content = fs.readFileSync(claudeMdPath, "utf8");
    const regex = new RegExp(`\\n?${MARKER_START}[\\s\\S]*?${MARKER_END}\\n?`, "g");
    content = content.replace(regex, "").trim();
    fs.writeFileSync(claudeMdPath, content + "\n", "utf8");
    return true;
  } catch {
    return false;
  }
}

// ── 훅 설정 ──
function buildHooksConfig(hooksDir) {
  const d = normalizePath(hooksDir);

  if (isWindows) {
    const cmd = (script) =>
      `powershell -ExecutionPolicy Bypass -File "${d}/${script}"`;
    return {
      UserPromptSubmit: [
        { matcher: ".*", hooks: [{ type: "command", command: cmd("save-conversation.ps1") }] }
      ],
      Stop: [
        { matcher: "", hooks: [{ type: "command", command: cmd("save-response.ps1") }] }
      ]
    };
  } else {
    const cmd = (script) => `bash "${d}/${script}"`;
    return {
      UserPromptSubmit: [
        { matcher: ".*", hooks: [{ type: "command", command: cmd("save-conversation.sh") }] }
      ],
      Stop: [
        { matcher: "", hooks: [{ type: "command", command: cmd("save-response.sh") }] }
      ]
    };
  }
}

function mergeHooksConfig(settingsPath, hooksConfig) {
  const settings = readJson(settingsPath);
  settings.hooks = settings.hooks || {};

  // Mnemo 훅 추가 (기존 훅 보존)
  for (const [event, hooks] of Object.entries(hooksConfig)) {
    settings.hooks[event] = settings.hooks[event] || [];

    // 중복 체크 후 추가 (각 훅을 개별적으로 확인)
    for (const hook of hooks) {
      // 추가하려는 훅의 커맨드에서 고유 식별자 추출
      const newCmd = hook.hooks?.[0]?.command || hook.command || "";
      const hookId = newCmd.includes("save-conversation") ? "save-conversation"
                   : newCmd.includes("save-response") ? "save-response"
                   : newCmd;

      // 같은 식별자를 가진 훅이 이미 있는지 확인
      const exists = settings.hooks[event].some(h => {
        const existingCmd = h.hooks?.[0]?.command || h.command || "";
        return existingCmd.includes(hookId);
      });
      if (!exists) {
        settings.hooks[event].push(hook);
      }
    }
  }

  writeJson(settingsPath, settings);
}

function removeHooksConfig(settingsPath) {
  const settings = readJson(settingsPath);
  if (!settings.hooks) return;

  for (const event of Object.keys(settings.hooks)) {
    settings.hooks[event] = settings.hooks[event].filter(h => {
      if (!h.hooks || !h.hooks[0] || !h.hooks[0].command) return true;
      const cmd = h.hooks[0].command;
      return !cmd.includes("save-conversation") && !cmd.includes("save-response");
    });

    if (settings.hooks[event].length === 0) {
      delete settings.hooks[event];
    }
  }

  if (Object.keys(settings.hooks).length === 0) {
    delete settings.hooks;
  }

  writeJson(settingsPath, settings);
}

// ── 설치 ──
function install() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  MNEMO: 장기기억 시스템 설치                                   ║
║  기억의 여신 Mnemosyne에서 유래                                ║
╚═══════════════════════════════════════════════════════════════╝
`);

  const hooksDir = path.join(claudeDir, "hooks");
  const settingsPath = path.join(claudeDir, "settings.json");
  const claudeMdPath = path.join(claudeDir, "CLAUDE.md");

  // [1/3] 훅 파일 복사
  console.log("[1/3] 훅 파일 설치 중...");
  ensureDir(hooksDir);

  const hookFiles = isWindows
    ? ["save-conversation.ps1", "save-response.ps1"]
    : ["save-conversation.sh", "save-response.sh"];

  for (const file of hookFiles) {
    // 훅 파일 소스 탐색: skills/mnemo/hooks/ → 루트 hooks/ 순서로 시도
    const srcLocal = path.join(sourceDir, "hooks", file);
    const srcRoot = path.join(sourceDir, "..", "..", "hooks", file);
    const src = fs.existsSync(srcLocal) ? srcLocal : fs.existsSync(srcRoot) ? srcRoot : null;
    const dest = path.join(hooksDir, file);
    if (src) {
      copyFile(src, dest);
      if (!isWindows) {
        fs.chmodSync(dest, 0o755);
      }
      console.log(`      - ${file}`);
    } else {
      console.log(`      ⚠ ${file} 소스를 찾을 수 없음 (skills/mnemo/hooks/ 및 루트 hooks/ 확인)`);
    }
  }
  console.log("      완료!");

  // [2/3] settings.json 훅 설정
  console.log("\n[2/3] settings.json 훅 설정 중...");
  const hooksConfig = buildHooksConfig(hooksDir);
  mergeHooksConfig(settingsPath, hooksConfig);
  console.log("      완료!");

  // [3/3] CLAUDE.md 규칙 설치
  console.log("\n[3/3] CLAUDE.md 장기기억 규칙 설치 중...");
  const templatePath = path.join(sourceDir, "templates", "claude-md-rules.md");
  if (fs.existsSync(templatePath)) {
    installClaudeMdRules(claudeMdPath, templatePath);
    console.log("      완료!");
  } else {
    console.log("      템플릿 없음, 건너뜀");
  }

  // [검증] 설치 결과 확인
  console.log("\n[검증] 설치 상태 확인 중...");
  let allOk = true;

  // 훅 파일 존재 확인
  for (const file of hookFiles) {
    const dest = path.join(hooksDir, file);
    if (fs.existsSync(dest)) {
      console.log(`      ✅ ${file}`);
    } else {
      console.log(`      ❌ ${file} - 파일 없음!`);
      allOk = false;
    }
  }

  // settings.json Stop 훅 확인
  const settingsCheck = readJson(settingsPath);
  const hasStopHook = settingsCheck.hooks?.Stop?.some(h =>
    h.hooks?.[0]?.command?.includes("save-response") ||
    h.command?.includes?.("save-response")
  );
  const hasSubmitHook = settingsCheck.hooks?.UserPromptSubmit?.some(h =>
    h.hooks?.[0]?.command?.includes("save-conversation") ||
    h.command?.includes?.("save-conversation")
  );

  if (hasStopHook) {
    console.log("      ✅ settings.json Stop 훅 (save-response)");
  } else {
    console.log("      ❌ settings.json Stop 훅 (save-response) 미등록!");
    allOk = false;
  }
  if (hasSubmitHook) {
    console.log("      ✅ settings.json UserPromptSubmit 훅 (save-conversation)");
  } else {
    console.log("      ❌ settings.json UserPromptSubmit 훅 (save-conversation) 미등록!");
    allOk = false;
  }

  // CLAUDE.md 규칙 확인
  try {
    const claudeMdContent = fs.readFileSync(claudeMdPath, "utf8");
    if (claudeMdContent.includes(MARKER_START)) {
      console.log("      ✅ CLAUDE.md 장기기억 규칙");
    } else {
      console.log("      ❌ CLAUDE.md 장기기억 규칙 미삽입!");
      allOk = false;
    }
  } catch {
    console.log("      ❌ CLAUDE.md 파일 없음!");
    allOk = false;
  }

  if (!allOk) {
    console.log("\n      ⚠️  일부 항목이 올바르게 설치되지 않았습니다.");
    console.log("      install.bat 또는 install.sh를 사용하면 더 안정적으로 설치됩니다.");
  }

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  MNEMO 설치 완료!                                              ║
╠═══════════════════════════════════════════════════════════════╣
║  설치된 구성요소:                                              ║
║  - 훅: save-conversation, save-response (대화 자동 저장)      ║
║  - CLAUDE.md: 응답 태그, 과거 검색, MEMORY.md 자동 업데이트   ║
╠═══════════════════════════════════════════════════════════════╣
║  사용법:                                                       ║
║  - 대화는 자동으로 conversations/에 저장됩니다                ║
║  - Claude가 응답 끝에 #tags를 자동으로 추가합니다             ║
║  - "이전에 ~했었지?" 라고 물으면 자동 검색됩니다              ║
║  - 중요한 결정은 MEMORY.md에 자동으로 기록됩니다              ║
╠═══════════════════════════════════════════════════════════════╣
║  Claude Code를 재시작하면 적용됩니다.                          ║
╚═══════════════════════════════════════════════════════════════╝
`);
}

// ── 헬스체크 ──
function check() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  MNEMO: 헬스체크                                               ║
╚═══════════════════════════════════════════════════════════════╝
`);

  const hooksDir = path.join(claudeDir, "hooks");
  const settingsPath = path.join(claudeDir, "settings.json");
  const claudeMdPath = path.join(claudeDir, "CLAUDE.md");
  let issues = 0;

  // 1. 훅 파일 존재
  console.log("[1/3] 훅 파일 확인...");
  const hookFiles = isWindows
    ? ["save-conversation.ps1", "save-response.ps1"]
    : ["save-conversation.sh", "save-response.sh"];

  for (const file of hookFiles) {
    const dest = path.join(hooksDir, file);
    if (fs.existsSync(dest)) {
      const stat = fs.statSync(dest);
      console.log(`      ✅ ${file} (${stat.size} bytes)`);
    } else {
      console.log(`      ❌ ${file} - 파일 없음!`);
      console.log(`         → 수정: node skills/mnemo/install.js  (재설치)`);
      issues++;
    }
  }

  // 2. settings.json 훅 등록
  console.log("\n[2/3] settings.json 훅 등록 확인...");
  const settings = readJson(settingsPath);

  // Stop 훅 (save-response)
  const stopHooks = settings.hooks?.Stop || [];
  const hasStop = stopHooks.some(h => {
    const cmd = h.hooks?.[0]?.command || h.command || "";
    return cmd.includes("save-response");
  });
  if (hasStop) {
    const cmd = stopHooks.find(h => (h.hooks?.[0]?.command || h.command || "").includes("save-response"));
    const cmdStr = cmd?.hooks?.[0]?.command || cmd?.command || "";
    console.log(`      ✅ Stop → save-response`);
    console.log(`         ${cmdStr}`);
    // 경로에 있는 파일이 실제로 존재하는지 확인
    const match = cmdStr.match(/-File\s+"([^"]+)"|bash\s+"([^"]+)"/);
    if (match) {
      const filePath = match[1] || match[2];
      const normalizedPath = filePath.replace(/\//g, path.sep);
      if (fs.existsSync(normalizedPath)) {
        console.log(`         ✅ 파일 존재 확인`);
      } else {
        console.log(`         ❌ 파일 없음: ${normalizedPath}`);
        console.log(`         → settings.json에 경로는 등록됐지만 실제 파일이 없습니다!`);
        issues++;
      }
    }
  } else {
    console.log(`      ❌ Stop 훅 미등록 (save-response 없음)`);
    issues++;
  }

  // UserPromptSubmit 훅 (save-conversation)
  const upsHooks = settings.hooks?.UserPromptSubmit || [];
  const hasUps = upsHooks.some(h => {
    const cmd = h.hooks?.[0]?.command || h.command || "";
    return cmd.includes("save-conversation");
  });
  if (hasUps) {
    console.log(`      ✅ UserPromptSubmit → save-conversation`);
  } else {
    console.log(`      ❌ UserPromptSubmit 훅 미등록 (save-conversation 없음)`);
    issues++;
  }

  // 3. CLAUDE.md 규칙
  console.log("\n[3/3] CLAUDE.md 장기기억 규칙 확인...");
  try {
    const claudeMdContent = fs.readFileSync(claudeMdPath, "utf8");
    if (claudeMdContent.includes(MARKER_START) && claudeMdContent.includes(MARKER_END)) {
      console.log("      ✅ Mnemo 규칙 블록 존재");
    } else {
      console.log("      ❌ Mnemo 규칙 블록 없음");
      issues++;
    }
  } catch {
    console.log("      ❌ CLAUDE.md 파일 없음");
    issues++;
  }

  // 결과
  console.log("");
  if (issues === 0) {
    console.log("  ✅ 모든 항목 정상! Mnemo가 올바르게 설치되어 있습니다.");
  } else {
    console.log(`  ❌ ${issues}개 문제 발견. 재설치를 권장합니다:`);
    console.log("     node skills/mnemo/install.js");
    console.log("     또는: install.bat / install.sh");
  }
  console.log("");

  process.exit(issues > 0 ? 1 : 0);
}

// ── 제거 ──
function uninstall() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  MNEMO: 장기기억 시스템 제거                                   ║
╚═══════════════════════════════════════════════════════════════╝
`);

  const hooksDir = path.join(claudeDir, "hooks");
  const settingsPath = path.join(claudeDir, "settings.json");
  const claudeMdPath = path.join(claudeDir, "CLAUDE.md");

  // [1/3] 훅 파일 제거
  console.log("[1/3] 훅 파일 제거 중...");
  const hookFiles = [
    "save-conversation.ps1", "save-conversation.sh",
    "save-response.ps1", "save-response.sh"
  ];
  for (const file of hookFiles) {
    if (removeFile(path.join(hooksDir, file))) {
      console.log(`      - ${file} 제거됨`);
    }
  }
  console.log("      완료!");

  // [2/3] settings.json 훅 설정 제거
  console.log("\n[2/3] settings.json 훅 설정 제거 중...");
  removeHooksConfig(settingsPath);
  console.log("      완료!");

  // [3/3] CLAUDE.md 규칙 제거
  console.log("\n[3/3] CLAUDE.md 장기기억 규칙 제거 중...");
  if (uninstallClaudeMdRules(claudeMdPath)) {
    console.log("      제거됨");
  }
  console.log("      완료!");

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  MNEMO 제거 완료!                                              ║
╠═══════════════════════════════════════════════════════════════╣
║  참고: 대화 기록 (conversations/)은 보존됩니다.               ║
║  완전히 삭제하려면 수동으로 삭제하세요.                        ║
╠═══════════════════════════════════════════════════════════════╣
║  Claude Code를 재시작하면 적용됩니다.                          ║
╚═══════════════════════════════════════════════════════════════╝
`);
}

// ── 실행 ──
if (!fs.existsSync(claudeDir)) {
  console.error(`오류: Claude Code가 설치되어 있지 않습니다.`);
  console.error(`      ${claudeDir} 폴더를 찾을 수 없습니다.`);
  process.exit(1);
}

if (isCheck) {
  check();
} else if (isUninstall) {
  uninstall();
} else {
  install();
}
