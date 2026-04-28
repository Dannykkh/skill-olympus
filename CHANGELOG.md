# Changelog

All notable changes to this project will be documented in this file.

## [4.1.0] - 2026-04-28

### 🆕 Domain Dictionary — Ubiquitous Language

DDD(Domain-Driven Design)의 **Ubiquitous Language** 개념을 한국 SI 영-한 혼용 환경에 맞춘 새 스킬과 풀파이프라인 통합. 코드/스펙/대화의 도메인 용어를 추출하여 동의어/이의어/과부하/영-한 불일치를 탐지하고, 마스터(`docs/domain-dictionary.md`) + 델타(`<planning_dir>/domain-dictionary-delta.md`) + 글로벌(`~/.claude/memory/domain-dictionaries/`) 3계층으로 관리합니다.

#### Added

- **domain-dictionary** (신규 스킬) — 글로벌-프로젝트 패턴, 마스터-델타 구조, 글로벌 동기화 (참고형 + 명시 채택, 자동 상속 ❌)
  - `references/extraction-guide.md` — 용어 추출 알고리즘, 동의어/이의어/과부하/영-한 불일치/약어/외래어 탐지
  - `references/global-sync.md` — 글로벌 폴더 자동 생성, 도메인 추정, 명시적 글로벌 반영 절차
  - `references/global-readme-template.md` — 첫 실행 시 글로벌 폴더에 복사되는 README 시드

- **explain** — `--zoom-out` 모드 추가 (mattpocock/skills의 zoom-out 흡수): 호출자/형제 모듈/상위 맵 출력
  - `references/zoom-out.md` — 줌아웃 모드 워크플로우

#### Changed — 풀파이프라인 통합 (12개 스킬)

- **zephermine** — 26단계를 6 Phase로 그룹화 + Step 8/10/11 끝부산물로 사전 v1→v2→v3 진화 + Resume 보정 규칙 (별도 단계 추가 X)
- **zephermine team-review-protocol** — 6명 전문가에 사전 컨텍스트 자동 주입 + `## Dictionary Updates` 출력 의무화
- **zephermine domain-confirmation-guide** — Step 11에서 multiSelect 3개(도메인 제안 + 사전 변경 + 글로벌 반영) 통합
- **code-reviewer** — `maintainability` specialist에 "도메인사전 위반" + "모듈 깊이(인터페이스 가성비)" 카테고리 추가 (mattpocock improve-codebase-architecture 흡수)
- **argos** — Phase 8 신규 (도메인사전 감리 4-step: 영문 식별자/금지 표현/UI 한글/미등재 신규). 8 Phase → 9 Phase
- **agent-team(포세이돈)** — `teammate-context-template.md`에 사전 자동 주입 + 강제 사용 지침 (모든 worker 공통)
- **agent-team-codex** — Codex spawn 명령에 사전 준수 지침 인라인 + 6번 공통 도메인사전 컨텍스트 템플릿
- **workpm(다이달로스)** — Phase 1 끝 사전 자동 생성/로드 + Phase 4 teammate 전달 + Phase 5 사전 준수 검증
- **minos(미노스)** — Step 1 끝 사전 컨텍스트 로드 + Step 2 코드 생성 시 `describe`/`it`이 사전 따름
- **clio(클리오)** — Phase 3 시작 사전 로드 + 3종 문서(PRD/TECHNICAL/USER-MANUAL) 일관성 + 용어 색인 자동 부록
- **biz-strategy(헤르메스)** — 산출물 끝 "## 핵심 도메인 용어 시드" 부록 (zephermine 사전 v1 시드 가교)
- **ceo(아테나)** — Phase 6 신규 "도메인 명확성 점검" (Go/No-Go 보조 지표)
- **hestia(헤스티아)** — 2-6 신규 "사전 미등재 도메인 식별자" 보고 (사전 갱신 트리거, 삭제 X)

#### Docs

- README.md / README-ko.md / AGENTS.md / QUICK-REFERENCE.md / docs/smart-setup-registry.json — 95개 → 96개 스킬 갱신
- AGENTS.md Documentation 카테고리에 `domain-dictionary` 등록
- explain 카테고리 설명에 "줌아웃 모드" 명시

