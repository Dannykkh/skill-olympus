#!/usr/bin/env node
// Codex-Mnemo (long-term memory system) install/uninstall script
//
// Usage:
//   node skills/codex-mnemo/install.js              # install
//   node skills/codex-mnemo/install.js --check      # health check
//   node skills/codex-mnemo/install.js --uninstall  # uninstall
//
// Codex-Mnemo core components:
//   - Hook: save-turn (auto-save User+Assistant conversations via notify event)
//   - AGENTS.md rules: response tags, past conversation search

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");

// ── Config ──
const args = process.argv.slice(2);
const isUninstall = args.includes("--uninstall");
const isCheck = args.includes("--check") || args.includes("--doctor");
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

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function quoteSh(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function commandExists(command) {
  if (!command) return false;
  const normalized = command.replace(/\\/g, "/");
  const looksLikePath = /[/:\\]/.test(command);
  if (looksLikePath) {
    return fs.existsSync(path.normalize(command));
  }

  try {
    if (isWindows) {
      execFileSync("where.exe", [command], {
        stdio: "ignore",
        timeout: 5000,
      });
    } else {
      execFileSync("sh", ["-lc", `command -v ${quoteSh(command)}`], {
        stdio: "ignore",
        timeout: 5000,
      });
    }
    return true;
  } catch {
    if (isWindows && !/\.(exe|cmd|bat)$/i.test(normalized)) {
      return commandExists(`${command}.exe`);
    }
    return false;
  }
}

function getPreferredPowerShell() {
  const winPs = "C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe";
  if (fs.existsSync(winPs)) return winPs;

  const pwsh = "C:/Program Files/PowerShell/7/pwsh.exe";
  if (fs.existsSync(pwsh)) return pwsh;
  if (commandExists("pwsh")) return "pwsh";
  return "powershell.exe";
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
    "g",
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
      "g",
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
    const shell = getPreferredPowerShell();
    return [shell, "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", `${d}/save-turn.ps1`];
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

function parseTomlStringArray(block) {
  const values = [];
  let i = 0;
  while (i < block.length) {
    const quote = block[i];
    if (quote !== "'" && quote !== '"') {
      i += 1;
      continue;
    }

    i += 1;
    let value = "";
    while (i < block.length) {
      const ch = block[i];
      if (quote === "'" && ch === "'" && block[i + 1] === "'") {
        value += "'";
        i += 2;
        continue;
      }
      if (quote === '"' && ch === "\\" && i + 1 < block.length) {
        value += block[i + 1];
        i += 2;
        continue;
      }
      if (ch === quote) {
        i += 1;
        break;
      }
      value += ch;
      i += 1;
    }
    values.push(value);
  }
  return values;
}

function readNotifyArgs(content) {
  const lines = stripLineEndings(content).split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (!/^\s*notify\s*=/.test(lines[i])) continue;

    let block = lines[i];
    while (!/\]/.test(block) && i + 1 < lines.length) {
      i += 1;
      block += `\n${lines[i]}`;
    }
    return parseTomlStringArray(block);
  }
  return [];
}

function getNotifyScriptPath(notifyArgs) {
  for (let i = 0; i < notifyArgs.length; i++) {
    const arg = notifyArgs[i];
    if (/^-File$/i.test(arg) && notifyArgs[i + 1]) {
      return notifyArgs[i + 1];
    }
  }

  return notifyArgs.find((arg) => /\.(ps1|sh)$/i.test(arg)) || "";
}

function notifyArgsMentionSaveTurn(notifyArgs) {
  return notifyArgs.some((arg) => /save-turn\.(ps1|sh)/i.test(arg));
}

function scriptChainsSaveTurn(scriptPath) {
  if (!scriptPath) return false;
  const normalized = path.normalize(scriptPath);
  const text = readText(normalized);
  return /save-turn\.(ps1|sh)/i.test(text);
}

function notifyChainsSaveTurn(notifyArgs) {
  if (notifyArgsMentionSaveTurn(notifyArgs)) return true;
  return scriptChainsSaveTurn(getNotifyScriptPath(notifyArgs));
}

