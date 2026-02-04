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

// 훅 정의 (프로젝트 전용 제외: orchestrator-mode, workpm-hook, pmworker-hook)
// Claude Code는 stdin으로 JSON을 전달하므로 명령줄 인자 불필요
function buildHooksConfig(dir, isWindows) {
  const d = normalizePath(dir);

  if (isWindows) {
    // PowerShell 명령어 (stdin으로 데이터 수신)
    const cmd = (script) =>
      `powershell -ExecutionPolicy Bypass -File "${d}/${script}"`;

    return {
      UserPromptSubmit: [
        hookEntry(".*", cmd("save-conversation.ps1")),
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

    return {
      UserPromptSubmit: [
        hookEntry(".*", cmd("save-conversation.sh")),
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

// 메인 로직
function main() {
  const settings = readSettings(settingsPath);

  if (mode === "--uninstall") {
    // hooks 키만 제거, 나머지 보존
    delete settings.hooks;
    writeSettings(settingsPath, settings);
    console.log("      settings.json에서 hooks 설정 제거 완료");
    return;
  }

  const isWindows = mode === "--windows";
  const hooksConfig = buildHooksConfig(hooksDir, isWindows);

  // hooks 키만 교체, 나머지 보존
  settings.hooks = hooksConfig;
  writeSettings(settingsPath, settings);

  const platform = isWindows ? "PowerShell" : "Bash";
  const hookCount = Object.values(hooksConfig).reduce(
    (sum, arr) => sum + arr.length,
    0
  );
  console.log(
    `      settings.json 훅 설정 완료 (${platform}, ${hookCount}개 훅)`
  );
}

main();
