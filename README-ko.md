# Claude Code 커스터마이징

Claude Code를 위한 커스텀 Skills, Agents, Commands, Hooks, MCP 서버 모음입니다.

**[English Version](README.md)**

---

## 왜 이 프로젝트를 만들었나?

Claude Code를 사용하면서 반복적으로 겪는 문제들이 있었습니다:
- 새 프로젝트마다 같은 설정을 반복
- 유용한 외부 스킬과 플러그인을 매번 검색
- 비슷한 에이전트 프롬프트를 반복 작성

이 저장소는 다음 문제들을 해결합니다:
1. **설정 중앙화** - 모든 커스터마이징을 한 곳에서 관리
2. **외부 리소스 문서화** - 유용한 스킬, 플러그인, MCP 서버 큐레이션
3. **프로젝트 유형별 템플릿** - 기술 스택별 빠른 설정 가이드

---

## 빠른 시작

> **5분 빠른 시작?** **[빠른 시작 가이드](docs/quickstart.md)**에서 핵심 기능을 빠르게 시작하세요.
>
> **전체 파이프라인?** **[워크플로우 가이드](docs/workflow-guide.md)** — 설계 → 구현 → QA 엔드투엔드.
>
> **새 환경 설정?** [SETUP.md](SETUP.md)에서 프로젝트 유형별 상세 설치 가이드를 확인하세요.

### 프로젝트 유형별 설치

| 프로젝트 유형 | 설치 명령 |
|-------------|---------|
| **WPF / WinForms** | `npx add-skill Aaronontheweb/claude-code-dotnet -a claude-code` |
| **React / Next.js** | `npx add-skill vercel-labs/agent-skills -a claude-code` |
| **Node.js / NestJS** | `npx add-skill SpillwaveSolutions/mastering-typescript-skill -a claude-code` |
| **결제 연동** | `claude mcp add tosspayments -- npx -y @tosspayments/integration-guide-mcp@latest` |

### 전체 설치

```bash
# Windows (복사 모드)
install.bat

# Windows (심볼릭 링크 모드 - git pull로 자동 업데이트)
install-link.bat          # 또는: install.bat --link
install-unlink.bat        # 링크 제거: install.bat --unlink

# Linux/Mac (복사 모드)
chmod +x install.sh && ./install.sh

# Linux/Mac (심볼릭 링크 모드)
./install.sh --link
./install.sh --unlink     # 링크 제거
```

> **링크 모드**는 파일 복사 대신 심볼릭 링크(Windows: Junction, Linux/Mac: symlink)를 생성합니다. `git pull`만 하면 변경사항이 즉시 반영되어 설치 스크립트를 다시 실행할 필요가 없습니다.
>
> 설치 스크립트는 **6가지 구성요소를 모두 글로벌로 설치**합니다:
> - Skills, Agents, Commands, Hooks (파일)
> - Mnemo 훅 (`save-conversation`, `save-response`)
> - `~/.claude/settings.json` (훅 설정)
> - `~/.claude/CLAUDE.md` (메모리 규칙 - 응답 태그, 대화 검색)

---

## 핵심 시스템

이 프로젝트의 3가지 핵심 시스템:

### Zephermine - SPEC 심층 인터뷰 & 검증

대화를 통해 완전한 스펙 문서를 생성하는 심층 인터뷰 시스템.

| 기능 | 설명 |
|------|------|
| **19단계 인터뷰** | A~G 카테고리: 목표, 디자인 비전, 기능, 기술, 일정, 리스크, 검증 |
| **5 Whys 기법** | 요구사항 뒤의 숨겨진 동기 발굴 |
| **5개 전문가 에이전트 팀 리뷰** | UX, 아키텍처, Red Team(악마의 변호인), 도메인 프로세스, 도메인 기술 에이전트가 병렬 분석 |
| **쉬운 말 규칙** | 전문용어에 괄호 풀이 필수 (비개발자도 이해 가능) |
| **자동 검증** | 서브에이전트가 스펙 완성도 & 품질 검증 |

