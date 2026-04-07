# Architecture - 설계 결정

> MEMORY.md 키워드 인덱스에서 이 파일로 연결됩니다.

---

### agents, skills, passive-context, vercel
`tags: agents, skills, passive-context, vercel`
`date: 2026-01-31`

- **AGENTS.md**: 프레임워크 지식, 코드 생성 규칙 (패시브 = 100% 통과율)
- **Skills**: 사용자 트리거 워크플로우, 마이그레이션
- **원칙**: Retrieval-led reasoning > Pre-training knowledge
- **참조**: [2026-01-31 대화](.claude/conversations/2026-01-31.md)

### memory, conversation, hooks, append, context-tree, response-saving
`tags: memory, conversation, hooks, append, context-tree, response-saving`
`date: 2026-02-03`

- Before: Stop 훅에서 Claude 2번 호출 (키워드 추출 + 메모리 업데이트)
- After: Stop 훅 없음, Claude가 대화 중 직접 처리
- **이유**: 속도 개선 (훅에서 AI 호출 금지 원칙)
- Before: 코드 작성, 파일 수정 등 "실제 작업"만 저장
- After: 의미있는 대화 모두 저장 (토론, 의사결정 과정 포함)
- **이유**: "의견을 도출해나가는 과정"도 가치 있음
- **제외**: 단순 인사, 잡담만
- User 입력: 훅에서 자동 저장
- Assistant 응답: Claude가 직접 저장 (Edit 도구, ~100ms) → 실패, Stop 훅으로 대체
- MEMORY.md: 컨텍스트 트리 구조 (architecture/, patterns/, gotchas/)

### synonym, 동의어, search, 확장, memory, grep
`tags: synonym, 동의어, search, 확장, memory, grep`
`date: 2026-02-04`

- 과거 대화 검색 시 정확한 키워드 매칭 → **동의어/관련어 확장** 검색으로 개선
- 한↔영 양방향 확장 (예: "병렬 작업" → parallel, orchestrator, pm-worker)
- 최대 3회 재시도, 하위 키워드 발견 시 추가 탐색 1회
- 벡터 DB 없이 Claude의 언어 이해력으로 동의어 확장
- CLAUDE.md 검색 규칙 3단계 → 5단계로 확장
- **참조**: [2026-02-04 대화](.claude/conversations/2026-02-04.md)

### stop-hook, transcript, save-response, jsonl
`tags: stop-hook, transcript, save-response, jsonl`
`date: 2026-02-08`

- **변경 이유**: "Claude가 직접 저장"은 실행되지 않음 (수동 지시 무시됨)
- Stop 훅에서 **AI 호출 없이** transcript JSONL에서 기계적으로 추출
- Claude Code JSONL은 thinking/text/tool_use를 별도 줄로 분리 → `"type":"assistant"` AND `"type":"text"` 모두 매칭 필요
- **2026-02-08 개선**: Tail 20→500 (도구 100+개 호출 시에도 텍스트 추출), 500자→2000자 (상세 응답 보존), HH:mm→HH:mm:ss (초 단위 중복 방지)
- **2026-02-08 성능 수정**: `Get-Content -Tail 500` → `FileStream.Seek` 역방향 읽기. 대용량 JSONL(수백MB)에서 1분+ → 수ms. 512KB 청크, 최대 5MB 탐색. `.sh`는 `tail -n`이 이미 lseek 사용하므로 수정 불필요
- **파일**: `hooks/save-response.ps1`, `hooks/save-response.sh`
- **참조**: [2026-02-08 대화](.claude/conversations/2026-02-08.md)

### official-docs, frontmatter, subagent-spec, 공식문서, claude-code-docs
`tags: official-docs, frontmatter, subagent-spec, 공식문서, claude-code-docs`
`date: 2026-02-09`

- `name` (필수), `description` (필수)
- `tools`, `disallowedTools`, `model` (sonnet/opus/haiku/inherit)
- `permissionMode` (default/acceptEdits/delegate/dontAsk/bypassPermissions/plan)
- `maxTurns`, `skills` (프리로드), `mcpServers` (서브에이전트에 MCP 할당)
- `hooks` (서브에이전트 스코프 훅), `memory` (user/project/local 영속)

### agent, skill, fullstack, spring-boot, react, orchestration, flow
`tags: agent, skill, fullstack, spring-boot, react, orchestration, flow`
`date: 2026-02-03`

- Before: 단일 에이전트 484줄 (규칙+코드 예시 혼재)
- After: 에이전트(~235줄 규칙/체크리스트) + 스킬(코드 예시 + templates/)
- **이유**: 500줄 제한 준수, 패시브 에이전트는 규칙만, 상세 코드는 on-demand
- 백엔드 4계층: Controller → Flow → Service → Repository
- Flow 항상 존재 (단순 위임도 통일성 우선)
- 프론트 Feature-based + TanStack Query 3계층
- Java/Spring Boot 12개 코딩 규칙 포함 (@Transactional, DTO 변환, 예외 처리 등)

