---
name: chronos-worker
description: >
  Optional source-only compatibility prompt for a Chronos work cycle. The
  auto-continue-loop skill and its persistence harness are canonical; this
  named agent is not installed by default and is never required for /chronos.
---

# Chronos Worker Compatibility Prompt

This file is a source-only compatibility adapter. Do not depend on the
`chronos-worker` name for persistence or routing. Load the canonical
`auto-continue-loop` skill and follow its Phase 1 cycle contract.

When an isolated cycle is useful, use the runtime's native general worker and
pass only:

- the assigned scope and highest-priority actionable issue;
- the objective verification command and completion contract;
- the current `docs/chronos/chronos-log.md` state and parked items;
- the requirement to perform one minimal FIND -> FIX -> VERIFY -> LOG cycle.

The main Chronos harness owns the queue, retries, parked-item decisions,
completion signal, and further cycles. A delegated worker must not delete or
edit any loop-state file and must return evidence from the verification it
actually ran.
