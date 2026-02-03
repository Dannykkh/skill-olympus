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
> 설치 스크립트는 **4가지 구성요소를 모두 글로벌로 설치**하고 (Skills, Agents, Commands, Hooks), `~/.claude/settings.json`에 훅 설정을 자동 등록합니다.

---

## 포함된 내용

### 커스텀 스킬 (52개)

| 카테고리 | 스킬 | 설명 |
|----------|------|------|
| 🤖 **AI 도구** | codex, gemini, perplexity, multi-ai-orchestration, orchestrator-pm, orchestrator-worker | 외부 AI 모델 연동 + 멀티 AI 오케스트레이션 (PM/Worker 모드) |
| 🔮 **메타** | agent-md-refactor, command-creator, plugin-forge, skill-judge, find-skills | 플러그인/스킬 생성 도구 |
| 📝 **문서화** | mermaid-diagrams, marp-slide, draw-io, excalidraw, crafting-effective-readmes | 다이어그램 & 문서 |
| 🎨 **프론트엔드** | react-dev, vercel-react-best-practices, mui, design-system-starter | React/TypeScript/디자인 |
| 🛠️ **개발** | docker-deploy, python-backend-fastapi, database-schema-designer, dependency-updater, fullstack-coding-standards | 개발 도구 & 배포 |
| 🎯 **계획** | gepetto, requirements-clarity, game-changing-features, ship-learn-next | 계획 & 요구사항 |
| 👔 **비즈니스** | professional-communication, workplace-conversations | 비즈니스 커뮤니케이션 |
| 🧪 **테스트** | code-reviewer, api-tester, qa-test-planner | 코드 리뷰 & QA |
| 📦 **Git** | commit-work | Git 워크플로우 |
| 🔧 **유틸리티** | humanizer, session-handoff, jira, datadog-cli, ppt-generator, web-to-markdown, api-handoff | 유틸리티 |
| 🧠 **메모리** | long-term-memory | 세션 메모리 관리 (MEMORY.md 자동 업데이트) |

> **전체 목록**: `skills/` 디렉토리 또는 [AGENTS.md](AGENTS.md) 참조

### 커스텀 에이전트 (30개)

| 카테고리 | 에이전트 | 설명 |
|----------|----------|------|
| **워크플로우** | fullstack-development-workflow, spec-interviewer | 전체 개발 사이클 관리 |
| **가이드라인** | react-best-practices, python-fastapi-guidelines, writing-guidelines, naming-conventions, code-review-checklist, humanizer-guidelines, react-useeffect-guidelines, reducing-entropy, fullstack-coding-standards | 패시브 규칙 (항상 적용) |
| **풀스택** | frontend-react, backend-spring, database-mysql | React/Spring/MySQL 전문가 |
| **AI/ML** | ai-ml | LLM 통합, RAG 시스템 |
| **API** | api-tester, api-comparator | API 테스트 & 호환성 |
| **QA** | qa-engineer, qa-writer, code-reviewer | 테스트 & 코드 리뷰 |
| **문서화** | documentation, mermaid-diagram-specialist | 문서 & 다이어그램 |
| **디자인** | ascii-ui-mockup-generator, ui-ux-designer | UI/UX 디자인 피드백 |
| **마이그레이션** | migration-helper, explore-agent | 레거시 현대화 |
| **계획** | feature-tracker | 기능 진행률 추적 |
| **커뮤니케이션** | communication-excellence-coach | 이메일 & 프레젠테이션 코칭 |
| **범용** | general-purpose, codebase-pattern-finder | 다목적 에이전트 |

> **전체 목록**: `agents/` 디렉토리 또는 [AGENTS.md](AGENTS.md) 참조

### 명령어 (18개)

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

### 훅 (8개)

