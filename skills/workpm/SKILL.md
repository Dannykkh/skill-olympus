---
name: workpm
description: Unified Orchestrator PM entrypoint. Use when the user says "workpm" and wants PM mode on Claude, Codex, or Gemini. Claude uses Agent Teams mode; other CLIs fall back to MCP-only mode.
triggers:
  - "workpm"
auto_apply: false
---

# WorkPM

`workpm` is the unified PM entrypoint for the Orchestrator workflow.

## Routing Rules

1. If the current session can use `TeamCreate` and `SendMessage`, read `../orchestrator/commands/workpm.md` and follow that workflow.
2. Otherwise, read `../orchestrator/commands/workpm-mcp.md` and follow the MCP-only workflow.
3. If the Orchestrator MCP server is missing, stop and show the exact install command:
   ```bash
   node skills/orchestrator/install.js <target-project-path>
   ```
4. When workers are needed, tell the user to run `pmworker` in other terminals or use `orchestrator_spawn_workers`.

## Important Notes

- `workpm` is the preferred user-facing name across all CLIs.
- On Codex and Gemini, this wrapper intentionally routes to the portable `workpm-mcp` path.
- Hooks may add extra context, but hooks do not register callable skills by themselves.
- Canonical invocation name: `workpm` (keep this exact name on Claude, Codex, and Gemini).

## Start

State which path you selected in one short sentence, then load the chosen workflow file and execute it.
