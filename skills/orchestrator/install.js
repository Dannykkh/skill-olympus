#!/usr/bin/env node
// Orchestrator(PM-Worker 병렬 처리)를 설치/제거하는 스크립트
//
// 사용법:
//   전역 설치:  node install.js --global
//   전역 제거:  node install.js --global --uninstall
//   로컬 설치:  node install.js <target-project-path>
//   로컬 제거:  node install.js <target-project-path> --uninstall

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");

// ── 인자 파싱 ──
const args = process.argv.slice(2);
const isGlobal = args.includes("--global");
const isUninstall = args.includes("--uninstall");

// 인자에서 옵션 제외한 경로 추출
const pathArg = args.find((a) => !a.startsWith("--"));

if (!isGlobal && !pathArg) {
  console.error(
    "사용법:\n" +
      "  전역 설치:  node install.js --global\n" +
      "  전역 제거:  node install.js --global --uninstall\n" +
      "  로컬 설치:  node install.js <target-project-path>\n" +
      "  로컬 제거:  node install.js <target-project-path> --uninstall"
  );
  process.exit(1);
}

// 경로 설정
const homeDir = os.homedir();
const globalClaudeDir = path.join(homeDir, ".claude");
const targetDir = isGlobal ? globalClaudeDir : path.resolve(pathArg);

// 소스 레포 경로 (이 스크립트가 위치한 디렉토리)
const sourceDir = path.resolve(__dirname);
const mcpServerDir = path.join(sourceDir, "mcp-server");
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

// 훅 스크립트 소스 경로 (이 레포의 hooks 폴더)
const hooksSourceDir = path.join(sourceDir, "..", "..", "hooks");

// ── 전역 설치 ──
function installGlobal() {
  console.log(`\nOrchestrator 전역 설치: ${globalClaudeDir}\n`);

  // [1/5] MCP 서버 의존성 및 빌드 확인
  console.log("[1/5] MCP 서버 의존성 및 빌드 확인...");
  const nodeModulesDir = path.join(mcpServerDir, "node_modules");
  const distIndex = path.join(mcpServerDir, "dist", "index.js");

  if (!fs.existsSync(nodeModulesDir)) {
    console.log("      node_modules 없음 → npm install 실행");
    try {
      execSync("npm install", { cwd: mcpServerDir, stdio: "inherit" });
    } catch (e) {
      console.error("      npm install 실패:", e.message);
      process.exit(1);
    }
  }

  if (!fs.existsSync(distIndex)) {
    console.log("      dist/index.js 없음 → npm run build 실행");
    try {
      execSync("npm run build", { cwd: mcpServerDir, stdio: "inherit" });
    } catch (e) {
      console.error("      빌드 실패:", e.message);
      process.exit(1);
    }
  }
  console.log("      의존성 및 빌드 확인 완료");

  // [2/5] 훅 스크립트 복사
  console.log("[2/5] 훅 스크립트 복사...");
  const hooksDir = path.join(globalClaudeDir, "hooks");
  copyFile(
    path.join(hooksSourceDir, "orchestrator-detector.js"),
    path.join(hooksDir, "orchestrator-detector.js")
  );
  console.log("      orchestrator-detector.js 복사 완료");

  // [3/5] 명령어 파일 복사
  console.log("[3/5] 명령어 파일 복사...");
  const commandsDir = path.join(globalClaudeDir, "commands");
  copyFile(
    path.join(sourceDir, "commands", "workpm.md"),
    path.join(commandsDir, "workpm.md")
  );
  copyFile(
    path.join(sourceDir, "commands", "pmworker.md"),
    path.join(commandsDir, "pmworker.md")
  );
  console.log("      workpm.md, pmworker.md 복사 완료");

  // [4/5] spawn 스크립트 복사
  console.log("[4/5] spawn 스크립트 복사...");
  const scriptsDir = path.join(globalClaudeDir, "scripts");
  if (isWindows) {
    copyFile(
      path.join(mcpServerDir, "scripts", "spawn-worker.ps1"),
      path.join(scriptsDir, "spawn-worker.ps1")
    );
    console.log("      spawn-worker.ps1 복사 완료");
  } else {
    copyFile(
      path.join(mcpServerDir, "scripts", "spawn-worker.sh"),
      path.join(scriptsDir, "spawn-worker.sh")
    );
    fs.chmodSync(path.join(scriptsDir, "spawn-worker.sh"), 0o755);
    console.log("      spawn-worker.sh 복사 완료 (chmod +x)");
  }

  // [5/5] settings.json 머지 (전역)
  console.log("[5/5] settings.json 머지 (전역)...");
  const settingsPath = path.join(globalClaudeDir, "settings.json");
  const settings = readJson(settingsPath);

  // mcpServers에 orchestrator 추가 (PROJECT_ROOT 생략 → process.cwd() 사용)
  settings.mcpServers = settings.mcpServers || {};
  settings.mcpServers.orchestrator = {
    command: "node",
    args: [normalizePath(path.join(mcpServerDir, "dist", "index.js"))],
    env: {
      ORCHESTRATOR_WORKER_ID: "pm",
    },
  };

  // hooks에 orchestrator-detector 추가 (스크립트 방식, matcher 없음)
  settings.hooks = settings.hooks || {};
  settings.hooks.UserPromptSubmit = settings.hooks.UserPromptSubmit || [];

  const hookCommand = `node "${normalizePath(path.join(hooksDir, "orchestrator-detector.js"))}"`;

  // 중복 확인 후 추가
  const hasOrchestratorHook = settings.hooks.UserPromptSubmit.some(
    (h) => h.hooks && h.hooks.some((hook) => hook.command && hook.command.includes("orchestrator-detector"))
  );
  if (!hasOrchestratorHook) {
    settings.hooks.UserPromptSubmit.push({
      hooks: [{ type: "command", command: hookCommand }],
    });
  }

  writeJson(settingsPath, settings);
  console.log("      settings.json 머지 완료");

  console.log("\n전역 설치 완료!\n");
  console.log("사용법:");
  console.log('  아무 프로젝트에서 "workpm" 입력 → PM 모드 시작');
  console.log('  Worker 자동 생성: orchestrator_spawn_workers { "count": 2 }');
  console.log("  또는 다른 터미널에서 \"pmworker\" 입력\n");
  console.log("참고: .orchestrator/ 폴더가 현재 작업 디렉토리에 생성됩니다.\n");
}

