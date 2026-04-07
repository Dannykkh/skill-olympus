# Changelog

All notable changes to this project will be documented in this file.

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
