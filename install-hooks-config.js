#!/usr/bin/env node
// install-hooks-config.js
// Helper script to auto-register/remove hook settings in settings.json
//
// Usage:
//   node install-hooks-config.js <hooks-dir> <settings-path> --windows [--components ...] [--llms ...] [--target ...]
//   node install-hooks-config.js <hooks-dir> <settings-path> --bash [--components ...] [--llms ...] [--target ...]
//   node install-hooks-config.js <hooks-dir> <settings-path> --uninstall
//
// --components: bundles to install (comma-separated: mnemo,orchestrator,agent-team, etc.)
//               if omitted, installs all (same as 'all')
// --llms: target LLMs (comma-separated: claude,codex,gemini)
//         if omitted, targets all
// --target: target CLI (claude or gemini, default: claude)
//           gemini: uses Gemini event names (BeforeAgent, BeforeTool, AfterAgent)

const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
if (args.length < 3) {
  console.error(
    "Usage: node install-hooks-config.js <hooks-dir> <settings-path> [--windows|--bash|--uninstall] [--components ...] [--llms ...] [--target ...]"
  );
  process.exit(1);
}

const hooksDir = args[0].replace(/\\/g, "/");
const settingsPath = args[1];
const mode = args[2]; // --windows, --bash, --uninstall

// Parse optional component/LLM/target arguments
let components = null; // null = all
let llms = null; // null = all
let target = "claude"; // default: claude
for (let i = 3; i < args.length; i++) {
  if (args[i] === "--components" && args[i + 1]) {
    components = args[++i].split(",").map((s) => s.trim().toLowerCase());
  }
  if (args[i] === "--llms" && args[i + 1]) {
    llms = args[++i].split(",").map((s) => s.trim().toLowerCase());
  }
  if (args[i] === "--target" && args[i + 1]) {
    target = args[++i].trim().toLowerCase();
  }
}

const isGemini = target === "gemini";

function hasComponent(name) {
  return !components || components.includes(name);
}
function hasLlm(name) {
  return !llms || llms.includes(name);
}

// Normalize path separators to forward slashes
function normalizePath(p) {
  return p.replace(/\\/g, "/");
}

// Return normalized absolute path (reliable across all Windows shells)
function toPortablePath(absolutePath) {
  return normalizePath(absolutePath);
}

// Hook entry builder helper (shared format for Claude/Gemini: matcher + hooks array)
function hookEntry(matcher, command) {
  return {
    matcher: matcher,
    hooks: [{ type: "command", command: command }],
  };
}

// Mandatory hooks: always installed regardless of component selection
const MANDATORY_HOOKS = ["save-conversation", "save-tool-use", "save-response", "save-turn", "orchestrator-detector", "reconcile-conversations"];

// Hook-to-bundle mapping (which bundle requires which hook)
// Mandatory hooks (MANDATORY_HOOKS) always return true in shouldIncludeHook
const HOOK_BUNDLE_MAP = {
  "save-conversation": ["mnemo"],
  "orchestrator-detector": ["orchestrator"],
  "check-new-file": ["all-only"], // only installed with the 'all' bundle
  "protect-files": ["all-only"],
  "validate-code": ["all-only"],
  "validate-docs": ["all-only"],
  "validate-api": ["all-only"],
  "format-code": ["all-only"],
  "save-response": ["mnemo"],
  "save-tool-use": ["mnemo"], // Claude only: PostToolUse 도구 관찰 로그
  "save-turn": ["mnemo"], // Gemini only: saves User+Assistant together in AfterAgent
  "reconcile-conversations": ["mnemo"], // SessionStart: backfill missed assistant turns from JSONL
  "loop-stop": ["all-only"], // Chronos 루프 Stop 훅 (loop-state.md 없으면 자동 통과)
  "ddingdong-noti": ["all-only"], // OS 네이티브 알림 훅
};

