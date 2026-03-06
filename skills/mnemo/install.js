#!/usr/bin/env node
// Mnemo (Long-Term Memory System) Install/Uninstall Script
//
// Usage:
//   node skills/mnemo/install.js              # Install
//   node skills/mnemo/install.js --check      # Health check (verify install status)
//   node skills/mnemo/install.js --uninstall  # Uninstall
//
// Mnemo Core Components:
//   - Hooks: save-conversation, save-response (auto-save conversations)
//   - CLAUDE.md Rules: response tags, past conversation search, MEMORY.md auto-update

const fs = require("fs");
const path = require("path");
const os = require("os");

// ── Config ──
const args = process.argv.slice(2);
const isUninstall = args.includes("--uninstall");
const isCheck = args.includes("--check");
const isWindows = process.platform === "win32";

// Source directory (location of this script)
const sourceDir = path.resolve(__dirname);

// Claude global directory
const claudeDir = path.join(os.homedir(), ".claude");

// ── Utility Functions ──
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

// ── CLAUDE.md Rules Merge ──
const MARKER_START = "<!-- MNEMO:START -->";
const MARKER_END = "<!-- MNEMO:END -->";

function installClaudeMdRules(claudeMdPath, templatePath) {
  let content = "";
  try {
    content = fs.readFileSync(claudeMdPath, "utf8");
  } catch {
    content = "";
  }

  const template = fs.readFileSync(templatePath, "utf8");

  // Remove existing Mnemo rules
  const regex = new RegExp(`\\n?${MARKER_START}[\\s\\S]*?${MARKER_END}\\n?`, "g");
  content = content.replace(regex, "").trim();

  // Append new rules
  const rulesBlock = `\n\n${MARKER_START}\n${template}\n${MARKER_END}`;
  content = content + rulesBlock + "\n";

  ensureDir(path.dirname(claudeMdPath));
  fs.writeFileSync(claudeMdPath, content, "utf8");
}

function uninstallClaudeMdRules(claudeMdPath) {
  try {
    let content = fs.readFileSync(claudeMdPath, "utf8");
    const regex = new RegExp(`\\n?${MARKER_START}[\\s\\S]*?${MARKER_END}\\n?`, "g");
    content = content.replace(regex, "").trim();
    fs.writeFileSync(claudeMdPath, content + "\n", "utf8");
    return true;
  } catch {
    return false;
  }
}

// ── Hooks Config ──
function buildHooksConfig(hooksDir) {
  const d = normalizePath(hooksDir);

  if (isWindows) {
    const cmd = (script) =>
      `powershell -ExecutionPolicy Bypass -File "${d}/${script}"`;
    return {
      UserPromptSubmit: [
        { matcher: ".*", hooks: [{ type: "command", command: cmd("save-conversation.ps1") }] }
      ],
      Stop: [
        { matcher: "", hooks: [{ type: "command", command: cmd("save-response.ps1") }] }
      ]
    };
  } else {
    const cmd = (script) => `bash "${d}/${script}"`;
    return {
      UserPromptSubmit: [
        { matcher: ".*", hooks: [{ type: "command", command: cmd("save-conversation.sh") }] }
      ],
      Stop: [
        { matcher: "", hooks: [{ type: "command", command: cmd("save-response.sh") }] }
      ]
    };
  }
}

function mergeHooksConfig(settingsPath, hooksConfig) {
  const settings = readJson(settingsPath);
  settings.hooks = settings.hooks || {};

  // Add Mnemo hooks (preserve existing hooks)
  for (const [event, hooks] of Object.entries(hooksConfig)) {
    settings.hooks[event] = settings.hooks[event] || [];

    // Check for duplicates before adding (verify each hook individually)
    for (const hook of hooks) {
      // Extract unique identifier from the hook command to add
      const newCmd = hook.hooks?.[0]?.command || hook.command || "";
      const hookId = newCmd.includes("save-conversation") ? "save-conversation"
                   : newCmd.includes("save-response") ? "save-response"
                   : newCmd;

      // Check if a hook with the same identifier already exists
      const exists = settings.hooks[event].some(h => {
        const existingCmd = h.hooks?.[0]?.command || h.command || "";
        return existingCmd.includes(hookId);
      });
      if (!exists) {
        settings.hooks[event].push(hook);
      }
    }
  }

  writeJson(settingsPath, settings);
}

