#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT_FILE = path.join(ROOT, "docs", "codex-compatibility-report.md");

const SKILL_MANUAL_CATEGORY = {
  "codex-mnemo": "codex-ready",
  orchestrator: "codex-ready-manual",
  "agent-team": "claude-only",
  mnemo: "claude-only",
  "gemini-mnemo": "other-cli",
};

const CLAUDE_PATTERNS = [
  /claude mcp add/i,
  /claude mcp get/i,
  /claude mcp remove/i,
  /~\/\.claude/i,
  /\.claude[\\/]/i,
  /CLAUDE\.md/i,
  /\bUserPromptSubmit\b/i,
  /\bPreToolUse\b/i,
  /\bPostToolUse\b/i,
  /\bSessionStart\b/i,
  /\bSessionEnd\b/i,
  /\bSubagentStop\b/i,
  /\bPreCompact\b/i,
  /\bteammateMode\b/i,
  /\bCLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS\b/i,
];

const CODEX_PATTERNS = [
  /codex mcp/i,
  /~\/\.codex/i,
  /\.codex[\\/]/i,
  /\bnotify\b/i,
  /agent-turn-complete/i,
];

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function hasAnyPattern(text, patterns) {
  return patterns.some((p) => p.test(text));
}

function listSkills() {
  const skillsDir = path.join(ROOT, "skills");
  if (!fs.existsSync(skillsDir)) return [];

  return fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => fs.existsSync(path.join(skillsDir, name, "SKILL.md")))
    .sort();
}

function classifySkill(name) {
  if (SKILL_MANUAL_CATEGORY[name]) {
    return SKILL_MANUAL_CATEGORY[name];
  }

  const skillMd = readText(path.join(ROOT, "skills", name, "SKILL.md"));
  const installJsPath = path.join(ROOT, "skills", name, "install.js");
  const installJs = readText(installJsPath);
  const hasInstall = fs.existsSync(installJsPath);

  const hasClaudeRef = hasAnyPattern(skillMd, CLAUDE_PATTERNS);
  const hasCodexRef = hasAnyPattern(skillMd, CODEX_PATTERNS);

  const installClaudeRef =
    hasInstall &&
    hasAnyPattern(installJs, [
      /claude mcp/i,
      /\.claude/i,
      /settings\.json/i,
      /CLAUDE\.md/i,
    ]);

  const installCodexRef =
    hasInstall &&
    hasAnyPattern(installJs, [/codex mcp/i, /\.codex/i, /config\.toml/i, /\bnotify\b/i]);

  if (installCodexRef) return "codex-ready";
  if (installClaudeRef && !installCodexRef) return "needs-adaptation";
  if (hasClaudeRef && !hasCodexRef) return "needs-adaptation";
  return "portable";
}

function listAgents() {
  const agentsDir = path.join(ROOT, "agents");
  if (!fs.existsSync(agentsDir)) return [];
  return fs
    .readdirSync(agentsDir, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.toLowerCase().endsWith(".md"))
    .map((d) => d.name)
    .sort();
}

function listHooks(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => d.name)
    .sort();
}

