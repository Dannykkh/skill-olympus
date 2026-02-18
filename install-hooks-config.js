#!/usr/bin/env node
// install-hooks-config.js
// settings.json에 훅 설정을 자동 등록/제거하는 헬퍼 스크립트
//
// 사용법:
//   node install-hooks-config.js <hooks-dir> <settings-path> --windows [--components ...] [--llms ...] [--target ...]
//   node install-hooks-config.js <hooks-dir> <settings-path> --bash [--components ...] [--llms ...] [--target ...]
//   node install-hooks-config.js <hooks-dir> <settings-path> --uninstall
//
// --components: 설치할 번들 (쉼표 구분: mnemo,orchestrator,agent-team 등)
//               미지정 시 전체 (all과 동일)
// --llms: 대상 LLM (쉼표 구분: claude,codex,gemini)
//         미지정 시 전체
// --target: 설정 대상 CLI (claude 또는 gemini, 기본: claude)
//           gemini: Gemini 이벤트명(BeforeAgent, BeforeTool, AfterAgent) 사용

const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
if (args.length < 3) {
  console.error(
    "사용법: node install-hooks-config.js <hooks-dir> <settings-path> [--windows|--bash|--uninstall] [--components ...] [--llms ...] [--target ...]"
  );
  process.exit(1);
}

const hooksDir = args[0].replace(/\\/g, "/");
const settingsPath = args[1];
const mode = args[2]; // --windows, --bash, --uninstall

// 선택적 컴포넌트/LLM/타겟 파싱
let components = null; // null = 전체
let llms = null; // null = 전체
let target = "claude"; // 기본: claude
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

// 절대경로를 슬래시로 통일
function normalizePath(p) {
  return p.replace(/\\/g, "/");
}

// 훅 항목 생성 헬퍼 (Claude/Gemini 공통 포맷: matcher + hooks 배열)
function hookEntry(matcher, command) {
  return {
    matcher: matcher,
    hooks: [{ type: "command", command: command }],
  };
}

// 훅 → 번들 매핑 (어떤 번들이 어떤 훅을 필요로 하는지)
const HOOK_BUNDLE_MAP = {
  "save-conversation": ["mnemo"],
  "orchestrator-detector": ["orchestrator"],
  "check-new-file": ["all-only"], // all 번들에서만 설치
  "protect-files": ["all-only"],
  "validate-code": ["all-only"],
  "validate-docs": ["all-only"],
  "validate-api": ["all-only"],
  "save-response": ["mnemo"],
  "save-turn": ["mnemo"], // Gemini 전용: AfterAgent에서 User+Assistant 한 번에 저장
};

// 해당 훅이 선택된 컴포넌트에 포함되는지 확인
function shouldIncludeHook(hookName) {
  if (!components) return true; // 전체 설치
  const bundles = HOOK_BUNDLE_MAP[hookName] || ["all-only"];
  // all-only 훅: 전체 번들이 모두 선택된 경우에만
  if (bundles.includes("all-only")) {
    return !components || components.length >= 5; // 5개 번들 전부
  }
  return bundles.some((b) => components.includes(b));
}

// ── Claude 훅 설정 빌드 ──
function buildClaudeHooksConfig(dir, isWindows) {
  const d = normalizePath(dir);
  const ext = isWindows ? "ps1" : "sh";
  const cmd = isWindows
    ? (script) => `powershell -ExecutionPolicy Bypass -File "${d}/${script}"`
    : (script) => `bash "${d}/${script}"`;
  const nodeCmd = (script) => `node "${d}/${script}"`;

  const config = {};

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
  if (shouldIncludeHook("validate-code"))
    post.push(hookEntry("Edit|Write", cmd(`validate-code.${ext}`)));
  if (shouldIncludeHook("validate-docs"))
    post.push(hookEntry("Write", cmd(`validate-docs.${ext}`)));
  if (shouldIncludeHook("validate-api"))
    post.push(hookEntry("Edit|Write", cmd(`validate-api.${ext}`)));
  if (post.length > 0) config.PostToolUse = post;

  // Stop
  const stop = [];
  if (shouldIncludeHook("save-response"))
    stop.push(hookEntry("", cmd(`save-response.${ext}`)));
  if (stop.length > 0) config.Stop = stop;

  return config;
}

