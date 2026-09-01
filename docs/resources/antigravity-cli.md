# Google Antigravity CLI Integration

> Olympus에서 Google 모델을 호출하는 현재 CLI 런타임은 Antigravity CLI이며 실행 명령은 `agy`입니다. Gemini는 모델 패밀리 이름과 `GEMINI.md` 규칙 파일명으로 남습니다.

이 문서는 Antigravity CLI(`agy`)를 대상으로 합니다. Antigravity 2.0 앱의 전역 skill 경로와 혼용하지 않습니다.

## 기본 명령

```bash
agy --version
agy models
agy -p "Review this plan and cite file:line evidence." --output-format text
```

모델을 명시해야 할 때는 `agy models`가 현재 표시한 ID를 `--model <id>`로 전달합니다. preview 모델명을 문서나 스킬에 고정하지 않습니다.

## 자동화

Headless 출력은 `text`, `json`, `stream-json` 중 하나를 선택할 수 있습니다.

```bash
timeout 600 agy \
  -p "Review the authentication flow. Return actionable findings only." \
  --output-format json
```

읽기 전용 리뷰에는 permission 우회 옵션을 쓰지 않습니다. Olympus 자동 워커도 `--dangerously-skip-permissions`를 추가하지 않고 현재 permission policy를 따릅니다. 사용자가 별도 실행에서 무인 쓰기·명령 실행을 명시적으로 허용한 경우에만 해당 우회 옵션을 직접 선택합니다.

## 네이티브 워크플로와 Olympus 경계

Antigravity는 Agent Skills만 읽는 런타임이 아니라 다음 workflow를 네이티브로 제공합니다. Olympus는
같은 엔진을 다시 만들지 않고, 아래의 추가 산출물·정책·검증 계약이 필요할 때만 위에 얹습니다.

| 네이티브 기능 | 네이티브가 소유하는 범위 | Olympus를 더하는 경우 |
|---------------|--------------------------|------------------------|
| `/goal` | 유한 작업을 완료까지 지속 | Chronos의 실제 테스트 게이트, Critical→Low 사이클, PARK/Owner Brief, 감사 로그가 필요할 때 |
| `/plan` | 가벼운 구현 계획과 검토 | Zephermine의 저장형 spec, domain dictionary, API/DB, flow, sections, operation/QA 묶음이 필요할 때 |
| `/grill-me` | 요구사항을 집중 질문으로 좁힘 | 인터뷰 결과를 위 설계 묶음과 downstream 구현 계약으로 연결할 때 |
| `/teamwork-preview` | 일반 장기·다중 에이전트 작업 | 플랜·가용성 확인 후 Poseidon/WorkPM의 Wave, 파일 소유권, 장부, 자재·테스트 게이트가 필요할 때 |
| `/learn` | 현재 대화의 교정·선호를 Rules 또는 Skill로 정리 | 프로젝트의 여러 세션 raw 관찰을 Mnemo가 cluster/rebuild하고 skill-evolve가 대조 검증할 때 |
| `/schedule` | 타이머, cron, 반복 실행·모니터링 | 유한한 FIND→FIX→VERIFY 완료 계약은 Chronos. `/schedule`은 `/goal`이나 heartbeat 대체물이 아님 |
| `/browser` | 샌드박스 브라우저 조사와 화면 관찰 | Minos의 재실행 가능한 Playwright 판정 또는 Aphrodite의 Experience Contract·렌더 비평이 필요할 때 |
| `/btw` | 현재 작업을 바꾸지 않는 옆 질문 | 별도 Olympus 하네스 불필요 |

`/skills`, `/agents`, `/tasks`, `/hooks`, `/mcp`는 해당 런타임 자산과 상태를 관리하는 네이티브 진입점입니다.
slash command는 사용자/TUI 진입점이므로 `SKILL.md`가 프로그램적으로 호출할 수 있다고 가정하지 않습니다.
현재 세션에 이미 활성화된 goal·team·browser 문맥이 있으면 실행 엔진으로 재사용하고 중첩 하네스를 만들지
않습니다. `/teamwork-preview`는 플랜과 배포 상태에 따라 가용성이 달라질 수 있으며 Olympus가 이를 우회하지 않습니다.

## Olympus 설치 경로

| 자산 | 전역 경로 |
|------|-----------|
| Skills | `~/.gemini/antigravity-cli/skills/<name>/SKILL.md` |
| Agents | `~/.gemini/config/agents/` |
| Hooks config | `~/.gemini/config/hooks.json` |
| MCP config | `~/.gemini/config/mcp_config.json` |
| CLI settings | `~/.gemini/antigravity-cli/settings.json` |
| Rules | `~/.gemini/GEMINI.md` |

프로젝트 스킬은 `.agents/skills/`, 프로젝트 에이전트는 `.agents/agents/`도 사용할 수 있습니다.

## Claude Code 스킬 호환성 경계

Claude Code 스킬을 그대로 복사했다고 모두 동작하는 것은 아닙니다. Antigravity가 직접 읽을 수 있는
공통 단위는 폴더 안의 `SKILL.md`와 `name`·`description` frontmatter입니다. 스킬 자신의
`scripts/`, `references/`, `assets/`는 실제로 로드한 `SKILL.md`의 부모인 `module_root`에서
해석해야 합니다.

공개 추적 스킬 100개의 기본 Antigravity 분류는 다음과 같습니다.