function removeHooksConfig(settingsPath) {
  const settings = readJson(settingsPath);
  if (!settings.hooks) return;

  for (const event of Object.keys(settings.hooks)) {
    settings.hooks[event] = settings.hooks[event].filter(h => {
      if (!h.hooks || !h.hooks[0] || !h.hooks[0].command) return true;
      const cmd = h.hooks[0].command;
      return !cmd.includes("save-conversation") && !cmd.includes("save-response");
    });

    if (settings.hooks[event].length === 0) {
      delete settings.hooks[event];
    }
  }

  if (Object.keys(settings.hooks).length === 0) {
    delete settings.hooks;
  }

  writeJson(settingsPath, settings);
}

// ── Install ──
function install() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  MNEMO: Long-Term Memory System Install                       ║
║  Named after Mnemosyne, goddess of memory                     ║
╚═══════════════════════════════════════════════════════════════╝
`);

  const hooksDir = path.join(claudeDir, "hooks");
  const settingsPath = path.join(claudeDir, "settings.json");
  const claudeMdPath = path.join(claudeDir, "CLAUDE.md");

  // [1/3] Copy hook files
  console.log("[1/3] Installing hook files...");
  ensureDir(hooksDir);

  const hookFiles = isWindows
    ? ["save-conversation.ps1", "save-response.ps1"]
    : ["save-conversation.sh", "save-response.sh"];

  for (const file of hookFiles) {
    // Search for hook file source: skills/mnemo/hooks/ → root hooks/ fallback
    const srcLocal = path.join(sourceDir, "hooks", file);
    const srcRoot = path.join(sourceDir, "..", "..", "hooks", file);
    const src = fs.existsSync(srcLocal) ? srcLocal : fs.existsSync(srcRoot) ? srcRoot : null;
    const dest = path.join(hooksDir, file);
    if (src) {
      copyFile(src, dest);
      if (!isWindows) {
        fs.chmodSync(dest, 0o755);
      }
      console.log(`      - ${file}`);
    } else {
      console.log(`      ⚠ ${file} source not found (checked skills/mnemo/hooks/ and root hooks/)`);
    }
  }
  console.log("      Done!");

  // [2/3] Configure settings.json hooks
  console.log("\n[2/3] Configuring settings.json hooks...");
  const hooksConfig = buildHooksConfig(hooksDir);
  mergeHooksConfig(settingsPath, hooksConfig);
  console.log("      Done!");

  // [3/3] Install CLAUDE.md rules
  console.log("\n[3/3] Installing CLAUDE.md long-term memory rules...");
  const templatePath = path.join(sourceDir, "templates", "claude-md-rules.md");
  if (fs.existsSync(templatePath)) {
    installClaudeMdRules(claudeMdPath, templatePath);
    console.log("      Done!");
  } else {
    console.log("      Template not found, skipping");
  }

  // [Verify] Check install results
  console.log("\n[Verify] Checking install status...");
  let allOk = true;

  // Verify hook files exist
  for (const file of hookFiles) {
    const dest = path.join(hooksDir, file);
    if (fs.existsSync(dest)) {
      console.log(`      ✅ ${file}`);
    } else {
      console.log(`      ❌ ${file} - file missing!`);
      allOk = false;
    }
  }

  // Check settings.json Stop hook
  const settingsCheck = readJson(settingsPath);
  const hasStopHook = settingsCheck.hooks?.Stop?.some(h =>
    h.hooks?.[0]?.command?.includes("save-response") ||
    h.command?.includes?.("save-response")
  );
  const hasSubmitHook = settingsCheck.hooks?.UserPromptSubmit?.some(h =>
    h.hooks?.[0]?.command?.includes("save-conversation") ||
    h.command?.includes?.("save-conversation")
  );

  if (hasStopHook) {
    console.log("      ✅ settings.json Stop hook (save-response)");
  } else {
    console.log("      ❌ settings.json Stop hook (save-response) not registered!");
    allOk = false;
  }
  if (hasSubmitHook) {
    console.log("      ✅ settings.json UserPromptSubmit hook (save-conversation)");
  } else {
    console.log("      ❌ settings.json UserPromptSubmit hook (save-conversation) not registered!");
    allOk = false;
  }

  // Check CLAUDE.md rules
  try {
    const claudeMdContent = fs.readFileSync(claudeMdPath, "utf8");
    if (claudeMdContent.includes(MARKER_START)) {
      console.log("      ✅ CLAUDE.md long-term memory rules");
    } else {
      console.log("      ❌ CLAUDE.md long-term memory rules not inserted!");
      allOk = false;
    }
  } catch {
    console.log("      ❌ CLAUDE.md file missing!");
    allOk = false;
  }

  if (!allOk) {
    console.log("\n      ⚠️  Some items were not installed correctly.");
    console.log("      Using install.bat or install.sh may provide a more reliable install.");
  }

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  MNEMO Install Complete!                                      ║
╠═══════════════════════════════════════════════════════════════╣
║  Installed Components:                                        ║
║  - Hooks: save-conversation, save-response (auto-save chats) ║
║  - CLAUDE.md: response tags, past search, MEMORY.md update   ║
╠═══════════════════════════════════════════════════════════════╣
║  Usage:                                                       ║
║  - Conversations are auto-saved to conversations/             ║
║  - Claude auto-appends #tags at the end of responses          ║
║  - Ask "didn't we do ~ before?" for automatic search          ║
║  - Important decisions are auto-recorded in MEMORY.md         ║
╠═══════════════════════════════════════════════════════════════╣
║  Restart Claude Code to apply changes.                        ║
╚═══════════════════════════════════════════════════════════════╝
`);
}

