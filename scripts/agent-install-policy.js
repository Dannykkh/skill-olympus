"use strict";

// Broad passive guides stay available as reference material without entering
// every runtime's agent registry.
const DEFAULT_DISABLED_PASSIVE_AGENTS = Object.freeze([
  "react-best-practices.md",
  "python-fastapi-guidelines.md",
  "fullstack-coding-standards.md",
  "dotnet-coding-standards.md",
  "wpf-coding-standards.md",
  "naming-conventions.md",
  "writing-guidelines.md",
  "bilingual-dev.md",
  "web-preview-guide.md",
]);

// These explicit agents have no runtime consumers and duplicate native
// exploration, planning, debugging, or a canonical on-demand skill.
const DEFAULT_DISABLED_NATIVE_OVERLAP_AGENTS = Object.freeze([
  "codebase-pattern-finder.md",
  "explore-agent.md",
  "debugger.md",
  "feature-tracker.md",
  "tdd-coach.md",
  "migration-helper.md",
  "spec-interviewer.md",
]);

// These specialist agents either wrap an existing explicit skill or restate
// broad guidance that the native model and project documentation handle more
// accurately. Keep their source for deliberate reference without registering
// them in every runtime.
const DEFAULT_DISABLED_REDUNDANT_SPECIALIST_AGENTS = Object.freeze([
  "ai-ml.md",
  "architect.md",
  "api-tester.md",
  "api-comparator.md",
  "ascii-ui-mockup-generator.md",
  "backend-spring.md",
  "backend-dotnet.md",
  "database-mysql.md",
  "database-postgresql.md",
  "database-schema-designer.md",
  "desktop-wpf.md",
  "documentation.md",
  "frontend-react.md",
  "mermaid-diagram-specialist.md",
  "performance-engineer.md",
  "python-spec.md",
  "qa-engineer.md",
  "qa-writer.md",
  "code-reviewer.md",
  "security-reviewer.md",
  "stitch-developer.md",
  "typescript-spec.md",
  "ui-ux-designer.md",
  "writing-specialist.md",
]);

// Workflow persistence and memory distillation are owned by their skills and
// harnesses. These files remain as optional compatibility prompts, but a
// globally registered name adds routing competition without providing state,
// scheduling, or a unique tool contract.
const DEFAULT_DISABLED_WORKFLOW_SUPPORT_AGENTS = Object.freeze([
  "chronos-worker.md",
  "gotcha-analyzer.md",
]);

const DEFAULT_SOURCE_ONLY_AGENTS = Object.freeze([
  ...DEFAULT_DISABLED_PASSIVE_AGENTS,
  ...DEFAULT_DISABLED_NATIVE_OVERLAP_AGENTS,
  ...DEFAULT_DISABLED_REDUNDANT_SPECIALIST_AGENTS,
  ...DEFAULT_DISABLED_WORKFLOW_SUPPORT_AGENTS,
]);

// Default deny: adding a new source file must never silently add another
// always-available persona to every CLI. A future runtime agent belongs here
// only after it demonstrates a unique tool/state contract that native workers
// and an on-demand skill cannot provide.
const DEFAULT_RUNTIME_AGENT_ALLOWLIST = Object.freeze([]);

function selectRuntimeAgents(allAgentFiles, includeSourceOnlyAgents = false) {
  const defaultEnabled = new Set(DEFAULT_RUNTIME_AGENT_ALLOWLIST);
  const agentFiles = new Map();
  const defaultDisabledNames = [];

  for (const [name, src] of allAgentFiles.entries()) {
    if (!includeSourceOnlyAgents && !defaultEnabled.has(name)) {
      defaultDisabledNames.push(name);
      continue;
    }
    agentFiles.set(name, src);
  }

  return { agentFiles, defaultDisabledNames };
}

module.exports = {
  DEFAULT_DISABLED_PASSIVE_AGENTS,
  DEFAULT_DISABLED_NATIVE_OVERLAP_AGENTS,
  DEFAULT_DISABLED_REDUNDANT_SPECIALIST_AGENTS,
  DEFAULT_DISABLED_WORKFLOW_SUPPORT_AGENTS,
  DEFAULT_RUNTIME_AGENT_ALLOWLIST,
  DEFAULT_SOURCE_ONLY_AGENTS,
  selectRuntimeAgents,
};