// ── Gemini 훅 설정 빌드 ──
// Gemini CLI 이벤트: BeforeAgent, BeforeTool, AfterModel, AfterAgent
// 매핑: UserPromptSubmit → BeforeAgent, PreToolUse → BeforeTool, Stop → AfterAgent
// PostToolUse → Gemini에 미존재, BeforeTool/AfterAgent으로 대체
function buildGeminiHooksConfig(dir, isWindows) {
  const d = normalizePath(dir);
  const ext = isWindows ? "ps1" : "sh";
  const cmd = isWindows
    ? (script) => `powershell -ExecutionPolicy Bypass -File "${d}/${script}"`
    : (script) => `bash "${d}/${script}"`;
  const nodeCmd = (script) => `node "${d}/${script}"`;

  const config = {};

  // BeforeAgent (← UserPromptSubmit 매핑)
  // Gemini BeforeAgent 페이로드: {"prompt": "..."} — Claude와 동일
  const ba = [];
  if (shouldIncludeHook("save-conversation"))
    ba.push(hookEntry("", cmd(`save-conversation.${ext}`)));
  if (shouldIncludeHook("orchestrator-detector"))
    ba.push(hookEntry("", nodeCmd("orchestrator-detector.js")));
  if (ba.length > 0) config.BeforeAgent = ba;

  // BeforeTool (← PreToolUse 매핑)
  // Gemini BeforeTool 페이로드 형식이 다를 수 있으나 시도
  const bt = [];
  if (shouldIncludeHook("check-new-file"))
    bt.push(hookEntry("", cmd(`check-new-file.${ext}`)));
  if (shouldIncludeHook("protect-files"))
    bt.push(hookEntry("", cmd(`protect-files.${ext}`)));
  if (bt.length > 0) config.BeforeTool = bt;

  // AfterAgent (← Stop + PostToolUse 대체)
  // Gemini AfterAgent 페이로드: {"prompt": "...", "prompt_response": "..."}
  // save-turn: User+Assistant 한 번에 저장 (gemini-mnemo의 기존 훅)
  // validate 훅들: 파일 기반 검증은 AfterAgent에서 실행 (최종 체크)
  const aa = [];
  if (shouldIncludeHook("save-turn"))
    aa.push(hookEntry("", cmd(`save-turn.${ext}`)));
  if (shouldIncludeHook("validate-code"))
    aa.push(hookEntry("", cmd(`validate-code.${ext}`)));
  if (shouldIncludeHook("validate-docs"))
    aa.push(hookEntry("", cmd(`validate-docs.${ext}`)));
  if (shouldIncludeHook("validate-api"))
    aa.push(hookEntry("", cmd(`validate-api.${ext}`)));
  if (aa.length > 0) config.AfterAgent = aa;

  return config;
}

// 기존 settings.json 읽기 (없으면 빈 객체)
function readSettings(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return JSON.parse(content);
  } catch {
    return {};
  }
}

// settings.json 저장
function writeSettings(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

// env → 번들 매핑 (Claude 전용)
const CLAUDE_ENV_BUNDLE_MAP = {
  CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: ["agent-team"],
  ANTHROPIC_DEFAULT_SONNET_MODEL: ["all-only"],
};

const CLAUDE_ENV_DEFAULTS = {
  CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1",
  ANTHROPIC_DEFAULT_SONNET_MODEL: "claude-sonnet-4-6[1m]",
};

// 메인 로직
function main() {
  const settings = readSettings(settingsPath);

  if (mode === "--uninstall") {
    delete settings.hooks;
    writeSettings(settingsPath, settings);
    console.log("      settings.json에서 hooks 설정 제거 완료");
    return;
  }

  const isWindows = mode === "--windows";
  const hooksConfig = isGemini
    ? buildGeminiHooksConfig(hooksDir, isWindows)
    : buildClaudeHooksConfig(hooksDir, isWindows);

  // hooks 키: 컴포넌트 필터링 결과 머지 (기존 훅 보존 + 새 훅 추가)
  if (!settings.hooks) settings.hooks = {};
  for (const [event, entries] of Object.entries(hooksConfig)) {
    if (!settings.hooks[event]) settings.hooks[event] = [];
    for (const entry of entries) {
      // 중복 방지: 같은 command가 이미 있으면 건너뜀
      const exists = settings.hooks[event].some(
        (e) => e.hooks?.[0]?.command === entry.hooks[0].command
      );
      if (!exists) settings.hooks[event].push(entry);
    }
  }

  if (isGemini) {
    // Gemini 전용 설정
    // enableAgents: 에이전트 사용 활성화
    if (hasComponent("agent-team") || hasComponent("orchestrator")) {
      settings.enableAgents = true;
    }
    // context.fileName: AGENTS.md 로드 보장
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
    // Claude 전용 설정
    // env 키 머지 (기존 값 보존, 번들 필터링 적용)
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

    // teammateMode: agent-team 번들 선택 시에만
    if (hasComponent("agent-team") && !settings.teammateMode) {
      settings.teammateMode = isWindows ? "in-process" : "tmux";
    }
  }

  writeSettings(settingsPath, settings);

  const platform = isWindows ? "PowerShell" : "Bash";
  const hookCount = Object.values(hooksConfig).reduce(
    (sum, arr) => sum + arr.length,
    0
  );
  const targetLabel = isGemini ? "Gemini" : "Claude";
  const parts = [`${targetLabel}`, `${platform}`, `${hookCount}개 훅`];
  if (isGemini && settings.enableAgents) parts.push("enableAgents");
  if (!isGemini && settings.teammateMode) parts.push(`teammateMode: ${settings.teammateMode}`);
  console.log(`      settings.json 설정 완료 (${parts.join(", ")})`);
}

main();