| 훅 | 타이밍 | 설명 |
|----|--------|------|
| orchestrator-mode.sh | UserPromptSubmit | PM/Worker 모드 감지 (workpm, pmworker 트리거) |
| save-conversation.sh | UserPromptSubmit | 대화 저장 (단순 append, AI 호출 없음) |
| validate-code.sh | PostToolUse | 코드 검증 (500줄, 함수 크기, 보안) |
| check-new-file.sh | PreToolUse | 새 파일 생성 전 reducing-entropy 확인 |
| validate-docs.sh | PostToolUse | 마크다운 AI 글쓰기 패턴 검출 |
| protect-files.sh | PreToolUse | 중요 파일 수정 전 보호 검사 |
| format-code.sh | PostToolUse | 파일 수정 후 코드 포맷팅 |
| validate-api.sh | PostToolUse | API 파일 수정 후 유효성 검사 |

### 장기기억 시스템

컨텍스트 트리 구조의 빠른 파일 기반 메모리 시스템.

| 구성요소 | 역할 |
|---------|------|
| `MEMORY.md` | 컨텍스트 트리 (architecture/, patterns/, gotchas/) |
| `save-conversation.sh` | 단순 append (30줄, AI 호출 없음) |
| `long-term-memory` 스킬 | 메모리 관리 (`/memory add`, `/memory search`) |

**핵심 원칙:**
- 빠르게: 훅에서 AI 호출 금지
- 단순하게: 파일 기반, 복잡한 DB 없음
- 검색 가능하게: 키워드 + 컨텍스트 트리

**메모리 명령어:**

| 명령어 | 설명 |
|--------|------|
| `/memory add <내용>` | MEMORY.md에 정보 저장 |
| `/memory find <키워드>` | RAG 스타일 키워드로 이전 대화 검색 |
| `/memory search <키워드>` | MEMORY.md 내 검색 |
| `/memory tag <키워드들>` | 오늘 대화에 키워드 수동 태깅 |
| `/memory read <날짜>` | 특정 날짜 대화 읽기 |
| `/memory list` | 전체 기억 보기 |

> **[상세 문서](docs/memory-system.md)** - 시스템 구조, 키워드 검색, 훅 설정, 사용법 가이드.

### 커스텀 MCP 서버

| MCP | 설명 | 위치 |
|-----|------|------|
| **claude-orchestrator-mcp** | PM + Multi-AI Worker 오케스트레이션 (Claude + Codex + Gemini, 파일 락킹, 태스크 의존성) | `mcp-servers/claude-orchestrator-mcp/` |

```powershell
# 싱글 AI 모드 (Claude만)
.\mcp-servers\claude-orchestrator-mcp\scripts\launch.ps1 -ProjectPath "C:\your\project"

# Multi-AI 모드 (설치된 CLI 자동 감지)
.\mcp-servers\claude-orchestrator-mcp\scripts\launch.ps1 -ProjectPath "C:\your\project" -MultiAI

# Worker별 AI 직접 지정
.\mcp-servers\claude-orchestrator-mcp\scripts\launch.ps1 -ProjectPath "C:\your\project" -AIProviders @('claude', 'codex', 'gemini')
```

**오케스트레이터 스킬:**
- `workpm` - PM 모드 시작 (프로젝트 분석, 태스크 분해, AI 배정)
- `pmworker` - Worker 모드 시작 (태스크 담당, 파일 락, 작업 수행)