function notifyLooksLikeDesktopOrIdeNotification(notifyArgs) {
  const haystack = [
    ...notifyArgs,
    readText(path.normalize(getNotifyScriptPath(notifyArgs))),
  ].join("\n");
  return /(ddingdong-noti|ide-response-notify|BurntToast|New-BurntToastNotification|notify-send|ShowBalloonTip)/i.test(
    haystack,
  );
}

function repairNotifyShell(notifyArgs) {
  if (!isWindows || notifyArgs.length === 0) return notifyArgs;
  if (commandExists(notifyArgs[0])) return notifyArgs;

  return [getPreferredPowerShell(), ...notifyArgs.slice(1)];
}

function quotePowerShell(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function writeNotifyWrapper(hooksDir, previousNotifyArgs) {
  if (!previousNotifyArgs || previousNotifyArgs.length === 0) return null;

  ensureDir(hooksDir);
  if (isWindows) {
    const wrapperPath = path.join(hooksDir, "codex-mnemo-notify-wrapper.ps1");
    const saveTurnPath = normalizePath(path.join(hooksDir, "save-turn.ps1"));
    const previous = previousNotifyArgs.map(quotePowerShell).join(", ");
    const content = [
      "# codex-mnemo-notify-wrapper.ps1",
      "# Generated by skills/codex-mnemo/install.js. Runs Mnemo, then the previous Codex notify command.",
      '$ErrorActionPreference = "SilentlyContinue"',
      `& ${quotePowerShell(saveTurnPath)} @args`,
      `$previous = @(${previous})`,
      "if ($previous.Count -gt 0) {",
      "    $cmd = $previous[0]",
      "    $rest = @()",
      "    if ($previous.Count -gt 1) { $rest = $previous[1..($previous.Count - 1)] }",
      "    & $cmd @rest @args",
      "}",
      "exit 0",
      "",
    ].join("\n");
    fs.writeFileSync(wrapperPath, content, "utf8");
    return [
      getPreferredPowerShell(),
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      normalizePath(wrapperPath),
    ];
  }

  const wrapperPath = path.join(hooksDir, "codex-mnemo-notify-wrapper.sh");
  const saveTurnPath = normalizePath(path.join(hooksDir, "save-turn.sh"));
  const previous = previousNotifyArgs
    .map((arg) => `'${String(arg).replace(/'/g, "'\\''")}'`)
    .join(" ");
  const content = [
    "#!/usr/bin/env bash",
    "# Generated by skills/codex-mnemo/install.js. Runs Mnemo, then the previous Codex notify command.",
    "set +e",
    `bash '${saveTurnPath.replace(/'/g, "'\\''")}' "$@"`,
    `previous=( ${previous} )`,
    'if [ "${#previous[@]}" -gt 0 ]; then',
    '  "${previous[@]}" "$@"',
    "fi",
    "exit 0",
    "",
  ].join("\n");
  fs.writeFileSync(wrapperPath, content, "utf8");
  fs.chmodSync(wrapperPath, 0o755);
  return ["bash", normalizePath(wrapperPath)];
}

function disableTuiNotifications(content) {
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
        lines[i] = "notifications = false";
        found = true;
        break;
      }
    }
    if (!found) {
      lines.splice(end, 0, "notifications = false");
    }
    return lines.join("\n");
  }

  let updated = removeLine(content, /^\s*tui\.notifications\s*=/);
  updated = insertRootLine(updated, "tui.notifications = false");
  return updated;
}

function stringifyNotify(args) {
  const escaped = args.map((x) => `'${x.replace(/'/g, "''")}'`);
  return `notify = [${escaped.join(", ")}]`;
}

