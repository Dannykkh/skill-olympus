#!/usr/bin/env node
/**
 * Orchestrator Mode Detector Hook
 *
 * Detects keywords in user prompt and injects mode instructions.
 *
 * Supported keywords:
 *   zeus        - Zeus mode (전자동 파이프라인: 설계→구현→테스트)
 *   workpm      - PM mode (Claude Agent Teams)
 *   workpm-mcp  - PM mode (MCP only, all CLIs)
 *   pmworker    - Worker mode
 *   agent-team  - Agent Teams Lead mode (대니즈팀)
 *   팀 실행      - Agent Teams Lead mode (한국어)
 *
 * Hook Type: UserPromptSubmit
 * Output: JSON with additionalContext
 */

// Patterns for detection (zeus는 최상위 우선순위)
const ZEUS_PATTERN = /(?:^|\s)(?:zeus|제우스|\/zeus)(?:\s|$)/i;
const WORKPM_PATTERN = /(?:^|\s)workpm(?:\s|$)/i;
const WORKPM_MCP_PATTERN = /(?:^|\s)workpm[- ]?mcp(?:\s|$)/i;
const PMWORKER_PATTERN = /(?:^|\s)pmworker(?:\s|$)/i;
const AGENT_TEAM_PATTERN = /(?:^|\s)(?:agent[- ]?team|에이전트\s*팀|팀\s*실행|대니즈\s*팀)(?:\s|$)/i;

/**
 * Build PM mode context
 */
function buildPMContext() {
  return `
[PM MODE — 다이달로스(Daedalus) ACTIVATED]

Read skills/orchestrator/commands/workpm.md and follow the 4-phase workflow exactly as written.
All PM principles, phase details, and checklist rules are in the workflow file.

Start now: Read skills/orchestrator/commands/workpm.md
`;
}

/**
 * Build PM mode context (MCP only — works on Claude, Codex, Gemini)
 */
function buildPMMCPContext() {
  return `
[PM MODE — MCP ONLY]

Read skills/orchestrator/commands/workpm-mcp.md and follow the 4-phase workflow exactly as written.
This mode uses ONLY orchestrator_* MCP tools — works on Claude, Codex, and Gemini.

Start now: Read skills/orchestrator/commands/workpm-mcp.md
`;
}

/**
 * Build Worker mode context
 */
function buildWorkerContext() {
  return `
[WORKER MODE ACTIVATED]

Read skills/orchestrator/commands/pmworker.md and follow the worker procedure exactly as written.

Start now: Read skills/orchestrator/commands/pmworker.md
`;
}

/**
 * Build Zeus mode context (전자동 파이프라인)
 */
function buildZeusContext() {
  return `
[ZEUS MODE ACTIVATED — 전자동 파이프라인]

Read skills/zeus/SKILL.md and follow the workflow exactly as written.
All phase details, rules, and fallback conditions are in the SKILL.md file.

CRITICAL: NEVER call AskUserQuestion. 절대 멈추지 않는다. 에러 시 기록하고 계속 진행.

Start now: Read skills/zeus/SKILL.md — then execute all phases without stopping.
`;
}

/**
 * Build Agent Teams Lead context (대니즈팀)
 */
function buildAgentTeamContext() {
  return `
[AGENT TEAM MODE — 대니즈팀(Dannys Team) ACTIVATED]

Read skills/agent-team/SKILL.md and follow the workflow exactly as written.
All PM principles, steps, expert matching rules, and verification loops are in the SKILL.md file.

Start now: Read skills/agent-team/SKILL.md
`;
}

/**
 * Main processing function
 */
function processPrompt(prompt) {
  // Detect zeus (최상위 우선순위 — 전자동 파이프라인)
  if (ZEUS_PATTERN.test(prompt)) {
    return {
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: buildZeusContext(),
      },
    };
  }

  // Detect agent-team (우선 체크 — workpm보다 먼저)
  if (AGENT_TEAM_PATTERN.test(prompt)) {
    return {
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: buildAgentTeamContext(),
      },
    };
  }

  // Detect workpm-mcp (MCP only mode, check before workpm)
  if (WORKPM_MCP_PATTERN.test(prompt)) {
    return {
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: buildPMMCPContext(),
      },
    };
  }

  // Detect workpm (Agent Teams mode)
  if (WORKPM_PATTERN.test(prompt)) {
    return {
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: buildPMContext(),
      },
    };
  }

  // Detect pmworker
  if (PMWORKER_PATTERN.test(prompt)) {
    return {
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: buildWorkerContext(),
      },
    };
  }

  return null;
}

/**
 * Read input from stdin
 */
function readStdin() {
  return new Promise((resolve, reject) => {
    let input = '';

    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      input += chunk;
    });

    process.stdin.on('end', () => {
      resolve(input);
    });

    process.stdin.on('error', reject);
  });
}

/**
 * Main entry point
 */
async function main() {
  try {
    const input = await readStdin();

    if (!input) {
      process.exit(0);
    }

    const data = JSON.parse(input);
    const prompt = data.prompt || '';

    const result = processPrompt(prompt);

    if (result) {
      console.log(JSON.stringify(result));
    }

    process.exit(0);
  } catch (error) {
    console.error(`Hook error: ${error.message}`);
    process.exit(1);
  }
}

// Handle empty stdin
process.stdin.on('close', () => {
  // Handled by readStdin Promise
});

// Run
main();