// ── Health Check ──
function check() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  MNEMO: Health Check                                          ║
╚═══════════════════════════════════════════════════════════════╝
`);

  const hooksDir = path.join(claudeDir, "hooks");
  const settingsPath = path.join(claudeDir, "settings.json");
  const claudeMdPath = path.join(claudeDir, "CLAUDE.md");
  let issues = 0;

  // 1. Hook files exist
  console.log("[1/3] Checking hook files...");
  const hookFiles = isWindows
    ? ["save-conversation.ps1", "save-response.ps1"]
    : ["save-conversation.sh", "save-response.sh"];

  for (const file of hookFiles) {
    const dest = path.join(hooksDir, file);
    if (fs.existsSync(dest)) {
      const stat = fs.statSync(dest);
      console.log(`      ✅ ${file} (${stat.size} bytes)`);
    } else {
      console.log(`      ❌ ${file} - file missing!`);
      console.log(`         → Fix: node skills/mnemo/install.js  (reinstall)`);
      issues++;
    }
  }

  // 2. settings.json hook registration
  console.log("\n[2/3] Checking settings.json hook registration...");
  const settings = readJson(settingsPath);

  // Stop hook (save-response)
  const stopHooks = settings.hooks?.Stop || [];
  const hasStop = stopHooks.some(h => {
    const cmd = h.hooks?.[0]?.command || h.command || "";
    return cmd.includes("save-response");
  });
  if (hasStop) {
    const cmd = stopHooks.find(h => (h.hooks?.[0]?.command || h.command || "").includes("save-response"));
    const cmdStr = cmd?.hooks?.[0]?.command || cmd?.command || "";
    console.log(`      ✅ Stop → save-response`);
    console.log(`         ${cmdStr}`);
    // Verify the referenced file actually exists at the path
    const match = cmdStr.match(/-File\s+"([^"]+)"|bash\s+"([^"]+)"/);
    if (match) {
      const filePath = match[1] || match[2];
      const normalizedPath = filePath.replace(/\//g, path.sep);
      if (fs.existsSync(normalizedPath)) {
        console.log(`         ✅ File exists`);
      } else {
        console.log(`         ❌ File missing: ${normalizedPath}`);
        console.log(`         → Path is registered in settings.json but the actual file is missing!`);
        issues++;
      }
    }
  } else {
    console.log(`      ❌ Stop hook not registered (save-response missing)`);
    issues++;
  }

  // UserPromptSubmit hook (save-conversation)
  const upsHooks = settings.hooks?.UserPromptSubmit || [];
  const hasUps = upsHooks.some(h => {
    const cmd = h.hooks?.[0]?.command || h.command || "";
    return cmd.includes("save-conversation");
  });
  if (hasUps) {
    console.log(`      ✅ UserPromptSubmit → save-conversation`);
  } else {
    console.log(`      ❌ UserPromptSubmit hook not registered (save-conversation missing)`);
    issues++;
  }

  // 3. CLAUDE.md rules
  console.log("\n[3/3] Checking CLAUDE.md long-term memory rules...");
  try {
    const claudeMdContent = fs.readFileSync(claudeMdPath, "utf8");
    if (claudeMdContent.includes(MARKER_START) && claudeMdContent.includes(MARKER_END)) {
      console.log("      ✅ Mnemo rules block present");
    } else {
      console.log("      ❌ Mnemo rules block missing");
      issues++;
    }
  } catch {
    console.log("      ❌ CLAUDE.md file missing");
    issues++;
  }

  // Results
  console.log("");
  if (issues === 0) {
    console.log("  ✅ All checks passed! Mnemo is correctly installed.");
  } else {
    console.log(`  ❌ ${issues} issue(s) found. Reinstall recommended:`);
    console.log("     node skills/mnemo/install.js");
    console.log("     or: install.bat / install.sh");
  }
  console.log("");

  process.exit(issues > 0 ? 1 : 0);
}

// ── Uninstall ──
function uninstall() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  MNEMO: Long-Term Memory System Uninstall                     ║
╚═══════════════════════════════════════════════════════════════╝
`);

  const hooksDir = path.join(claudeDir, "hooks");
  const settingsPath = path.join(claudeDir, "settings.json");
  const claudeMdPath = path.join(claudeDir, "CLAUDE.md");

  // [1/3] Remove hook files
  console.log("[1/3] Removing hook files...");
  const hookFiles = [
    "save-conversation.ps1", "save-conversation.sh",
    "save-response.ps1", "save-response.sh"
  ];
  for (const file of hookFiles) {
    if (removeFile(path.join(hooksDir, file))) {
      console.log(`      - ${file} removed`);
    }
  }
  console.log("      Done!");

  // [2/3] Remove settings.json hook config
  console.log("\n[2/3] Removing settings.json hook config...");
  removeHooksConfig(settingsPath);
  console.log("      Done!");

  // [3/3] Remove CLAUDE.md rules
  console.log("\n[3/3] Removing CLAUDE.md long-term memory rules...");
  if (uninstallClaudeMdRules(claudeMdPath)) {
    console.log("      Removed");
  }
  console.log("      Done!");

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  MNEMO Uninstall Complete!                                    ║
╠═══════════════════════════════════════════════════════════════╣
║  Note: Conversation logs (conversations/) are preserved.      ║
║  Delete them manually if you want full removal.               ║
╠═══════════════════════════════════════════════════════════════╣
║  Restart Claude Code to apply changes.                        ║
╚═══════════════════════════════════════════════════════════════╝
`);
}

// ── Run ──
if (!fs.existsSync(claudeDir)) {
  console.error(`Error: Claude Code is not installed.`);
  console.error(`       ${claudeDir} directory not found.`);
  process.exit(1);
}

if (isCheck) {
  check();
} else if (isUninstall) {
  uninstall();
} else {
  install();
}
