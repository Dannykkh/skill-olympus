#!/usr/bin/env node
// MCP server config auto install/uninstall script
// Registers MCP officially via `claude mcp add/remove` CLI
//
// Usage:
//   List servers:     node install-mcp.js --list
//   Install all:      node install-mcp.js --all
//   Install specific: node install-mcp.js context7 playwright
//   Uninstall:        node install-mcp.js --uninstall context7
//   Force reinstall:  node install-mcp.js --all --force
//   Set scope:        node install-mcp.js --scope local context7

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// ── Argument parsing ──
const args = process.argv.slice(2);
const isListMode = args.includes("--list");
const isAllMode = args.includes("--all");
const isUninstall = args.includes("--uninstall");
const isForce = args.includes("--force");
const AUTO_INSTALL_EXCLUDES = new Set(["fetch"]);

// --scope option parsing (default: user)
const scopeIdx = args.indexOf("--scope");
const scope = scopeIdx === -1 ? "user" : args[scopeIdx + 1];
if (!["user", "local", "project"].includes(scope)) {
  console.error("[Error] --scope requires user, local, or project.");
  process.exit(1);
}

// Extract non-option arguments (MCP names)
const mcpNames = args.filter(
  (a, i) =>
    !a.startsWith("--") && (scopeIdx === -1 || i !== scopeIdx + 1)
);
if (mcpNames.some(name => !/^[A-Za-z0-9_-]+$/.test(name))) {
  console.error("[Error] MCP names may contain letters, numbers, hyphens, and underscores.");
  process.exit(1);
}

// ── Path settings ──
const scriptDir = path.resolve(__dirname);
const mcpConfigsDir = path.join(scriptDir, "mcp-configs");

// ── Utilities ──
function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return {};
  }
}

// Run claude mcp command (remove CLAUDECODE env var to prevent nested sessions)
function runClaude(cmdArgs) {
  try {
    const env = { ...process.env };
    delete env.CLAUDECODE;
    const output = execSync(`claude ${cmdArgs}`, {
      encoding: "utf-8",
      timeout: 30000,
      stdio: ["pipe", "pipe", "pipe"],
      env,
    }).trim();
    return { ok: true, output };
  } catch (error) {
    return { ok: false, output: [error.stderr, error.stdout].filter(Boolean).join("\n").trim() };
  }
}

function normalizeSpace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function resolveCommandAndArgs(command, args) {
  const cmd = String(command || "").trim();
  const normalizedArgs = Array.isArray(args) ? args : [];
  if (process.platform === "win32" && cmd.toLowerCase() === "npx") {
    return { command: "cmd", args: ["/c", "npx", ...normalizedArgs] };
  }
  return { command: cmd, args: normalizedArgs };
}

function parseScope(scopeLine) {
  const normalized = (scopeLine || "").toLowerCase();
  if (normalized.includes("user config")) return "user";
  if (normalized.includes("local config")) return "local";
  if (normalized.includes("project config")) return "project";
  return null;
}

function getMcpState(name) {
  const { ok, output } = runClaude(`mcp get "${name}"`);
  if (!ok) {
    return { installed: false };
  }

  const scopeLine = (output.match(/^\s*Scope:\s*(.+)$/m) || [])[1] || "";
  const commandLine = (output.match(/^\s*Command:\s*(.+)$/m) || [])[1] || "";
  const argsLine = (output.match(/^\s*Args:\s*(.*)$/m) || [])[1] || "";
  return {
    installed: true,
    scope: parseScope(scopeLine),
    command: normalizeSpace(commandLine),
    args: normalizeSpace(argsLine),
  };
}

function removeFromScope(name) {
  const result = runClaude(`mcp remove "${name}" -s ${scope}`);
  if (result.ok) return "removed";
  const location = scope === "project" ? ".mcp.json" : `${scope} scope`;
  const missing = `No MCP server named "${name}" in ${location}`;
  return result.output.split(/\r?\n/).includes(missing) ? "absent" : "failed";
}

// Load available MCP configs
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

// ── --list mode ──
if (isListMode) {
  const configs = loadAvailableConfigs();
  console.log("\nAvailable MCP servers:");
  console.log("━".repeat(70));

  for (const cfg of configs) {
    const installed = getMcpState(cfg.name).installed;
    const status = installed ? "✅ installed" : "  not installed";
    const apiKey = cfg.requiresApiKey ? "🔑 API key required" : "🆓 free";
    console.log(
      `  ${status}  ${cfg.name.padEnd(22)} ${apiKey}  ${cfg.description}`
    );
  }

  console.log("\nInstall: node install-mcp.js <name1> <name2> ...");
  console.log("All:     node install-mcp.js --all");
  console.log("Remove:  node install-mcp.js --uninstall <name>\n");
  process.exit(0);
}

// ── --uninstall mode ──
if (isUninstall) {
  if (mcpNames.length === 0) {
    console.error("[Error] Please specify the MCP name(s) to uninstall.");
    console.error("  e.g.: node install-mcp.js --uninstall context7");
    process.exit(1);
  }

  let removed = 0;
  let failed = 0;
  for (const name of mcpNames) {
    const status = removeFromScope(name);
    if (status === "removed") {
      console.log(`  ✅ ${name} removed`);
      removed++;
    } else if (status === "absent") {
      console.log(`  ⏭️  ${name} is not installed in ${scope} scope.`);
    } else {
      console.error(`  ❌ ${name} removal failed in ${scope} scope`);
      failed++;
    }
  }

  if (removed > 0) {
    console.log(`\n${removed} MCP server(s) removed.`);
  }
  process.exit(failed ? 1 : 0);
}

