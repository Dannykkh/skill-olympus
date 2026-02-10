# 워크플로우 가이드

프로젝트 규모와 상황에 따른 워크플로우 선택 가이드입니다.

---

## 전체 파이프라인

```
설계 (What)        구현 (Build)            검증 (Verify)         배포 (Ship)
─────────────     ─────────────────      ─────────────        ──────────────
                  ┌ /agent-team ──┐
/zephermine ──→   │  (Claude 병렬) │ ──→  /qa-until-pass ──→  /docker-deploy
                  ├ /workpm ──────┤
                  │  (멀티AI 병렬) │
                  └───────────────┘
```

### 각 Phase의 역할

| Phase | 명령어 | 산출물 | 핵심 질문 |
|-------|--------|--------|----------|
| **설계** | `/zephermine` | 스펙, 섹션, QA 시나리오, API 명세 | **무엇**을 만드는가? |
| **아키텍처** | `architect` 에이전트 | ADR, 기술 스택 결정 | **어떤 구조**로 만드는가? |
| **구현** | `/agent-team` 또는 `workpm` | 소스 코드 | **코드**를 작성 |
| **검증** | `/qa-until-pass` | 테스트 코드, QA 보고서 | **동작**하는가? |
| **배포** | `/docker-deploy` | Dockerfile, docker-compose, install.bat | **어떻게 배포**하는가? |

### 각 Phase에서 사용되는 리소스

| Phase | 스킬 | 에이전트 (패시브) | MCP |
|-------|------|-----------------|-----|
| **설계** | zephermine | spec-interviewer | Tavily (웹 리서치), Exa (코드 검색), Codex/Gemini CLI (도메인 전문가) |
| **아키텍처** | — | architect | — |
| **구현** | agent-team, orchestrator | frontend-react, backend-spring, database-mysql, database-postgresql, fullstack-coding-standards, naming-conventions | Playwright (E2E), Context7 (라이브러리 문서) |
| **검증** | qa-until-pass | qa-engineer, qa-writer, code-review-checklist | Playwright (테스트 실행) |
| **배포** | docker-deploy | — | — |
| **공통** | commit-work, mnemo | reducing-entropy, security-reviewer | GitHub (PR/이슈) |

---

## 규모별 워크플로우 선택

### 대형: 신규 프로젝트, 복잡한 다기능 시스템

```
/zephermine → architect → /agent-team → /qa-until-pass → /docker-deploy
```

1. **`/zephermine`**: 심층 인터뷰 → 리서치 → 스펙 → 섹션 분리
2. **`architect`**: 기술 스택 평가 → ADR 작성 → 확장성 설계
3. **`/agent-team`**: 섹션별 teammate 배정 → Wave 병렬 구현 → verify
4. **`/qa-until-pass`**: QA 시나리오 → Playwright 테스트 → Healer 루프
5. **`/docker-deploy`**: Dockerfile + docker-compose + 설치 스크립트

**예시**: SaaS 플랫폼, 관리자 대시보드, 멀티테넌트 시스템

---

### 중형: 기존 프로젝트에 기능 추가

```
/zephermine → /agent-team 또는 수동 구현 → /qa-until-pass
```

1. **`/zephermine`**: 요구사항 정리 → 영향 분석 → 섹션 분리
2. **구현**: 섹션이 2~3개면 수동, 4개 이상이면 `/agent-team`
3. **`/qa-until-pass`**: 기능 테스트 + 회귀 테스트

**예시**: 결제 기능 추가, 알림 시스템 도입, OAuth 연동

---

### 소형: 버그 수정, 단일 기능

```
구현 → /qa-until-pass
```

1. **구현**: 직접 코드 작성 (설계 단계 불필요)
2. **`/qa-until-pass`**: 수정 확인 + 회귀 방지

**예시**: 로그인 버그, 폼 유효성 검증 추가, API 응답 포맷 변경

---

### QA만: 구현은 끝났고 테스트만 필요

```
/qa-until-pass
```

1. **`/qa-until-pass`**: 시나리오 자동 생성 → 테스트 → Healer

**예시**: 기존 코드 인수인계 후 품질 확인, 리팩토링 후 회귀 테스트

---

## Phase 1: 설계 — `/zephermine`

**언제 쓰나**: 요구사항이 모호하거나, 여러 기능이 엮여 있을 때

```
/zephermine "온라인 서점 만들어줘"
```

### 사용되는 리소스

