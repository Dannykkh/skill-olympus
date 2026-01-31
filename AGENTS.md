# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Cursor, Copilot, etc.) when working with code in this repository.

## Repository Overview

A comprehensive collection of skills, agents, and commands for Claude Code and other AI coding agents. Extends agent capabilities across development, documentation, planning, and professional workflows.

## Available Resources

### Skills (48개)

| 카테고리 | 스킬 | 설명 |
|----------|------|------|
| 🤖 AI Tools | codex, gemini, perplexity | 외부 AI 모델 연동 |
| 🔮 Meta | agent-md-refactor, command-creator, plugin-forge, skill-judge | 플러그인/스킬 생성 도구 |
| 📝 Documentation | backend-to-frontend-handoff-docs, c4-architecture, crafting-effective-readmes, draw-io, excalidraw, frontend-to-backend-requirements, marp-slide, mermaid-diagrams, writing-clearly-and-concisely | 문서/다이어그램 |
| 🎨 Frontend | design-system-starter, mui, openapi-to-typescript, react-dev, react-useeffect, vercel-react-best-practices | React/TypeScript/디자인 |
| 🛠️ Development | database-schema-designer, dependency-updater, docker-deploy, naming-analyzer, python-backend-fastapi, reducing-entropy | 개발 도구 |
| 🎯 Planning | game-changing-features, gepetto, requirements-clarity, ship-learn-next | 계획/요구사항 |
| 👔 Professional | daily-meeting-update, difficult-workplace-conversations, feedback-mastery, professional-communication | 비즈니스 커뮤니케이션 |
| 🧪 Testing | code-reviewer, qa-test-planner | 테스트/리뷰 |
| 📦 Git | commit-work | Git 워크플로우 |
| 🔧 Utilities | datadog-cli, domain-name-brainstormer, humanizer, jira, meme-factory, ppt-generator, session-handoff, web-design-guidelines, web-to-markdown | 유틸리티 |

### Agents (19개)

| 에이전트 | 설명 |
|----------|------|
| ai-ml | AI/ML 통합 전문가 |
| api-comparator | API 호환성 비교 검증 |
| api-tester | API 엔드포인트 테스트 |
| ascii-ui-mockup-generator | UI 개념을 ASCII 목업으로 시각화 |
| backend-spring | Spring Boot 백엔드 전문가 |
| codebase-pattern-finder | 유사 구현 및 패턴 탐색 |
| code-reviewer | 코드 품질/보안/성능 리뷰 |
| communication-excellence-coach | 이메일 개선, 톤 조정, 롤플레이 |
| database-mysql | MySQL 데이터베이스 전문가 |
| documentation | PRD, API 문서, 변경로그 작성 |
| explore-agent | 레거시 코드 분석 |
| feature-tracker | 기능 목록 및 진행 상황 관리 |
| frontend-react | React/TypeScript 프론트엔드 전문가 |
| general-purpose | 복잡한 다단계 작업용 기본 에이전트 |
| mermaid-diagram-specialist | 플로우차트, 시퀀스 다이어그램, ERD 생성 |
| migration-helper | 레거시→모던 마이그레이션 가이드 |
| qa-engineer | 테스트 전략 및 품질 검증 |
| qa-writer | 테스트 시나리오/케이스 작성 |
| ui-ux-designer | 연구 기반 UI/UX 디자인 피드백 |

### Commands (17개)

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
