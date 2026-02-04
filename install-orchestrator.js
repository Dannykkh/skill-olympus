#!/usr/bin/env node
// install-orchestrator.js
// Orchestrator(PM-Worker 병렬 처리)를 대상 프로젝트에 설치/제거하는 스크립트
//
// 사용법:
//   node install-orchestrator.js <target-project-path>
//   node install-orchestrator.js <target-project-path> --uninstall

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// ── 인자 파싱 ──
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error(
    "사용법:\n" +
      "  node install-orchestrator.js <target-project-path>\n" +
      "  node install-orchestrator.js <target-project-path> --uninstall"
  );
  process.exit(1);
}

const targetDir = path.resolve(args[0]);
const isUninstall = args.includes("--uninstall");

// 소스 레포 경로 (이 스크립트가 위치한 디렉토리)
const sourceDir = path.resolve(__dirname);
const mcpServerDir = path.join(
  sourceDir,
  "mcp-servers",
  "claude-orchestrator-mcp"
);
const isWindows = process.platform === "win32";

// 경로를 슬래시로 통일
function normalizePath(p) {
  return p.replace(/\\/g, "/");
}

// JSON 파일 읽기 (없으면 빈 객체)
function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return {};
  }
}

// JSON 파일 저장
function writeJson(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

// 파일 복사 헬퍼
function copyFile(src, dest) {
  const dir = path.dirname(dest);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
}

// 파일 삭제 헬퍼 (없으면 무시)
function removeFile(filePath) {
  try {
    fs.unlinkSync(filePath);
  } catch {
    // 파일이 없으면 무시
  }
}

// ── 설치 ──
function install() {
  console.log(`\nOrchestrator 설치: ${targetDir}\n`);

  // [1/4] MCP 서버 빌드 확인
  console.log("[1/4] MCP 서버 빌드 확인...");
  const distIndex = path.join(mcpServerDir, "dist", "index.js");
  if (!fs.existsSync(distIndex)) {
    console.log("      dist/index.js 없음 → npm install && npm run build");
    try {
      execSync("npm install", { cwd: mcpServerDir, stdio: "inherit" });
      execSync("npm run build", { cwd: mcpServerDir, stdio: "inherit" });
    } catch (e) {
      console.error("      MCP 서버 빌드 실패:", e.message);
      process.exit(1);
    }
  }
  console.log("      빌드 확인 완료");

  // [2/4] 훅 파일 복사
  console.log("[2/4] 훅 파일 복사...");
  const hooksDir = path.join(targetDir, "hooks");
  if (isWindows) {
    copyFile(
      path.join(sourceDir, "hooks", "workpm-hook.ps1"),
      path.join(hooksDir, "workpm-hook.ps1")
    );
    copyFile(
      path.join(sourceDir, "hooks", "pmworker-hook.ps1"),
      path.join(hooksDir, "pmworker-hook.ps1")
    );
    console.log("      workpm-hook.ps1, pmworker-hook.ps1 복사 완료");
  } else {
    copyFile(
      path.join(sourceDir, "hooks", "workpm-hook.sh"),
      path.join(hooksDir, "workpm-hook.sh")
    );
    copyFile(
      path.join(sourceDir, "hooks", "pmworker-hook.sh"),
      path.join(hooksDir, "pmworker-hook.sh")
    );
    // 실행 권한 부여
    fs.chmodSync(path.join(hooksDir, "workpm-hook.sh"), 0o755);
    fs.chmodSync(path.join(hooksDir, "pmworker-hook.sh"), 0o755);
    console.log("      workpm-hook.sh, pmworker-hook.sh 복사 완료 (chmod +x)");
  }

  // [3/4] 명령어 파일 복사
  console.log("[3/4] 명령어 파일 복사...");
  const commandsDir = path.join(targetDir, ".claude", "commands");
  copyFile(
    path.join(sourceDir, ".claude", "commands", "workpm.md"),
    path.join(commandsDir, "workpm.md")
  );
  copyFile(
    path.join(sourceDir, ".claude", "commands", "pmworker.md"),
    path.join(commandsDir, "pmworker.md")
  );
  console.log("      workpm.md, pmworker.md 복사 완료");

  // [4/4] settings.local.json 머지
  console.log("[4/4] settings.local.json 머지...");
  const settingsPath = path.join(targetDir, ".claude", "settings.local.json");
  const settings = readJson(settingsPath);

  // mcpServers에 orchestrator 추가 (기존 MCP 보존)
  settings.mcpServers = settings.mcpServers || {};
  settings.mcpServers.orchestrator = {
    command: "node",
    args: [
      normalizePath(path.join(mcpServerDir, "dist", "index.js")),
    ],
    env: {
      ORCHESTRATOR_PROJECT_ROOT: normalizePath(targetDir),
      ORCHESTRATOR_WORKER_ID: "pm",
    },
  };

  // hooks.UserPromptSubmit에 workpm/pmworker 훅 추가 (기존 훅 보존)
  settings.hooks = settings.hooks || {};
  settings.hooks.UserPromptSubmit = settings.hooks.UserPromptSubmit || [];

  const hooksDirNorm = normalizePath(hooksDir);

  // 훅 명령어 생성
  const workpmCommand = isWindows
    ? `powershell -ExecutionPolicy Bypass -File "${hooksDirNorm}/workpm-hook.ps1"`
    : `bash "${hooksDirNorm}/workpm-hook.sh"`;
  const pmworkerCommand = isWindows
    ? `powershell -ExecutionPolicy Bypass -File "${hooksDirNorm}/pmworker-hook.ps1"`
    : `bash "${hooksDirNorm}/pmworker-hook.sh"`;

  // 중복 확인 후 추가
  const existingHooks = settings.hooks.UserPromptSubmit;

  const hasWorkpm = existingHooks.some(
    (h) => h.matcher && h.matcher.match && /workpm/i.test(h.matcher.match)
  );
  if (!hasWorkpm) {
    existingHooks.push({
      matcher: "(?i)^\\s*workpm",
      hooks: [{ type: "command", command: workpmCommand }],
    });
  }

  const hasPmworker = existingHooks.some(
    (h) => h.matcher && h.matcher.match && /pmworker/i.test(h.matcher.match)
  );
  if (!hasPmworker) {
    existingHooks.push({
      matcher: "(?i)^\\s*pmworker",
      hooks: [{ type: "command", command: pmworkerCommand }],
    });
  }

  writeJson(settingsPath, settings);
  console.log("      settings.local.json 머지 완료");

  console.log("\n설치 완료!\n");
  console.log("사용법:");
  console.log('  PM 모드:     프롬프트에 "workpm" 입력');
  console.log('  Worker 모드: 다른 터미널에서 "pmworker" 입력\n');
}

// ── 제거 ──
function uninstall() {
  console.log(`\nOrchestrator 제거: ${targetDir}\n`);

  // [1/4] settings.local.json에서 mcpServers.orchestrator 제거
  console.log("[1/4] settings.local.json에서 MCP 설정 제거...");
  const settingsPath = path.join(targetDir, ".claude", "settings.local.json");
  const settings = readJson(settingsPath);

  if (settings.mcpServers) {
    delete settings.mcpServers.orchestrator;
    // mcpServers가 비었으면 키 자체 제거
    if (Object.keys(settings.mcpServers).length === 0) {
      delete settings.mcpServers;
    }
  }

  // [2/4] hooks에서 workpm/pmworker 훅 항목 제거
  console.log("[2/4] settings.local.json에서 훅 설정 제거...");
  if (settings.hooks && settings.hooks.UserPromptSubmit) {
    settings.hooks.UserPromptSubmit = settings.hooks.UserPromptSubmit.filter(
      (h) => {
        // matcher가 문자열인 경우
        if (typeof h.matcher === "string") {
          return !/workpm|pmworker/i.test(h.matcher);
        }
        // hooks 배열의 command에 workpm/pmworker가 포함된 경우
        if (h.hooks && Array.isArray(h.hooks)) {
          return !h.hooks.some(
            (hook) =>
              hook.command && /workpm|pmworker/i.test(hook.command)
          );
        }
        return true;
      }
    );
    // UserPromptSubmit가 비었으면 제거
    if (settings.hooks.UserPromptSubmit.length === 0) {
      delete settings.hooks.UserPromptSubmit;
    }
    // hooks가 비었으면 키 자체 제거
    if (Object.keys(settings.hooks).length === 0) {
      delete settings.hooks;
    }
  }

  writeJson(settingsPath, settings);
  console.log("      settings.local.json 정리 완료");

  // [3/4] 훅 파일 삭제
  console.log("[3/4] 훅 파일 삭제...");
  const hooksDir = path.join(targetDir, "hooks");
  removeFile(path.join(hooksDir, "workpm-hook.ps1"));
  removeFile(path.join(hooksDir, "workpm-hook.sh"));
  removeFile(path.join(hooksDir, "pmworker-hook.ps1"));
  removeFile(path.join(hooksDir, "pmworker-hook.sh"));
  console.log("      훅 파일 삭제 완료");

  // [4/4] 명령어 파일 삭제
  console.log("[4/4] 명령어 파일 삭제...");
  const commandsDir = path.join(targetDir, ".claude", "commands");
  removeFile(path.join(commandsDir, "workpm.md"));
  removeFile(path.join(commandsDir, "pmworker.md"));
  console.log("      명령어 파일 삭제 완료");

  console.log("\n제거 완료!\n");
}

// ── 실행 ──
if (!fs.existsSync(targetDir)) {
  console.error(`대상 디렉토리가 존재하지 않습니다: ${targetDir}`);
  process.exit(1);
}

if (isUninstall) {
  uninstall();
} else {
  install();
}
