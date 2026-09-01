# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Cursor, Copilot, etc.) when working with code in this repository.

---

## [Docs Index]|root: ./

|IMPORTANT: Prefer retrieval-led reasoning over pre-training knowledge
|skills/:{ai-tools,meta,documentation,frontend,development,planning,professional,testing,git,utilities}
|agents/:{fullstack,ai-ml,api,qa,docs,design,migration,planning,communication,general}


### Quick Retrieval Paths

|Task|Read First|
|---|---|
|AI/LLM API 코딩|프로젝트 SDK·lockfile·기존 추상화·평가 테스트 우선; 공급자 공식 문서 확인, OpenAI는 openai-docs 사용|
|React/Next.js|프로젝트 manifest·lockfile·tsconfig·기존 구조·테스트 우선; 버전 API는 공식 문서 확인|
|Code Review|skills/code-reviewer/SKILL.md|
|Docker Deploy|skills/docker-deploy/SKILL.md,skills/docker-deploy/templates/|
|Docker DB Backup|skills/docker-db-backup/SKILL.md|
|API Testing|skills/api-tester/SKILL.md|
|Documentation|네이티브 작성 + 목적별 skills/api-handoff, documentation-and-adrs, release-notes, crafting-effective-readmes|
|FastAPI|프로젝트·공식 문서 우선; 명시 요청 시 skills/python-backend-fastapi/SKILL.md|
|Spring Boot|프로젝트 build manifest·BOM·기존 계층·설정·테스트 우선; 버전 API는 공식 문서 확인|
|ASP.NET Core|프로젝트·공식 문서 우선; agents/backend-dotnet.md는 소스 참고용|
|WPF Desktop|프로젝트·공식 문서 우선; agents/desktop-wpf.md는 소스 참고용|
|Database Design|skills/database-schema-designer/SKILL.md|
|Database (MySQL)|프로젝트 DB 버전·schema·migration 도구·실행 계획 우선|
|Database (PostgreSQL/Supabase)|프로젝트 schema·RLS·연결 설정 우선; 명시 요청 시 skills/supabase-postgres-best-practices/SKILL.md|
|Migration|네이티브 코드 탐색 후 skills/deprecation-and-migration/SKILL.md|
|Naming|명시 요청 시 skills/naming-analyzer/SKILL.md|
|Architecture|네이티브 계획·검토 + skills/documentation-and-adrs/SKILL.md; 필요 시 mermaid-diagrams|
|SPEC Interview|skills/zephermine/SKILL.md|
|Security Review|skills/code-reviewer/SKILL.md,skills/code-reviewer/references/security-audit.md|
|Web Preview + 디자인 토큰|DESIGN.md 우선; 명시 요청 시 skills/design-system-starter/SKILL.md|
|Stitch UI|skills/stitch/SKILL.md|
|Agent Teams (4-CLI 네이티브 병렬 실행)|skills/agent-team/SKILL.md|
|Codex Multi-Agent Team|skills/agent-team-codex/SKILL.md|

### Recommended Workflows

|시나리오|체이닝 순서|
|---|---|
|새 프로젝트 (풀코스)|zephermine → 네이티브 아키텍처 검토/ADR → agent-team → minos → docker-deploy|
|전자동 (제우스)|zeus — 한 줄 설명만으로 설계→구현→테스트 완전 자동|
|기능 추가|zephermine → agent-team/수동 구현 → minos|
|데이터 설계|domain expert → database-schema-designer → 네이티브 DB별 구현·migration 테스트|
|UI 와이어프레임|aphrodite --plan-only (벤치마크 분석 → Experience Contract → 렌더 방향 비교); 원격 화면이 필요할 때만 `aphrodite --stitch`|
|UI 디자인 → 구현|aphrodite가 source-only frontend-design·감사 모듈을 직접 읽고 네이티브 구현; 명시 시 Stitch 어댑터 사용|
|코드 리뷰 종합|CLI 네이티브 review → code-reviewer 정책 레이어|
|코드 정리|hestia (dead code 탐지 + 삭제)|
|리팩토링|네이티브 코드 탐색 → deprecation-and-migration → code-reviewer|
|보안 감사|code-reviewer 보안 감사 모드 → 필요 시 argos Phase 7|
|UI/UX 품질 점검|design-plan이 렌더 비평과 source-only ui-ux-auditor 기준을 직접 적용|
|QA 자동화|minos (시나리오 자동 생성 → Playwright → Healer)|
|반복 수정 루프|auto-continue-loop (이슈 탐색 → 수정 → 검증 → 다음, 자동 반복)|
|다이어그램 기반 구현 검증|flow-verifier plan → 구현 → flow-verifier verify (코드 흐름 ↔ 다이어그램 대조)|

