#!/usr/bin/env node
// Codex MCP server auto install/uninstall script
// Registers global MCP servers via `codex mcp add/remove/get` CLI.
//
// Usage:
//   List servers:     node install-mcp-codex.js --list
//   Install all:      node install-mcp-codex.js --all
//   Install specific: node install-mcp-codex.js context7 playwright
//   Uninstall:        node install-mcp-codex.js --uninstall context7

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

// Cache installation status to avoid redundant checks for the same MCP
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
      `[Error] mcp-configs directory not found: ${mcpConfigsDir}`
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
  console.log("\nAvailable MCP servers (Codex):");
  console.log("━".repeat(70));

  for (const cfg of configs) {
    const installed = isMcpInstalled(cfg.name);
    const status = installed ? "✅ installed" : "  not installed";
    const apiKey = cfg.requiresApiKey ? "🔑 API key required" : "🆓 free";
    console.log(
      `  ${status}  ${cfg.name.padEnd(22)} ${apiKey}  ${cfg.description}`
    );
  }

  console.log("\nInstall: node install-mcp-codex.js <name1> <name2> ...");
  console.log("All:     node install-mcp-codex.js --all");
  console.log("Remove:  node install-mcp-codex.js --uninstall <name>\n");
  process.exit(0);
}

if (isUninstall) {
  if (mcpNames.length === 0) {
    console.error("[Error] Please specify the MCP name(s) to uninstall.");
    console.error("  e.g.: node install-mcp-codex.js --uninstall context7");
    process.exit(1);
  }

  let removed = 0;
  for (const name of mcpNames) {
    if (!isMcpInstalled(name)) {
      console.log(`  ⚠️  ${name} is not installed.`);
      continue;
    }

    const result = runCodex(`mcp remove ${shellQuote(name)}`);
    if (result !== null) {
      console.log(`  ✅ ${name} removed`);
      removed++;
    } else {
      console.log(`  ❌ ${name} removal failed`);
    }
  }

  if (removed > 0) {
    console.log(`\n${removed} MCP server(s) removed.`);
  }
  process.exit(0);
}

const configs = loadAvailableConfigs();

let toInstall = [];
if (isAllMode) {
  toInstall = configs.filter((c) => !c.requiresApiKey);
  console.log("\n🔧 Installing all free MCP servers (Codex)");
} else if (mcpNames.length > 0) {
  for (const name of mcpNames) {
    const found = configs.find((c) => c.name === name);
    if (found) {
      toInstall.push(found);
    } else {
      console.error(
        `  ⚠️  '${name}' config not found. Use --list to see available servers.`
      );
    }
  }
} else {
  console.log(
    "\nCodex MCP Server Installer\n\n" +
      "Usage:\n" +
      "  node install-mcp-codex.js --list                   List available MCP servers\n" +
      "  node install-mcp-codex.js --all                    Install all free MCP servers\n" +
      "  node install-mcp-codex.js context7 playwright      Install specific MCP servers\n" +
      "  node install-mcp-codex.js --uninstall context7     Uninstall a specific MCP server\n"
  );
  process.exit(0);
}

if (toInstall.length === 0) {
  console.log("No MCP servers to install.");
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
      console.log(`  ⚠️  ${cfg.name}: ${envVar} environment variable is not set.`);
      console.log("       Please set the environment variable after installation.");
    }
  }

  if (isMcpInstalled(cfg.name)) {
    console.log(`  ⏭️  ${cfg.name} (already installed, skipped)`);
    skipped++;
    continue;
  }

  const addCmd = buildAddCommand(cfg);
  if (!addCmd) {
    console.log(`  ❌ ${cfg.name} install failed (missing config.command)`);
    continue;
  }

  const result = runCodex(addCmd);
  if (result !== null) {
    console.log(`  ✅ ${cfg.name} installed`);
    installed++;
  } else {
    console.log(`  ❌ ${cfg.name} install failed`);
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
      `  ✅ ${target.name} startup_timeout_sec=${target.timeoutSec} configured`
    );
  } else if (timeoutResult.ok) {
    console.log(
      `  ⏭️  ${target.name} startup_timeout_sec=${target.timeoutSec} already configured`
    );
  } else {
    console.log(
      `  ⚠️  ${target.name} timeout config skipped (${timeoutResult.reason})`
    );
  }
}

console.log(`\nDone: ${installed} installed, ${skipped} skipped`);
if (installed > 0) {
  console.log("Restart Codex CLI for changes to take effect.\n");
}
