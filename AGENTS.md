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
|AI/LLM API 코딩|agents/ai-ml.md|
|React/Next.js|agents/react-best-practices.md,agents/react-useeffect-guidelines.md|
|Code Review|agents/code-review-checklist.md,skills/code-reviewer/SKILL.md|
|Docker Deploy|skills/docker-deploy/SKILL.md,skills/docker-deploy/templates/|
|Docker DB Backup|skills/docker-db-backup/SKILL.md|
|API Testing|agents/api-tester.md|
|Documentation|agents/documentation.md,agents/writing-guidelines.md|
|FastAPI|agents/python-fastapi-guidelines.md|
|Spring Boot|agents/backend-spring.md,agents/fullstack-coding-standards.md|
|ASP.NET Core|agents/backend-dotnet.md,skills/dotnet-coding-standards/SKILL.md|
|WPF Desktop|agents/desktop-wpf.md,skills/wpf-coding-standards/SKILL.md|
|Fullstack Standards|agents/fullstack-coding-standards.md,skills/fullstack-coding-standards/SKILL.md|
|Database Design|agents/database-schema-designer.md,skills/database-schema-designer/SKILL.md|
|Database (MySQL)|agents/database-mysql.md|
|Database (PostgreSQL/Supabase)|agents/database-postgresql.md,skills/supabase-postgres-best-practices/SKILL.md|
|Migration|agents/migration-helper.md,agents/explore-agent.md|
|Naming|agents/naming-conventions.md|
|Full Workflow|agents/fullstack-development-workflow.md|
|Architecture|agents/architect.md|
|SPEC Interview|agents/spec-interviewer.md|
|Security Review|agents/security-reviewer.md|
|Web Preview + 디자인 토큰|agents/web-preview-guide.md,skills/design-system-starter/SKILL.md|
|Stitch UI|agents/stitch-developer.md,skills/stitch-design-md/SKILL.md|
|Agent Teams (Opus 4.6 병렬 실행)|skills/agent-team/SKILL.md|
|Codex Multi-Agent Team|skills/agent-team-codex/SKILL.md|

### Recommended Workflows

|시나리오|체이닝 순서|
|---|---|
|새 프로젝트 (풀코스)|zephermine → architect → agent-team → qpassenger → docker-deploy|
|전자동 (제우스)|zeus — 한 줄 설명만으로 설계→구현→테스트 완전 자동|
|기능 추가|zephermine → agent-team/수동 구현 → qpassenger|
|데이터 설계|domain expert → database-schema-designer → database-mysql/postgresql|
|UI 와이어프레임|ascii-ui-mockup-generator → ui-ux-designer → stitch-developer|
|UI 디자인 → 구현|stitch-enhance-prompt → stitch-loop → stitch-react → frontend-react|
|코드 리뷰 종합|code-reviewer → security-reviewer → reducing-entropy|
|리팩토링|explore-agent → reducing-entropy → code-reviewer|
|보안 감사|security-reviewer → code-review-checklist|
|UI/UX 품질 점검|ui-ux-auditor → ui-ux-designer (필요 시 디자인 조언)|
|QA 자동화|qpassenger (시나리오 자동 생성 → Playwright → Healer)|
|반복 수정 루프|auto-continue-loop (이슈 탐색 → 수정 → 검증 → 다음, 자동 반복)|
|다이어그램 기반 구현 검증|flow-verifier plan → 구현 → flow-verifier verify (코드 흐름 ↔ 다이어그램 대조)|

> 상세 가이드: [docs/workflow-guide.md](docs/workflow-guide.md)

---

## Core Rules (Always Apply)

|Rule|Limit|Action|
|---|---|---|
|File size|≤500 lines|Split into modules|
|Function size|≤50 lines|Extract helper functions|
|Security|OWASP Top 10|Check SQL injection, XSS, CSRF|
|Type safety|Required|Add type hints (Python) / TypeScript|
|DRY principle|No duplication|Extract reusable components|

---

## Cross-CLI Compatibility

- Claude Code에서 제공하는 skills, agents, hooks, MCP 기능은 Codex에서도 동일 기능 parity를 목표로 유지합니다.
- 사용자 호출명은 CLI 간에 동일하게 유지합니다. Claude에서 `/seo-audit`, `workpm`, `agent-team`으로 호출되면 Codex에서도 같은 이름으로 접근 가능해야 합니다.
- 내부 구현은 CLI별 실행 모델 차이를 반영해 달라질 수 있지만, 사용자 인터페이스와 핵심 결과는 맞춰야 합니다.
- 단순 파일 복사만으로 parity를 판단하지 말고, 전역 설치본에서 실제로 동작하는지까지 검증합니다.
- 우선 고정 호출명: `/zephermine`(젭마인), `/zeus`(제우스), `workpm`, `/chronos`(크로노스), `/qpassenger`(큐패신저), `/agent-team`(대니즈팀)