> 상세 가이드: [docs/workflow-guide.md](docs/workflow-guide.md)

---

## Core Rules (Always Apply)

|Rule|Principle|Action|
|---|---|---|
|Single responsibility|1 file = 1 role|Split by responsibility|
|No circular deps|Unidirectional|Restructure dependency direction|
|Security|OWASP Top 10|Check SQL injection, XSS, CSRF|
|Type safety|Required|Add type hints (Python) / TypeScript|
|DRY principle|No duplication|Extract reusable components|

## Native-First 구현 경계 (항상 적용)

- 일반 구현은 네이티브 코딩 능력과 프로젝트 코드·테스트·규칙을 먼저 따르고, 범용 코딩 표준 스킬은 사용자가 명시적으로 호출할 때만 사용한다.
- 현재 런타임의 네이티브 workflow가 요청을 완결하면 그것을 먼저 사용한다. 겹치는 활성 스킬은 네이티브 엔진을 다시 구현하지 않고, 별도 산출물·정책·검증 계약처럼 명시된 고유 차이만 추가한다.
- 기존 구조와 기존 composition point를 우선하며, 같은 역할의 새 계층이나 병렬 구조를 만들지 않는다.
- 독립적으로 변경·테스트되는 책임만 모듈로 분리하고, 모듈은 내부를 숨긴 채 명시적 계약(interface/type/function)만 노출한다.
- 모듈 간 순서·분기·조합은 기존 Application/Service/Composition Root 같은 하네스가 담당하고, 모듈끼리는 구현이 아니라 계약에만 의존한다.
- 이 규칙은 두 개 이상의 독립 블록이 있거나 독립 변경 필요가 확인될 때만 적용한다. 단순 작업에는 새 인터페이스·레이어·하네스를 추가하지 않는다.
- 네이티브 역할은 읽기 전용 탐색(Claude `Explore`, Codex `explorer`, Antigravity `research`, Grok `explore`)과 쓰기·실행 작업(Claude `general-purpose`, Codex `worker`, Antigravity 메인 또는 쓰기 도구를 명시한 사용자 정의 서브에이전트, Grok `general-purpose`)으로 분리한다. 읽기 전용 역할에 파일 쓰기를 맡기지 않는다.
- 메인 컨텍스트가 공유 태스크 장부·활동 로그·완료 판정을 소유하고, 작업자는 고유 파일을 맡거나 결과만 반환한다. 위임이 없거나 병렬 이득이 없으면 메인 컨텍스트에서 순차 실행한다.
- 기본 활성 스킬은 사용자 진입점 하네스다. 하네스가 source-only 하위 모듈을 필요로 하면 그 스킬을 호출하지 말고 카탈로그의 정확한 `SKILL.md`를 직접 읽는다. 참조와 실행 파일은 해석된 모듈 디렉터리를 기준으로 찾으며, 필수 모듈 누락은 실패 또는 `NOT RUN`으로 남기고 누락을 `PASS`로 처리하지 않는다.

---

## Cross-CLI Compatibility

- Claude Code에서 제공하는 skills, agents, hooks, MCP 기능은 Codex에서도 동일 기능 parity를 목표로 유지합니다.
- 기본 활성 사용자 호출명은 CLI 간에 동일하게 유지합니다. Claude에서 `/themis`, `workpm`, `agent-team`으로 호출되면 Codex에서도 같은 이름으로 접근 가능해야 합니다. source-only 스킬의 slash 호출은 `--include-source-only-skills`로 활성화한 뒤에만 같은 보장을 적용합니다.
- 내부 구현은 CLI별 실행 모델 차이를 반영해 달라질 수 있지만, 사용자 인터페이스와 핵심 결과는 맞춰야 합니다.
- 단순 파일 복사만으로 parity를 판단하지 말고, 전역 설치본에서 실제로 동작하는지까지 검증합니다.
- OpenClaw과 Hermes Agent는 별도 명시가 없는 한 **skills-only 지원 표면**입니다. 각각
  `~/.openclaw/skills`, `~/.hermes/skills`에 공통 진입점과 source-only 카탈로그만 설치하며,
  기존 네 CLI용 어댑터·훅·Mnemo·MCP·사용자 정의 에이전트 parity를 주장하지 않습니다.
