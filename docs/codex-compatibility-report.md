# Codex Compatibility Report

- Generated: 2026-03-13
- Project: `D:/git/skill-olympus`
- Codex CLI: `codex-cli 0.114.0`

## Inventory

- Repo skills: 84
- Repo top-level agents: 41
- Repo root hooks (.ps1/.sh/.js): 22
- Managed sync skills: 84
- Managed sync agents: 42
- Managed sync root hooks: 22
- Managed Codex notify hooks: 8
- Installed Codex skills (total): 88
- Installed Codex agents (total): 42
- Installed Codex hooks (total files): 34

## Working Well

- Skills/agents/hooks are syncing into `.agents/` and `~/.codex/` via `scripts/sync-codex-assets.js`.
- `config.toml` is wired to `notify = ... save-turn.ps1`, so Codex-Mnemo runs automatically each turn.
- `save-turn` fans out to `ddingdong-noti`, Chronos `continue-loop`, and the Codex hook bridge, so Codex has memory + notification + auto-resume + file-hook enforcement chaining.
- Global `~/.codex/AGENTS.md` already contains Codex-Mnemo rules (`#tags`, past conversation search, MEMORY.md handling).

## config.toml Audit

- notify configured: yes
- notify uses save-turn hook: yes
- multi_agent enabled: yes
- context7 MCP present: yes
- playwright MCP present: yes
- chrome-devtools MCP present: yes
- orchestrator MCP present: yes
- windows sandbox elevated: yes
- codex hook bridge installed: yes
- orchestrator path: `D:/git/skill-olympus/skills/orchestrator/mcp-server/dist/index.js`
- orchestrator project root: `D:/git/skill-olympus`
- orchestrator tracks current repo: yes

## Gaps

1. Codex does not expose Claude's native `UserPromptSubmit / PreToolUse / PostToolUse / Stop` lifecycle directly.
   File-oriented hooks are now bridged via `notify -> save-turn -> codex-hook-bridge`, but the timing still differs from Claude and true pre-write blocking is not identical.
2. `orchestrator` is correctly wired to this repo, but Codex parity still depends on keeping AGENTS rules, hooks, and sync outputs aligned after each resource change.
3. 22 skills and 4 top-level agents still contain Claude-specific markers (.claude, CLAUDE.md, hook event names, or AskUserQuestion).
   This does not always mean broken behavior, but it does mean the documentation and workflows are not cleanly portable yet.

## Highest-Priority Skill Adaptations

- `command-creator` — Codex에는 Claude slash command(`.claude/commands`) 확장 모델이 없어, 현재는 제한을 설명하고 skill/prompt로 우회해야 합니다. (`skills/command-creator/SKILL.md`, flags: claude_path)
- `daily-meeting-update` — Codex/Gemini fallback을 문서화했지만, 여전히 Claude 히스토리와 구조화된 질문 UX 비중이 큽니다. (`skills/daily-meeting-update/SKILL.md`, flags: claude_path)
- `mnemo` — Stop/UserPromptSubmit 훅 + CLAUDE.md 규칙을 전제로 설계된 Claude 전용 메모리 시스템입니다. (`skills/mnemo/SKILL.md`, flags: claude_path, claude_doc, claude_hooks)

## Portable or Already Adapted Examples

- `codex-mnemo` — Codex-specific notify workflow and global AGENTS rules.
- `auto-continue-loop` — Codex notify chain using `save-turn -> continue-loop -> codex exec resume --last`.
- `agent-team` — explicitly documents Codex `spawn_agent` mode alongside Claude Agent Teams.

## Rule Coverage

- Mnemo block present in global AGENTS.md: yes
- Response tag rules present: yes
- Past conversation search rules present: yes
- Orchestrator mode auto-interpretation rules present: yes

## Recommended Next Steps

1. Keep the Codex hook bridge installed and treat `save-turn` as the single notify entrypoint for parity work.
2. Keep Codex runtime on `notify -> save-turn`, but document clearly which hook behaviors are native and which are bridged.
3. Adapt the remaining Claude-centric skills first: `command-creator`, `daily-meeting-update`, `mnemo`, and any skill still hardcoding `.claude` paths or AskUserQuestion-only flows.
4. Re-run this audit after major skill/agent/hook changes to keep the report current.