```
/zephermine (젭마인) → 인터뷰 → SPEC.md → 검증 → architect → 구현
```

> **[스킬 상세](skills/zephermine/SKILL.md)**

### Mnemo - 세션 간 장기기억

세션 간 컨텍스트 유지를 위한 파일 기반 메모리 시스템. DB 없음, 훅에서 AI 호출 없음.

| 구성요소 | 역할 |
|---------|------|
| `MEMORY.md` | 의미기억 - 컨텍스트 트리 (architecture/, patterns/, gotchas/) |
| `conversations/*.md` | 일화기억 - `#tags:` 포함 대화 로그 |
| `save-conversation` 훅 | 사용자 입력 자동 저장 |
| `save-response` 훅 | Assistant 응답 + 키워드 자동 저장 |

```
세션 A: 작업 → #tags 저장 → /wrap-up → MEMORY.md 업데이트
세션 B: MEMORY.md 자동 로드 → 과거 검색 → 컨텍스트 복원
```

> **[스킬 상세](skills/mnemo/SKILL.md)** | **[시스템 구조](skills/mnemo/docs/memory-system.md)**

### Orchestrator - Multi-AI 병렬 실행

PM이 태스크를 분배하고, Worker(Claude + Codex + Gemini)가 파일 락과 함께 병렬 수행.

| 구성요소 | 설명 |
|---------|------|
| MCP 서버 | 태스크 큐, 파일 락, 의존성 해소 |
| `workpm` | PM 모드 - 프로젝트 분석, 태스크 분해, AI 배정 |
| `pmworker` | Worker 모드 - 태스크 담당, 파일 락, 실행, 보고 |

```
터미널 1 (PM):     workpm → 분석 → 태스크 3개 생성
터미널 2 (Worker): pmworker → task-1 담당 → 실행 → 완료
터미널 3 (Worker): pmworker → task-2 담당 → 실행 → 완료
```

```bash
# 프로젝트에 설치 (프로젝트별, MCP가 프로젝트 루트 필요)
node skills/orchestrator/install.js <대상-프로젝트-경로>
```

> **[스킬 상세](skills/orchestrator/SKILL.md)** | **[전체 가이드](skills/orchestrator/docs/orchestrator-guide.md)**

---

## 포함된 내용

### 커스텀 스킬 (57개)

| 카테고리 | 스킬 | 설명 |
|----------|------|------|
| 🤖 **AI 도구** | codex, gemini, perplexity, multi-ai-orchestration, orchestrator, agent-team | 외부 AI 모델 연동 + 멀티 AI 오케스트레이션 + 네이티브 Agent Teams (Opus 4.6) |
| 🔮 **메타** | agent-md-refactor, command-creator, plugin-forge, skill-judge, find-skills | 플러그인/스킬 생성 도구 |
| 📝 **문서화** | mermaid-diagrams, marp-slide, draw-io, excalidraw, crafting-effective-readmes | 다이어그램 & 문서 |
| 🎨 **프론트엔드** | react-dev, vercel-react-best-practices, mui, design-system-starter, stitch-design-md, stitch-enhance-prompt, stitch-loop, stitch-react | React/TypeScript/디자인/Stitch UI 생성 |
| 🛠️ **개발** | docker-deploy, python-backend-fastapi, database-schema-designer, dependency-updater, fullstack-coding-standards | 개발 도구 & 배포 |
| 🎯 **계획** | zephermine (젭마인), game-changing-features, ship-learn-next | 계획 & 요구사항 (zephermine에 스펙 검증 포함) |
| 📖 **학습** | explain | 비유 기반 코드 설명 + Mermaid 다이어그램 |
| 👔 **비즈니스** | professional-communication, workplace-conversations | 비즈니스 커뮤니케이션 |
| 🧪 **테스트** | code-reviewer, api-tester, qa-test-planner, qa-until-pass | 코드 리뷰 & QA |
| 📦 **Git** | commit-work, git-deploy | Git 워크플로우 & 배포 |
| 🔧 **유틸리티** | humanizer, jira, datadog-cli, ppt-generator, excel2md, web-to-markdown, api-handoff | 유틸리티 |
| 🧠 **메모리** | mnemo | 통합 메모리 시스템 (대화 저장 + 태깅 + 검색 + MEMORY.md + 세션 핸드오프) |