- Codex 스킬은 기본적으로 `~/.codex/skills/`에만 설치합니다. 이 저장소의 `.agents/skills` 미러는 격리 테스트용 `--include-project-skills` 옵션에서만 생성합니다.
- 공개 추적 스킬 소스 100개는 기본 allowlist 합집합 24개(공통 진입점 18개 + 런타임 어댑터 6개)와 source-only 내부·선택 모듈 76개로 나눕니다. 런타임 전용 어댑터를 제외한 카탈로그 가용량은 Claude 97개(활성 21 + source-only 76), Codex와 Antigravity 각각 96개(활성 20 + source-only 76), OpenClaw과 Hermes Agent 각각 94개(활성 18 + source-only 76)입니다. 이 숫자는 파일·카탈로그 가용량이지 모든 선택 의존성과 런타임 분기의 실행 인증 수가 아닙니다. Grok 논리 정책도 96개지만 실제 설치 표면은 Claude 공유 디렉터리를 읽어 활성 21개를 봅니다. 내부 전용 `deploymonitor`는 로컬에만 있어 공개 배포 수에 포함하지 않습니다. 새 스킬은 allowlist 승인 전까지 자동 활성화하지 않습니다. 전체 복원은 `--include-source-only-skills`, 구 코딩 가이드 8개만 복원은 `--include-broad-coding-skills`를 사용합니다.
- 스킬 문서의 `skills/{name}/...` 경로는 현재 프로젝트에 실제 파일이 없으면 현재 CLI의 활성 스킬 루트, 이어서 `SKILLS-CATALOG.md`의 source-only `읽을 경로`를 기준으로 절대경로를 해석합니다. 활성 하네스가 source-only 모듈에 의존할 때는 `/name` 호출 대신 정확한 원본을 직접 읽고, 참조·스크립트는 해석된 모듈 루트를 기준으로 실행합니다.
- 사용자 정의 에이전트는 기본 거부 정책으로 0개를 등록합니다. 현재 소스 42종(패시브 9, 네이티브 중복 7, 중복 전문·스킬 래퍼 24, 워크플로 호환 프롬프트 2)은 source-only이며, 새 에이전트도 고유 런타임 계약을 입증해 allowlist에 넣기 전에는 자동 활성화되지 않습니다. 전체 소스 복사가 필요할 때만 `--include-source-only-agents`를 사용하고, Codex 프로젝트 에이전트 미러는 `--include-project-agents`에서만 생성합니다.
- 우선 고정 호출명: `/zephermine`(젭마인), `/zeus`(제우스), `/aphrodite`(아프로디테), `workpm`/`/daedalus`(다이달로스), `/chronos`(크로노스), `/minos`(미노스), `/agent-team`(`/poseidon`, 포세이돈), `/argos`(아르고스), `/clio`(클리오), `/themis`(테미스), `/hermes`(헤르메스), `/athena`(아테나), `/mnemo`(므네모)

---

### Web Preview Mode Development Guide

웹 프리뷰 모드(채팅 모드 + dev server + PreviewPanel)에서는 **경험 계약 → 디자인 시스템 → Frontend → Backend** 순서를 따릅니다.

|Phase|핵심|
|---|---|
|Phase 0: Experience + Design DNA|과업·메시지·CTA·신뢰·모바일 변환 → 벤치마크 판정 → 렌더 방향 비교 → 토큰 확정|
|Phase 1: Frontend → Backend|Experience Contract 기반 UI·상태 구현 → API·비즈니스 로직 연결 (프리뷰 패널 실시간 확인)|
|Phase 2: Pre-Delivery|실제 렌더 미학, 과업, 접근성, 반응형, 성능 최종 검증|

> **본격 디자인 작업**: `/aphrodite` 또는 `design-plan` 스킬을 명시 호출합니다.

---

## Repository Overview

A comprehensive collection of skills and agents for Claude Code and other AI coding agents. Extends agent capabilities across development, documentation, planning, and professional workflows.

## Available Resources

### Skill sources (공개 추적 100개; 기본 allowlist 합집합 24개, 런타임별 활성 20개 또는 21개)

