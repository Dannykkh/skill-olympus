#!/usr/bin/env node
// Script to install/uninstall Orchestrator (PM-Worker parallel processing)
//
// Usage:
//   Global install:  node install.js --global
//   Global uninstall:  node install.js --global --uninstall
//   Local install:  node install.js <target-project-path>
//   Local uninstall:  node install.js <target-project-path> --uninstall

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");

// ── Argument parsing ──
const args = process.argv.slice(2);
const isGlobal = args.includes("--global");
const isUninstall = args.includes("--uninstall");

// Extract path from arguments (excluding options)
const pathArg = args.find((a) => !a.startsWith("--"));

if (!isGlobal && !pathArg) {
  console.error(
    "Usage:\n" +
      "  Global install:  node install.js --global\n" +
      "  Global uninstall:  node install.js --global --uninstall\n" +
      "  Local install:  node install.js <target-project-path>\n" +
      "  Local uninstall:  node install.js <target-project-path> --uninstall"
  );
  process.exit(1);
}

// Path configuration
const homeDir = os.homedir();
const globalClaudeDir = path.join(homeDir, ".claude");
const targetDir = isGlobal ? globalClaudeDir : path.resolve(pathArg);

// Source repo path (directory where this script is located)
const sourceDir = path.resolve(__dirname);
const mcpServerDir = path.join(sourceDir, "mcp-server");
const isWindows = process.platform === "win32";

// Normalize paths to use forward slashes
function normalizePath(p) {
  return p.replace(/\\/g, "/");
}

// Read JSON file (returns empty object if not found)
function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return {};
  }
}

