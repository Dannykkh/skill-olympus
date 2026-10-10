const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { STALE_AGENT_FILES } = require("../prune-stale-assets");

const repoRoot = path.resolve(__dirname, "..", "..");
const skillRoots = [
  "agent-team",
  "agent-team-codex",
  "auto-continue-loop",
  "workpm",
  "orchestrator",
  "argos",
  "clio",
  "zephermine",
  "code-reviewer",
  "command-creator",
  "excalidraw",
  "skill-judge",
  "writing-clearly-and-concisely",
  "explain",
  "estimate",
  "flow-verifier",
  "autoresearch",
  "themis",
  "memory-distill",
  "zeus",
];

function collectMarkdown(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectMarkdown(target);
    return entry.isFile() && entry.name.endsWith(".md") ? [target] : [];
  });
}

const workflowFiles = skillRoots.flatMap((name) =>
  collectMarkdown(path.join(repoRoot, "skills", name)),
);

test("cross-CLI workflows do not invoke removed or read-only write agents", () => {
  const forbidden = [
    /\bTeamCreate\s*\(/,
    /\bTeamDelete\s*\(/,
    /mode\s*:\s*["']bypassPermissions["']/,
    /subagent_type\s*=\s*["']Explore["']/,
    /\bBackgroundJob\s*\(/,
    /\bTask tool\b/i,
    /model\s*:\s*["'](?:opus|sonnet|haiku)["']/i,
    /\bclose_agent\b/,
    /\bAskUserQuestion\b/,
  ];

  for (const filePath of workflowFiles) {
    const text = fs.readFileSync(filePath, "utf8");
    for (const pattern of forbidden) {
      assert.doesNotMatch(
        text,
        pattern,
        `${path.relative(repoRoot, filePath)} contains stale agent syntax ${pattern}`,
      );
    }
  }
});

// 사용자 정의 에이전트는 더 이상 배포하지 않는다. 지운 이름을 워크플로가 대상으로 부르면
// 그 단계는 어느 CLI에서도 실행되지 않는다.
test("deleted custom agent names are not used as spawn targets", () => {
  // general-purpose는 지금 Claude 네이티브 역할 이름이라 옛 동명 파일과 별개다.
  const notAgentNames = new Set(["MEMORY.md", "general-purpose.md"]);
  const names = STALE_AGENT_FILES.filter((name) => !notAgentNames.has(name)).map((name) =>
    name.replace(/\.md$/i, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  ).join("|");
  const directTarget = new RegExp(
    `(?:spawn|invoke|subagent_type|agent_type|agent_name)\\s*(?:\\(|:|=)[^\\n]{0,80}["'](?:${names})["']`,
    "i",
  );

  for (const filePath of workflowFiles) {
    assert.doesNotMatch(
      fs.readFileSync(filePath, "utf8"),
      directTarget,
      `${path.relative(repoRoot, filePath)} directly targets a deleted custom agent`,
    );
  }
});

test("agent-using skills retain a main-context sequential fallback", () => {
  for (const name of skillRoots) {
    const skillPath = path.join(repoRoot, "skills", name, "SKILL.md");
    const text = fs.readFileSync(skillPath, "utf8");
    assert.match(
      text,
      /(?:메인 컨텍스트|main context)[\s\S]{0,180}(?:순차|sequential)|(?:순차|sequential)[\s\S]{0,180}(?:메인 컨텍스트|main context)/i,
      `${path.relative(repoRoot, skillPath)} is missing a main-context sequential fallback`,
    );
  }
});

test("passive coding guides are explicit source references, not always-loaded agents", () => {
  const owners = [
    "fullstack-coding-standards",
    "dotnet-coding-standards",
    "wpf-coding-standards",
    "hestia",
  ];
  for (const name of owners) {
    const skillPath = path.join(repoRoot, "skills", name, "SKILL.md");
    const text = fs.readFileSync(skillPath, "utf8");
    assert.doesNotMatch(text, /항상 로드|패시브 에이전트/i);
  }
});

test("native team adapters describe current Claude and Codex contracts", () => {
  const claudeTeam = fs.readFileSync(
    path.join(repoRoot, "skills", "agent-team", "SKILL.md"),
    "utf8",
  );
  const codexTeam = fs.readFileSync(
    path.join(repoRoot, "skills", "agent-team-codex", "SKILL.md"),
    "utf8",
  );
  const waveExecutor = fs.readFileSync(
    path.join(repoRoot, "skills", "agent-team", "references", "wave-executor.md"),
    "utf8",
  );

  assert.match(claudeTeam, /2\.1\.178\+.*implicit team/);
  assert.match(claudeTeam, /이름 있는 background teammate를 `Agent`로 직접 생성/);
  assert.match(codexTeam, /stable multi-agent/);
  assert.match(codexTeam, /max_concurrent_threads_per_session/);
  assert.doesNotMatch(codexTeam, /\[features\][\s\S]{0,80}multi_agent/);
  assert.match(waveExecutor, /`wait_agent`.*`interrupt_agent`/);
});

test("CLI adapters ask through normal conversation instead of a vendor-only question tool", () => {
  const adapters = [
    path.join(repoRoot, "skills", "codex", "SKILL.md"),
    path.join(repoRoot, "skills", "themis", "SKILL.md"),
  ];

  for (const filePath of adapters) {
    assert.doesNotMatch(
      fs.readFileSync(filePath, "utf8"),
      /\bAskUserQuestion\b/,
      `${path.relative(repoRoot, filePath)} hard-codes a vendor-only question tool`,
    );
  }
});
