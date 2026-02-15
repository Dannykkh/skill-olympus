# Codex CLI Feedback: Lingering Processes After Interrupted Runs (Windows)

## Summary

On Windows, after interrupting/aborting a Codex-driven task, some `codex` / `node` processes can remain alive much longer than expected.  
This makes it look like a background loop is still running.

## Environment

- OS: Windows (PowerShell)
- Shell: `pwsh`
- Codex CLI: `codex-cli 0.101.0`
- Workspace: `D:\git\claude-code-agent-customizations`

## Observed Behavior

- A long setup task was interrupted by user action.
- The immediate task was not in a true infinite loop; one command had timed out and then the session was aborted.
- However, some older `codex` / `node` processes remained active and appeared to be long-running.

Example check command:

```powershell
Get-Process | Where-Object { $_.ProcessName -match 'codex|node|pwsh|powershell' } |
  Select-Object ProcessName,Id,StartTime |
  Sort-Object StartTime -Descending
```

Sample output included entries started around:

- `2026-02-15 11:30:02`
- `2026-02-15 11:31:52`

while later operations were already interrupted/aborted.

## Expected Behavior

- When a user explicitly interrupts/aborts a turn, all child processes started for that run should be cleaned up.
- No stale `codex`/`node` worker processes should continue running unless explicitly detached/backgrounded.

## Actual Behavior

- Some `codex`/`node` processes appear to survive interruption.
- This can be misread as a stuck loop or hidden background execution.

## Reproduction (High Level)

1. Start a Codex workflow that performs multi-step shell operations.
2. Interrupt the turn intentionally (`중지` / abort).
3. Check process table in PowerShell.
4. Observe whether `codex`/`node` processes from earlier turns are still alive.

## Impact

- User trust issue: appears like uncontrolled background execution.
- Operational confusion: unclear whether work is still running.
- Potential resource waste over long sessions.

## Suggested Improvements

1. Stronger process tree cleanup on abort/interrupt.
2. Explicit post-abort summary: list terminated vs still-running child processes.
3. Optional `--kill-on-abort` mode for strict cleanup.
4. Better Windows-specific process lifecycle handling.

## Attachments to Include When Submitting

- `codex --version` output
- Process snapshot before/after abort (`Get-Process ...`)
- Repro command history
- Relevant session logs (if available)

