#!/usr/bin/env node
// Codex MCP server auto install/uninstall script
// Registers global MCP servers via the Codex MCP CLI.
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
const AUTO_INSTALL_EXCLUDES = new Set(["fetch"]);

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

function loadInstalledNames() {
  try {
    const servers = JSON.parse(runCodex("mcp list --json"));
    if (Array.isArray(servers) && servers.every(server => typeof server?.name === "string")) {
      return new Set(servers.map(server => server.name));
    }
  } catch { /* The CLI output may contain configuration values. */ }
  console.error("[Error] Cannot read Codex MCP registrations. Check 'codex mcp list --json'.");
  return null;
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
  const installedNames = loadInstalledNames();
  console.log("\nAvailable MCP servers (Codex):");
  console.log("━".repeat(70));

  for (const cfg of configs) {
    let status = "  status unknown";
    if (installedNames) status = installedNames.has(cfg.name) ? "✅ installed" : "  not installed";
    const apiKey = cfg.requiresApiKey ? "🔑 API key required" : "🆓 free";
    console.log(
      `  ${status}  ${cfg.name.padEnd(22)} ${apiKey}  ${cfg.description}`
    );
  }

  console.log("\nInstall: node install-mcp-codex.js <name1> <name2> ...");
  console.log("All:     node install-mcp-codex.js --all");
  console.log("Remove:  node install-mcp-codex.js --uninstall <name>\n");
  process.exit(installedNames ? 0 : 1);
}

if (isUninstall) {
  if (mcpNames.length === 0) {
    console.error("[Error] Please specify the MCP name(s) to uninstall.");
    console.error("  e.g.: node install-mcp-codex.js --uninstall context7");
    process.exit(1);
  }

  const installedNames = loadInstalledNames();
  if (!installedNames) process.exit(1);
  let removed = 0;
  let failed = 0;
  for (const name of mcpNames) {
    if (!installedNames.has(name)) {
      console.log(`  ⚠️  ${name} is not installed.`);
      continue;
    }

    const result = runCodex(`mcp remove ${shellQuote(name)}`);
    if (result !== null) {
      console.log(`  ✅ ${name} removed`);
      installedNames.delete(name);
      removed++;
    } else {
      console.error(`  ❌ ${name} removal failed`);
      failed++;
    }
  }

  if (removed > 0) {
    console.log(`\n${removed} MCP server(s) removed.`);
  }
  process.exit(failed ? 1 : 0);
}

const configs = loadAvailableConfigs();

let toInstall = [];
let failed = 0;
if (isAllMode) {
  toInstall = configs.filter(
    (c) => !c.requiresApiKey && !AUTO_INSTALL_EXCLUDES.has(c.name)
  );
  console.log("\n🔧 Installing all free MCP servers (Codex, excluding fetch)");
} else if (mcpNames.length > 0) {
  for (const name of mcpNames) {
    const found = configs.find((c) => c.name === name);
    if (found) {
      toInstall.push(found);
    } else {
      console.error(
        `  ⚠️  '${name}' config not found. Use --list to see available servers.`
      );
      failed++;
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
  process.exit(failed ? 1 : 0);
}

let installed = 0;
let skipped = 0;
const installedNames = loadInstalledNames();
if (!installedNames) process.exit(1);
for (const cfg of toInstall) {
  if (cfg.requiresApiKey) {
    const envVar = cfg.apiKeyEnvVar || "API_KEY";
    if (!process.env[envVar]) {
      console.log(`  ⚠️  ${cfg.name}: ${envVar} environment variable is not set.`);
      console.log("       Please set the environment variable after installation.");
    }
  }

  if (installedNames.has(cfg.name)) {
    console.log(`  ⏭️  ${cfg.name} (already installed, skipped)`);
    skipped++;
    continue;
  }

  const addCmd = buildAddCommand(cfg);
  if (!addCmd) {
    console.error(`  ❌ ${cfg.name} install failed (missing config.command)`);
    failed++;
    continue;
  }

  const result = runCodex(addCmd);
  if (result !== null) {
    console.log(`  ✅ ${cfg.name} installed`);
    installedNames.add(cfg.name);
    installed++;
  } else {
    console.error(`  ❌ ${cfg.name} install failed`);
    failed++;
  }
}

if (installedNames.has("fetch") && toInstall.some(cfg => cfg.name === "fetch")) {
  const timeoutResult = ensureServerStartupTimeout(
    codexConfigPath,
    "fetch",
    FETCH_STARTUP_TIMEOUT_SEC
  );
  if (timeoutResult.ok && timeoutResult.changed) {
    console.log(
      `  ✅ fetch startup_timeout_sec=${FETCH_STARTUP_TIMEOUT_SEC} configured`
    );
  } else if (timeoutResult.ok) {
    console.log(
      `  ⏭️  fetch startup_timeout_sec=${FETCH_STARTUP_TIMEOUT_SEC} already configured`
    );
  } else {
    console.error(`  ❌ fetch timeout config failed (${timeoutResult.reason})`);
    failed++;
  }
}

console.log(`\nDone: ${installed} installed, ${skipped} skipped, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
if (installed > 0) {
  console.log("Restart Codex CLI for changes to take effect.\n");
}
