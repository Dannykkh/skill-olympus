#!/usr/bin/env node
// install-hooks-config.js
// settings.json에 훅 설정을 자동 등록/제거하는 헬퍼 스크립트
//
// 사용법:
//   node install-hooks-config.js <hooks-dir> <settings-path> --windows
//   node install-hooks-config.js <hooks-dir> <settings-path> --bash
//   node install-hooks-config.js <hooks-dir> <settings-path> --uninstall

const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
if (args.length < 3) {
  console.error(
    "사용법: node install-hooks-config.js <hooks-dir> <settings-path> [--windows|--bash|--uninstall]"
  );
  process.exit(1);
}

const hooksDir = args[0].replace(/\\/g, "/");
const settingsPath = args[1];
const mode = args[2]; // --windows, --bash, --uninstall

// 절대경로를 슬래시로 통일
function normalizePath(p) {
  return p.replace(/\\/g, "/");
}

// 훅 항목 생성 헬퍼 (Claude Code 포맷: matcher + hooks 배열)
function hookEntry(matcher, command) {
  return {
    matcher: matcher,
    hooks: [{ type: "command", command: command }],
  };
}

// 훅 정의 (프로젝트 전용 orchestrator 훅은 orchestrator-detector.js가 통합 처리)
// Claude Code는 stdin으로 JSON을 전달하므로 명령줄 인자 불필요
function buildHooksConfig(dir, isWindows) {
  const d = normalizePath(dir);

  if (isWindows) {
    // PowerShell 명령어 (stdin으로 데이터 수신)
    const cmd = (script) =>
      `powershell -ExecutionPolicy Bypass -File "${d}/${script}"`;
    // Node.js 명령어 (orchestrator-detector 등)
    const nodeCmd = (script) => `node "${d}/${script}"`;

    return {
      UserPromptSubmit: [
        hookEntry(".*", cmd("save-conversation.ps1")),
        hookEntry(".*", nodeCmd("orchestrator-detector.js")),
      ],
      PreToolUse: [
        hookEntry("Write", cmd("check-new-file.ps1")),
        hookEntry("Edit|Write", cmd("protect-files.ps1")),
      ],
      PostToolUse: [
        hookEntry("Edit|Write", cmd("validate-code.ps1")),
        hookEntry("Write", cmd("validate-docs.ps1")),
        hookEntry("Edit|Write", cmd("validate-api.ps1")),
      ],
      Stop: [
        hookEntry("", cmd("save-response.ps1")),
      ],
    };
  } else {
    // Bash 명령어 (stdin으로 데이터 수신)
    const cmd = (script) =>
      `bash "${d}/${script}"`;
    // Node.js 명령어 (orchestrator-detector 등)
    const nodeCmd = (script) => `node "${d}/${script}"`;

    return {
      UserPromptSubmit: [
        hookEntry(".*", cmd("save-conversation.sh")),
        hookEntry(".*", nodeCmd("orchestrator-detector.js")),
      ],
      PreToolUse: [
        hookEntry("Write", cmd("check-new-file.sh")),
        hookEntry("Edit|Write", cmd("protect-files.sh")),
      ],
      PostToolUse: [
        hookEntry("Edit|Write", cmd("validate-code.sh")),
        hookEntry("Write", cmd("validate-docs.sh")),
        hookEntry("Edit|Write", cmd("validate-api.sh")),
      ],
      Stop: [
        hookEntry("", cmd("save-response.sh")),
      ],
    };
  }
}

// 기존 settings.json 읽기 (없으면 빈 객체)
function readSettings(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return JSON.parse(content);
  } catch {
    return {};
  }
}

// settings.json 저장
function writeSettings(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

// 환경변수 설정 (Agent Teams 등)
const ENV_DEFAULTS = {
  CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1",
};

// 메인 로직
function main() {
  const settings = readSettings(settingsPath);

  if (mode === "--uninstall") {
    // hooks 키만 제거, env는 유지 (사용자가 수동 관리)
    delete settings.hooks;
    writeSettings(settingsPath, settings);
    console.log("      settings.json에서 hooks 설정 제거 완료");
    return;
  }

  const isWindows = mode === "--windows";
  const hooksConfig = buildHooksConfig(hooksDir, isWindows);

  // hooks 키 교체
  settings.hooks = hooksConfig;

  // env 키 머지 (기존 값 보존, 새 값만 추가)
  if (!settings.env) settings.env = {};
  for (const [key, value] of Object.entries(ENV_DEFAULTS)) {
    if (!(key in settings.env)) {
      settings.env[key] = value;
    }
  }

  // teammateMode 설정 (macOS/Linux: tmux, Windows: in-process)
  // tmux split pane은 macOS(iTerm2) + Linux에서 지원, Windows Terminal은 미지원
  if (!settings.teammateMode) {
    settings.teammateMode = isWindows ? "in-process" : "tmux";
  }

  writeSettings(settingsPath, settings);

  const platform = isWindows ? "PowerShell" : "Bash";
  const teammateMode = settings.teammateMode;
  const hookCount = Object.values(hooksConfig).reduce(
    (sum, arr) => sum + arr.length,
    0
  );
  const envCount = Object.keys(ENV_DEFAULTS).length;
  console.log(
    `      settings.json 설정 완료 (${platform}, ${hookCount}개 훅, env ${envCount}개, teammateMode: ${teammateMode})`
  );
}

main();
