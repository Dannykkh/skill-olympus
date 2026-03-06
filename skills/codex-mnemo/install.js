#!/usr/bin/env node
// Codex-Mnemo (long-term memory system) install/uninstall script
//
// Usage:
//   node skills/codex-mnemo/install.js              # install
//   node skills/codex-mnemo/install.js --uninstall  # uninstall
//
// Codex-Mnemo core components:
//   - Hook: save-turn (auto-save User+Assistant conversations via notify event)
//   - AGENTS.md rules: response tags, past conversation search

const fs = require("fs");
const path = require("path");
const os = require("os");

// ── Config ──
const args = process.argv.slice(2);
const isUninstall = args.includes("--uninstall");
const isWindows = process.platform === "win32";

// Source directory (location of this script)
const sourceDir = path.resolve(__dirname);

// Codex global directory
const codexDir = path.join(os.homedir(), ".codex");

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

// ── AGENTS.md rules merge ──
const MARKER_START = "<!-- CODEX-MNEMO:START -->";
const MARKER_END = "<!-- CODEX-MNEMO:END -->";

function installAgentsMdRules(agentsMdPath, templatePath) {
  let content = "";
  try {
    content = fs.readFileSync(agentsMdPath, "utf8");
  } catch {
    content = "";
  }

  const template = fs.readFileSync(templatePath, "utf8");

  // Remove existing Codex-Mnemo rules
  const regex = new RegExp(
    `\\n?${escapeRegex(MARKER_START)}[\\s\\S]*?${escapeRegex(MARKER_END)}\\n?`,
    "g"
  );
  content = content.replace(regex, "").trim();

  // Append new rules
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

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── TOML config.toml handling ──
// Manage notify settings via simple string manipulation without external libraries

function buildNotifyCommand(hooksDir) {
  const d = normalizePath(hooksDir);
  if (isWindows) {
    const pwsh = "C:/Program Files/PowerShell/7/pwsh.exe";
    const winPs = "C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe";
    const shell = fs.existsSync(pwsh) ? pwsh : winPs;
    return [shell, "-ExecutionPolicy", "Bypass", "-File", `${d}/save-turn.ps1`];
  } else {
    return ["bash", `${d}/save-turn.sh`];
  }
}

function stripLineEndings(content) {
  return content.replace(/\r\n/g, "\n");
}

function insertRootLine(content, line) {
  const lines = stripLineEndings(content).split("\n");
  const firstTable = lines.findIndex((l) => /^\s*\[/.test(l));
  const idx = firstTable >= 0 ? firstTable : lines.length;
  lines.splice(idx, 0, line);
  return lines.join("\n");
}

function removeLine(content, regex) {
  const lines = stripLineEndings(content).split("\n");
  return lines.filter((l) => !regex.test(l)).join("\n");
}

function removeNotifyAssignmentsEverywhere(content) {
  const lines = stripLineEndings(content).split("\n");
  const kept = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^\s*notify\s*=/.test(line)) {
      if (!/\[/.test(line)) {
        continue;
      }

      // notify = [ ... ] single line
      if (/\]/.test(line)) {
        continue;
      }

      // Remove notify = [ ... ] multi-line block
      while (i + 1 < lines.length) {
        i += 1;
        if (/\]/.test(lines[i])) {
          break;
        }
      }
      continue;
    }

    kept.push(line);
  }

  return kept.join("\n");
}

