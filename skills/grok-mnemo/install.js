#!/usr/bin/env node
// Grok-Mnemo (long-term memory system) install/uninstall script
//
// Usage:
//   node skills/grok-mnemo/install.js              # install (Grok 미설치 시 자동 skip)
//   node skills/grok-mnemo/install.js --force      # Grok 미설치여도 강제 설치
//   node skills/grok-mnemo/install.js --uninstall  # uninstall
//   node skills/grok-mnemo/install.js --check      # health check
//
// Grok-Mnemo core components:
//   - Hook: save-turn (UserPromptSubmit + Stop 이벤트로 User/Assistant 자동 저장)
//   - Hook 등록: ~/.grok/hooks/grok-mnemo.json (Grok은 hooks/*.json 파일을 자동 스캔)
//   - Rules: ~/.grok/rules/grok-mnemo.md (Grok 전용 델타 — 공통 규칙은
//     ~/.claude/CLAUDE.md를 Grok이 rules 호환으로 직접 로드하므로 중복 주입하지 않음)
//
// 참고: 스킬/에이전트/MCP는 Grok의 [compat.claude] 기본값이 ~/.claude/를 직접 읽어
// 자동 커버되므로 별도 sync가 없다 (memory/learned/018 실측). mnemo 훅만 어댑터가 필요.

const fs = require("fs");
const path = require("path");
const os = require("os");

// ── Config ──
const args = process.argv.slice(2);
const isUninstall = args.includes("--uninstall");
const isCheck = args.includes("--check") || args.includes("--doctor");
const isForce = args.includes("--force");
const isWindows = process.platform === "win32";

// Source directory (location of this script)
const sourceDir = path.resolve(__dirname);

// Grok global directory ($GROK_HOME 지원)
const grokDir = process.env.GROK_HOME
  ? path.resolve(process.env.GROK_HOME)
  : path.join(os.homedir(), ".grok");

const hooksDir = path.join(grokDir, "hooks");
const rulesDir = path.join(grokDir, "rules");
const hookJsonPath = path.join(hooksDir, "grok-mnemo.json");
const rulesDestPath = path.join(rulesDir, "grok-mnemo.md");

// 훅 타임아웃(초). 기본 5초는 git 조회/파일 IO 부하 시 초과될 수 있음 -> 60초로 상향.
const HOOK_TIMEOUT_SECONDS = 60;

// ── Utility functions ──
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

function hookScriptName() {
  return isWindows ? "grok-mnemo-save-turn.ps1" : "grok-mnemo-save-turn.sh";
}

function hookScriptSrc() {
  return path.join(sourceDir, "hooks", isWindows ? "save-turn.ps1" : "save-turn.sh");
}

function buildHookCommand() {
  const scriptPath = normalizePath(path.join(hooksDir, hookScriptName()));
  if (isWindows) {
    return `powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`;
  }
  return `bash "${scriptPath}"`;
}

function buildHookJson(command) {
  // 한 스크립트가 hookEventName으로 분기하므로 두 이벤트 모두 같은 command를 가리킨다.
  // Stop 훅 timeout: 저장은 수 초면 끝나므로 60초로 충분 (기본 600초는 과함).
  const entry = {
    hooks: [{ type: "command", command, timeout: HOOK_TIMEOUT_SECONDS }],
  };
  return {
    hooks: {
      UserPromptSubmit: [entry],
      Stop: [entry],
    },
  };
}

