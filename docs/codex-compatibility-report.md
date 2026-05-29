# Codex Compatibility Report

- Generated: 2026-05-29
- Project: `D:/git/claude-code-agent-customizations`
- Codex CLI: `codex-cli 0.134.0`

## Inventory

- Repo skills: 96
- Repo top-level agents: 42
- Repo root hooks (.ps1/.sh/.js): 17
- Managed sync skills: 93
- Managed sync agents: 42
- Managed sync root hooks: 17
- Managed Codex notify hooks: 8
- Installed Codex skills (total): 98
- Installed Codex agents (total): 42
- Installed Codex hooks (total files): 39

## Working Well

- Skills/agents/hooks are syncing into `.agents/` and `~/.codex/` via `scripts/sync-codex-assets.js`.
- `config.toml` notify is wired directly or through a wrapper to `save-turn`, so Codex-Mnemo runs automatically each turn.
- `save-turn` fans out to Chronos `continue-loop` and the Codex hook bridge, so Codex has memory + auto-resume + file-hook enforcement chaining without desktop notifications.
- Global `~/.codex/AGENTS.md` already contains Codex-Mnemo rules (`#tags`, past conversation search, MEMORY.md handling).

## config.toml Audit

- notify configured: yes
- notify uses save-turn hook: yes
- notify command: `C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe`
- notify command executable: yes
- notify script: `C:/Users/Administrator/.codex/hooks/save-turn.ps1`
- multi_agent enabled: yes
- context7 MCP present: yes
- playwright MCP present: yes
- chrome-devtools MCP present: yes
- orchestrator MCP present: yes
- windows sandbox elevated: yes
- codex hook bridge installed: yes
- orchestrator path: `C:/Users/Administrator/.codex/skills/orchestrator/mcp-server/dist/index.js`
- orchestrator target: managed Codex install
- orchestrator managed install fresh: yes
- orchestrator tracks current source: yes

## Gaps

1. Codex does not expose Claude's native `UserPromptSubmit / PreToolUse / PostToolUse / Stop` lifecycle directly.
   File-oriented hooks are now bridged via `notify -> save-turn -> codex-hook-bridge`, but the timing still differs from Claude and true pre-write blocking is not identical.
2. `orchestrator` is wired to the current source through either the repo path or the managed Codex install; keep sync outputs aligned after orchestrator changes.
3. 0 Codex-installed skills and 0 top-level agents contain high-risk runtime markers (AskUserQuestion, Claude team tools, Claude Task calls, or non-portable question parameters).
   Additional review markers: 12 installed skills, 3 Codex-excluded skills. Excluded skills are not immediate Codex runtime risk but should stay documented as CLI-specific.

## Compatibility Classification

- The audit scans every Markdown file under each skill directory, not only `SKILL.md`.
- Codex-installed skills with high-risk markers: 0
- Codex-installed skills with review markers: 12
- Codex-excluded skills with markers: 3
- Top-level agents with high-risk markers: 0

### Installed Skills Needing Runtime Adapters

- None detected.

### Agents Needing Runtime Adapters

- None detected.

### Codex-Excluded Skills With Markers

| Skill | Reason | Markers |
|---|---|---|
| `agent-team` | excluded from Codex sync | ask_user (skills/agent-team/commands/agent-team.md:14, skills/agent-team/SKILL.md:384); claude_team_tools (skills/agent-team/commands/agent-team.md:4, skills/agent-team/commands/agent-team.md:5); claude_path (skills/agent-team/SKILL.md:443, skills/agent-team/SKILL.md:444) |
| `gemini-mnemo` | excluded from Codex sync | claude_team_tools (skills/gemini-mnemo/templates/agents-md-rules.md:98); claude_hooks (skills/gemini-mnemo/templates/agents-md-rules.md:102); claude_path (skills/gemini-mnemo/templates/agents-md-rules.md:101, skills/gemini-mnemo/templates/agents-md-rules.md:109); claude_doc (skills/gemini-mnemo/SKILL.md:45, skills/gemini-mnemo/SKILL.md:47) |
| `mnemo` | excluded from Codex sync | claude_hooks (skills/mnemo/docs/memory-system.md:15, skills/mnemo/docs/memory-system.md:25); claude_path (skills/mnemo/docs/memory-system.md:261, skills/mnemo/docs/memory-system.md:297); claude_doc (skills/mnemo/docs/memory-system.md:46, skills/mnemo/docs/memory-system.md:57) |

## Highest-Priority Skill Adaptations

- `command-creator` — Codex에는 Claude slash command(`.claude/commands`) 확장 모델이 없어, 현재는 제한을 설명하고 skill/prompt로 우회해야 합니다. (`skills/command-creator/SKILL.md`, flags: claude_command_path, claude_path)
- `daily-meeting-update` — Codex/Gemini fallback을 문서화했지만, 여전히 Claude 히스토리와 구조화된 질문 UX 비중이 큽니다. (`skills/daily-meeting-update/SKILL.md`, flags: claude_path)
- `mnemo` — Stop/UserPromptSubmit 훅 + CLAUDE.md 규칙을 전제로 설계된 Claude 전용 메모리 시스템입니다. (`skills/mnemo/SKILL.md`, flags: claude_hooks, claude_path, claude_doc)

## Portable or Already Adapted Examples

- `codex-mnemo` — Codex-specific notify workflow and global AGENTS rules.
- `auto-continue-loop` — Codex notify chain using `save-turn -> continue-loop -> codex exec resume --last`.
- `agent-team-codex` — Codex-specific multi-agent workflow; Claude-only `agent-team` is excluded from Codex sync.

## Rule Coverage

- Mnemo block present in global AGENTS.md: yes
- Response tag rules present: yes
- Past conversation search rules present: yes
- Orchestrator mode auto-interpretation rules present: yes

## Recommended Next Steps

1. Keep the Codex hook bridge installed and treat `save-turn` as the single notify entrypoint for parity work.
2. Keep Codex runtime on `notify -> save-turn`, but document clearly which hook behaviors are native and which are bridged.
3. Treat remaining review markers as documentation cleanup, not immediate Codex breakage. Prioritize `command-creator`, `daily-meeting-update`, and Claude-only memory/command documentation when touching those skills next.
4. Re-run this audit after major skill/agent/hook changes to keep the report current.