---

### Web Preview Mode Development Guide

웹 프리뷰 모드(채팅 모드 + dev server + PreviewPanel)에서는 **디자인 DNA(토큰) → Frontend → Backend** 순서를 따릅니다.

|Phase|핵심|
|---|---|
|Phase 0: Design DNA|디자인 방향성 → 레퍼런스 수집 → shadcn/ui 호환 토큰 생성 → 검증 (WCAG AA)|
|Phase 1: Frontend → Backend|토큰 기반 UI 구현 → 인터랙션 → API → 에러 처리 (프리뷰 패널 실시간 확인)|
|Phase 2: Pre-Delivery|접근성, 반응형, 아이콘, hover/focus 상태 최종 검증|

> **상세 가이드**: [agents/web-preview-guide.md](agents/web-preview-guide.md)

---

## Repository Overview

A comprehensive collection of skills and agents for Claude Code and other AI coding agents. Extends agent capabilities across development, documentation, planning, and professional workflows.

## Available Resources

### Skills (91개)

| 카테고리 | 스킬 | 설명 |
|----------|------|------|
| 🤖 AI Tools | codex, gemini, multi-ai-orchestration, orchestrator, workpm (다이달로스), workpm-mcp, pmworker, agent-team, agent-team-codex | 외부 AI 모델 연동 + 멀티 AI 오케스트레이션 + 다이달로스(현장감독) PM + 네이티브 Agent Teams (Opus 4.6) + Codex Multi-Agent |
| 🔮 Meta | agent-md-refactor, command-creator, plugin-forge, skill-judge, find-skills, manage-skills, project-gotchas, verify-implementation | 플러그인/스킬 생성/검색/검증 + 오답노트 자동 관리 |
| 📝 Documentation | api-handoff, crafting-effective-readmes, draw-io, excalidraw, marp-slide, mermaid-diagrams, writing-clearly-and-concisely | 문서/다이어그램 |
| 📖 Learning | explain | 코드 설명 (비유 + Mermaid 다이어그램) |
| 🎨 Frontend | design-plan (아프로디테), design-system-starter, mui, openapi-to-typescript, react-dev, vercel-react-best-practices, stitch-design-md, stitch-enhance-prompt, stitch-loop, stitch-react, seo-audit, ui-ux-auditor | 디자인 오케스트레이터 + React/TypeScript/디자인/Stitch UI 생성 + SEO+AEO+GEO 10영역 감사 + UI/UX 8영역 감사 |
| 🛠️ Development | database-schema-designer, dependency-updater, docker-deploy, docker-db-backup, fullstack-coding-standards, dotnet-coding-standards, wpf-coding-standards, naming-analyzer, python-backend-fastapi, reducing-entropy | 개발 도구 |
| 🎯 Planning | game-changing-features, zeus (제우스), zephermine (젭마인), ship-learn-next | 계획/요구사항 |
| 👔 Professional | daily-meeting-update, workplace-conversations, professional-communication | 비즈니스 커뮤니케이션 |
| 🧪 Testing | code-reviewer, qa-test-planner, qpassenger, auto-continue-loop, flow-verifier, argos (아르고스), final-inspection (클로저) | 테스트/리뷰/자동 수정 루프/플로우 검증/감리(준공검사)/최종 점검+산출물 |
| 📦 Git | commit-work, release-notes | Git 워크플로우 & 릴리즈 노트 자동화 (버전+CHANGELOG+태그) |
| 💰 Estimation | estimate | 개발 견적서 자동 생성 (비용 그룹별 공수 산정 → 엑셀 출력) |
| 📈 Business | biz-strategy (헤르메스), ceo (아테나), okr | 사업성 검토, CEO 코칭 (Go/No-Go), OKR 목표 관리 |
| 🎬 Media | video-maker | Remotion 기반 React 코드 영상 제작 (제품 소개, 데모, SNS 숏폼) |
| 🔧 Utilities | datadog-cli, domain-name-brainstormer, humanizer, jira, meme-factory, ppt-generator, web-design-guidelines, web-to-markdown | 유틸리티 |
| 📊 Research | reddit-researcher | Reddit 시장 조사 + 리드 스코어링 + Pain Point 분류 |
| 🧠 Memory/Session | mnemo, memory-compact | 기억 시스템 (대화 저장 + 태깅 + 검색 + MEMORY.md + 세션 핸드오프) + 메모리 크기 점검 및 압축 |