// ── Health check ──
function check() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  GROK-MNEMO: Health Check                                     ║
╚═══════════════════════════════════════════════════════════════╝
`);

  let issues = 0;

  if (!fs.existsSync(grokDir)) {
    console.log(`Grok CLI not found (${grokDir}). Nothing to check.`);
    process.exit(0);
  }

  console.log("[1/3] Checking hook script...");
  const scriptDest = path.join(hooksDir, hookScriptName());
  if (fs.existsSync(scriptDest)) {
    const stat = fs.statSync(scriptDest);
    console.log(`      OK ${hookScriptName()} (${stat.size} bytes)`);
  } else {
    console.log(`      MISSING ${scriptDest}`);
    console.log("      Fix: node skills/grok-mnemo/install.js");
    issues++;
  }

  console.log("\n[2/3] Checking hook registration (grok-mnemo.json)...");
  if (!fs.existsSync(hookJsonPath)) {
    console.log(`      MISSING ${hookJsonPath}`);
    issues++;
  } else {
    try {
      const config = JSON.parse(fs.readFileSync(hookJsonPath, "utf8"));
      for (const ev of ["UserPromptSubmit", "Stop"]) {
        const entries = config.hooks && config.hooks[ev];
        const command = entries && entries[0] && entries[0].hooks && entries[0].hooks[0]
          ? entries[0].hooks[0].command
          : "";
        if (command && command.includes("grok-mnemo-save-turn")) {
          console.log(`      OK ${ev} -> ${command}`);
        } else {
          console.log(`      MISSING ${ev} save-turn entry`);
          issues++;
        }
      }
    } catch (e) {
      console.log(`      INVALID JSON: ${e.message}`);
      issues++;
    }
  }

  console.log("\n[3/3] Checking rules file...");
  if (fs.existsSync(rulesDestPath)) {
    console.log(`      OK ${rulesDestPath}`);
  } else {
    console.log(`      MISSING ${rulesDestPath}`);
    issues++;
  }

  if (issues > 0) {
    console.log(`\n${issues} issue(s) found. Run: node skills/grok-mnemo/install.js`);
    process.exit(1);
  }

  console.log("\nAll checks passed. Grok-Mnemo is installed.");
}

// ── Install ──
function install() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  GROK-MNEMO: Grok Build Long-Term Memory System Install       ║
║  Named after Mnemosyne, goddess of memory                     ║
╚═══════════════════════════════════════════════════════════════╝
`);

  // [1/3] Copy hook script
  console.log("[1/3] Installing hook script...");

  const src = hookScriptSrc();
  const dest = path.join(hooksDir, hookScriptName());
  // 만들기 전에 먼저 검증한다. 예전에는 ensureDir()가 앞에 있어, 소스가 없으면
  // 빈 hooks/ 디렉터리만 남기고 죽었다.
  if (!fs.existsSync(src)) {
    console.error(`      Error: hook source file missing — nothing was installed:`);
    console.error(`        - ${src}`);
    console.error("      레포가 온전하지 않습니다. 다시 clone 하거나");
    console.error("      skills/ 디렉터리를 복구하세요 (git checkout -- skills/).");
    process.exit(1);
  }

  ensureDir(hooksDir);
  copyFile(src, dest);
  if (!isWindows) {
    fs.chmodSync(dest, 0o755);
  }
  console.log(`      - ${hookScriptName()}`);
  console.log("      Done!");

  // [2/3] Hook 등록 JSON (~/.grok/hooks/grok-mnemo.json)
  console.log("\n[2/3] Registering hooks (grok-mnemo.json)...");
  const command = buildHookCommand();
  const config = buildHookJson(command);
  fs.writeFileSync(hookJsonPath, JSON.stringify(config, null, 2) + "\n", "utf8");
  console.log(`      UserPromptSubmit + Stop -> ${hookScriptName()}`);
  console.log("      Done!");

  // [3/3] Rules 파일 (~/.grok/rules/grok-mnemo.md)
  console.log("\n[3/3] Installing rules file...");
  const templatePath = path.join(sourceDir, "templates", "grok-rules.md");
  if (fs.existsSync(templatePath)) {
    copyFile(templatePath, rulesDestPath);
    console.log(`      - ${rulesDestPath}`);
    console.log("      Done!");
  } else {
    console.log("      Template not found, skipping");
  }

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  GROK-MNEMO install complete!                                 ║
╠═══════════════════════════════════════════════════════════════╣
║  Installed components:                                        ║
║  - Hook: save-turn (UserPromptSubmit + Stop auto-save)        ║
║  - Rules: ~/.grok/rules/grok-mnemo.md (Grok-only delta)       ║
╠═══════════════════════════════════════════════════════════════╣
║  Notes:                                                       ║
║  - Skills/Agents/MCP need NO sync: Grok reads ~/.claude/      ║
║    directly via [compat.claude] defaults.                     ║
║  - Conversations save to conversations/YYYY-MM-DD-grok.md     ║
╠═══════════════════════════════════════════════════════════════╣
║  Restart Grok (or press 'r' in /hooks tab) to apply changes.  ║
╚═══════════════════════════════════════════════════════════════╝
`);
}

// ── Uninstall ──
function uninstall() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  GROK-MNEMO: Grok Build Long-Term Memory System Uninstall     ║
╚═══════════════════════════════════════════════════════════════╝
`);

  console.log("[1/3] Removing hook scripts...");
  for (const file of ["grok-mnemo-save-turn.ps1", "grok-mnemo-save-turn.sh"]) {
    if (removeFile(path.join(hooksDir, file))) {
      console.log(`      - ${file} removed`);
    }
  }
  console.log("      Done!");

  console.log("\n[2/3] Removing hook registration...");
  if (removeFile(hookJsonPath)) {
    console.log("      - grok-mnemo.json removed");
  }
  console.log("      Done!");

  console.log("\n[3/3] Removing rules file...");
  if (removeFile(rulesDestPath)) {
    console.log("      - grok-mnemo.md removed");
  }
  console.log("      Done!");

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  GROK-MNEMO uninstall complete!                               ║
╠═══════════════════════════════════════════════════════════════╣
║  Note: conversation history (conversations/) is preserved.    ║
║  To fully delete, remove it manually.                         ║
╚═══════════════════════════════════════════════════════════════╝
`);
}

// ── Run ──
// Grok 미설치 환경에서는 조용히 skip (install.bat/sh가 무조건 호출해도 안전).
// ~/.grok 디렉토리 존재 = Grok 설치의 외부 신호로 사용.
if (!fs.existsSync(grokDir) && !isForce && !isUninstall && !isCheck) {
  console.log(`[grok-mnemo] Grok CLI not found (${grokDir}). Skipping install.`);
  console.log("[grok-mnemo] Install Grok Build first, or rerun with --force.");
  process.exit(0);
}

if (isCheck) {
  check();
} else if (isUninstall) {
  uninstall();
} else {
  install();
}