| 카테고리 | 스킬 | 설명 |
|----------|------|------|
| 🤖 AI Tools | codex, antigravity, orchestrator, workpm (다이달로스), agent-team, agent-team-codex | 외부 AI 모델 연동 + 멀티 AI 오케스트레이션 + 다이달로스(현장감독) PM + 4-CLI 네이티브 멀티에이전트 (orchestrator MCP는 폴백) + Codex Multi-Agent |
| 🔮 Meta | agent-md-refactor, autoresearch, command-creator, plugin-forge, skill-judge, find-skills, manage-skills, project-gotchas, memory-distill, skill-evolve, verify-implementation | 플러그인/스킬 생성/검색/검증 + 오답노트 자동 관리 + raw 관찰 정제(rebuild) + 스킬 프롬프트 자동 최적화 (Hill Climbing) + gotcha/learned 기반 스킬 자기개선 루프 |
| 📝 Documentation | api-handoff, crafting-effective-readmes, diagram-design, domain-dictionary, draw-io, excalidraw, marp-slide, mermaid-diagrams, writing-clearly-and-concisely, docx, pdf, excel2md | 문서/다이어그램 + 에디토리얼 다이어그램 렌더링(.mmd → 브랜드 HTML+SVG 표현 계층) + 도메인 용어사전 (DDD Ubiquitous Language) + Office 문서 읽기/생성/편집 (Word/PDF/Excel) |
| 📖 Learning | explain | 코드 설명 (비유 + Mermaid) + 줌아웃 모드 (호출자/형제/상위 맵) |
| 🎨 Frontend | design-plan (아프로디테), frontend-design, design-system-starter, theme-factory, mui, openapi-to-typescript, react-dev, vercel-react-best-practices, stitch, seo-audit, ui-ux-auditor, data-visualization | 사이트 벤치마크·Experience Contract·실제 렌더 3안·UX/접근성/성능 게이트를 지휘하는 디자인 오케스트레이터 + React/TypeScript/디자인/Stitch UI 생성 + 테마·SEO·UI/UX 감사 + 차트 선택 가이드 |
| 🛠️ Development | database-schema-designer, supabase-postgres-best-practices, dependency-updater, deprecation-and-migration, docker-deploy, docker-db-backup, deploymonitor, wrangler, documentation-and-adrs, fullstack-coding-standards, dotnet-coding-standards, wpf-coding-standards, hestia (헤스티아), naming-analyzer, python-backend-fastapi, social-login, health-data | 개발 도구 + Postgres 최적화 + Cloudflare Workers 배포 + 헬스 데이터(Health Connect/HealthKit) 연동 |
| 🎯 Planning | game-changing-features, shipping-and-launch, zeus (제우스), zephermine (젭마인), ship-learn-next | 계획/요구사항 |
| 👔 Professional | daily-meeting-update, workplace-conversations, professional-communication | 비즈니스 커뮤니케이션 |
| 🧪 Testing | code-reviewer, minos, auto-continue-loop, flow-verifier, argos (아르고스), clio (클리오), themis (테미스), api-tester, test-driven-development, systematic-debugging, semgrep-rule-creator | 테스트/리뷰/자동 수정 루프/플로우 검증/감리(준공검사)/최종 점검+산출물 + 개인정보 전수 감사→국가별 처리방침 생성(ko/us/eu) + API 연동 테스트 + TDD 사이클 + 근본원인 디버깅 + Semgrep 커스텀 규칙 |
| 📦 Git | commit-work, release-notes | Git 워크플로우 & 릴리즈 노트 자동화 (버전+CHANGELOG+태그) |
| 💰 Estimation | estimate | 개발 견적서 자동 생성 (비용 그룹별 공수 산정 → 엑셀 출력) |
| 📈 Business | biz-strategy (헤르메스), ceo (아테나), okr | 사업성 검토, CEO 코칭 (Go/No-Go), OKR 목표 관리 |
| 🎬 Media | video-maker | Remotion(React/TSX)·HyperFrames(HTML/CSS/GSAP) 선택형 코드 영상 제작. 전역 설치·동기화 없이 프로젝트 엔진 하나만 사용 |
| 🌐 Translation | ko-en-translator | 한국어↔영어 양방향 번역 (텍스트, 기술 문서, 코드 주석, i18n 파일, 커밋 메시지) |
| 🔧 Utilities | datadog-cli, domain-name-brainstormer, humanizer, jira, meme-factory, ppt-generator, web-design-guidelines, web-to-markdown, youtube-transcript | 유틸리티 + YouTube 자막 추출/요약 |
| 📊 Research | reddit-researcher | Reddit 시장 조사 + 리드 스코어링 + Pain Point 분류 |
| 🧠 Memory/Session | mnemo, codex-mnemo, antigravity-mnemo, grok-mnemo, memory-compact | 기억 시스템 (대화 저장 + 태깅 + 검색 + MEMORY.md + 세션 핸드오프) + CLI별 어댑터 (Codex notify / Antigravity Stop / Grok camelCase envelope) + 메모리 크기 점검 및 압축 |