// Check whether the given hook should be installed based on bundle selection
function shouldIncludeHook(hookName) {
  // 필수 훅은 항상 설치
  if (MANDATORY_HOOKS.includes(hookName)) return true;

  // 번들 미지정(= 전체 설치)이면 전부 포함
  if (!components) return true;

  const bundles = HOOK_BUNDLE_MAP[hookName];
  if (!bundles) return true; // 매핑에 없는 훅은 기본 포함

  // "all-only" 번들: 5개 이상 컴포넌트가 선택된 경우에만 설치
  if (bundles.includes("all-only")) {
    return components.length >= 5 || components.includes("all");
  }

  // 해당 훅의 번들 중 하나라도 선택되어 있으면 설치
  return bundles.some(b => components.includes(b));
}

// ── Build Claude hooks config ──
function buildClaudeHooksConfig(dir, isWindows) {
  const d = toPortablePath(dir);
  const ext = isWindows ? "ps1" : "sh";
  const cmd = isWindows
    ? (script) => `powershell -ExecutionPolicy Bypass -File "${d}/${script}"`
    : (script) => `bash "${d}/${script}"`;
  const nodeCmd = (script) => `node "${d}/${script}"`;

  const config = {};

  // SessionStart: reconcile missed assistant turns from JSONL transcript
  const ss = [];
  if (shouldIncludeHook("reconcile-conversations"))
    ss.push(hookEntry("", cmd(`reconcile-conversations.${ext}`)));
  if (ss.length > 0) config.SessionStart = ss;

  // UserPromptSubmit
  const ups = [];
  if (shouldIncludeHook("save-conversation"))
    ups.push(hookEntry(".*", cmd(`save-conversation.${ext}`)));
  if (shouldIncludeHook("orchestrator-detector"))
    ups.push(hookEntry(".*", nodeCmd("orchestrator-detector.js")));
  if (ups.length > 0) config.UserPromptSubmit = ups;

  // PreToolUse
  const pre = [];
  if (shouldIncludeHook("check-new-file"))
    pre.push(hookEntry("Write", cmd(`check-new-file.${ext}`)));
  if (shouldIncludeHook("protect-files"))
    pre.push(hookEntry("Edit|Write", cmd(`protect-files.${ext}`)));
  if (pre.length > 0) config.PreToolUse = pre;

  // PostToolUse
  const post = [];
  if (shouldIncludeHook("save-tool-use"))
    post.push(hookEntry(".*", cmd(`save-tool-use.${ext}`)));
  if (shouldIncludeHook("validate-code"))
    post.push(hookEntry("Edit|Write", cmd(`validate-code.${ext}`)));
  if (shouldIncludeHook("validate-docs"))
    post.push(hookEntry("Write", cmd(`validate-docs.${ext}`)));
  if (shouldIncludeHook("validate-api"))
    post.push(hookEntry("Edit|Write", cmd(`validate-api.${ext}`)));
  if (shouldIncludeHook("format-code"))
    post.push(hookEntry("Edit|Write", cmd(`format-code.${ext}`)));
  if (post.length > 0) config.PostToolUse = post;

  // Stop
  const stop = [];
  if (shouldIncludeHook("save-response"))
    stop.push(hookEntry("", cmd(`save-response.${ext}`)));
  if (shouldIncludeHook("loop-stop"))
    stop.push(hookEntry("", cmd(`loop-stop.${ext}`)));
  if (shouldIncludeHook("ddingdong-noti"))
    stop.push(hookEntry("", cmd(`ddingdong-noti.${ext}`)));
  if (stop.length > 0) config.Stop = stop;

  return config;
}

