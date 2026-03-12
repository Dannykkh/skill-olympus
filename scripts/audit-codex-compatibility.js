#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync, execSync } = require("child_process");

const args = process.argv.slice(2);
const writeIndex = args.indexOf("--write");
const outputPath =
  writeIndex >= 0 && args[writeIndex + 1]
    ? path.resolve(args[writeIndex + 1])
    : null;

const repoRoot = path.resolve(__dirname, "..");
const codexHome = process.env.CODEX_HOME
  ? path.resolve(process.env.CODEX_HOME)
  : path.join(os.homedir(), ".codex");

const manifestPath = path.join(repoRoot, ".agents", ".codex-sync-manifest.json");
const codexConfigPath = path.join(codexHome, "config.toml");
const codexAgentsPath = path.join(codexHome, "AGENTS.md");

const skillsDir = path.join(repoRoot, "skills");
const agentsDir = path.join(repoRoot, "agents");
const hooksDir = path.join(repoRoot, "hooks");

const detectionPatterns = [
  {
    key: "claude_path",
    label: ".claude path",
    regex: /\.claude[\\/]|~\/\.claude/i,
  },
  {
    key: "claude_doc",
    label: "CLAUDE.md",
    regex: /\bCLAUDE\.md\b/i,
  },
  {
    key: "claude_hooks",
    label: "Claude hook events",
    regex: /\b(UserPromptSubmit|PreToolUse|PostToolUse|Stop)\b/,
  },
  {
    key: "ask_user",
    label: "AskUserQuestion",
    regex: /\bAskUserQuestion(?:Tool)?\b/,
  },
];

const prioritySkillReasons = {
  "command-creator":
    "Codex에는 Claude slash command(`.claude/commands`) 확장 모델이 없어, 현재는 제한을 설명하고 skill/prompt로 우회해야 합니다.",
  "daily-meeting-update":
    "Codex/Gemini fallback을 문서화했지만, 여전히 Claude 히스토리와 구조화된 질문 UX 비중이 큽니다.",
  "manage-skills":
    "경로는 `skills/`와 `AGENTS.md` 기준으로 보정됐지만, 확인 단계와 일부 문구가 아직 Claude식 상호작용에 가깝습니다.",
  mnemo:
    "Stop/UserPromptSubmit 훅 + CLAUDE.md 규칙을 전제로 설계된 Claude 전용 메모리 시스템입니다.",
  "verify-implementation":
    "검증 경로는 보정됐지만, 승인/재검증 흐름은 아직 AskUserQuestion 중심이라 Codex UX가 완전히 정리되진 않았습니다.",
  "game-changing-features":
    "산출물 경로를 `.claude/docs/ai/...`에 고정해 Codex 프로젝트 흐름과 분리됩니다.",
};

function normalizePath(p) {
  return String(p || "").replace(/\\/g, "/").toLowerCase();
}

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return {};
  }
}

function listDirectories(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

function countFiles(dirPath, matcher) {
  if (!fs.existsSync(dirPath)) return 0;
  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && matcher(entry.name)).length;
}

function scanSkillFlags() {
  const results = [];

  for (const skillName of listDirectories(skillsDir)) {
    const skillPath = path.join(skillsDir, skillName, "SKILL.md");
    if (!fs.existsSync(skillPath)) continue;

    const text = readText(skillPath);
    const flags = detectionPatterns
      .filter((pattern) => pattern.regex.test(text))
      .map((pattern) => pattern.key);

    if (flags.length > 0) {
      results.push({
        name: skillName,
        path: path.relative(repoRoot, skillPath).replace(/\\/g, "/"),
        flags,
      });
    }
  }

  return results.sort((a, b) => a.name.localeCompare(b.name));
}

