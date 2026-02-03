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

// 훅 정의 (프로젝트 전용 제외: orchestrator-mode, workpm-hook, pmworker-hook)
function buildHooksConfig(dir, isWindows) {
  const d = normalizePath(dir);

  if (isWindows) {
    // PowerShell 명령어
    const cmd = (script, arg) =>
      `powershell -ExecutionPolicy Bypass -File "${d}/${script}" ${arg || ""}`.trim();

    return {
      UserPromptSubmit: [
        {
          description: "모든 대화를 .md 파일로 저장 (세션 간 공유)",
          matcher: "",
          command: cmd("save-conversation.ps1", '"$PROMPT"'),
        },
      ],
      PreToolUse: [
        {
          description: "새 파일 생성 전 reducing-entropy 확인",
          matcher: "Write",
          command: cmd("check-new-file.ps1", '"$TOOL_INPUT"'),
        },
        {
          description: "민감 파일 보호",
          matcher: "Edit|Write",
          command: cmd("protect-files.ps1", '"$TOOL_INPUT"'),
        },
      ],
      PostToolUse: [
        {
          description: "코드 파일 검증 (500줄, 함수 크기, 보안)",
          matcher: "Edit|Write",
          command: cmd("validate-code.ps1", '"$TOOL_INPUT"'),
        },
        {
          description: "마크다운 AI 글쓰기 패턴 검출",
          matcher: "Write",
          command: cmd("validate-docs.ps1", '"$TOOL_INPUT"'),
        },
        {
          description: "API 파일 유효성 검사",
          matcher: "Edit|Write",
          command: cmd("validate-api.ps1", '"$TOOL_INPUT"'),
        },
      ],
    };
  } else {
    // Bash 명령어
    const cmd = (script, arg) =>
      `bash "${d}/${script}" ${arg || ""}`.trim();

    return {
      UserPromptSubmit: [
        {
          description: "모든 대화를 .md 파일로 저장 (세션 간 공유)",
          matcher: "",
          command: cmd("save-conversation.sh", '"$PROMPT"'),
        },
      ],
      PreToolUse: [
        {
          description: "새 파일 생성 전 reducing-entropy 확인",
          matcher: "Write",
          command: cmd("check-new-file.sh", "$TOOL_INPUT"),
        },
        {
          description: "민감 파일 보호",
          matcher: "Edit|Write",
          command: cmd("protect-files.sh", "$TOOL_INPUT"),
        },
      ],
      PostToolUse: [
        {
          description: "코드 파일 검증 (500줄, 함수 크기, 보안)",
          matcher: "Edit|Write",
          command: cmd("validate-code.sh", "$TOOL_INPUT"),
        },
        {
          description: "마크다운 AI 글쓰기 패턴 검출",
          matcher: "Write",
          command: cmd("validate-docs.sh", "$TOOL_INPUT"),
        },
        {
          description: "API 파일 유효성 검사",
          matcher: "Edit|Write",
          command: cmd("validate-api.sh", "$TOOL_INPUT"),
        },
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