function upsertTuiNotifications(content) {
  const lines = stripLineEndings(content).split("\n");
  const tuiHeader = lines.findIndex((l) => /^\s*\[tui\]\s*$/.test(l));
  if (tuiHeader >= 0) {
    let end = lines.length;
    for (let i = tuiHeader + 1; i < lines.length; i++) {
      if (/^\s*\[/.test(lines[i])) {
        end = i;
        break;
      }
    }
    let found = false;
    for (let i = tuiHeader + 1; i < end; i++) {
      if (/^\s*notifications\s*=/.test(lines[i])) {
        lines[i] = "notifications = true";
        found = true;
        break;
      }
    }
    if (!found) {
      lines.splice(end, 0, "notifications = true");
    }
    return lines.join("\n");
  }

  let updated = removeLine(content, /^\s*tui\.notifications\s*=/);
  updated = insertRootLine(updated, "tui.notifications = true");
  return updated;
}

function stringifyNotify(args) {
  const escaped = args.map((x) => `'${x.replace(/'/g, "''")}'`);
  return `notify = [${escaped.join(", ")}]`;
}

function installTomlNotify(configPath, notifyArgs) {
  let content = "";
  try {
    content = fs.readFileSync(configPath, "utf8");
  } catch {
    content = "";
  }

  const newLine = stringifyNotify(notifyArgs);
  const hadNotify = /^\s*notify\s*=/m.test(content);
  console.log(hadNotify ? "      Replacing existing notify config with codex-mnemo format" : "      Adding notify config");

  content = removeNotifyAssignmentsEverywhere(content);
  content = insertRootLine(content, newLine);
  content = upsertTuiNotifications(content);

  if (content.length > 0 && !content.endsWith("\n")) {
    content += "\n";
  } else {
    content += "";
  }

  ensureDir(path.dirname(configPath));
  fs.writeFileSync(configPath, content, "utf8");
}

function removeTomlNotify(configPath) {
  try {
    let content = fs.readFileSync(configPath, "utf8");
    content = removeNotifyAssignmentsEverywhere(content);
    content = removeLine(content, /^\s*tui\.notifications\s*=/);

    fs.writeFileSync(configPath, content, "utf8");
    return true;
  } catch {
    return false;
  }
}

// ── Install ──
function install() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  CODEX-MNEMO: Codex CLI Long-Term Memory System Install       ║
║  Named after Mnemosyne, goddess of memory                     ║
╚═══════════════════════════════════════════════════════════════╝
`);

  const hooksDir = path.join(codexDir, "hooks");
  const configPath = path.join(codexDir, "config.toml");
  const agentsMdPath = path.join(codexDir, "AGENTS.md");

  // [1/3] Copy hook files
  console.log("[1/3] Installing hook files...");
  ensureDir(hooksDir);

  const hookFiles = isWindows
    ? ["save-turn.ps1", "append-user.ps1", "append-assistant.ps1"]
    : ["save-turn.sh", "append-user.sh", "append-assistant.sh"];

  for (const hookFile of hookFiles) {
    const src = path.join(sourceDir, "hooks", hookFile);
    const dest = path.join(hooksDir, hookFile);

    if (!fs.existsSync(src)) {
      console.error(`      Error: File not found: ${src}`);
      process.exit(1);
    }

    copyFile(src, dest);
    if (!isWindows) {
      fs.chmodSync(dest, 0o755);
    }
    console.log(`      - ${hookFile}`);
  }
  console.log("      Done!");

  // [2/3] config.toml notify settings
  console.log("\n[2/3] Configuring config.toml notify...");
  const notifyArgs = buildNotifyCommand(hooksDir);
  installTomlNotify(configPath, notifyArgs);
  console.log(`      ${stringifyNotify(notifyArgs)}`);
  console.log("      tui.notifications = true");
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
║  CODEX-MNEMO installation complete!                           ║
╠═══════════════════════════════════════════════════════════════╣
║  Installed components:                                        ║
║  - Hook: save-turn (auto-save conversations via notify)       ║
║  - AGENTS.md: response tags, past conversation search rules   ║
╠═══════════════════════════════════════════════════════════════╣
║  Usage:                                                       ║
║  - Conversations are automatically saved to conversations/    ║
║  - #tags at the end of responses are captured automatically   ║
║  - Ask "what did we do before?" for automatic search          ║
╠═══════════════════════════════════════════════════════════════╣
║  Restart Codex CLI to apply changes.                          ║
╚═══════════════════════════════════════════════════════════════╝
`);
}

// ── Uninstall ──
function uninstall() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  CODEX-MNEMO: Codex CLI Long-Term Memory System Uninstall     ║
╚═══════════════════════════════════════════════════════════════╝
`);

  const hooksDir = path.join(codexDir, "hooks");
  const configPath = path.join(codexDir, "config.toml");
  const agentsMdPath = path.join(codexDir, "AGENTS.md");

  // [1/3] Remove hook files
  console.log("[1/3] Removing hook files...");
  const hookFiles = [
    "save-turn.ps1",
    "append-user.ps1",
    "append-assistant.ps1",
    "sync-sessions.ps1",
    "save-turn.sh",
    "append-user.sh",
    "append-assistant.sh",
  ];
  for (const file of hookFiles) {
    if (removeFile(path.join(hooksDir, file))) {
      console.log(`      - ${file} removed`);
    }
  }
  console.log("      Done!");

  // [2/3] Remove config.toml notify settings
  console.log("\n[2/3] Removing config.toml notify settings...");
  if (removeTomlNotify(configPath)) {
    console.log("      Removed");
  }
  console.log("      Done!");

  // [3/3] Remove AGENTS.md rules
  console.log("\n[3/3] Removing AGENTS.md long-term memory rules...");
  if (uninstallAgentsMdRules(agentsMdPath)) {
    console.log("      Removed");
  }
  console.log("      Done!");

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  CODEX-MNEMO uninstall complete!                              ║
╠═══════════════════════════════════════════════════════════════╣
║  Note: Conversation history (conversations/) is preserved.    ║
║  Delete manually if you want to remove it entirely.           ║
╠═══════════════════════════════════════════════════════════════╣
║  Restart Codex CLI to apply changes.                          ║
╚═══════════════════════════════════════════════════════════════╝
`);
}

// ── Run ──
if (!fs.existsSync(codexDir)) {
  console.log(`Note: ${codexDir} directory not found, creating it.`);
  ensureDir(codexDir);
}

if (isUninstall) {
  uninstall();
} else {
  install();
}