| 종류 | 이름 | 역할 |
|------|------|------|
| **스킬** | zephermine | 22단계 워크플로우 (인터뷰→리서치→도메인분석→스펙→섹션) |
| **에이전트** | spec-interviewer | 심층 인터뷰 진행 (A~G 카테고리) |
| **에이전트** | explore-agent | 기존 코드베이스 분석 |
| **에이전트** | Domain Process Expert | 업무 흐름표 작성 (기능별 역할/CRUD 권한/입출력/예외) |
| **에이전트** | Domain Technical Expert | 기술 스택 매핑 (연동/규제/SLA/기존 솔루션) |
| **MCP** | Tavily | 웹 리서치 (기술 트렌드, 경쟁사 분석) |
| **MCP** | Exa | 코드 스니펫 검색 (구현 패턴, API 사용법) |
| **외부 AI** | Codex / Gemini CLI | 도메인 전문가 분석 (설치 시 자동 활용, 없으면 Claude) |

### 산출물

| 파일 | 내용 | 다음 Phase에서 소비 |
|------|------|-------------------|
| `claude-ralph.md` | 설계 스펙 (기능, 비기능, 제약사항) | architect, 개발자 |
| `claude-ralphy.md` | 섹션별 구현 계획 | agent-team |
| `domain-process-analysis.md` | 업무 흐름표 (역할/CRUD/입출력/예외) | 개발자 (API 설계 근거) |
| `domain-technical-analysis.md` | 기술 스택 매핑 (연동/규제/솔루션) | architect, 개발자 |
| `claude-qa-scenarios.md` | QA 테스트 시나리오 | qa-until-pass |
| `claude-api-spec.md` | API 엔드포인트 명세 | 프론트/백엔드, qa-until-pass |
| `sections/index.md` | 섹션 의존성 그래프 | agent-team (Wave 계획) |

### 건너뛸 때

- 요구사항이 명확하고 단순할 때
- 이미 상세 기획서가 있을 때
- 버그 수정이나 리팩토링일 때

---

## Phase 1.5: 아키텍처 — `architect` 에이전트

**언제 쓰나**: 기술 스택 선정, 확장성 설계, 큰 구조 결정이 필요할 때

```
이 스펙 기반으로 아키텍처 설계해줘
@claude-ralph.md
```

### 사용되는 리소스

| 종류 | 이름 | 역할 |
|------|------|------|
| **에이전트** | architect | 아키텍처 패턴, 기술 스택 평가, SOLID, ADR |
| **스킬** | mermaid-diagrams | 아키텍처 다이어그램 시각화 |
| **스킬** | database-schema-designer | DB 스키마 설계 + ERD |

### 산출물

- ADR (Architecture Decision Record)
- 기술 스택 평가 매트릭스
- 시스템 아키텍처 다이어그램

### 건너뛸 때

- 기존 프로젝트에 기능 추가 (아키텍처 이미 결정됨)
- 기술 스택이 이미 정해져 있을 때

---

## Phase 2: 구현 — `/agent-team` vs `workpm`

### 선택 기준

| 기준 | `/agent-team` | `workpm` |
|------|--------------|-----------|
| **AI 엔진** | Claude만 | Claude + Codex + Gemini |
| **장점** | 네이티브 통합, 팀원 간 대화, 빠름 | 멀티AI 조합, 각 AI 강점 활용 |
| **단점** | Claude 토큰만 소비 | 설정 복잡, 외부 AI CLI 필요 |
| **적합** | 젭마인 섹션 기반 구현 | 대규모 독립 작업, 특정 AI가 유리한 작업 |
| **입력** | sections/index.md (자동 파싱) | 사용자 지시 |
| **병렬** | Wave 기반 (의존성 자동 해소) | PM이 태스크 분배 |

### `/agent-team` 사용 시 리소스

| 종류 | 이름 | 역할 |
|------|------|------|
| **스킬** | agent-team | Wave 계획, 태스크 분배, 검증 |
| **에이전트** | frontend-react | React/TypeScript/Zustand/TanStack 전문가 |
| **에이전트** | backend-spring | Java 21/Spring Boot 3.x 전문가 |
| **에이전트** | database-mysql | MySQL 8.0/Flyway 전문가 |
| **에이전트** | database-postgresql | PostgreSQL/Supabase/RLS 전문가 |
| **에이전트** | fullstack-coding-standards | 4계층 아키텍처 규칙 (패시브) |
| **에이전트** | naming-conventions | 네이밍 규칙 (패시브) |
| **MCP** | Context7 | 라이브러리 문서 실시간 검색 |
| **MCP** | Playwright | E2E 테스트 실행 |

파일 패턴에 따라 전문가 에이전트가 자동 매칭됩니다:
- `*.tsx`, `components/**` → frontend-react
- `api/**`, `controllers/**` → backend-spring
- `migrations/**`, `*.sql` → database-postgresql
- `*.py` → python-fastapi-guidelines
- 매칭 안 됨 → fullstack-coding-standards

### `workpm` 사용 시 리소스