#### Decisions (보류)

- **caveman 모드** — 핸드오프와 결이 다름 + 한국어 경어체 정책과 충돌 → 별도 도입 안 함
- **design-an-interface** (mattpocock) — zephermine Step 16-20에 이미 인터페이스 설계 단계가 있음 + architect agent로 보강 → 별도 도입 안 함
- **improve-codebase-architecture** — code-reviewer maintainability "모듈 깊이" 카테고리로 흡수

---

## [4.0.2] - 2026-04-27

### Changed
- **skills**: shortened routing-focused `description` metadata for 17 high-safety skills without changing workflow bodies.
- **codex**: synced shortened descriptions to installed Codex skill copies to reduce startup skills prompt pressure.
- **install**: copy-mode sync now skips nested `node_modules` directories when refreshing existing installs, avoiding Windows file-lock failures from running Orchestrator MCP native modules.
- **install**: defined Codex/Gemini install directories before Orchestrator MCP checks so `install.bat` validates the correct targets.
- **docs**: updated README/README-ko/AGENTS counts and hook tables to match the current 95 skills, 42 agents, and 9 hooks.

---

## [4.0.1] - 2026-04-20

### Bug Fixes
- **chronos**: `continue-loop.ps1` Line 215 — `Get-FrontmatterValue $stateContent` → `Get-FmValue $frontmatter` (Codex 자동 재개 매 턴 실패 원인)
- **install**: `install-hooks-config.js`에서 삭제된 훅 3개(validate-code, validate-docs, format-code) 설치 시도 제거
- **cross-cli**: codex-mnemo/gemini-mnemo agents-md-rules에서 삭제된 스킬(workpm-mcp, pmworker) 참조 수정
- **docs**: AGENTS.md Task Lookup + Workflow 체이닝 stale 참조 전부 교체, 500줄 제한 → 구조 원칙
- **hooks**: settings.example*.json, SETUP.md에서 삭제된 훅 설정 제거
- **.agents/hooks**: check-new-file "Reducing Entropy" → "New File Check" 동기화
- **.agents/.codex-sync-manifest.json**: 삭제된 훅 4개 참조 제거

### Other Changes
- **hooks**: ddingdong-noti(데스크톱 알림) 비활성화 → archive

---

## [4.0.0] - 2026-04-20

### 🧹 The Great Cleanup — 정리의 시대

**v4.0.0은 대규모 품질 감사 + 정리 + 강화입니다.** addyosmani/agent-skills 벤치마크 후 중복 제거, 약한 스킬 강화, 새 올림포스 신 추가, 훅 현대화.

#### ⚠️ BREAKING CHANGES

- **에이전트 7개 삭제** (archive/로 이동, 복원 가능):
  - `humanizer-guidelines` → `writing-guidelines`에 흡수
  - `react-useeffect-guidelines` → `react-best-practices`에 흡수
  - `web-preview-development` → `web-preview-guide`에 이미 포함
  - `code-review-checklist` → `code-reviewer` 스킬이 커버
  - `general-purpose` — 가치 없음 (삭제)
  - `fullstack-development-workflow` → `fullstack-coding-standards`에 흡수
  - `reducing-entropy` → `deprecation-and-migration` + `hestia`에 흡수

- **스킬 7개 삭제** (archive/로 이동):
  - `stitch-design-md`, `stitch-enhance-prompt`, `stitch-loop`, `stitch-react` → **`stitch`** 1개로 통합 (4 모드)
  - `workpm-mcp` → `orchestrator` 트리거 흡수
  - `pmworker` → `workpm` 트리거 흡수
  - `multi-ai-orchestration` → `orchestrator`에 흡수
  - `qa-test-planner` → `minos`에 흡수 (시나리오 현장 생성)
  - `reducing-entropy` → `deprecation-and-migration` + `hestia`에 분리 흡수

