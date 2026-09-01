#!/usr/bin/env node
"use strict";

// Usage:
//   node install-hooks-config.js <hooks-dir> <config-path> --windows|--bash [options]
//   node install-hooks-config.js <hooks-dir> <config-path> --uninstall [options]
//
// Claude writes a settings.json `hooks` object. Antigravity writes a named
// hook group directly to ~/.gemini/config/hooks.json.

const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
if (args.length < 3) {
  console.error("Usage: node install-hooks-config.js <hooks-dir> <config-path> [--windows|--bash|--uninstall] [--components ...] [--llms ...] [--target claude|antigravity]");
  process.exit(1);
}

const hooksDir = args[0].replace(/\\/g, "/");
const configPath = args[1];
const mode = args[2];
let components = null;
let llms = null;
let target = "claude";
for (let index = 3; index < args.length; index += 1) {
  if (args[index] === "--components" && args[index + 1]) {
    components = args[++index].split(",").map((value) => value.trim().toLowerCase());
  } else if (args[index] === "--llms" && args[index + 1]) {
    llms = args[++index].split(",").map((value) => value.trim().toLowerCase());
  } else if (args[index] === "--target" && args[index + 1]) {
    target = args[++index].trim().toLowerCase();
  }
}

if (target === "gemini") {
  console.error("Gemini CLI hook installation is retired. Use --target antigravity.");
  process.exit(1);
}
if (!new Set(["claude", "antigravity"]).has(target)) {
  console.error(`Unsupported hook target: ${target}`);
  process.exit(1);
}

const timeoutSeconds = 60;
const mandatoryHooks = new Set([
  "save-conversation",
  "save-tool-use",
  "save-response",
  "save-turn",
  "orchestrator-detector",
  "reconcile-conversations",
]);
const hookBundles = {
  "save-conversation": ["mnemo"],
  "orchestrator-detector": ["orchestrator"],
  "check-new-file": ["all-only"],
  "protect-files": ["all-only"],
  "validate-api": ["all-only"],
  "save-response": ["mnemo"],
  "save-tool-use": ["mnemo"],
  "save-turn": ["mnemo"],
  "reconcile-conversations": ["mnemo"],
  "loop-stop": ["all-only"],
};

function hasComponent(name) {
  return !components || components.includes(name);
}

function shouldInclude(name) {
  if (mandatoryHooks.has(name)) return true;
  if (!components) return true;
  const bundles = hookBundles[name] || [];
  if (bundles.includes("all-only")) return components.includes("all") || components.length >= 5;
  return bundles.some((bundle) => components.includes(bundle));
}

function readJson(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, "utf8")); } catch { return {}; }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function hookEntry(matcher, command) {
  return { matcher, hooks: [{ type: "command", command, timeout: timeoutSeconds }] };
}

function buildClaudeHooks(isWindows) {
  const extension = isWindows ? "ps1" : "sh";
  const command = isWindows
    ? (script) => `powershell -NoProfile -ExecutionPolicy Bypass -File "${hooksDir}/${script}"`
    : (script) => `bash "${hooksDir}/${script}"`;
  const nodeCommand = (script) => `node "${hooksDir}/${script}"`;
  const hooks = {};

  const sessionStart = [];
  if (shouldInclude("reconcile-conversations")) sessionStart.push(hookEntry("", command(`reconcile-conversations.${extension}`)));
  if (sessionStart.length > 0) hooks.SessionStart = sessionStart;

  const userPrompt = [];
  if (shouldInclude("save-conversation")) userPrompt.push(hookEntry(".*", command(`save-conversation.${extension}`)));
  if (shouldInclude("orchestrator-detector")) userPrompt.push(hookEntry(".*", nodeCommand("orchestrator-detector.js")));
  if (userPrompt.length > 0) hooks.UserPromptSubmit = userPrompt;

  const preTool = [];
  if (shouldInclude("check-new-file")) preTool.push(hookEntry("Write", command(`check-new-file.${extension}`)));
  if (shouldInclude("protect-files")) preTool.push(hookEntry("Edit|Write", command(`protect-files.${extension}`)));
  if (preTool.length > 0) hooks.PreToolUse = preTool;

  const postTool = [];
  if (shouldInclude("save-tool-use")) postTool.push(hookEntry(".*", command(`save-tool-use.${extension}`)));
  if (shouldInclude("validate-api")) postTool.push(hookEntry("Edit|Write", command(`validate-api.${extension}`)));
  if (postTool.length > 0) hooks.PostToolUse = postTool;

  const stop = [];
  if (shouldInclude("save-response")) stop.push(hookEntry("", command(`save-response.${extension}`)));
  if (shouldInclude("loop-stop")) stop.push(hookEntry("", command(`loop-stop.${extension}`)));
  if (stop.length > 0) hooks.Stop = stop;
  return hooks;
}

