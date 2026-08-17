# Claude Code Resources Quick Reference

> 이 문서 하나만 읽으면 필요한 스킬/에이전트/MCP를 찾아 설치할 수 있습니다.
>
> Olympus 스킬 소스 100개는 기본 allowlist 합집합 17개(사용자 진입점 하네스 11개 + 런타임 어댑터 6개)와 source-only 내부·선택 모듈 83개로 나뉩니다. 호환 어댑터를 고르면 Claude는 활성 14개, Codex/Gemini는 활성 13개이며 Grok 설치 표면은 Claude의 14개를 공유합니다. 활성 하네스는 필요한 내부 모듈을 카탈로그에서 직접 읽고, 표의 나머지 로컬 스킬도 `SKILLS-CATALOG.md`의 source-only 경로에서 명시 요청합니다. 사용자 정의 에이전트는 기본 등록하지 않습니다.
>
> **호출 규칙:** 아래 `고정 호출명` 표만 기본 slash 진입점입니다. source-only 항목은 자연어로 기능을 요청하면 LLM이나 활성 하네스가 카탈로그의 현재 `SKILL.md`를 직접 읽어 적용합니다. source-only 이름을 `/name`으로 입력하는 방식은 `--include-source-only-skills`로 활성 등록한 환경에서만 보장됩니다. 표의 “opt-in 시 `/name`” 표기도 모두 이 조건을 뜻합니다.

## 고정 호출명

| 기능 | 호출명 |
|------|--------|
| 젭마인 | `/zephermine` |
| 제우스 | `/zeus` |
| 다이달로스 | `/daedalus` (workpm) |
| 아르고스 | `/argos` |
| 크로노스 | `/chronos` |
| 미노스 | `/minos` |
| 대니즈팀 | `/agent-team` |
| 클리오 | `/clio` |
| 테미스 | `/themis` |
| 헤르메스 | `/hermes` |
| 아테나 | `/athena` |
| 아프로디테 | `/aphrodite` |

