# Domain Confirmation Guide

Step 11 finalizes domain expert suggestions, dictionary changes, and optional global dictionary sync with minimal user interruption.

## Purpose

Step 11 is not a general approval round. It is a conflict resolver.

Default behavior:

1. Auto-accept low-risk domain expert suggestions that align with `spec.md`, `interview.md`, `research.md`, and existing code conventions.
2. Auto-merge dictionary ADD/REFINE/MERGE updates from Step 10.
3. Auto-skip ambiguous global dictionary writes unless they are clearly reusable across projects.
4. Ask the user only for unresolved conflicts that would materially change plan, naming, security, compliance, data model, API, UI wording, or business workflow.

## Inputs

Read these files:

- `team-reviews/domain-process-analysis.md`
- `team-reviews/domain-technical-analysis.md`
- the `## Dictionary Updates` sections from all six expert analysis files
- `docs/domain-dictionary.md`
- global dictionary, if present: `~/.agent-memory/domain-dictionaries/{domain}.md`

## Auto Decision Rules

### Domain Expert Suggestions

| Case | Action |
|------|--------|
| Critical suggestion fixes a clear requirement gap | Accept by default |
| Suggestion is useful but non-blocking | Defer by default; add to Open Questions or Future Work |
| Suggestion adds scope without strong evidence | Defer by default |
| Suggestion changes security, legal, payment, privacy, operations, or rollout | Ask one blocking question |

### Dictionary Changes

| Change | Action |
|--------|--------|
| ADD new term with no conflict | Accept by default |
| REFINE definition for clarity | Accept by default |
| MERGE synonyms with clear dominant term | Accept by default |
| CONFLICT on a term used in DB/API/type names/UI labels | Ask one blocking question |
| CONFLICT on a minor description | Pick the conservative/default project wording and mark `[inferred]` |

### Global Dictionary Sync

| Case | Action |
|------|--------|
| Clearly reusable cross-project term | Add with source metadata |
| Project-specific term | Skip global sync |
| Ambiguous reusable vs project-specific | Skip global sync and record `[inferred-skip]` |
| New global dictionary would need to be created | Skip unless the user explicitly asked for global memory updates |

## Asking Policy

If a question is required:

- Ask exactly one question.
- Include the recommended default.
- Explain the impact in one sentence.
- Do not use multi-select unless the current CLI explicitly supports it.

Template:

```text
Blocking domain decision: {term_or_policy}

I recommend {default} because {reason}. This affects {DB/API/UI/security/plan}.
Should I proceed with this default, or should we use {alternative}?
```

If the user says "모르겠다", "알아서", or gives no actionable preference, use the recommended default and continue.

## Outputs

Update `team-review.md`:

```markdown
## Domain Decisions
- accepted-by-default: {item} — {reason}
- deferred-by-default: {item} — {reason}
- user-confirmed: {item} — {decision}

## Dictionary Changes
- accepted-by-default: {term} — {change}
- inferred: {term} — {reason}
- unresolved-conflict: none or {term}

## Global Dictionary Sync
- added: {term} — {global dictionary}
- inferred-skip: {term} — {reason}
```

Finalize dictionary artifacts:

- update `docs/domain-dictionary.md`
- update `<planning_dir>/domain-dictionary-delta.md`
- update global dictionary only for clear cross-project terms or explicit user request

## Plan Rule

Step 12 reflects:

- accepted-by-default suggestions
- user-confirmed suggestions
- finalized dictionary v3

Deferred items go to Open Questions or Future Work, not the main implementation plan.
