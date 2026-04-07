# Tools - MCP 서버, 외부 도구, 라이브러리

> MEMORY.md 키워드 인덱스에서 이 파일로 연결됩니다.

---

### orchestrator, pm-worker, parallel, mcp
`tags: orchestrator, pm-worker, parallel, mcp`
`date: 2026-02-02`

- **위치**: `mcp-servers/claude-orchestrator-mcp/`
- **트리거**: `workpm` (PM), `pmworker` (Worker)
- **PM 도구**: `orchestrator_analyze_codebase`, `orchestrator_create_task`
- **Worker 도구**: `orchestrator_claim_task`, `orchestrator_lock_file`
- **참조**: [2026-02-02 대화](.claude/conversations/2026-02-02.md)
- 파일 락으로 충돌 방지됨
- PM이 명확히 정의하면 대화 불필요
- 속도 > 협업 (대화 대기로 느려지면 의미 감소)

### install-orchestrator, project-install, mcp, hooks
`tags: install-orchestrator, project-install, mcp, hooks`
`date: 2026-02-04`

- `install-orchestrator.js`: 프로젝트별 Orchestrator 설치/제거
- 4단계: MCP 빌드 → 훅 복사 → 명령어 복사 → settings.local.json 머지
- 플랫폼 감지 (Win: ps1, Linux/Mac: sh)
- 기존 설정 보존, 중복 방지
- `--uninstall`로 깨끗하게 제거
- **참조**: [2026-02-04 대화](.claude/conversations/2026-02-04.md)

### zephermine, verify, spec, 검증, interview-category
`tags: zephermine, verify, spec, 검증, interview-category`
`date: 2026-02-04`

- zephermine 17단계 → 19단계 확장 (Step 18: 서브에이전트 검증, Step 19: 결과 보고)
- `verify-protocol.md` 신규: Explore 서브에이전트 2개 병렬 (기능/품질)
- `interview-protocol.md`에 5개 구조화 카테고리 추가 (A~E) ❌ SUPERSEDED → `#zephermine-interview-v2` (A~G, 7개 카테고리)
- resume 테이블: ralph+ralphy 파일 존재 시 자동 verify 모드 진입
- 참고: jh941213/my-claude-code-asset의 SPEC 워크플로우
- **참조**: [2026-02-04 대화](.claude/conversations/2026-02-04.md)

### explain, learning-harness, 비유, mermaid, 코드설명
`tags: explain, learning-harness, 비유, mermaid, 코드설명`
`date: 2026-02-04`

- `/explain @file.ts` 또는 `/explain "기능명"`으로 호출
- 3단계 설명: 한 줄 요약 + 실제 비유 + 왜 필요한가
- Mermaid 다이어그램으로 핵심 흐름 시각화
- 파일 단위 / 기능 단위 둘 다 지원
- 참고: jh941213/my-claude-code-asset의 junior-mentor 패턴
- **참조**: [2026-02-04 대화](.claude/conversations/2026-02-04.md)

### excel, xlsx, markdown, openpyxl, 엑셀변환
`tags: excel, xlsx, markdown, openpyxl, 엑셀변환`
`date: 2026-02-05`

- 엑셀 파일 → 마크다운 테이블 변환 스킬
- 시트별 `.md` 파일 생성 (효율적 참조)
- **설계**: 엑셀 매번 읽기 = 자원낭비 → 한 번 변환 후 md만 읽기
- 1만 줄 0.59초 처리 (성능 테스트 완료)
- **파일**: `skills/excel2md/excel2md.py`
- **참조**: [2026-02-05 대화](.claude/conversations/2026-02-05.md)

### external-skills, tdd, debugging, semgrep, wrangler, docx, pdf
`tags: external-skills, tdd, debugging, semgrep, wrangler, docx, pdf`
`date: 2026-02-07`

- trailofbits는 plugin 구조 → SKILL.md 최상위로 재배치 필요
- **참조**: [2026-02-07 대화](.claude/conversations/2026-02-07.md)

