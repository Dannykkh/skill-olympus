#!/usr/bin/env node
// Gemini MCP 서버 설정 자동 설치/제거 스크립트
// `gemini mcp add/remove` CLI를 사용해 Gemini 전역 MCP를 등록합니다.
//
// 사용법:
//   목록 표시:     node install-mcp-gemini.js --list
//   전체 설치:     node install-mcp-gemini.js --all
//   특정 설치:     node install-mcp-gemini.js context7 playwright
//   특정 제거:     node install-mcp-gemini.js --uninstall context7

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const args = process.argv.slice(2);
const isListMode = args.includes("--list");
const isAllMode = args.includes("--all");
const isUninstall = args.includes("--uninstall");

const mcpNames = args.filter((a) => !a.startsWith("--"));

const scriptDir = path.resolve(__dirname);
const mcpConfigsDir = path.join(scriptDir, "mcp-configs");

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return {};
  }
}

function shellQuote(value) {
  const s = String(value);
  if (/^[A-Za-z0-9_./:@%+=,-]+$/.test(s)) {
    return s;
  }
  return `"${s.replace(/(["\\$`])/g, "\\$1")}"`;
}

function runGemini(cmdArgs) {
  try {
    return execSync(`gemini ${cmdArgs}`, {
      encoding: "utf-8",
      timeout: 30000,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return null;
  }
}

function isMcpInstalled(name) {
  // gemini mcp list로 설치 여부 확인
  const result = runGemini("mcp list");
  if (result === null) return false;
  return result.toLowerCase().includes(name.toLowerCase());
}

function resolveEnvValue(rawValue) {
  if (typeof rawValue !== "string") return "";
  const match = rawValue.match(/^\$\{(\w+)\}$/);
  if (!match) return rawValue;
  return process.env[match[1]] || rawValue;
}

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

function buildAddCommand(cfg) {
  const parts = ["mcp add"];

  // 환경변수
  if (cfg.config.env) {
    for (const [key, rawValue] of Object.entries(cfg.config.env)) {
      const resolved = resolveEnvValue(rawValue);
      parts.push(`-e ${shellQuote(`${key}=${resolved}`)}`);
    }
  }

  parts.push(shellQuote(cfg.name));

  // URL 기반 (SSE)
  if (cfg.config.url) {
    parts.push(`--url ${shellQuote(cfg.config.url)}`);
    return parts.join(" ");
  }

  // command 기반 (stdio)
  if (!cfg.config.command) {
    return null;
  }

  const cmdArgs = Array.isArray(cfg.config.args) ? cfg.config.args : [];
  parts.push("--");
  parts.push(shellQuote(cfg.config.command));
  for (const arg of cmdArgs) {
    parts.push(shellQuote(arg));
  }

  return parts.join(" ");
}

// gemini CLI 존재 확인
function checkGeminiCli() {
  try {
    execSync("gemini --version", {
      encoding: "utf-8",
      timeout: 10000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return true;
  } catch {
    return false;
  }
}

if (!checkGeminiCli()) {
  console.error("[오류] gemini CLI가 설치되어 있지 않습니다.");
  console.error("       npm install -g @anthropic-ai/gemini-cli 또는 해당 패키지를 설치해주세요.");
  process.exit(1);
}

if (isListMode) {
  const configs = loadAvailableConfigs();
  console.log("\n사용 가능한 MCP 서버 (Gemini):");
  console.log("━".repeat(70));

  for (const cfg of configs) {
    const installed = isMcpInstalled(cfg.name);
    const status = installed ? "✅ 설치됨" : "  미설치";
    const apiKey = cfg.requiresApiKey ? "🔑 API 키 필요" : "🆓 무료";
    console.log(
      `  ${status}  ${cfg.name.padEnd(22)} ${apiKey}  ${cfg.description}`
    );
  }

  console.log("\n설치: node install-mcp-gemini.js <이름1> <이름2> ...");
  console.log("전체: node install-mcp-gemini.js --all");
  console.log("제거: node install-mcp-gemini.js --uninstall <이름>\n");
  process.exit(0);
}

if (isUninstall) {
  if (mcpNames.length === 0) {
    console.error("[오류] 제거할 MCP 이름을 지정해주세요.");
    console.error("  예: node install-mcp-gemini.js --uninstall context7");
    process.exit(1);
  }

  let removed = 0;
  for (const name of mcpNames) {
    const result = runGemini(`mcp remove ${shellQuote(name)}`);
    if (result !== null) {
      console.log(`  ✅ ${name} 제거됨`);
      removed++;
    } else {
      console.log(`  ❌ ${name} 제거 실패 (미등록 또는 오류)`);
    }
  }

  if (removed > 0) {
    console.log(`\n${removed}개 MCP 제거 완료.`);
  }
  process.exit(0);
}

const configs = loadAvailableConfigs();

let toInstall = [];
if (isAllMode) {
  toInstall = configs.filter((c) => !c.requiresApiKey);
  console.log("\n🔧 무료 MCP 서버 전체 설치 모드 (Gemini)");
} else if (mcpNames.length > 0) {
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
  console.log(
    "\nGemini MCP 서버 설치 스크립트\n\n" +
      "사용법:\n" +
      "  node install-mcp-gemini.js --list                   사용 가능한 MCP 목록\n" +
      "  node install-mcp-gemini.js --all                    무료 MCP 전부 설치\n" +
      "  node install-mcp-gemini.js context7 playwright      특정 MCP 설치\n" +
      "  node install-mcp-gemini.js --uninstall context7     특정 MCP 제거\n"
  );
  process.exit(0);
}

if (toInstall.length === 0) {
  console.log("설치할 MCP가 없습니다.");
  process.exit(0);
}

let installed = 0;
let skipped = 0;

for (const cfg of toInstall) {
  if (cfg.requiresApiKey) {
    const envVar = cfg.apiKeyEnvVar || "API_KEY";
    if (!process.env[envVar]) {
      console.log(`  ⚠️  ${cfg.name}: ${envVar} 환경변수가 설정되지 않았습니다.`);
    }
  }

  if (isMcpInstalled(cfg.name)) {
    console.log(`  ⏭️  ${cfg.name} (이미 설치됨, 건너뜀)`);
    skipped++;
    continue;
  }

  const addCmd = buildAddCommand(cfg);
  if (!addCmd) {
    console.log(`  ❌ ${cfg.name} 설치 실패 (config.command 누락)`);
    continue;
  }

  const result = runGemini(addCmd);
  if (result !== null) {
    console.log(`  ✅ ${cfg.name} 설치됨`);
    installed++;
  } else {
    console.log(`  ❌ ${cfg.name} 설치 실패`);
  }
}

console.log(`\n완료: ${installed}개 설치, ${skipped}개 건너뜀`);
if (installed > 0) {
  console.log("Gemini CLI를 재시작하면 안정적으로 반영됩니다.\n");
}