- **훅 3개 삭제** (archive/로 이동):
  - `validate-code` — Claude Code 내장 보안 검사가 대체
  - `validate-docs` — `humanizer` + `writing-guidelines`가 대체
  - `debug-stop-hook` — 디버깅 전용, 개발 완료
  - `format-code` — Claude Code가 포매팅 대체 + stdin 파싱 불일치

- **500줄 파일 크기 제한 폐지** — LLM 시대에 줄 수 제한 불필요. 구조 원칙(단일 책임, 순환 의존 금지)으로 전환

#### 🏛️ New Olympians

| 신 | 스킬 | 역할 |
|---|---|---|
| Hestia (헤스티아) | `/hestia` | 화로의 여신 — Dead Code 탐지 + 코드 위생 관리 |
| — | `/adr` | ADR(Architecture Decision Records) 작성 + 인덱스 관리 |
| — | `/launch` | 프리런치 체크리스트 + 단계적 롤아웃 + 롤백 플레이북 |
| — | `/deprecate` | 코드 부채 정리 + 마이그레이션 가이드 |

#### 🔧 Skill Enhancements

- **clio v2.1** — 마무리투수(Closer) 복원:
  - Phase 1 신설: GO/NO-GO 판정 (테스트/린트/타입/커버리지/누락 탐지)
  - Phase 3.5 신설: 문서 사이트 생성 (VitePress/Docusaurus/MkDocs, Hot Reload)
  - NO-GO 시 문서 생성 중단
- **agent-team + workpm** — Phase별 Opus/Sonnet 모델 배분:
  - 판단 작업 (아키텍처, 도메인 조사) → Opus
  - 코딩 작업 (구현, 테스트) → Sonnet
  - Phase 4 테스트 단계 + 에러 복구 전략 5종 추가
- **chronos** — loop-state.md 접근 금지 명시, 책임 분리 (AI vs 훅 vs 사용자)
- **minos** — qa-test-planner 흡수, 시나리오 없을 때 4단계 현장 생성 프로세스
- **seo-audit** — Lighthouse CLI 자동 실행 + 점수 기반 우선순위
- **test-driven-development** — 테스트 프레임워크 자동 감지 (Vitest/Jest/pytest/JUnit/xUnit/Go)
- **excel2md** — 구조 분석, 데이터 타입 감지, 병합 셀/멀티 헤더 처리
- **web-to-markdown** — 배치 변환, 로그인 페이지, 선택적 추출
- **stitch** — 4종 통합 (design/prompt/loop/react 모드)

#### 📊 Numbers

| 항목 | v3.1.0 | v4.0.0 | 변화 |
|------|--------|--------|------|
| Skills | 98 | 95 | -3 |
| Agents | 49 | 42 | -7 |
| Hooks | 13 | 10 | -3 |
| Archive | 0 | 17 | 복원 가능 |

---

## [3.1.0] - 2026-04-16

### Features
- **skills**: add skill-evolve + gotcha analyzer에 스킬 개선 제안 연결 (03b2085)
- add update-check system + VERSION file for upgrade notifications (8b62d09)

### Bug Fixes
- **mnemo**: JSONL 직접 읽기 금지 가드 추가 — 3-CLI parity (af4c9eb)
- **chronos**: AI가 loop-state.md를 직접 rm하지 않도록 개선 (e53b7bf)

### Other Changes
- **gitignore**: docs/launch/ 추적 해제 — 마케팅 초안은 local only (27b0f8e)

## [3.0.0] - 2026-04-08

### 🏛️ Skill Olympus — The Pantheon Awakens

**v3.0.0은 이번 프로젝트의 가장 큰 변경입니다.** 데이터 유실 방지 종합 개편, 그리스 신화 네이밍 통일, repo rename, 3-CLI parity 강화. BREAKING change 포함.

#### ⚠️ BREAKING CHANGES

- **Repo rename**: `claude-code-agent-customizations` → **`skill-olympus`**
  - GitHub 자동 redirect 활성 — 옛 URL은 한동안 유효
  - Local clone은 `git remote set-url origin https://github.com/Dannykkh/skill-olympus.git` 권장