### flow-diagrams, 공정도면, zephermine-workpm, pipeline
`tags: flow-diagrams, 공정도면, zephermine, workpm, flow-verifier, qpassenger, pipeline`
`date: 2026-03-13`
`source: claude`

- 파이프라인 = 건축 프로세스 비유: 설계사(젭마인) → 현장감독(다이달로스/workpm) → 감리(아르고스) → 실사(큐패신저), 크로노스는 횡단 자율수리 도구
- 자재검사(code-reviewer)는 시공 중 자동 실행, 준공검사(argos)는 시공 후 수동 호출
- workpm의 신화 이름: 다이달로스(Daedalus) — 미궁을 지은 전설적 건축가/장인
- ❌ SUPERSEDED: ~~MCP vs 네이티브 결정 (2026-03-13)~~ → superseded-by: #daedalus-native-only
- ✅ CURRENT (2026-03-14) #daedalus-native-only: 다이달로스는 네이티브 Agent Teams 전용. MCP 모드는 state.json race condition, Worker spawn 실패 무감지, 크래시 복원 미구현 등 프로토타입 수준으로 판명. 크로스-CLI는 젭마인이 Bash로 직접 처리하므로 구현 단계에서 불필요.
- **다이달로스 vs 대니즈팀 역할 분리 (2026-03-14)**: 다이달로스는 "젭마인 없이 바로 구현" (리서치→제안→도면→구현→검증), 대니즈팀은 "젭마인 산출물 기반 구현" (섹션 파싱→Wave→전문가 매칭→구현→검증). 젭마인 Output Summary에서 대니즈팀만 권장.
- **문제**: 젭마인이 시방서(spec, sections)만 주고 공정 도면(flow-diagrams)은 생성하지 않았음 → workpm이 도면 없이 시공 → 설계 의도에서 벗어남
- **해결**: 젭마인 Step 16 (MANDATORY)에서 `flow-diagrams/*.mmd` 생성, workpm Phase 2/4에서 도면 기반 시공. `.5` 넘버링은 스킵 유발하여 모든 스킬에서 정수 번호로 통일 (2026-03-14)
- **감리 분리**: verify-protocol을 젭마인에서 분리 → `/argos` 독립 스킬 (설계사≠감리 원칙)
- **도면 흐름**: 젭마인이 그림 → workpm이 재사용 (없으면 새로 생성) → argos Phase 5에서 도면 대조
- **역할별 도면 참조**: PM(✅ 해석·배분) → Worker(❌ 지시만) → 자재검사(❌ 품질만) → 감리(✅ 대조) → 실사(❌ 시나리오만)
- **Why**: 설계→시공 사이에 공정 기준선이 없으면 구현이 설계에서 drift하는 문제 방지
- **참조**: workpm.md Phase 2/4, workpm-mcp.md Phase 2/4, zephermine SKILL.md Step 16 (MANDATORY), argos/SKILL.md

### global-install, codex-parity, mnemo-name
`tags: global-install, codex-parity, mnemo-name`
`date: 2026-03-13`
`source: codex`

- Codex runtime의 source of truth는 repo-local이 아니라 전역 설치본(`~/.codex`, Roaming 설치 경로)으로 유지하고, repo 변경은 sync/install을 통해 반영.
- 원칙상 Claude에서 제공하는 skills, agents, hooks, rules, MCP 기능은 Codex에서도 동일 기능 parity를 목표로 맞추며, 단순 복사가 아니라 Codex 실행 모델에 맞는 bridge/adapter까지 포함해 구현.
- 사용자 호출명도 CLI 간 동일하게 유지하고, 우선 고정 호출명은 `/zephermine`, `/zeus`, `/daedalus`(workpm), `/argos`, `/chronos`, `/qpassenger`, `/agent-team`으로 관리한다. parity 판단은 "파일이 복사됐는가"가 아니라 "전역 설치본에서 실제 같은 이름으로 호출되고 동작하는가" 기준으로 한다.
- `mnemo` 명칭은 유지하고 `codex-mnemo`, `gemini-mnemo`는 CLI별 어댑터 이름으로 계속 사용.

### qpassenger-server-auto, zeus-docker-phase, codex-skill-discovery
`tags: qpassenger, 서버자동실행, zeus, docker-deploy, codex, 스킬발견`
`date: 2026-03-13`
`source: claude`

