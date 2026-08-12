# Codex Compatibility Report

- Generated: 2026-08-12
- Project: `D:/git/claude-code-agent-customizations`
- Codex CLI: `codex-cli 0.147.0`

## Inventory

- Repo skills: 100
- Repo agent source files: 42 (40 top-level + 2 skill-owned)
- Repo root hooks (.ps1/.sh/.js): 17
- Managed sync skills: 13
- Dormant Olympus skill sources: 96
- Managed sync agent source files: 0
- Managed sync root hooks: 17
- Managed Codex notify hooks: 8
- Installed Codex skills (total): 17
- Installed Codex agent source files (.md): 0
- Effective Codex custom-agent definitions (.toml): 0
- Installed Codex hooks (total files): 39

## Working Well

- The fail-closed allowlist syncs only core harnesses and Codex adapters into `~/.codex/skills/`. Other compatible sources remain outside discovery in `~/.codex/.olympus/source-skills/` and are routed by exact catalog path. Duplicate project mirrors are opt-in via `--include-project-skills` and `--include-project-agents`.
- Agent Markdown files remain in the repository as source references only; the default sync does not install them or count them as effective Codex custom agents.
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
- orchestrator path: `C:/Users/Administrator/.codex/.olympus/runtime-modules/orchestrator/mcp-server/dist/index.js`
- orchestrator target: managed Codex runtime mirror
- orchestrator managed install fresh: yes
- orchestrator tracks current source: yes

## Gaps

1. No Olympus custom agents are installed by default. Codex built-in subagents and on-demand skills remain available; effective custom agents: 0.
2. Codex does not expose Claude's native `UserPromptSubmit / PreToolUse / PostToolUse / Stop` lifecycle directly.
   File-oriented hooks are now bridged via `notify -> save-turn -> codex-hook-bridge`, but the timing still differs from Claude and true pre-write blocking is not identical.
3. `orchestrator` runs from the non-discovery Codex runtime mirror synchronized from the current source; it does not re-enter the active skill registry.
4. 0 Codex-installed skills and 0 source-only agent files contain high-risk markers (vendor-only question tools, removed Claude team lifecycle calls, or non-portable question parameters).
   Additional review markers: 6 installed skills, 17 Codex-excluded skills. Excluded skills are not immediate Codex runtime risk but should stay documented as CLI-specific.

## Compatibility Classification

- The audit scans every Markdown file under each skill directory, not only `SKILL.md`.
- Codex-installed skills with high-risk markers: 0
- Codex-installed skills with review markers: 6
- Codex-excluded skills with markers: 17
- Source-only agents with high-risk markers: 0

### Installed Skills Needing Runtime Adapters

- None detected.

### Agents Needing Runtime Adapters

- None detected.

### Codex-Excluded Skills With Markers