| 종류 | 이름 | 역할 |
|------|------|------|
| **스킬** | orchestrator | PM-Worker 패턴, 태스크 분배, 파일 락 |
| **MCP** | claude-orchestrator-mcp | PM/Worker 간 통신, 태스크 상태 관리 |
| **외부 AI** | Codex CLI | 추론 집약 작업 (알고리즘, 리팩토링) |
| **외부 AI** | Gemini CLI | 대용량 컨텍스트 (200K+ 토큰) |

---

## Phase 3: 검증 — `/qa-until-pass`

**언제 쓰나**: 구현이 끝나고 테스트를 자동화하고 싶을 때

```
/qa-until-pass                           # 자동 감지
/qa-until-pass @claude-qa-scenarios.md   # 젭마인 QA 문서 지정
/qa-until-pass --api-only                # API 테스트만
/qa-until-pass --fix-test-only           # 구현 코드 수정 금지
```

### 사용되는 리소스

| 종류 | 이름 | 역할 |
|------|------|------|
| **스킬** | qa-until-pass | 5단계 워크플로우 (수집→생성→실행→Healer→보고) |
| **에이전트** | qa-engineer | 품질 판정 기준 (PASS/CONDITIONAL/FAIL) |
| **에이전트** | qa-writer | 시나리오 없을 때 현장 생성 |
| **에이전트** | code-review-checklist | 코드 품질 기준 (패시브) |
| **MCP** | Playwright | 브라우저 자동화, E2E 테스트 실행 |

### 입력 소스 (우선순위)

1. `$ARGUMENTS`로 전달된 파일
2. `claude-qa-scenarios.md` (젭마인 산출물)
3. `docs/qa/*.md` (qa-writer 산출물)
4. 없으면 프로젝트 분석해서 현장 생성

### 5단계

```
시나리오 수집 → Playwright 코드 생성 → 실행 → Healer 루프 (max 5회) → 보고
```

### 판정

| Grade | 조건 | 의미 |
|-------|------|------|
| **PASS** | 전체 통과 | 배포 가능 |
| **CONDITIONAL** | P0/P1 통과, P2/P3 일부 fixme | 조건부 진행 |
| **FAIL** | P0 또는 P1 실패 | 수정 필수 |

---

## Phase 4: 배포 — `/docker-deploy`

**언제 쓰나**: QA 통과 후 Docker 기반 배포 환경을 만들 때

```
/docker-deploy
```

### 사용되는 리소스

| 종류 | 이름 | 역할 |
|------|------|------|
| **스킬** | docker-deploy | Dockerfile, docker-compose, install 스크립트 생성 |

### 산출물

| 파일 | 내용 |
|------|------|
| `Dockerfile` | 백엔드/프론트엔드 빌드 이미지 |
| `docker-compose.yml` | 서비스 구성 (앱 + DB + nginx) |
| `install.bat` / `install.sh` | 원클릭 설치 스크립트 |
| `.env.example` | 환경 변수 템플릿 |
| `nginx.conf` | 리버스 프록시 설정 (필요 시) |

### 자동 감지

프로젝트 구조를 분석해서 적절한 Docker 설정을 생성합니다:
- `package.json` → Node.js/React 감지
- `pom.xml` / `build.gradle` → Spring Boot 감지
- `requirements.txt` / `pyproject.toml` → Python/FastAPI 감지
- DB 컨테이너 자동 포함 (MySQL, PostgreSQL, MongoDB)

### 건너뛸 때

- 이미 Docker 설정이 있을 때
- 서버리스 배포 (Vercel, Netlify 등)
- 라이브러리/CLI 도구 (배포 환경 불필요)

---

## 보조 도구

메인 파이프라인 외에 끼워 쓸 수 있는 도구들입니다. 세 종류로 나뉩니다.

### 항상 적용 (패시브)

호출할 필요 없이 자동으로 적용되는 규칙:

| 에이전트 | 역할 | 적용 범위 |
|---------|------|----------|
| `fullstack-coding-standards` | 4계층 아키텍처, 코딩 규칙 12개 | 코드 작성 시 항상 |
| `code-review-checklist` | 500줄 제한, DRY, 보안 체크 | 코드 작성 시 항상 |
| `react-best-practices` | Vercel 45개 React 규칙 | React 코드 작성 시 |
| `naming-conventions` | 네이밍 규칙 | 변수/함수/클래스 작성 시 |

### 문서화 도구

설계~구현 사이에 끼워 넣어 산출물을 만드는 도구:

