#!/usr/bin/env node
// MCP 서버 설정 자동 설치/제거 스크립트
// `claude mcp add/remove` CLI를 사용하여 공식 방식으로 MCP 등록
//
// 사용법:
//   목록 표시:     node install-mcp.js --list
//   전체 설치:     node install-mcp.js --all
//   특정 설치:     node install-mcp.js context7 playwright
//   특정 제거:     node install-mcp.js --uninstall context7
//   스코프 지정:   node install-mcp.js --scope local context7

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// ── 인자 파싱 ──
const args = process.argv.slice(2);
const isListMode = args.includes("--list");
const isAllMode = args.includes("--all");
const isUninstall = args.includes("--uninstall");

// --scope 옵션 파싱 (기본: user)
const scopeIdx = args.indexOf("--scope");
const scope = scopeIdx !== -1 && args[scopeIdx + 1] ? args[scopeIdx + 1] : "user";

// 옵션이 아닌 인자 추출 (MCP 이름들)
const mcpNames = args.filter(
  (a, i) =>
    !a.startsWith("--") && (scopeIdx === -1 || i !== scopeIdx + 1)
);

// ── 경로 설정 ──
const scriptDir = path.resolve(__dirname);
const mcpConfigsDir = path.join(scriptDir, "mcp-configs");

// ── 유틸리티 ──
function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return {};
  }
}

// claude mcp 명령 실행
function runClaude(cmdArgs) {
  try {
    return execSync(`claude ${cmdArgs}`, {
      encoding: "utf-8",
      timeout: 30000,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch (e) {
    return null;
  }
}

// MCP가 이미 등록되어 있는지 확인
function isMcpInstalled(name) {
  const result = runClaude(`mcp get ${name}`);
  return result !== null;
}

// 사용 가능한 MCP 설정 로드
function loadAvailableConfigs() {
  const configs = [];
  if (!fs.existsSync(mcpConfigsDir)) {
    console.error(
      `[오류] mcp-configs 디렉토리를 찾을 수 없습니다: ${mcpConfigsDir}`
    );
    process.exit(1);
  }

  const files = fs.readdirSync(mcpConfigsDir).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    const config = readJson(path.join(mcpConfigsDir, file));
    if (config.name && config.config) {
      configs.push(config);
    }
  }
  return configs;
}

// ── --list 모드 ──
if (isListMode) {
  const configs = loadAvailableConfigs();
  console.log("\n사용 가능한 MCP 서버:");
  console.log("━".repeat(70));

  for (const cfg of configs) {
    const installed = isMcpInstalled(cfg.name);
    const status = installed ? "✅ 설치됨" : "  미설치";
    const apiKey = cfg.requiresApiKey ? "🔑 API 키 필요" : "🆓 무료";
    console.log(
      `  ${status}  ${cfg.name.padEnd(22)} ${apiKey}  ${cfg.description}`
    );
  }

  console.log("\n설치: node install-mcp.js <이름1> <이름2> ...");
  console.log("전체: node install-mcp.js --all");
  console.log("제거: node install-mcp.js --uninstall <이름>\n");
  process.exit(0);
}

// ── --uninstall 모드 ──
if (isUninstall) {
  if (mcpNames.length === 0) {
    console.error("[오류] 제거할 MCP 이름을 지정해주세요.");
    console.error("  예: node install-mcp.js --uninstall context7");
    process.exit(1);
  }

  let removed = 0;
  for (const name of mcpNames) {
    if (!isMcpInstalled(name)) {
      console.log(`  ⚠️  ${name} 은(는) 설치되어 있지 않습니다.`);
      continue;
    }
    const result = runClaude(`mcp remove "${name}" -s ${scope}`);
    if (result !== null) {
      console.log(`  ✅ ${name} 제거됨`);
      removed++;
    } else {
      console.log(`  ❌ ${name} 제거 실패`);
    }
  }

  if (removed > 0) {
    console.log(`\n${removed}개 MCP 제거 완료.`);
  }
  process.exit(0);
}

// ── 설치 모드 ──
const configs = loadAvailableConfigs();

// 설치 대상 결정
let toInstall = [];
if (isAllMode) {
  // --all: API 키 불필요한 것만 자동 설치
  toInstall = configs.filter((c) => !c.requiresApiKey);
  console.log("\n🔧 무료 MCP 서버 전체 설치 모드");
} else if (mcpNames.length > 0) {
  // 특정 MCP 지정
  for (const name of mcpNames) {
    const found = configs.find((c) => c.name === name);
    if (found) {
      toInstall.push(found);
    } else {
      console.error(
        `  ⚠️  '${name}' 설정을 찾을 수 없습니다. --list로 확인해주세요.`
      );
    }
  }
} else {
  // 인자 없음: 사용법 표시
  console.log(
    "\nMCP 서버 설치 스크립트 (claude mcp CLI 사용)\n\n" +
      "사용법:\n" +
      "  node install-mcp.js --list                   사용 가능한 MCP 목록\n" +
      "  node install-mcp.js --all                    무료 MCP 전부 설치\n" +
      "  node install-mcp.js context7 playwright      특정 MCP 설치\n" +
      "  node install-mcp.js --uninstall context7     특정 MCP 제거\n" +
      "  node install-mcp.js --scope local context7   스코프 지정 (기본: user)\n"
  );
  process.exit(0);
}

if (toInstall.length === 0) {
  console.log("설치할 MCP가 없습니다.");
  process.exit(0);
}

console.log(`\n스코프: ${scope}\n`);

let installed = 0;
let skipped = 0;

for (const cfg of toInstall) {
  // API 키 경고
  if (cfg.requiresApiKey) {
    const envVar = cfg.apiKeyEnvVar || "API_KEY";
    const envValue = process.env[envVar];
    if (!envValue) {
      console.log(`  ⚠️  ${cfg.name}: ${envVar} 환경변수가 설정되지 않았습니다.`);
      console.log(`       설치 후 환경변수를 설정해주세요.`);
    }
  }

  // 이미 설치되어 있으면 건너뜀
  if (isMcpInstalled(cfg.name)) {
    console.log(`  ⏭️  ${cfg.name} (이미 설치됨, 건너뜀)`);
    skipped++;
    continue;
  }

  // claude mcp add 명령 구성
  const { command, args: cfgArgs, env } = cfg.config;
  let cmdParts = [`mcp add --scope ${scope}`];

  // 환경변수 (-e KEY=value)
  if (env) {
    for (const [key, value] of Object.entries(env)) {
      // ${VAR} 패턴을 실제 환경변수로 치환
      const match = value.match(/^\$\{(\w+)\}$/);
      const resolvedValue = match ? process.env[match[1]] || value : value;
      cmdParts.push(`-e ${key}=${resolvedValue}`);
    }
  }

  // 이름 + -- + 명령어 + 인자
  cmdParts.push(`"${cfg.name}" -- ${command}`);
  if (cfgArgs && cfgArgs.length > 0) {
    cmdParts.push(cfgArgs.join(" "));
  }

  const fullCmd = cmdParts.join(" ");
  const result = runClaude(fullCmd);

  if (result !== null) {
    console.log(`  ✅ ${cfg.name} 설치됨`);
    installed++;
  } else {
    console.log(`  ❌ ${cfg.name} 설치 실패`);
  }
}

console.log(`\n완료: ${installed}개 설치, ${skipped}개 건너뜀`);

if (installed > 0) {
  console.log("Claude Code를 재시작하면 적용됩니다.\n");
}