// Write JSON file
function writeJson(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

// File copy helper
function copyFile(src, dest) {
  const dir = path.dirname(dest);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
}

// File delete helper (ignores if not found)
function removeFile(filePath) {
  try {
    fs.unlinkSync(filePath);
  } catch {
    // Ignore if file doesn't exist
  }
}

// Hook script source path (hooks folder in this repo)
const hooksSourceDir = path.join(sourceDir, "..", "..", "hooks");

// ── Global install ──
function installGlobal() {
  console.log(`\nOrchestrator global install: ${globalClaudeDir}\n`);

  // [1/5] Check MCP server dependencies and build
  console.log("[1/5] Checking MCP server dependencies and build...");
  const nodeModulesDir = path.join(mcpServerDir, "node_modules");
  const distIndex = path.join(mcpServerDir, "dist", "index.js");

  if (!fs.existsSync(nodeModulesDir)) {
    console.log("      node_modules not found -> running npm install");
    try {
      execSync("npm install", { cwd: mcpServerDir, stdio: "inherit" });
    } catch (e) {
      console.error("      npm install failed:", e.message);
      process.exit(1);
    }
  }

  if (!fs.existsSync(distIndex)) {
    console.log("      dist/index.js not found -> running npm run build");
    try {
      execSync("npm run build", { cwd: mcpServerDir, stdio: "inherit" });
    } catch (e) {
      console.error("      Build failed:", e.message);
      process.exit(1);
    }
  }
  console.log("      Dependencies and build check complete");

  // [2/5] Copy hook scripts
  console.log("[2/5] Copying hook scripts...");
  const hooksDir = path.join(globalClaudeDir, "hooks");
  copyFile(
    path.join(hooksSourceDir, "orchestrator-detector.js"),
    path.join(hooksDir, "orchestrator-detector.js")
  );
  console.log("      orchestrator-detector.js copied");

  // [3/5] Copy command files
  console.log("[3/5] Copying command files...");
  const commandsDir = path.join(globalClaudeDir, "commands");
  copyFile(
    path.join(sourceDir, "commands", "workpm.md"),
    path.join(commandsDir, "workpm.md")
  );
  copyFile(
    path.join(sourceDir, "commands", "pmworker.md"),
    path.join(commandsDir, "pmworker.md")
  );
  console.log("      workpm.md, pmworker.md copied");

  // [4/5] Copy spawn scripts
  console.log("[4/5] Copying spawn scripts...");
  const scriptsDir = path.join(globalClaudeDir, "scripts");
  if (isWindows) {
    copyFile(
      path.join(mcpServerDir, "scripts", "spawn-worker.ps1"),
      path.join(scriptsDir, "spawn-worker.ps1")
    );
    console.log("      spawn-worker.ps1 copied");
  } else {
    copyFile(
      path.join(mcpServerDir, "scripts", "spawn-worker.sh"),
      path.join(scriptsDir, "spawn-worker.sh")
    );
    fs.chmodSync(path.join(scriptsDir, "spawn-worker.sh"), 0o755);
    console.log("      spawn-worker.sh copied (chmod +x)");
  }

  // [5/5] Merge settings.json (global)
  console.log("[5/5] Merging settings.json (global)...");
  const settingsPath = path.join(globalClaudeDir, "settings.json");
  const settings = readJson(settingsPath);

  // Add orchestrator to mcpServers (PROJECT_ROOT omitted -> uses process.cwd())
  settings.mcpServers = settings.mcpServers || {};
  settings.mcpServers.orchestrator = {
    command: "node",
    args: [normalizePath(path.join(mcpServerDir, "dist", "index.js"))],
    env: {
      ORCHESTRATOR_WORKER_ID: "pm",
    },
  };

  // Add orchestrator-detector to hooks (script-based, no matcher)
  settings.hooks = settings.hooks || {};
  settings.hooks.UserPromptSubmit = settings.hooks.UserPromptSubmit || [];

  const hookCommand = `node "${normalizePath(path.join(hooksDir, "orchestrator-detector.js"))}"`;

  // Check for duplicates before adding
  const hasOrchestratorHook = settings.hooks.UserPromptSubmit.some(
    (h) => h.hooks && h.hooks.some((hook) => hook.command && hook.command.includes("orchestrator-detector"))
  );
  if (!hasOrchestratorHook) {
    settings.hooks.UserPromptSubmit.push({
      hooks: [{ type: "command", command: hookCommand }],
    });
  }

  writeJson(settingsPath, settings);
  console.log("      settings.json merge complete");

  console.log("\nGlobal install complete!\n");
  console.log("Usage:");
  console.log('  Type "workpm" in any project -> starts PM mode');
  console.log('  Auto-spawn workers: orchestrator_spawn_workers { "count": 2 }');
  console.log("  Or type \"pmworker\" in another terminal\n");
  console.log("Note: .orchestrator/ folder will be created in the current working directory.\n");
}

// ── Global uninstall ──
function uninstallGlobal() {
  console.log(`\nOrchestrator global uninstall: ${globalClaudeDir}\n`);

  // [1/4] Remove mcpServers.orchestrator and hooks from settings.json
  console.log("[1/4] Removing MCP and hook config from settings.json...");
  const settingsPath = path.join(globalClaudeDir, "settings.json");
  const settings = readJson(settingsPath);

  if (settings.mcpServers) {
    delete settings.mcpServers.orchestrator;
    if (Object.keys(settings.mcpServers).length === 0) {
      delete settings.mcpServers;
    }
  }

  // Remove orchestrator-detector from hooks
  if (settings.hooks && settings.hooks.UserPromptSubmit) {
    settings.hooks.UserPromptSubmit = settings.hooks.UserPromptSubmit.filter(
      (h) => {
        if (h.hooks && Array.isArray(h.hooks)) {
          return !h.hooks.some(
            (hook) => hook.command && hook.command.includes("orchestrator-detector")
          );
        }
        return true;
      }
    );
    if (settings.hooks.UserPromptSubmit.length === 0) {
      delete settings.hooks.UserPromptSubmit;
    }
    if (Object.keys(settings.hooks).length === 0) {
      delete settings.hooks;
    }
  }

  writeJson(settingsPath, settings);
  console.log("      settings.json cleanup complete");

  // [2/4] Delete hook scripts
  console.log("[2/4] Deleting hook scripts...");
  const hooksDir = path.join(globalClaudeDir, "hooks");
  removeFile(path.join(hooksDir, "orchestrator-detector.js"));
  console.log("      Hook scripts deleted");

  // [3/4] Delete command files
  console.log("[3/4] Deleting command files...");
  const commandsDir = path.join(globalClaudeDir, "commands");
  removeFile(path.join(commandsDir, "workpm.md"));
  removeFile(path.join(commandsDir, "pmworker.md"));
  console.log("      Command files deleted");

  // [4/4] Delete spawn scripts
  console.log("[4/4] Deleting spawn scripts...");
  const scriptsDir = path.join(globalClaudeDir, "scripts");
  removeFile(path.join(scriptsDir, "spawn-worker.ps1"));
  removeFile(path.join(scriptsDir, "spawn-worker.sh"));
  console.log("      Spawn scripts deleted");

  console.log("\nGlobal uninstall complete!\n");
}

// ── Local install ──
function installLocal() {
  console.log(`\nOrchestrator local install: ${targetDir}\n`);

  // [1/5] Check MCP server dependencies and build
  console.log("[1/5] Checking MCP server dependencies and build...");
  const nodeModulesDir = path.join(mcpServerDir, "node_modules");
  const distIndex = path.join(mcpServerDir, "dist", "index.js");

  if (!fs.existsSync(nodeModulesDir)) {
    console.log("      node_modules not found -> running npm install");
    try {
      execSync("npm install", { cwd: mcpServerDir, stdio: "inherit" });
    } catch (e) {
      console.error("      npm install failed:", e.message);
      process.exit(1);
    }
  }

  if (!fs.existsSync(distIndex)) {
    console.log("      dist/index.js not found -> running npm run build");
    try {
      execSync("npm run build", { cwd: mcpServerDir, stdio: "inherit" });
    } catch (e) {
      console.error("      Build failed:", e.message);
      process.exit(1);
    }
  }
  console.log("      Dependencies and build check complete");

  // [2/5] Copy hook scripts (script-based)
  console.log("[2/5] Copying hook scripts...");
  const hooksDir = path.join(targetDir, "hooks");
  copyFile(
    path.join(hooksSourceDir, "orchestrator-detector.js"),
    path.join(hooksDir, "orchestrator-detector.js")
  );
  console.log("      orchestrator-detector.js copied");

  // [3/5] Copy worker spawn scripts
  console.log("[3/5] Copying worker spawn scripts...");
  const scriptsDir = path.join(targetDir, ".claude", "scripts");
  if (isWindows) {
    copyFile(
      path.join(mcpServerDir, "scripts", "spawn-worker.ps1"),
      path.join(scriptsDir, "spawn-worker.ps1")
    );
    console.log("      spawn-worker.ps1 copied");
  } else {
    copyFile(
      path.join(mcpServerDir, "scripts", "spawn-worker.sh"),
      path.join(scriptsDir, "spawn-worker.sh")
    );
    fs.chmodSync(path.join(scriptsDir, "spawn-worker.sh"), 0o755);
    console.log("      spawn-worker.sh copied (chmod +x)");
  }

  // [4/5] Copy command files
  console.log("[4/5] Copying command files...");
  const commandsDir = path.join(targetDir, ".claude", "commands");
  copyFile(
    path.join(sourceDir, "commands", "workpm.md"),
    path.join(commandsDir, "workpm.md")
  );
  copyFile(
    path.join(sourceDir, "commands", "pmworker.md"),
    path.join(commandsDir, "pmworker.md")
  );
  console.log("      workpm.md, pmworker.md copied");

  // [5/5] Merge settings.local.json
  console.log("[5/5] Merging settings.local.json...");
  const settingsPath = path.join(targetDir, ".claude", "settings.local.json");
  const settings = readJson(settingsPath);

  // Add orchestrator to mcpServers (preserving existing MCP entries)
  settings.mcpServers = settings.mcpServers || {};
  settings.mcpServers.orchestrator = {
    command: "node",
    args: [normalizePath(path.join(mcpServerDir, "dist", "index.js"))],
    env: {
      ORCHESTRATOR_PROJECT_ROOT: normalizePath(targetDir),
      ORCHESTRATOR_WORKER_ID: "pm",
    },
  };

  // Add orchestrator-detector to hooks.UserPromptSubmit (script-based)
  settings.hooks = settings.hooks || {};
  settings.hooks.UserPromptSubmit = settings.hooks.UserPromptSubmit || [];

  const hooksDirNorm = normalizePath(hooksDir);
  const hookCommand = `node "${hooksDirNorm}/orchestrator-detector.js"`;

  // Remove old matcher-based hooks (backward compatibility)
  settings.hooks.UserPromptSubmit = settings.hooks.UserPromptSubmit.filter(
    (h) => {
      if (typeof h.matcher === "string") {
        return !/workpm|pmworker/i.test(h.matcher);
      }
      if (h.hooks && Array.isArray(h.hooks)) {
        return !h.hooks.some(
          (hook) => hook.command && /workpm|pmworker/i.test(hook.command)
        );
      }
      return true;
    }
  );

  // Check for duplicates before adding
  const hasOrchestratorHook = settings.hooks.UserPromptSubmit.some(
    (h) => h.hooks && h.hooks.some((hook) => hook.command && hook.command.includes("orchestrator-detector"))
  );
  if (!hasOrchestratorHook) {
    settings.hooks.UserPromptSubmit.push({
      hooks: [{ type: "command", command: hookCommand }],
    });
  }

  writeJson(settingsPath, settings);
  console.log("      settings.local.json merge complete");

  console.log("\nLocal install complete!\n");
  console.log("Usage:");
  console.log('  PM mode:     Type "workpm" in the prompt');
  console.log('  Worker mode: Type "pmworker" in another terminal\n');
}

// ── Local uninstall ──
function uninstallLocal() {
  console.log(`\nOrchestrator local uninstall: ${targetDir}\n`);

  // [1/5] Remove mcpServers.orchestrator from settings.local.json
  console.log("[1/5] Removing MCP config from settings.local.json...");
  const settingsPath = path.join(targetDir, ".claude", "settings.local.json");
  const settings = readJson(settingsPath);

  if (settings.mcpServers) {
    delete settings.mcpServers.orchestrator;
    if (Object.keys(settings.mcpServers).length === 0) {
      delete settings.mcpServers;
    }
  }

  // [2/5] Remove orchestrator-detector and legacy hook entries from hooks
  console.log("[2/5] Removing hook config from settings.local.json...");
  if (settings.hooks && settings.hooks.UserPromptSubmit) {
    settings.hooks.UserPromptSubmit = settings.hooks.UserPromptSubmit.filter(
      (h) => {
        // Remove legacy matcher-based hooks
        if (typeof h.matcher === "string") {
          if (/workpm|pmworker/i.test(h.matcher)) return false;
        }
        // Remove script-based hooks
        if (h.hooks && Array.isArray(h.hooks)) {
          const hasOldHook = h.hooks.some(
            (hook) => hook.command && /workpm|pmworker/i.test(hook.command)
          );
          const hasNewHook = h.hooks.some(
            (hook) => hook.command && hook.command.includes("orchestrator-detector")
          );
          if (hasOldHook || hasNewHook) return false;
        }
        return true;
      }
    );
    if (settings.hooks.UserPromptSubmit.length === 0) {
      delete settings.hooks.UserPromptSubmit;
    }
    if (Object.keys(settings.hooks).length === 0) {
      delete settings.hooks;
    }
  }

  writeJson(settingsPath, settings);
  console.log("      settings.local.json cleanup complete");

  // [3/5] Delete hook scripts
  console.log("[3/5] Deleting hook scripts...");
  const hooksDir = path.join(targetDir, "hooks");
  // Delete new script
  removeFile(path.join(hooksDir, "orchestrator-detector.js"));
  // Also delete legacy version files (backward compatibility)
  removeFile(path.join(hooksDir, "workpm-hook.ps1"));
  removeFile(path.join(hooksDir, "workpm-hook.sh"));
  removeFile(path.join(hooksDir, "pmworker-hook.ps1"));
  removeFile(path.join(hooksDir, "pmworker-hook.sh"));
  console.log("      Hook scripts deleted");

  // [4/5] Delete spawn scripts
  console.log("[4/5] Deleting spawn scripts...");
  const scriptsDir = path.join(targetDir, ".claude", "scripts");
  removeFile(path.join(scriptsDir, "spawn-worker.ps1"));
  removeFile(path.join(scriptsDir, "spawn-worker.sh"));
  console.log("      Spawn scripts deleted");

  // [5/5] Delete command files
  console.log("[5/5] Deleting command files...");
  const commandsDir = path.join(targetDir, ".claude", "commands");
  removeFile(path.join(commandsDir, "workpm.md"));
  removeFile(path.join(commandsDir, "pmworker.md"));
  console.log("      Command files deleted");

  console.log("\nLocal uninstall complete!\n");
}

// ── Execute ──
if (isGlobal) {
  // Global install/uninstall
  if (isUninstall) {
    uninstallGlobal();
  } else {
    installGlobal();
  }
} else {
  // Local install/uninstall
  if (!fs.existsSync(targetDir)) {
    console.error(`Target directory does not exist: ${targetDir}`);
    process.exit(1);
  }

  if (isUninstall) {
    uninstallLocal();
  } else {
    installLocal();
  }
}