function mergeClaudeHooks(settings, hooks) {
  settings.hooks = settings.hooks || {};
  const obsoleteBases = new Set(["ddingdong-noti", "validate-code", "validate-docs", "format-code"]);
  const scriptBase = (command) => {
    const filename = String(command || "").split("/").pop().replace(/"/g, "");
    return filename.replace(/\.(?:ps1|sh|js)$/, "");
  };
  for (const event of Object.keys(settings.hooks)) {
    settings.hooks[event] = (settings.hooks[event] || []).filter((entry) => {
      return !obsoleteBases.has(scriptBase(entry.hooks?.[0]?.command));
    });
  }
  for (const [event, entries] of Object.entries(hooks)) {
    settings.hooks[event] = settings.hooks[event] || [];
    for (const entry of entries) {
      const base = scriptBase(entry.hooks[0].command);
      settings.hooks[event] = settings.hooks[event].filter(
        (current) => scriptBase(current.hooks?.[0]?.command) !== base,
      );
      settings.hooks[event].push(entry);
    }
  }
}

function configureClaude() {
  const settings = readJson(configPath);
  if (mode === "--uninstall") {
    delete settings.hooks;
    writeJson(configPath, settings);
    console.log("Removed Claude hooks config from settings.json");
    return;
  }

  const hooks = buildClaudeHooks(mode === "--windows");
  mergeClaudeHooks(settings, hooks);
  settings.env = settings.env || {};
  if (hasComponent("agent-team") && !("CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS" in settings.env)) {
    settings.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = "1";
  }
  if (hasComponent("agent-team") && !settings.teammateMode) {
    settings.teammateMode = mode === "--windows" ? "in-process" : "tmux";
  }
  if (settings.skipDangerousModePermissionPrompt) {
    settings.permissions = settings.permissions || {};
    settings.permissions.allow = settings.permissions.allow || [];
    for (const permission of ["Write", "Edit"]) {
      if (!settings.permissions.allow.includes(permission)) settings.permissions.allow.push(permission);
    }
  }
  writeJson(configPath, settings);
  const count = Object.values(hooks).reduce((total, entries) => total + entries.length, 0);
  console.log(`settings.json configured (Claude, ${mode === "--windows" ? "PowerShell" : "Bash"}, ${count} hooks)`);
}

function configureAntigravity() {
  const config = readJson(configPath);
  const groupId = "olympus-core";
  if (mode === "--uninstall") {
    delete config[groupId];
    if (Object.keys(config).length > 0) writeJson(configPath, config);
    else fs.rmSync(configPath, { force: true });
    console.log("Removed Olympus Antigravity core hooks");
    return;
  }

  const group = {};
  const adapter = `${hooksDir}/antigravity-hook.js`;
  if (shouldInclude("check-new-file") || shouldInclude("protect-files")) {
    group.PreToolUse = [{
      matcher: "write_to_file|replace_file_content|multi_replace_file_content",
      hooks: [{ type: "command", command: `node "${adapter}" safety`, timeout: timeoutSeconds }],
    }];
  }
  if (shouldInclude("loop-stop")) {
    group.Stop = [{ type: "command", command: `node "${adapter}" chronos`, timeout: timeoutSeconds }];
  }
  if (Object.keys(group).length > 0) config[groupId] = group;
  else delete config[groupId];
  writeJson(configPath, config);
  const count = Object.values(group).reduce((total, entries) => total + entries.length, 0);
  console.log(`hooks.json configured (Antigravity, ${count} hooks)`);
}

if (target === "antigravity") configureAntigravity();
else configureClaude();

void llms;