// ── Install mode ──
const configs = loadAvailableConfigs();

// Determine install targets
let toInstall = [];
let failed = 0;
if (isAllMode) {
  // --all: auto-install only those that don't require an API key
  toInstall = configs.filter(
    (c) => !c.requiresApiKey && !AUTO_INSTALL_EXCLUDES.has(c.name)
  );
  console.log("\n🔧 Installing all free MCP servers (excluding fetch)");
} else if (mcpNames.length > 0) {
  // Specific MCP names provided
  for (const name of mcpNames) {
    const found = configs.find((c) => c.name === name);
    if (found) {
      toInstall.push(found);
    } else {
      console.error(
        `  ⚠️  '${name}' config not found. Use --list to check available servers.`
      );
      failed++;
    }
  }
} else {
  // No arguments: show usage
  console.log(
    "\nMCP Server Install Script (using claude mcp CLI)\n\n" +
      "Usage:\n" +
      "  node install-mcp.js --list                   List available MCP servers\n" +
      "  node install-mcp.js --all                    Install all free MCP servers\n" +
      "  node install-mcp.js context7 playwright      Install specific MCP servers\n" +
      "  node install-mcp.js --uninstall context7     Uninstall specific MCP server\n" +
      "  node install-mcp.js --all --force            Force reinstall (even if already installed)\n" +
      "  node install-mcp.js --scope local context7   Set scope (default: user)\n"
  );
  process.exit(0);
}

if (toInstall.length === 0) {
  console.log("No MCP servers to install.");
  process.exit(failed ? 1 : 0);
}

console.log(`\nScope: ${scope}\n`);

let installed = 0;
let skipped = 0;
let repaired = 0;

for (const cfg of toInstall) {
  // API key warning
  if (cfg.requiresApiKey) {
    const envVar = cfg.apiKeyEnvVar || "API_KEY";
    const envValue = process.env[envVar];
    if (!envValue) {
      console.log(`  ⚠️  ${cfg.name}: ${envVar} environment variable is not set.`);
      console.log(`       Please set the environment variable after installation.`);
    }
  }

  const resolvedRuntime = resolveCommandAndArgs(
    cfg.config.command,
    cfg.config.args
  );
  const desiredCommand = normalizeSpace(resolvedRuntime.command);
  const desiredArgs = normalizeSpace((resolvedRuntime.args || []).join(" "));
  const state = getMcpState(cfg.name);
  // get reports the effective entry, which can belong to a different scope.
  const inTarget = state.installed && state.scope === scope;
  const changed = (desiredCommand && state.command && state.command !== desiredCommand)
    || (desiredArgs && state.args && state.args !== desiredArgs);
  if (inTarget && !isForce && !changed) {
    console.log(`  ⏭️  ${cfg.name} (already configured, skipped)`);
    skipped++;
    continue;
  }
  if (!desiredCommand) {
    console.error(`  ❌ ${cfg.name} install failed (missing config.command)`);
    failed++;
    continue;
  }

  // Build claude mcp add command
  const { env } = cfg.config;
  const { command, args: cfgArgs } = resolvedRuntime;
  let cmdParts = [`mcp add --scope ${scope}`];

  // Environment variables (-e KEY=value)
  if (env) {
    for (const [key, value] of Object.entries(env)) {
      // Replace ${VAR} patterns with actual environment variable values
      const match = value.match(/^\$\{(\w+)\}$/);
      const resolvedValue = match ? process.env[match[1]] || value : value;
      cmdParts.push(`-e ${key}=${resolvedValue}`);
    }
  }

  // name + -- + command + args
  cmdParts.push(`"${cfg.name}" -- ${command}`);
  if (cfgArgs && cfgArgs.length > 0) {
    cmdParts.push(cfgArgs.join(" "));
  }

  const fullCmd = cmdParts.join(" ");
  if (!inTarget) {
    const added = runClaude(fullCmd);
    if (added.ok) {
      installed++;
      console.log(`  ✅ ${cfg.name} installed`);
      continue;
    }
    // A higher-priority entry may hide an existing registration in the selected scope.
    const config = scope === "project" ? ".mcp.json" : `${scope} config`;
    const duplicate = `MCP server ${cfg.name} already exists in ${config}`;
    if (!added.output.split(/\r?\n/).includes(duplicate)) {
      console.error(`  ❌ ${cfg.name} installation failed in ${scope} scope`);
      failed++;
      continue;
    }
    if (!isForce) {
      console.log(`  ⏭️  ${cfg.name} already exists in ${scope} scope, skipped`);
      skipped++;
      continue;
    }
  }

  if (removeFromScope(cfg.name) === "failed") {
    console.error(`  ❌ ${cfg.name} removal failed in ${scope} scope`);
    failed++;
    continue;
  }
  if (!runClaude(fullCmd).ok) {
    console.error(`  ❌ ${cfg.name} reinstallation failed in ${scope} scope`);
    failed++;
    continue;
  }
  installed++;
  repaired++;
  console.log(`  ✅ ${cfg.name} repaired in ${scope} scope`);
}

console.log(`\nDone: ${installed} installed/repaired (${repaired} repaired), ${skipped} skipped, ${failed} failed`);
process.exitCode = failed ? 1 : 0;

if (installed > 0) {
  console.log("Restart Claude Code to apply changes.\n");
}