- **Skill rename** (legacy alias 모두 유지):
  - `qpassenger` → **`minos`** (저승의 심판자, fix-until-pass)
  - `final-inspection` (closer) → **`clio`** (역사의 뮤즈, 마지막 기록자)
  - `agent-team` 별칭 `대니즈팀` → **`포세이돈`** (바다의 신, 파도/wave 비유)
- **호출명 변경**: `/qpassenger`, `/closer` → `/minos`, `/clio` (옛 명령은 alias로 유지)

#### 🔱 The Pantheon — 12명의 그리스 신으로 통일

| 신 | 스킬 | 역할 |
|---|---|---|
| Zeus | `/zeus` | Sovereign — 한 줄로 전체 파이프라인 |
| Zephermine | `/zephermine` | Architect — 26단계 인터뷰 |
| Poseidon | `/agent-team` `/poseidon` | Sea Lord — 병렬 시공 |
| Daedalus | `/workpm` `/daedalus` | Hands-On Builder — 직접 구현 |
| Argos | `/argos` | All-Seeing — 100개의 눈 |
| Minos | `/minos` | Judge — 저승의 심판자 |
| Clio | `/clio` | Chronicler — 역사의 뮤즈 |
| Chronos | `/chronos` | Tireless — 시간을 지치지 않는 자 |
| Hermes | `/hermes` | Wayfarer — 상업의 신 |
| Athena | `/athena` | Strategist — 전략의 여신 |
| Aphrodite | `/aphrodite` | Beauty — 미의 여신 |
| Mnemo | `mnemo` | Keeper of Memory — 모든 뮤즈의 어머니 |

#### 🧠 Mnemo — JSONL 기반 데이터 유실 방지 종합 개편

**문제**: Stop 훅이 한 번이라도 실패하면 turn이 영구 손실. 실측 결과 **27일치 대화 중 약 67% (Claude), 88% (Codex)가 누락 상태**였음.

**해결**:
- **reconcile 시스템 신규** — JSONL transcript를 source of truth로 선언하고, save-response/save-turn이 놓친 turn을 자동 backfill
  - `skills/mnemo/scripts/reconcile_conversations.py` (Claude)
  - `skills/codex-mnemo/scripts/reconcile_codex_conversations.py` (Codex, sha1 dedup)
  - `hooks/reconcile-conversations.ps1`/`.sh` (SessionStart wrapper, Claude+Codex 동시 실행)
- **사이드카 인덱스** `conversations/.mnemo-index.json` — uuid/sha1 기반 멱등 dedup, save-response와 reconcile이 동일 인덱스 공유
- **Days lookback 7일** — 자정 넘긴 세션 + 어제 hook 실패 자동 복구
- **Silent failure 제거** — 모든 mnemo hook이 `.claude/mnemo-errors.log`에 통합 기록 + SessionStart 24시간 에러 배너
- **Truncation 제거** — 4000자 제한 삭제 (실측 6233자 turn 정상 저장)
- **JSONL 청크 경계 버그 수정** — 5MB 청크 역방향 → ReadLines 전체 스캔 (PS), tail -n 500 → grep 전체 (sh)

#### 📁 conversations 폴더 잘못된 위치 버그 수정 (Critical)

**증상**: Visual Studio가 bin/Debug에서 실행되어 그 cwd에서 hook이 호출되면 conversations가 거기에 잘못 생성. 사용자 보고: "윈도우 프로그램 짤 때 갑자기 debug 폴더에 conversations가 생기더라". 실측 한 프로젝트에 흩어진 conversations 폴더 7개 발견.

**해결**: 8개 hook에 cwd 정규화 헬퍼 추가 (`Get-ClaudeProjectRoot` / `get_claude_project_root`):
1. JSONL transcript의 cwd 필드 → 그 cwd에서 git -C rev-parse
2. transcript_path 부모 디렉토리 디코딩 (D--git-foo → D:\git\foo)
3. 기존 PWD + git rev-parse (최종 fallback)

적용: save-response/save-conversation/save-tool-use/reconcile-conversations + Codex/Gemini save-turn

#### 🌐 3-CLI Parity 강화

