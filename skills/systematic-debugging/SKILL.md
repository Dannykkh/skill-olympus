---
name: systematic-debugging
description: |
  Structured root-cause investigation when explicitly requested, or as an internal
  reference in Argos/Minos authorized repair loops. Routine diagnosis stays native.
---

# Systematic Debugging

## Invocation and Resource Paths

This module is source-only by default. A user request for this workflow is enough;
do not assume its slash command is registered. Resolve its exact `SKILL.md` from
the project, the current runtime's active skill root, then the matching
`SKILLS-CATALOG.md` row. `module_root` is the directory containing that file;
read supporting documents relative to it, regardless of the project working directory.

## Harness Integration

Argos and Minos read this module when an observed failure enters their authorized repair
loop. They retain ownership of scope, issue IDs, reports, retry budgets, and final grades.
Reading this module does not start another loop, request TDD, or grant permission to edit.
Inspection-only requests remain read-only; a report-only command only displays the existing report.

- Reuse the recorded failing check when its code, input, and environment still match.
  For an exploratory issue without a test, identify a repeatable observation or focused check first.
- Separate the current requirement/AC from the actual response or state. An error label is a clue,
  not a root cause: a timeout may be a server failure rather than a reason to add a wait.
- Record one testable cause and the observation that supports or would disprove it before editing.
  If existing evidence already establishes the cause, fix it directly without repeating the investigation.
- Make the smallest authorized change, then rerun the original check and affected regression checks.
  A source-code edit alone or green tests that never covered the reported issue do not close it.
- If the attempt fails, preserve its evidence, restore only that attempt's known changes when needed,
  and return to the unanswered question within the caller's remaining budget. Do not reset counts by
  changing workers, sessions, issue labels, or entering this module. Repeated identical output without
  new evidence is a blocker to report, not a reason for another speculative patch.

Put `issue/AC, reproduction, contract vs actual, hypothesis/evidence, change, verification,
remaining budget` in the caller's existing repair history. Do not create a second report or ledger.
Missing prerequisites are `NOT RUN`/`UNVERIFIED`; an unresolved issue retains its actual severity.
Use the phases below only as far as the remaining uncertainty requires.

## Overview

Random fixes waste time and create new bugs. Quick patches mask underlying issues.

**Core principle:** Investigate the cause before choosing a fix, and distinguish
evidence-backed diagnosis from temporary symptom mitigation.

## The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

Gather enough evidence for a testable hypothesis before changing behavior.
During an incident, an authorized rollback or containment may precede full diagnosis;
record it as mitigation and preserve the evidence needed to investigate the cause.

## The Four Phases

Use the phases to reduce uncertainty. Reuse evidence already established for this
code and environment; a clear local failure does not require a multi-component investigation.

### Phase 1: Root Cause Investigation

**BEFORE attempting ANY fix:**

1. **Read Error Messages Carefully**
   - Don't skip past errors or warnings
   - They often contain the exact solution
   - Read stack traces completely
   - Note line numbers, file paths, error codes

2. **Reproduce Consistently**
   - Can you trigger it reliably?
   - What are the exact steps?
   - Does it happen every time?
   - If not reproducible → gather more data, don't guess

3. **Check Recent Changes**
   - What changed that could cause this?
   - Git diff, recent commits
   - New dependencies, config changes
   - Environmental differences

4. **Gather Evidence in Multi-Component Systems**

   **WHEN system has multiple components (CI → build → signing, API → service → database):**

   **When existing evidence does not locate the failing boundary, add focused instrumentation:**
   ```
   For EACH component boundary:
     - Record non-sensitive input/output shapes or redacted diagnostic values
     - Verify environment/config propagation
     - Check state at each layer

   Run once to gather evidence showing WHERE it breaks
   THEN analyze evidence to identify failing component
   THEN investigate that specific component
   ```

   **Example (multi-layer system):**
   ```bash
   # Run the same presence check at the workflow and build-script boundaries.
   # Report configuration presence without printing its value or the full environment.
   if [ -n "${IDENTITY:-}" ]; then
     echo "IDENTITY: SET"
   else
     echo "IDENTITY: UNSET"
   fi
   ```

   **This reveals:** Which layer fails (secrets → workflow ✓, workflow → build ✗)

5. **Trace Data Flow**

   **WHEN error is deep in call stack:**

   Read [root-cause-tracing.md](root-cause-tracing.md) under `module_root` for the complete backward tracing technique.

   **Quick version:**
   - Where does bad value originate?
   - What called this with bad value?
   - Keep tracing up until you find the source
   - Fix at source, not at symptom

### Phase 2: Pattern Analysis

**Find the pattern before fixing:**

1. **Find Working Examples**
   - Locate similar working code in same codebase
   - What works that's similar to what's broken?

2. **Compare Against References**
   - Read the reference implementation and callers needed to understand the affected contract.
   - Expand the search only when a concrete dependency or unanswered question requires it.

3. **Identify Differences**
   - What's different between working and broken?
   - List every difference, however small
   - Don't assume "that can't matter"

4. **Understand Dependencies**
   - What other components does this need?
   - What settings, config, environment?
   - What assumptions does it make?

### Phase 3: Hypothesis and Testing

