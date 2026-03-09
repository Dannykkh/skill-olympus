---
name: workpm-mcp
description: Explicit MCP-only Orchestrator PM entrypoint. Use when the user says "workpm-mcp" or needs the portable PM workflow on Claude, Codex, or Gemini.
triggers:
  - "workpm-mcp"
  - "workpm mcp"
auto_apply: false
---

# WorkPM MCP

`workpm-mcp` always uses the portable MCP-only PM workflow.

## Workflow

1. Read `../orchestrator/commands/workpm-mcp.md`.
2. Follow that workflow exactly.
3. If the Orchestrator MCP server is missing, stop and show the install command:
   ```bash
   node skills/orchestrator/install.js <target-project-path>
   ```
4. Use `pmworker` or `orchestrator_spawn_workers` for worker execution.

## Important Notes

- This is the safest PM entrypoint for Codex and Gemini.
- Hooks may help detect the mode, but the callable entrypoint is this skill.
