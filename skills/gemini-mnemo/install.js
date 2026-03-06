#!/usr/bin/env node
// Gemini-Mnemo (long-term memory system) install/uninstall script
//
// Usage:
//   node skills/gemini-mnemo/install.js              # install
//   node skills/gemini-mnemo/install.js --uninstall  # uninstall
//
// Gemini-Mnemo core components:
//   - Hook: save-turn (auto-saves User+Assistant conversations via AfterAgent event)
//   - AGENTS.md rules: response tags, past conversation search
//   - context.fileName: ensures AGENTS.md is loaded (Gemini CLI latest config)

const fs = require("fs");
const path = require("path");
const os = require("os");

// ── Config ──
const args = process.argv.slice(2);
const isUninstall = args.includes("--uninstall");
const isWindows = process.platform === "win32";

// Source directory (location of this script)
const sourceDir = path.resolve(__dirname);

// Gemini global directory
const geminiDir = path.join(os.homedir(), ".gemini");

// ── Utility functions ──
function normalizePath(p) {
  return p.replace(/\\/g, "/");
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function removeFile(filePath) {
  try {
    fs.unlinkSync(filePath);
    return true;
  } catch {
    return false;
  }
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return {};
  }
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

// ── AGENTS.md rules merge ──
const MARKER_START = "<!-- GEMINI-MNEMO:START -->";
const MARKER_END = "<!-- GEMINI-MNEMO:END -->";

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function installAgentsMdRules(agentsMdPath, templatePath) {
  let content = "";
  try {
    content = fs.readFileSync(agentsMdPath, "utf8");
  } catch {
    content = "";
  }

  const template = fs.readFileSync(templatePath, "utf8");

  // Remove existing Gemini-Mnemo rules
  const regex = new RegExp(
    `\\n?${escapeRegex(MARKER_START)}[\\s\\S]*?${escapeRegex(MARKER_END)}\\n?`,
    "g"
  );
  content = content.replace(regex, "").trim();

  // Add new rules
  const rulesBlock = `\n\n${MARKER_START}\n${template}\n${MARKER_END}`;
  content = content + rulesBlock + "\n";

  ensureDir(path.dirname(agentsMdPath));
  fs.writeFileSync(agentsMdPath, content, "utf8");
}

function uninstallAgentsMdRules(agentsMdPath) {
  try {
    let content = fs.readFileSync(agentsMdPath, "utf8");
    const regex = new RegExp(
      `\\n?${escapeRegex(MARKER_START)}[\\s\\S]*?${escapeRegex(MARKER_END)}\\n?`,
      "g"
    );
    content = content.replace(regex, "").trim();
    fs.writeFileSync(agentsMdPath, content + "\n", "utf8");
    return true;
  } catch {
    return false;
  }
}

// ── Hook config (settings.json) ──
// Gemini CLI uses the same settings.json hooks format as Claude Code

function buildHookCommand(hooksDir) {
  const d = normalizePath(hooksDir);
  if (isWindows) {
    return `powershell -ExecutionPolicy Bypass -File "${d}/save-turn.ps1"`;
  } else {
    return `bash "${d}/save-turn.sh"`;
  }
}

function mergeHooksConfig(settingsPath, hookCommand) {
  const settings = readJson(settingsPath);
  settings.hooks = settings.hooks || {};
  settings.hooks.AfterAgent = settings.hooks.AfterAgent || [];

  // Check if existing gemini-mnemo hook exists
  const exists = settings.hooks.AfterAgent.some(h =>
    Array.isArray(h.hooks) &&
    h.hooks.some(cmd => cmd && typeof cmd.command === "string" && cmd.command.includes("save-turn"))
  );

  if (!exists) {
    settings.hooks.AfterAgent.push({
      matcher: "",
      hooks: [{
        type: "command",
        command: hookCommand
      }]
    });
  }

  writeJson(settingsPath, settings);
}

function removeHooksConfig(settingsPath) {
  const settings = readJson(settingsPath);
  if (!settings.hooks) return;

  if (settings.hooks.AfterAgent) {
    const cleaned = [];

    for (const h of settings.hooks.AfterAgent) {
      if (!Array.isArray(h.hooks)) {
        cleaned.push(h);
        continue;
      }

      const hooks = h.hooks.filter(
        cmd => !(cmd && typeof cmd.command === "string" && cmd.command.includes("save-turn"))
      );

      if (hooks.length > 0) {
        cleaned.push({ ...h, hooks });
      }
    }

    settings.hooks.AfterAgent = cleaned;

    if (settings.hooks.AfterAgent.length === 0) {
      delete settings.hooks.AfterAgent;
    }
  }

  if (Object.keys(settings.hooks).length === 0) {
    delete settings.hooks;
  }

  writeJson(settingsPath, settings);
}

// ── Context filename config (settings.json > context.fileName) ──
// Gemini CLI default context file is GEMINI.md, but
// to use AGENTS.md you must specify it in context.fileName.

function normalizeContextFileNames(currentValue) {
  if (typeof currentValue === "string") {
    return [currentValue];
  }
  if (Array.isArray(currentValue)) {
    return currentValue.filter(v => typeof v === "string" && v.trim().length > 0);
  }
  return [];
}

function mergeContextFileName(settingsPath) {
  const settings = readJson(settingsPath);
  settings.context = settings.context || {};

  const current = normalizeContextFileNames(settings.context.fileName);
  const isEmpty = current.length === 0;
  const merged = [...current];

  // On first setup, keep default GEMINI.md while adding AGENTS.md
  if (isEmpty) {
    merged.push("AGENTS.md", "GEMINI.md");
  } else if (!merged.includes("AGENTS.md")) {
    merged.push("AGENTS.md");
  }

  settings.context.fileName = merged;
  writeJson(settingsPath, settings);
  return merged;
}

function removeContextFileName(settingsPath) {
  const settings = readJson(settingsPath);
  if (!settings.context || settings.context.fileName === undefined) return;

  const current = settings.context.fileName;

  if (typeof current === "string") {
    if (current === "AGENTS.md") {
      delete settings.context.fileName;
    }
  } else if (Array.isArray(current)) {
    const next = current.filter(v => v !== "AGENTS.md");
    if (next.length === 0) {
      delete settings.context.fileName;
    } else if (next.length === 1) {
      settings.context.fileName = next[0];
    } else {
      settings.context.fileName = next;
    }
  }

  if (Object.keys(settings.context).length === 0) {
    delete settings.context;
  }

  writeJson(settingsPath, settings);
}

// ── Install ──
function install() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  GEMINI-MNEMO: Gemini CLI Long-Term Memory System Install     ║
║  Named after Mnemosyne, goddess of memory                     ║
╚═══════════════════════════════════════════════════════════════╝
`);

  const hooksDir = path.join(geminiDir, "hooks");
  const settingsPath = path.join(geminiDir, "settings.json");
  const agentsMdPath = path.join(geminiDir, "AGENTS.md");

  // [1/3] Copy hook files
  console.log("[1/3] Installing hook files...");
  ensureDir(hooksDir);

  const hookFile = isWindows ? "save-turn.ps1" : "save-turn.sh";
  const src = path.join(sourceDir, "hooks", hookFile);
  const dest = path.join(hooksDir, hookFile);

  if (fs.existsSync(src)) {
    copyFile(src, dest);
    if (!isWindows) {
      fs.chmodSync(dest, 0o755);
    }
    console.log(`      - ${hookFile}`);
  } else {
    console.error(`      Error: file not found: ${src}`);
    process.exit(1);
  }
  console.log("      Done!");

  // [2/3] settings.json AfterAgent hook + context.fileName config
  console.log("\n[2/3] Configuring settings.json AfterAgent hook...");
  const hookCommand = buildHookCommand(hooksDir);
  mergeHooksConfig(settingsPath, hookCommand);
  const contextFiles = mergeContextFileName(settingsPath);
  console.log(`      AfterAgent → ${hookFile}`);
  console.log(`      context.fileName → ${JSON.stringify(contextFiles)}`);
  console.log("      Done!");

  // [3/3] Install AGENTS.md rules
  console.log("\n[3/3] Installing AGENTS.md long-term memory rules...");
  const templatePath = path.join(sourceDir, "templates", "agents-md-rules.md");
  if (fs.existsSync(templatePath)) {
    installAgentsMdRules(agentsMdPath, templatePath);
    console.log("      Done!");
  } else {
    console.log("      Template not found, skipping");
  }

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  GEMINI-MNEMO install complete!                               ║
╠═══════════════════════════════════════════════════════════════╣
║  Installed components:                                        ║
║  - Hook: save-turn (auto-saves conversations via AfterAgent)  ║
║  - AGENTS.md: response tags, past conversation search rules   ║
╠═══════════════════════════════════════════════════════════════╣
║  Usage:                                                       ║
║  - Conversations are auto-saved to conversations/             ║
║  - #tags at the end of responses are captured automatically   ║
║  - Ask "what did we do before?" for automatic search          ║
╠═══════════════════════════════════════════════════════════════╣
║  Restart Gemini CLI to apply changes.                         ║
╚═══════════════════════════════════════════════════════════════╝
`);
}

