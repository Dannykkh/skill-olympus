### Gemini CLI Global Configuration
`tags: gemini-cli, global-config, settings, mcp, hooks`
`date: 2026-03-08`
`source: gemini`

#### 1. Directory Structure
- **Home Path**: `%USERPROFILE%\.gemini\`
- **Skills**: `skills/` 폴더 내에 위치 (각 폴더는 `SKILL.md`를 포함해야 함)
- **Agents**: `agents/` 폴더 내에 `.md` 지침 파일 위치
- **Hooks**: `hooks/` 폴더 내에 `.ps1`, `.sh`, `.js` 실행 스크립트 위치

#### 2. Global Rules (Persona)
- **Files**: `%USERPROFILE%\.gemini\AGENTS.md` 및 `GEMINI.md`
- **Loading**: `settings.json`의 `context.fileName`에 명시되어야 에이전트가 이를 읽음.
  - 예: `"context": { "fileName": ["AGENTS.md", "GEMINI.md"] }`

#### 3. settings.json Configuration
- **Core Toggle**: `"enableAgents": true` (스킬과 에이전트 활성화를 위한 필수 설정)
- **Hooks**: `AfterAgent`, `BeforeAgent`, `BeforeTool`, `AfterTool` 섹션에 등록.
  - 제미나이 전용 훅 (`save-turn.ps1`)은 `AfterAgent`에 등록하여 대화를 자동 저장함.

#### 4. MCP Registration
- **Command**: `gemini mcp add <name> <command> [args]`
- **Status**: `gemini mcp list`로 연결 상태 확인 가능.

#### 5. Skill/Agent Sync
- **Manual**: 프로젝트의 `skills/`, `agents/` 파일을 전역 폴더로 복사.
- **Auto**: `sync-gemini-assets.js` 스크립트를 통해 원본에서 전역 폴더로 일괄 동기화.

- **Reference**: [Conversations/2026-03-08.md](conversations/2026-03-08.md)