- **Hook parity audit** — Claude/Codex/Gemini의 hook event 매핑 매트릭스 작성
- **Rules parity** — 6개 핵심 규칙(`#tags`, `<private>`, 과거 검색, MEMORY.md, 핸드오프, alias)이 3-CLI 모두 100% parity
- **Codex 구조적 한계 명시** — notify 1개 event라 PreToolUse 차단형 hook 불가능 → 사용자에게 솔직히 안내
- **Gemini 구조적 한계 명시** — 자체 transcript 부재 (reconcile 불가), `/poseidon`은 multi-agent 부재로 `workpm` (다이달로스) fallback
- **CLI 전용 alias 추가** — `/minos`, `/clio`, `/poseidon` + legacy alias가 codex-mnemo + gemini-mnemo agents-md-rules.md에 동기화

#### 🪄 Hidden bug 수정 (audit 중 발견)

- **PowerShell BOM** — `[System.Text.Encoding]::UTF8`은 BOM 포함 인코더. `New-Object System.Text.UTF8Encoding $false`로 8개 PS 스크립트 18곳 교체
- **PS 5.1 Join-Path 3-인수 미지원** — gemini-mnemo, codex-mnemo, save-tool-use 3곳 중첩 호출로 수정
- **subprocess 인코딩 cp949 디코드 실패** — handoff 스크립트 4개에 `encoding="utf-8", errors="replace"` 명시 (한글 git 출력 처리)
- **Windows App Store python3 stub exit 49** — wrapper에서 `python` 우선 시도 + `--version` 검증
- **Codex/Gemini의 cwd 정규화 부재** — Visual Studio 같은 환경에서 Claude와 동일한 버그 발생 → 동일 패턴으로 수정

#### 📜 README 호메로스 서사시 톤

- **The Pantheon of Olympus** 섹션 신설 — "포도주처럼 검푸른 바다 너머, 구름이 갈라지는 곳에 올림푸스 산이 솟아 있다"
- 12명의 신마다 epithet + 묘사 + 명대사 (Robert Fagles / 천병희 번역체 풍)
- "구름을 모으시는 자 제우스", "땅을 흔드시는 자 포세이돈", "회색 눈의 아테나" 등 호메로스 별호
- 영문 + 한글 양쪽 동일 톤

#### 🚀 GitHub Launch 준비

- **GitHub topics 16개** — `claude-code`, `codex-cli`, `gemini-cli`, `agent-skills`, `greek-mythology`, `llm-agents`, `agent-orchestration`, `mcp`, `prompt-engineering`, `ai-tools` 등
- **README hero 재구성** — "Twelve Greek gods. One command. A working SaaS."
- **Reddit launch playbook** — `docs/launch/reddit-post.md` (제목 후보 + 본문 초안 + 댓글 답변 playbook)
- **`.claude-plugin/` 메타데이터 갱신** — name/description/keywords 모두 v2.0.0 → 새 정보로

#### 🧹 Gitignore 정리

- `*.log`, `tmp-*`, `*-debug.log` 패턴 추가
- `tmp-claude-debug.log` 추적 해제

---

## [2.1.0] - 2026-04-06

### Pipeline Integrity Audit + gstack-Inspired Improvements

**Zeus 파이프라인 정합성 (6건)**
- **zeus** — auto-interview-generator를 CPS Gate 1/2/3 구조로 재작성 (A~G → Phase C/P/S)
- **zeus** — phase-transitions.md를 5-Phase → 7-Phase로 전면 재작성 (verification + docker 추가)
- **zeus** — commands/zeus.md를 7-Phase로 동기화
- **zeus** — docker-setup.md Phase 번호 수정 ("Phase 3" → "Phase 5")
- **zeus** — Taste Decision 분류 추가 (mechanical/taste → Phase 6 리포트에 표시)
- **zephermine** — docs/athena/ + docs/hermes/ 사전 파이프라인 산출물 참조 추가

**gstack 참고 비즈니스 스킬 개선 (4건)**
- **hermes** — 영역 0 수요 검증 추가 (4개 강제 질문 + 수요 판정 등급, YC office-hours 참고)
- **hermes** — 3-Layer 리서치 패턴 (정석/트렌드/1원칙 + 유레카)
- **athena** — Anti-sycophancy 규칙 + CEO 인지 모델 7개 (Bezos/Munger/Grove/Jobs/Horowitz/Altman)
- **zeus** — Taste Decision (mechanical/taste 분류)

