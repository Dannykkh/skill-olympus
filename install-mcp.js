#!/usr/bin/env node
// MCP 서버 설정 자동 설치/제거 스크립트
//
// 사용법:
//   목록 표시:     node install-mcp.js --list
//   전체 설치:     node install-mcp.js --all
//   특정 설치:     node install-mcp.js context7 playwright
//   특정 제거:     node install-mcp.js --uninstall context7
//   대상 지정:     node install-mcp.js context7 --target ~/.claude/settings.json

const fs = require("fs");
const path = require("path");
const os = require("os");

// ── 인자 파싱 ──
const args = process.argv.slice(2);
const isListMode = args.includes("--list");
const isAllMode = args.includes("--all");
const isUninstall = args.includes("--uninstall");

// --target 옵션 파싱
const targetIdx = args.indexOf("--target");
let targetSettingsPath = null;
if (targetIdx !== -1 && args[targetIdx + 1]) {
  targetSettingsPath = path.resolve(args[targetIdx + 1]);
}

// 옵션이 아닌 인자 추출 (MCP 이름들)
const mcpNames = args.filter(
  (a, i) =>
    !a.startsWith("--") && (targetIdx === -1 || i !== targetIdx + 1)
);

// ── 경로 설정 ──
const scriptDir = path.resolve(__dirname);
const mcpConfigsDir = path.join(scriptDir, "mcp-configs");
const homeDir = os.homedir();

// 기본 settings.json 경로: 전역 Claude 설정
if (!targetSettingsPath) {
  targetSettingsPath = path.join(homeDir, ".claude", "settings.json");
}

// ── 유틸리티 ──
function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return {};
  }
}

function writeJson(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

// 사용 가능한 MCP 설정 로드
function loadAvailableConfigs() {
  const configs = [];
  if (!fs.existsSync(mcpConfigsDir)) {
    console.error(`[오류] mcp-configs 디렉토리를 찾을 수 없습니다: ${mcpConfigsDir}`);
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

  // 현재 설치된 MCP 확인
  const settings = readJson(targetSettingsPath);
  const installed = settings.mcpServers ? Object.keys(settings.mcpServers) : [];

  for (const cfg of configs) {
    const status = installed.includes(cfg.name) ? "✅ 설치됨" : "  미설치";
    const apiKey = cfg.requiresApiKey ? "🔑 API 키 필요" : "🆓 무료";
    console.log(`  ${status}  ${cfg.name.padEnd(22)} ${apiKey}  ${cfg.description}`);
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

  const settings = readJson(targetSettingsPath);
  if (!settings.mcpServers) {
    console.log("설치된 MCP가 없습니다.");
    process.exit(0);
  }

  let removed = 0;
  for (const name of mcpNames) {
    if (settings.mcpServers[name]) {
      delete settings.mcpServers[name];
      console.log(`  ✅ ${name} 제거됨`);
      removed++;
    } else {
      console.log(`  ⚠️  ${name} 은(는) 설치되어 있지 않습니다.`);
    }
  }

  if (removed > 0) {
    writeJson(targetSettingsPath, settings);
    console.log(`\n${removed}개 MCP 제거 완료. (${targetSettingsPath})`);
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
      console.error(`  ⚠️  '${name}' 설정을 찾을 수 없습니다. --list로 확인해주세요.`);
    }
  }
} else {
  // 인자 없음: 사용법 표시
  console.log(
    "\nMCP 서버 설치 스크립트\n\n" +
      "사용법:\n" +
      "  node install-mcp.js --list                   사용 가능한 MCP 목록\n" +
      "  node install-mcp.js --all                    무료 MCP 전부 설치\n" +
      "  node install-mcp.js context7 playwright      특정 MCP 설치\n" +
      "  node install-mcp.js --uninstall context7     특정 MCP 제거\n" +
      "  node install-mcp.js context7 --target <path> 대상 settings.json 지정\n"
  );
  process.exit(0);
}

if (toInstall.length === 0) {
  console.log("설치할 MCP가 없습니다.");
  process.exit(0);
}

// settings.json 읽기 및 머지
const settings = readJson(targetSettingsPath);
if (!settings.mcpServers) {
  settings.mcpServers = {};
}

console.log(`\n대상: ${targetSettingsPath}\n`);

let installed = 0;
let skipped = 0;

for (const cfg of toInstall) {
  // API 키 경고
  if (cfg.requiresApiKey) {
    const envVar = cfg.apiKeyEnvVar || "API_KEY";
    const envValue = process.env[envVar];
    if (!envValue) {
      console.log(`  ⚠️  ${cfg.name}: ${envVar} 환경변수가 설정되지 않았습니다.`);
      console.log(`       설치 후 settings.json에서 직접 설정해주세요.`);
    }
  }

  // 이미 설치되어 있으면 건너뜀
  if (settings.mcpServers[cfg.name]) {
    console.log(`  ⏭️  ${cfg.name} (이미 설치됨, 건너뜀)`);
    skipped++;
    continue;
  }

  // config 객체에서 env의 ${VAR} 패턴을 실제 환경변수로 치환
  const mcpConfig = JSON.parse(JSON.stringify(cfg.config));
  if (mcpConfig.env) {
    for (const [key, value] of Object.entries(mcpConfig.env)) {
      const match = value.match(/^\$\{(\w+)\}$/);
      if (match) {
        const envValue = process.env[match[1]];
        if (envValue) {
          mcpConfig.env[key] = envValue;
        }
      }
    }
  }

  settings.mcpServers[cfg.name] = mcpConfig;
  console.log(`  ✅ ${cfg.name} 설치됨`);
  installed++;
}

// 저장
if (installed > 0) {
  writeJson(targetSettingsPath, settings);
}

console.log(
  `\n완료: ${installed}개 설치, ${skipped}개 건너뜀`
);

if (installed > 0) {
  console.log("Claude Code를 재시작하면 적용됩니다.\n");
}