**Scientific method:**

1. **Form Single Hypothesis**
   - State clearly: "I think X is the root cause because Y"
   - Write it down
   - Be specific, not vague

2. **Test Minimally**
   - Make the SMALLEST possible change to test hypothesis
   - One variable at a time
   - Don't fix multiple things at once

3. **Verify Before Continuing**
   - Did it work? Yes → Phase 4
   - Didn't work? Form NEW hypothesis
   - DON'T add more fixes on top

4. **When You Don't Know**
   - Say "I don't understand X"
   - Don't pretend to know
   - Ask for help
   - Research more

### Phase 4: Implementation

**Fix the root cause, not the symptom:**

1. **Create Failing Test Case**
   - Simplest possible reproduction
   - Automated test if possible
   - One-off test script if no framework
   - MUST have before fixing
   - Use the project's existing test framework or a reproducible check for the original symptom.
   - Requesting this debugging workflow does not also request strict TDD. Only if the user explicitly
     requests TDD, resolve `test-driven-development` by the same project → active root → exact catalog
     path order above and read its `SKILL.md` directly. If unavailable, report that guidance as
     `NOT RUN` and continue the authorized reproduction and verification with project-native tools.

2. **Implement Single Fix**
   - Address the root cause identified
   - ONE change at a time
   - No "while I'm here" improvements
   - No bundled refactoring

3. **Verify Fix**
   - Run the original reproduction against the changed code and verify the expected response,
     persisted state, and relevant side effects; a changed file is not proof that the symptom is fixed.
   - Run the project's required tests/build plus regression checks for the affected behavior.
     Record the command, target revision or working-tree state, environment, exit code, and result.
   - Reuse an existing result only when code, environment, and checked conditions still match;
     rerun affected checks after a change or when a specific unresolved doubt requires it.
   - Report `NOT RUN` with the missing prerequisite when execution is unavailable. Distinguish
     passing checks, failing checks, and unverified requirements before claiming completion.

4. **If Fix Doesn't Work**
   - Record the hypothesis, change, and observed result before choosing another experiment.
   - Restore only this experiment's changes when the baseline is known; preserve existing user
     changes and other work. Do not reset files or discard a branch to restart the process.
   - Return to the earliest unanswered question. A missing prerequisite, wrong assumption,
     implementation error, test defect, and architecture problem need different responses.
   - Repeated failure warrants reassessment; the number of attempts alone does not diagnose
     the architecture. Shared-state coupling or incompatible contracts must be demonstrated.
   - Follow the current task's retry/time budget. Continue an authorized, evidence-backed fix;
     report the blocker and next discriminating check if further attempts only repeat guesses.
     Discuss scope-changing architectural work before undertaking it.

## Red Flags - STOP and Follow Process

If you catch yourself thinking:
- "Quick fix for now, investigate later"
- "Just try changing X and see if it works"
- "Add multiple changes, run tests"
- "Skip the test, I'll manually verify"
- "It's probably X, let me fix that"
- "I don't fully understand but this might work"
- "Pattern says X but I'll adapt it differently"
- "Here are the main problems: [lists fixes without investigation]"
- Proposing solutions before tracing data flow
- **"One more fix attempt" without a new observation or testable hypothesis**
- **Each fix reveals new problem in different place**

**ALL of these mean: STOP. Return to Phase 1.**

## your human partner's Signals You're Doing It Wrong

**Watch for these redirections:**
- "Is that not happening?" - You assumed without verifying
- "Will it show us...?" - You should have added evidence gathering
- "Stop guessing" - You're proposing fixes without understanding
- "Ultrathink this" - Question fundamentals, not just symptoms
- "We're stuck?" (frustrated) - Your approach isn't working

**When you see these:** STOP. Return to Phase 1.

## Quick Reference

| Phase | Key Activities | Success Criteria |
|-------|---------------|------------------|
| **1. Root Cause** | Read errors, reproduce, check changes, gather evidence | Understand WHAT and WHY |
| **2. Pattern** | Find working examples, compare | Identify differences |
| **3. Hypothesis** | Form theory, test minimally | Confirmed or new hypothesis |
| **4. Implementation** | Create test, fix, verify | Bug resolved, tests pass |

## When Process Reveals "No Root Cause"

If systematic investigation reveals issue is truly environmental, timing-dependent, or external:

1. You've completed the process
2. Document what you investigated
3. Implement appropriate handling (retry, timeout, error message)
4. Add monitoring/logging for future investigation

State the unresolved alternatives and evidence limits. An exhausted investigation is
not proof of an external cause, and a successful mitigation is not proof of a root-cause fix.

## Supporting Techniques

These techniques are part of systematic debugging and available in this directory:

- [root-cause-tracing.md](root-cause-tracing.md) - Trace bugs backward through call stack to find original trigger
- [defense-in-depth.md](defense-in-depth.md) - Add validation at multiple layers after finding root cause
- [condition-based-waiting.md](condition-based-waiting.md) - Replace arbitrary timeouts with condition polling

Strict TDD is an optional, explicitly requested source module (Phase 4, Step 1).
Completion evidence is owned by **Phase 4, Step 3** above; no external verification skill is required.