**gstack 참고 디자인 스킬 개선 (6건)**
- **frontend-design** — AI Slop 블랙리스트 공유 reference 생성 (10항목 + Hard Rejection 7개 + 폰트 블랙/대안)
- **ui-ux-auditor** — 8영역 → 9영역 (AI Slop 탐지) + 0-10 채점 + A~F 등급
- **design-plan** — Phase 4에 9영역 채점 + AI Slop 반영
- **zephermine** — design-system-guide CPS Phase S-1 참조 + AI Slop 방지 + /aphrodite 안내
- **zephermine** — Step 24/26에 /aphrodite 다음 단계 추가

**Argos 감리 확장 (Phase 6~7)**
- **argos** — Phase 6: 디자인 준수 검증 (디자인 토큰 + AI Slop + 9영역 채점)
- **argos** — Phase 7: 보안 검증 (시크릿 고고학 + 의존성 + OWASP + STRIDE)
- **argos** — commands/argos.md 신규 생성

**Daedalus 점검 (9건)**
- **workpm** — 4단계 → 5단계 헤더, Phase 자기참조 5건, Phase 기준선 수정
- **workpm** — argos/aphrodite 다음 단계 추가, allowed-tools 3개 추가, description 업데이트
- **workpm-mcp** — Phase 차이 문서화, 기준선 코멘트, argos/aphrodite 추가
- **orchestrator** — SKILL.md 워크플로우 5단계/4단계 업데이트
- **pmworker** — orchestrator_heartbeat allowed-tools 추가
- **state-manager.ts** — lockFile TOCTOU 레이스 컨디션 트랜잭션 수정

**Danny's Team 점검 (8건)**
- **agent-team** — 재시도 횟수 2회로 통일, Step 라벨 수정, 인트로 Activity Log 추가
- **agent-team** — argos/aphrodite 다음 단계, Pre-Step 좀비 팀 정리, Wave 간 컨텍스트 체크
- **agent-team-codex** — Step 0 PM 게이트 + Step 6 코드 리뷰 게이트 + 보조문서 매핑 추가
- **hooks** — save-tool-use skip 목록에 TeamCreate/TeamDelete/SendMessage 추가

**Chronos 점검 (7건)**
- **chronos** — setup-loop help "무제한" → "50, 0=무제한"
- **chronos** — chronos-worker 완료 신호 + gotchas/learned 참조 추가
- **chronos** — loop-stop 오탐 방지 (마지막 500자만 검사)
- **chronos** — Codex continue-loop 2시간 stale guard 추가
- **chronos** — setup-loop 기존 루프 감지 (동시 루프 방어)
- **chronos** — agents/chronos-worker.md 글로벌 복사

**보안 에이전트 보강**
- **security-reviewer** — 인프라 우선 6 Phase (시크릿→의존성→CI/CD→OWASP→STRIDE→LLM)
- **security-reviewer** — 6개 실행 모드 + 신뢰도 게이트 + False-Positive 17개 제외 목록

**인프라 개선**
- **install-hooks-config.js** — format-code 훅 등록 + shouldIncludeHook 번들 필터링 복원

### New Skills
- **health-data** — Health Connect/HealthKit 건강 데이터 통합 가이드 (심박수, 수면, 걸음, 동기화)

### Improvements
- **social-login** — frontmatter에 triggers + auto_apply 추가

---

## [2.0.0] - 2026-03-30