> **전체 목록**: `skills/` 디렉토리 또는 [AGENTS.md](AGENTS.md) 참조

### 커스텀 에이전트 (34개)

| 카테고리 | 에이전트 | 설명 |
|----------|----------|------|
| **워크플로우** | fullstack-development-workflow, spec-interviewer, architect | 전체 개발 사이클 관리 + 아키텍처 설계 |
| **가이드라인** | react-best-practices, python-fastapi-guidelines, writing-guidelines, naming-conventions, code-review-checklist, humanizer-guidelines, react-useeffect-guidelines, reducing-entropy, fullstack-coding-standards | 패시브 규칙 (항상 적용) |
| **풀스택** | frontend-react, backend-spring, database-mysql, database-postgresql | React/Spring/MySQL/PostgreSQL 전문가 |
| **AI/ML** | ai-ml | LLM 통합, RAG 시스템 |
| **API** | api-tester, api-comparator | API 테스트 & 호환성 |
| **QA** | qa-engineer, qa-writer, code-reviewer | 테스트 & 코드 리뷰 |
| **문서화** | documentation, mermaid-diagram-specialist | 문서 & 다이어그램 |
| **디자인** | ascii-ui-mockup-generator, ui-ux-designer, stitch-developer | UI/UX 디자인 피드백 & Stitch UI 생성 |
| **보안** | security-reviewer | 보안 취약점 전문 분석 (OWASP Top 10) |
| **마이그레이션** | migration-helper, explore-agent | 레거시 현대화 |
| **계획** | feature-tracker | 기능 진행률 추적 |
| **커뮤니케이션** | communication-excellence-coach | 이메일 & 프레젠테이션 코칭 |
| **범용** | general-purpose, codebase-pattern-finder | 다목적 에이전트 |

> **전체 목록**: `agents/` 디렉토리 또는 [AGENTS.md](AGENTS.md) 참조

### 명령어 (17개)

| 명령어 | 설명 |
|--------|------|
| `/check-todos` | TODO 항목 검토 및 우선순위 분류 |
| `/codex-plan` | Codex로 구현 계획 생성 |
| `/compose-email` | 전문적인 이메일 작성 |
| `/daily-sync` | 일일 동기화 및 상태 확인 |
| `/explain-pr-changes` | PR 변경사항 요약 |
| `/generate` | 코드 템플릿 생성 |
| `/migrate` | 마이그레이션 작업 실행 |
| `/review` | 코드 리뷰 수행 |
| `/sync-branch` | 브랜치 동기화 |
| `/test` | 테스트 실행 및 커버리지 보고서 |
| `/update-docs` | 문서 파일 업데이트 |
| `/write-api-docs` | API 문서 자동 생성 |
| `/write-changelog` | Git 커밋 기반 Changelog 자동 생성 |
| `/write-prd` | PRD (제품 요구사항 문서) 작성 |
| `/smart-setup` | 기술 스택 자동 감지 후 리소스 추천/설치 |

> **전체 목록**: `commands/` 디렉토리 또는 [AGENTS.md](AGENTS.md) 참조

### 훅

| 훅 | 타이밍 | 설명 |
|----|--------|------|
| save-conversation.sh | UserPromptSubmit | 사용자 입력 저장 (Mnemo) |
| save-response.sh | Stop | Assistant 응답 + #tags 저장 (Mnemo) |
| orchestrator-detector.js | UserPromptSubmit | PM/Worker 모드 감지 |
| validate-code.sh | PostToolUse | 코드 검증 (500줄, 함수 크기, 보안) |
| check-new-file.sh | PreToolUse | 새 파일 생성 전 reducing-entropy 확인 |
| validate-docs.sh | PostToolUse | 마크다운 AI 글쓰기 패턴 검출 |
| protect-files.sh | PreToolUse | 중요 파일 수정 전 보호 검사 |
| format-code.sh | PostToolUse | 파일 수정 후 코드 포맷팅 (Python/TS/JS/Java/CSS) |
| validate-api.sh | PostToolUse | API 파일 수정 후 유효성 검사 |