### Agents (42개)

| 카테고리 | 에이전트 | 설명 |
|----------|----------|------|
| **Workflow** | fullstack-development-workflow | 풀스택 개발 종합 워크플로우 |
| | spec-interviewer | SPEC.md 심층 인터뷰 |
| | architect | 시스템 아키텍처 설계, 기술 스택 평가, ADR 작성 |
| **Guidelines (Passive)** | react-best-practices | React/Next.js 최적화 규칙 (항상 적용) |
| | react-useeffect-guidelines | useEffect 베스트 프랙티스 (항상 적용) |
| | python-fastapi-guidelines | FastAPI 모범 사례 (항상 적용) |
| | writing-guidelines | 명확한 글쓰기 규칙 (항상 적용) |
| | humanizer-guidelines | AI 글쓰기 패턴 제거 (항상 적용) |
| | code-review-checklist | 코드 리뷰 체크리스트 (항상 적용) |
| | naming-conventions | 네이밍 컨벤션 (항상 적용) |
| | reducing-entropy | 코드베이스 최소화 철학 |
| | web-preview-guide | 웹 프리뷰 모드 개발 가이드 (디자인 DNA → Frontend → Backend) |
| | fullstack-coding-standards | 풀스택 코딩 표준 (백엔드 계층, 프론트 API, DB 연동) |
| **Full Stack** | frontend-react | React/TypeScript 프론트엔드 전문가 |
| | backend-spring | Spring Boot 백엔드 전문가 |
| | backend-dotnet | ASP.NET Core 백엔드 전문가 (Clean Architecture, EF Core) |
| | desktop-wpf | WPF 데스크톱 전문가 (MVVM, 스레딩, 메모리 관리, GPU 렌더링) |
| | database-schema-designer | DB 스키마 설계 전문가 (DB-First, ERD, DDL) |
| | database-mysql | MySQL 데이터베이스 전문가 |
| | database-postgresql | PostgreSQL/Supabase 데이터베이스 전문가 |
| **AI/ML** | ai-ml | AI/ML 통합 + LLM API 최신 모델/SDK 가이드 (OpenAI, Anthropic, Gemini, Ollama) |
| **API** | api-tester | API 엔드포인트 테스트 |
| | api-comparator | API 호환성 비교 검증 |
| **QA** | qa-engineer | 테스트 전략 및 품질 검증 |
| | qa-writer | 테스트 시나리오/케이스 작성 |
| | code-reviewer | 코드 품질/보안/성능 리뷰 |
| **Documentation** | documentation | PRD, API 문서, 변경로그 작성 |
| | mermaid-diagram-specialist | 플로우차트, 시퀀스 다이어그램, ERD 생성 |
| **Design** | ascii-ui-mockup-generator | UI 개념을 ASCII 목업으로 시각화 |
| | ui-ux-designer | 연구 기반 UI/UX 디자인 피드백 |
| | stitch-developer | Stitch MCP UI/웹사이트 생성 전문가 |
| **Security** | security-reviewer | 보안 취약점 전문 분석 (8대 카테고리: 인증, 입력검증, 데이터보안, 의존성, Rate Limit, 파일업로드, Prompt Injection, 정보노출) |
| **Debugging** | debugger | 체계적 근본원인 분석 (증상수집→가설→검증→수정) |
| **Performance** | performance-engineer | 풀스택 성능 최적화 (N+1, 메모리릭, Core Web Vitals, 부하테스트) |
| **TDD** | tdd-coach | Red-Green-Refactor 사이클 강제, 테스트 우선 개발 |
| **Language** | typescript-spec | TypeScript 고급 타입 시스템 (제네릭, 조건부, 매핑 타입) |
| | python-spec | Python 3.12+ 모던 생태계 (async, uv, ruff, pydantic) |
| **Writing** | writing-specialist | 글쓰기 통합 전문가 (사업문서, 학술, 이메일, AI패턴제거) |
| **Migration** | migration-helper | 레거시→모던 마이그레이션 가이드 |
| | explore-agent | 레거시 코드 분석 |
| **Planning** | feature-tracker | 기능 목록 및 진행 상황 관리 |
| **General** | general-purpose | 복잡한 다단계 작업용 기본 에이전트 |
| | codebase-pattern-finder | 유사 구현 및 패턴 탐색 |
| | chronos-worker | auto-continue-loop용 Gemini 로컬 루프 에이전트 |