### Agents (참고 소스 42개: 최상위 40개 + 스킬 소유 2개, 기본 등록 0개)

| 카테고리 | 에이전트 | 설명 |
|----------|----------|------|
| **Optional References** | architect | 네이티브 계획·검토와 documentation-and-adrs로 대체된 아키텍처 참고자료 (소스 보존, 기본 미설치) |
| | documentation | 네이티브 작성과 목적별 문서 스킬로 대체된 템플릿 참고자료 (소스 보존, 기본 미설치) |
| | mermaid-diagram-specialist | mermaid-diagrams 스킬로 대체된 다이어그램 참고자료 (소스 보존, 기본 미설치) |
| | typescript-spec | 프로젝트 설정·컴파일러를 따르는 네이티브 TypeScript 작업으로 대체 (소스 보존, 기본 미설치) |
| | python-spec | 프로젝트 설정·테스트를 따르는 네이티브 Python 작업으로 대체 (소스 보존, 기본 미설치) |
| | ui-ux-designer | design-plan 렌더 비평과 ui-ux-auditor로 대체 (소스 보존, 기본 미설치) |
| | frontend-react | 프로젝트 manifest·기존 UI 구조·테스트를 따르는 네이티브 구현으로 대체 (소스 보존, 기본 미설치) |
| | backend-spring | 프로젝트 build manifest·기존 계층·테스트를 따르는 네이티브 구현으로 대체 (소스 보존, 기본 미설치) |
| | database-mysql | 프로젝트 DB 버전·schema·migration·실행 계획 기반 구현으로 대체 (소스 보존, 기본 미설치) |
| | database-postgresql | 프로젝트 schema·RLS·연결 설정과 명시형 Postgres 스킬로 대체 (소스 보존, 기본 미설치) |
| | react-best-practices | React/Next.js 최적화 참고 문서 (소스 보존, 기본 미설치) |
| | python-fastapi-guidelines | FastAPI 참고 문서 (소스 보존, 기본 미설치) |
| | fullstack-coding-standards | 풀스택 참고 표준 (소스 보존, 기본 미설치) |
| | dotnet-coding-standards | .NET 참고 표준 (소스 보존, 기본 미설치) |
| | wpf-coding-standards | WPF 참고 표준 (소스 보존, 기본 미설치) |
| | naming-conventions | 네이밍 참고 문서 (소스 보존, 기본 미설치) |
| | writing-guidelines | 글쓰기 + AI 패턴 제거 참고 문서 (소스 보존, 기본 미설치) |
| | bilingual-dev | 한↔영 개발 참고 문서 (소스 보존, 기본 미설치) |
| | web-preview-guide | 레거시 웹 프리뷰 상세 문서 (소스 보존, 기본 미설치) |
| | codebase-pattern-finder | 네이티브 탐색과 중복되는 패턴 검색 참고자료 (소스 보존, 기본 미설치) |
| | explore-agent | 네이티브 탐색과 중복되는 레거시 분석 참고자료 (소스 보존, 기본 미설치) |
| | debugger | 네이티브 진단과 중복되는 디버깅 참고자료 (소스 보존, 기본 미설치) |
| | feature-tracker | 네이티브 계획 상태·핸드오프로 대체된 추적 참고자료 (소스 보존, 기본 미설치) |
| | tdd-coach | 네이티브 테스트 루프와 명시형 TDD 스킬로 대체 (소스 보존, 기본 미설치) |
| | migration-helper | deprecation-and-migration으로 대체된 참고자료 (소스 보존, 기본 미설치) |
| | spec-interviewer | zephermine 인터뷰 흐름으로 대체된 참고자료 (소스 보존, 기본 미설치) |
| | api-comparator | 네이티브 diff + deprecation-and-migration + api-tester로 대체 (소스 보존, 기본 미설치) |
| | api-tester | 동명 api-tester 스킬로 대체 (소스 보존, 기본 미설치) |
| | ascii-ui-mockup-generator | 네이티브 ASCII 출력과 Aphrodite 와이어프레임 흐름으로 대체 (소스 보존, 기본 미설치) |
| | backend-dotnet | 프로젝트·공식 문서 우선의 ASP.NET Core 참고자료 (소스 보존, 기본 미설치) |
| | database-schema-designer | 동명 database-schema-designer 스킬로 대체 (소스 보존, 기본 미설치) |
| | desktop-wpf | 프로젝트·공식 문서 우선의 WPF 참고자료 (소스 보존, 기본 미설치) |
| | performance-engineer | 네이티브 측정·프로파일링을 우선하는 성능 참고자료 (소스 보존, 기본 미설치) |
| | stitch-developer | stitch 스킬로 대체된 얇은 호스트 (소스 보존, 기본 미설치) |
| | writing-specialist | 네이티브 글쓰기와 명시형 글쓰기 스킬로 대체 (소스 보존, 기본 미설치) |
| | ai-ml | 정적 공급자 API·RAG 참고자료; 실제 구현은 프로젝트 SDK·공식 문서·평가 테스트 우선 (소스 보존, 기본 미설치) |
| | qa-engineer | Minos·Argos·실제 테스트 실행으로 대체된 QA 참고자료 (소스 보존, 기본 미설치) |
| | qa-writer | Zephermine·Minos의 시나리오 생성 계약으로 대체된 참고자료 (소스 보존, 기본 미설치) |
| | code-reviewer | 동명 스킬과 CLI 네이티브 리뷰로 대체된 얇은 래퍼 (소스 보존, 기본 미설치) |
| | security-reviewer | 안전한 보안 감사 참조와 Argos Phase 7로 흡수된 정적 감사 프롬프트 (소스 보존, 기본 미설치) |
| **Skill-owned source-only** | chronos-worker | auto-continue-loop 정본을 가리키는 선택 호환 프롬프트 (기본 미설치) |
| | gotcha-analyzer | memory-distill 정본을 가리키는 선택 호환 프롬프트 (기본 미설치) |

