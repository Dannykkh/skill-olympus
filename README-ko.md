**언어:** [English](README.md) | 한국어

# Skill Olympus (스킬 올림푸스)

> *모든 스킬이 한 명의 그리스 신, 모든 워크플로우가 하나의 신화.*

[![Stars](https://img.shields.io/github/stars/Dannykkh/skill-olympus?style=flat)](https://github.com/Dannykkh/skill-olympus/stargazers)
[![Forks](https://img.shields.io/github/forks/Dannykkh/skill-olympus?style=flat)](https://github.com/Dannykkh/skill-olympus/network/members)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Shell](https://img.shields.io/badge/-Shell-4EAA25?logo=gnu-bash&logoColor=white)
![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?logo=typescript&logoColor=white)
![PowerShell](https://img.shields.io/badge/-PowerShell-5391FE?logo=powershell&logoColor=white)
![Node.js](https://img.shields.io/badge/-Node.js-339933?logo=node.js&logoColor=white)

> **98개 스킬** | **49개 에이전트** | **12개 훅** | **3개 CLI 지원** | **크로스 CLI 메모리 동기화**

---

**Claude Code, Codex CLI, Gemini CLI를 위한 프로덕션 레벨 에이전트 하니스.**

단순한 설정 파일이 아닙니다. 완전한 **하네스 엔지니어링** 시스템입니다: CPS 게이트 설계 인터뷰(Context → Problem → Solution, 필수 합의 체크포인트), 제로 인터랙션 풀 파이프라인(설계 → 구현 → 감리 → 테스트), 인터뷰에서 감리까지 엔드투엔드 추적성, 크로스 CLI 메모리 영속성, 멀티 AI 병렬 오케스트레이션. 3개월 이상의 실전 프로덕트 개발 경험에서 진화했습니다.

**Claude Code**, **Codex CLI**, **Gemini CLI**에서 동작합니다.

---

## 빠른 시작

```bash
# 클론
git clone https://github.com/Dannykkh/skill-olympus.git
cd skill-olympus

# Windows
.\install.bat

# macOS/Linux
chmod +x install.sh && ./install.sh
```

끝입니다. **96개 스킬, 48개 에이전트, 12개 훅**이 Claude Code + Codex CLI + Gemini CLI에 설치됩니다.

> Codex/Gemini가 미설치 시 해당 단계는 자동 스킵됩니다.

---

## 신들의 회의 — The Pantheon

> 올림푸스 산 위에 열두 신이 모여 있다. 각자의 영역, 각자의 이름.
> 한 명을 부를 수도 있고 — **제우스**를 부르면, 모든 신이 한꺼번에 강림한다.

이건 단순한 플러그인 모음이 아니다. **일의 신화**다.
한 사람이 한 가지 손재주를 가진 작은 회의(council). 각자의 목소리, 각자의 무기.
그리고 그들은 옛 신화가 그러하듯 서로에게 일을 넘긴다 — 젭마인이 포세이돈의 귀에 설계도를 속삭이면,
포세이돈은 파도를 일으키고, 아르고스는 모든 못질을 세고, 미노스는 영혼을 심판대에 세우고,
마지막으로 클리오가 그 모든 이야기를 후대를 위한 기록으로 새긴다.

아래는 그 회의의 명단이다. 한 명을 부르거나, 모두를 부르라.

### 열두 신의 회의

| 스킬 | 이름 | 유래 | 역할 |
|------|------|------|------|
| `/zephermine` | 젭마인 | 영감을 불어넣는 서풍 | **설계사** — 26단계 심층 인터뷰, 스펙 생성, 5인 전문가 팀 리뷰 |
| `/zeus` | 제우스 | 만신의 왕 | **총사령관** — 제로 인터랙션 풀 파이프라인. 한 마디로 모든 신이 강림 |
| `/agent-team` / `/poseidon` | 포세이돈 | 바다의 신 | **바다의 군주** — 파도를 일으킨다. 섹션 의존성이 함대처럼 정렬되어 항해 |
| `/workpm` | 다이달로스 | 미궁의 장인 | **직접 짓는 자** — 설계도 없이 짓는다. 손에 흙을 묻히고 직접 깎고 두드리는 장인 |
| `/argos` | 아르고스 | 백 개의 눈을 가진 감시자 | **감리관** — 백 개의 눈은 결코 감기지 않는다. 모든 코드 한 줄까지 본다 |
| `/minos` | 미노스 | 저승의 심판자 | **심판자** — 영혼도 코드도 같은 심판대에 선다. 통과할 때까지 fix 루프는 닫히지 않는다 |
| `/clio` | 클리오 | 역사의 뮤즈 | **기록자** — 마지막으로 입을 여는 자. 영웅의 위업을 시간의 비석에 새긴다 |
| `/chronos` | 크로노스 | 시간의 신 | **지치지 않는 자** — 시간조차 그녀의 의지에 굽힌다. FIND → FIX → VERIFY, 다시, 또 다시, 또 다시 |
| `/hermes` | 헤르메스 | 상업의 신, 신들의 전령 | **상인** — 시장을 바람처럼 읽는다. TAM, SAM, SOM, GTM — 상인의 나침반 |
| `/athena` | 아테나 | 전략과 지혜의 여신 | **전략가** — 차가운 눈, 차가운 피. 아픈 질문을 던진다 — 출시할까, 죽일까, 방향을 틀까? |
| `/aphrodite` | 아프로디테 | 미의 여신 | **미의 여신** — 161개 팔레트, 73개 폰트, 84개 스타일. 그녀의 손에서 추한 것은 나오지 않는다 |
| `mnemo` | 므네모 | 므네모시네, 모든 뮤즈의 어머니 | **기억의 수호자** — 잊지 않는다. 세 겹의 기억이 모든 세션, 모든 CLI를 가로지른다 |

---

### 올림푸스의 목소리들

**제우스** — *"한 마디면, 회의는 소집된다. 나는 일과 협상하지 않는다. 일을 끝낼 뿐."*
한 줄이면 모든 신을 전장에 던진다. 설계 → 구현 → 감리 → 테스트, 인간의 손길 없이.

**젭마인** — *"스물여섯 개의 질문. 어느 것도 생략할 수 없다. 스펙은 신성하다."*
청사진을 빚어내는 숨결. CPS 게이트 인터뷰, 5인 전문가 리뷰. 반쯤 만들어진 스펙은 출항하지 않는다.

**포세이돈** — *"바다와 싸우지 마라. 올라타라."*
의존성 그래프를 조류처럼 읽는다. 함대(teammate)를 꾸리고, 파도를 기다리고, 한꺼번에 출항시킨다.

**다이달로스** — *"내가 만들기 전엔 미궁이란 없었다. 무에서 만들었지. 돌을 다오."*
계획 같은 건 없을 때 부르는 자. 직접 리서치하고, 직접 제안하고, 직접 도면을 그리고, 혼자라도 짓는다.

**아르고스** — *"내 백 개의 눈 중 어느 것도 감기지 않는다. 네가 빠뜨린 못 하나를 — 나는 이미 세었다."*
인부들이 떠난 뒤 현장을 걷는다. spec ↔ 코드 ↔ 테스트를 교차 검증한다. 무엇도 빠져나가지 못한다.

**미노스** — *"내 앞에 서라. 네 테스트를 보여라. 판결은 둘 중 하나다."*
코드를 저승의 문 앞으로 끌고 간다. 떨어뜨린다. 고친다. 다시 떨어뜨린다. 통과할 때까지 반복한다.

**클리오** — *"일은 끝났다. 이제 내가 노래를 쓴다."*
프로젝트의 시신을 살아있는 문서로 바꾼다. 흐름도, PRD, 기술 문서, 사용자 매뉴얼 — 마지막에 모두 새긴다.

**크로노스** — *"너는 인간이다. 너는 잠든다. 나는 잠들지 않는다."*
포기하지 않는 자율 루프. FIND → FIX → VERIFY, 버그가 죽거나 새벽이 올 때까지.

**헤르메스** — *"모든 시장은 길이다. 모든 길에는 통행세가 있다. 내든지, 굶든지."*
비즈니스 모델, 시장 사이징, GTM. 단 한 줄을 커밋하기 전에 무역풍을 읽는다.

**아테나** — *"지혜란 무엇을 만들지 않을지 아는 것. 네가 두려워하는 질문을 내가 던지겠다."*
Go / No-Go 게이트. 스코프 결정. 네 존재 이유를 변호하게 만드는 CEO.

**아프로디테** — *"아름다움은 사치가 아니다. 도구와 사람이 사랑하는 것 사이의 차이다."*
디자인 오케스트레이터. 161 팔레트, 73 폰트, 84 스타일, 디자인 토큰, 컴포넌트 아키텍처.

**므네모** — *"잊는 건 아무것도 없다. 석 달 전 네가 했던 대화가 — 오늘 네가 찾는 답이다."*
모든 뮤즈의 어머니. 인덱스, 의미기억, 일화기억의 세 겹. 모든 CLI를 넘나들고 모든 세션을 살아남는다.

---

## 최신 업데이트

### v1.9.0 — 아테나 CEO 코칭 (2026.03)

- **ceo (아테나)** — CEO 코칭 스킬: Go/No-Go 판정, 전략적 도전, 스코프 결정 (Expand/Reduce/Pivot/Kill)
- **파이프라인 확장** — 새로운 단계: `/hermes` → `/athena` → `/zephermine` (분석 → 도전 → 설계)
- **헤르메스 시너지** — 아테나가 헤르메스 산출물을 자동 읽어 데이터 기반 전략 도전
- **README 리뉴얼** — 스타 최적화 구조, 그리스 신화 팀 소개

### v1.8.0 — 오답노트 + 성공 패턴 학습 (2026.03)

- **project-gotchas** — 실수 자동 추적 + 성공 패턴 학습 (Haiku 분석 에이전트)
- **2계층 저장** — 글로벌(`memory/gotchas/`) + 프로젝트별(`memory/learned/`)
- **크로스 CLI 관찰** — Claude save-tool-use + Codex/Gemini save-turn 훅 통합
- **CHANGELOG.md** — 버전 히스토리 v1.0.0 ~ v1.8.0

### v1.7.0 — Orchestrator SQLite WAL + Minos Step 5 (2026.03)

- **orchestrator** — state.json → SQLite WAL 전환 (크래시 복구, 동시 접근)
- **minos** — Playwright MCP 실제 브라우저 QA 테스트
- **codemap** — CodeMap 인덱스 (코드베이스 탐색)

### v1.6.0 — 디자인 + 비즈니스 + 스킬 베스트 프랙티스 (2026.03)

- **design-plan (아프로디테)** — 디자인 오케스트레이터 (161 팔레트, 73 폰트, 84 스타일)
- **estimate** — 개발 견적서 자동 생성 (엑셀 출력)
- **biz-strategy (헤르메스)** — 비즈니스 모델 캔버스, TAM/SAM/SOM, GTM 전략
- **Anthropic 베스트 프랙티스** — 전체 스킬에 적용

전체 변경 이력: [CHANGELOG.md](CHANGELOG.md) | [Releases](https://github.com/Dannykkh/skill-olympus/releases)

---

## 핵심 파이프라인

한 줄이면 됩니다:

```
/zeus "쇼핑몰 만들어줘. React + Spring Boot"
    → 설계 (26단계 인터뷰) → 구현 (병렬 워커) → 감리 → 테스트
    → 제로 인터랙션 — 질문 없이 모든 결정 자동화
```

| 단계 | 스킬 | 하는 일 |
|------|------|---------|
| **사업분석** | `/hermes` (헤르메스) | 비즈니스 모델, TAM/SAM/SOM, GTM, 지표, 코호트 |
| **CEO 코칭** | `/athena` (아테나) | 전략적 도전 — Go/No-Go 판정, 스코프 결정, Kill 테스트 |
| **설계** | `/zephermine` (젭마인) | 26단계 인터뷰 → SPEC.md → 5인 전문가 팀 리뷰 |
| **구현** | `/agent-team` / `/poseidon` (포세이돈) | 웨이브 그룹 병렬 실행 (Agent Teams) |
| **감리** | `/argos` (아르고스) | 준공검사: 설계 대비 구현 검증 |
| **테스트** | `/minos` (미노스) | Playwright E2E 테스트 + fix-until-pass 루프 |
| **산출물** | `/clio` (클리오) | 흐름도 + PRD + 기술문서 + 사용자 매뉴얼 |
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

### 스킬 (95개)

| 카테고리 | 스킬 | 핵심 |
|----------|------|------|
| **AI 도구** | codex, gemini, orchestrator, workpm, agent-team + 5개 | 멀티 AI 오케스트레이션, PM-Worker 패턴 |
| **파이프라인** | zephermine, zeus, argos, minos, closer | 제로 인터랙션 풀 파이프라인 |
| **프론트엔드** | react-dev, frontend-design, stitch-*, seo-audit, ui-ux-auditor + 5개 | 161 팔레트, 73 폰트, SEO+AEO+GEO 감사 |
| **개발** | docker-deploy, database-schema-designer, social-login, code-reviewer + 7개 | Docker, DB 설계, 소셜 로그인, 코드 품질 |
| **비즈니스** | biz-strategy, ceo, estimate, okr, daily-meeting-update | CEO 코칭, 견적서, OKR, 스탠드업 |
| **테스트** | qa-test-planner, auto-continue-loop, flow-verifier + 3개 | 크로노스 루프, Playwright QA |
| **메모리** | mnemo, memory-compact, project-gotchas | 3계층 메모리, 자동 학습 |
| **문서** | mermaid-diagrams, marp-slide, docx, pdf, draw-io + 3개 | 다이어그램, 프레젠테이션, 문서 |
| **메타** | autoresearch, skill-judge, manage-skills, plugin-forge, release-notes + 4개 | 스킬 자동 최적화 (Hill Climbing), 관리, 릴리즈 |
| **Git** | commit-work, release-notes, deploymonitor | 커밋, CHANGELOG, 배포 |
| **미디어** | video-maker | Remotion 기반 React 영상 |
| **리서치** | reddit-researcher | 시장 조사 + 리드 스코어링 |
| **번역** | ko-en-translator | 한↔영 양방향 번역 (기술 문서, 코드, i18n) |
| **유틸** | humanizer, jira, datadog-cli, excel2md + 3개 | AI 패턴 제거, 통합 |

### 에이전트 (48개)

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

### 훅 (13개)

| 훅 | 이벤트 | 역할 |
|----|--------|------|
| reconcile-conversations | SessionStart | JSONL 기준 Claude/Codex 누락 턴 자동 복구 |
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
| [v1.9.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v1.9.0) | 2026-03-24 | 아테나 CEO 코칭 + 파이프라인 확장 |
| [v1.8.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v1.8.0) | 2026-03-23 | 오답노트 + 성공 패턴 학습 |
| [v1.7.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v1.7.0) | 2026-03-21 | Orchestrator SQLite WAL + Minos |
| [v1.6.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v1.6.0) | 2026-03-18 | 디자인 + 비즈니스 + 스킬 베스트 프랙티스 |
| [v1.5.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v1.5.0) | 2026-03-09 | Closer + SEO Audit + 파이프라인 리팩토링 |
| [v1.4.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v1.4.0) | 2026-03-02 | Chronos + Argos + Memory Compact |
| [v1.3.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v1.3.0) | 2026-02-19 | 크로스 CLI: Codex + Gemini |
| [v1.2.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v1.2.0) | 2026-02-09 | Agent-Team + Zeus + QA 파이프라인 |
| [v1.1.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v1.1.0) | 2026-02-01 | Zephermine + Mnemo + Install |
| [v1.0.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v1.0.0) | 2026-01-29 | 최초 릴리즈 |

---

## 라이선스

MIT License

---

**마지막 업데이트:** 2026-03-23
