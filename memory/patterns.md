# Patterns - 작업 패턴, 워크플로우

> MEMORY.md 키워드 인덱스에서 이 파일로 연결됩니다.

---

### skill-500, progressive-disclosure, context
`tags: skill-500, progressive-disclosure, context`
`date: 2026-01-31`

- **500줄 제한**: SKILL.md는 500줄 이하 유지
- **분리**: 상세 내용은 `templates/` 또는 `references/`로
- **예시**: docker-deploy (1,179줄 → 109줄 + templates/)
- **예시**: database-schema-designer (687줄 → 500줄 + references/ 3개)

### naming, kebab-case, folder
`tags: naming, kebab-case, folder`
`date: 2026-01-31`

- 폴더명 = YAML frontmatter `name` 필드와 일치
- kebab-case 사용 (예: `python-backend-fastapi`)

### readme, documentation, sync
`tags: readme, documentation, sync`
`date: 2026-01-31`

- README.md ↔ README-ko.md 동기화
- AGENTS.md 수정 시 Quick Retrieval Paths 확인
- **⚠️ 리소스 추가/삭제 시 체크리스트**: CLAUDE.md "리소스 변경 시 필수 체크리스트" + gotchas/cross-cli-sync-checklist 참조

### wrap-up, session, keyword, memory, 장기기억
`tags: wrap-up, session, keyword, memory, 장기기억`
`date: 2026-02-04`

- `/wrap-up` 슬래시 명령어로 세션 종료 시 실행
- 키워드 추출 → frontmatter 업데이트
- 세션 요약 (오늘 한 일, 주요 결정, 다음 할 일)
- 중요 결정 → MEMORY.md 업데이트 (Superseded 패턴 적용)
- **핵심**: RAG 없이 키워드 기반 파일 검색으로 가벼운 장기기억
- **참조**: [2026-02-04 대화](.claude/conversations/2026-02-04.md)

### context-management, 리셋, 세션분리, compact, token
`tags: context-management, 리셋, 세션분리, compact, token`
`date: 2026-02-08`

- CLAUDE.md에 컨텍스트 관리 가이드 추가
- 리셋 타이밍: 80-100k 토큰, /compact 3회, 응답 느려질 때
- 세션 분리: 인터뷰 ≠ 설계 ≠ 구현 ≠ 리뷰
- 세션 핸드오프: /wrap-up → MEMORY.md 자동 이어받기
- **참조**: [2026-02-08 대화](.claude/conversations/2026-02-08.md)

### workflow-chaining, 체이닝, 권장워크플로우, agents
`tags: workflow-chaining, 체이닝, 권장워크플로우, agents`
`date: 2026-02-08`

- AGENTS.md에 Recommended Workflows 섹션 추가 (P5)
- 6개 시나리오별 에이전트 체이닝 순서 정의
- 새 프로젝트, UI→구현, 코드 리뷰, 기능 추가, 리팩토링, 보안 감사
- **참조**: [2026-02-08 대화](.claude/conversations/2026-02-08.md)

### zeus, full-pipeline, no-skip, fallback, workpm, qpassenger
`tags: zeus, full-pipeline, no-skip, fallback, workpm, qpassenger`
`date: 2026-02-26`
`source: codex`

- Zeus 체인의 핵심 3단계(zephermine/workpm/qpassenger)는 실패 시에도 skip하지 않고 최소 1회 실행 시도로 고정.
- `skills/zeus/commands/zeus.md`에서 `AskUserQuestion` tool 제거, 종료 전 phase 실행 증거 체크리스트 추가.
- `skills/zeus/SKILL.md` 및 `skills/zeus/references/phase-transitions.md`의 PHASE_SKIP/STEP_SKIP 경로를 PHASE_FALLBACK/STEP_RETRY로 전환.
- Zeus의 질문 처리 정책을 `recommended-first`로 정의: `(Recommended)` 옵션 우선 자동선택, 미존재 시 fallback 테이블 사용.
- **참조**: [대화 링크](conversations/2026-02-26-codex.md)

### coding-mindset, yagni, kiss, 개발원칙, read-first
`tags: coding-mindset, yagni, kiss, 개발원칙, read-first`
`date: 2026-02-08`

