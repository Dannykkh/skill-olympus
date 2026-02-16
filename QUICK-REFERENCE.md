# Claude Code Resources Quick Reference

> 이 문서 하나만 읽으면 필요한 스킬/에이전트/MCP를 찾아 설치할 수 있습니다.

---

## 기술 스택별 추천

### React / Next.js

| 리소스 | 설명 | 설치 |
|--------|------|------|
| **Vercel Agent Skills** | 45개 최적화 규칙 (번들, 렌더링, SSR) | `npx add-skill vercel-labs/agent-skills -a claude-code` |
| **fullstack-coding-standards** | 프론트 API 추상화, TanStack Query 3계층, DB 연동 | 이 저장소의 `skills/fullstack-coding-standards/` |
| **oh-my-claudecode** | React 전문 에이전트 포함 | `/plugin install oh-my-claudecode` |

### TypeScript / NestJS

| 리소스 | 설명 | 설치 |
|--------|------|------|
| **mastering-typescript-skill** | 엔터프라이즈 패턴, NestJS, React 19 | `npx add-skill SpillwaveSolutions/mastering-typescript-skill -a claude-code` |

### .NET / WPF / MAUI

| 리소스 | 설명 | 설치 |
|--------|------|------|
| **claude-code-dotnet** | 25개 스킬, 5개 에이전트 | `npx add-skill Aaronontheweb/claude-code-dotnet -a claude-code` |

### PostgreSQL

| 리소스 | 설명 | 설치 |
|--------|------|------|
| **pg-aiguide** | 스키마/인덱스 베스트 프랙티스, 제약조건 4배↑ | `claude plugin install pg-aiguide` |

### Java / Spring Boot

| 리소스 | 설명 | 설치 |
|--------|------|------|
| **fullstack-coding-standards** | 4계층 구조 (Controller→Flow→Service→Repository), @Transactional, DTO 변환, 예외 처리 | 이 저장소의 `skills/fullstack-coding-standards/` |

### Python / FastAPI

| 리소스 | 설명 | 설치 |
|--------|------|------|
| **fullstack-coding-standards** | 3계층 구조 (Router→Service→Repository), DB 연동 규칙 | 이 저장소의 `skills/fullstack-coding-standards/` |
| **python-backend (로컬)** | 비동기, Pydantic, 500줄 제한 | 이 저장소의 `skills/python-backend/` |

---

## 목적별 추천

### TDD / 테스트

| 리소스 | 설명 | 설치 |
|--------|------|------|
| **TDD Guide 에이전트** | Red-Green-Refactor 강제, 80%+ 커버리지 | `curl -o ~/.claude/agents/tdd-guide.md https://raw.githubusercontent.com/affaan-m/everything-claude-code/main/agents/tdd-guide.md` |
| **/tdd 명령어** | TDD 워크플로우 실행 | `curl -o .claude/commands/tdd.md https://raw.githubusercontent.com/affaan-m/everything-claude-code/main/commands/tdd.md` |
| **qa-until-pass (로컬)** | QA 시나리오 → Playwright 테스트 + fix-until-pass 루프 | 이 저장소의 `skills/qa-until-pass/` |

### 코드 리뷰

| 리소스 | 설명 | 설치 |
|--------|------|------|
| **Code Reviewer 에이전트** | 품질/보안/성능 자동 리뷰 | `curl -o ~/.claude/agents/code-reviewer.md https://raw.githubusercontent.com/affaan-m/everything-claude-code/main/agents/code-reviewer.md` |
| **code-reviewer (로컬)** | 500줄 제한, 모듈화, 보안 검증 | 이 저장소의 `skills/code-reviewer/` |

### 보안 검토

| 리소스 | 설명 | 설치 |
|--------|------|------|
| **Security Reviewer 에이전트** | OWASP Top 10, 취약점 분석 | `curl -o ~/.claude/agents/security-reviewer.md https://raw.githubusercontent.com/affaan-m/everything-claude-code/main/agents/security-reviewer.md` |

### 기능 계획

| 리소스 | 설명 | 설치 |
|--------|------|------|
| **zephermine (로컬)** | 인터뷰 → 리서치 → 도메인 분석 → 스펙 → 섹션 분리 (Multi-AI 도메인 전문가 포함) | 이 저장소의 `skills/zephermine/` |
| **Planner 에이전트** | 구현 전 상세 계획 수립 | `curl -o ~/.claude/agents/planner.md https://raw.githubusercontent.com/affaan-m/everything-claude-code/main/agents/planner.md` |
| **Architect 에이전트** | 시스템 설계, 아키텍처 결정 | `curl -o ~/.claude/agents/architect.md https://raw.githubusercontent.com/affaan-m/everything-claude-code/main/agents/architect.md` |

### 리팩토링

| 리소스 | 설명 | 설치 |
|--------|------|------|
| **Refactor Cleaner 에이전트** | 데드 코드 제거, 정리 | `curl -o ~/.claude/agents/refactor-cleaner.md https://raw.githubusercontent.com/affaan-m/everything-claude-code/main/agents/refactor-cleaner.md` |

---

## MCP 서버

### 문서 검색

| MCP | 설명 | 설치 |
|-----|------|------|
| **Context7** | 라이브러리 공식 문서 실시간 검색 (무료) | `claude mcp add context7 -- npx -y @upstash/context7-mcp` |

