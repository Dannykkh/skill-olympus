# Codex Compatibility Report

- Generated: 2026-03-13
- Project: `D:/git/claude-code-agent-customizations`
- Codex CLI: `codex-cli 0.114.0`

## Inventory

- Repo skills: 82
- Repo top-level agents: 41
- Repo root hooks (.ps1/.sh/.js): 22
- Managed sync skills: 82
- Managed sync agents: 42
- Managed sync root hooks: 22
- Managed Codex notify hooks: 7
- Installed Codex skills (total): 86
- Installed Codex agents (total): 42
- Installed Codex hooks (total files): 33

## Working Well

- Skills/agents/hooks are syncing into `.agents/` and `~/.codex/` via `scripts/sync-codex-assets.js`.
- `config.toml` is wired to `notify = ... save-turn.ps1`, so Codex-Mnemo runs automatically each turn.
- `save-turn` fans out to `ddingdong-noti` and Chronos `continue-loop`, so Codex has memory + notification + auto-resume chaining.
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
- orchestrator path: `C:/Users/Administrator/AppData/Roaming/TermSnap/claude-customizations/skills/orchestrator/mcp-server/dist/index.js`
- orchestrator project root: `C:/Users/Administrator/AppData/Roaming/TermSnap/claude-customizations`
- orchestrator tracks current repo: no

## Gaps

1. Claude root hooks are copied into `~/.codex/hooks`, but Codex does not execute `UserPromptSubmit / PreToolUse / PostToolUse / Stop` directly.
   Only `notify -> save-turn` is actually wired in `config.toml`, so Claude-style automatic enforcement is not fully reproduced.
2. `orchestrator` currently points outside this repo when `config.toml` references another installation root.
   That is safe at runtime, but changes in this repo will not affect Codex until the MCP entry is re-registered from this repo.
3. 23 skills and 4 top-level agents still contain Claude-specific markers (.claude, CLAUDE.md, hook event names, or AskUserQuestion).
   This does not always mean broken behavior, but it does mean the documentation and workflows are not cleanly portable yet.

## Highest-Priority Skill Adaptations

- `command-creator` — Codex에는 Claude slash command(`.claude/commands`) 확장 모델이 없어, 현재는 제한을 설명하고 skill/prompt로 우회해야 합니다. (`skills/command-creator/SKILL.md`, flags: claude_path)
- `daily-meeting-update` — Codex/Gemini fallback을 문서화했지만, 여전히 Claude 히스토리와 구조화된 질문 UX 비중이 큽니다. (`skills/daily-meeting-update/SKILL.md`, flags: claude_path, ask_user)
- `manage-skills` — 경로는 `skills/`와 `AGENTS.md` 기준으로 보정됐지만, 확인 단계와 일부 문구가 아직 Claude식 상호작용에 가깝습니다. (`skills/manage-skills/SKILL.md`, flags: claude_doc, ask_user)
- `mnemo` — Stop/UserPromptSubmit 훅 + CLAUDE.md 규칙을 전제로 설계된 Claude 전용 메모리 시스템입니다. (`skills/mnemo/SKILL.md`, flags: claude_path, claude_doc, claude_hooks)
- `verify-implementation` — 검증 경로는 보정됐지만, 승인/재검증 흐름은 아직 AskUserQuestion 중심이라 Codex UX가 완전히 정리되진 않았습니다. (`skills/verify-implementation/SKILL.md`, flags: ask_user)
- `game-changing-features` — 산출물 경로를 `.claude/docs/ai/...`에 고정해 Codex 프로젝트 흐름과 분리됩니다. (`skills/game-changing-features/SKILL.md`, flags: claude_path)

## Portable or Already Adapted Examples

- `codex-mnemo` — Codex-specific notify workflow and global AGENTS rules.
- `auto-continue-loop` — Codex notify chain using `save-turn -> continue-loop -> codex exec resume --last`.
- `agent-team` — explicitly documents Codex `spawn_agent` mode alongside Claude Agent Teams.

## Rule Coverage

- Mnemo block present in global AGENTS.md: yes
- Response tag rules present: yes
- Past conversation search rules present: yes

## Recommended Next Steps

1. Re-register `orchestrator` from this repo if this workspace should be the active Codex source of truth.
2. Keep Codex runtime on `notify -> save-turn`, but document clearly that root Claude hooks are sync-only assets unless bridged explicitly.
3. Adapt the top-priority Claude-centric skills first: `command-creator`, `daily-meeting-update`, `manage-skills`, `mnemo`, `verify-implementation`.
4. Re-run this audit after major skill/agent/hook changes to keep the report current.