### Harness Engineering — CPS Framework
- **zephermine** — Interview restructured from A-G categories to **CPS 3-Phase + 3-Gate** (Context → Problem → Solution with mandatory user agreement checkpoints) (f5b08eb)
- **zephermine** — spec.md now includes **Context Map** (ecosystem map, stakeholders) and **Problem Statement** (core problems with priority) as traceable anchors (f5b08eb)
- **zephermine** — Section index gains **Ecosystem Coverage Check**: every system in Context Map must be covered by a section or explicitly excluded (f5b08eb)
- **argos** — New **Phase 0: CPS Traceability** — validates Problem→Solution, Ecosystem→Section, Problem→Section mapping before code inspection (f5b08eb)
- **pipeline** — Clear role separation: `/hermes` (business CPS) stays outside `/zeus`, `/zephermine` (implementation CPS) stays inside (f5b08eb)
- **docs** — Harness Engineering Report: full pipeline flow, 3-axis model, CPS framework documentation (f5b08eb)

### Bug Fixes
- **install** — Disable Gemini MCP install routine (gemini CLI MCP support unstable) (998637f)

---

## [1.9.0] - 2026-03-24

### Features
- **ceo (Athena)** — CEO coaching skill: Go/No-Go gate, strategic challenge, scope decisions (Expand/Reduce/Pivot/Kill), kill test. Hermes synergy for data-driven challenge (d0a6541)
- **pipeline** — New pipeline phase: `/hermes` → `/athena` → `/zephermine` (d0a6541)

### Docs
- **README** — Full rewrite: star-optimized structure, Meet the Team section with Greek myth naming (e14a1d8, f859c14)
- **README-ko** — Korean README renewal: same structure as English version (d5f7ef7)
- **zephermine** — 24-step → 26-step correction (d1fa029)

---

## [1.8.0] - 2026-03-23

### Features
- **project-gotchas** — Auto gotcha + learned pattern management with Haiku analyzer (656167c)
- **cross-cli** — Codex/Gemini save-turn hooks integrated with gotchas/learned observation (dbca431)
- **codemap** — CodeMap index files + AGENTS.md section link (ab5ba39)
- **GEMINI.md** — Gemini CLI project instructions (85b30a8)

### Bug Fixes
- **hooks** — save-tool-use.ps1 PowerShell syntax error + JSON parsing error guard (e47a62a, 017715a)
- **installer** — better-sqlite3 prerequisite check + PROJECT_ROOT removal (939d85d)
- **skills** — qa-test-planner YAML frontmatter folded block scalar fix (0055ce1)

---

## [1.7.0] - 2026-03-21

### Features
- **orchestrator** — state.json → SQLite WAL migration (2db3d2c)
- **minos** — Playwright MCP browser exploration QA Step 5 (d076b19)
- **agents** — Large-scale agent improvements (octopus reference) (a406744)

### Bug Fixes
- **skills** — Subagent AskUserQuestion blocking prevention + argos healer (acbbe5d)
- **installer** — jq prerequisite check for hook error prevention (4a1b9ea)

---

## [1.6.0] - 2026-03-18

### Features
- **mnemo** — Progressive disclosure, PostToolUse hook, privacy tag, token hints (d869969)
- **design-plan** — Aphrodite design orchestrator skill (ef56d87)
- **estimate** — Development cost estimation with Excel output (3dd1f9e)
- **biz-strategy** — Business model canvas, TAM/SAM/SOM, renamed to /hermes (cf67dfe, 6ffb9ea)
- **okr** — OKR goal setting and tracking (cf67dfe)
- **frontend-design** — Design databases: 161 palettes, 73 fonts, 84 styles (d906bae)

### Refactoring
- **skills** — Anthropic skill-making best practices applied (7a4856b)
- **skills** — Progressive disclosure split for minos, hermes, closer (91916b4)
- **skills** — Trigger conditions added to 11 skill descriptions (97e55fe)

---

## [1.5.0] - 2026-03-09

### Features
- **final-inspection** — Closer skill for post-pipeline flow diagrams + document generation (b1ed739)
- **release-notes** — Version + CHANGELOG + tag automation (92cc997)
- **seo-audit** — Expanded to SEO + AEO + GEO 10-area audit v2.0.0 (c87e2e6)
- **zephermine** — Academic research, competitor analysis, persona & journey map (2893d92)
- **youtube-transcript** — yt-dlp based, no MCP needed (615f59e)
- **frontend-design** — Anthropic official skill integration (74d1169)