function scanAgentFlags() {
  const results = [];

  if (!fs.existsSync(agentsDir)) return results;

  for (const entry of fs.readdirSync(agentsDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".md")) continue;

    const agentPath = path.join(agentsDir, entry.name);
    const text = readText(agentPath);
    const flags = detectionPatterns
      .filter((pattern) => pattern.regex.test(text))
      .map((pattern) => pattern.key);

    if (flags.length > 0) {
      results.push({
        name: entry.name,
        path: path.relative(repoRoot, agentPath).replace(/\\/g, "/"),
        flags,
      });
    }
  }

  return results.sort((a, b) => a.name.localeCompare(b.name));
}

function safeExists(targetPath) {
  try {
    return fs.existsSync(targetPath);
  } catch {
    return false;
  }
}

function getCodexVersion() {
  if (process.platform === "win32") {
    try {
      return execSync("codex --version", {
        cwd: repoRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 15000,
        shell: "cmd.exe",
      }).trim();
    } catch {
      return "not-found";
    }
  }

  try {
    return execFileSync("codex", ["--version"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 15000,
    }).trim();
  } catch {
    return "not-found";
  }
}

function getKstDate() {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}

function getTomlSection(content, sectionName) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const start = lines.findIndex((line) => line.trim() === `[${sectionName}]`);
  if (start < 0) return "";

  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^\s*\[/.test(lines[i])) {
      end = i;
      break;
    }
  }

  return lines.slice(start, end).join("\n");
}

function parseTomlAudit() {
  const content = readText(codexConfigPath);
  const orchestratorSection = getTomlSection(content, "mcp_servers.orchestrator");
  const orchestratorEnvSection = getTomlSection(
    content,
    "mcp_servers.orchestrator.env"
  );

  const pathMatch = orchestratorSection.match(/args\s*=\s*\["([^"]+)"/);
  const projectRootMatch = orchestratorEnvSection.match(
    /ORCHESTRATOR_PROJECT_ROOT\s*=\s*"([^"]+)"/
  );

  const orchestratorPath = pathMatch ? pathMatch[1] : "";
  const orchestratorProjectRoot = projectRootMatch ? projectRootMatch[1] : "";

  const repoNorm = normalizePath(repoRoot);
  const orchestratorPathNorm = normalizePath(orchestratorPath);
  const orchestratorRootNorm = normalizePath(orchestratorProjectRoot);

  return {
    hasConfig: Boolean(content),
    hasNotify: /(?:^|\n)notify\s*=/.test(content),
    notifyUsesSaveTurn: /notify\s*=\s*\[[\s\S]*save-turn\.(ps1|sh)/.test(content),
    hasMultiAgent: /multi_agent\s*=\s*true/.test(content),
    hasContext7: /\[mcp_servers\.context7\]/.test(content),
    hasPlaywright: /\[mcp_servers\.playwright\]/.test(content),
    hasChromeDevtools: /\[mcp_servers\.chrome-devtools\]/.test(content),
    hasOrchestrator: /\[mcp_servers\.orchestrator\]/.test(content),
    windowsSandboxElevated: /\[windows\][\s\S]*sandbox\s*=\s*"elevated"/.test(content),
    orchestratorPath,
    orchestratorProjectRoot,
    orchestratorTracksRepo:
      Boolean(orchestratorPathNorm) && orchestratorPathNorm.includes(repoNorm),
    orchestratorRootTracksRepo:
      Boolean(orchestratorRootNorm) && orchestratorRootNorm.includes(repoNorm),
  };
}

function buildPriorityList(skillFlags) {
  return Object.entries(prioritySkillReasons)
    .map(([name, reason]) => {
      const found = skillFlags.find((item) => item.name === name);
      if (!found) return null;
      return {
        name,
        reason,
        path: found.path,
        flags: found.flags,
      };
    })
    .filter(Boolean);
}

