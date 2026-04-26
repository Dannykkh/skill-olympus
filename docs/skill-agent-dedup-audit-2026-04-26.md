# Skill/Agent Dedup Audit (2026-04-26)

## Current Counts

| Area | Count | Notes |
|---|---:|---|
| repo `skills/` | 95 | Canonical skill source |
| repo `agents/` | 41 | Excludes `agents/MEMORY.md`, which is not an agent |
| `.agents/agents` | 42 | repo agents + embedded `gotcha-analyzer` |
| Claude global agents | 42 | repo agents + embedded `gotcha-analyzer` |
| Codex global agents | 42 | repo agents + embedded `gotcha-analyzer` |
| Gemini global agents | 42 | repo agents + embedded `gotcha-analyzer` |

## Fixed In This Pass

1. Prevented embedded skill agents from overwriting root agents during install/sync.
   - Root `agents/*.md` now wins over `skills/*/agents/*.md` with the same filename.
   - This fixes `fullstack-coding-standards.md`, where the embedded copy was overwriting the fuller root agent.

2. Excluded `agents/MEMORY.md` from global agent sync/install.
   - `MEMORY.md` is an index/context file, not an agent.
   - Removed stale global `MEMORY.md` from installed agents.

3. Removed the stale embedded `fullstack-development-workflow` agent.
   - v4.0.0 already absorbed it into `fullstack-coding-standards`.
   - Removed the embedded copy from `skills/fullstack-coding-standards/agents/`.
   - Removed installed global copies generated from that embedded file.

4. Renamed generic embedded `analyzer.md` to `gotcha-analyzer.md`.
   - Source: `skills/project-gotchas/agents/gotcha-analyzer.md`
   - Reason: avoid a generic global `analyzer` agent name.

5. Replaced stale operational references:
   - `qa-test-planner` -> `minos`
   - `code-review-checklist` -> `code-reviewer`
   - `humanizer-guidelines` -> `humanizer`
   - `fullstack-development-workflow` -> `fullstack-coding-standards` / `agent-team` / `workpm`
   - `reducing-entropy` workflow references -> `hestia` / `deprecation-and-migration`

6. Clarified Daedalus routing.
   - `workpm`, `pmworker`, and `workpm-mcp` remain valid call names.
   - Updated `orchestrator-detector.js` so slash calls like `/workpm`, `/daedalus`, `/pmworker`, `/workpm-mcp`, and `/daedalus --mcp` route correctly.
   - Corrected the stale `/workpm` hook instruction from 4-phase to the Claude native 5-phase path.

## Keep As Intentional

These exact-name overlaps are not immediate deletion candidates because the agent and skill have different roles:

| Name | Keep reason |
|---|---|
| `api-tester` | Passive/API expert agent + explicit API testing skill |
| `code-reviewer` | Passive review criteria + explicit review workflow |
| `database-schema-designer` | Passive DB design guidance + explicit schema workflow |
| `dotnet-coding-standards` | Passive .NET rules + detailed skill examples |
| `fullstack-coding-standards` | Passive rules + detailed skill examples |
| `wpf-coding-standards` | Passive WPF rules + detailed skill examples |

Embedded duplicates retained for self-contained skill packaging:

| Embedded file | Status |
|---|---|
| `skills/auto-continue-loop/agents/chronos-worker.md` | Same as root; root wins on sync |
| `skills/dotnet-coding-standards/agents/dotnet-coding-standards.md` | Same as root; root wins on sync |
| `skills/fullstack-coding-standards/agents/fullstack-coding-standards.md` | Aligned to root; root wins on sync |
| `skills/wpf-coding-standards/agents/wpf-coding-standards.md` | Same as root; root wins on sync |

## Remaining Cleanup Candidates

### Claude Global Skills Only

These exist in `C:\Users\Administrator\.claude\skills` but not in repo canonical `skills/`.
Most are v4.0.0 archived skills.

Important: this table is about stale standalone skill directories only. Do not remove the
`workpm`, `pmworker`, or `workpm-mcp` call names from docs/hooks; they are still valid
Daedalus/orchestrator entrypoints.