### Refactoring
- **pipeline** — Integer numbering, PM principles, role separation, sync filtering (909d7a6)
- **artifacts** — CLI-neutral naming, zeus archive cleanup (b3a793a)

---

## [1.4.0] - 2026-03-02

### Features
- **auto-continue-loop** — Chronos: iterative FIND-FIX-VERIFY loop (7dc6b28)
- **argos** — Pipeline architecture + construction inspection skill (067984a)
- **memory-compact** — MEMORY.md explosion prevention (9b912b1)
- **orchestrator** — Portable workpm and chronos entrypoints (1ef7089)
- **docker-db-backup** — PostgreSQL/MySQL/MariaDB backup in Docker (f18c194)

### Bug Fixes
- **hooks** — Use absolute paths for Windows compatibility (e1b9229)
- **install** — Safe-copy.js for broken symlink handling (3cb344d)
- **install** — Remove broken symlinks before copy (c478f50)

---

## [1.3.0] - 2026-02-19

### Features
- **codex-mnemo / gemini-mnemo** — Cross-CLI memory sync (f70775f)
- **workpm v2** — Full overhaul + 8-person team test (70f6b35)
- **selective install** — Choose components during install (85923a4)
- **Gemini CLI** — Full support with MCP install (85923a4)
- **agents** — ASP.NET Core + WPF Desktop + web-preview agents (0bd52fc, b36d282)
- **spawn_workers** — Multi-AI auto execution: Claude + Codex + Gemini (681b2c1)

### Bug Fixes
- **mnemo** — Conversation search integration + Codex duplicate save fix (5d18306)
- **install-mcp** — MCP health check + auto-repair on connection failure (bade9c2)

---

## [1.2.0] - 2026-02-09

### Features
- **zephermine** — GitHub similar project search + QA scenarios + API spec generation (3fcbe84, b2fa3ea, 3129b73)
- **agent-team** — Native Agent Teams with wave grouping + free mode (c3c0438, ad4af93)
- **qa-until-pass** — Fix-until-pass test loop (later renamed to minos) (c818470)
- **zeus** — Zero-interaction full pipeline skill (e55bb64)
- **stitch UI skills** — Design-md, enhance-prompt, loop, react (230bebf)
- **plugin manifest** — Claude Code plugin marketplace support (033c4ba)

### Bug Fixes
- **zephermine** — Context explosion prevention in team review (166e45a)
- **workpm** — AI assignment realistic adjustment (3b0d178)

---

## [1.1.0] - 2026-02-01

### Features
- **zephermine** — Renamed from gepetto, orchestrator MCP expansion (f6a04fb)
- **docker-deploy** — v2.0.0 ~ v2.7.0 evolution (66f418d ~ 9c188bf)
- **fullstack-coding-standards** — Agent + skill with smart-setup (da81254)
- **install.bat** — 7-step installer with hook auto-registration (655b561, 9f96b1c)
- **mnemo** — Skill folder consolidation + keyword extraction + conversation search (178a239, 7c6e31f, c8d558b)
- **orchestrator** — Skill folder consolidation + project install script (dfb830d, bcaf8e6)
- **excel2md** — Excel to markdown converter (b44a16a)
- **external skills** — TDD, debugging, Semgrep, Wrangler, DOCX, PDF (5ad580d)

### Refactoring
- **skills** — Duplicate cleanup: 5 deleted, 2 merged (24e5244)
- **memory** — Context tree structure + 3-layer architecture (b2788c1, 604d20f)

---

## [1.0.0] - 2026-01-29

### Initial Release

The foundation of the AI agent harness customization system.

- **30+ skills** — humanizer, ppt-generator, docker-deploy, and more
- **10+ agents** — ai-ml, code-review, architecture, debugging, and more
- **Hooks** — PowerShell + Bash hook scripts for Windows/Mac/Linux
- **MCP servers** — Presentation, document, and free/local alternatives
- **3-layer memory** — MEMORY.md index + memory/*.md + conversations/
- **Multi-AI** — Orchestrator with workpm/pmworker triggers
- **install.bat/sh** — One-command installation
- **QUICK-REFERENCE.md** — Easy resource discovery