// ── Build Gemini hooks config ──
// Gemini CLI events: BeforeAgent, BeforeTool, AfterModel, AfterAgent
// Mapping: UserPromptSubmit → BeforeAgent, PreToolUse → BeforeTool, Stop → AfterAgent
// PostToolUse → not available in Gemini, replaced with BeforeTool/AfterAgent
function buildGeminiHooksConfig(dir, isWindows) {
  const d = toPortablePath(dir);
  const ext = isWindows ? "ps1" : "sh";
  const cmd = isWindows
    ? (script) => `powershell -ExecutionPolicy Bypass -File "${d}/${script}"`
    : (script) => `bash "${d}/${script}"`;
  const nodeCmd = (script) => `node "${d}/${script}"`;

  const config = {};

  // BeforeAgent (← mapped from UserPromptSubmit + SessionStart)
  // Gemini BeforeAgent payload: {"prompt": "..."} — same as Claude
  // Gemini는 SessionStart 이벤트가 없으므로 reconcile을 BeforeAgent에 둔다.
  // reconcile은 멱등이고 오늘자만 보므로 매 턴 호출되어도 비용이 낮다.
  const ba = [];
  if (shouldIncludeHook("reconcile-conversations"))
    ba.push(hookEntry("", cmd(`reconcile-conversations.${ext}`)));
  if (shouldIncludeHook("save-conversation"))
    ba.push(hookEntry("", cmd(`save-conversation.${ext}`)));
  if (shouldIncludeHook("orchestrator-detector"))
    ba.push(hookEntry("", nodeCmd("orchestrator-detector.js")));
  if (ba.length > 0) config.BeforeAgent = ba;

  // BeforeTool (← mapped from PreToolUse)
  // Gemini BeforeTool payload format may differ, but attempting anyway
  const bt = [];
  if (shouldIncludeHook("check-new-file"))
    bt.push(hookEntry("", cmd(`check-new-file.${ext}`)));
  if (shouldIncludeHook("protect-files"))
    bt.push(hookEntry("", cmd(`protect-files.${ext}`)));
  if (bt.length > 0) config.BeforeTool = bt;

  // AfterAgent (← replaces Stop + PostToolUse)
  // Gemini AfterAgent payload: {"prompt": "...", "prompt_response": "..."}
  // save-turn: saves User+Assistant together (existing gemini-mnemo hook)
  // validate hooks: file-based validation runs in AfterAgent (final check)
  const aa = [];
  if (shouldIncludeHook("save-turn"))
    aa.push(hookEntry("", cmd(`save-turn.${ext}`)));
  if (shouldIncludeHook("validate-code"))
    aa.push(hookEntry("", cmd(`validate-code.${ext}`)));
  if (shouldIncludeHook("validate-docs"))
    aa.push(hookEntry("", cmd(`validate-docs.${ext}`)));
  if (shouldIncludeHook("validate-api"))
    aa.push(hookEntry("", cmd(`validate-api.${ext}`)));
  if (shouldIncludeHook("format-code"))
    aa.push(hookEntry("", cmd(`format-code.${ext}`)));
  if (shouldIncludeHook("loop-stop"))
    aa.push(hookEntry("", cmd(`loop-stop.${ext}`)));
  if (shouldIncludeHook("ddingdong-noti"))
    aa.push(hookEntry("", cmd(`ddingdong-noti.${ext}`)));
  if (aa.length > 0) config.AfterAgent = aa;

  return config;
}

// Read existing settings.json (returns empty object if not found)
function readSettings(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return JSON.parse(content);
  } catch {
    return {};
  }
}