// ── 전역 제거 ──
function uninstallGlobal() {
  console.log(`\nOrchestrator 전역 제거: ${globalClaudeDir}\n`);

  // [1/4] settings.json에서 mcpServers.orchestrator 및 훅 제거
  console.log("[1/4] settings.json에서 MCP 및 훅 설정 제거...");
  const settingsPath = path.join(globalClaudeDir, "settings.json");
  const settings = readJson(settingsPath);

  if (settings.mcpServers) {
    delete settings.mcpServers.orchestrator;
    if (Object.keys(settings.mcpServers).length === 0) {
      delete settings.mcpServers;
    }
  }

  // hooks에서 orchestrator-detector 제거
  if (settings.hooks && settings.hooks.UserPromptSubmit) {
    settings.hooks.UserPromptSubmit = settings.hooks.UserPromptSubmit.filter(
      (h) => {
        if (h.hooks && Array.isArray(h.hooks)) {
          return !h.hooks.some(
            (hook) => hook.command && hook.command.includes("orchestrator-detector")
          );
        }
        return true;
      }
    );
    if (settings.hooks.UserPromptSubmit.length === 0) {
      delete settings.hooks.UserPromptSubmit;
    }
    if (Object.keys(settings.hooks).length === 0) {
      delete settings.hooks;
    }
  }

  writeJson(settingsPath, settings);
  console.log("      settings.json 정리 완료");

  // [2/4] 훅 스크립트 삭제
  console.log("[2/4] 훅 스크립트 삭제...");
  const hooksDir = path.join(globalClaudeDir, "hooks");
  removeFile(path.join(hooksDir, "orchestrator-detector.js"));
  console.log("      훅 스크립트 삭제 완료");

  // [3/4] 명령어 파일 삭제
  console.log("[3/4] 명령어 파일 삭제...");
  const commandsDir = path.join(globalClaudeDir, "commands");
  removeFile(path.join(commandsDir, "workpm.md"));
  removeFile(path.join(commandsDir, "pmworker.md"));
  console.log("      명령어 파일 삭제 완료");

  // [4/4] spawn 스크립트 삭제
  console.log("[4/4] spawn 스크립트 삭제...");
  const scriptsDir = path.join(globalClaudeDir, "scripts");
  removeFile(path.join(scriptsDir, "spawn-worker.ps1"));
  removeFile(path.join(scriptsDir, "spawn-worker.sh"));
  console.log("      spawn 스크립트 삭제 완료");

  console.log("\n전역 제거 완료!\n");
}

