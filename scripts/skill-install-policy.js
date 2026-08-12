"use strict";

// These guides substantially overlap modern coding engines and broad project
// instructions. The legacy name remains exported for installer compatibility;
// they are now part of the wider source-only policy below.
const DEFAULT_DISABLED_BROAD_CODING_SKILLS = Object.freeze([
  "fullstack-coding-standards",
  "dotnet-coding-standards",
  "wpf-coding-standards",
  "python-backend-fastapi",
  "react-dev",
  "vercel-react-best-practices",
  "test-driven-development",
  "systematic-debugging",
]);

// Default deny: only user-facing Olympus harnesses enter every CLI's skill
// registry. Their implementation modules remain discoverable through the
// portable source-only catalog and are read by exact path when a harness needs
// them, without spending startup description budget. Runtime-specific
// exclusions choose the correct agent-team and mnemo adapter from this shared
// allowlist.
const DEFAULT_COMMON_RUNTIME_SKILLS = Object.freeze([
  "argos",
  "auto-continue-loop",
  "biz-strategy",
  "ceo",
  "clio",
  "design-plan",
  "minos",
  "themis",
  "workpm",
  "zephermine",
  "zeus",
]);

const RUNTIME_SKILL_ADDITIONS = Object.freeze({
  claude: Object.freeze(["agent-team", "mnemo"]),
  codex: Object.freeze(["agent-team-codex", "codex-mnemo"]),
  gemini: Object.freeze(["agent-team", "gemini-mnemo"]),
  grok: Object.freeze(["agent-team", "grok-mnemo"]),
});

// Claude and Grok share ~/.claude/skills through Grok's compatibility layer,
// so the Claude home intentionally keeps both mnemo adapters. The other CLIs
// have isolated registries and keep only their own adapter pair.
const RUNTIME_SKILL_EXCLUSIONS = Object.freeze({
  claude: Object.freeze(["agent-team-codex", "codex-mnemo", "gemini-mnemo"]),
  codex: Object.freeze(["agent-team", "mnemo", "gemini-mnemo", "grok-mnemo"]),
  gemini: Object.freeze(["agent-team-codex", "mnemo", "codex-mnemo", "grok-mnemo"]),
  grok: Object.freeze(["agent-team-codex", "mnemo", "codex-mnemo", "gemini-mnemo"]),
});

const DEFAULT_RUNTIME_SKILL_ALLOWLIST = Object.freeze([
  ...DEFAULT_COMMON_RUNTIME_SKILLS,
  ...new Set(Object.values(RUNTIME_SKILL_ADDITIONS).flat()),
].sort((a, b) => a.localeCompare(b)));

function selectRuntimeSkills(
  allSkillNames,
  runtimeExcludedSkills,
  includeSourceOnlySkills = false,
  includeBroadCodingSkills = false,
) {
  const runtimeExcluded = new Set(runtimeExcludedSkills);
  const defaultEnabled = new Set(DEFAULT_RUNTIME_SKILL_ALLOWLIST);
  const broadCoding = new Set(DEFAULT_DISABLED_BROAD_CODING_SKILLS);
  const isSelected = (name) =>
    includeSourceOnlySkills ||
    defaultEnabled.has(name) ||
    (includeBroadCodingSkills && broadCoding.has(name));

  const runtimeExcludedNames = allSkillNames.filter((name) => runtimeExcluded.has(name));
  const defaultDisabledNames = includeSourceOnlySkills
    ? []
    : allSkillNames.filter(
      (name) => !runtimeExcluded.has(name) && !isSelected(name),
    );
  const skillNames = allSkillNames.filter(
    (name) =>
      !runtimeExcluded.has(name) &&
      isSelected(name),
  );

  return { skillNames, runtimeExcludedNames, defaultDisabledNames };
}

module.exports = {
  DEFAULT_COMMON_RUNTIME_SKILLS,
  DEFAULT_DISABLED_BROAD_CODING_SKILLS,
  DEFAULT_RUNTIME_SKILL_ALLOWLIST,
  RUNTIME_SKILL_ADDITIONS,
  RUNTIME_SKILL_EXCLUSIONS,
  selectRuntimeSkills,
};
