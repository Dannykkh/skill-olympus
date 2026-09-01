#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync, execSync } = require("child_process");
const { collectAgentFiles } = require("./agent-files");

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

const manifestPath = path.join(
  codexHome,
  ".codex-sync-manifest.json",
);
const codexConfigPath = path.join(codexHome, "config.toml");
const codexAgentsPath = path.join(codexHome, "AGENTS.md");
const codexHooksDir = path.join(codexHome, "hooks");

const skillsDir = path.join(repoRoot, "skills");
const agentsDir = path.join(repoRoot, "agents");
const hooksDir = path.join(repoRoot, "hooks");
const repoAgentFiles = collectAgentFiles(agentsDir, skillsDir);

const detectionPatterns = [
  {
    key: "claude_path",
    label: ".claude path",
    regex: /\.claude[\\/]|~\/\.claude/i,
    severity: "medium",
  },
  {
    key: "claude_doc",
    label: "CLAUDE.md",
    regex: /\bCLAUDE\.md\b/i,
    severity: "low",
  },
  {
    key: "claude_hooks",
    label: "Claude hook events",
    regex:
      /\b(UserPromptSubmit|PreToolUse|PostToolUse|SessionStart)\b|\bStop(?=\s*(?:hook|event|훅|이벤트|:|`))/i,
    severity: "medium",
  },
  {
    key: "ask_user",
    label: "AskUserQuestion",
    regex: /\bAskUserQuestion(?:Tool)?\b/,
    severity: "high",
  },
  {
    key: "removed_claude_team_lifecycle",
    label: "removed Claude team lifecycle tools",
    regex: /\b(?:TeamCreate|TeamDelete)\s*\(/,
    severity: "high",
  },
  {
    key: "claude_team_coordination",
    label: "Claude-specific team coordination tools",
    regex: /\b(SendMessage|TaskCreate|TaskUpdate)\b/,
    severity: "medium",
  },
  {
    key: "legacy_claude_task_alias",
    label: "legacy Claude Task alias",
    regex: /\bTask\s*\(/,
    severity: "medium",
  },
  {
    key: "invalid_question_params",
    label: "non-portable structured question params",
    regex: /\bmultiSelect\b/,
    severity: "high",
  },
  {
    key: "claude_command_path",
    label: "Claude command path",
    regex: /\.claude[\\/]commands|~\/\.claude\/commands/i,
    severity: "medium",
  },
  {
    key: "claude_memory_path",
    label: "Claude memory path",
    regex: /\.claude[\\/]memory|~\/\.claude\/memory/i,
    severity: "medium",
  },
];

const prioritySkillReasons = {
  "daily-meeting-update":
    "Codex/Antigravity fallback을 문서화했지만, 여전히 Claude 히스토리와 구조화된 질문 UX 비중이 큽니다.",
  "manage-skills":
    "경로는 `skills/`와 `AGENTS.md` 기준으로 보정됐지만, 확인 단계와 일부 문구가 아직 Claude식 상호작용에 가깝습니다.",
  mnemo:
    "Stop/UserPromptSubmit 훅 + CLAUDE.md 규칙을 전제로 설계된 Claude 전용 메모리 시스템입니다.",
  "verify-implementation":
    "검증 경로는 보정됐지만, 승인/재검증 흐름은 아직 AskUserQuestion 중심이라 Codex UX가 완전히 정리되진 않았습니다.",
  "game-changing-features":
    "산출물 경로를 `.claude/docs/ai/...`에 고정해 Codex 프로젝트 흐름과 분리됩니다.",
};

const adaptedCodexSkillNames = new Set([
  "agent-team-codex",
  "auto-continue-loop",
  "codex",
  "codex-mnemo",
]);

function normalizePath(p) {
  return String(p || "")
    .replace(/\\/g, "/")
    .toLowerCase();
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

function listMarkdownFiles(dirPath) {
  const results = [];
  if (!fs.existsSync(dirPath)) return results;

  const stack = [dirPath];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        const lowerName = entry.name.toLowerCase();
        if (
          lowerName === "node_modules" ||
          lowerName === ".git" ||
          lowerName === "conversations"
        ) {
          continue;
        }
        stack.push(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
        results.push(fullPath);
      }
    }
  }

  return results.sort((a, b) => a.localeCompare(b));
}

function findPatternLocations(text, pattern, relPath) {
  const locations = [];
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const flags = pattern.regex.flags.replace(/g/g, "");
  const lineRegex = new RegExp(pattern.regex.source, flags);

  for (let i = 0; i < lines.length; i += 1) {
    if (!lineRegex.test(lines[i])) continue;
    locations.push(`${relPath}:${i + 1}`);
    if (locations.length >= 3) break;
  }

  return locations;
}

function scanMarkdownFilesForMarkers(filePaths) {
  const markerMap = new Map();

  for (const filePath of filePaths) {
    const relPath = path.relative(repoRoot, filePath).replace(/\\/g, "/");
    const text = readText(filePath);

    for (const pattern of detectionPatterns) {
      const locations = findPatternLocations(text, pattern, relPath);
      if (locations.length === 0) continue;

      if (!markerMap.has(pattern.key)) {
        markerMap.set(pattern.key, {
          key: pattern.key,
          label: pattern.label,
          severity: pattern.severity,
          locations: [],
        });
      }
      markerMap.get(pattern.key).locations.push(...locations);
    }
  }

  return Array.from(markerMap.values()).sort((a, b) => {
    const severityRank = { high: 0, medium: 1, low: 2 };
    const severityDiff =
      severityRank[a.severity] - severityRank[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return a.key.localeCompare(b.key);
  });
}

function highestSeverity(markers) {
  if (markers.some((marker) => marker.severity === "high")) return "high";
  if (markers.some((marker) => marker.severity === "medium")) return "medium";
  if (markers.some((marker) => marker.severity === "low")) return "low";
  return "none";
}

function classifySkill(item) {
  if (item.installedInCodex === false) return "excluded-from-codex";
  if (adaptedCodexSkillNames.has(item.name)) return "codex-adapted";

  const severity = highestSeverity(item.markers);
  if (severity === "high") return "needs-adapter";
  if (severity === "medium") return "needs-review";
  return "doc-marker";
}

function classifyAgent(item) {
  const severity = highestSeverity(item.markers);
  if (severity === "high") return "needs-adapter";
  if (severity === "medium") return "needs-review";
  return "doc-marker";
}

function markerSummary(item) {
  return item.markers
    .map((marker) => {
      const locations = marker.locations.slice(0, 2).join(", ");
      return `${marker.key} (${locations})`;
    })
    .join("; ")
    .replace(/\|/g, "\\|");
}

function scanSkillFlags(managedSkillNames = null) {
  const results = [];

  for (const skillName of listDirectories(skillsDir)) {
    const skillDir = path.join(skillsDir, skillName);
    const skillPath = path.join(skillDir, "SKILL.md");
    if (!fs.existsSync(skillPath)) continue;

    const markers = scanMarkdownFilesForMarkers(listMarkdownFiles(skillDir));
    const flags = markers.map((marker) => marker.key);

    if (flags.length > 0) {
      const item = {
        name: skillName,
        path: path.relative(repoRoot, skillPath).replace(/\\/g, "/"),
        flags,
        markers,
        installedInCodex: managedSkillNames
          ? managedSkillNames.has(skillName)
          : null,
      };
      item.classification = classifySkill(item);
      results.push(item);
    }
  }

  return results.sort((a, b) => a.name.localeCompare(b.name));
}

function scanAgentFlags(managedAgentNames = null) {
  const results = [];

  for (const [agentName, agentPath] of repoAgentFiles.entries()) {
    const markers = scanMarkdownFilesForMarkers([agentPath]);
    const flags = markers.map((marker) => marker.key);

    if (flags.length > 0) {
      const item = {
        name: agentName,
        path: path.relative(repoRoot, agentPath).replace(/\\/g, "/"),
        flags,
        markers,
        installedInCodex: managedAgentNames
          ? managedAgentNames.has(agentName)
          : null,
      };
      item.classification = classifyAgent(item);
      results.push(item);
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

function filesMatch(src, dest) {
  try {
    const srcStat = fs.statSync(src);
    const destStat = fs.statSync(dest);
    if (!srcStat.isFile() || !destStat.isFile()) return false;
    if (srcStat.size !== destStat.size) return false;
    return fs.readFileSync(src).equals(fs.readFileSync(dest));
  } catch {
    return false;
  }
}

function quoteSh(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function commandExists(command) {
  if (!command) return false;
  if (/[/:\\]/.test(command)) {
    return safeExists(path.normalize(command));
  }

  try {
    if (process.platform === "win32") {
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
    if (process.platform === "win32" && !/\.(exe|cmd|bat)$/i.test(command)) {
      return commandExists(`${command}.exe`);
    }
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
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  for (let i = 0; i < lines.length; i += 1) {
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
  for (let i = 0; i < notifyArgs.length; i += 1) {
    if (/^-File$/i.test(notifyArgs[i]) && notifyArgs[i + 1]) {
      return notifyArgs[i + 1];
    }
  }
  return notifyArgs.find((arg) => /\.(ps1|sh)$/i.test(arg)) || "";
}

function notifyChainsSaveTurn(notifyArgs) {
  if (notifyArgs.some((arg) => /save-turn\.(ps1|sh)/i.test(arg))) {
    return true;
  }

  const scriptPath = getNotifyScriptPath(notifyArgs);
  if (!scriptPath) return false;
  return /save-turn\.(ps1|sh)/i.test(readText(path.normalize(scriptPath)));
}

function parseTomlAudit(manifest = {}) {
  const content = readText(codexConfigPath);
  const notifyArgs = readNotifyArgs(content);
  const orchestratorSection = getTomlSection(
    content,
    "mcp_servers.orchestrator",
  );
  const orchestratorEnvSection = getTomlSection(
    content,
    "mcp_servers.orchestrator.env",
  );

  const pathMatch = orchestratorSection.match(/args\s*=\s*\["([^"]+)"/);
  const projectRootMatch = orchestratorEnvSection.match(
    /ORCHESTRATOR_PROJECT_ROOT\s*=\s*"([^"]+)"/,
  );

  const orchestratorPath = pathMatch ? pathMatch[1] : "";
  const orchestratorProjectRoot = projectRootMatch ? projectRootMatch[1] : "";

  const repoNorm = normalizePath(repoRoot);
  const orchestratorPathNorm = normalizePath(orchestratorPath);
  const orchestratorRootNorm = normalizePath(orchestratorProjectRoot);
  const codexOrchestratorRootNorm = normalizePath(
    path.join(codexHome, ".olympus", "runtime-modules", "orchestrator"),
  );
  const repoOrchestratorServer = path.join(
    repoRoot,
    "skills",
    "orchestrator",
    "mcp-server",
    "dist",
    "index.js",
  );
  const managedSkills = new Set(
    Array.isArray(manifest.managedSkills) ? manifest.managedSkills : [],
  );
  const orchestratorTracksManagedInstall =
    Boolean(orchestratorPathNorm) &&
    Boolean(codexOrchestratorRootNorm) &&
    orchestratorPathNorm.startsWith(codexOrchestratorRootNorm) &&
    fs.existsSync(path.join(codexHome, ".olympus", "runtime-modules", "orchestrator", "SKILL.md"));
  const orchestratorManagedInstallFresh =
    orchestratorTracksManagedInstall &&
    filesMatch(repoOrchestratorServer, path.normalize(orchestratorPath));
  const orchestratorTracksCurrentSource =
    (Boolean(orchestratorPathNorm) && orchestratorPathNorm.includes(repoNorm)) ||
    orchestratorManagedInstallFresh;

  return {
    hasConfig: Boolean(content),
    hasNotify: /(?:^|\n)notify\s*=/.test(content),
    notifyUsesSaveTurn: notifyChainsSaveTurn(notifyArgs),
    notifyCommand: notifyArgs[0] || "",
    notifyCommandExecutable:
      notifyArgs.length > 0 ? commandExists(notifyArgs[0]) : false,
    notifyScriptPath: getNotifyScriptPath(notifyArgs),
    hasMultiAgent: /multi_agent\s*=\s*true/.test(content),
    hasContext7: /\[mcp_servers\.context7\]/.test(content),
    hasPlaywright: /\[mcp_servers\.playwright\]/.test(content),
    hasChromeDevtools: /\[mcp_servers\.chrome-devtools\]/.test(content),
    hasOrchestrator: /\[mcp_servers\.orchestrator\]/.test(content),
    windowsSandboxElevated: /\[windows\][\s\S]*sandbox\s*=\s*"elevated"/.test(
      content,
    ),
    hasHookBridgeInstalled: safeExists(
      path.join(codexHooksDir, "codex-hook-bridge.js"),
    ),
    orchestratorPath,
    orchestratorProjectRoot,
    orchestratorTracksRepo:
      Boolean(orchestratorPathNorm) && orchestratorPathNorm.includes(repoNorm),
    orchestratorRootTracksRepo:
      Boolean(orchestratorRootNorm) && orchestratorRootNorm.includes(repoNorm),
    orchestratorTracksManagedInstall,
    orchestratorManagedInstallFresh,
    orchestratorTracksCurrentSource,
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
  const managedSkillNames = new Set(
    Array.isArray(manifest.managedSkills) ? manifest.managedSkills : [],
  );
  const managedAgentNames = new Set(
    Array.isArray(manifest.managedAgents) ? manifest.managedAgents : [],
  );
  const skillFlags = scanSkillFlags(managedSkillNames);
  const agentFlags = scanAgentFlags(managedAgentNames);
  const tomlAudit = parseTomlAudit(manifest);
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
  const managedCodexNotifyHooks = Array.isArray(
    manifest.managedCodexNotifyHooks,
  )
    ? manifest.managedCodexNotifyHooks.length
    : 0;

  const repoSkills = listDirectories(skillsDir).length;
  const repoTopLevelAgents = countFiles(agentsDir, (name) =>
    name.toLowerCase().endsWith(".md"),
  );
  const repoAgentSources = repoAgentFiles.size;
  const repoHooks = countFiles(hooksDir, (name) =>
    [".ps1", ".sh", ".js"].includes(path.extname(name).toLowerCase()),
  );
  const installedCodexSkills = listDirectories(
    path.join(codexHome, "skills"),
  ).length;
  const dormantCodexSkillSources = listDirectories(
    path.join(codexHome, ".olympus", "source-skills"),
  ).length;
  const installedCodexAgentSources = countFiles(
    path.join(codexHome, "agents"),
    (name) => name.toLowerCase().endsWith(".md"),
  );
  const installedCodexCustomAgents = countFiles(
    path.join(codexHome, "agents"),
    (name) => name.toLowerCase().endsWith(".toml"),
  );
  const installedCodexHooks = countFiles(
    path.join(codexHome, "hooks"),
    () => true,
  );

  const globalAgentsText = readText(codexAgentsPath);
  const hasMnemoRules = /<!-- CODEX-MNEMO:START -->/.test(globalAgentsText);
  const hasTagRules = /응답 키워드 규칙/.test(globalAgentsText);
  const hasConversationSearchRules = /과거 대화 검색 규칙/.test(
    globalAgentsText,
  );
  const hasOrchestratorModeRules = /오케스트레이터 모드 자동 해석/.test(
    globalAgentsText,
  );

  const installedSkillFlags = skillFlags.filter(
    (item) => item.installedInCodex !== false,
  );
  const excludedSkillFlags = skillFlags.filter(
    (item) => item.installedInCodex === false,
  );
  const highInstalledSkillFlags = installedSkillFlags.filter(
    (item) =>
      highestSeverity(item.markers) === "high" &&
      item.classification !== "codex-adapted",
  );
  const reviewInstalledSkillFlags = installedSkillFlags.filter(
    (item) =>
      highestSeverity(item.markers) === "medium" &&
      item.classification !== "codex-adapted",
  );
  const highAgentFlags = agentFlags.filter(
    (item) => highestSeverity(item.markers) === "high",
  );

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
  lines.push(`- Repo agent source files: ${repoAgentSources} (${repoTopLevelAgents} top-level + ${repoAgentSources - repoTopLevelAgents} skill-owned)`);
  lines.push(`- Repo root hooks (.ps1/.sh/.js): ${repoHooks}`);
  lines.push(`- Managed sync skills: ${managedSkills}`);
  lines.push(`- Dormant Olympus skill sources: ${dormantCodexSkillSources}`);
  lines.push(`- Managed sync agent source files: ${managedAgents}`);
  lines.push(`- Managed sync root hooks: ${managedHooks}`);
  lines.push(`- Managed Codex notify hooks: ${managedCodexNotifyHooks}`);
  lines.push(`- Installed Codex skills (total): ${installedCodexSkills}`);
  lines.push(`- Installed Codex agent source files (.md): ${installedCodexAgentSources}`);
  lines.push(`- Effective Codex custom-agent definitions (.toml): ${installedCodexCustomAgents}`);
  lines.push(`- Installed Codex hooks (total files): ${installedCodexHooks}`);
  lines.push("");
  lines.push("## Working Well");
  lines.push("");
  lines.push(
    "- The fail-closed allowlist syncs only core harnesses and Codex adapters into `~/.codex/skills/`. Other compatible sources remain outside discovery in `~/.codex/.olympus/source-skills/` and are routed by exact catalog path. Duplicate project mirrors are opt-in via `--include-project-skills` and `--include-project-agents`.",
  );
  lines.push(
    "- Agent Markdown files remain in the repository as source references only; the default sync does not install them or count them as effective Codex custom agents.",
  );
  lines.push(
    "- `config.toml` notify is wired directly or through a wrapper to `save-turn`, so Codex-Mnemo runs automatically each turn.",
  );
  lines.push(
    "- `save-turn` fans out to Chronos `continue-loop` and the Codex hook bridge, so Codex has memory + auto-resume + file-hook enforcement chaining without desktop notifications.",
  );
  lines.push(
    "- Global `~/.codex/AGENTS.md` already contains Codex-Mnemo rules (`#tags`, past conversation search, MEMORY.md handling).",
  );
  lines.push("");
  lines.push("## config.toml Audit");
  lines.push("");
  lines.push(`- notify configured: ${tomlAudit.hasNotify ? "yes" : "no"}`);
  lines.push(
    `- notify uses save-turn hook: ${tomlAudit.notifyUsesSaveTurn ? "yes" : "no"}`,
  );
  if (tomlAudit.notifyCommand) {
    lines.push(`- notify command: \`${tomlAudit.notifyCommand}\``);
    lines.push(
      `- notify command executable: ${tomlAudit.notifyCommandExecutable ? "yes" : "no"}`,
    );
  }
  if (tomlAudit.notifyScriptPath) {
    lines.push(`- notify script: \`${tomlAudit.notifyScriptPath}\``);
  }
  lines.push(
    `- multi_agent enabled: ${tomlAudit.hasMultiAgent ? "yes" : "no"}`,
  );
  lines.push(`- context7 MCP present: ${tomlAudit.hasContext7 ? "yes" : "no"}`);
  lines.push(
    `- playwright MCP present: ${tomlAudit.hasPlaywright ? "yes" : "no"}`,
  );
  lines.push(
    `- chrome-devtools MCP present: ${tomlAudit.hasChromeDevtools ? "yes" : "no"}`,
  );
  lines.push(
    `- orchestrator MCP present: ${tomlAudit.hasOrchestrator ? "yes" : "no"}`,
  );
  lines.push(
    `- windows sandbox elevated: ${tomlAudit.windowsSandboxElevated ? "yes" : "no"}`,
  );
  lines.push(
    `- codex hook bridge installed: ${tomlAudit.hasHookBridgeInstalled ? "yes" : "no"}`,
  );
  if (tomlAudit.orchestratorPath) {
    lines.push(`- orchestrator path: \`${tomlAudit.orchestratorPath}\``);
  }
  if (tomlAudit.orchestratorProjectRoot) {
    lines.push(
      `- orchestrator project root: \`${tomlAudit.orchestratorProjectRoot}\``,
    );
  }
  lines.push(
    `- orchestrator target: ${
      tomlAudit.orchestratorTracksRepo
        ? "current repo"
        : tomlAudit.orchestratorTracksManagedInstall
          ? "managed Codex runtime mirror"
          : "external"
    }`,
  );
  if (tomlAudit.orchestratorTracksManagedInstall) {
    lines.push(
      `- orchestrator managed install fresh: ${
        tomlAudit.orchestratorManagedInstallFresh ? "yes" : "no"
      }`,
    );
  }
  lines.push(
    `- orchestrator tracks current source: ${
      tomlAudit.orchestratorTracksCurrentSource
        ? "yes"
        : "no"
    }`,
  );
  lines.push("");
  lines.push("## Gaps");
  lines.push("");
  if (managedAgentNames.size === 0 && installedCodexAgentSources === 0) {
    lines.push(
      `1. No Olympus custom agents are installed by default. Codex built-in subagents and on-demand skills remain available; effective custom agents: ${installedCodexCustomAgents}.`,
    );
  } else {
    lines.push(
      `1. Codex custom agents require \`~/.codex/agents/*.toml\` definitions. The ${installedCodexAgentSources} installed Markdown files are inert source references; effective custom agents: ${installedCodexCustomAgents}.`,
    );
  }
  lines.push(
    "2. Codex does not expose Claude's native `UserPromptSubmit / PreToolUse / PostToolUse / Stop` lifecycle directly.",
  );
  lines.push(
    "   File-oriented hooks are now bridged via `notify -> save-turn -> codex-hook-bridge`, but the timing still differs from Claude and true pre-write blocking is not identical.",
  );
  if (!tomlAudit.orchestratorTracksCurrentSource) {
    lines.push(
      "2. `orchestrator` currently points outside this repo when `config.toml` references another installation root.",
    );
    lines.push(
      "   Re-run `node scripts/sync-codex-assets.js` or re-register the MCP entry from this repo before relying on local orchestrator changes.",
    );
  } else {
    lines.push(
      "3. `orchestrator` runs from the non-discovery Codex runtime mirror synchronized from the current source; it does not re-enter the active skill registry.",
    );
  }
  lines.push(
    `4. ${highInstalledSkillFlags.length} Codex-installed skills and ${highAgentFlags.length} source-only agent files contain high-risk markers (vendor-only question tools, removed Claude team lifecycle calls, or non-portable question parameters).`,
  );
  lines.push(
    `   Additional review markers: ${reviewInstalledSkillFlags.length} installed skills, ${excludedSkillFlags.length} Codex-excluded skills. Excluded skills are not immediate Codex runtime risk but should stay documented as CLI-specific.`,
  );
  lines.push("");
  lines.push("## Compatibility Classification");
  lines.push("");
  lines.push(
    "- The audit scans every Markdown file under each skill directory, not only `SKILL.md`.",
  );
  lines.push(
    `- Codex-installed skills with high-risk markers: ${highInstalledSkillFlags.length}`,
  );
  lines.push(
    `- Codex-installed skills with review markers: ${reviewInstalledSkillFlags.length}`,
  );
  lines.push(
    `- Codex-excluded skills with markers: ${excludedSkillFlags.length}`,
  );
  lines.push(`- Source-only agents with high-risk markers: ${highAgentFlags.length}`);
  lines.push("");

  const criticalRows = highInstalledSkillFlags
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 40);
  lines.push("### Installed Skills Needing Runtime Adapters");
  lines.push("");
  if (criticalRows.length === 0) {
    lines.push("- None detected.");
  } else {
    lines.push("| Skill | Classification | Markers |");
    lines.push("|---|---|---|");
    for (const item of criticalRows) {
      lines.push(
        `| \`${item.name}\` | ${item.classification} | ${markerSummary(item)} |`,
      );
    }
  }
  lines.push("");

  lines.push("### Agents Needing Runtime Adapters");
  lines.push("");
  if (managedAgentNames.size === 0) {
    lines.push("- None detected.");
  } else {
    lines.push("| Agent source | Classification | Reason |");
    lines.push("|---|---|---|");
    for (const name of Array.from(managedAgentNames).sort((a, b) => a.localeCompare(b))) {
      lines.push(
        `| \`${name.replace(/\.md$/i, "")}\` | source-only-in-codex | Markdown frontmatter must be translated to a Codex \`.toml\` custom-agent definition before runtime use |`,
      );
    }
  }
  lines.push("");

  const excludedRows = excludedSkillFlags
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
  lines.push("### Codex-Excluded Skills With Markers");
  lines.push("");
  if (excludedRows.length === 0) {
    lines.push("- None detected.");
  } else {
    lines.push("| Skill | Reason | Markers |");
    lines.push("|---|---|---|");
    for (const item of excludedRows) {
      lines.push(
        `| \`${item.name}\` | excluded from Codex sync | ${markerSummary(item)} |`,
      );
    }
  }
  lines.push("");
  lines.push("## Highest-Priority Skill Adaptations");
  lines.push("");
  for (const item of priorityList) {
    lines.push(
      `- \`${item.name}\` — ${item.reason} (\`${item.path}\`, flags: ${item.flags.join(", ")})`,
    );
  }
  if (priorityList.length === 0) {
    lines.push("- No priority adaptation targets were detected.");
  }
  lines.push("");
  lines.push("## Portable or Already Adapted Examples");
  lines.push("");
  lines.push(
    "- `codex-mnemo` — Codex-specific notify workflow and global AGENTS rules.",
  );
  lines.push(
    "- `auto-continue-loop` — Codex notify chain using `save-turn -> continue-loop -> codex exec resume --last`.",
  );
  lines.push(
    "- `agent-team-codex` — Codex-native adapter for the shared agent-team contract; the common `agent-team` package is excluded from Codex sync to avoid duplicate routing.",
  );
  lines.push("");
  lines.push("## Rule Coverage");
  lines.push("");
  lines.push(
    `- Mnemo block present in global AGENTS.md: ${hasMnemoRules ? "yes" : "no"}`,
  );
  lines.push(`- Response tag rules present: ${hasTagRules ? "yes" : "no"}`);
  lines.push(
    `- Past conversation search rules present: ${
      hasConversationSearchRules ? "yes" : "no"
    }`,
  );
  lines.push(
    `- Orchestrator mode auto-interpretation rules present: ${
      hasOrchestratorModeRules ? "yes" : "no"
    }`,
  );
  lines.push("");
  lines.push("## Recommended Next Steps");
  lines.push("");
  lines.push(
    "1. Keep the Codex hook bridge installed and treat `save-turn` as the single notify entrypoint for parity work.",
  );
  lines.push(
    "2. Keep Codex runtime on `notify -> save-turn`, but document clearly which hook behaviors are native and which are bridged.",
  );
  lines.push(
    "3. Keep the default custom-agent registry empty. Add a Codex `.toml` adapter only when a future agent proves a unique runtime tool or state contract that built-in subagents and an on-demand skill cannot provide.",
  );
  lines.push(
    "4. Treat remaining review markers as documentation cleanup, not immediate Codex breakage. Prioritize the current report's installed-skill rows and Claude-only memory documentation when touching those skills next.",
  );
  lines.push(
    "5. Re-run this audit after major skill/agent/hook changes to keep the report current.",
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
