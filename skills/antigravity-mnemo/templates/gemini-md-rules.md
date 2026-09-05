## 응답 및 검증 규칙

- 이모지는 사용자가 요청한 경우와 기존 파일 보존 외에는 사용하지 않습니다.
- 사실·버전·날짜는 프로젝트 파일, 실행 결과, 또는 공식 문서로 확인합니다. 확인하지 못한 값은 `[확인 필요]`로 표시합니다.
- 테스트를 실행하지 않았다면 통과했다고 말하지 않습니다.
- 응답 끝에는 단순 인사를 제외하고 ``#tags`` 키워드 블록을 3~7개 남깁니다.
- `<private>...</private>` 내용은 대화 저장 시 `[PRIVATE]`로 대체됩니다.

## Native-First 구현 경계

- 프로젝트의 구조, 테스트, 문서, 기존 composition point를 먼저 따릅니다.
- 읽기 전용 탐색은 Antigravity의 `research` 에이전트 또는 네이티브 탐색을 사용합니다.
- 구현은 쓰기 권한이 있는 작업자에게만 맡기고, 읽기 전용 작업자에게 쓰기 작업을 주지 않는다.
- 네이티브 서브에이전트는 `invoke_subagent`, `define_subagent`, `send_message`, `manage_subagents` 계약을 따릅니다.
- Olympus 사용자 정의 에이전트는 기본 등록 0개다. source-only `.md`는 런타임 능력으로 간주하지 않는다.
- 메인 컨텍스트가 공유 태스크 장부·활동 로그·완료 판정을 소유한다. 위임이 없거나 병렬 이득이 없으면 메인 컨텍스트에서 순차 실행한다.

## Antigravity 네이티브 워크플로 우선순위

- `/goal`: 유한 작업의 지속성. 실제 테스트 게이트·우선순위·PARK·감사 로그가 필요할 때만 Chronos를 더합니다.
- `/plan`, `/grill-me`: 가벼운 계획과 요구사항 인터뷰. 저장되는 spec·API/DB·flow·sections·QA 묶음이 필요할 때만 Zephermine을 더합니다.
- `/teamwork-preview`: 플랜과 런타임에서 가용한 일반 장기 팀 작업. Wave·파일 소유권·자재/테스트 게이트가 필요할 때만 Agent Team 또는 WorkPM을 더합니다.
- `/learn`: 현재 대화의 교정·선호를 Rules 또는 Skill로 정리. 여러 세션의 프로젝트 관찰 cluster/rebuild/evolve는 Mnemo source-only 모듈이 담당합니다.
- `/schedule`: 예약·cron·반복 모니터링. 유한한 FIND→FIX→VERIFY 완료 계약을 대신하거나 Chronos heartbeat로 가장하지 않습니다.
- `/browser`: 브라우저 조사·화면 관찰. 반복 가능한 QA 판정은 Minos Playwright, 디자인 계약·렌더 비평은 Aphrodite가 담당합니다.
- `/btw`: 현재 작업을 바꾸지 않는 옆 질문. `/skills`, `/agents`, `/tasks`, `/hooks`, `/mcp`는 해당 자산의 설치·상태 확인에 우선합니다.

slash command는 사용자/TUI 진입점입니다. 스킬이 프로그램적으로 호출한다고 가정하지 않으며,
네이티브 기능만으로 요청이 완결되면 유사 Olympus 하네스를 중첩하지 않습니다.

## Antigravity lifecycle

- 훅 이벤트는 `PreToolUse`, `PostToolUse`, `PreInvocation`, `PostInvocation`, `Stop`입니다.
- 구 Gemini CLI의 `BeforeTool`, `AfterTool`, `BeforeAgent`, `AfterAgent` 설정은 재사용하지 않습니다.

## 스킬과 카탈로그

1. 전역 `~/.gemini/antigravity-cli/SKILLS-CATALOG.md`
2. 현재 프로젝트에 실제 파일이 있을 때만 `./SKILLS-CATALOG.md`
3. `~/.gemini/antigravity-cli/skills/*/SKILL.md`

사용자가 스킬을 요청하면 위 순서로 찾습니다. 카탈로그의 source-only 하위 모듈은 `읽을 경로`의 정확한 `SKILL.md`를 직접 읽어 그 요청 동안만 사용합니다. 필수 모듈이 없으면 `NOT RUN`으로 남기며 활성 slash command라고 가정하지 않습니다.

영상·비디오·MP4 제작 요청은 활성 `video-maker`가 진입점입니다. 전역 스킬 디렉터리에 설치된 HyperFrames 번들의 `hyperframes` 라우터와 워크플로우 스킬은 진입점이 아니며, `video-maker`가 HyperFrames를 선택했을 때 그 문서가 지정한 모듈만 정확한 `SKILL.md` 경로로 읽습니다.

스킬 문서의 상대경로는 선택한 `SKILL.md`가 있는 모듈 디렉터리를 기준으로 해석하며, 임의 프로젝트 cwd에서 상대경로를 그대로 실행하지 않는다.

메모리 압축이나 정제가 필요하면 같은 절차로 source-only `memory-compact` 또는 `memory-distill`의 정확한 `SKILL.md`를 읽습니다.

## Mnemo 검색 규칙

과거 작업을 언급하면 `MEMORY.md` 인덱스, 관련 `memory/*.md` 항목, `conversations/*.md` 순으로 필요한 범위만 검색합니다. Antigravity의 `transcriptPath` 원본은 Stop 훅 입력일 뿐, 과거 대화 검색 대상으로 직접 읽지 않습니다.

대화 저장본은 `conversations/YYYY-MM-DD-antigravity.md`입니다. Stop 훅이 실패하면 `.claude/mnemo-errors.log`를 확인합니다.

의미기억 항목의 `source:` 값은 `claude`, `codex`, `antigravity`, `grok` 중 하나만 사용합니다.

## 자동 핸드오프

컨텍스트 압축이 감지되거나 사용자가 핸드오프를 요청하면 다음을 수행합니다.

1. 중요한 결정과 반복 가능한 패턴을 `memory/*.md` 및 `MEMORY.md` 인덱스에 반영합니다.
2. `docs/handoffs/YYYY-MM-DD-HHMMSS-{slug}.md`에 완료 작업, 변경 파일, 결정, 다음 단계, 차단 사항을 기록합니다.
3. 생성한 핸드오프 경로와 남은 작업을 사용자에게 알립니다.
