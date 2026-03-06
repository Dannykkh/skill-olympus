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

// --scope option parsing (default: user)
const scopeIdx = args.indexOf("--scope");
const scope = scopeIdx !== -1 && args[scopeIdx + 1] ? args[scopeIdx + 1] : "user";

// Extract non-option arguments (MCP names)
const mcpNames = args.filter(
  (a, i) =>
    !a.startsWith("--") && (scopeIdx === -1 || i !== scopeIdx + 1)
);

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
    return execSync(`claude ${cmdArgs}`, {
      encoding: "utf-8",
      timeout: 30000,
      stdio: ["pipe", "pipe", "pipe"],
      env,
    }).trim();
  } catch (e) {
    return null;
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
  const output = runClaude(`mcp get "${name}"`);
  if (output === null) {
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
  for (const name of mcpNames) {
    const state = getMcpState(name);
    if (!state.installed) {
      console.log(`  ⚠️  ${name} is not installed.`);
      continue;
    }
    const result = runClaude(`mcp remove "${name}" -s ${scope}`);
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

// ── Install mode ──
const configs = loadAvailableConfigs();

// Determine install targets
let toInstall = [];
if (isAllMode) {
  // --all: auto-install only those that don't require an API key
  toInstall = configs.filter((c) => !c.requiresApiKey);
  console.log("\n🔧 Installing all free MCP servers");
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
  process.exit(0);
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
  let needsInstall = !state.installed;
  let repairedThisServer = false;

  if (state.installed) {
    // Check if command/args match (verify config is correct)
    const configMismatch = [];
    if (desiredCommand && state.command && state.command !== desiredCommand) {
      configMismatch.push(`command mismatch(${state.command} -> ${desiredCommand})`);
    }
    if (desiredArgs && state.args && state.args !== desiredArgs) {
      configMismatch.push(`args mismatch(${state.args} -> ${desiredArgs})`);
    }

    if (configMismatch.length === 0 && !isForce) {
      // Config is correct, skip (unless --force for forced reinstall)
      console.log(`  ⏭️  ${cfg.name} (already configured, skipped)`);
      skipped++;
      continue;
    }

    // Config mismatch or --force: remove then reinstall
    const removeScope = state.scope || scope;
    const reason = configMismatch.length > 0
      ? `config update: ${configMismatch.join(", ")}`
      : "force reinstall";
    console.log(`  🔧 ${cfg.name} ${reason}`);
    // 1st attempt: remove with detected scope
    let removed = runClaude(`mcp remove "${cfg.name}" -s ${removeScope}`) !== null;
    // 2nd attempt: no scope specified (auto-detect)
    if (!removed) {
      removed = runClaude(`mcp remove "${cfg.name}"`) !== null;
    }
    // 3rd attempt: try all scopes
    if (!removed) {
      for (const fallbackScope of ["user", "local", "project"]) {
        if (fallbackScope === removeScope) continue;
        if (runClaude(`mcp remove "${cfg.name}" -s ${fallbackScope}`) !== null) {
          removed = true;
          break;
        }
      }
    }
    if (!removed) {
      console.log(`  ⚠️  ${cfg.name} failed to remove existing config, attempting overwrite`);
    }
    repairedThisServer = true;
    needsInstall = true;
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
  const result = runClaude(fullCmd);

  if (result !== null) {
    if (repairedThisServer) {
      repaired++;
      console.log(`  ✅ ${cfg.name} repaired`);
    } else if (needsInstall) {
      console.log(`  ✅ ${cfg.name} installed`);
    } else {
      console.log(`  ✅ ${cfg.name} applied`);
    }
    installed++;
  } else {
    console.log(`  ❌ ${cfg.name} installation failed`);
  }
}

console.log(`\nDone: ${installed} installed/repaired (${repaired} repaired), ${skipped} skipped`);

if (installed > 0) {
  console.log("Restart Claude Code to apply changes.\n");
}
