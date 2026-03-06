#!/usr/bin/env node
// Gemini MCP server auto install/uninstall script
// Registers global MCP servers using `gemini mcp add/remove` CLI.
//
// Usage:
//   List servers:     node install-mcp-gemini.js --list
//   Install all:      node install-mcp-gemini.js --all
//   Install specific: node install-mcp-gemini.js context7 playwright
//   Uninstall:        node install-mcp-gemini.js --uninstall context7

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

function runGemini(cmdArgs, timeoutMs = 15000) {
  try {
    return execSync(`gemini ${cmdArgs}`, {
      encoding: "utf-8",
      timeout: timeoutMs,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return null;
  }
}

// Call gemini mcp list once and cache the result
let _mcpListCache = null;
function getInstalledMcpList() {
  if (_mcpListCache !== null) return _mcpListCache;
  const result = runGemini("mcp list");
  _mcpListCache = result ? result.toLowerCase() : "";
  return _mcpListCache;
}

function isMcpInstalled(name) {
  return getInstalledMcpList().includes(name.toLowerCase());
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

  // Environment variables
  if (cfg.config.env) {
    for (const [key, rawValue] of Object.entries(cfg.config.env)) {
      const resolved = resolveEnvValue(rawValue);
      parts.push(`-e ${shellQuote(`${key}=${resolved}`)}`);
    }
  }

  parts.push(shellQuote(cfg.name));

  // URL-based (SSE)
  if (cfg.config.url) {
    parts.push(`--url ${shellQuote(cfg.config.url)}`);
    return parts.join(" ");
  }

  // Command-based (stdio)
  if (!cfg.config.command) {
    return null;
  }

  const cmdArgs = Array.isArray(cfg.config.args) ? cfg.config.args : [];
  // Gemini CLI passes the command directly without '--' separator (unlike Claude)
  parts.push(shellQuote(cfg.config.command));
  for (const arg of cmdArgs) {
    parts.push(shellQuote(arg));
  }

  return parts.join(" ");
}

// Check if gemini CLI is available
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
  console.error("[Error] gemini CLI is not installed.");
  console.error("       Please install it via npm install -g @anthropic-ai/gemini-cli or the appropriate package.");
  process.exit(1);
}

if (isListMode) {
  const configs = loadAvailableConfigs();
  console.log("\nAvailable MCP servers (Gemini):");
  console.log("━".repeat(70));

  for (const cfg of configs) {
    const installed = isMcpInstalled(cfg.name);
    const status = installed ? "✅ installed" : "  not installed";
    const apiKey = cfg.requiresApiKey ? "🔑 API key required" : "🆓 free";
    console.log(
      `  ${status}  ${cfg.name.padEnd(22)} ${apiKey}  ${cfg.description}`
    );
  }

  console.log("\nInstall: node install-mcp-gemini.js <name1> <name2> ...");
  console.log("All:     node install-mcp-gemini.js --all");
  console.log("Remove:  node install-mcp-gemini.js --uninstall <name>\n");
  process.exit(0);
}

if (isUninstall) {
  if (mcpNames.length === 0) {
    console.error("[Error] Please specify the MCP name(s) to uninstall.");
    console.error("  e.g.: node install-mcp-gemini.js --uninstall context7");
    process.exit(1);
  }

  let removed = 0;
  for (const name of mcpNames) {
    const result = runGemini(`mcp remove ${shellQuote(name)}`);
    if (result !== null) {
      console.log(`  ✅ ${name} removed`);
      removed++;
    } else {
      console.log(`  ❌ ${name} removal failed (not registered or error)`);
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
  console.log("\n🔧 Installing all free MCP servers (Gemini)");
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
    "\nGemini MCP Server Install Script\n\n" +
      "Usage:\n" +
      "  node install-mcp-gemini.js --list                   List available MCP servers\n" +
      "  node install-mcp-gemini.js --all                    Install all free MCP servers\n" +
      "  node install-mcp-gemini.js context7 playwright      Install specific MCP servers\n" +
      "  node install-mcp-gemini.js --uninstall context7     Uninstall specific MCP server\n"
  );
  process.exit(0);
}

if (toInstall.length === 0) {
  console.log("No MCP servers to install.");
  process.exit(0);
}

let installed = 0;
let skipped = 0;

for (const cfg of toInstall) {
  if (cfg.requiresApiKey) {
    const envVar = cfg.apiKeyEnvVar || "API_KEY";
    if (!process.env[envVar]) {
      console.log(`  ⚠️  ${cfg.name}: ${envVar} environment variable is not set.`);
    }
  }

  if (isMcpInstalled(cfg.name)) {
    console.log(`  ⏭️  ${cfg.name} (already installed, skipped)`);
    skipped++;
    continue;
  }

  const addCmd = buildAddCommand(cfg);
  if (!addCmd) {
    console.log(`  ❌ ${cfg.name} install failed (config.command missing)`);
    continue;
  }

  const result = runGemini(addCmd);
  if (result !== null) {
    console.log(`  ✅ ${cfg.name} installed`);
    installed++;
  } else {
    console.log(`  ❌ ${cfg.name} install failed`);
  }
}

console.log(`\nDone: ${installed} installed, ${skipped} skipped`);
if (installed > 0) {
  console.log("Restart Gemini CLI for changes to take effect.\n");
}