- CLAUDE.md에 "개발 원칙" 섹션 추가 (P5)
- 3가지 원칙: 주니어 마인드셋, 코드 작성, 의사결정
- Read First, YAGNI, KISS, 트레이드오프 명시
- **참조**: [2026-02-08 대화](.claude/conversations/2026-02-08.md)

### dedup, hooks, claude-md, snippet, 중복제거, agents, skills
`tags: dedup, hooks, claude-md, snippet, 중복제거, agents, skills`
`date: 2026-02-08`

- code-reviewer ↔ security-reviewer 보안 섹션 통합
- qa-engineer ↔ qa-writer TC 템플릿 중복 제거
- react 관련 3개 에이전트 상호 참조 추가
- react-useeffect → react-dev로 통합 (references/ 이동)
- requirements-clarity → orchestrator PM workpm.md로 통합 후 삭제
- mnemo save-conversation/response: 루트와 동일 → 삭제
- orchestrator 6개: orchestrator-detector.js로 대체됨 → 삭제
- format-java/typescript: format-code가 이미 처리 → 삭제
- save-response.ps1: Mnemo 개선판(Tail 500, 2000자, HH:mm:ss)을 루트로 통합
- 원인: install-claude-md.js(CUSTOMIZATIONS 마커) + mnemo install.js(MNEMO 마커)가 같은 규칙을 다른 마커로 주입
- 해결: install-claude-md.js 마커를 MNEMO로 통일, 구버전+CUSTOMIZATIONS 블록 삭제
- 글로벌 CLAUDE.md: 223줄 → 88줄
- 프로젝트 CLAUDE.md: 150줄 → 96줄 (규칙을 글로벌 참조로 대체)
- 같은 내용을 다른 마커로 주입하면 서로 감지 못해 중복 발생
- 스킬 내부 hooks/ 폴더는 "원본 보관용"이지만 루트에 복사된 후 동기화 안 됨
- format-code 같은 범용 훅이 있으면 언어별 훅은 불필요

### schema-designer, 슬림화, references분리, 500줄
`tags: schema-designer, 슬림화, references분리, 500줄`
`date: 2026-02-08`

- `database-schema-designer/SKILL.md` 687줄 → 500줄
- `<details>` 3개 섹션을 `references/`로 분리:
- `normalization.md` (84줄) - 1NF/2NF/3NF 이론
- `nosql-mongodb.md` (54줄) - Embed vs Reference, MongoDB 인덱스
- `performance-optimization.md` (42줄) - EXPLAIN, N+1, 최적화 기법
- SKILL.md에서 한 줄 참조 링크로 대체
- Extension Points → Related Resources로 변경 (에이전트와 연결)
- **참조**: 이 세션 (2026-02-08)

### commands, skills-통합, 삭제, 슬래시명령어
`tags: commands, skills-통합, 삭제, 슬래시명령어`
`date: 2026-02-08`

- `commands/*.md` 19개 파일 전체 삭제 (-2,745줄)
- 모든 커맨드는 이미 `skills/*/SKILL.md`로 통합 완료
- 슬래시 명령어는 스킬에서 직접 제공 (별도 commands 폴더 불필요)
- **삭제 목록**: check-todos, codex-plan, compose-email, daily-sync, explain-changes-mental-model, explain-pr-changes, generate, migrate, pmworker, review, sync-branch, sync-skills-readme, test, update-docs, viral-tweet, workpm, write-api-docs, write-changelog, write-prd

### context7, 공식문서, latest-api, 라이브러리참조, mcp
`tags: context7, 공식문서, latest-api, 라이브러리참조, mcp`
`date: 2026-02-16`
`source: claude`

- **CLAUDE.md 규칙**: 라이브러리/프레임워크 사용 시 Context7 MCP로 공식 문서 확인 후 최신 API에 맞춰 구현
- **젭마인 섹션 템플릿**: Reference Libraries 섹션 추가 (라이브러리명+버전+용도 테이블)
- 구현자가 섹션 파일만 읽어도 어떤 라이브러리를 Context7으로 확인해야 하는지 알 수 있음
- **수정 파일**: CLAUDE.md, skills/zephermine/SKILL.md, skills/zephermine/references/section-splitting.md
- **참조**: 이 세션 (2026-02-16)

### 새-결정 ✅ CURRENT
`tags: 새-결정 ✅ CURRENT`
`date: 2026-02-19`

