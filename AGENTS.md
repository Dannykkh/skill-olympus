# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Cursor, Copilot, etc.) when working with code in this repository.

---

## [Docs Index]|root: ./

|IMPORTANT: Prefer retrieval-led reasoning over pre-training knowledge
|skills/:{ai-tools,meta,documentation,frontend,development,planning,professional,testing,git,utilities}
|agents/:{fullstack,ai-ml,api,qa,docs,design,migration,planning,communication,general}
|commands/:{todos,codex,email,sync,pr,generate,migrate,review,test,docs,changelog,prd}

### Quick Retrieval Paths

|Task|Read First|
|---|---|
|React/Next.js|agents/react-best-practices.md,agents/react-useeffect-guidelines.md|
|Code Review|agents/code-review-checklist.md,skills/code-reviewer/SKILL.md|
|Docker Deploy|skills/docker-deploy/SKILL.md,skills/docker-deploy/templates/|
|API Testing|agents/api-tester.md|
|Documentation|agents/documentation.md,agents/writing-guidelines.md|
|FastAPI|agents/python-fastapi-guidelines.md|
|Spring Boot|agents/backend-spring.md,agents/fullstack-coding-standards.md|
|Fullstack Standards|agents/fullstack-coding-standards.md,skills/fullstack-coding-standards/SKILL.md|
|Database|agents/database-mysql.md|
|Migration|agents/migration-helper.md,agents/explore-agent.md|
|Naming|agents/naming-conventions.md|
|Full Workflow|agents/fullstack-development-workflow.md|
|SPEC Interview|agents/spec-interviewer.md|
|Security Review|agents/security-reviewer.md|
|Stitch UI|agents/stitch-developer.md,skills/stitch-design-md/SKILL.md|

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

## Repository Overview

A comprehensive collection of skills, agents, and commands for Claude Code and other AI coding agents. Extends agent capabilities across development, documentation, planning, and professional workflows.

## Available Resources

### Skills (56개)

| 카테고리 | 스킬 | 설명 |
|----------|------|------|
| 🤖 AI Tools | codex, gemini, perplexity, multi-ai-orchestration, orchestrator | 외부 AI 모델 연동 + 멀티 AI 오케스트레이션 |
| 🔮 Meta | agent-md-refactor, command-creator, plugin-forge, skill-judge, find-skills | 플러그인/스킬 생성/검색 도구 |
| 📝 Documentation | api-handoff, crafting-effective-readmes, draw-io, excalidraw, marp-slide, mermaid-diagrams, writing-clearly-and-concisely | 문서/다이어그램 |
| 📖 Learning | explain | 코드 설명 (비유 + Mermaid 다이어그램) |
| 🎨 Frontend | design-system-starter, mui, openapi-to-typescript, react-dev, react-useeffect, vercel-react-best-practices, stitch-design-md, stitch-enhance-prompt, stitch-loop, stitch-react | React/TypeScript/디자인/Stitch UI 생성 |
| 🛠️ Development | database-schema-designer, dependency-updater, docker-deploy, fullstack-coding-standards, naming-analyzer, python-backend-fastapi, reducing-entropy | 개발 도구 |
| 🎯 Planning | game-changing-features, zephermine, requirements-clarity, ship-learn-next | 계획/요구사항 |
| 👔 Professional | daily-meeting-update, difficult-workplace-conversations, feedback-mastery, professional-communication | 비즈니스 커뮤니케이션 |
| 🧪 Testing | code-reviewer, qa-test-planner | 테스트/리뷰 |
| 📦 Git | commit-work | Git 워크플로우 |
| 🔧 Utilities | datadog-cli, domain-name-brainstormer, humanizer, jira, meme-factory, ppt-generator, web-design-guidelines, web-to-markdown | 유틸리티 |
| 🧠 Memory | mnemo | 기억 시스템 (대화 저장 + 태깅 + 검색 + MEMORY.md + 세션 핸드오프) |

### Agents (32개)

| 카테고리 | 에이전트 | 설명 |
|----------|----------|------|
| **Workflow** | fullstack-development-workflow | 풀스택 개발 종합 워크플로우 |
| | spec-interviewer | SPEC.md 심층 인터뷰 |
| **Guidelines (Passive)** | react-best-practices | React/Next.js 최적화 규칙 (항상 적용) |
| | react-useeffect-guidelines | useEffect 베스트 프랙티스 (항상 적용) |
| | python-fastapi-guidelines | FastAPI 모범 사례 (항상 적용) |
| | writing-guidelines | 명확한 글쓰기 규칙 (항상 적용) |
| | humanizer-guidelines | AI 글쓰기 패턴 제거 (항상 적용) |
| | code-review-checklist | 코드 리뷰 체크리스트 (항상 적용) |
| | naming-conventions | 네이밍 컨벤션 (항상 적용) |
| | reducing-entropy | 코드베이스 최소화 철학 |
| | fullstack-coding-standards | 풀스택 코딩 표준 (백엔드 계층, 프론트 API, DB 연동) |
| **Full Stack** | frontend-react | React/TypeScript 프론트엔드 전문가 |
| | backend-spring | Spring Boot 백엔드 전문가 |
| | database-mysql | MySQL 데이터베이스 전문가 |
| **AI/ML** | ai-ml | AI/ML 통합 전문가 |
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
| **Security** | security-reviewer | 보안 취약점 전문 분석 (OWASP Top 10) |
| **Migration** | migration-helper | 레거시→모던 마이그레이션 가이드 |
| | explore-agent | 레거시 코드 분석 |
| **Planning** | feature-tracker | 기능 목록 및 진행 상황 관리 |
| **Communication** | communication-excellence-coach | 이메일 개선, 톤 조정, 롤플레이 |
| **General** | general-purpose | 복잡한 다단계 작업용 기본 에이전트 |
| | codebase-pattern-finder | 유사 구현 및 패턴 탐색 |

### Commands (18개)

| 커맨드 | 설명 |
|--------|------|
| `/check-todos` | TODO 항목 검토 |
| `/codex-plan` | Codex로 구현 계획 생성 |
| `/compose-email` | 전문적인 이메일 작성 |
| `/daily-sync` | 일일 동기화 및 상태 확인 |
| `/explain-changes-mental-model` | 변경사항 멘탈 모델 설명 |
| `/explain-pr-changes` | PR 변경사항 요약 |
| `/generate` | 코드 템플릿 생성 |
| `/migrate` | 마이그레이션 작업 |
| `/review` | 코드 리뷰 수행 |
| `/sync-branch` | 브랜치 동기화 |
| `/sync-skills-readme` | README 스킬 목록 동기화 |
| `/test` | 테스트 실행 및 커버리지 |
| `/update-docs` | 문서 업데이트 |
| `/viral-tweet` | 바이럴 트윗 생성 |
| `/write-api-docs` | API 문서 생성 |
| `/write-changelog` | 변경로그 자동 생성 |
| `/write-prd` | PRD 문서 작성 |
| `/smart-setup` | 기술 스택 자동 감지 후 리소스 추천/설치 |

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
|format-code.sh|PostToolUse|코드 수정|자동 포맷팅|
|validate-api.sh|PostToolUse|API 파일 수정|구문/타입 검사|

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
