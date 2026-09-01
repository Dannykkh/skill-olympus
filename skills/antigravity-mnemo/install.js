#!/usr/bin/env node
"use strict";

const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

const args = new Set(process.argv.slice(2));
const sourceDir = __dirname;
const googleHome = process.env.ANTIGRAVITY_HOME
  ? path.resolve(process.env.ANTIGRAVITY_HOME)
  : path.join(os.homedir(), ".gemini");
const configDir = path.join(googleHome, "config");
const hookDir = path.join(configDir, "hooks");
const hookPath = path.join(hookDir, "olympus-save-turn.js");
const hooksConfigPath = path.join(configDir, "hooks.json");
const rulesPath = path.join(googleHome, "GEMINI.md");
const templatePath = path.join(sourceDir, "templates", "gemini-md-rules.md");
const sourceHookPath = path.join(sourceDir, "hooks", "save-turn.js");
const hookId = "olympus-antigravity-mnemo";
const markerStart = "<!-- ANTIGRAVITY-MNEMO:START -->";
const markerEnd = "<!-- ANTIGRAVITY-MNEMO:END -->";
const legacyMarkerStart = "<!-- GEMINI-MNEMO:START -->";
const legacyMarkerEnd = "<!-- GEMINI-MNEMO:END -->";
const legacyHookHashes = new Set([
  "334748d78c61a9f2322fd9546ac050ea4eede745a61166ecc038196cb0091e72",
  "0b06e37320d847879c7d6b05d2d06fe3d994749407b7ccf2b413e39fa728c783",
]);

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, "utf8")); } catch { return {}; }
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripBlock(content, start, end) {
  const pattern = new RegExp(`\\n?${escapeRegex(start)}[\\s\\S]*?${escapeRegex(end)}\\n?`, "g");
  return content.replace(pattern, "\n").trim();
}

function mergeRules() {
  const current = fs.existsSync(rulesPath) ? fs.readFileSync(rulesPath, "utf8") : "";
  const withoutLegacy = stripBlock(stripBlock(current, markerStart, markerEnd), legacyMarkerStart, legacyMarkerEnd);
  const template = fs.readFileSync(templatePath, "utf8").trim();
  const prefix = withoutLegacy ? withoutLegacy + "\n\n" : "";
  ensureDir(path.dirname(rulesPath));
  fs.writeFileSync(rulesPath, `${prefix}${markerStart}\n${template}\n${markerEnd}\n`, "utf8");
}

function removeRules(filePath, includeLegacy = false) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, "utf8");
  content = stripBlock(content, markerStart, markerEnd);
  if (includeLegacy) content = stripBlock(content, legacyMarkerStart, legacyMarkerEnd);
  if (content) fs.writeFileSync(filePath, content + "\n", "utf8");
  else fs.rmSync(filePath, { force: true });
}

function hookCommand() {
  return `node "${hookPath.replace(/\\/g, "/")}"`;
}

function installHookConfig() {
  const config = readJson(hooksConfigPath);
  config[hookId] = {
    Stop: [{ type: "command", command: hookCommand(), timeout: 60 }],
  };
  writeJson(hooksConfigPath, config);
}

function uninstallHookConfig() {
  const config = readJson(hooksConfigPath);
  if (!Object.prototype.hasOwnProperty.call(config, hookId)) return;
  delete config[hookId];
  if (Object.keys(config).length > 0) writeJson(hooksConfigPath, config);
  else fs.rmSync(hooksConfigPath, { force: true });
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function uniquePreservePath(name) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const base = path.join(googleHome, "_olympus-preserved", stamp, "legacy-gemini-mnemo");
  ensureDir(base);
  let candidate = path.join(base, name);
  for (let suffix = 2; fs.existsSync(candidate); suffix += 1) {
    const parsed = path.parse(name);
    candidate = path.join(base, `${parsed.name}-${suffix}${parsed.ext}`);
  }
  return candidate;
}

function cleanLegacyHookFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  if (legacyHookHashes.has(sha256(filePath))) {
    fs.rmSync(filePath, { force: true });
    return;
  }
  const preserved = uniquePreservePath(path.basename(filePath));
  fs.renameSync(filePath, preserved);
  console.warn(`[antigravity-mnemo] preserved modified legacy hook: ${preserved}`);
}

