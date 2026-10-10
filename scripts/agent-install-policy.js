"use strict";

// The standalone reference agents under agents/ were deleted: none was
// installed, read by a skill, or spawned after the entrypoint-only runtime.
// Their names live in prune-stale-assets.js so older installs are cleaned up.

// Workflow persistence and memory distillation are owned by their skills and
// harnesses. These files remain as optional compatibility prompts, but a
// globally registered name adds routing competition without providing state,
// scheduling, or a unique tool contract.
const DEFAULT_DISABLED_WORKFLOW_SUPPORT_AGENTS = Object.freeze([
  "chronos-worker.md",
  "gotcha-analyzer.md",
]);

const DEFAULT_SOURCE_ONLY_AGENTS = Object.freeze([
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
  DEFAULT_DISABLED_WORKFLOW_SUPPORT_AGENTS,
  DEFAULT_RUNTIME_AGENT_ALLOWLIST,
  DEFAULT_SOURCE_ONLY_AGENTS,
  selectRuntimeAgents,
};