| 분류 | 개수 | 의미 |
|------|-----:|------|
| 기본 활성 | 20 | 글로벌 slash/자동 탐색 표면에 설치하며 Antigravity 역할·훅 분기를 정적으로 확인 |
| source-only | 76 | 카탈로그에서 정확한 경로로 읽을 수 있지만 기본 slash 명령이나 개별 실행 인증은 아님 |
| 런타임 제외 | 4 | 다른 CLI 전용 어댑터라 Antigravity 홈에 설치하지 않음 |

기본 활성 20개는 `agent-team`, `antigravity-mnemo`, `api-tester`, `argos`,
`auto-continue-loop`, `biz-strategy`, `ceo`, `clio`, `design-plan`, `explain`, `hestia`,
`ko-en-translator`, `minos`, `release-notes`, `seo-audit`, `themis`, `video-maker`, `workpm`,
`zephermine`, `zeus`입니다.

직접 제외하는 네 스킬은 `agent-team-codex`, `codex-mnemo`, `grok-mnemo`, `mnemo`입니다.
Antigravity에서는 각각 공통 `agent-team`과 `antigravity-mnemo`가 대응합니다.

공개 100개와 로컬 전용 `deploymonitor`를 합친 canonical `SKILL.md` 101개는 현재 공통 Agent
Skills frontmatter 검증을 통과합니다. 이 저장소의 보수적 교집합은 필수 `name`·`description`과
선택 `license`·flat-string `metadata`입니다. 상위 표준의 `compatibility`와 실험적 `allowed-tools`는
현재 네 런타임 검증기가 같은 형식으로 받아들이지 않으므로 공통 원본에서 사용하지 않습니다. 마이그레이션 전에는 22개가 Claude 확장 필드, 구형
`triggers/auto_apply`, 또는 잘못된 YAML 때문에 실패했으며 현재는 정규화했습니다.

다음은 파일 복사만으로 호환되지 않으므로 명시적인 Antigravity 분기나 폴백이 필요합니다.

- Claude의 `Agent`, `SendMessage`, `TodoWrite` 같은 도구 이름과 `.claude/commands/` 커맨드
- Claude 확장 frontmatter인 `disable-model-invocation`, `user-invocable`, `argument-hint`,
  `context`, `model`; `allowed-tools`도 구현별 지원이 다른 실험 필드
- `UserPromptSubmit`, `SessionStart` 같은 Claude 훅 payload와 transcript 위치
- 런타임마다 의미와 호출 계약이 다른 네이티브 slash 기능. `/goal`은 Antigravity에도 있으므로 공통 목표문으로 연결하고, Claude `/loop`·`/code-review`는 별도 분기
- `~/.claude/skills/...`처럼 스킬 자신의 설치 홈을 고정한 리소스 경로
- 설치되지 않은 외부 CLI, MCP 서버, 브라우저, Docker 같은 선택 의존성

Olympus는 위 항목을 의미 역할, Antigravity native workflow·`Stop` 훅, `invoke_subagent`, 또는 메인 순차
실행으로 분기합니다. 다만 source-only는 “읽을 수 있음”을 뜻하며 모든 선택 의존성까지 실제 실행됐다는
뜻은 아닙니다. 현재 저장소 검증은 정적 계약과 격리 설치까지이며, 실제 `agy` 세션 검증은 실행 파일이
있는 환경에서 별도로 해야 합니다.

`command-creator`는 Antigravity에서 `.claude/commands/`를 만들지 않고 portable skill 또는 prompt
recipe로 전환합니다. `plugin-forge`는 Claude Code plugin 제작 자체가 목적이므로, 그 산출물을
Antigravity plugin으로 간주하면 안 됩니다. Jira·Stitch·Playwright·Docker·외부 CLI 같은 연동형
source-only 스킬은 해당 실행 파일, MCP, 인증이 준비됐을 때만 기능 단위로 검증할 수 있습니다.

## Hooks와 Mnemo

Antigravity는 `PreToolUse`, `PostToolUse`, `PreInvocation`, `PostInvocation`, `Stop` 이벤트를 제공합니다. Olympus Mnemo는 Stop payload의 camelCase `conversationId`, `workspacePaths`, `transcriptPath`를 사용합니다. 구 Gemini CLI의 `AfterAgent` 설정은 마이그레이션 대상입니다.

## MCP

`~/.gemini/config/mcp_config.json`의 루트는 `mcpServers`입니다. 원격 서버는 `serverUrl`, stdio 서버는 `command`, `args`, `env`를 사용합니다.

## 공식 문서

- [Gemini CLI transition](https://github.com/google-gemini/gemini-cli/discussions/27274)
- [Gemini CLI migration](https://www.antigravity.google/docs/cli/gcli-migration)
- [CLI Plugins & Skills](https://antigravity.google/docs/cli/plugins/)
- [Slash commands](https://antigravity.google/docs/slash-commands/)
- [Agent Skills](https://antigravity.google/docs/skills/)
- [Subagents](https://antigravity.google/docs/subagents)
- [Agent Skills open standard](https://agentskills.io/specification)
- [Headless mode](https://www.antigravity.google/docs/cli/headless/)
- [Hooks](https://www.antigravity.google/docs/hooks/)
- [MCP](https://www.antigravity.google/docs/cli/mcp/)
- [Agents](https://www.antigravity.google/docs/cli/commands/agents)

**마지막 업데이트:** 2026-08-31
