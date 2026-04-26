# Skill Parity Audit (2026-04-26)

## Scope

This audit compares the actual installed skill directories across:

| Root | Path | Skill dirs |
|---|---:|---:|
| repo | `D:\git\claude-code-agent-customizations\skills` | 95 |
| repo mirror | `D:\git\claude-code-agent-customizations\.agents\skills` | 93 |
| Claude global | `C:\Users\Administrator\.claude\skills` | 105 |
| Codex global | `C:\Users\Administrator\.codex\skills` | 96 |
| Gemini global | `C:\Users\Administrator\.gemini\skills` | 91 |

`SKILLS-CATALOG.md` / `AGENTS-CATALOG.md` do not exist in the repo root or Claude global root, so the audit uses actual `SKILL.md` directories as the source of truth.

Hash comparison excludes tool/runtime caches: `node_modules`, `.git`, and `__pycache__`.

## Summary

There are two different answers depending on the baseline:

| Baseline | Result |
|---|---|
| Actual Claude global install | Not exactly identical. Claude global contains stale/deprecated extra skills and a few file-level drifts. |
| Current repo canonical skills | Codex and Gemini common managed skills are file-identical to the repo baseline. Differences are intentional runtime adapters/exclusions. |

## Claude Global Baseline

| Target | Same | Diff | Missing from target | Extra in target |
|---|---:|---:|---:|---:|
| repo | 89 | 6 | 10 | 0 |
| Codex global | 87 | 7 | 11 | 2 |
| Gemini global | 86 | 5 | 14 | 0 |

### Missing Compared To Claude Global

Claude global has these skills that repo no longer has:

- `multi-ai-orchestration` -> absorbed into `orchestrator`
- `pmworker` -> absorbed into `workpm` / `orchestrator`
- `qa-test-planner` -> absorbed into `minos`
- `reducing-entropy` -> split into `deprecation-and-migration` + `hestia`
- `stitch-design-md`, `stitch-enhance-prompt`, `stitch-loop`, `stitch-react` -> absorbed into `stitch`
- `workpm-mcp` -> absorbed into `orchestrator`

Claude global also has `deploy-server`, which exists in Codex global but is not part of the repo canonical skill set.

### Codex Extras Compared To Claude Global

- `figma`
- `figma-implement-design`

These are Codex global-only installed skills, not repo canonical skills.

### Strict File Diffs Compared To Claude Global

| Skill | File-level difference |
|---|---|
| `auto-continue-loop` | `scripts/continue-loop.ps1`, `scripts/continue-loop.sh` |
| `codex-mnemo` | `templates/agents-md-rules.md` |
| `deploy-server` | `SKILL.md` differs between Claude and Codex; missing from repo/Gemini |
| `docker-deploy` | `references/deploy-bat-template.md` |
| `gemini-mnemo` | `templates/agents-md-rules.md` |
| `orchestrator` | Claude global has runtime state file `mcp-server/.orchestrator/state.json` |
| `zephermine` | Claude global has extra `references/verify-protocol.md` |

## Repo Canonical Baseline

| Target | Same | Diff | Missing from target | Extra in target |
|---|---:|---:|---:|---:|
| `.agents` mirror | 93 | 0 | 2 | 0 |
| Codex global | 93 | 0 | 2 | 3 |
| Gemini global | 91 | 0 | 4 | 0 |

### Intentional Missing Skills

| Target | Missing | Reason |
|---|---|---|
| `.agents` mirror | `agent-team`, `mnemo` | Claude-native variants are not mirrored into the Codex/Gemini-oriented `.agents` tree. |
| Codex global | `agent-team`, `mnemo` | Replaced by `agent-team-codex` and `codex-mnemo`. |
| Gemini global | `agent-team`, `agent-team-codex`, `codex-mnemo`, `mnemo` | Gemini uses `gemini-mnemo`; multi-agent `/poseidon` is unsupported and falls back to `workpm`. |

### Repo To Global Content Parity

All common repo-managed skills are file-identical in Codex and Gemini globals.

The `SKILL.md` frontmatter fields checked across the 91 skills common to repo, Claude, Codex, and Gemini:

- `name`
- `description`
- `triggers`
- `aliases`

Result: `0` frontmatter diffs.

## Alias Parity

The fixed Olympus aliases are present in:

- `AGENTS.md`
- `CLAUDE.md`
- `C:\Users\Administrator\.codex\AGENTS.md`
- `C:\Users\Administrator\.gemini\AGENTS.md`
- `C:\Users\Administrator\.claude\CLAUDE.md`

Verified aliases:

| Alias | Claude | Codex | Gemini |
|---|---|---|---|
| `/zeus`, `제우스` | `zeus` | `zeus` | `zeus` |
| `/aphrodite`, `아프로디테` | `design-plan` | `design-plan` | `design-plan` |
| `/minos`, `미노스` | `minos` | `minos` | `minos` |
| `/clio`, `클리오` | `clio` | `clio` | `clio` |
| `/poseidon`, `포세이돈` | `agent-team` | `agent-team-codex` | `workpm` fallback |
| `/daedalus`, `다이달로스`, `workpm` | `workpm` | `workpm` | `workpm` |
| `/argos`, `아르고스` | `argos` | `argos` | `argos` |
| `/hermes`, `헤르메스` | `biz-strategy` | `biz-strategy` | `biz-strategy` |
| `/athena`, `아테나` | `ceo` | `ceo` | `ceo` |
| `/mnemo`, `므네모` | `mnemo` | `codex-mnemo` | `gemini-mnemo` |

## 500-Line Rule Check

Remaining `500` references are not source-code size hard limits.

They are limited to:

- hook comments about previously reading only the last 500 transcript lines
- skill-authoring/evaluation heuristics in `autoresearch` and `skill-judge` for `SKILL.md` context efficiency

No source-code hard rule remains in the audited core coding standards.

## Test

```powershell
node --test scripts\tests\installers.test.js
```

Result: passed.

## Recommendation

Treat the repo `skills/` directory as the canonical source of truth, not the current Claude global install.

Recommended cleanup:

1. Remove or archive stale Claude global skills that were deleted in v4.0.0.
2. Decide whether `deploy-server`, `figma`, and `figma-implement-design` should become repo-managed skills or stay local-only.
3. Optionally generate `SKILLS-CATALOG.md` / `AGENTS-CATALOG.md` for the repo and Claude global root so catalog-based checks have the same source across CLIs.
4. If strict wording parity is desired, replace remaining skill-authoring `500-line` heuristics with a retrieval/progressive-disclosure quality rule.