function cleanLegacySettings() {
  const settingsPath = path.join(googleHome, "settings.json");
  if (!fs.existsSync(settingsPath)) return;
  const settings = readJson(settingsPath);
  if (settings.hooks && typeof settings.hooks === "object") {
    for (const event of Object.keys(settings.hooks)) {
      if (!Array.isArray(settings.hooks[event])) continue;
      settings.hooks[event] = settings.hooks[event].map((entry) => {
        if (!Array.isArray(entry?.hooks)) return entry;
        const hooks = entry.hooks.filter((hook) => {
          const command = String(hook?.command || "").replace(/\\/g, "/").toLowerCase();
          const legacyBase = path.join(googleHome, "hooks", "save-turn")
            .replace(/\\/g, "/")
            .toLowerCase();
          const legacyHomePattern = /(?:\$home|\$\{home\}|%userprofile%|~)\/\.gemini\/hooks\/save-turn\.(?:ps1|sh)/i;
          const isLegacy = command.includes("gemini-mnemo")
            || command.includes(`${legacyBase}.ps1`)
            || command.includes(`${legacyBase}.sh`)
            || legacyHomePattern.test(command);
          return !isLegacy;
        });
        return { ...entry, hooks };
      }).filter((entry) => !Array.isArray(entry?.hooks) || entry.hooks.length > 0);
      if (settings.hooks[event].length === 0) delete settings.hooks[event];
    }
    if (Object.keys(settings.hooks).length === 0) delete settings.hooks;
  }
  delete settings.enableAgents;
  writeJson(settingsPath, settings);
}

function migrateLegacy() {
  cleanLegacySettings();
  removeRules(path.join(googleHome, "AGENTS.md"), true);
  cleanLegacyHookFile(path.join(googleHome, "hooks", "save-turn.ps1"));
  cleanLegacyHookFile(path.join(googleHome, "hooks", "save-turn.sh"));
  try {
    const legacyDir = path.join(googleHome, "hooks");
    if (fs.existsSync(legacyDir) && fs.readdirSync(legacyDir).length === 0) fs.rmdirSync(legacyDir);
  } catch {
    // Preserve directories that contain other user hooks.
  }
}

function install() {
  if (!fs.existsSync(sourceHookPath) || !fs.existsSync(templatePath)) {
    throw new Error("Antigravity Mnemo package is incomplete");
  }
  migrateLegacy();
  ensureDir(hookDir);
  fs.copyFileSync(sourceHookPath, hookPath);
  if (process.platform !== "win32") fs.chmodSync(hookPath, 0o755);
  installHookConfig();
  mergeRules();
  console.log(`Antigravity Mnemo installed in ${googleHome}`);
}

function uninstall() {
  uninstallHookConfig();
  fs.rmSync(hookPath, { force: true });
  removeRules(rulesPath, false);
  migrateLegacy();
  console.log(`Antigravity Mnemo removed from ${googleHome}`);
}

function check() {
  const config = readJson(hooksConfigPath);
  const stop = config[hookId]?.Stop;
  const issues = [];
  if (!fs.existsSync(hookPath)) issues.push(`missing hook: ${hookPath}`);
  if (!Array.isArray(stop) || !stop.some((entry) => String(entry.command || "").includes("olympus-save-turn.js"))) {
    issues.push(`missing ${hookId} Stop hook in ${hooksConfigPath}`);
  }
  const rules = fs.existsSync(rulesPath) ? fs.readFileSync(rulesPath, "utf8") : "";
  if (!rules.includes(markerStart) || !rules.includes(markerEnd)) issues.push(`missing rules in ${rulesPath}`);
  if (issues.length > 0) {
    for (const issue of issues) console.error(`[antigravity-mnemo] ${issue}`);
    process.exitCode = 1;
    return;
  }
  console.log("Antigravity Mnemo check passed");
}

try {
  if (args.has("--uninstall")) uninstall();
  else if (args.has("--check") || args.has("--doctor")) check();
  else install();
} catch (error) {
  console.error(`[antigravity-mnemo] ${error.message || error}`);
  process.exit(1);
}
