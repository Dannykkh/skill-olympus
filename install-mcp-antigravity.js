#!/usr/bin/env node
"use strict";

// Antigravity stores global MCP servers in ~/.gemini/config/mcp_config.json.
// This installer edits only the `mcpServers` map and tracks Olympus-owned
// entries so uninstall never removes a user-owned same-name server.

const fs = require("fs");
const os = require("os");
const path = require("path");

const argv = process.argv.slice(2);
const isList = argv.includes("--list");
const isAll = argv.includes("--all");
const isUninstall = argv.includes("--uninstall");
const orchestratorIndex = argv.indexOf("--orchestrator");
const orchestratorPath = orchestratorIndex >= 0 ? argv[orchestratorIndex + 1] : null;
const requestedNames = argv.filter((arg, index) => {
  if (arg.startsWith("--")) return false;
  if (orchestratorIndex >= 0 && index === orchestratorIndex + 1) return false;
  return true;
});

const repoRoot = __dirname;
const configsDir = path.join(repoRoot, "mcp-configs");
const googleHome = process.env.ANTIGRAVITY_HOME
  ? path.resolve(process.env.ANTIGRAVITY_HOME)
  : path.join(os.homedir(), ".gemini");
const configPath = path.join(googleHome, "config", "mcp_config.json");
const manifestPath = path.join(googleHome, "antigravity-cli", ".olympus-mcp-manifest.json");
const autoInstallExcludes = new Set(["fetch"]);

function readJson(filePath, fallback = {}) {
  try { return JSON.parse(fs.readFileSync(filePath, "utf8")); } catch { return fallback; }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function equal(left, right) {
  if (left === right) return true;
  if (!left || !right || typeof left !== "object" || typeof right !== "object") return false;
  if (Array.isArray(left) !== Array.isArray(right)) return false;
  if (Array.isArray(left)) {
    return left.length === right.length && left.every((value, index) => equal(value, right[index]));
  }
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return leftKeys.length === rightKeys.length && leftKeys.every((key, index) => key === rightKeys[index] && equal(left[key], right[key]));
}

function resolveEnv(value) {
  if (typeof value !== "string") return value;
  const match = value.match(/^\$\{([A-Za-z_][A-Za-z0-9_]*)\}$/);
  return match && process.env[match[1]] ? process.env[match[1]] : value;
}

function normalizeServer(raw) {
  const server = {};
  if (raw.command) server.command = raw.command;
  if (Array.isArray(raw.args)) server.args = raw.args.map(String);
  if (raw.env && typeof raw.env === "object") {
    server.env = Object.fromEntries(Object.entries(raw.env).map(([key, value]) => [key, resolveEnv(value)]));
  }
  const serverUrl = raw.serverUrl || raw.url;
  if (serverUrl) server.serverUrl = serverUrl;
  if (raw.headers && typeof raw.headers === "object") server.headers = raw.headers;
  return server;
}

function loadDefinitions() {
  if (!fs.existsSync(configsDir)) throw new Error(`MCP config directory not found: ${configsDir}`);
  return fs.readdirSync(configsDir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => readJson(path.join(configsDir, name), null))
    .filter((value) => value?.name && value?.config)
    .map((value) => ({ ...value, config: normalizeServer(value.config) }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function loadState() {
  const config = readJson(configPath, {});
  if (!config.mcpServers || typeof config.mcpServers !== "object" || Array.isArray(config.mcpServers)) {
    config.mcpServers = {};
  }
  const manifest = readJson(manifestPath, { managedServers: {} });
  if (!manifest.managedServers || typeof manifest.managedServers !== "object") manifest.managedServers = {};
  return { config, manifest };
}

function saveState(config, manifest) {
  writeJson(configPath, config);
  if (Object.keys(manifest.managedServers).length > 0) {
    manifest.updatedAt = new Date().toISOString();
    writeJson(manifestPath, manifest);
  } else {
    fs.rmSync(manifestPath, { force: true });
  }
}

function installOne(name, desired, state) {
  const existing = state.config.mcpServers[name];
  const previouslyManaged = state.manifest.managedServers[name];
  if (existing && !previouslyManaged) {
    console.log(`${name}: existing user configuration preserved`);
    return "preserved";
  }
  if (existing && previouslyManaged && !equal(existing, previouslyManaged)) {
    delete state.manifest.managedServers[name];
    console.log(`${name}: modified configuration preserved and Olympus ownership released`);
    return "preserved";
  }
  state.config.mcpServers[name] = desired;
  state.manifest.managedServers[name] = desired;
  console.log(`${name}: installed`);
  return "installed";
}

function uninstallOne(name, state) {
  const managed = state.manifest.managedServers[name];
  if (!managed) {
    console.log(`${name}: not managed by Olympus`);
    return "skipped";
  }
  if (equal(state.config.mcpServers[name], managed)) {
    delete state.config.mcpServers[name];
    console.log(`${name}: removed`);
  } else {
    console.log(`${name}: modified configuration preserved`);
  }
  delete state.manifest.managedServers[name];
  return "removed";
}

function printUsage() {
  console.log("Antigravity MCP installer");
  console.log("  node install-mcp-antigravity.js --list");
  console.log("  node install-mcp-antigravity.js --all");
  console.log("  node install-mcp-antigravity.js context7 playwright");
  console.log("  node install-mcp-antigravity.js --orchestrator <dist/index.js>");
  console.log("  node install-mcp-antigravity.js --uninstall [name ...]");
}

try {
  const definitions = loadDefinitions();
  const state = loadState();
  if (isList) {
    for (const definition of definitions) {
      const status = state.manifest.managedServers[definition.name]
        ? "managed"
        : state.config.mcpServers[definition.name]
          ? "existing"
          : "available";
      console.log(`${definition.name}\t${status}\t${definition.description || ""}`);
    }
    process.exit(0);
  }

  if (isUninstall) {
    const names = requestedNames.length > 0
      ? requestedNames
      : Object.keys(state.manifest.managedServers);
    for (const name of names) uninstallOne(name, state);
    saveState(state.config, state.manifest);
    process.exit(0);
  }

  const selected = [];
  if (isAll) {
    selected.push(...definitions.filter((definition) => !definition.requiresApiKey && !autoInstallExcludes.has(definition.name)));
  } else {
    for (const name of requestedNames) {
      const definition = definitions.find((candidate) => candidate.name === name);
      if (!definition) {
        console.error(`${name}: MCP definition not found`);
        process.exitCode = 1;
        continue;
      }
      selected.push(definition);
    }
  }
  for (const definition of selected) installOne(definition.name, definition.config, state);
  if (orchestratorPath) {
    const distPath = path.resolve(orchestratorPath).replace(/\\/g, "/");
    if (!fs.existsSync(path.resolve(orchestratorPath))) throw new Error(`orchestrator entry point not found: ${orchestratorPath}`);
    installOne("orchestrator", {
      command: "node",
      args: [distPath],
      env: { ORCHESTRATOR_WORKER_ID: "pm" },
    }, state);
  }
  if (selected.length === 0 && !orchestratorPath && requestedNames.length === 0) {
    printUsage();
    process.exit(0);
  }
  saveState(state.config, state.manifest);
  console.log(`Antigravity MCP configuration updated: ${configPath}`);
} catch (error) {
  console.error(`[antigravity-mcp] ${error.message || error}`);
  process.exit(1);
}