## Creating a New Skill

### Directory Structure

```
skills/
  {skill-name}/           # kebab-case directory name
    SKILL.md              # Required: skill definition
    scripts/              # Optional: deterministic helpers
    references/           # Optional: details loaded only when needed
    assets/               # Optional: files copied into generated output
  {skill-name}.zip        # Release packaging only
```

### Naming Conventions

- **Skill directory**: `kebab-case` (e.g., `vercel-deploy`, `log-monitor`)
- **SKILL.md**: Always uppercase, always this exact filename
- **Scripts**: `kebab-case.sh` (e.g., `deploy.sh`, `fetch-logs.sh`)
- **Zip file**: Must match directory name exactly: `{skill-name}.zip`

### SKILL.md Format

```markdown
---
name: {skill-name}
description: {One sentence describing when to use this skill. Include trigger phrases like "Deploy my app", "Check logs", etc.}
---

# {Skill Title}

{Brief description of what the skill does.}

## How It Works

{Numbered list explaining the skill's workflow}

## Usage

```bash
bash "<module_root>/scripts/{script}.sh" [args]
```

`module_root` is the directory containing the exact `SKILL.md` loaded for this run. Never hardcode
`~/.claude`, `~/.codex`, or `~/.gemini` as the location of the skill's own resources.

**Arguments:**
- `arg1` - Description (defaults to X)

**Examples:**
{Show 2-3 common usage patterns}

## Output

{Show example output users will see}

## Present Results to User

{Template for how Claude should format results when presenting to users}

## Troubleshooting

{Common issues and solutions, especially network/permissions errors}
```

### Best Practices for Context Efficiency

Skills are loaded on-demand — only the skill name and description are loaded at startup. The full `SKILL.md` loads into context only when the agent decides the skill is relevant. To minimize context usage:

