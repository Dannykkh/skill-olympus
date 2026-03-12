# Claude Code 글로벌 설정 가이드

> MEMORY.md 키워드 인덱스에서 이 파일로 연결됩니다.

---

### claude-global-paths
`tags: claude, global, paths, skills, agents, hooks, settings`
`date: 2026-03-08`
`source: claude`

**기본 경로: `~/.claude/` (Windows: `C:/Users/{username}/.claude/`)**

```
~/.claude/
├── settings.json      # 훅 + 환경변수 + 팀모드
├── CLAUDE.md          # 글로벌 규칙 (모든 프로젝트 적용)
├── skills/            # 글로벌 스킬
├── agents/            # 글로벌 에이전트 (.md 파일)
├── hooks/             # 글로벌 훅 (.ps1/.sh/.js)
├── projects/          # 프로젝트별 auto-memory
├── conversations/     # 대화 기록 (mnemo)
└── handoffs/          # 세션 핸드오프 파일
```

별도 파일:
- `~/.claude.json` — 앱 설정 (테마, 통계, 기능플래그). MCP 아님.

---

### settings-json-structure
`tags: settings-json, hooks, env, teammateMode, effortLevel`
`date: 2026-03-08`
`source: claude`

**`~/.claude/settings.json` 주요 필드:**

| 필드 | 용도 | 예시 |
|------|------|------|
| `hooks` | 이벤트별 훅 등록 | `{ "Stop": [...] }` |
| `env` | 환경변수 | `{ "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" }` |
| `teammateMode` | 에이전트 팀 모드 | `"in-process"` / `"tmux"` |
| `effortLevel` | 응답 노력 수준 | `"high"` |
| `enabledPlugins` | 플러그인 | `{}` |

**훅 이벤트 (Claude 전용):**

| 이벤트 | 시점 | matcher 예시 |
|--------|------|-------------|
| `UserPromptSubmit` | 사용자 입력 후, AI 응답 전 | `".*"` |
| `PreToolUse` | 도구 실행 전 | `"Write"`, `"Edit\|Write"` |
| `PostToolUse` | 도구 실행 후 | `"Edit\|Write"` |
| `Stop` | 응답 완료 시 | `""` (빈 문자열) |

**훅 등록 형식:**
```json
{
  "hooks": {
    "Stop": [{
      "matcher": "",
      "hooks": [{ "type": "command", "command": "powershell -File hooks/save-response.ps1" }]
    }]
  }
}
```

---

### mcp-server-management
`tags: mcp, claude-mcp-add, scope, install-mcp`
`date: 2026-03-08`
`source: claude`

**MCP는 CLI 명령어로 관리** (settings.json 직접 편집 아님):

```bash
# 등록
claude mcp add context7 --scope user -- npx -y @upstash/context7-mcp@latest

# 제거
claude mcp remove context7 -s user

# 확인
claude mcp get context7
claude mcp list
```

| scope | 의미 |
|-------|------|
| `user` | 글로벌 (~/.claude 수준) |
| `local` (기본) | 프로젝트별 (.claude/ 수준) |

**기본 설치 MCP:** context7, fetch, playwright, chrome-devtools

---

### global-vs-project
`tags: global, project, CLAUDE.md, 우선순위, 병합`
`date: 2026-03-08`
`source: claude`

| 항목 | 글로벌 | 프로젝트 |
|------|--------|---------|
| 규칙 | `~/.claude/CLAUDE.md` | `{project}/CLAUDE.md` |
| 스킬 | `~/.claude/skills/` | — |
| 에이전트 | `~/.claude/agents/` | `{project}/agents/` |
| 훅 | `~/.claude/settings.json` | `.claude/settings.local.json` |
| MCP | `--scope user` | `--scope local` |

- 글로벌 CLAUDE.md + 프로젝트 CLAUDE.md **둘 다 로드**됨 (병합 아닌 독립 적용)
- 프로젝트 에이전트가 글로벌과 이름 충돌 시 프로젝트 우선

---

### cross-cli-comparison
`tags: claude, codex, gemini, 크로스CLI, 훅이벤트, 경로`
`date: 2026-03-08`
`source: claude`

**글로벌 디렉토리:**

| CLI | 경로 |
|-----|------|
| Claude | `~/.claude/` |
| Codex | `~/.codex/` |
| Gemini | `~/.gemini/` |

**훅 이벤트 차이:**

| Claude | Codex | Gemini |
|--------|-------|--------|
| UserPromptSubmit | notify (config.toml) | BeforeAgent |
| PreToolUse | — | BeforeTool |
| PostToolUse | — | — |
| Stop | notify (config.toml) | AfterAgent |

**설정 파일 차이:**

| CLI | 훅 설정 | 규칙 파일 |
|-----|---------|----------|
| Claude | `settings.json` (hooks) | `CLAUDE.md` |
| Codex | `config.toml` (notify) | `AGENTS.md` |
| Gemini | `settings.json` (hooks) | `AGENTS.md` / `GEMINI.md` |

---

### install-flow
`tags: install, install-bat, 설치순서, sync`
`date: 2026-03-08`
`source: claude`

`install.bat --all` 실행 순서:

```
[1] Skills → ~/.claude/skills/ (safe-copy)
[2] Agents → ~/.claude/agents/ (safe-copy)
[3] Hooks  → ~/.claude/hooks/ (safe-copy)
[4] settings.json 훅 등록 (install-hooks-config.js)
[5] CLAUDE.md 규칙 주입 (install-claude-md.js)
[6] MCP 서버 등록 (install-mcp.js → claude mcp add)
[7] Orchestrator MCP 빌드+등록
[8] Codex: mnemo → sync → MCP → orchestrator
[9] Gemini: mnemo → sync → hooks → MCP → orchestrator
```

**관리 스크립트:**

| 스크립트 | 용도 |
|---------|------|
| `install-hooks-config.js` | settings.json 훅 등록 |
| `install-claude-md.js` | CLAUDE.md 규칙 주입 (MNEMO 마커) |
| `install-mcp.js` | Claude MCP 등록 |
| `scripts/safe-copy.js` | 심링크 정리 + 안전 복사 |
| `scripts/sync-codex-assets.js` | Codex CLI 동기화 |
| `scripts/sync-gemini-assets.js` | Gemini CLI 동기화 |