// ── Uninstall ──
function uninstall() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  GEMINI-MNEMO: Gemini CLI Long-Term Memory System Uninstall   ║
╚═══════════════════════════════════════════════════════════════╝
`);

  const hooksDir = path.join(geminiDir, "hooks");
  const settingsPath = path.join(geminiDir, "settings.json");
  const agentsMdPath = path.join(geminiDir, "AGENTS.md");

  // [1/3] Remove hook files
  console.log("[1/3] Removing hook files...");
  const hookFiles = ["save-turn.ps1", "save-turn.sh"];
  for (const file of hookFiles) {
    if (removeFile(path.join(hooksDir, file))) {
      console.log(`      - ${file} removed`);
    }
  }
  console.log("      Done!");

  // [2/3] Remove settings.json hook/context config
  console.log("\n[2/3] Removing settings.json AfterAgent hook config...");
  removeHooksConfig(settingsPath);
  removeContextFileName(settingsPath);
  console.log("      Removed AGENTS.md from context.fileName");
  console.log("      Done!");

  // [3/3] Remove AGENTS.md rules
  console.log("\n[3/3] Removing AGENTS.md long-term memory rules...");
  if (uninstallAgentsMdRules(agentsMdPath)) {
    console.log("      Removed");
  }
  console.log("      Done!");

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  GEMINI-MNEMO uninstall complete!                             ║
╠═══════════════════════════════════════════════════════════════╣
║  Note: conversation history (conversations/) is preserved.    ║
║  To fully delete, remove it manually.                         ║
╠═══════════════════════════════════════════════════════════════╣
║  Restart Gemini CLI to apply changes.                         ║
╚═══════════════════════════════════════════════════════════════╝
`);
}

// ── Run ──
if (!fs.existsSync(geminiDir)) {
  console.log(`Note: ${geminiDir} directory not found, creating it.`);
  ensureDir(geminiDir);
}

if (isUninstall) {
  uninstall();
} else {
  install();
}