- **Keep SKILL.md concise** — put detailed reference material in separate files (progressive disclosure)
- **Write short, routing-focused descriptions** — include trigger words and boundaries; put workflow details in the body
- **Use progressive disclosure** — reference supporting files that get read only when needed
- **Prefer scripts over inline code** — script execution doesn't consume context (only output does)
- **File references work one level deep** — link directly from SKILL.md to supporting files

### Script Requirements

- Add a script only when repeated deterministic execution materially improves reliability.
- For Bash helpers, use `#!/bin/bash`, `set -e`, stderr for status, stdout for machine-readable output,
  and a cleanup trap when temporary files are created.
- Resolve scripts, references, and assets from `module_root`; do not assume a runtime-specific install home.
- When a helper is not portable across the supported operating systems, document the supported runtime and
  provide a main-context fallback instead of claiming cross-CLI parity.

### Cross-CLI Authoring and Sync Gate

`skills/{skill-name}/` is the single canonical source. Do not maintain separate Claude, Codex,
Antigravity, and Grok copies in the repository.

Before calling a skill cross-CLI compatible:

1. Keep the standard folder + `SKILL.md` contract. The canonical cross-CLI frontmatter uses the currently
   verified four-runtime intersection only: required `name` and `description`, plus optional `license` and
   flat-string `metadata`. Put runtime requirements in the body. Although the upstream Agent Skills specification
   defines `compatibility` and experimental `allowed-tools`, do not add them to the shared source until every
   supported runtime validator accepts the same form.
2. Do not depend on Claude extensions such as `disable-model-invocation`, `user-invocable`, `argument-hint`,
   `context`, or `model`; other runtimes may ignore them. Express essential behavior in the description/body or
   an explicit runtime adapter. Put provider-specific tool restrictions in that adapter rather than shared
   frontmatter.
3. Refer to host capabilities semantically (`read`, `search`, `edit`, `run`, `delegate`) rather than requiring
   Claude-only tool names such as `TodoWrite`, `Agent`, or `SendMessage`.
4. Audit the current runtime's official native workflows before adding a workflow skill. For Antigravity this
   includes `/goal`, `/plan`, `/grill-me`, `/teamwork-preview`, `/learn`, `/schedule`, and `/browser`, plus native
   skill, agent, task, hook, and MCP management. If a native workflow already completes the same job, do not
   duplicate it. If the canonical skill adds a real deliverable or policy, name that delta and make the native
   workflow the engine. A skill with no unique delta remains source-only or is not added.
5. Put genuinely runtime-specific behavior behind an explicit branch or adapter. Hooks, transcript payloads,
   native slash commands, agent schemas, and permission flags are not portable by file copy alone.
6. Use current Antigravity paths and contracts: global skills under
   `~/.gemini/antigravity-cli/skills/`, workspace skills under `.agents/skills/`, global agents and hooks under
   `~/.gemini/config/`, and `agy` as the executable.
7. Add a new skill as source-only by default. Promote it in `scripts/skill-install-policy.js` only after the
   allowlist criteria are met. Add an incompatible runtime adapter to that runtime's exclusion list.
8. Run the portable frontmatter, installer, and policy tests. A copied file or generated catalog is availability evidence, not proof
   that every runtime-specific workflow executes successfully.

Running `install.bat` or `bash install.sh` without arguments synchronizes the canonical library for Claude,
Codex, Antigravity, and Grok. Grok consumes the Claude compatibility surface; it has no separate skill copy.

### Creating the Zip Package

After creating or updating a skill:

```bash
cd skills
zip -r {skill-name}.zip {skill-name}/
```

### End-User Installation

For this repository, recommend the all-runtime installer:

```bash
# Windows
install.bat

# macOS/Linux/Git Bash
bash install.sh
```

The managed global locations are:

| Runtime | Skill location |
|---------|----------------|
| Claude Code | `~/.claude/skills/{skill-name}/SKILL.md` |
| Codex CLI | `${CODEX_HOME:-~/.codex}/skills/{skill-name}/SKILL.md` |
| Antigravity CLI | `~/.gemini/antigravity-cli/skills/{skill-name}/SKILL.md` |
| Grok Build | Claude compatibility surface at `~/.claude/skills/` |

Antigravity workspace-only skills use `.agents/skills/{skill-name}/SKILL.md`.

For a standalone manual Claude installation:

**Claude Code:**
```bash
cp -r skills/{skill-name} ~/.claude/skills/
```

**claude.ai:**
Add the skill to project knowledge or paste SKILL.md contents into the conversation.