- **변경 이유**: ...

### cross-cli-sync 패턴
`tags: pattern, cross-cli-sync`
`date: 2026-02-19`

- 스킬이나 에이전트 훅 mcp를 변경하면 codex, gemini도 각각에 맞게 변경되어야 함
- readme, docs 등 사용방법도 잘 작성되어야 함

### chronos, codex, notify, auto-continue-loop
`tags: chronos, codex, notify, auto-continue-loop`
`date: 2026-03-12`
`source: codex`

- Claude의 Stop 훅 기반 Chronos를 Codex에 그대로 이식하지 않고, `skills/codex-mnemo/hooks/save-turn.*` 뒤에 `continue-loop.*`를 체인해서 `codex exec resume --last`로 background 재개.
- `loop-state.md`에 `last_turn_id`를 저장해 Codex notify 중복 재개를 막고, Git Bash/WSL 경로 차이를 흡수하도록 `continue-loop.sh`에 Windows 경로 정규화를 추가.
- **참조**: [대화 링크](conversations/2026-03-12-codex.md)

### ddingdong-noti, codex, notify, sync
`tags: ddingdong-noti, codex, notify, sync`
`date: 2026-03-12`
`source: codex`

- Claude `Stop` 훅인 `hooks/ddingdong-noti.*`는 Codex에서 직접 실행되지 않으므로 `skills/codex-mnemo/hooks/save-turn.*` notify 오케스트레이터 안에서 fan-out 호출하도록 연결.
- `scripts/sync-codex-assets.js`가 `skills/codex-mnemo/hooks/*`를 `~/.codex/hooks/`에도 함께 동기화하도록 확장해, save-turn 수정이 다음 sync에서 즉시 실설치 경로에 반영되게 함.
- **참조**: [대화 링크](conversations/2026-03-12-codex.md)

### codex-audit, config-toml, compatibility-report
`tags: codex-audit, config-toml, compatibility-report`
`date: 2026-03-13`
`source: codex`

- `scripts/audit-codex-compatibility.js`로 repo sync 상태, `~/.codex/config.toml`, global `AGENTS.md`, Claude 전용 마커가 남은 skill/agent를 한 번에 점검하고 `docs/codex-compatibility-report.md`를 재생성.
- Codex 점검은 “복사됐는가”와 “실제로 `notify -> save-turn`/MCP에 배선됐는가”를 분리해서 봐야 하며, 특히 root hooks와 orchestrator 경로 drift를 별도로 확인해야 함.
- **참조**: [대화 링크](conversations/2026-03-13-codex.md)

### single-source, generated-install, mnemo-family
`tags: single-source, generated-install, mnemo-family`
`date: 2026-03-13`
`source: codex`

- Claude/Codex/Gemini 공용 `skills/`, `agents/`, 문서 자산은 repo를 단일 원본으로 두고 link/sync로 배포하고, `config.toml`/`settings.json`, MCP 등록, runtime hooks는 CLI별 설치 자산으로 분리하는 하이브리드가 기본 전략.
- `mnemo`는 공통 기억 시스템 개념이고 `mnemo`(Claude), `codex-mnemo`, `gemini-mnemo`는 각 CLI의 훅/설정 모델에 맞춘 어댑터로 봐야 하며, shared memory와 CLI별 conversation 로그를 구분해서 관리.
- **참조**: [대화 링크](conversations/2026-03-13-codex.md)

### codex-slash-alias, skill-invocation, global-agents
`tags: codex-slash-alias, skill-invocation, global-agents`
`date: 2026-03-13`
`source: codex`

- Codex는 Claude처럼 custom slash command registry를 직접 제공하지 않을 수 있으므로, Claude 호환 호출명은 global `~/.codex/AGENTS.md` 규칙으로 `/skill-name`을 explicit skill invocation으로 해석하게 만드는 방식이 필요.
- `skills/codex-mnemo/templates/agents-md-rules.md`에 alias 매핑(`/chronos`→`auto-continue-loop`, `/agent-team`→`agent-team`, exact match `/seo-audit` 등)을 넣고 `node skills/codex-mnemo/install.js`로 재주입하면 새 Codex 프로세스에서 매핑이 반영된다.
- **참조**: [대화 링크](conversations/2026-03-13-codex.md)