function installTomlNotify(configPath, notifyArgs, hooksDir) {
  let content = "";
  try {
    content = fs.readFileSync(configPath, "utf8");
  } catch {
    content = "";
  }

  const existingNotifyArgs = readNotifyArgs(content);
  const hadNotify = /^\s*notify\s*=/m.test(content);
  let finalNotifyArgs = notifyArgs;

  // 판정 순서 중요: save-turn 체인 검사가 IDE 알림 검사보다 먼저여야 한다.
  // 외부 도구가 "save-turn 체인 + 자체 알림"을 겸하는 래퍼를 notify에 설치한 경우,
  // IDE 알림 검사를 먼저 하면 save-turn을 정상 체인 중인 래퍼까지 제거해
  // 외부 도구의 notify 통합이 조용히 끊긴다 (2026-06-13 실제 발생).
  if (hadNotify && notifyChainsSaveTurn(existingNotifyArgs)) {
    finalNotifyArgs = repairNotifyShell(existingNotifyArgs);
    console.log("      Refreshing existing save-turn notify chain");
  } else if (
    hadNotify &&
    existingNotifyArgs.length > 0 &&
    notifyLooksLikeDesktopOrIdeNotification(existingNotifyArgs)
  ) {
    console.log("      Removing existing desktop/IDE notification chain");
  } else if (hadNotify && existingNotifyArgs.length > 0 && hooksDir) {
    const wrapperNotifyArgs = writeNotifyWrapper(hooksDir, existingNotifyArgs);
    if (wrapperNotifyArgs) {
      finalNotifyArgs = wrapperNotifyArgs;
      console.log("      Preserving existing notify via codex-mnemo wrapper");
    }
  }

  const newLine = stringifyNotify(finalNotifyArgs);
  console.log(
    hadNotify
      ? "      Replacing existing notify config with codex-mnemo format"
      : "      Adding notify config",
  );

  content = removeNotifyAssignmentsEverywhere(content);
  content = insertRootLine(content, newLine);
  content = disableTuiNotifications(content);

  if (content.length > 0 && !content.endsWith("\n")) {
    content += "\n";
  } else {
    content += "";
  }

  ensureDir(path.dirname(configPath));
  fs.writeFileSync(configPath, content, "utf8");
  return finalNotifyArgs;
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

  const hookFiles = isWindows
    ? [
        "save-turn.ps1",
        "append-user.ps1",
        "append-assistant.ps1",
        "codex-hook-bridge.js",
      ]
    : [
        "save-turn.sh",
        "append-user.sh",
        "append-assistant.sh",
        "codex-hook-bridge.js",
      ];

  // Verify every source file before writing anything. The loop below used to
  // exit(1) mid-way on the first missing file, leaving the earlier hooks copied
  // and the rest not — a partial install that looks like a successful one.
  // The hooks only work as a set, so all-or-nothing is the safe outcome.
  const missingHooks = hookFiles.filter(
    (f) => !fs.existsSync(path.join(sourceDir, "hooks", f))
  );
  if (missingHooks.length > 0) {
    console.error("      Error: hook source file(s) missing — nothing was installed:");
    for (const f of missingHooks) {
      console.error(`        - ${path.join(sourceDir, "hooks", f)}`);
    }
    console.error("      The repository looks incomplete. Re-clone it, or restore");
    console.error("      the skills/ directory (git checkout -- skills/).");
    process.exit(1);
  }

  ensureDir(hooksDir);

  for (const hookFile of hookFiles) {
    const src = path.join(sourceDir, "hooks", hookFile);
    const dest = path.join(hooksDir, hookFile);

    copyFile(src, dest);
    if (!isWindows) {
      fs.chmodSync(dest, 0o755);
    }
    console.log(`      - ${hookFile}`);
  }

  // Install reconcile script (used by Claude's SessionStart hook wrapper
  // to back-fill conversations from Codex rollout JSONL).
  const scriptsDir = path.join(codexDir, "scripts");
  const scriptFiles = ["reconcile_codex_conversations.py"];
  let scriptsInstalled = 0;
  for (const scriptFile of scriptFiles) {
    const src = path.join(sourceDir, "scripts", scriptFile);
    if (!fs.existsSync(src)) continue;
    ensureDir(scriptsDir);
    const dest = path.join(scriptsDir, scriptFile);
    copyFile(src, dest);
    if (!isWindows) {
      fs.chmodSync(dest, 0o755);
    }
    console.log(`      - scripts/${scriptFile}`);
    scriptsInstalled++;
  }
  if (scriptsInstalled === 0) {
    console.log("      - (no reconcile scripts found, skipped)");
  }
  console.log("      Done!");

  // [2/3] config.toml notify settings
  console.log("\n[2/3] Configuring config.toml notify...");
  const notifyArgs = buildNotifyCommand(hooksDir);
  const installedNotifyArgs = installTomlNotify(
    configPath,
    notifyArgs,
    hooksDir,
  );
  console.log(`      ${stringifyNotify(installedNotifyArgs)}`);
  console.log("      tui.notifications = false");
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

// ── Health Check ──
function check() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  CODEX-MNEMO: Health Check                                    ║
╚═══════════════════════════════════════════════════════════════╝
`);

  const hooksDir = path.join(codexDir, "hooks");
  const configPath = path.join(codexDir, "config.toml");
  const agentsMdPath = path.join(codexDir, "AGENTS.md");
  let issues = 0;

  console.log("[1/3] Checking hook files...");
  const hookFiles = isWindows
    ? [
        "save-turn.ps1",
        "append-user.ps1",
        "append-assistant.ps1",
        "codex-hook-bridge.js",
      ]
    : [
        "save-turn.sh",
        "append-user.sh",
        "append-assistant.sh",
        "codex-hook-bridge.js",
      ];
  for (const hookFile of hookFiles) {
    const filePath = path.join(hooksDir, hookFile);
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      console.log(`      OK ${hookFile} (${stat.size} bytes)`);
    } else {
      console.log(`      MISSING ${hookFile}`);
      issues += 1;
    }
  }

  console.log("\n[2/3] Checking config.toml notify...");
  const config = readText(configPath);
  if (!config) {
    console.log(`      MISSING ${configPath}`);
    issues += 1;
  } else {
    const notifyArgs = readNotifyArgs(config);
    if (notifyArgs.length === 0) {
      console.log("      MISSING notify assignment");
      issues += 1;
    } else {
      const command = notifyArgs[0];
      const executableOk = commandExists(command);
      console.log(`      notify command: ${command}`);
      console.log(`      command executable: ${executableOk ? "yes" : "no"}`);
      if (!executableOk) issues += 1;

      const scriptPath = getNotifyScriptPath(notifyArgs);
      if (scriptPath) {
        const scriptExists = fs.existsSync(path.normalize(scriptPath));
        console.log(`      notify script: ${scriptPath}`);
        console.log(`      script exists: ${scriptExists ? "yes" : "no"}`);
        if (!scriptExists) issues += 1;
      }

      const hasSaveTurn = notifyChainsSaveTurn(notifyArgs);
      console.log(`      save-turn chained: ${hasSaveTurn ? "yes" : "no"}`);
      if (!hasSaveTurn) issues += 1;
    }
  }

  console.log("\n[3/3] Checking AGENTS.md rules...");
  const agentsMd = readText(agentsMdPath);
  const hasRules = agentsMd.includes(MARKER_START) && agentsMd.includes(MARKER_END);
  const hasTags = /응답 키워드 규칙/.test(agentsMd);
  const hasSearch = /과거 대화 검색 규칙/.test(agentsMd);
  console.log(`      mnemo block: ${hasRules ? "yes" : "no"}`);
  console.log(`      response tags: ${hasTags ? "yes" : "no"}`);
  console.log(`      past search: ${hasSearch ? "yes" : "no"}`);
  if (!hasRules || !hasTags || !hasSearch) issues += 1;

  console.log("");
  if (issues === 0) {
    console.log("All checks passed. Codex-Mnemo is installed.");
  } else {
    console.log(`${issues} issue(s) found. Reinstall or refresh with:`);
    console.log("  node skills/codex-mnemo/install.js");
  }
  console.log("");

  process.exit(issues > 0 ? 1 : 0);
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
    "codex-hook-bridge.js",
    "sync-sessions.ps1",
    "codex-mnemo-notify-wrapper.ps1",
    "save-turn.sh",
    "append-user.sh",
    "append-assistant.sh",
    "codex-mnemo-notify-wrapper.sh",
  ];
  for (const file of hookFiles) {
    if (removeFile(path.join(hooksDir, file))) {
      console.log(`      - ${file} removed`);
    }
  }
  // Remove reconcile scripts installed under ~/.codex/scripts/
  const scriptsDir = path.join(codexDir, "scripts");
  const scriptFiles = ["reconcile_codex_conversations.py"];
  for (const file of scriptFiles) {
    if (removeFile(path.join(scriptsDir, file))) {
      console.log(`      - scripts/${file} removed`);
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

if (isCheck) {
  check();
} else if (isUninstall) {
  uninstall();
} else {
  install();
}