### Mnemo & Orchestrator

> 위의 **[핵심 시스템](#핵심-시스템)** 섹션에서 상세 설명을 확인하세요.
>
> - **Mnemo**: 글로벌 install에 포함 (`install.bat`). [시스템 구조](skills/mnemo/docs/memory-system.md)
> - **Orchestrator**: 프로젝트별 설치 필요. [전체 가이드](skills/orchestrator/docs/orchestrator-guide.md)

---

## 외부 리소스 (권장)

> **[상세 문서 보기](docs/resources/)** - 각 리소스별 기능, 설치, 사용법, 장단점 정리

### 스킬 & 플러그인

| 리소스 | 설명 | 설치 | 문서 |
|--------|------|------|------|
| [everything-claude-code](https://github.com/affaan-m/everything-claude-code) | 해커톤 우승자 설정 (12 에이전트, 16 스킬) | `/plugin marketplace add affaan-m/everything-claude-code` | [상세](docs/resources/everything-claude-code.md) |
| [Vercel Agent Skills](https://github.com/vercel-labs/agent-skills) | React/Next.js 베스트 프랙티스 (45+ 규칙) | `npx add-skill vercel-labs/agent-skills -a claude-code` | [상세](docs/resources/vercel-agent-skills.md) |
| [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode) | 32개 에이전트, 40+ 스킬, 다중 에이전트 오케스트레이션 | `/plugin install oh-my-claudecode` | [상세](docs/resources/oh-my-claudecode.md) |
| [claude-code-dotnet](https://github.com/Aaronontheweb/claude-code-dotnet) | C#/WPF/MAUI/.NET 스킬 | `npx add-skill Aaronontheweb/claude-code-dotnet -a claude-code` | - |
| [mastering-typescript-skill](https://github.com/SpillwaveSolutions/mastering-typescript-skill) | 엔터프라이즈 TypeScript (NestJS, React 19) | `npx add-skill SpillwaveSolutions/mastering-typescript-skill -a claude-code` | - |
| [pg-aiguide](https://github.com/timescale/pg-aiguide) | PostgreSQL 베스트 프랙티스 | `claude plugin install pg-aiguide` | - |
| [skills.sh](https://skills.sh/) | 25K+ 스킬 디렉토리 (Vercel) | `npx skills add <owner/repo>` | [상세](docs/resources/skills-sh.md) |

### 외부 AI CLI 통합

| 리소스 | 설명 | 문서 |
|--------|------|------|
| **Codex CLI** | OpenAI Codex CLI (GPT-5.2) 통합 | [상세](docs/resources/codex-cli.md) |
| **Gemini CLI** | Google Gemini 3 Pro CLI 통합 | [상세](docs/resources/gemini-cli.md) |
| **Perplexity 스킬** | Perplexity AI 웹 검색 통합 | [상세](docs/resources/perplexity-skill.md) |
| **Humanizer 스킬** | AI 글쓰기 패턴 제거 (24개 패턴) | [상세](docs/resources/humanizer-skill.md) |

### Multi-LLM 통합

> **문제**: LLM은 학습 데이터 이후의 최신 모델/API 정보를 알지 못함
> **해결**: Context7 (라이브러리 문서) + PAL MCP (멀티 모델) 조합

| 리소스 | 타입 | 설명 | 설치 |
|--------|------|------|------|
| **[Context7](https://github.com/upstash/context7)** | MCP | 최신 라이브러리 문서 주입 (Next.js 15, React 19 등) | `claude mcp add context7 -- npx -y @upstash/context7-mcp` |
| **[PAL MCP](https://github.com/BeehiveInnovations/pal-mcp-server)** | MCP | Multi-Model: Gemini + OpenAI + Claude + 50+ 모델 | [GitHub README](https://github.com/BeehiveInnovations/pal-mcp-server) |
| [awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills) | Skills | 200+ 스킬 (Codex, Gemini CLI 호환) | `npx add-skill VoltAgent/awesome-agent-skills` |
| [antigravity-awesome-skills](https://github.com/sickn33/antigravity-awesome-skills) | Skills | 625+ 스킬 (Anthropic, OpenAI, Google 공식) | GitHub clone |
| [AI-research-SKILLs](https://github.com/Orchestra-Research/AI-research-SKILLs) | Skills | AI 연구/엔지니어링 전용 스킬 | GitHub clone |
| [claude-flow](https://github.com/ruvnet/claude-flow) | Agent | Multi-agent 스웜, LLM 간 자동 전환 | `npm install claude-flow` |

**Skill vs Agent 분류**:
- **Skills** (on-demand): codex, gemini, perplexity - 사용자 트리거로 외부 LLM 호출
- **Agents** (passive): 가이드라인, 모범 사례 - 항상 컨텍스트에 존재

### MCP 서버

| MCP | 설명 | 설치 | 문서 |
|-----|------|------|------|
| **[토스페이먼츠](https://toss.tech/article/tosspayments-mcp)** | 결제 연동 10분 완료 (PG업계 최초) | `claude mcp add tosspayments -- npx -y @tosspayments/integration-guide-mcp@latest` | [상세](docs/resources/toss-payments-mcp.md) |
| [Context7](https://github.com/upstash/context7) | 라이브러리 문서 검색 | `claude mcp add context7 -- npx -y @upstash/context7-mcp` | [상세](docs/resources/context7-mcp.md) |
| [Playwright](https://github.com/microsoft/playwright-mcp) | 브라우저 자동화 | `claude mcp add playwright -- npx -y @playwright/mcp@latest` | - |
| [Stitch](https://github.com/anthropics/stitch-mcp) | Google Stitch UI 디자인 | `npx -p stitch-mcp-auto stitch-mcp-auto-setup` | - |
| [GitHub](https://github.com/github/github-mcp-server) | GitHub API 접근 | `claude mcp add github -- npx -y @modelcontextprotocol/server-github` | - |

**무료 & 로컬 실행 (API 키 불필요):**

| MCP | 설명 | 설치 |
|-----|------|------|
| **[Office-PowerPoint-MCP](https://github.com/GongRzhe/Office-PowerPoint-MCP-Server)** | PPT 자동화 (32개 도구, 25개 템플릿) | `pip install office-powerpoint-mcp-server` |
| [mcp-pandoc](https://github.com/vivekVells/mcp-pandoc) | 문서 변환 (MD→PDF/DOCX) | `pip install mcp-pandoc` |
| [manim-mcp](https://github.com/abhiemj/manim-mcp-server) | 수학/교육 애니메이션 | Manim + 로컬 서버 |
| [blender-mcp](https://github.com/ahujasid/blender-mcp) | 3D 모델링 & 애니메이션 | Blender + 로컬 서버 |

---

## 프로젝트 구조

```
claude-code-customizations/
├── skills/                    # 커스텀 스킬 (57개)
│   ├── mnemo/                 # 🧠 메모리 시스템 (글로벌 설치)
│   ├── orchestrator/          # 🤖 Multi-AI 오케스트레이션 (프로젝트별)
│   ├── agent-md-refactor/
│   ├── api-handoff/
│   ├── api-tester/
│   ├── code-reviewer/
│   ├── codex/
│   ├── command-creator/
│   ├── commit-work/
│   ├── crafting-effective-readmes/
│   ├── daily-meeting-update/
│   ├── database-schema-designer/
│   ├── datadog-cli/
│   ├── dependency-updater/
│   ├── design-system-starter/
│   ├── docker-deploy/
│   ├── domain-name-brainstormer/
│   ├── draw-io/
│   ├── excalidraw/
│   ├── explain/
│   ├── find-skills/
│   ├── fullstack-coding-standards/
│   ├── game-changing-features/
│   ├── gemini/
│   ├── git-deploy/
│   ├── zephermine/
│   ├── humanizer/
│   ├── jira/
│   ├── marp-slide/
│   ├── meme-factory/
│   ├── mermaid-diagrams/
│   ├── mui/
│   ├── multi-ai-orchestration/
│   ├── naming-analyzer/
│   ├── openapi-to-typescript/
│   ├── perplexity/
│   ├── plugin-forge/
│   ├── ppt-generator/
│   ├── professional-communication/
│   ├── python-backend-fastapi/
│   ├── qa-test-planner/
│   ├── qa-until-pass/
│   ├── react-dev/
│   ├── reducing-entropy/
│   ├── ship-learn-next/
│   ├── skill-judge/
│   ├── vercel-react-best-practices/
│   ├── web-design-guidelines/
│   ├── web-to-markdown/
│   ├── workplace-conversations/
│   ├── stitch-design-md/
│   ├── stitch-enhance-prompt/
│   ├── stitch-loop/
│   ├── stitch-react/
│   ├── docx/
│   ├── pdf/
│   ├── nano-banana/
│   ├── semgrep-rule-creator/
│   ├── systematic-debugging/
│   ├── test-driven-development/
│   ├── wrangler/
│   └── writing-clearly-and-concisely/
├── agents/                    # 커스텀 서브에이전트 (32 + skills/*/agents/ 2 = 34개)
│   ├── architect.md
│   ├── ai-ml.md
│   ├── api-comparator.md
│   ├── api-tester.md
│   ├── ascii-ui-mockup-generator.md
│   ├── backend-spring.md
│   ├── codebase-pattern-finder.md
│   ├── code-review-checklist.md
│   ├── code-reviewer.md
│   ├── communication-excellence-coach.md
│   ├── database-mysql.md
│   ├── database-postgresql.md
│   ├── documentation.md
│   ├── explore-agent.md
│   ├── feature-tracker.md
│   ├── frontend-react.md
│   ├── general-purpose.md
│   ├── humanizer-guidelines.md
│   ├── mermaid-diagram-specialist.md
│   ├── migration-helper.md
│   ├── naming-conventions.md
│   ├── python-fastapi-guidelines.md
│   ├── qa-engineer.md
│   ├── qa-writer.md
│   ├── react-best-practices.md
│   ├── react-useeffect-guidelines.md
│   ├── reducing-entropy.md
│   ├── spec-interviewer.md
│   ├── security-reviewer.md
│   ├── stitch-developer.md
│   ├── ui-ux-designer.md
│   └── writing-guidelines.md
├── commands/                  # 슬래시 명령어 (17개)
│   ├── check-todos.md
│   ├── codex-plan.md
│   ├── compose-email.md
│   ├── daily-sync.md
│   ├── explain-changes-mental-model.md
│   ├── explain-pr-changes.md
│   ├── generate.md
│   ├── migrate.md
│   ├── review.md
│   ├── sync-branch.md
│   ├── sync-skills-readme.md
│   ├── test.md
│   ├── update-docs.md
│   ├── viral-tweet.md
│   ├── write-api-docs.md
│   ├── write-changelog.md
│   └── write-prd.md
├── hooks/                     # 글로벌 훅 (9개)
│   ├── save-conversation.sh/.ps1
│   ├── save-response.sh/.ps1
│   ├── orchestrator-detector.js
│   ├── check-new-file.sh/.ps1
│   ├── format-code.sh/.ps1
│   ├── protect-files.sh/.ps1
│   ├── validate-api.sh/.ps1
│   ├── validate-code.sh/.ps1
│   └── validate-docs.sh/.ps1
├── mcp-servers/               # MCP 서버 가이드
│   └── README.md
├── docs/                      # 문서
│   ├── quickstart.md
│   ├── workflow-guide.md      # 엔드투엔드 파이프라인 가이드
│   └── resources/
├── install.bat                # Windows 설치 (6단계, Mnemo 포함)
├── install.sh                 # Linux/Mac 설치 (6단계, Mnemo 포함)
├── install-hooks-config.js    # 훅 설정 헬퍼
├── install-claude-md.js       # CLAUDE.md 규칙 머지
├── SETUP.md                   # 전체 설정 가이드
└── README.md                  # 이 파일
```

---

## 설치 위치

| 항목 | 글로벌 위치 | 프로젝트 위치 |
|------|------------|--------------|
| Skills | `~/.claude/skills/` | `.claude/skills/` |
| Agents | `~/.claude/agents/` | `.claude/agents/` |
| Commands | `~/.claude/commands/` | `.claude/commands/` |
| Hooks | `~/.claude/hooks/` + `~/.claude/settings.json` | `.claude/hooks/` + `.claude/settings.json` |

- **글로벌**: 모든 프로젝트에서 사용 가능 (설치 스크립트가 모든 항목을 글로벌로 자동 설정)
- **프로젝트**: 해당 프로젝트에서만 사용

---

## 새 커스터마이징 추가하기

### 새 스킬 추가
```bash
mkdir skills/my-skill
# skills/my-skill/SKILL.md 파일 작성
```

### 새 에이전트 추가
```bash
# agents/my-agent.md 파일 작성
```

### 새 명령어 추가
```bash
# commands/my-command.md 파일 작성
```

---

## 참고 리소스

### 스킬 디렉토리

| 리소스 | 설명 | 링크 |
|--------|------|------|
| **skills.sh** | Vercel의 25K+ 스킬 디렉토리 (설치: `npx skills add <owner/repo>`) | [skills.sh](https://skills.sh/) |

**인기 스킬 (설치 수 기준):**
| 스킬 | 설치 수 | 설명 |
|------|--------|------|
| vercel-react-best-practices | 50.3K | React 개발 가이드 |
| web-design-guidelines | 38.2K | 웹 디자인 원칙 |
| remotion-best-practices | 34.4K | Remotion 비디오 프레임워크 |
| frontend-design | 15.3K | 프론트엔드 아키텍처 |
| supabase-postgres-best-practices | 4.4K | 데이터베이스 패턴 |

### 커뮤니티 프로젝트

| 프로젝트 | 설명 | 링크 |
|---------|------|------|
| awesome-claude-code-subagents | 100+ 전문 서브에이전트 | [GitHub](https://github.com/VoltAgent/awesome-claude-code-subagents) |
| awesome-claude-skills | Claude 스킬 큐레이션 | [GitHub](https://github.com/travisvn/awesome-claude-skills) |
| everything-claude-code | Anthropic 해커톤 우승자 설정 | [GitHub](https://github.com/affaan-m/everything-claude-code) |
| claude-code-showcase | 종합 설정 예제 | [GitHub](https://github.com/ChrisWiles/claude-code-showcase) |
| awesome-claude-code | Claude Code 리소스 큐레이션 | [GitHub](https://github.com/hesreallyhim/awesome-claude-code) |

---

## 참고 자료

> **[전체 참고 자료 목록](docs/references.md)** - 이 프로젝트 구축에 참고한 모든 GitHub 프로젝트, MCP 서버, 연구, 문서.

**주요 참고:**
- [softaworks/agent-toolkit](https://github.com/softaworks/agent-toolkit) - 세션 핸드오프 패턴 (mnemo에 통합됨)
- [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) - React 베스트 프랙티스
- [Vercel AGENTS.md 연구](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals) - 3-layer 아키텍처 기반
- [upstash/context7](https://github.com/upstash/context7) - 최신 라이브러리 문서 주입

---

## 라이선스

MIT License

---

**최종 업데이트:** 2026-02-11
