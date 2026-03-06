#!/usr/bin/env node
// Codex MCP 서버 설정 자동 설치/제거 스크립트
// `codex mcp add/remove/get` CLI를 사용해 Codex 전역 MCP를 등록합니다.
//
// 사용법:
//   목록 표시:     node install-mcp-codex.js --list
//   전체 설치:     node install-mcp-codex.js --all
//   특정 설치:     node install-mcp-codex.js context7 playwright
//   특정 제거:     node install-mcp-codex.js --uninstall context7

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");

const args = process.argv.slice(2);
const isListMode = args.includes("--list");
const isAllMode = args.includes("--all");
const isUninstall = args.includes("--uninstall");

const mcpNames = args.filter((a) => !a.startsWith("--"));

const scriptDir = path.resolve(__dirname);
const mcpConfigsDir = path.join(scriptDir, "mcp-configs");
const codexHome = process.env.CODEX_HOME
  ? path.resolve(process.env.CODEX_HOME)
  : path.join(os.homedir(), ".codex");
const codexConfigPath = path.join(codexHome, "config.toml");
const FETCH_STARTUP_TIMEOUT_SEC = 30;


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

function runCodex(cmdArgs) {
  try {
    return execSync(`codex ${cmdArgs}`, {
      encoding: "utf-8",
      timeout: 30000,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return null;
  }
}

// 설치 여부를 캐시하여 동일 MCP를 여러 번 체크하지 않음
const _mcpInstalledCache = new Map();
function isMcpInstalled(name) {
  if (_mcpInstalledCache.has(name)) return _mcpInstalledCache.get(name);
  const result = runCodex(`mcp get ${shellQuote(name)}`) !== null;
  _mcpInstalledCache.set(name, result);
  return result;
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

  if (cfg.config.env) {
    for (const [key, rawValue] of Object.entries(cfg.config.env)) {
      const resolved = resolveEnvValue(rawValue);
      parts.push(`--env ${shellQuote(`${key}=${resolved}`)}`);
    }
  }

  parts.push(shellQuote(cfg.name));

  if (cfg.config.url) {
    parts.push(`--url ${shellQuote(cfg.config.url)}`);
    if (cfg.config.bearerTokenEnvVar) {
      parts.push(
        `--bearer-token-env-var ${shellQuote(cfg.config.bearerTokenEnvVar)}`
      );
    }
    return parts.join(" ");
  }

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

function ensureServerStartupTimeout(configPath, serverName, timeoutSec) {
  let content = "";
  try {
    content = fs.readFileSync(configPath, "utf-8");
  } catch {
    return { ok: false, reason: "config-missing" };
  }

  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const sectionHeader = `[mcp_servers.${serverName}]`;
  const start = lines.findIndex((line) => line.trim() === sectionHeader);
  if (start < 0) {
    return { ok: false, reason: `${serverName}-section-missing` };
  }

  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^\s*\[/.test(lines[i])) {
      end = i;
      break;
    }
  }

  const timeoutLine = `startup_timeout_sec = ${timeoutSec}`;
  let changed = false;
  let foundTimeout = false;

  for (let i = start + 1; i < end; i++) {
    if (/^\s*startup_timeout_sec\s*=/.test(lines[i])) {
      foundTimeout = true;
      if (lines[i].trim() !== timeoutLine) {
        lines[i] = timeoutLine;
        changed = true;
      }
      break;
    }
  }

  if (!foundTimeout) {
    let insertPos = end;
    for (let i = start + 1; i < end; i++) {
      if (/^\s*args\s*=/.test(lines[i])) {
        insertPos = i + 1;
        break;
      }
    }
    lines.splice(insertPos, 0, timeoutLine);
    changed = true;
  }

  if (!changed) {
    return { ok: true, changed: false };
  }

  const updated = lines.join("\n");
  fs.writeFileSync(configPath, updated.endsWith("\n") ? updated : `${updated}\n`, "utf-8");
  return { ok: true, changed: true };
}

if (isListMode) {
  const configs = loadAvailableConfigs();
  console.log("\n사용 가능한 MCP 서버 (Codex):");
  console.log("━".repeat(70));

  for (const cfg of configs) {
    const installed = isMcpInstalled(cfg.name);
    const status = installed ? "✅ 설치됨" : "  미설치";
    const apiKey = cfg.requiresApiKey ? "🔑 API 키 필요" : "🆓 무료";
    console.log(
      `  ${status}  ${cfg.name.padEnd(22)} ${apiKey}  ${cfg.description}`
    );
  }

  console.log("\n설치: node install-mcp-codex.js <이름1> <이름2> ...");
  console.log("전체: node install-mcp-codex.js --all");
  console.log("제거: node install-mcp-codex.js --uninstall <이름>\n");
  process.exit(0);
}

if (isUninstall) {
  if (mcpNames.length === 0) {
    console.error("[오류] 제거할 MCP 이름을 지정해주세요.");
    console.error("  예: node install-mcp-codex.js --uninstall context7");
    process.exit(1);
  }

  let removed = 0;
  for (const name of mcpNames) {
    if (!isMcpInstalled(name)) {
      console.log(`  ⚠️  ${name} 은(는) 설치되어 있지 않습니다.`);
      continue;
    }

    const result = runCodex(`mcp remove ${shellQuote(name)}`);
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

const configs = loadAvailableConfigs();

let toInstall = [];
if (isAllMode) {
  toInstall = configs.filter((c) => !c.requiresApiKey);
  console.log("\n🔧 무료 MCP 서버 전체 설치 모드 (Codex)");
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
    "\nCodex MCP 서버 설치 스크립트\n\n" +
      "사용법:\n" +
      "  node install-mcp-codex.js --list                   사용 가능한 MCP 목록\n" +
      "  node install-mcp-codex.js --all                    무료 MCP 전부 설치\n" +
      "  node install-mcp-codex.js context7 playwright      특정 MCP 설치\n" +
      "  node install-mcp-codex.js --uninstall context7     특정 MCP 제거\n"
  );
  process.exit(0);
}

if (toInstall.length === 0) {
  console.log("설치할 MCP가 없습니다.");
  process.exit(0);
}

let installed = 0;
let skipped = 0;
const serverTimeoutTargets = [];
if (toInstall.some((cfg) => cfg.name === "fetch")) {
  serverTimeoutTargets.push({
    name: "fetch",
    timeoutSec: FETCH_STARTUP_TIMEOUT_SEC,
  });
}
for (const cfg of toInstall) {
  if (cfg.requiresApiKey) {
    const envVar = cfg.apiKeyEnvVar || "API_KEY";
    if (!process.env[envVar]) {
      console.log(`  ⚠️  ${cfg.name}: ${envVar} 환경변수가 설정되지 않았습니다.`);
      console.log("       설치 후 환경변수를 설정해주세요.");
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

  const result = runCodex(addCmd);
  if (result !== null) {
    console.log(`  ✅ ${cfg.name} 설치됨`);
    installed++;
  } else {
    console.log(`  ❌ ${cfg.name} 설치 실패`);
  }
}

for (const target of serverTimeoutTargets) {
  const timeoutResult = ensureServerStartupTimeout(
    codexConfigPath,
    target.name,
    target.timeoutSec
  );
  if (timeoutResult.ok && timeoutResult.changed) {
    console.log(
      `  ✅ ${target.name} startup_timeout_sec=${target.timeoutSec} 설정됨`
    );
  } else if (timeoutResult.ok) {
    console.log(
      `  ⏭️  ${target.name} startup_timeout_sec=${target.timeoutSec} 이미 설정됨`
    );
  } else {
    console.log(
      `  ⚠️  ${target.name} timeout 설정 건너뜀 (${timeoutResult.reason})`
    );
  }
}

console.log(`\n완료: ${installed}개 설치, ${skipped}개 건너뜀`);
if (installed > 0) {
  console.log("Codex CLI를 재시작하면 안정적으로 반영됩니다.\n");
}