## Creating a New Skill

### Directory Structure

```
skills/
  {skill-name}/           # kebab-case directory name
    SKILL.md              # Required: skill definition
    scripts/              # Required: executable scripts
      {script-name}.sh    # Bash scripts (preferred)
  {skill-name}.zip        # Required: packaged for distribution
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
bash /mnt/skills/user/{skill-name}/scripts/{script}.sh [args]
```

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

- **Keep SKILL.md under 500 lines** — put detailed reference material in separate files
- **Write specific descriptions** — helps the agent know exactly when to activate the skill
- **Use progressive disclosure** — reference supporting files that get read only when needed
- **Prefer scripts over inline code** — script execution doesn't consume context (only output does)
- **File references work one level deep** — link directly from SKILL.md to supporting files

### Script Requirements

- Use `#!/bin/bash` shebang
- Use `set -e` for fail-fast behavior
- Write status messages to stderr: `echo "Message" >&2`
- Write machine-readable output (JSON) to stdout
- Include a cleanup trap for temp files
- Reference the script path as `/mnt/skills/user/{skill-name}/scripts/{script}.sh`

### Creating the Zip Package

After creating or updating a skill:

```bash
cd skills
zip -r {skill-name}.zip {skill-name}/
```

### End-User Installation

Document these two installation methods for users:

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
|User-triggered workflows|Skills|Explicit invocation (e.g., `/docker-deploy`)|
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
|validate-code.sh|PostToolUse|*.py, *.ts, *.tsx, *.java 수정|500줄 제한, 함수 크기, 보안 검사|
|check-new-file.sh|PreToolUse|새 파일 생성|reducing-entropy 확인, 유사 파일 경고|
|validate-docs.sh|PostToolUse|*.md 작성|AI 글쓰기 패턴 검출|
|protect-files.sh|PreToolUse|민감 파일 수정|.env, credentials 보호|
|format-code.sh|PostToolUse|코드 수정|자동 포맷팅 (Python/TS/JS/Java/CSS)|
|validate-api.sh|PostToolUse|API 파일 수정|구문/타입 검사|
|save-conversation.sh|UserPromptSubmit|모든 입력|사용자 입력을 대화 파일에 저장|
|save-response.sh|Stop|세션 종료|Assistant 응답을 대화 파일에 저장|
|orchestrator-detector.js|UserPromptSubmit|workpm/pmworker 입력|PM/Worker 모드 감지|
|loop-stop.sh|Stop|Chronos 루프 활성 시|세션 종료 가로채서 프롬프트 재투입 (자동 반복)|
|ddingdong-noti.sh|Stop|세션 종료|OS 네이티브 알림 (Windows BurntToast, macOS osascript, Linux notify-send)|

### 3-Layer Architecture

```
Layer 1: AGENTS.md (Passive Guidelines)
  → 핵심 규칙이 항상 컨텍스트에 존재
  → AI가 처음부터 좋은 코드 작성

Layer 2: Hooks (Automatic Enforcement)
  → 규칙 위반 자동 감지
  → 즉시 피드백

Layer 3: Skills (On-demand Analysis)
  → 사용자 요청 시 상세 분석
  → /review, /naming-analyzer 등
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
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": ["bash hooks/validate-code.sh"]
      },
      {
        "matcher": "Write",
        "hooks": ["bash hooks/validate-docs.sh"]
      }
    ]
  }
}
```

<!-- CODEMAP_RULES_START -->

## Code Map (자동 생성)

> 이 섹션은 TermSnap CodeMapService가 자동 관리합니다. 수동 편집하지 마세요.

코드 검색 시 `codemap/index.md`를 먼저 참조하세요.
- `codemap/index.md` — 전체 파일 카테고리 요약
- `codemap/services.md` — 서비스 클래스/메서드 목록
- `codemap/viewmodels.md` — ViewModel 클래스/메서드 목록
- `codemap/views.md` — WPF View/Window/Panel 목록
- `codemap/webclient.md` — React 컴포넌트/훅/유틸 목록
- 기타 카테고리는 `codemap/index.md`에서 확인

<!-- CODEMAP_RULES_END -->
