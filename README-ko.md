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
# Windows
install.bat

# Linux/Mac
chmod +x install.sh && ./install.sh
```

---

## 포함된 내용

### 커스텀 스킬 (48개)

| 카테고리 | 스킬 | 설명 |
|----------|------|------|
| 🤖 **AI 도구** | codex, gemini, perplexity | 외부 AI 모델 연동 (GPT-5.2, Gemini, 웹 검색) |
| 🔮 **메타** | agent-md-refactor, command-creator, plugin-forge, skill-judge | 플러그인/스킬 생성 도구 |
| 📝 **문서화** | c4-architecture, mermaid-diagrams, marp-slide, draw-io, excalidraw, crafting-effective-readmes | 다이어그램 & 문서 |
| 🎨 **프론트엔드** | react-dev, vercel-react-best-practices, mui, design-system-starter | React/TypeScript/디자인 |
| 🛠️ **개발** | docker-deploy, python-backend-fastapi, database-schema-designer, dependency-updater | 개발 도구 & 배포 |
| 🎯 **계획** | gepetto, requirements-clarity, game-changing-features, ship-learn-next | 계획 & 요구사항 |
| 👔 **비즈니스** | professional-communication, feedback-mastery, difficult-workplace-conversations | 비즈니스 커뮤니케이션 |
| 🧪 **테스트** | code-reviewer, qa-test-planner | 코드 리뷰 & QA |
| 📦 **Git** | commit-work | Git 워크플로우 |
| 🔧 **유틸리티** | humanizer, session-handoff, jira, datadog-cli, ppt-generator, web-to-markdown | 유틸리티 |

> **전체 목록**: `skills/` 디렉토리 또는 [AGENTS.md](AGENTS.md) 참조

### 커스텀 에이전트 (29개)

| 카테고리 | 에이전트 | 설명 |
|----------|----------|------|
| **워크플로우** | fullstack-development-workflow, spec-interviewer | 전체 개발 사이클 관리 |
| **가이드라인** | react-best-practices, python-fastapi-guidelines, writing-guidelines, naming-conventions, code-review-checklist, humanizer-guidelines, react-useeffect-guidelines, reducing-entropy | 패시브 규칙 (항상 적용) |
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

> **전체 목록**: `commands/` 디렉토리 또는 [AGENTS.md](AGENTS.md) 참조

### 훅 (6개)

| 훅 | 타이밍 | 설명 |
|----|--------|------|
| validate-code.sh | PostToolUse | 코드 검증 (500줄, 함수 크기, 보안) |
| check-new-file.sh | PreToolUse | 새 파일 생성 전 reducing-entropy 확인 |
| validate-docs.sh | PostToolUse | 마크다운 AI 글쓰기 패턴 검출 |
| protect-files.sh | PreToolUse | 중요 파일 수정 전 보호 검사 |
| format-code.sh | PostToolUse | 파일 수정 후 코드 포맷팅 |
| validate-api.sh | PostToolUse | API 파일 수정 후 유효성 검사 |

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

### Multi-LLM 통합 (NEW)

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
│   ├── humanizer/             # AI 글쓰기 패턴 제거 (24개 패턴)
│   ├── ppt-generator/         # 템플릿 기반 PPT 생성
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
│   └── resources/             # 외부 리소스 상세 문서
│       ├── README.md          # 리소스 인덱스
│       ├── _template.md       # 새 문서 템플릿
│       ├── everything-claude-code.md
│       ├── vercel-agent-skills.md
│       ├── oh-my-claudecode.md
│       ├── skills-sh.md
│       ├── toss-payments-mcp.md
│       └── context7-mcp.md
├── install.bat                # Windows 설치 스크립트
├── install.sh                 # Linux/Mac 설치 스크립트
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
| Commands | - | `.claude/commands/` |
| Hooks | `~/.claude/settings.json` | `.claude/settings.json` |

- **글로벌**: 모든 프로젝트에서 사용 가능
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

## 라이선스

MIT License

---

**최종 업데이트:** 2026-01-31