- **큐패신저 6단계**: Step 3 "서버 준비" 추가 — docker-compose 우선, dev server fallback, 포트 점유 kill 후 같은 포트로 실행
- **제우스 Phase 2.7**: Docker Setup (docker-deploy) 추가 — argos 감리 후, qpassenger 전에 Docker 환경 구성 + 포트 충돌 해결 + 컨테이너 실행
- **다이달로스는 docker-deploy 안 함** — Docker 환경 구성은 제우스가 테스트 직전에 담당
- **install-select.js 기본값**: all로 변경 (Claude+Codex+Gemini 전부 설치)
- **Codex 스킬 발견 문제**: 파일은 `~/.codex/skills/`에 복사되지만, Codex AI가 스킬 존재를 모름. `instructions.md` 없음. 다음 세션에서 해결 필요
- **memory 폴더 통합 검토**: 비용 대비 이점 부족 → 현재 구조 유지 결정

### mnemo, jsonl, source-of-truth, reconcile, sidecar-index, uuid-dedup
`tags: mnemo, jsonl, transcript, reconcile, sidecar-index, uuid, dedup`
`date: 2026-04-08`
`source: claude`

- **JSONL transcript = source of truth, conversations/.md = 미러** (단방향 → 양방향 reconcile)
- Claude: `~/.claude/projects/<encoded>/*.jsonl`, Codex: `~/.codex/sessions/.../rollout-*.jsonl`, Gemini: 자체 transcript 없음 (reconcile 불가능)
- **사이드카 인덱스**: `conversations/.mnemo-index.json` = `{version, claude: {date: [uuid]}, codex: {date: [sha1]}}`
- **Dedup 키**: Claude는 JSONL line uuid (각 줄 고유), Codex는 `sha1(timestamp + role + content[:200])` (Codex는 line uuid 없음)
- save-response/save-turn과 reconcile이 동일 인덱스 공유 → 양방향 멱등
- **참조**: commit b11761e

### cwd-resolution, project-root, jsonl-cwd, hook-pwd-bug, vs-bin-debug
`tags: cwd, project-root, hook, jsonl, sub-directory, visual-studio`
`date: 2026-04-08`
`source: claude`

- **문제**: hook 실행 시점의 PWD에 의존 → Visual Studio bin/Debug 같은 sub-directory에 conversations 폴더 잘못 생성됨
- **3단계 우선순위 (Get-ClaudeProjectRoot / get_claude_project_root)**:
  1. JSONL transcript의 마지막 메시지 cwd 필드 → 그 cwd에서 git -C rev-parse
  2. transcript_path 부모 디렉토리 디코딩 (D--git-foo → D:\git\foo)
  3. 기존 PWD + git rev-parse (최종 fallback)
- 적용: save-response/save-conversation/save-tool-use/reconcile-conversations + Codex/Gemini save-turn (총 8개 hook)
- **Gemini hook payload는 transcript_path 부재** → cwd 필드 직접 + git rev-parse 정규화로 처리
- **참조**: commit 887f261 (Claude/Codex), 27b07cd (Gemini)

### greek-mythology-naming, poseidon, minos, clio, pantheon, skill-olympus
`tags: naming, greek-mythology, poseidon, minos, clio, pantheon, repo-rename`
`date: 2026-04-08`
`source: claude`

- **그리스 신화 일관성**: 핵심 파이프라인 스킬을 모두 신화 이름으로 통일
- **Rename**: agent-team 별칭 대니즈팀 → **포세이돈** (파도/wave 비유), qpassenger → **미노스** (저승 심판자, fix-until-pass), final-inspection/closer → **클리오** (역사의 뮤즈, 마지막 기록자)
- **Repo rename**: claude-code-agent-customizations → **skill-olympus** (`gh repo rename`, GitHub 자동 redirect)
- 호출명: `/poseidon`, `/minos`, `/clio` (legacy alias 모두 유지: /agent-team, /qpassenger, /closer)
- **참조**: commit ac10f12

### 3-cli-parity, hook-event-mapping, codex-notify, gemini-beforeagent
`tags: parity, hook, claude, codex, gemini, event-mapping, structural-limit`
`date: 2026-04-08`
`source: claude`

- **3-CLI hook event 매핑** (구조적 한계 명확화):
  - Claude: UserPromptSubmit / PreToolUse / PostToolUse / Stop / SessionStart (5종)
  - Codex: notify (1종) — turn 끝에만 발동, save-turn에서 codex-hook-bridge.js로 chain 호출
  - Gemini: BeforeAgent / BeforeTool / AfterModel / AfterAgent (4종)
- **Codex 구조적 한계**: notify 1개만 → PreToolUse 차단형 hook (protect-files, check-new-file) 불가능. 사후 검증만 가능
- **save-tool-use는 Claude only**: Codex/Gemini 모두 PostToolUse 이벤트 부재 → 개별 도구 호출 추적 불가
- **Rules는 100% parity**: install-claude-md.js + codex/gemini-mnemo template 공유로 6개 핵심 규칙 자동 동기화
- **참조**: 3-CLI parity audit (2026-04-08 세션)