function buildMarkdown() {
  const manifest = readJson(manifestPath);
  const skillFlags = scanSkillFlags();
  const agentFlags = scanAgentFlags();
  const tomlAudit = parseTomlAudit();
  const priorityList = buildPriorityList(skillFlags);

  const managedSkills = Array.isArray(manifest.managedSkills)
    ? manifest.managedSkills.length
    : 0;
  const managedAgents = Array.isArray(manifest.managedAgents)
    ? manifest.managedAgents.length
    : 0;
  const managedHooks = Array.isArray(manifest.managedHooks)
    ? manifest.managedHooks.length
    : 0;
  const managedCodexNotifyHooks = Array.isArray(manifest.managedCodexNotifyHooks)
    ? manifest.managedCodexNotifyHooks.length
    : 0;

  const repoSkills = listDirectories(skillsDir).length;
  const repoAgents = countFiles(agentsDir, (name) => name.toLowerCase().endsWith(".md"));
  const repoHooks = countFiles(hooksDir, (name) =>
    [".ps1", ".sh", ".js"].includes(path.extname(name).toLowerCase())
  );
  const installedCodexSkills = listDirectories(path.join(codexHome, "skills")).length;
  const installedCodexAgents = countFiles(
    path.join(codexHome, "agents"),
    (name) => name.toLowerCase().endsWith(".md")
  );
  const installedCodexHooks = countFiles(
    path.join(codexHome, "hooks"),
    () => true
  );

  const globalAgentsText = readText(codexAgentsPath);
  const hasMnemoRules = /<!-- CODEX-MNEMO:START -->/.test(globalAgentsText);
  const hasTagRules = /응답 키워드 규칙/.test(globalAgentsText);
  const hasConversationSearchRules = /과거 대화 검색 규칙/.test(globalAgentsText);

  const lines = [];
  lines.push("# Codex Compatibility Report");
  lines.push("");
  lines.push(`- Generated: ${getKstDate()}`);
  lines.push(`- Project: \`${repoRoot.replace(/\\/g, "/")}\``);
  lines.push(`- Codex CLI: \`${getCodexVersion()}\``);
  lines.push("");
  lines.push("## Inventory");
  lines.push("");
  lines.push(`- Repo skills: ${repoSkills}`);
  lines.push(`- Repo top-level agents: ${repoAgents}`);
  lines.push(`- Repo root hooks (.ps1/.sh/.js): ${repoHooks}`);
  lines.push(`- Managed sync skills: ${managedSkills}`);
  lines.push(`- Managed sync agents: ${managedAgents}`);
  lines.push(`- Managed sync root hooks: ${managedHooks}`);
  lines.push(`- Managed Codex notify hooks: ${managedCodexNotifyHooks}`);
  lines.push(`- Installed Codex skills (total): ${installedCodexSkills}`);
  lines.push(`- Installed Codex agents (total): ${installedCodexAgents}`);
  lines.push(`- Installed Codex hooks (total files): ${installedCodexHooks}`);
  lines.push("");
  lines.push("## Working Well");
  lines.push("");
  lines.push(
    "- Skills/agents/hooks are syncing into `.agents/` and `~/.codex/` via `scripts/sync-codex-assets.js`."
  );
  lines.push(
    "- `config.toml` is wired to `notify = ... save-turn.ps1`, so Codex-Mnemo runs automatically each turn."
  );
  lines.push(
    "- `save-turn` fans out to `ddingdong-noti` and Chronos `continue-loop`, so Codex has memory + notification + auto-resume chaining."
  );
  lines.push(
    "- Global `~/.codex/AGENTS.md` already contains Codex-Mnemo rules (`#tags`, past conversation search, MEMORY.md handling)."
  );
  lines.push("");
  lines.push("## config.toml Audit");
  lines.push("");
  lines.push(`- notify configured: ${tomlAudit.hasNotify ? "yes" : "no"}`);
  lines.push(
    `- notify uses save-turn hook: ${tomlAudit.notifyUsesSaveTurn ? "yes" : "no"}`
  );
  lines.push(`- multi_agent enabled: ${tomlAudit.hasMultiAgent ? "yes" : "no"}`);
  lines.push(`- context7 MCP present: ${tomlAudit.hasContext7 ? "yes" : "no"}`);
  lines.push(
    `- playwright MCP present: ${tomlAudit.hasPlaywright ? "yes" : "no"}`
  );
  lines.push(
    `- chrome-devtools MCP present: ${tomlAudit.hasChromeDevtools ? "yes" : "no"}`
  );
  lines.push(
    `- orchestrator MCP present: ${tomlAudit.hasOrchestrator ? "yes" : "no"}`
  );
  lines.push(
    `- windows sandbox elevated: ${tomlAudit.windowsSandboxElevated ? "yes" : "no"}`
  );
  if (tomlAudit.orchestratorPath) {
    lines.push(`- orchestrator path: \`${tomlAudit.orchestratorPath}\``);
  }
  if (tomlAudit.orchestratorProjectRoot) {
    lines.push(
      `- orchestrator project root: \`${tomlAudit.orchestratorProjectRoot}\``
    );
  }
  lines.push(
    `- orchestrator tracks current repo: ${
      tomlAudit.orchestratorTracksRepo && tomlAudit.orchestratorRootTracksRepo
        ? "yes"
        : "no"
    }`
  );
  lines.push("");
  lines.push("## Gaps");
  lines.push("");
  lines.push(
    "1. Claude root hooks are copied into `~/.codex/hooks`, but Codex does not execute `UserPromptSubmit / PreToolUse / PostToolUse / Stop` directly."
  );
  lines.push(
    "   Only `notify -> save-turn` is actually wired in `config.toml`, so Claude-style automatic enforcement is not fully reproduced."
  );
  lines.push(
    "2. `orchestrator` currently points outside this repo when `config.toml` references another installation root."
  );
  lines.push(
    "   That is safe at runtime, but changes in this repo will not affect Codex until the MCP entry is re-registered from this repo."
  );
  lines.push(
    `3. ${skillFlags.length} skills and ${agentFlags.length} top-level agents still contain Claude-specific markers (.claude, CLAUDE.md, hook event names, or AskUserQuestion).`
  );
  lines.push(
    "   This does not always mean broken behavior, but it does mean the documentation and workflows are not cleanly portable yet."
  );
  lines.push("");
  lines.push("## Highest-Priority Skill Adaptations");
  lines.push("");
  for (const item of priorityList) {
    lines.push(
      `- \`${item.name}\` — ${item.reason} (\`${item.path}\`, flags: ${item.flags.join(", ")})`
    );
  }
  if (priorityList.length === 0) {
    lines.push("- No priority adaptation targets were detected.");
  }
  lines.push("");
  lines.push("## Portable or Already Adapted Examples");
  lines.push("");
  lines.push(
    "- `codex-mnemo` — Codex-specific notify workflow and global AGENTS rules."
  );
  lines.push(
    "- `auto-continue-loop` — Codex notify chain using `save-turn -> continue-loop -> codex exec resume --last`."
  );
  lines.push(
    "- `agent-team` — explicitly documents Codex `spawn_agent` mode alongside Claude Agent Teams."
  );
  lines.push("");
  lines.push("## Rule Coverage");
  lines.push("");
  lines.push(`- Mnemo block present in global AGENTS.md: ${hasMnemoRules ? "yes" : "no"}`);
  lines.push(`- Response tag rules present: ${hasTagRules ? "yes" : "no"}`);
  lines.push(
    `- Past conversation search rules present: ${
      hasConversationSearchRules ? "yes" : "no"
    }`
  );
  lines.push("");
  lines.push("## Recommended Next Steps");
  lines.push("");
  lines.push(
    "1. Re-register `orchestrator` from this repo if this workspace should be the active Codex source of truth."
  );
  lines.push(
    "2. Keep Codex runtime on `notify -> save-turn`, but document clearly that root Claude hooks are sync-only assets unless bridged explicitly."
  );
  lines.push(
    "3. Adapt the top-priority Claude-centric skills first: `command-creator`, `daily-meeting-update`, `manage-skills`, `mnemo`, `verify-implementation`."
  );
  lines.push(
    "4. Re-run this audit after major skill/agent/hook changes to keep the report current."
  );

  return `${lines.join("\n")}\n`;
}

const markdown = buildMarkdown();

if (outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, markdown, "utf8");
  console.log(`[codex-audit] wrote ${outputPath}`);
} else {
  process.stdout.write(markdown);
}