// Write settings.json
function writeSettings(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

// env → bundle mapping (Claude only)
const CLAUDE_ENV_BUNDLE_MAP = {
  CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: ["agent-team"],
};

const CLAUDE_ENV_DEFAULTS = {
  CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1",
};

// Main logic
function main() {
  const settings = readSettings(settingsPath);

  if (mode === "--uninstall") {
    delete settings.hooks;
    writeSettings(settingsPath, settings);
    console.log("      Removed hooks config from settings.json");
    return;
  }

  const isWindows = mode === "--windows";
  const hooksConfig = isGemini
    ? buildGeminiHooksConfig(hooksDir, isWindows)
    : buildClaudeHooksConfig(hooksDir, isWindows);

  // hooks key: clean up existing hooks + add new ones
  // Replace entries with the same script filename even if paths differ (cross-PC portability)
  if (!settings.hooks) settings.hooks = {};
  for (const [event, entries] of Object.entries(hooksConfig)) {
    if (!settings.hooks[event]) settings.hooks[event] = [];
    for (const entry of entries) {
      const newCmd = entry.hooks[0].command;
      const newFilename = newCmd.split("/").pop().replace(/"/g, "");
      // 확장자 제거 후 비교 — .sh/.ps1 교차 설치 시 이전 확장자 항목도 제거
      const stripExt = (f) => f.replace(/\.(ps1|sh|js)$/, "");
      const newBase = stripExt(newFilename);
      // Remove existing entries with the same base name (even if extension or paths differ)
      settings.hooks[event] = settings.hooks[event].filter((e) => {
        const existingCmd = e.hooks?.[0]?.command || "";
        const existingFilename = existingCmd.split("/").pop().replace(/"/g, "");
        return stripExt(existingFilename) !== newBase;
      });
      settings.hooks[event].push(entry);
    }
  }

  if (isGemini) {
    // Gemini-specific settings
    // enableAgents: enable agent usage
    if (hasComponent("agent-team") || hasComponent("orchestrator")) {
      settings.enableAgents = true;
    }
    // context.fileName: ensure AGENTS.md is loaded
    if (!settings.context) settings.context = {};
    const currentFileNames = Array.isArray(settings.context.fileName)
      ? settings.context.fileName
      : settings.context.fileName
        ? [settings.context.fileName]
        : [];
    if (!currentFileNames.includes("AGENTS.md")) {
      if (currentFileNames.length === 0) {
        settings.context.fileName = ["AGENTS.md", "GEMINI.md"];
      } else {
        currentFileNames.push("AGENTS.md");
        settings.context.fileName = currentFileNames;
      }
    }
  } else {
    // Claude-specific settings
    // Merge env keys (preserve existing values, apply bundle filtering)
    if (!settings.env) settings.env = {};
    let envAdded = 0;
    for (const [key, value] of Object.entries(CLAUDE_ENV_DEFAULTS)) {
      const bundles = CLAUDE_ENV_BUNDLE_MAP[key] || ["all-only"];
      const shouldAdd = bundles.includes("all-only")
        ? !components || components.length >= 5
        : bundles.some((b) => !components || components.includes(b));
      if (shouldAdd && !(key in settings.env)) {
        settings.env[key] = value;
        envAdded++;
      }
    }

    // teammateMode: only when agent-team bundle is selected
    if (hasComponent("agent-team") && !settings.teammateMode) {
      settings.teammateMode = isWindows ? "in-process" : "tmux";
    }

    // permissions: skipDangerousModePermissionPrompt가 true이면 Write/Edit 자동 허용
    if (settings.skipDangerousModePermissionPrompt) {
      if (!settings.permissions) settings.permissions = {};
      if (!settings.permissions.allow) settings.permissions.allow = [];
      const autoAllow = ["Write", "Edit"];
      for (const perm of autoAllow) {
        if (!settings.permissions.allow.includes(perm)) {
          settings.permissions.allow.push(perm);
        }
      }
    }
  }

  writeSettings(settingsPath, settings);

  const platform = isWindows ? "PowerShell" : "Bash";
  const hookCount = Object.values(hooksConfig).reduce(
    (sum, arr) => sum + arr.length,
    0
  );
  const targetLabel = isGemini ? "Gemini" : "Claude";
  const parts = [`${targetLabel}`, `${platform}`, `${hookCount} hooks`];
  if (isGemini && settings.enableAgents) parts.push("enableAgents");
  if (!isGemini && settings.teammateMode) parts.push(`teammateMode: ${settings.teammateMode}`);
  console.log(`      settings.json configured (${parts.join(", ")})`);
}

main();