### install-mcp, mcp-configs, context7, playwright, fetch, sequential-thinking, github
`tags: install-mcp, mcp-configs, context7, playwright, fetch, sequential-thinking, github`
`date: 2026-02-07`

- **참조**: [2026-02-07 대화](.claude/conversations/2026-02-07.md)

### mcp, settings-json, claude-json, cli, scope, install-mcp
`tags: mcp, settings-json, claude-json, cli, scope, install-mcp`
`date: 2026-02-09`

- **변경 이유**: `settings.json`은 `mcpServers` 필드를 지원하지 않음 → `~/.claude.json`에 저장됨
- **v1 문제**: `fs.writeFileSync`로 `settings.json`에 직접 쓰기 → 스키마 위반으로 무시됨
- **v2 해결**: `claude mcp add/remove` CLI 명령어를 `child_process.execSync`로 실행
- **핵심 변경점**:
- `--target` 옵션 → `--scope` 옵션 (기본값: "user")
- 환경변수: `-e KEY=value` 플래그로 전달
- 설치 확인: `claude mcp get <name>`으로 체크
- `--list`: 설치된 MCP는 `[installed]` 표시
- **교훈**: Claude Code 설정 파일 구조
- `~/.claude/settings.json`: `hooks`, `env` 등 일반 설정
- `~/.claude.json`: MCP 서버 설정 (`mcpServers`)
- `claude mcp add --scope user`: 글로벌 등록
- `claude mcp add --scope local` (기본): 프로젝트별 등록
- **참조**: [2026-02-09 대화](.claude/conversations/2026-02-09.md)

### zephermine, 젭마인, 제퍼마인, 별칭, naming
`tags: zephermine, 젭마인, 제퍼마인, 별칭, naming`
`date: 2026-02-08`

- **영어 폴더/스킬명**: `zephermine` (그대로 유지)
- **한국어 약칭**: **젭마인** (공식), 제퍼마인/제퍼미네도 허용
- **어원**: 제피르(Zephyr) + 미네르바(Minerva)
- 훅/트리거에서 3가지 한국어 표기 모두 인식하도록 설정

### zephermine, 심층인터뷰, 디자인비전, 쉬운질문, 5-whys, 벤치마킹
`tags: zephermine, 심층인터뷰, 디자인비전, 쉬운질문, 5-whys, 벤치마킹`
`date: 2026-02-07`

- **A~E → A~G**: 심층 목표 탐색(A) + 디자인 비전(B) 신규 추가
- **심층 인터뷰**: 5 Whys, 숨겨진 동기, 성공 정의, 차별화 탐색
- **디자인 비전**: 톤/무드, 벤치마킹 사이트, 색상, 레이아웃, 아트 디렉션, 안티 패턴
- **쉬운 말 규칙**: 전문용어에 괄호 풀이 필수 (초등학생도 이해 가능)
- `❌ "확장성 목표치?"` → `✅ "사용자가 늘어나도 느려지지 않는 것(확장성) 목표?"`
- C~G 카테고리도 쉬운 말로 전면 재작성
- **참조**: [2026-02-07 대화](.claude/conversations/2026-02-07.md)

### agent-teams, experimental, opus-4.6, settings
`tags: agent-teams, experimental, opus-4.6, settings`
`date: 2026-02-07`

- 실험적 기능으로 처음 활성화한 기록
- **참조**: [2026-02-07 대화](.claude/conversations/2026-02-07.md)

### agent-teams-v2, teammate-mode, delegate, plan-approval, tmux, split-panes
`tags: agent-teams-v2, teammate-mode, delegate, plan-approval, tmux, split-panes`
`date: 2026-02-09`