function listMcpConfigs() {
  const dir = path.join(ROOT, "mcp-configs");
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith(".json"))
    .map((d) => {
      const filePath = path.join(dir, d.name);
      const json = JSON.parse(readText(filePath) || "{}");
      return {
        name: json.name || d.name.replace(/\.json$/, ""),
        requiresApiKey: !!json.requiresApiKey,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function byCategory(skills) {
  const map = new Map();
  for (const s of skills) {
    if (!map.has(s.category)) map.set(s.category, []);
    map.get(s.category).push(s.name);
  }
  for (const [, names] of map) names.sort();
  return map;
}

function renderCategorySection(title, names) {
  if (!names || names.length === 0) return `### ${title}\n- (none)\n`;
  return `### ${title}\n- ${names.join(", ")}\n`;
}

function main() {
  const now = new Date();
  const generatedAt = now.toLocaleDateString("sv-SE");

  const agents = listAgents();
  const skills = listSkills().map((name) => ({ name, category: classifySkill(name) }));
  const hooks = listHooks(path.join(ROOT, "hooks"));
  const codexHooks = listHooks(path.join(ROOT, "skills", "codex-mnemo", "hooks"));
  const mcpConfigs = listMcpConfigs();

  const skillByCat = byCategory(skills);

  const lines = [];
  lines.push("# Codex Compatibility Report");
  lines.push("");
  lines.push(`- Generated: ${generatedAt}`);
  lines.push(`- Project: \`${ROOT.replace(/\\/g, "/")}\``);
  lines.push("");
  lines.push("## Inventory");
  lines.push("");
  lines.push(`- Agents: ${agents.length}`);
  lines.push(`- Skills: ${skills.length}`);
  lines.push(`- Root hooks (Claude format): ${hooks.length}`);
  lines.push(`- Codex notify hooks: ${codexHooks.length}`);
  lines.push(`- MCP config presets: ${mcpConfigs.length}`);
  lines.push("");
  lines.push("## Agents");
  lines.push("");
  lines.push("- Status: **usable as guidance docs** (AGENTS.md + agents/*.md).");
  lines.push("- Note: Claude native Agent Teams 기능은 Codex에서 동일 방식으로 실행되지 않습니다.");
  lines.push("");
  lines.push("## Skills");
  lines.push("");
  lines.push(`- \`portable\`: ${skillByCat.get("portable")?.length || 0}`);
  lines.push(`- \`codex-ready\`: ${skillByCat.get("codex-ready")?.length || 0}`);
  lines.push(
    `- \`codex-ready-manual\`: ${skillByCat.get("codex-ready-manual")?.length || 0}`
  );
  lines.push(
    `- \`needs-adaptation\`: ${skillByCat.get("needs-adaptation")?.length || 0}`
  );
  lines.push(`- \`claude-only\`: ${skillByCat.get("claude-only")?.length || 0}`);
  lines.push(`- \`other-cli\`: ${skillByCat.get("other-cli")?.length || 0}`);
  lines.push("");
  lines.push(
    renderCategorySection("Codex Ready", skillByCat.get("codex-ready") || [])
  );
  lines.push(
    renderCategorySection(
      "Codex Ready (Manual Setup)",
      skillByCat.get("codex-ready-manual") || []
    )
  );
  lines.push(
    renderCategorySection(
      "Needs Adaptation",
      skillByCat.get("needs-adaptation") || []
    )
  );
  lines.push(
    renderCategorySection("Claude Only", skillByCat.get("claude-only") || [])
  );
  lines.push(
    renderCategorySection("Other CLI", skillByCat.get("other-cli") || [])
  );
  lines.push("");
  lines.push("## Hooks");
  lines.push("");
  lines.push("- Root `hooks/` is Claude event model (`UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `Stop`).");
  lines.push("- Codex는 해당 이벤트 훅을 그대로 지원하지 않아 직접 이식 불가.");
  lines.push("- Codex에서는 `notify` 기반 훅(`skills/codex-mnemo/hooks/*`)으로 대체 운용.");
  lines.push("");
  lines.push("## MCP");
  lines.push("");
  lines.push("- MCP preset JSON은 Codex에도 사용 가능 (`command` + `args` + `env`).");
  lines.push("- Claude 전용 설치기 `install-mcp.js`와 별개로 Codex 전용 `install-mcp-codex.js` 추가.");
  lines.push("");
  lines.push("### Presets");
  for (const m of mcpConfigs) {
    lines.push(`- ${m.name}${m.requiresApiKey ? " (api key required)" : ""}`);
  }
  lines.push("");
  lines.push("## Recommended Next Steps");
  lines.push("");
  lines.push("1. `node install-mcp-codex.js --all`로 무료 MCP 일괄 등록");
  lines.push("2. `codex-mnemo` + `orchestrator` 중심으로 Codex 워크플로우 고정");
  lines.push("3. `needs-adaptation` 스킬은 `.claude` 경로/명령을 `.codex` 기준으로 점진 치환");
  lines.push("");

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, lines.join("\n"), "utf8");
  console.log(`Generated: ${OUT_FILE}`);
}

main();