`release-notes`, `estimate`, `okr`는 기본 source-only입니다. 각각 “릴리즈 진행해줘”, “견적서 만들어줘”, “OKR 정리해줘”처럼 자연어로 요청하면 카탈로그 원본을 직접 읽습니다. `/release`, `/estimate`, `/okr` 메뉴가 필요할 때만 `--include-source-only-skills`로 활성화합니다.

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
| **backend-dotnet (소스 참고)** | ASP.NET Core 참고 패턴 (기본 미설치) | 이 저장소의 `agents/backend-dotnet.md` |
| **dotnet-coding-standards (스킬)** | .NET 코딩 표준 통합 패키지 (패시브 에이전트 + C#/ASP.NET/EF Core 템플릿) | 이 저장소의 `skills/dotnet-coding-standards/` |
| **desktop-wpf (소스 참고)** | WPF 참고 패턴 (기본 미설치) | 이 저장소의 `agents/desktop-wpf.md` |
| **wpf-coding-standards (스킬)** | WPF 코딩 표준 통합 패키지 (패시브 에이전트 + MVVM/스레딩/메모리 템플릿) | 이 저장소의 `skills/wpf-coding-standards/` |
| **claude-code-dotnet** | 25개 스킬, 5개 에이전트 | `npx add-skill Aaronontheweb/claude-code-dotnet -a claude-code` |

### PostgreSQL

| 리소스 | 설명 | 설치 |
|--------|------|------|
| **pg-aiguide** | 스키마/인덱스 베스트 프랙티스, 제약조건 4배↑ | `claude plugin install pg-aiguide` |

### 데이터베이스 설계

| 리소스 | 설명 | 설치 |
|--------|------|------|
| **database-schema-designer (소스 참고)** | 이전 에이전트 구현 (기본 미설치) | 이 저장소의 `agents/database-schema-designer.md` |
| **database-schema-designer (source-only 스킬)** | DB-First 설계 + 타입, 인덱스, 제약조건, 마이그레이션 | 카탈로그의 원본 경로 |
| **database-mysql (소스 참고)** | 고정 MySQL 패턴 참고자료 (기본 미설치) | 이 저장소의 `agents/database-mysql.md` |
| **database-postgresql (소스 참고)** | 고정 PostgreSQL/Supabase 패턴 참고자료 (기본 미설치) | 이 저장소의 `agents/database-postgresql.md` |

### Java / Spring Boot

| 리소스 | 설명 | 설치 |
|--------|------|------|
| **fullstack-coding-standards** | 4계층 구조 (Controller→Flow→Service→Repository), @Transactional, DTO 변환, 예외 처리 | 이 저장소의 `skills/fullstack-coding-standards/` |

### Python / FastAPI

| 리소스 | 설명 | 설치 |
|--------|------|------|
| **fullstack-coding-standards** | 3계층 구조 (Router→Service→Repository), DB 연동 규칙 | 이 저장소의 `skills/fullstack-coding-standards/` |
| **python-backend-fastapi (로컬)** | 비동기, Pydantic, 기능/책임 단위 모듈화 | 이 저장소의 `skills/python-backend-fastapi/` |

---

## 목적별 추천

### TDD / 테스트

| 리소스 | 설명 | 설치 |
|--------|------|------|
| **네이티브 작업자** | 프로젝트 테스트를 기준으로 Red-Green-Refactor 수행 | 별도 설치 없음 |
| **test-driven-development (source-only 스킬)** | TDD 절차를 명시적으로 강화할 때 사용 | 카탈로그의 원본 경로 |
| **minos (로컬)** | QA 시나리오 → Playwright 테스트 + fix-until-pass 루프 (미노스) | 이 저장소의 `skills/minos/` |

### 코드 리뷰

| 리소스 | 설명 | 설치 |
|--------|------|------|
| **Code Reviewer 에이전트 (외부)** | 네이티브 review와 중복되는 선택 참고자료 | 기본 설치 안 함 |
| **code-reviewer (source-only 로컬)** | 자연어 요청 시 카탈로그에서 직접 읽어 네이티브 review 정책 보강, 명시형 보안 감사 | 카탈로그의 원본 경로 |

### 보안 검토

| 리소스 | 설명 | 설치 |
|--------|------|------|
| **Security Reviewer 에이전트 (외부)** | 정적 보안 프롬프트 선택 참고자료 | 기본 설치 안 함 |
| **code-reviewer 보안 감사 (로컬)** | 시크릿·공급망·CI/CD·STRIDE를 안전하게 명시 실행 | 이 저장소의 `skills/code-reviewer/references/security-audit.md` |

### 기능 계획

| 리소스 | 설명 | 설치 |
|--------|------|------|
| **zephermine (로컬)** | 인터뷰 → 리서치 → 도메인 분석 → 스펙 → 섹션 분리 (Multi-AI 도메인 전문가 포함) | 이 저장소의 `skills/zephermine/` |
| **네이티브 탐색자·작업자** | 구현 전 코드 탐색과 계획 검토 | 별도 설치 없음 |

### 리팩토링

| 리소스 | 설명 | 설치 |
|--------|------|------|
| **hestia (source-only 스킬)** | 측정 기반 데드 코드 탐지와 정리 | 카탈로그의 원본 경로 |

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

## 대규모 외부 패키지 (기본 설치 비권장)

아래 번들은 수십~수백 개 설명과 사용자 정의 에이전트를 다시 상시 등록할 수 있어 Olympus의 기본 거부 정책을 무효화합니다. 격리 환경에서 필요한 단일 기능을 확인한 뒤 선택 설치할 때만 참고하세요.

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
| `skills/zeus/` | 전자동 7단계 — 설명 파싱→젭마인→agent-team/workpm→아르고스→Docker→미노스→증거 보고 (`/zeus`; Hermes/Athena/Clio는 암묵 호출하지 않음) |
| `skills/zephermine/` | 설계 자동화 — 인터뷰 → 도메인 분석 → 스펙 → QA 시나리오 → 섹션 분리 |
| `skills/domain-dictionary/` | 도메인 용어사전(DDD Ubiquitous Language) — 영-한 매핑, 동의어/이의어/과부하 탐지, zephermine 자동 호출 |
| `skills/minos/` | QA 시나리오 → Playwright 테스트 + fix-until-pass 루프 (미노스) |
| `skills/argos/` | 감리/검증 — Phase 0~7에서 정적·런타임·API·QA·도면·디자인·보안 검증 (아르고스) |
| `skills/docker-db-backup/` | Docker DB 자동 백업 (PostgreSQL/MySQL/MariaDB) |
| `skills/docker-deploy/` | Docker 배포 (Cython/PyArmor) |
| `skills/auto-continue-loop/` | 자동 리뷰-수정-검증 루프 (/chronos — 엔진: /goal 1순위, /loop 심장박동 1.5순위 `--heartbeat`) |
| `skills/seo-audit/` | SEO+AEO+GEO 감사 — robots.txt, 사이트맵, 메타태그, JSON-LD, 이미지, 링크, 성능, AI크롤러, 답변엔진, 생성형AI (10영역) |
| `skills/autoresearch/` | 스킬 프롬프트 자동 최적화 — Hill Climbing 루프로 SKILL.md 개선 (Karpathy autoresearch 패턴) |
| `skills/reddit-researcher/` | Reddit 시장 조사 — 리드 스코어링, Pain Point 분류, 경쟁사 추적 |
| `skills/ui-ux-auditor/` | UI/UX 8영역 감사 + 자동 수정 — 다크모드, 반응형, 접근성, 로딩, 폼, 네비, 타이포, 애니메이션 |
| `skills/video-maker/` | Remotion(React/TSX)·HyperFrames(HTML/CSS/GSAP) 선택형 코드 영상 제작 — 프로젝트당 엔진 하나, 공통 asset·render QA |
| `skills/flow-verifier/` | 프로세스 다이어그램 생성 → 구현 후 코드 흐름 검증 (mermaid-diagrams 연동, Chronos 통합) |
| `skills/code-reviewer/` | 자동 코드 리뷰 |
| `skills/vercel-react-best-practices/` | Vercel 45개 규칙 |
| `skills/api-tester/` | 프론트-백엔드 통합 테스트 |
| `skills/fullstack-coding-standards/` | 풀스택 코딩 표준 (Java/Python/NestJS + DB 연동) |
| `skills/agent-team/` | 공통 네이티브 역할 계약 (읽기: Explore/explorer/codebase_investigator/explore, 쓰기: general-purpose/worker/generalist/general-purpose). Main이 공유 상태를 소유하고 위임 불가 시 순차 실행 |
| `skills/agent-team-codex/` | Codex의 `/agent-team` 호출이 라우팅되는 전용 adapter. stable multi-agent + Main 소유 Activity Log |
| `skills/mermaid-diagrams/` | Mermaid 다이어그램 (ERD 포함) |
| `skills/data-visualization/` | 차트 선택 가이드 + Python 시각화 패턴 (Anthropic 공식 벤더링) |
| `skills/humanizer/` | AI 글쓰기 패턴 제거 |
| `skills/ppt-generator/` | PPT 생성 |
| `agents/frontend-react.md` | React + Zustand + TanStack 참고자료 (기본 미설치) |
| `agents/backend-spring.md` | Java 21 + Spring Boot 3.x 참고자료 (기본 미설치) |
| `agents/backend-dotnet.md` | ASP.NET Core + Clean Architecture + EF Core 참고자료 (기본 미설치) |
| `agents/desktop-wpf.md` | WPF 데스크톱 참고자료 (기본 미설치) |
| `agents/database-schema-designer.md` | DB-First 스키마 설계 참고자료 (기본 미설치) |
| `agents/database-mysql.md` | MySQL 8.0 + Flyway 참고자료 (기본 미설치) |
| `agents/database-postgresql.md` | PostgreSQL 16 + Supabase + RLS 참고자료 (기본 미설치) |
| `agents/fullstack-coding-standards.md` | 풀스택 코딩 표준 참고자료 (기본 미설치) |
| `agents/ai-ml.md` | 정적 LLM API·RAG 참고자료 (기본 미설치); 실제 구현은 프로젝트 SDK와 공급자 공식 문서 우선 |
| `skills/memory-compact/` | source-only 내부 모듈 — 활성 mnemo 규칙이 카탈로그에서 직접 읽어 MEMORY.md 크기 점검·압축 |
| `skills/manage-skills/` | 세션 변경사항 분석 → verify-* 스킬 자동 생성/업데이트 |
| `skills/project-gotchas/` | 오답노트 자동 수집 — 2계층(글로벌+프로젝트) 관찰 저장 + delta 알림; 정제는 memory-distill/핸드오프가 명시 실행 |
| `skills/memory-distill/` | source-only 내부 모듈 — mnemo 훅의 안내 또는 명시 요청 시 카탈로그에서 직접 읽어 raw observations.jsonl 정제·rebuild |
| `skills/verify-implementation/` | 모든 verify-* 스킬 순차 실행 → 통합 검증 보고서 |
| `skills/clio/` | 역사의 뮤즈(Closer) — 파이프라인 완료 후 흐름도 추출 + 문서 산출물(PRD, 기술문서, 매뉴얼) 일괄 생성 (/clio) |
| `skills/themis/` | 테미스(Themis) — 개인정보 수집/저장/전송/삭제 전수 감사(file:line 근거) + 국가별(한국/미국/EU) 개인정보처리방침 초안 생성 (/themis) |
| `skills/release-notes/` | 릴리즈 노트 — Conventional Commits 기반 버전 결정 + CHANGELOG.md + Git 태그 + GitHub Release (source-only, opt-in 시 `/release`) |
| `skills/estimate/` | 개발 견적서 — 기능별 공수 산정 + 비용 그룹별(개발비/인건비/클라우드/API/잡비) 엑셀 출력 (source-only, opt-in 시 `/estimate`) |
| `skills/biz-strategy/` | 헤르메스(Hermes) — 비즈니스 모델/수익/시장(TAM/SAM/SOM)/GTM/지표/코호트 6영역 분석 (/hermes) |
| `skills/ceo/` | 아테나(Athena) — CEO 코칭. Go/No-Go 판정, 전략적 도전, 스코프 결정 (/athena) |
| `skills/okr/` | OKR — 목표와 핵심결과 설정/점검/회고 (source-only, opt-in 시 `/okr`) |
| `skills/design-plan/` | 아프로디테(Aphrodite) — 경험 주도 디자인 오케스트레이터. exact Codex Product Design selector가 marketplace에 확인된 경우만 요청당 1회 추천하고, 확인 불가면 UNKNOWN+로컬 구현. 동일 계약의 plugin 유무 대조, 사실·자산 provenance, 웹 전용 GSAP motion contract 포함 (/aphrodite) |
| `skills/stitch/` | Stitch 실행 어댑터 — 아프로디테 산출물(DESIGN.md, design-refs)을 Stitch MCP 작업(생성/편집/변형/동기화/React 변환)으로 컴파일 + `.stitch/` 상태 관리 |
| `skills/theme-factory/` | 테마 팩토리 — 슬라이드/문서/HTML에 입히는 색·폰트 테마 14종 (한글 테마 4종 포함, Anthropic 공식 벤더링) |
| `skills/ko-en-translator/` | 한↔영 번역 — 텍스트, 기술 문서, 코드 주석, i18n 파일, 커밋 메시지 양방향 번역 (/translate) |
| `skills/deprecation-and-migration/` | 코드 부채 정리 + 마이그레이션 — 레거시 폐기 계획, API 버전 전환, Strangler Fig 패턴, 부채 감사 (/deprecate) |
| `skills/documentation-and-adrs/` | ADR(Architecture Decision Records) — 아키텍처 결정 기록 + 인덱스 관리 + MEMORY.md 연동 (source-only, opt-in 시 `/adr`) |
| `skills/shipping-and-launch/` | 출시 체크리스트 — 프리런치 품질 게이트, 단계적 롤아웃, 롤백 플레이북, Post-Launch 점검 (source-only, opt-in 시 `/launch`) |
| `skills/social-login/` | 소셜 로그인 — Google/Apple/Kakao/Naver × React Native/Swift/Kotlin/Web 구현 가이드 + Gotcha 체크리스트 |

---

## 사용 방법

이 문서 URL을 Claude에게 알려주고 요청:

```
https://raw.githubusercontent.com/Dannykkh/skill-olympus/master/QUICK-REFERENCE.md
읽고 이 프로젝트에 맞는 스킬 추천해줘
```

또는:

```
위 URL 참고해서 TDD 에이전트 설치해줘
```

---

**저장소:** https://github.com/Dannykkh/skill-olympus
**마지막 업데이트:** 2026-08-13