- `in-process` (기본): 메인 터미널, Shift+Up/Down 전환
- `tmux`/`split panes`: 각 팀원 별도 패널 (tmux/iTerm2 필요)
- `auto`: tmux 안이면 split, 아니면 in-process
- **Delegate 모드** (Shift+Tab): 리드가 코드 작성 불가, 순수 조율만
- **Plan Approval**: 팀원에게 계획 승인 필수 걸기
- **직접 메시지**: 팀원끼리 mailbox로 소통 (서브에이전트와 최대 차이)
- **공유 태스크**: pending → in-progress → completed, 의존성 자동 해소
- **훅 연동**: TeammateIdle (idle→피드백), TaskCompleted (품질 게이트)
- 장점: 네이티브 통합, 팀원 간 대화, 자율 조율, Plan Approval
- 단점: Claude만 (멀티AI 불가), 토큰 소비 높음
- **저장**: `~/.claude/teams/{name}/config.json`, `~/.claude/tasks/{name}/`
- **참조**: [공식 문서](https://code.claude.com/docs/en/agent-teams)

### agent-team-skill, wave, 병렬실행, zephermine-sections, native-agent-teams
`tags: agent-team-skill, wave, 병렬실행, zephermine-sections, native-agent-teams`
`date: 2026-02-09`

- zephermine 섹션(sections/) 기반 네이티브 Agent Teams 병렬 실행 스킬
- **6단계 워크플로우**: Parse → Wave Plan → Create Tasks → Execute Waves → Verify → Report
- 위상 정렬(Kahn's)로 의존성 분석 → Wave 그룹핑 (Wave당 최대 5 teammate)
- teammate에게 섹션 전체 내용을 TaskCreate description에 임베딩 (대화 히스토리 미상속 대응)
- 파일 소유권 규칙으로 teammate 간 충돌 방지 (soft lock)
- 기존 orchestrator와 공존: zephermine 섹션 → agent-team, 외부 AI 필요 → orchestrator
- **전문가 매칭**: 파일 패턴 → 에이전트 자동 매칭 (references/expert-matching.md)
- **듀얼 모드**: 섹션 모드 (zephermine 산출물) + 자유 모드 (사용자 지시만)
- **훅**: orchestrator-detector.js에 agent-team/에이전트팀/팀실행/대니즈팀 키워드 감지
- **팀명**: 대니즈팀(Dannys Team) 고정
- **파일**: `skills/agent-team/SKILL.md` + `references/` 5개 + `commands/` 1개
- **참조**: 이 세션 (2026-02-09)

### github-research, 유사프로젝트, 벤치마킹, research
`tags: github-research, 유사프로젝트, 벤치마킹, research`
`date: 2026-02-09`

- 젭마인 리서치 단계에 GitHub 유사 프로젝트 검색 추가
- Step 4.3: 사용자에게 GitHub 검색 여부 질문
- Step 5.3: `site:github.com` WebSearch로 top 3~5 프로젝트 분석
- 코드베이스 + 웹 + GitHub 3가지 리서치 **병렬 실행**
- 각 프로젝트: Repo URL, Stars, 아키텍처, Takeaways
- **파일**: `skills/zephermine/references/research-protocol.md`
- **참조**: 이 세션 (2026-02-09)

### qa-scenarios, test-scenario, crud, 입출력, e2e, runtime-verification
`tags: qa-scenarios, test-scenario, crud, 입출력, e2e, runtime-verification`
`date: 2026-02-09`

- Step 8 (Spec): 기능별 Test Scenarios 필수 포함 (정상/에러/엣지)
- Step 16 (Sections): 각 섹션에 상세 테스트 케이스 테이블
- Step 18 신규: `claude-qa-scenarios.md` 통합 QA 체크리스트 생성
- verify Phase 2: 빌드 + 단위테스트 + E2E 런타임 검증 (자동 감지: npm/maven/pytest/playwright/cypress)
- verify Phase 4: QA 시나리오 ✅/❌/⚠️ 마킹 + 통과율 집계
- **참조 파일**: `references/test-scenario-guide.md` (CRUD/인증/UI/비즈니스 패턴)
- **참조**: 이 세션 (2026-02-09)

### api-spec, api-drift, 중복api, frontend-caller, 프론트백엔드
`tags: api-spec, api-drift, 중복api, frontend-caller, 프론트백엔드`
`date: 2026-02-09`

- Step 14 신규: `claude-api-spec.md` 생성 (plan에서 API 엔드포인트 추출)
- 각 엔드포인트: Method, Path, Request/Response 스키마, Error, Auth, **Frontend Caller**
- Frontend Caller: 어떤 페이지/컴포넌트가 이 API를 호출하는지 명시
- **구현 규칙**: 새 API 추가 시 api-spec에도 반드시 추가 (drift 방지)
- **중복 방지**: 같은 기능 다른 이름, 단수/복수 차이, 동사 중복 탐지
- verify Phase 3: 코드의 실제 API vs api-spec 대조 (미등록/미구현/중복 경고)
- API 없는 프로젝트(CLI, 라이브러리, 정적사이트)는 자동 건너뜀
- **참조 파일**: `references/api-spec-guide.md`
- **젭마인 전체 Step 수**: 19→22단계로 확장
- **참조**: 이 세션 (2026-02-09)

### multi-ai-domain, codex-gemini, 도메인전문가, team-review, 편향보완, 업무흐름표
`tags: multi-ai-domain, codex-gemini, 도메인전문가, team-review, 편향보완, 업무흐름표`
`date: 2026-02-09`

- **Phase A**: Claude가 WebSearch로 산업별 기술/솔루션 검색 → `domain-research.md`
- **Phase B**: 도메인 전문가가 리서치 결과 기반으로 분석 (Codex/Gemini/Claude)
- Dual-AI: Codex(Process) + Gemini(Technical), Single-AI: 하나로 둘 다, 폴백: Claude
- **Process Expert**: 기능별 업무 흐름표 (왜/누가/CRUD 권한/입출력/예외)
- CRUD 권한 → API 인가 미들웨어, 입출력 → API 스키마, 예외 → 에러 핸들링
- **spec에 없는 업무도 추가** (산업 필수 업무, 누락 역할, 업계 관행)
- **Technical Expert**: 기술 스택 매핑 테이블 (기술/연동/규제/SLA/기존 솔루션)
- 기존 솔루션 → 직접 구현 vs 라이브러리 결정
- **수정 파일**: `references/team-review-protocol.md`
- **참조**: 이 세션 (2026-02-09)

### security-reviewer, owasp, 보안, vulnerability
`tags: security-reviewer, owasp, 보안, vulnerability`
`date: 2026-02-08`

- jh941213/my-claude-code-asset 벤치마킹으로 security-reviewer 에이전트 신규 생성
- 4대 카테고리: 인증/권한, 입력검증(OWASP), 데이터보안, 의존성보안
- 기존 산재 보안 규칙 통합 (code-review-checklist, AGENTS.md, hooks)
- 심각도 4단계: Critical → High → Medium → Low
- **참조**: [2026-02-08 대화](.claude/conversations/2026-02-08.md)

### stitch, stitch-developer, ui-generation, mcp
`tags: stitch, stitch-developer, ui-generation, mcp`
`date: 2026-02-08`

- Stitch MCP 기반 UI 생성 전문가 에이전트 + 4개 스킬 패키지
- 에이전트: `agents/stitch-developer.md` (오케스트레이션, 프롬프트 원칙)
- 스킬 4개: design-md, enhance-prompt, loop, react
- jh941213 벤치마킹 + 우리 패턴 적용 (YAML frontmatter, 한국어, tavily 제거)
- **참조**: [2026-02-08 대화](.claude/conversations/2026-02-08.md)

### tech-debt, reducing-entropy, 기술부채, detection
`tags: tech-debt, reducing-entropy, 기술부채, detection`
`date: 2026-02-08`

- reducing-entropy.md에 실행 가능한 기술부채 탐지 체크리스트 추가
- 기존 철학적 원칙 유지 + 구체적 탐지 항목: console.log, 미사용 import, any 타입, 매직넘버, TODO/FIXME
- Grep 탐지 패턴 포함
- **참조**: [2026-02-08 대화](.claude/conversations/2026-02-08.md)

### backend-performance, n+1, cache, spring, connection-pool
`tags: backend-performance, n+1, cache, spring, connection-pool`
`date: 2026-02-08`

- backend-spring.md에 Performance Optimization 섹션 추가
- N+1 방지 (fetch join, @EntityGraph), DB 인덱스 설계, Spring Cache, 페이지네이션 필수, HikariCP 설정
- **참조**: [2026-02-08 대화](.claude/conversations/2026-02-08.md)

### architect, adr, 아키텍처, 기술스택, 확장성, solid
`tags: architect, adr, 아키텍처, 기술스택, 확장성, solid`
`date: 2026-02-08`

- jh941213 벤치마킹으로 architect 에이전트 신규 생성 (P4)
- 6개 섹션: 아키텍처 패턴, 기술 스택 평가, 확장성 전략, SOLID, ADR 템플릿, 에이전트 연동
- spec-interviewer(What) → architect(How) → fullstack-development-workflow(구현) 흐름
- fullstack-development-workflow에 Phase 1.5 아키텍처 설계 단계 추가
- **참조**: [2026-02-08 대화](.claude/conversations/2026-02-08.md)

### postgresql, supabase, rls, pgbouncer, jsonb, gin, gist
`tags: postgresql, supabase, rls, pgbouncer, jsonb, gin, gist`
`date: 2026-02-08`

- `agents/database-postgresql.md` 신규 생성 (275줄)
- MySQL 에이전트 기반으로 PostgreSQL/Supabase 전용 차별점 반영
- PK: `BIGSERIAL` / `gen_random_uuid()`, 멀티테넌시: RLS 정책
- 타입: `TIMESTAMPTZ`, `JSONB`, `INET`
- 인덱스: B-Tree + GIN(JSONB/전문검색) + GiST(지리) + Partial Index
- 마이그레이션: Supabase CLI, 커넥션: PgBouncer
- **참조**: 이 세션 (2026-02-08)

### qpassenger (큐패신저), playwright, healer, fix-until-pass, e2e
`tags: qpassenger, 큐패신저, qa-until-pass, playwright, healer, fix-until-pass, e2e`
`date: 2026-02-09`

- QA 시나리오 → Playwright 테스트 코드 자동 생성 + fix-until-pass 루프
- **5단계**: 시나리오 수집 → 코드 생성 → 실행 → Healer Loop (max 5회) → 결과 보고
- 시나리오 입력: claude-qa-scenarios.md (zephermine) / docs/qa/ (qa-writer) / 현장 생성
- Healer 원인 분류: 셀렉터 불일치, API 경로 오류, 타이밍, 비즈니스 로직, 인프라
- qa-engineer 판정 기준 적용 (PASS/CONDITIONAL/FAIL)
- **연관**: qa-writer (시나리오), qa-engineer (판정), qa-test-planner (계획)
- **파일**: `skills/qpassenger/SKILL.md` + `references/` 2개 + `commands/` 1개
- **참조**: 이 세션 (2026-02-09)

### skill-discovery, find-skills, npx-skills, zephermine-step21
`tags: skill-discovery, find-skills, npx-skills, zephermine-step21`
`date: 2026-02-16`
`source: claude`

- 젭마인 Step 21 신규: 구현 시작 전 프로젝트에 필요한 외부 스킬 자동 탐색
- 섹션 파일에서 기술 키워드 추출 → 로컬 스킬 매칭 → `npx skills find` 검색
- AskUserQuestion(multiSelect)으로 선택적 설치
- 기존 22단계 → 23단계 확장 (Step 21~22→22~23 번호 이동)
- **참조**: 이 세션 (2026-02-16)

### ai-api-guide, 최신모델, deprecated, websearch-first, openai, anthropic, gemini, ollama
`tags: ai-api-guide, 최신모델, deprecated, websearch-first, openai, anthropic, gemini, ollama`
`date: 2026-02-16`
`source: claude`

- 별도 에이전트로 생성 후 ai-ml에 통합됨

### ai-ml-unified, 최신모델, deprecated, websearch-first, rag, openai, anthropic, gemini, ollama
`tags: ai-ml-unified, 최신모델, deprecated, websearch-first, rag, openai, anthropic, gemini, ollama`
`date: 2026-02-17`
`source: claude`

- ai-api-guide + ai-ml을 하나로 통합 (reducing-entropy)
- **PART 1**: 최신 모델 검증 워크플로우 (WebSearch FIRST → Context7 보조)
- **PART 2**: AI 앱 아키텍처 (FastAPI, RAG, 벡터DB)
- 코드 패턴은 `agents/references/ai-code-patterns.md`로 분리 (264줄 본체 + 참조)
- 에이전트 수 유지: 34개 (35→34로 복원)
- **변경 이유**: 두 에이전트의 관심사가 겹치고, AI 작업 시 하나만 로드하면 됨
- **파일**: `agents/ai-ml.md`
- **참조**: 이 세션 (2026-02-17)

### schema-designer, db-first, erd, ddl, 스키마설계, zephermine-step14
`tags: schema-designer, db-first, erd, ddl, 스키마설계, zephermine-step14`
`date: 2026-02-18`
`source: claude`

- 23단계 → 24단계 확장 (기존 Step 14~23 → Step 15~24로 이동)
- `claude-db-schema.md` 산출물 (ERD + DDL + 설계 근거)
- DB 없는 프로젝트는 자동 건너뜀
- **참조 파일**: `skills/zephermine/references/schema-design-guide.md`
- 엔티티 도출, 관계 판별, 정규화 결정, DB별 특화 설계
- **DB-First 원칙**: DB 특성이 구조 자체를 결정 (DDL 변환이 아님)
- DB별 설계 차이 매트릭스 (PostgreSQL/MySQL/SQLite/MongoDB)
- 에이전트(규칙/프로세스) + 스킬(상세 참조) 병존
- 에이전트 수: 34개 → 35개
- **참조**: 이 세션 (2026-02-18)

### orchestrator-mcp-리서치, sqlite-wal, 멀티에이전트, 오케스트레이터, 벤치마킹
`tags: orchestrator-research, sqlite-wal, multi-agent, overstory, agent-orchestrator, mcp-agent-mail`
`date: 2026-03-20`
`source: claude`

- **현재 문제**: orchestrator MCP의 state.json이 동시접근에 무방비 (writeFileSync, 락 없음)
- **업계 트렌드**: SQLite WAL이 표준 → overstory(1.1k⭐), mcp_agent_mail 모두 채택
- **주요 레퍼런스**:
  - [overstory](https://github.com/jayminwest/overstory) — SQLite WAL 메일 시스템 (1-5ms), git worktree, tmux, 4단계 충돌 해결
  - [agent-orchestrator](https://github.com/ComposioHQ/agent-orchestrator) — 4.9k⭐, git worktree 격리, PR 자동화, 플러그인 아키텍처
  - [Agent-MCP](https://github.com/rinadelph/Agent-MCP) — 1.2k⭐, Knowledge Graph, HTTP+WebSocket
  - [mcp_agent_mail](https://github.com/Dicklesworthstone/mcp_agent_mail) — FastMCP + SQLite + Git, 에이전트 메일함, 파일 리스
  - [claude_code_agent_farm](https://github.com/Dicklesworthstone/claude_code_agent_farm) — 20+ 병렬 Claude, tmux
  - [ccswarm](https://github.com/nwiizo/ccswarm) — Rust, git worktree
- **개선 방향**: Stdio 유지 (CLI 호환) + state.json → SQLite WAL 전환 + 프로젝트별 네임스페이스
- **⚠️ 버전 변화 주의**: Claude/Codex/Gemini 버전 업데이트로 네이티브 기능이 추가되면 외부 오케스트레이터 필요성 감소 가능

### gemini-mnemo, context-filename, agents-md, gemini-md, afteragent
`tags: gemini-mnemo, context-filename, agents-md, gemini-md, afteragent`
`date: 2026-02-14`
`source: codex`

- Gemini CLI 기본 컨텍스트 파일은 `GEMINI.md`이며, `AGENTS.md`를 쓰려면 `settings.json > context.fileName`에 명시해야 함.
- `skills/gemini-mnemo/install.js`를 수정해 설치 시 `context.fileName`에 `AGENTS.md`(최초 설치 시 `GEMINI.md`도 함께) 자동 반영.
- 제거 시 `AGENTS.md` 엔트리만 정리해 기존 사용자 설정을 최대한 보존.
- **참조**: [대화 링크](conversations/2026-02-14-codex.md)

### reconcile-conversations-py, mnemo-backfill, jsonl-source-of-truth
`tags: reconcile, mnemo, python, jsonl, backfill, claude, codex`
`date: 2026-04-08`
`source: claude`

- **위치**:
  - `skills/mnemo/scripts/reconcile_conversations.py` (Claude)
  - `skills/codex-mnemo/scripts/reconcile_codex_conversations.py` (Codex)
  - `hooks/reconcile-conversations.ps1`/`.sh` (SessionStart wrapper, Claude+Codex 동시 실행)
- **사용**:
  ```bash
  python skills/mnemo/scripts/reconcile_conversations.py              # 기본 7일 lookback
  python skills/mnemo/scripts/reconcile_conversations.py --all        # 전체 기간
  python skills/mnemo/scripts/reconcile_conversations.py --days 3     # 최근 3일
  python skills/mnemo/scripts/reconcile_conversations.py --date 2026-04-07
  python skills/mnemo/scripts/reconcile_conversations.py --dry-run    # 시뮬레이션
  ```
- **자동 실행**: Claude SessionStart hook + Gemini BeforeAgent hook (멱등이라 매 턴 실행 OK)
- Codex는 SessionStart 부재로 자동 실행 안 됨 → 수동 호출 필요
- **참조**: commit b11761e (P0), ae24701 (days lookback fix)

### mnemo-errors-log, sessionstart-banner, fail-open-observability
`tags: mnemo, error-log, fail-open, observability, sessionstart`
`date: 2026-04-08`
`source: claude`

- **위치**: `<project-root>/.claude/mnemo-errors.log` (BOM 없는 UTF-8)
- **포맷**: `[YYYY-MM-DD HH:MM:SS] [hook-name] [context] message`
- **작성하는 hook들** (8개):
  - hooks/save-response.{ps1,sh}
  - hooks/save-conversation.{ps1,sh}
  - hooks/save-tool-use.{ps1,sh}
  - hooks/reconcile-conversations.{ps1,sh}
  - skills/codex-mnemo/hooks/save-turn.{ps1,sh}
  - skills/gemini-mnemo/hooks/save-turn.{ps1,sh}
- **읽는 곳**: SessionStart hook이 최근 24시간 에러 N건을 STDERR 배너로 알림
- **MNEMO_STRICT=1**: 환경변수 설정 시 fail-open 대신 exit 1 (디버깅용)
- **참조**: commit b11761e

### sidecar-index-mnemo, conversations-mnemo-index-json
`tags: sidecar-index, mnemo, dedup, uuid, sha1, conversations`
`date: 2026-04-08`
`source: claude`

- **위치**: `<project-root>/conversations/.mnemo-index.json`
- **포맷**:
  ```json
  {
    "version": 1,
    "claude": { "YYYY-MM-DD": ["uuid1", "uuid2", ...] },
    "codex":  { "YYYY-MM-DD": ["sha1_a", "sha1_b", ...] }
  }
  ```
- **목적**: save-response/save-turn과 reconcile이 동일한 dedup key 공간 공유 → 양방향 멱등
- **Dedup key 차이**:
  - Claude: JSONL line `uuid` (각 줄 고유)
  - Codex: `sha1(timestamp + role + content[:200])` (line uuid 부재)
- `.gitignore`로 제외 (사용자별 데이터)
