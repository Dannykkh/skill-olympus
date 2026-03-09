---
name: pmworker
description: Unified Orchestrator worker entrypoint. Use when the user says "pmworker" and wants a worker to claim tasks, lock files, implement changes, and report completion.
triggers:
  - "pmworker"
auto_apply: false
---

# PMWorker

`pmworker` is the unified worker entrypoint for the Orchestrator workflow.

## Workflow

1. Read `../orchestrator/commands/pmworker.md`.
2. Follow that worker procedure exactly.
3. If no tasks are available, report that clearly and re-check rather than inventing work.
4. If the Orchestrator MCP server is missing, stop and show the install command:
   ```bash
   node skills/orchestrator/install.js <target-project-path>
   ```

## Important Notes

- This entrypoint is valid across Claude, Codex, and Gemini.
- Hooks may add mode context, but hooks do not make the worker callable on their own.
