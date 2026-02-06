#!/usr/bin/env node
/**
 * Orchestrator Mode Detector Hook
 *
 * Detects 'workpm' or 'pmworker' keywords in user prompt
 * and injects appropriate mode instructions.
 *
 * Supported keywords:
 *   workpm    - PM (Project Manager) mode
 *   pmworker  - Worker mode
 *
 * Hook Type: UserPromptSubmit
 * Output: JSON with additionalContext
 */

// Patterns for detection
const WORKPM_PATTERN = /(?:^|\s)workpm(?:\s|$)/i;
const PMWORKER_PATTERN = /(?:^|\s)pmworker(?:\s|$)/i;

/**
 * Build PM mode context
 */
function buildPMContext() {
  return `
[PM MODE ACTIVATED]

You are the PM (Project Manager) of Multi-AI Orchestrator.

## Startup Procedure

1. **Detect AI Providers**
   Use orchestrator_detect_providers to check installed AI CLIs

2. **Load Plan File**
   Use orchestrator_get_latest_plan to auto-load latest plan
   Analyze plan file to extract task list

3. **Analyze Project**
   Use orchestrator_analyze_codebase to understand code structure

4. **Create Tasks**
   Use orchestrator_create_task to create tasks
   - Set dependencies (depends_on)
   - Specify scope (modifiable files)
   - Assign AI Provider (based on strengths)

5. **Monitor Progress**
   Use orchestrator_get_progress to check progress

## AI Assignment Guide

| Task Type | Recommended AI |
|-----------|----------------|
| Code generation | codex |
| Refactoring | claude |
| Code review | gemini |
| Documentation | claude |

## Worker Management

Use orchestrator_spawn_workers to auto-create workers:
\`\`\`
orchestrator_spawn_workers({ "count": 2 })
\`\`\`

Or manually run 'pmworker' in another terminal.

---
Start now by calling orchestrator_detect_providers.
`;
}

/**
 * Build Worker mode context
 */
function buildWorkerContext() {
  return `
[WORKER MODE ACTIVATED]

You are a Worker of Multi-AI Orchestrator.

## Auto Mode

1. Use orchestrator_get_available_tasks to check available tasks
2. Use orchestrator_claim_task to claim a task
3. Perform the task (write code, modify files, etc.)
4. Use orchestrator_complete_task or orchestrator_fail_task to report completion
5. Repeat

## Auto-Termination

When allTasksCompleted is true, terminate immediately.
When hasRemainingWork is false and no available tasks, wait and recheck.

## Important Rules

- ALWAYS call orchestrator_lock_file before modifying files
- All locks are auto-released on task completion
- Report errors with orchestrator_fail_task

---
Start now by calling orchestrator_get_available_tasks.
`;
}

/**
 * Main processing function
 */
function processPrompt(prompt) {
  // Detect workpm
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
