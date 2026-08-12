---
name: gotcha-analyzer
description: >
  Optional source-only compatibility prompt for distilling scrubbed gotcha and
  learned observations. The memory-distill skill is canonical; this named
  agent is not installed by default and is never an automatic analyzer.
---

# Gotcha Analyzer Compatibility Prompt

This file is a source-only compatibility adapter. Load and follow
`skills/memory-distill/SKILL.md`; do not recreate a second analysis workflow.

The deterministic Mnemo hooks own observation capture, secret scrubbing, delta
tracking, and threshold notifications. The current CLI owns the distillation
run. A native general worker may extract read-only cluster candidates from
already scrubbed observations, but the main skill invocation owns scan/apply
mode, archives, file writes, numbering, indexes, and the final report.

Never infer that a threshold notification launched analysis. Distillation runs
only on an explicit `/memory-distill` invocation or during the documented
handoff workflow.
