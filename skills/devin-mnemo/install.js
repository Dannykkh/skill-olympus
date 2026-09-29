#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const source = __dirname;
const configDir = process.env.DEVIN_CONFIG_DIR || (process.platform === "win32"
  ? path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "devin")
  : path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config"), "devin"));
const configPath = path.join(configDir, "config.json");
const rulesPath = path.join(configDir, "AGENTS.md");
const hooksDir = path.join(configDir, "hooks");
const hookName = "devin-mnemo-save-turn.js";
const files = {
  [hookName]: path.join(source, "hooks", "save-turn.js"),
  "read-assistant.py": path.join(source, "hooks", "read-assistant.py"),
  "mnemo-project-root.js": path.join(source, "../../hooks/mnemo-project-root.js"),
};
const start = "<!-- DEVIN-MNEMO:START -->";
const end = "<!-- DEVIN-MNEMO:END -->";
const rule = `${start}\n# Devin Mnemo\n\nDevin 대화는 자체 훅이 \`conversations/YYYY-MM-DD-devin.md\`에 저장한다. Claude 호환 훅을 이 대화의 저장기로 사용하지 않는다. 공통 기억·검색·핸드오프 규칙은 프로젝트 AGENTS.md와 Claude 호환 Mnemo 규칙을 따른다. 과거 Devin 대화는 다른 CLI의 \`conversations/*.md\`와 함께 검색한다. 설치·진단은 devin-mnemo의 install.js를 사용한다.\n${end}`;

function readConfig() {
  if (!fs.existsSync(configPath)) return {};
  const value = JSON.parse(fs.readFileSync(configPath, "utf8"));
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid Devin config JSON");
  return value;
}

function writeConfig(value) {
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(value, null, 2) + "\n");
}

function command() {
  return `node "${path.join(hooksDir, hookName).replace(/\\/g, "/")}"`;
}

function isOurs(entry) {
  return entry?.hooks?.some((hook) => typeof hook.command === "string" && hook.command.includes(hookName));
}

function withManagedHooks(config, remove) {
  const hooks = config.hooks || {};
  for (const event of ["UserPromptSubmit", "Stop", "SessionEnd"]) {
    const current = Array.isArray(hooks[event]) ? hooks[event].filter((entry) => !isOurs(entry)) : [];
    if (!remove) current.push({ matcher: "", hooks: [{ type: "command", command: command(), timeout: 30 }] });
    if (current.length) hooks[event] = current;
    else delete hooks[event];
  }
  if (Object.keys(hooks).length) config.hooks = hooks;
  else delete config.hooks;
  return config;
}

function updateRules(remove) {
  const old = fs.existsSync(rulesPath) ? fs.readFileSync(rulesPath, "utf8") : "";
  const escaped = start.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedEnd = end.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const clean = old.replace(new RegExp(`\\n?${escaped}[\\s\\S]*?${escapedEnd}\\n?`, "g"), "\n").trim();
  const updated = remove ? clean : [clean, rule].filter(Boolean).join("\n\n");
  if (updated) fs.writeFileSync(rulesPath, updated + "\n");
  else if (fs.existsSync(rulesPath)) fs.unlinkSync(rulesPath);
}

function pythonAvailable() {
  for (const command of process.platform === "win32" ? ["python", "py", "python3"] : ["python3", "python"]) {
    const args = command === "py" ? ["-3", "--version"] : ["--version"];
    const result = spawnSync(command, args, { encoding: "utf8", timeout: 3000, windowsHide: true });
    if (!result.error && result.status === 0 && /Python 3\./.test(result.stdout + result.stderr)) return true;
  }
  return false;
}

function check() {
  const issues = [];
  let config;
  try { config = readConfig(); } catch (error) { issues.push(error.message); config = {}; }
  for (const event of ["UserPromptSubmit", "Stop", "SessionEnd"]) {
    if (!config.hooks?.[event]?.some(isOurs)) issues.push(`${event} hook missing`);
  }
  for (const [name, src] of Object.entries(files)) {
    const dst = path.join(hooksDir, name);
    if (!fs.existsSync(dst) || fs.readFileSync(dst, "utf8") !== fs.readFileSync(src, "utf8")) issues.push(`${name} missing or stale`);
  }
  if (!fs.existsSync(rulesPath) || !fs.readFileSync(rulesPath, "utf8").includes(start)) issues.push("global rules missing");
  if (!pythonAvailable()) issues.push("Python 3 missing; assistant text cannot be read from Devin sessions.db");
  const claudeSettings = path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude"), "settings.json");
  if (fs.existsSync(claudeSettings) && config.read_config_from?.claude !== false) {
    const claudeHook = path.join(path.dirname(claudeSettings), "hooks", process.platform === "win32" ? "save-conversation.ps1" : "save-conversation.sh");
    if (fs.existsSync(claudeHook) && !fs.readFileSync(claudeHook, "utf8").includes("DEVIN_PROJECT_DIR")) issues.push("Claude Mnemo hook lacks Devin guard; reinstall Claude Mnemo");
  }
  if (issues.length) { console.error(issues.join("\n")); process.exitCode = 1; }
  else console.log("Devin-Mnemo configuration OK; runtime turn still needs verification.");
}

function install() {
  for (const src of Object.values(files)) if (!fs.existsSync(src)) throw new Error(`missing source: ${src}`);
  if (!pythonAvailable()) throw new Error("Python 3 is required to save Devin assistant messages");
  fs.mkdirSync(hooksDir, { recursive: true });
  for (const [name, src] of Object.entries(files)) fs.copyFileSync(src, path.join(hooksDir, name));
  writeConfig(withManagedHooks(readConfig(), false));
  updateRules(false);
  console.log(`Devin-Mnemo installed in ${configDir}`);
  check();
}

function uninstall() {
  if (fs.existsSync(configPath)) writeConfig(withManagedHooks(readConfig(), true));
  updateRules(true);
  for (const [name, src] of Object.entries(files)) {
    const dst = path.join(hooksDir, name);
    if (fs.existsSync(dst) && fs.readFileSync(dst, "utf8") === fs.readFileSync(src, "utf8")) fs.unlinkSync(dst);
  }
  console.log("Devin-Mnemo managed hooks and rule removed; project history preserved.");
}

try {
  if (process.argv.includes("--uninstall")) uninstall();
  else if (process.argv.includes("--check")) check();
  else install();
} catch (error) { console.error(`[devin-mnemo] ${error.message}`); process.exitCode = 1; }