| 도구 | 종류 | 용도 | 끼워 넣는 시점 |
|------|------|------|--------------|
| `/write-prd` | 스킬 | PRD (요구사항 정의서) 작성 | 설계 전 또는 설계 중 |
| `/write-api-docs` | 스킬 | API 엔드포인트 문서 생성 | 구현 후 |
| `mermaid-diagrams` | 스킬 | ERD, 시퀀스, 아키텍처 다이어그램 | 설계 중 또는 구현 후 |
| `database-schema-designer` | 스킬 | DB 스키마 설계 + ERD | 설계 중 (architect 이후) |
| `documentation` | 에이전트 | 기술 문서, 변경 이력 | 구현 후 |
| `/update-docs` | 스킬 | 기존 문서 파일 업데이트 | 구현 후 |

### 리뷰 & 유틸리티

| 도구 | 종류 | 용도 | 끼워 넣는 시점 |
|------|------|------|--------------|
| `/review` | 스킬 | 코드 리뷰 (품질/보안/성능) | 구현 후, QA 전 |
| `security-reviewer` | 에이전트 | 보안 전문 감사 (OWASP) | 구현 후, 배포 전 |
| `reducing-entropy` | 스킬 | 코드 정리, 기술부채 탐지 | 구현 후, 리뷰 전 |
| `/explain` | 스킬 | 코드 설명 (비유 + Mermaid) | 아무 때나 |
| `/commit` | 스킬 | Git 커밋 | 각 Phase 완료 시 |
| `/wrap-up` | 스킬 | 세션 요약 + MEMORY.md 업데이트 | 세션 종료 시 |

### 보조 도구를 끼워 넣은 풀 파이프라인

```
/zephermine
  ├─ /write-prd (요구사항 정리가 필요하면)
  ├─ mermaid-diagrams (ERD 시각화)
  └─ database-schema-designer (DB 설계)
     ↓
 architect
     ↓
 /agent-team
  └─ (패시브 에이전트 자동 적용)
     ↓
 /review + security-reviewer
     ↓
 /qa-until-pass
     ↓
 /docker-deploy
     ↓
 /write-api-docs + /update-docs
     ↓
 /commit → /wrap-up
```

---

## 실전 예시

### 예시 1: 온라인 서점 신규 개발 (풀 코스)

```bash
# 1. 설계
/zephermine "온라인 서점 만들어줘"
# → 인터뷰 20분 → 스펙 + QA + API 명세 + 12개 섹션
# 사용: spec-interviewer, Tavily, Exa

# 2. 아키텍처
# architect 에이전트에게 @claude-ralph.md 전달
# → Next.js + Spring Boot + PostgreSQL 결정
# 사용: architect, mermaid-diagrams, database-schema-designer

# 3. 구현
/agent-team
# → sections/ 자동 파싱 → Wave 3개 → teammate 10명 병렬
# 사용: frontend-react, backend-spring, database-postgresql, Context7

# 4. 검증
/qa-until-pass
# → claude-qa-scenarios.md 45개 시나리오 → Playwright 실행
# → Healer 2회 수정 → PASS (43/45 즉시 통과, 2개 수정 후 통과)
# 사용: qa-engineer, Playwright MCP

# 5. 배포
/docker-deploy
# → Dockerfile (Next.js + Spring Boot) + docker-compose (+ PostgreSQL)
# → install.bat/sh 원클릭 설치 스크립트
```

### 예시 2: 기존 앱에 결제 기능 추가

```bash
# 1. 설계 (간소화)
/zephermine "Stripe 결제 기능 추가"
# → 인터뷰 10분 → 스펙 + 3개 섹션

# 2. 구현 (섹션 적으니 수동)
# 직접 코딩 또는 /agent-team
# 사용: backend-spring, fullstack-coding-standards (패시브)

# 3. 검증
/qa-until-pass --api-only
# → 결제 API 12개 시나리오 → 실행 → PASS
```

### 예시 3: 로그인 버그 수정

```bash
# 설계 건너뜀, 바로 수정
# 버그 수정 후:

/qa-until-pass
# → 인증 관련 시나리오 자동 생성 → 실행 → PASS

/commit
# → 변경사항 분석 → 커밋
```

---

## 관련 문서

| 문서 | 내용 |
|------|------|
| [quickstart.md](quickstart.md) | 설치 및 빠른 시작 |
| [AGENTS.md](../AGENTS.md) | 에이전트/스킬 전체 목록 + Recommended Workflows |
| [QUICK-REFERENCE.md](../QUICK-REFERENCE.md) | 외부 리소스 포함 전체 참조 |
| [skills/zephermine/](../skills/zephermine/) | 젭마인 설계 스킬 |
| [skills/agent-team/](../skills/agent-team/) | Agent Teams 병렬 실행 |
| [skills/orchestrator/](../skills/orchestrator/) | PM-Worker 멀티AI 오케스트레이션 |
| [skills/qa-until-pass/](../skills/qa-until-pass/) | QA 자동 테스트 + Healer |
| [skills/docker-deploy/](../skills/docker-deploy/) | Docker 배포 환경 생성 |