> **[오케스트레이터 가이드](docs/orchestrator-guide.md)** - Multi-AI 오케스트레이션, 태스크 관리, 병렬 터미널 설정 완전 가이드.

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
├── skills/                    # 커스텀 스킬 (슬래시 명령어)
│   ├── docker-deploy/         # Docker 배포 (Cython/PyArmor 지원)
│   ├── code-reviewer/         # 자동 코드 리뷰 (500줄 제한, 보안)
│   ├── vercel-react-best-practices/  # Vercel의 45개 React 최적화 규칙
│   ├── web-design-guidelines/ # UI/UX 접근성 검토
│   ├── api-handoff/           # API 핸드오프 문서 (백엔드↔프론트엔드)
│   ├── humanizer/             # AI 글쓰기 패턴 제거 (24개 패턴)
│   ├── ppt-generator/         # 템플릿 기반 PPT 생성
│   ├── fullstack-coding-standards/  # 풀스택 코딩 표준 (templates/)
│   └── python-backend-fastapi/  # FastAPI 모범 사례
├── agents/                    # 커스텀 서브에이전트
│   ├── frontend-react.md      # React + Zustand + TanStack Query
│   ├── backend-spring.md      # Java 21 + Spring Boot 3.x
│   ├── database-mysql.md      # MySQL 8.0 + Flyway
│   ├── ai-ml.md               # LLM + RAG + Vector DB
│   ├── api-tester.md          # REST/GraphQL API 테스트
│   ├── code-reviewer.md       # 코드 품질 및 보안 검토
│   ├── qa-engineer.md         # 테스트 전략 및 실행
│   ├── qa-writer.md           # 테스트 케이스 작성
│   ├── documentation.md       # PRD, API 문서, CHANGELOG
│   ├── migration-helper.md    # 레거시 → 모던 마이그레이션
│   ├── explore-agent.md       # 레거시 코드 분석 (한국어)
│   ├── feature-tracker.md     # 기능 진행률 추적 (한국어)
│   ├── fullstack-coding-standards.md  # 풀스택 코딩 표준 (패시브)
│   └── api-comparator.md      # API 호환성 검증
├── commands/                  # 슬래시 명령어 & 스크립트
│   ├── check-todos.md
│   ├── write-api-docs.md
│   ├── write-changelog.md
│   ├── write-prd.md
│   ├── test.md
│   ├── review.md
│   ├── migrate.md
│   ├── generate.md
│   ├── daily-sync.md
│   └── update-docs.md
├── hooks/                     # 훅 스크립트
│   ├── protect-files.sh
│   ├── format-code.sh
│   └── validate-api.sh
├── mcp-servers/               # MCP 서버 가이드
│   ├── README.md
│   └── claude-orchestrator-mcp/
├── docs/                      # 문서
│   ├── quickstart.md          # 5분 빠른 시작 가이드
│   ├── orchestrator-guide.md  # Multi-AI 오케스트레이터 상세 가이드
│   ├── memory-system.md       # 장기기억 & 키워드 검색 가이드
│   └── resources/             # 외부 리소스 상세 문서 (24개)
│       ├── README.md          # 리소스 인덱스
│       ├── codex-cli.md       # Codex CLI 통합
│       ├── gemini-cli.md      # Gemini CLI 통합
│       ├── perplexity-skill.md # Perplexity 검색
│       ├── humanizer-skill.md # AI 글쓰기 패턴
│       ├── vercel-agent-skills.md
│       ├── context7-mcp.md
│       └── ... (18개 더)
├── install.bat                # Windows 설치 스크립트 (복사 모드)
├── install-link.bat           # Windows 설치 스크립트 (심볼릭 링크 모드)
├── install-unlink.bat         # Windows 심볼릭 링크 제거
├── install.sh                 # Linux/Mac 설치 스크립트 (--link/--unlink 지원)
├── install-hooks-config.js    # 훅 설정 헬퍼 (settings.json 자동 구성)
├── SETUP.md                   # 전체 설정 가이드
├── README.md                  # 영문 버전
└── README-ko.md               # 한국어 버전 (이 파일)
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
- [softaworks/agent-toolkit](https://github.com/softaworks/agent-toolkit) - session-handoff 스킬
- [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) - React 베스트 프랙티스
- [Vercel AGENTS.md 연구](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals) - 3-layer 아키텍처 기반
- [upstash/context7](https://github.com/upstash/context7) - 최신 라이브러리 문서 주입

---

## 라이선스

MIT License

---

**최종 업데이트:** 2026-02-04