// ── 로컬 설치 ──
function installLocal() {
  console.log(`\nOrchestrator 로컬 설치: ${targetDir}\n`);

  // [1/5] MCP 서버 의존성 및 빌드 확인
  console.log("[1/5] MCP 서버 의존성 및 빌드 확인...");
  const nodeModulesDir = path.join(mcpServerDir, "node_modules");
  const distIndex = path.join(mcpServerDir, "dist", "index.js");

  if (!fs.existsSync(nodeModulesDir)) {
    console.log("      node_modules 없음 → npm install 실행");
    try {
      execSync("npm install", { cwd: mcpServerDir, stdio: "inherit" });
    } catch (e) {
      console.error("      npm install 실패:", e.message);
      process.exit(1);
    }
  }

  if (!fs.existsSync(distIndex)) {
    console.log("      dist/index.js 없음 → npm run build 실행");
    try {
      execSync("npm run build", { cwd: mcpServerDir, stdio: "inherit" });
    } catch (e) {
      console.error("      빌드 실패:", e.message);
      process.exit(1);
    }
  }
  console.log("      의존성 및 빌드 확인 완료");

  // [2/5] 훅 스크립트 복사 (스크립트 방식)
  console.log("[2/5] 훅 스크립트 복사...");
  const hooksDir = path.join(targetDir, "hooks");
  copyFile(
    path.join(hooksSourceDir, "orchestrator-detector.js"),
    path.join(hooksDir, "orchestrator-detector.js")
  );
  console.log("      orchestrator-detector.js 복사 완료");

  // [3/5] Worker spawn 스크립트 복사
  console.log("[3/5] Worker spawn 스크립트 복사...");
  const scriptsDir = path.join(targetDir, ".claude", "scripts");
  if (isWindows) {
    copyFile(
      path.join(mcpServerDir, "scripts", "spawn-worker.ps1"),
      path.join(scriptsDir, "spawn-worker.ps1")
    );
    console.log("      spawn-worker.ps1 복사 완료");
  } else {
    copyFile(
      path.join(mcpServerDir, "scripts", "spawn-worker.sh"),
      path.join(scriptsDir, "spawn-worker.sh")
    );
    fs.chmodSync(path.join(scriptsDir, "spawn-worker.sh"), 0o755);
    console.log("      spawn-worker.sh 복사 완료 (chmod +x)");
  }

  // [4/5] 명령어 파일 복사
  console.log("[4/5] 명령어 파일 복사...");
  const commandsDir = path.join(targetDir, ".claude", "commands");
  copyFile(
    path.join(sourceDir, "commands", "workpm.md"),
    path.join(commandsDir, "workpm.md")
  );
  copyFile(
    path.join(sourceDir, "commands", "pmworker.md"),
    path.join(commandsDir, "pmworker.md")
  );
  console.log("      workpm.md, pmworker.md 복사 완료");

  // [5/5] settings.local.json 머지
  console.log("[5/5] settings.local.json 머지...");
  const settingsPath = path.join(targetDir, ".claude", "settings.local.json");
  const settings = readJson(settingsPath);

  // mcpServers에 orchestrator 추가 (기존 MCP 보존)
  settings.mcpServers = settings.mcpServers || {};
  settings.mcpServers.orchestrator = {
    command: "node",
    args: [normalizePath(path.join(mcpServerDir, "dist", "index.js"))],
    env: {
      ORCHESTRATOR_PROJECT_ROOT: normalizePath(targetDir),
      ORCHESTRATOR_WORKER_ID: "pm",
    },
  };

  // hooks.UserPromptSubmit에 orchestrator-detector 추가 (스크립트 방식)
  settings.hooks = settings.hooks || {};
  settings.hooks.UserPromptSubmit = settings.hooks.UserPromptSubmit || [];

  const hooksDirNorm = normalizePath(hooksDir);
  const hookCommand = `node "${hooksDirNorm}/orchestrator-detector.js"`;

  // 기존 matcher 기반 훅 제거 (이전 버전 호환)
  settings.hooks.UserPromptSubmit = settings.hooks.UserPromptSubmit.filter(
    (h) => {
      if (typeof h.matcher === "string") {
        return !/workpm|pmworker/i.test(h.matcher);
      }
      if (h.hooks && Array.isArray(h.hooks)) {
        return !h.hooks.some(
          (hook) => hook.command && /workpm|pmworker/i.test(hook.command)
        );
      }
      return true;
    }
  );

  // 중복 확인 후 추가
  const hasOrchestratorHook = settings.hooks.UserPromptSubmit.some(
    (h) => h.hooks && h.hooks.some((hook) => hook.command && hook.command.includes("orchestrator-detector"))
  );
  if (!hasOrchestratorHook) {
    settings.hooks.UserPromptSubmit.push({
      hooks: [{ type: "command", command: hookCommand }],
    });
  }

  writeJson(settingsPath, settings);
  console.log("      settings.local.json 머지 완료");

  console.log("\n로컬 설치 완료!\n");
  console.log("사용법:");
  console.log('  PM 모드:     프롬프트에 "workpm" 입력');
  console.log('  Worker 모드: 다른 터미널에서 "pmworker" 입력\n');
}

