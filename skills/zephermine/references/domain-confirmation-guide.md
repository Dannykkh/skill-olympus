# Domain Confirmation Guide

Step 11 finalizes domain expert suggestions, dictionary changes, and optional global dictionary sync with minimal user interruption.

## Purpose

Step 11 is not a general approval round. It is a conflict resolver.

Default behavior:

1. Auto-accept low-risk domain expert suggestions that align with `spec.md`, `interview.md`, `research.md`, and existing code conventions.
2. Auto-merge dictionary ADD/REFINE/MERGE updates from Step 10.
3. Auto-skip ambiguous global dictionary writes unless they are clearly reusable across projects.
4. Resolve conflicting claims against sources and existing decisions first; model agreement is not new evidence. Ask only for remaining private facts or user-owned choices that materially change the plan.

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
| Suggestion changes an already authorized design within its constraints | Integrate the evidence-backed recommendation; do not reapprove it |
| Suggestion needs a private policy decision or exceeds existing security/payment/privacy/operations authorization | Present evidence, recommendation and trade-off, then ask for the specific unresolved decision |

### Dictionary Changes

| Change | Action |
|--------|--------|
| ADD new term with no conflict | Accept by default |
| REFINE definition for clarity | Accept by default |
| MERGE synonyms with clear dominant term | Accept by default |
| CONFLICT on a term used in DB/API/type names/UI labels | Check sources and existing code/decisions; ask only if a consequential meaning choice still belongs to the user |
| CONFLICT on a minor description | Pick the conservative/default project wording and mark `[inferred]` |

### Global Dictionary Sync

| Case | Action |
|------|--------|
| Clearly reusable cross-project term | Add with source metadata |
| Project-specific term | Skip global sync |
| Ambiguous reusable vs project-specific | Skip global sync and record `[inferred-skip]` |
| New global dictionary would need to be created | Skip unless the user explicitly asked for global memory updates |

## Asking Policy

Use [interview-protocol.md](interview-protocol.md#technique) for the shared question budget, prerequisite decisions, and handling of unanswered blockers. Read the existing `interview.md` before any question; Step 11 is not a fresh allowance.

If a new question is required, explain the finding/source, recommendation/reason, and trade-off, then ask only for the remaining decision. Otherwise integrate or defer within the authorized scope.

Template:

```text
Finding: {source-backed finding; name any still-unverified assumption}
Recommendation: {direction} because {reason}; trade-off: {material constraint}.
Decision needed: {one private fact or unresolved choice and what depends on it}
```

If the user says "모르겠다" or "알아서", continue with the recommended reversible design where authorized. A critical private fact remains unknown, and required authorization remains pending without an explicit answer. Record the dependent decision in the existing artifacts and continue independent work.

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
