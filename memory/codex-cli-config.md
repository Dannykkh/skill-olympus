### Codex CLI Global Configuration
`tags: codex-cli, global-config, config-toml, agents, skills, hooks, mcp, rules`
`date: 2026-03-08`
`source: codex`

#### 1. Directory Structure
- **Home Path**: `%USERPROFILE%\.codex\`
- **Skills**: `skills/<name>/SKILL.md` 형태로 전역 설치
- **Agents**: `agents/*.md`는 패시브 지침, `agents/*.toml`은 custom agent 프로필로 사용 가능
- **Hooks**: `hooks/*.ps1|*.sh`를 두고 `config.toml`의 `notify = [...]`로 연결
- **Rules**: `AGENTS.md`는 전역 행동 규칙, `rules/*.rules`는 `prefix_rule(...)` 기반 허용 규칙

#### 2. 어디에 무엇을 쓰는가
- **글로벌 스킬**: `~/.codex/skills/`에 폴더째 복사. 이 저장소에서는 `scripts/sync-codex-assets.js`가 repo `skills/`를 전역 경로로 동기화함.
- **글로벌 에이전트 문서**: `~/.codex/agents/*.md`에 둠. 이 저장소의 sync 스크립트가 repo `agents/`와 skill 내 `agents/`를 함께 복사함.
- **Codex custom agent**: `~/.codex/agents/<name>.toml` 작성 후 `config.toml`에 `[agents.<name>]`, `description`, `config_file` 등록.
- **글로벌 훅**: Claude/Gemini식 `settings.json hooks`가 아니라 `~/.codex/hooks/` + `config.toml`의 `notify` 1개 엔트리로 구성.
- **글로벌 MCP**: `codex mcp add/list/get/remove` 또는 `config.toml`의 `[mcp_servers.<name>]` 섹션으로 관리.
- **전역 규칙/페르소나**: `~/.codex/AGENTS.md`에 작성. Codex-Mnemo는 이 파일에 메모리/태그 규칙을 주입함.
- **settings.json**: Codex CLI는 기본 전역 설정 파일로 `settings.json`을 쓰지 않고 `config.toml`을 사용함.

#### 3. config.toml 핵심 섹션
- `notify = [...]`: 전역 훅 진입점. 현재 저장소의 `skills/codex-mnemo/install.js`가 이 값을 설치/제거함.
- `[features]`: 예) `multi_agent = true`
- `[agents]`: 예) `max_threads = 6`
- `[agents.<name>]`: 사용자 정의 에이전트 등록
- `[mcp_servers.<name>]`: MCP 서버 command/args/env/startup_timeout_sec 설정
- `[projects.'<path>']`: 프로젝트 trust_level 저장

#### 4. 저장소 기준 운영 패턴
- `scripts/sync-codex-assets.js`는 `skills/`, `agents/`, `hooks/`만 `~/.codex/`로 동기화하고 `.codex-sync-manifest.json`으로 관리함.
- `install-mcp-codex.js`는 `mcp-configs/*.json` preset을 읽어 `codex mcp add`로 전역 MCP를 등록함.
- `skills/codex-mnemo/install.js`는 hook 파일 복사 + `config.toml notify` 설정 + `AGENTS.md` 규칙 주입을 담당함.
- 현재 구조상 `AGENTS.md`, `config.toml`, `rules/`는 sync 대상이 아니므로 별도 설치 스크립트나 수동 편집으로 관리해야 함.

- **Reference**: [Conversations/2026-03-08-codex.md](conversations/2026-03-08-codex.md)