| Skill | Reason | Markers |
|---|---|---|
| `agent-md-refactor` | excluded from Codex sync | claude_path (skills/agent-md-refactor/SKILL.md:116, skills/agent-md-refactor/SKILL.md:140); claude_doc (skills/agent-md-refactor/SKILL.md:3, skills/agent-md-refactor/SKILL.md:9) |
| `agent-team` | excluded from Codex sync | claude_path (skills/agent-team/SKILL.md:98, skills/agent-team/SKILL.md:101); claude_team_coordination (skills/agent-team/commands/agent-team.md:5, skills/agent-team/commands/agent-team.md:6) |
| `command-creator` | excluded from Codex sync | claude_command_path (skills/command-creator/references/best-practices.md:428, skills/command-creator/SKILL.md:10); claude_path (skills/command-creator/references/best-practices.md:428, skills/command-creator/SKILL.md:10) |
| `daily-meeting-update` | excluded from Codex sync | claude_path (skills/daily-meeting-update/SKILL.md:145, skills/daily-meeting-update/SKILL.md:163) |
| `domain-dictionary` | excluded from Codex sync | claude_path (skills/domain-dictionary/references/global-sync.md:207) |
| `draw-io` | excluded from Codex sync | claude_path (skills/draw-io/SKILL.md:45, skills/draw-io/SKILL.md:250) |
| `gemini-mnemo` | excluded from Codex sync | claude_path (skills/gemini-mnemo/templates/agents-md-rules.md:156, skills/gemini-mnemo/templates/agents-md-rules.md:181); claude_doc (skills/gemini-mnemo/SKILL.md:30, skills/gemini-mnemo/SKILL.md:32) |
| `grok-mnemo` | excluded from Codex sync | claude_hooks (skills/grok-mnemo/SKILL.md:3, skills/grok-mnemo/SKILL.md:26); claude_path (skills/grok-mnemo/SKILL.md:36, skills/grok-mnemo/SKILL.md:41); claude_doc (skills/grok-mnemo/SKILL.md:30, skills/grok-mnemo/SKILL.md:31) |
| `jira` | excluded from Codex sync | claude_path (skills/jira/references/mcp.md:291, skills/jira/references/mcp.md:294) |
| `memory-compact` | excluded from Codex sync | claude_path (skills/memory-compact/SKILL.md:5); claude_doc (skills/memory-compact/SKILL.md:133) |
| `memory-distill` | excluded from Codex sync | claude_hooks (skills/memory-distill/SKILL.md:199, skills/memory-distill/SKILL.md:200); claude_path (skills/memory-distill/SKILL.md:8); claude_doc (skills/memory-distill/SKILL.md:167) |
| `mnemo` | excluded from Codex sync | claude_hooks (skills/mnemo/docs/memory-system.md:15, skills/mnemo/docs/memory-system.md:25); claude_path (skills/mnemo/docs/memory-system.md:261, skills/mnemo/docs/memory-system.md:297); claude_doc (skills/mnemo/docs/memory-system.md:46, skills/mnemo/docs/memory-system.md:57) |
| `orchestrator` | excluded from Codex sync | claude_hooks (skills/orchestrator/docs/orchestrator-guide.md:168); claude_path (skills/orchestrator/docs/orchestrator-guide.md:153, skills/orchestrator/mcp-server/README.md:75); claude_team_coordination (skills/orchestrator/commands/workpm.md:25, skills/orchestrator/commands/workpm.md:26) |
| `plugin-forge` | excluded from Codex sync | claude_hooks (skills/plugin-forge/references/plugin-structure.md:91); claude_path (skills/plugin-forge/references/marketplace-schema.md:119) |
| `project-gotchas` | excluded from Codex sync | claude_hooks (skills/project-gotchas/SKILL.md:143, skills/project-gotchas/SKILL.md:146); claude_doc (skills/project-gotchas/SKILL.md:96, skills/project-gotchas/SKILL.md:129) |
| `supabase-postgres-best-practices` | excluded from Codex sync | claude_doc (skills/supabase-postgres-best-practices/AGENTS.md:3, skills/supabase-postgres-best-practices/AGENTS.md:15) |
| `systematic-debugging` | excluded from Codex sync | claude_path (skills/systematic-debugging/CREATION-LOG.md:7); claude_doc (skills/systematic-debugging/CREATION-LOG.md:7) |

## Highest-Priority Skill Adaptations

- `daily-meeting-update` — Codex/Gemini fallback을 문서화했지만, 여전히 Claude 히스토리와 구조화된 질문 UX 비중이 큽니다. (`skills/daily-meeting-update/SKILL.md`, flags: claude_path)
- `mnemo` — Stop/UserPromptSubmit 훅 + CLAUDE.md 규칙을 전제로 설계된 Claude 전용 메모리 시스템입니다. (`skills/mnemo/SKILL.md`, flags: claude_hooks, claude_path, claude_doc)

## Portable or Already Adapted Examples

- `codex-mnemo` — Codex-specific notify workflow and global AGENTS rules.
- `auto-continue-loop` — Codex notify chain using `save-turn -> continue-loop -> codex exec resume --last`.
- `agent-team-codex` — Codex-native adapter for the shared agent-team contract; the common `agent-team` package is excluded from Codex sync to avoid duplicate routing.

## Rule Coverage

- Mnemo block present in global AGENTS.md: yes
- Response tag rules present: yes
- Past conversation search rules present: yes
- Orchestrator mode auto-interpretation rules present: yes

## Recommended Next Steps

1. Keep the Codex hook bridge installed and treat `save-turn` as the single notify entrypoint for parity work.
2. Keep Codex runtime on `notify -> save-turn`, but document clearly which hook behaviors are native and which are bridged.
3. Keep the default custom-agent registry empty. Add a Codex `.toml` adapter only when a future agent proves a unique runtime tool or state contract that built-in subagents and an on-demand skill cannot provide.
4. Treat remaining review markers as documentation cleanup, not immediate Codex breakage. Prioritize the current report's installed-skill rows and Claude-only memory documentation when touching those skills next.
5. Re-run this audit after major skill/agent/hook changes to keep the report current.
