**언어:** [English](README.md) | 한국어

# Claude Code Agent Customizations

[![Stars](https://img.shields.io/github/stars/Dannykkh/claude-code-agent-customizations?style=flat)](https://github.com/Dannykkh/claude-code-agent-customizations/stargazers)
[![Forks](https://img.shields.io/github/forks/Dannykkh/claude-code-agent-customizations?style=flat)](https://github.com/Dannykkh/claude-code-agent-customizations/network/members)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Shell](https://img.shields.io/badge/-Shell-4EAA25?logo=gnu-bash&logoColor=white)
![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?logo=typescript&logoColor=white)
![PowerShell](https://img.shields.io/badge/-PowerShell-5391FE?logo=powershell&logoColor=white)
![Node.js](https://img.shields.io/badge/-Node.js-339933?logo=node.js&logoColor=white)

> **93개 스킬** | **47개 에이전트** | **12개 훅** | **3개 CLI 지원** | **크로스 CLI 메모리 동기화**

---

**Claude Code, Codex CLI, Gemini CLI를 위한 프로덕션 레벨 에이전트 하니스.**

단순한 설정 파일이 아닙니다. 완전한 시스템입니다: 제로 인터랙션 풀 파이프라인(설계 → 구현 → 감리 → 테스트), 크로스 CLI 메모리 영속성, 오답노트/성공 패턴 자동 추적, 멀티 AI 병렬 오케스트레이션. 3개월 이상의 실전 프로덕트 개발 경험에서 진화했습니다.

**Claude Code**, **Codex CLI**, **Gemini CLI**에서 동작합니다.

---

## 빠른 시작

```bash
# 클론
git clone https://github.com/Dannykkh/claude-code-agent-customizations.git
cd claude-code-agent-customizations

# Windows
.\install.bat

# macOS/Linux
chmod +x install.sh && ./install.sh
```

끝입니다. **93개 스킬, 47개 에이전트, 12개 훅**이 Claude Code + Codex CLI + Gemini CLI에 설치됩니다.

> Codex/Gemini가 미설치 시 해당 단계는 자동 스킵됩니다.

---

## 최신 업데이트

### v1.8.0 — 오답노트 + 성공 패턴 학습 (2026.03)

- **project-gotchas** — 실수 자동 추적 + 성공 패턴 학습 (Haiku 분석 에이전트)
- **2계층 저장** — 글로벌(`memory/gotchas/`) + 프로젝트별(`memory/learned/`)
- **크로스 CLI 관찰** — Claude save-tool-use + Codex/Gemini save-turn 훅 통합
- **CHANGELOG.md** — 버전 히스토리 v1.0.0 ~ v1.8.0

### v1.7.0 — Orchestrator SQLite WAL + QPassenger Step 5 (2026.03)

- **orchestrator** — state.json → SQLite WAL 전환 (크래시 복구, 동시 접근)
- **qpassenger** — Playwright MCP 실제 브라우저 QA 테스트
- **codemap** — CodeMap 인덱스 (코드베이스 탐색)

### v1.6.0 — 디자인 + 비즈니스 + 스킬 베스트 프랙티스 (2026.03)

- **design-plan (아프로디테)** — 디자인 오케스트레이터 (161 팔레트, 73 폰트, 84 스타일)
- **estimate** — 개발 견적서 자동 생성 (엑셀 출력)
- **biz-strategy (헤르메스)** — 비즈니스 모델 캔버스, TAM/SAM/SOM, GTM 전략
- **Anthropic 베스트 프랙티스** — 전체 스킬에 적용

전체 변경 이력: [CHANGELOG.md](CHANGELOG.md) | [Releases](https://github.com/Dannykkh/claude-code-agent-customizations/releases)

---

## 핵심 파이프라인

한 줄이면 됩니다:

```
/zeus "쇼핑몰 만들어줘. React + Spring Boot"
    → 설계 (24단계 인터뷰) → 구현 (병렬 워커) → 감리 → 테스트
    → 제로 인터랙션 — 질문 없이 모든 결정 자동화
```

| 단계 | 스킬 | 하는 일 |
|------|------|---------|
| **설계** | `/zephermine` (젭마인) | 24단계 인터뷰 → SPEC.md → 5인 전문가 팀 리뷰 |
| **구현** | `/agent-team` (대니즈팀) | 웨이브 그룹 병렬 실행 (Agent Teams) |
| **감리** | `/argos` (아르고스) | 준공검사: 설계 대비 구현 검증 |
| **테스트** | `/qpassenger` (큐패신저) | Playwright E2E 테스트 + fix-until-pass 루프 |
| **산출물** | `/closer` (클로저) | 흐름도 + PRD + 기술문서 + 사용자 매뉴얼 |
| **전자동** | `/zeus` (제우스) | 전 단계 자동 실행, 제로 인터랙션 |

각 스킬은 독립 실행 또는 파이프라인의 일부로 동작합니다.

---

## 크로스 CLI 지원

같은 스킬, 같은 메모리, 같은 경험을 3개 CLI에서.

| 기능 | Claude Code | Codex CLI | Gemini CLI |
|------|------------|-----------|------------|
| 스킬 | `~/.claude/skills/` | `~/.codex/skills/` | `~/.gemini/skills/` |
| 에이전트 | `~/.claude/agents/` | `~/.codex/agents/` | `~/.gemini/agents/` |
| 메모리 (므네모) | save-response 훅 | save-turn 훅 | save-turn 훅 |
| 오답노트/학습 | save-tool-use 훅 | save-turn 훅 | save-turn 훅 |
| 오케스트레이터 | MCP 서버 | MCP 서버 | MCP 서버 |
| 설치 | `install.bat/sh` | 자동 (8-11단계) | 자동 (12단계) |

크로스 CLI 동기화는 `sync-codex-assets.js`와 `sync-gemini-assets.js`가 처리합니다.

---

## 메모리 시스템 (므네모)

세션과 CLI를 넘나드는 3계층 영속 메모리.

```
세션 A: 작업 → #tags 저장 → /wrap-up → MEMORY.md 업데이트
세션 B: MEMORY.md 자동 로드 → 과거 검색 → 컨텍스트 복원
```

| 계층 | 저장소 | 로딩 |
|------|--------|------|
| **인덱스** | `MEMORY.md` | 항상 (100줄 미만) |
| **의미기억** | `memory/*.md` | 필요 시 |
| **일화기억** | `conversations/*.md` | 검색 시 |

오답노트/학습 패턴 자동 추적 포함:
- **에러** → `memory/gotchas/observations.jsonl` → Haiku가 패턴 분석
- **성공** → `memory/learned/observations.jsonl` → Haiku가 워크플로우 감지

---

## 구성 요소

### 스킬 (93개)

| 카테고리 | 스킬 | 핵심 |
|----------|------|------|
| **AI 도구** | codex, gemini, orchestrator, workpm, agent-team + 5개 | 멀티 AI 오케스트레이션, PM-Worker 패턴 |
| **파이프라인** | zephermine, zeus, argos, qpassenger, closer | 제로 인터랙션 풀 파이프라인 |
| **프론트엔드** | react-dev, frontend-design, stitch-*, seo-audit, ui-ux-auditor + 5개 | 161 팔레트, 73 폰트, SEO+AEO+GEO 감사 |
| **개발** | docker-deploy, database-schema-designer, code-reviewer + 7개 | Docker, DB 설계, 코드 품질 |
| **비즈니스** | biz-strategy, estimate, okr, daily-meeting-update | 견적서, OKR, 스탠드업 |
| **테스트** | qa-test-planner, auto-continue-loop, flow-verifier + 3개 | 크로노스 루프, Playwright QA |
| **메모리** | mnemo, memory-compact, project-gotchas | 3계층 메모리, 자동 학습 |
| **문서** | mermaid-diagrams, marp-slide, docx, pdf, draw-io + 3개 | 다이어그램, 프레젠테이션, 문서 |
| **메타** | skill-judge, manage-skills, plugin-forge, release-notes + 4개 | 스킬 관리, 릴리즈 자동화 |
| **Git** | commit-work, release-notes, deploymonitor | 커밋, CHANGELOG, 배포 |
| **미디어** | video-maker | Remotion 기반 React 영상 |
| **리서치** | reddit-researcher | 시장 조사 + 리드 스코어링 |
| **유틸** | humanizer, jira, datadog-cli, excel2md + 3개 | AI 패턴 제거, 통합 |

### 에이전트 (47개)

| 영역 | 에이전트 |
|------|----------|
| **아키텍처** | architect, spec-interviewer, fullstack-development-workflow |
| **프론트엔드** | frontend-react, react-best-practices, stitch-developer, ui-ux-designer |
| **백엔드** | backend-spring, backend-dotnet, desktop-wpf, python-fastapi |
| **데이터베이스** | database-postgresql, database-mysql, database-schema-designer |
| **품질** | code-reviewer, security-reviewer, qa-engineer, tdd-coach |
| **성능** | performance-engineer, debugger |
| **AI/ML** | ai-ml (RAG, LLM API, 최신 SDK) |
| **글쓰기** | writing-specialist, humanizer-guidelines, writing-guidelines |
| **언어** | typescript-spec, python-spec |

### 훅 (12개)

| 훅 | 이벤트 | 역할 |
|----|--------|------|
| save-response | Stop | 어시스턴트 응답 + #tags 자동 저장 |
| save-tool-use | PostToolUse | 도구 로깅 + 오답노트/학습 관찰 |
| save-conversation | UserPromptSubmit | 사용자 입력 영속화 |
| validate-code | PostToolUse | 500줄 제한, 보안 스캔 |
| check-new-file | PreToolUse | 엔트로피 축소 체크 |
| protect-files | PreToolUse | 민감 파일 보호 |
| validate-docs | PostToolUse | AI 글쓰기 패턴 감지 |
| format-code | PostToolUse | 자동 포맷 (Python/TS/JS/Java/CSS) |
| validate-api | PostToolUse | API 파일 검증 |
| loop-stop | Stop | 크로노스 자동 반복 |
| ddingdong-noti | Stop | OS 네이티브 알림 |
| orchestrator-detector | UserPromptSubmit | PM/Worker 모드 감지 |

---

## 멀티 AI 오케스트레이션

PM이 작업을 배분하고, Worker(Claude + Codex + Gemini)가 병렬 실행합니다.

```
터미널 1 (PM):     /workpm → 분석 → 3개 작업 생성
터미널 2 (Claude): /pmworker → task-1 클레임 → 실행 → 완료
터미널 3 (Codex):  /pmworker → task-2 클레임 → 실행 → 완료
터미널 4 (Gemini): /pmworker → task-3 클레임 → 실행 → 완료
```

| 구성 요소 | 설명 |
|-----------|------|
| **Orchestrator MCP** | SQLite WAL 작업 큐, 파일 락, 의존성 해결 |
| **workpm** | 통합 PM 엔트리포인트 (Agent Teams 또는 MCP 모드) |
| **pmworker** | 통합 Worker 엔트리포인트 (모든 CLI) |

---

## 외부 리소스

### 추천 스킬

| 리소스 | 설명 | 설치 |
|--------|------|------|
| [everything-claude-code](https://github.com/affaan-m/everything-claude-code) | Anthropic 해커톤 우승 (28 에이전트, 116 스킬) | `/plugin marketplace add` |
| [Vercel Agent Skills](https://github.com/vercel-labs/agent-skills) | React/Next.js 베스트 프랙티스 (45+ 규칙) | `npx add-skill vercel-labs/agent-skills` |
| [claude-code-dotnet](https://github.com/Aaronontheweb/claude-code-dotnet) | C#/WPF/MAUI/.NET 스킬 | `npx add-skill Aaronontheweb/claude-code-dotnet` |

### 추천 MCP 서버

| MCP | 설명 | 설치 |
|-----|------|------|
| [Context7](https://github.com/upstash/context7) | 최신 라이브러리 문서 (Next.js 15, React 19) | `claude mcp add context7 -- npx -y @upstash/context7-mcp` |
| [Playwright](https://github.com/microsoft/playwright-mcp) | 브라우저 자동화 (QA용) | `claude mcp add playwright -- npx -y @playwright/mcp@latest` |
| [Stitch](https://github.com/anthropics/stitch-mcp) | Google Stitch UI 디자인 | `npx -p stitch-mcp-auto stitch-mcp-auto-setup` |

### 스킬 디렉토리

| 리소스 | 설명 |
|--------|------|
| [skills.sh](https://skills.sh/) | Vercel 운영 25K+ 스킬 디렉토리 |
| [awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills) | 200+ 큐레이션 스킬 |
| [awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) | Claude Code 리소스 모음 |

---

## 버전 히스토리

| 버전 | 날짜 | 핵심 |
|------|------|------|
| [v1.8.0](https://github.com/Dannykkh/claude-code-agent-customizations/releases/tag/v1.8.0) | 2026-03-23 | 오답노트 + 성공 패턴 학습 |
| [v1.7.0](https://github.com/Dannykkh/claude-code-agent-customizations/releases/tag/v1.7.0) | 2026-03-21 | Orchestrator SQLite WAL + QPassenger |
| [v1.6.0](https://github.com/Dannykkh/claude-code-agent-customizations/releases/tag/v1.6.0) | 2026-03-18 | 디자인 + 비즈니스 + 스킬 베스트 프랙티스 |
| [v1.5.0](https://github.com/Dannykkh/claude-code-agent-customizations/releases/tag/v1.5.0) | 2026-03-09 | Closer + SEO Audit + 파이프라인 리팩토링 |
| [v1.4.0](https://github.com/Dannykkh/claude-code-agent-customizations/releases/tag/v1.4.0) | 2026-03-02 | Chronos + Argos + Memory Compact |
| [v1.3.0](https://github.com/Dannykkh/claude-code-agent-customizations/releases/tag/v1.3.0) | 2026-02-19 | 크로스 CLI: Codex + Gemini |
| [v1.2.0](https://github.com/Dannykkh/claude-code-agent-customizations/releases/tag/v1.2.0) | 2026-02-09 | Agent-Team + Zeus + QA 파이프라인 |
| [v1.1.0](https://github.com/Dannykkh/claude-code-agent-customizations/releases/tag/v1.1.0) | 2026-02-01 | Zephermine + Mnemo + Install |
| [v1.0.0](https://github.com/Dannykkh/claude-code-agent-customizations/releases/tag/v1.0.0) | 2026-01-29 | 최초 릴리즈 |

---

## 라이선스

MIT License

---

**마지막 업데이트:** 2026-03-23