### 결제 연동

| MCP | 설명 | 설치 |
|-----|------|------|
| **Toss Payments** | PG 결제 10분 연동 (한국) | `claude mcp add tosspayments -- npx -y @tosspayments/integration-guide-mcp@latest` |

### 브라우저 자동화

| MCP | 설명 | 설치 |
|-----|------|------|
| **Playwright** | 웹 자동화, E2E 테스트 (Microsoft) | `claude mcp add playwright -- npx -y @playwright/mcp@latest` |

### GitHub

| MCP | 설명 | 설치 |
|-----|------|------|
| **GitHub** | PR, Issue, API 접근 (공식) | `claude mcp add github -- npx -y @modelcontextprotocol/server-github` |

### 문서 변환

| MCP | 설명 | 설치 |
|-----|------|------|
| **mcp-pandoc** | MD→PDF/DOCX 변환 (무료) | `pip install mcp-pandoc` |

### PPT 생성

| MCP | 설명 | 설치 |
|-----|------|------|
| **Office-PowerPoint-MCP** | 32개 도구, 25개 템플릿 (무료) | `pip install office-powerpoint-mcp-server` |

---

## Hooks (자동화)

`~/.claude/settings.json` 또는 `.claude/settings.json`에 추가

### Prettier 자동 포맷팅

JS/TS 파일 편집 후 자동 실행:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit && file_path matches \\.(ts|tsx|js|jsx)$",
        "hooks": [{ "type": "command", "command": "npx prettier --write \"$FILE_PATH\"" }]
      }
    ]
  }
}
```

### console.log 경고

편집 후 console.log 있으면 경고:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit && file_path matches \\.(ts|tsx|js|jsx)$",
        "hooks": [{ "type": "command", "command": "grep -n 'console.log' \"$FILE_PATH\" && echo '[Warning] console.log found!'" }]
      }
    ]
  }
}
```

### TypeScript 타입 체크

TS 편집 후 자동 타입 체크:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit && file_path matches \\.(ts|tsx)$",
        "hooks": [{ "type": "command", "command": "npx tsc --noEmit" }]
      }
    ]
  }
}
```

---

## 종합 패키지

### everything-claude-code (해커톤 우승자)

12개 에이전트 + 16개 스킬 + 23개 명령어 + 훅

```bash
# 전체 설치
/plugin marketplace add affaan-m/everything-claude-code

# 또는 수동
git clone https://github.com/affaan-m/everything-claude-code
cp -r agents skills commands hooks rules ~/.claude/
```

### oh-my-claudecode

32개 에이전트 + 40개 스킬 + 멀티에이전트 오케스트레이션

```bash
/plugin install oh-my-claudecode
```

### awesome-claude-code-subagents

126개 이상의 전문 서브에이전트 컬렉션

```bash
# 언어 전문가
claude plugin install voltagent-lang

# 인프라/DevOps
claude plugin install voltagent-infra

# 품질/보안
claude plugin install voltagent-qa-sec
```

---

## 이 저장소 로컬 리소스

| 경로 | 설명 |
|------|------|
| `skills/zephermine/` | 설계 자동화 — 인터뷰 → 도메인 분석 → 스펙 → QA 시나리오 → 섹션 분리 |
| `skills/qa-until-pass/` | QA 시나리오 → Playwright 테스트 + fix-until-pass 루프 |
| `skills/docker-deploy/` | Docker 배포 (Cython/PyArmor) |
| `skills/code-reviewer/` | 자동 코드 리뷰 |
| `skills/react-best-practices/` | Vercel 45개 규칙 |
| `skills/api-tester/` | 프론트-백엔드 통합 테스트 |
| `skills/fullstack-coding-standards/` | 풀스택 코딩 표준 (Java/Python/NestJS + DB 연동) |
| `skills/agent-team/` | Agent Teams 병렬 실행 — Opus 4.6 네이티브 (zephermine 섹션 기반) |
| `skills/erd-designer/` | Mermaid ERD 생성 |
| `skills/humanizer/` | AI 글쓰기 패턴 제거 |
| `skills/ppt-generator/` | PPT 생성 |
| `agents/frontend-react.md` | React + Zustand + TanStack |
| `agents/backend-spring.md` | Java 21 + Spring Boot 3.x |
| `agents/database-mysql.md` | MySQL 8.0 + Flyway |
| `agents/database-postgresql.md` | PostgreSQL 16 + Supabase + RLS |
| `agents/fullstack-coding-standards.md` | 풀스택 코딩 표준 (패시브 에이전트) |
| `agents/ai-api-guide.md` | LLM API 최신 모델/SDK 코딩 가이드 |
| `agents/ai-ml.md` | LLM + RAG + Vector DB |

---

## 사용 방법

이 문서 URL을 Claude에게 알려주고 요청:

```
https://raw.githubusercontent.com/Dannykkh/claude-code-agent-customizations/master/QUICK-REFERENCE.md
읽고 이 프로젝트에 맞는 스킬 추천해줘
```

또는:

```
위 URL 참고해서 TDD 에이전트 설치해줘
```

---

**저장소:** https://github.com/Dannykkh/claude-code-agent-customizations
**마지막 업데이트:** 2026-02-05
