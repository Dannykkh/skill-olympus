# Codex Compatibility Report

- Generated: 2026-02-16
- Project: `D:/git/claude-code-agent-customizations`

## Inventory

- Agents: 34
- Skills: 70
- Root hooks (Claude format): 21
- Codex notify hooks: 7
- MCP config presets: 5

## Agents

- Status: **usable as guidance docs** (AGENTS.md + agents/*.md).
- Note: Claude native Agent Teams 기능은 Codex에서 동일 방식으로 실행되지 않습니다.

## Skills

- `portable`: 57
- `codex-ready`: 2
- `codex-ready-manual`: 1
- `needs-adaptation`: 7
- `claude-only`: 2
- `other-cli`: 1

### Codex Ready
- codex-mnemo
- agent-team-codex (Codex multi_agent 기반 병렬 실행 + Activity Logging)

### Codex Ready (Manual Setup)
- orchestrator (Activity Log 도구 3개 추가: log_activity, get_activity_log, get_task_summary)

### Needs Adaptation
- agent-md-refactor, api-handoff, command-creator, daily-meeting-update, draw-io, game-changing-features, zephermine

### Claude Only
- agent-team, mnemo

### Other CLI
- gemini-mnemo


## Hooks

- Root `hooks/` is Claude event model (`UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `Stop`).
- Codex는 해당 이벤트 훅을 그대로 지원하지 않아 직접 이식 불가.
- Codex에서는 `notify` 기반 훅(`skills/codex-mnemo/hooks/*`)으로 대체 운용.

## MCP

- MCP preset JSON은 Codex에도 사용 가능 (`command` + `args` + `env`).
- Claude 전용 설치기 `install-mcp.js`와 별개로 Codex 전용 `install-mcp-codex.js` 추가.

### Presets
- context7
- fetch
- github (api key required)
- playwright
- sequential-thinking

## Recommended Next Steps

1. `node install-mcp-codex.js --all`로 무료 MCP 일괄 등록
2. `codex-mnemo` + `orchestrator` 중심으로 Codex 워크플로우 고정
3. `needs-adaptation` 스킬은 `.claude` 경로/명령을 `.codex` 기준으로 점진 치환