| Skill | Replacement |
|---|---|
| `multi-ai-orchestration` | `orchestrator` |
| `pmworker` | `workpm` / `orchestrator` |
| `qa-test-planner` | `minos` |
| `reducing-entropy` | `hestia` + `deprecation-and-migration` |
| `stitch-design-md` | `stitch` |
| `stitch-enhance-prompt` | `stitch` |
| `stitch-loop` | `stitch` |
| `stitch-react` | `stitch` |
| `workpm-mcp` | `orchestrator` command path |

`deploy-server` is also global-only in Claude/Codex. Decision: keep it as a local-only utility, not a repo-managed cleanup candidate.

### Claude Global Agents Only

These exist in `C:\Users\Administrator\.claude\agents` but not in repo canonical `agents/`.

| Agent | Replacement |
|---|---|
| `code-review-checklist` | `code-reviewer` |
| `general-purpose` | built-in Claude subagent type / no repo-managed agent |
| `humanizer-guidelines` | `humanizer` + `writing-guidelines` |
| `react-useeffect-guidelines` | `react-best-practices` |
| `reducing-entropy` | `hestia` + `deprecation-and-migration` |
| `web-preview-development` | `web-preview-guide` |
| `communication-excellence-coach` | `professional-communication` + `workplace-conversations` + `writing-specialist` |

## Suggested Next Step

No further stale agent cleanup is pending. `deploy-server` remains intentionally local-only.

## Prune Pass Completed

The stale Claude global items were moved out of active install paths, not permanently deleted.
The installer now applies the same targeted migration on other machines: known deprecated
Olympus agents/skills are moved to `_pruned-stale-olympus/<timestamp>/`, while local-only
utilities such as `deploy-server` are preserved.

Backup location:

```text
C:\Users\Administrator\.claude\_pruned-stale-olympus\20260426-233319
```

Moved stale agents:

- `code-review-checklist.md`
- `communication-excellence-coach.md`
- `general-purpose.md`
- `humanizer-guidelines.md`
- `react-useeffect-guidelines.md`
- `reducing-entropy.md`
- `web-preview-development.md`

Moved stale skills:

- `multi-ai-orchestration`
- `pmworker`
- `qa-test-planner`
- `reducing-entropy`
- `stitch-design-md`
- `stitch-enhance-prompt`
- `stitch-loop`
- `stitch-react`
- `workpm-mcp`

Post-prune active Claude global state:

| Kind | Repo canonical | Claude active | Extra | Missing |
|---|---:|---:|---|---|
| skills | 95 | 96 | `deploy-server` | none |
| agents | 41 | 42 | `gotcha-analyzer` | none |

The `workpm`, `pmworker`, and `workpm-mcp` call names remain active through `workpm`, `orchestrator/commands/pmworker.md`, `orchestrator/commands/workpm-mcp.md`, and `orchestrator-detector.js`.

## Project Gotchas Verification

`project-gotchas` was checked after the agent rename cleanup.

Fixes applied:

- Synced Claude global `project-gotchas` from the repo version.
- Removed stale `agents/analyzer.md` from active installs.
- Standardized `agents/gotcha-analyzer.md` across repo, `.agents`, Claude, Codex, and Gemini.
- Updated the skill docs to distinguish Claude tool-level observations from Codex/Gemini turn-level observations.
- Updated `gotcha-analyzer` to accept both `tool_error`/`tool_success` and `turn_error`/`turn_success` events.
- Clarified that `gotcha-analyzer` uses a `cleanup-low` model tier:
  Claude `haiku`, Codex `gpt-5.2-mini` + `reasoning low`, Gemini `gemini-2.5-flash-lite`.

Runtime check:

| Hook path | Observation result |
|---|---|
| Claude `save-tool-use.ps1` | wrote `memory/learned/observations.jsonl` with `tool_success` |
| Codex `save-turn.ps1` | wrote `memory/learned/observations.jsonl` with `turn_success` |
| Gemini `save-turn.ps1` | wrote `memory/gotchas/observations.jsonl` with `turn_error` |

Installed state:

| Location | `project-gotchas/SKILL.md` | `gotcha-analyzer.md` | stale `analyzer.md` |
|---|---|---|---|
| repo | present | present | absent |
| `.agents` | present | present | absent |
| Claude global | present | present | absent |
| Codex global | present | present | absent |
| Gemini global | present | present | absent |