// ── 로컬 제거 ──
function uninstallLocal() {
  console.log(`\nOrchestrator 로컬 제거: ${targetDir}\n`);

  // [1/5] settings.local.json에서 mcpServers.orchestrator 제거
  console.log("[1/5] settings.local.json에서 MCP 설정 제거...");
  const settingsPath = path.join(targetDir, ".claude", "settings.local.json");
  const settings = readJson(settingsPath);

  if (settings.mcpServers) {
    delete settings.mcpServers.orchestrator;
    if (Object.keys(settings.mcpServers).length === 0) {
      delete settings.mcpServers;
    }
  }

  // [2/5] hooks에서 orchestrator-detector 및 이전 훅 항목 제거
  console.log("[2/5] settings.local.json에서 훅 설정 제거...");
  if (settings.hooks && settings.hooks.UserPromptSubmit) {
    settings.hooks.UserPromptSubmit = settings.hooks.UserPromptSubmit.filter(
      (h) => {
        // 이전 matcher 기반 훅 제거
        if (typeof h.matcher === "string") {
          if (/workpm|pmworker/i.test(h.matcher)) return false;
        }
        // 스크립트 기반 훅 제거
        if (h.hooks && Array.isArray(h.hooks)) {
          const hasOldHook = h.hooks.some(
            (hook) => hook.command && /workpm|pmworker/i.test(hook.command)
          );
          const hasNewHook = h.hooks.some(
            (hook) => hook.command && hook.command.includes("orchestrator-detector")
          );
          if (hasOldHook || hasNewHook) return false;
        }
        return true;
      }
    );
    if (settings.hooks.UserPromptSubmit.length === 0) {
      delete settings.hooks.UserPromptSubmit;
    }
    if (Object.keys(settings.hooks).length === 0) {
      delete settings.hooks;
    }
  }

  writeJson(settingsPath, settings);
  console.log("      settings.local.json 정리 완료");

  // [3/5] 훅 스크립트 삭제
  console.log("[3/5] 훅 스크립트 삭제...");
  const hooksDir = path.join(targetDir, "hooks");
  // 새 스크립트 삭제
  removeFile(path.join(hooksDir, "orchestrator-detector.js"));
  // 이전 버전 파일도 삭제 (호환성)
  removeFile(path.join(hooksDir, "workpm-hook.ps1"));
  removeFile(path.join(hooksDir, "workpm-hook.sh"));
  removeFile(path.join(hooksDir, "pmworker-hook.ps1"));
  removeFile(path.join(hooksDir, "pmworker-hook.sh"));
  console.log("      훅 스크립트 삭제 완료");

  // [4/5] spawn 스크립트 삭제
  console.log("[4/5] spawn 스크립트 삭제...");
  const scriptsDir = path.join(targetDir, ".claude", "scripts");
  removeFile(path.join(scriptsDir, "spawn-worker.ps1"));
  removeFile(path.join(scriptsDir, "spawn-worker.sh"));
  console.log("      spawn 스크립트 삭제 완료");

  // [5/5] 명령어 파일 삭제
  console.log("[5/5] 명령어 파일 삭제...");
  const commandsDir = path.join(targetDir, ".claude", "commands");
  removeFile(path.join(commandsDir, "workpm.md"));
  removeFile(path.join(commandsDir, "pmworker.md"));
  console.log("      명령어 파일 삭제 완료");

  console.log("\n로컬 제거 완료!\n");
}

// ── 실행 ──
if (isGlobal) {
  // 전역 설치/제거
  if (isUninstall) {
    uninstallGlobal();
  } else {
    installGlobal();
  }
} else {
  // 로컬 설치/제거
  if (!fs.existsSync(targetDir)) {
    console.error(`대상 디렉토리가 존재하지 않습니다: ${targetDir}`);
    process.exit(1);
  }

  if (isUninstall) {
    uninstallLocal();
  } else {
    installLocal();
  }
}