If the skill requires network access, instruct users to add required domains at `claude.ai/settings/capabilities`.

---

## Skills vs Agents: When to Use

Based on [Vercel's agent evaluation research](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals):

|Use Case|Recommended|Reason|
|---|---|---|
|Framework knowledge|AGENTS.md|Passive context = 100% pass rate|
|Code generation rules|AGENTS.md|Always available, no decision point|
|User-triggered workflows|Skills|기본 활성 진입점은 명시 호출; source-only는 자연어 요청으로 카탈로그 직접 로드|
|Version migrations|Skills|One-time, explicit action|
|Architecture changes|Skills|Requires user confirmation|

### Key Insight

> **Retrieval-led reasoning > Pre-training knowledge**
>
> When documentation exists in this repo, READ IT before relying on training data.
> Training data may be outdated; local docs are authoritative.

---

## Hooks (Automatic Enforcement)

훅은 특정 이벤트에서 자동 실행되어 규칙을 강제합니다.

### Available Hooks

|훅|타이밍|트리거|동작|
|---|---|---|---|
|check-new-file.sh|PreToolUse|새 파일 생성|유사 파일 경고|
|protect-files.sh|PreToolUse|민감 파일 수정|.env, credentials 보호|
|validate-api.sh|PostToolUse|API 파일 수정|구문/타입 검사|
|save-conversation.sh|UserPromptSubmit|모든 입력|사용자 입력을 대화 파일에 저장|
|save-response.sh|Stop|세션 종료|Assistant 응답을 대화 파일에 저장|
|save-tool-use.sh|PostToolUse|도구 실행|도구 사용 로그 + gotchas/learned 관찰 저장|
|reconcile-conversations.sh|SessionStart|세션 시작|Claude transcript + Codex rollout JSONL 기준으로 save-response/save-turn이 놓친 턴을 backfill (멱등)|
|orchestrator-detector.js|UserPromptSubmit|workpm/pmworker 입력|PM/Worker 모드 감지|
|loop-stop.sh|Stop|Chronos 루프 활성 시|세션 종료 가로채서 프롬프트 재투입 (자동 반복)|

### 3-Layer Architecture

```
Layer 1: AGENTS.md (Passive Guidelines)
  → 핵심 규칙이 항상 컨텍스트에 존재
  → AI가 처음부터 좋은 코드 작성

Layer 2: Hooks (Automatic Enforcement)
  → 규칙 위반 자동 감지
  → 즉시 피드백

Layer 3: Skills (On-demand Analysis)
  → 기본 활성 하네스는 slash/별칭으로 진입
  → source-only 분석 모듈은 자연어 요청 시 카탈로그 원본 직접 로드
```

### Hook Configuration (settings.json)

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write",
        "hooks": ["bash hooks/check-new-file.sh"]
      },
      {
        "matcher": "Edit|Write",
        "hooks": ["bash hooks/protect-files.sh"]
      }
    ],
    "PostToolUse": []
  }
}
```

<!-- CODEMAP_RULES_START -->

## Code Map (자동 생성)

> 이 섹션은 TermSnap CodeMapService가 자동 관리합니다. 수동 편집하지 마세요.

코드 위치를 찾을 때 다음 순서로 진행하세요. 앞 단계에서 충분한 정보를 얻으면 다음 단계는 건너뜁니다.

1. **`codemap/index.md`** — 카테고리 + 파일 수 요약. 필요하면 `codemap/info.md`의 작업별 라우터로 읽는 순서를 확인.
2. **해당 카테고리 `.md` grep** — 통째 read 금지. 항목 옆 `(L123)` 라인 번호는 그대로 `Read(file, offset=L, limit=N)` 사용.
3. **검색 결과가 많으면 로컬 압축 우선** — `rg --json`/`rg --vimgrep`/`file:line:text` 결과를 파일별로 묶고 routes/api/ui 신호와 source/test/document 가중치로 상위 파일만 읽음. MCP `codemap_compress_search`는 외부 agent용 선택 경로이며 필수 단계가 아님.
4. **못 찾으면 일반 grep/Glob** — codemap이 stale일 수 있음. 의심되면 사용자에게 "코드맵 갱신"을 권장.

코드 위치 답변 시 `file:line` 형식 사용 (예: `RAGService.cs:53`).

<!-- CODEMAP_RULES_END -->
