# 워크플로우 가이드

프로젝트 규모와 상황에 따른 워크플로우 선택 가이드입니다.

---

## 전체 파이프라인

```
설계 (What)        구현 (Build)            검증 (Verify)         배포 (Ship)
─────────────     ─────────────────      ─────────────        ──────────────
                  ┌ /agent-team ──┐
/zephermine ──→   │ (CLI 네이티브) │ ──→  /minos ──→  Docker 배포 요청
                  ├ /workpm ──────┤                       (source-only 직접 로드)
                  │ (CLI 네이티브) │
                  └──────┬────────┘
                         └ 필요 시 Orchestrator MCP
                           (hard lock·외부 보드·cross-CLI)
```

기본 활성 slash 진입점은 파이프라인 하네스와 런타임 어댑터에만 제공됩니다. `docker-deploy`, `mermaid-diagrams`, `documentation-and-adrs`, `code-reviewer` 같은 source-only 기능은 자연어로 요청하면 카탈로그의 정확한 `SKILL.md`를 직접 읽어 적용합니다. 해당 이름의 slash 호출이 필요할 때만 `--include-source-only-skills`로 활성화합니다.

Antigravity에서는 네이티브 workflow가 단순 요청을 먼저 소유합니다. `/goal`은 지속성, `/plan`과
`/grill-me`는 가벼운 계획·인터뷰, `/teamwork-preview`는 가용한 일반 장기 팀 작업, `/learn`은 최근
교정 학습, `/schedule`은 예약·반복 실행, `/browser`는 브라우저 관찰에 사용합니다. Olympus 하네스는
저장형 설계 묶음, Wave·파일 소유권, 반복 가능한 테스트 증거, 검증·감사 로그가 필요한 경우에만
추가합니다. 자세한 매트릭스는 [Antigravity CLI 통합](resources/antigravity-cli.md)을 따릅니다.

### 각 Phase의 역할

| Phase | 진입점/요청 | 산출물 | 핵심 질문 |
|-------|--------|--------|----------|
| **설계** | `/zephermine` | 스펙, 섹션, QA 시나리오, API 명세, DB 스키마 | **무엇**을 만드는가? |
| **아키텍처** | `아키텍처를 검토하고 ADR로 기록해줘` | ADR, 기술 스택 결정 | **어떤 구조**로 만드는가? |
| **구현** | `/agent-team` 또는 `workpm` | 소스 코드 | **코드**를 작성 |
| **검증** | `/minos` | 테스트 코드, QA 보고서 | **동작**하는가? |
| **배포** | `Docker 배포 환경 만들어줘` | Dockerfile, docker-compose, install.bat | **어떻게 배포**하는가? |

### 각 Phase에서 사용되는 리소스

| Phase | 스킬 | 필요 시 명시적으로 쓰는 에이전트 | MCP |
|-------|------|-----------------|-----|
| **설계** | zephermine | 현재 CLI의 네이티브 계획·탐색 및 artifact-writer | Tavily/Exa (선택 리서치), 설치된 Codex/Antigravity 외부 리뷰 프로세스 (선택) |
| **아키텍처** | documentation-and-adrs, mermaid-diagrams (source-only 직접 로드) | 네이티브 계획·검토 | 공식 기술 문서 (필요 시) |
| **구현** | agent-team/workpm (활성), orchestrator (MCP 분기에서만 source-only 직접 로드) | 네이티브 작업자 + 프로젝트 설정·인접 코드·테스트 계약 | Playwright (E2E), Context7 (라이브러리 문서) |
| **검증** | minos (활성), code-reviewer (source-only 직접 로드) | 네이티브 테스트·리뷰 작업자 | Playwright (테스트 실행) |
| **배포** | docker-deploy (source-only 직접 로드) | — | — |
| **공통** | mnemo·hestia (활성), commit-work·deprecation-and-migration (source-only 직접 로드) | 네이티브 범용 작업자; 보안 감사 시 source-only code-reviewer 계약 | GitHub (PR/이슈) |

---

## 규모별 워크플로우 선택

### 대형: 신규 프로젝트, 복잡한 다기능 시스템

```
/zephermine → 아키텍처 검토·ADR 작성 요청 → /agent-team → /minos → Docker 배포 요청
```

1. **`/zephermine`**: 심층 인터뷰 → 리서치 → 스펙 → 섹션 분리
2. **아키텍처 검토·ADR 작성 요청**: 네이티브 대안 비교 → 프로젝트 제약 검증 → source-only `documentation-and-adrs` 직접 로드
3. **`/agent-team`**: 섹션별 teammate 배정 → Wave 병렬 구현 → verify
4. **`/minos`**: QA 시나리오 → Playwright 테스트 → Healer 루프
5. **Docker 배포 요청**: source-only `docker-deploy`를 카탈로그에서 직접 읽어 Dockerfile + docker-compose + 설치 스크립트 생성

**예시**: SaaS 플랫폼, 관리자 대시보드, 멀티테넌트 시스템

---

### 중형: 기존 프로젝트에 기능 추가

```
/zephermine → /agent-team 또는 수동 구현 → /minos
```

1. **`/zephermine`**: 요구사항 정리 → 영향 분석 → 섹션 분리
2. **구현**: 섹션이 2~3개면 수동, 4개 이상이면 `/agent-team`
3. **`/minos`**: 기능 테스트 + 회귀 테스트

**예시**: 결제 기능 추가, 알림 시스템 도입, OAuth 연동

---

### 소형: 버그 수정, 단일 기능

```
구현 → /minos
```

1. **구현**: 직접 코드 작성 (설계 단계 불필요)
2. **`/minos`**: 수정 확인 + 회귀 방지

**예시**: 로그인 버그, 폼 유효성 검증 추가, API 응답 포맷 변경

---

### QA만: 구현은 끝났고 테스트만 필요

```
/minos
```

1. **`/minos`**: 시나리오 자동 생성 → 테스트 → Healer

**예시**: 기존 코드 인수인계 후 품질 확인, 리팩토링 후 회귀 테스트

---

### 전자동: 한 줄 설명으로 전부 끝내기

```
/zeus "할일 관리 앱 만들어줘"
```

1. **`/zeus`**: 설명 파싱 → 설계(zephermine) → 구현(agent-team/workpm) → 감리(argos) → Docker → 테스트(minos) → 증거 보고의 **Phase 0~6**을 zero-interaction으로 실행

Hermes, Athena, Clio는 필요할 때 독립 호출하는 진입점이며 Zeus가 암묵적으로 실행하지 않습니다.

AskUserQuestion 호출 없이 자동 응답 테이블로 모든 결정을 처리합니다.

**예시**: 빠른 프로토타입, 해커톤, "일단 돌아가는 것" 확인

---

## Phase 1: 설계 — `/zephermine`

**언제 쓰나**: 요구사항이 모호하거나, 여러 기능이 엮여 있을 때

```
/zephermine "온라인 서점 만들어줘"
```

### 사용되는 리소스

| 종류 | 이름 | 역할 |
|------|------|------|
| **스킬** | zephermine | 26단계 워크플로우 (리서치→인터뷰→스펙→6전문가 검토→계획→DB/API/도면→섹션→검증) |
| **네이티브 역할** | `read-only-analysis` | 기존 코드·문서 분석만 수행하고 파일은 쓰지 않음 |
| **네이티브 역할** | `artifact-writer` | UX/Architecture/Red Team/Domain Research/Domain Process/Domain Technical의 고유 산출물 1개만 작성 |
| **Main/Lead** | 통합 소유자 | `team-review.md`, 도메인사전 병합, 공유 상태와 완료 판정을 단독 소유 |
| **MCP** | Tavily | 웹 리서치 (기술 트렌드, 경쟁사 분석) |
| **MCP** | Exa | 코드 스니펫 검색 (구현 패턴, API 사용법) |
| **외부 리뷰 프로세스** | Codex / Antigravity CLI | 설치되고 해당 provider 실행이 가능할 때만 독립 도메인 분석에 사용; 실패·부재 시 현재 런타임의 `artifact-writer`, 이어서 Main 순차 실행으로 폴백 |

의미 역할은 Claude `Explore`/`general-purpose`, Codex `explorer`/`worker`, Antigravity
`research`/Main 또는 명시적으로 정의한 쓰기 에이전트, Grok `explore`/`general-purpose`로 매핑합니다. provider 이름을
역할처럼 하드코딩하지 않으며, 외부 CLI 프로세스와 현재 런타임의 네이티브 위임을 구분합니다.

### 산출물

| 파일 | 내용 | 다음 Phase에서 소비 |
|------|------|-------------------|
| `spec.md` | 설계 스펙 (기능, 비기능, 제약사항) | 아키텍처 검토, 개발자 |
| `plan.md` | 구현 계획 (섹션 분할 근거) | agent-team, workpm |
| `domain-process-analysis.md` | 업무 흐름표 (역할/CRUD/입출력/예외) | 개발자 (API 설계 근거) |
| `domain-technical-analysis.md` | 기술 스택 매핑 (연동/규제/솔루션) | 아키텍처 검토, 개발자 |
| `qa-scenarios.md` | QA 테스트 시나리오 | minos |
| `db-schema.md` | DB 스키마 (ERD + DDL + 설계 근거) | 아키텍처 검토, 개발자, api-spec |
| `api-spec.md` | API 엔드포인트 명세 | 프론트/백엔드, minos |
| `sections/index.md` | 섹션 의존성 그래프 | agent-team (Wave 계획) |

### 건너뛸 때

- 요구사항이 명확하고 단순할 때
- 이미 상세 기획서가 있을 때
- 버그 수정이나 리팩토링일 때

---

## Phase 1.5: 아키텍처 — 네이티브 검토 + source-only 직접 로드

**언제 쓰나**: 기술 스택 선정, 확장성 설계, 큰 구조 결정이 필요할 때

```
이 스펙 기반으로 아키텍처 설계해줘
@spec.md
```

### 사용되는 리소스

| 종류 | 이름 | 역할 |
|------|------|------|
| **네이티브 기능** | 계획·검토 | 프로젝트 제약을 근거로 대안·트레이드오프·경계 검증 |
| **source-only 모듈** | documentation-and-adrs | 카탈로그에서 직접 읽어 선택된 결정을 ADR로 기록하고 변경 이력 관리 |
| **source-only 모듈** | mermaid-diagrams | 카탈로그에서 직접 읽어 아키텍처 다이어그램 시각화 |
| **source-only 모듈** | database-schema-designer | 카탈로그에서 직접 읽어 DB-First 스키마 설계, ERD, DDL 작성 |

### 산출물

- ADR (Architecture Decision Record)
- 기술 스택 평가 매트릭스
- 시스템 아키텍처 다이어그램
- `db-schema.md` (ERD + DDL + 설계 근거)

### 건너뛸 때

- 기존 프로젝트에 기능 추가 (아키텍처 이미 결정됨)
- 기술 스택이 이미 정해져 있을 때

---

## Phase 2: 구현 — `/agent-team` vs `workpm` vs orchestrator MCP

### 선택 기준

| 기준 | `/agent-team` | `workpm` | orchestrator MCP |
|------|--------------|-----------|-------------|
| **AI 엔진** | 현재 CLI의 네이티브 팀/서브에이전트 | 현재 CLI의 네이티브 팀/서브에이전트 | 여러 CLI를 연결하는 MCP |
| **PM↔Worker** | 런타임 네이티브 통신 | 런타임 네이티브 통신 | 외부 태스크 보드 |
| **장점** | 젭마인 섹션을 Wave로 빠르게 구현 | 사전 설계 없이 PM이 탐색부터 검증까지 진행 | hard lock, 혼합 CLI, 외부 상태 공유 |
| **단점** | sections 산출물이 필요 | PM 오버헤드가 있음 | 별도 서버 설정과 태스크 기반 통신 필요 |
| **적합** | 젭마인 섹션 기반 | 바로 구현할 요청 | 네이티브로 처리하기 어려운 대규모 혼합 작업 |
| **입력** | sections/index.md | 사용자 지시 | 사용자 지시 |
| **병렬** | Wave 기반 | PM이 독립 작업만 분배 | 외부 보드에서 분배 |

읽기 전용 탐색은 Claude `Explore` / Codex `explorer` / Antigravity `research` / Grok `explore`, 파일 변경과 명령 실행은 Claude `general-purpose` / Codex `worker` / Antigravity Main 또는 명시적으로 정의한 쓰기 에이전트 / Grok `general-purpose`로 매핑합니다. 메인 컨텍스트가 공유 장부와 완료 판정을 소유하고, 위임이 없거나 병렬 이득이 없으면 같은 절차를 순차 실행합니다.

### `/agent-team` 사용 시 리소스

| 종류 | 이름 | 역할 |
|------|------|------|
| **스킬** | agent-team | Wave 계획, 태스크 분배, 검증 |
| **네이티브 작업자** | 프론트엔드 구현 | package/lockfile·tsconfig·기존 UI 구조·DESIGN.md·테스트 계약 |
| **네이티브 작업자** | Java/Spring 구현 | build manifest·BOM·기존 계층·설정·테스트 계약 |
| **네이티브 작업자** | DB 구현 | 실제 DB 버전·schema·migration 도구·실행 계획·테스트 계약 |
| **스킬** | naming-analyzer | 이름 검토가 필요할 때 명시 호출 |
| **MCP** | Context7 | 라이브러리 문서 실시간 검색 |
| **MCP** | Playwright | E2E 테스트 실행 |

파일 패턴에 따라 네이티브 작업자에게 프로젝트 계약이 자동 매칭됩니다:
- `*.tsx`, `components/**` → package/lockfile·tsconfig·기존 컴포넌트·DESIGN.md·테스트
- `api/**`, `controllers/**` → build manifest·기존 서비스 경계·API 계약·통합 테스트
- `migrations/**`, `*.sql` → 실제 DB 종류·schema·migration 설정·실행 계획
- `*.py` → 네이티브 범용 teammate + 프로젝트 `pyproject.toml`·테스트
- 매칭 안 됨 → 별도 가이드 없는 네이티브 범용 teammate

### `workpm` / 명시적 MCP 모드 사용 시 리소스

| 종류 | 이름 | 역할 |
|------|------|------|
| **스킬** | workpm | 네이티브 PM 흐름, 역할 분배, 검증 |
| **source-only 모듈** | orchestrator | MCP 분기를 선택했을 때만 카탈로그에서 직접 읽는 정책 레이어, 태스크 보드, 파일 락 |
| **커맨드** | workpm | PM 모드 (현재 CLI의 네이티브 작업자, 없으면 메인 순차 실행) |
| **커맨드** | workpm-mcp | hard lock·외부 태스크 보드·혼합 CLI가 필요할 때의 MCP 정책 모드 |
| **커맨드** | pmworker | 명시적 MCP 모드 Worker (Claude/Codex/Antigravity) |
| **MCP** | orchestrator | PM/Worker 간 통신, 태스크 상태 관리 |
| **외부 AI** | Codex/Antigravity CLI | 사용자가 혼합 CLI 실행을 선택했을 때만 명시 provider로 배정 |

---

## Phase 3: 검증 — `/minos`

**언제 쓰나**: 구현이 끝나고 테스트를 자동화하고 싶을 때

```
/minos                           # 자동 감지
/minos @qa-scenarios.md   # 젭마인 QA 문서 지정
/minos --api-only                # API 테스트만
/minos --fix-test-only           # 구현 코드 수정 금지
```

### 사용되는 리소스

| 종류 | 이름 | 역할 |
|------|------|------|
| **스킬** | minos | 7단계 워크플로우 (수집→생성→서버 준비→실행→탐색 QA→Healer→보고) |
| **내장 계약** | Minos Step 1 | 시나리오가 없을 때 프로젝트 근거로 현장 생성 |
| **네이티브 작업자** | 프로젝트 테스트 계약 | 실제 test runner 설정·인접 테스트·빌드 명령 기반 구현·검증 |
| **source-only 모듈** | code-reviewer | 자연어 리뷰 요청 시 카탈로그에서 직접 읽는 코드 품질 정책 |
| **MCP** | Playwright | 브라우저 자동화, E2E 테스트 실행 |

### 입력 소스 (우선순위)

1. `$ARGUMENTS`로 전달된 파일
2. `qa-scenarios.md` (젭마인 산출물)
3. `docs/qa/*.md` (기존 QA 문서)
4. 없으면 프로젝트 분석해서 현장 생성

### 7단계

```
시나리오 수집 → Playwright 코드 생성 → 서버 준비 → 실행 → 브라우저 탐색 QA → Healer 루프 (max 5회) → 보고
```

### 판정

| Grade | 조건 | 의미 |
|-------|------|------|
| **PASS** | 전체 통과 | 배포 가능 |
| **CONDITIONAL** | P0/P1 통과, P2/P3 일부 fixme | 조건부 진행 |
| **FAIL** | P0 또는 P1 실패 | 수정 필수 |

---

## Phase 4: 배포 — 자연어 요청

**언제 쓰나**: QA 통과 후 Docker 기반 배포 환경을 만들 때

```
Docker 배포 환경 만들어줘
```

`docker-deploy`는 기본 활성 slash 진입점이 아닙니다. 위 자연어 요청으로 카탈로그 원본을 직접 읽거나, `--include-source-only-skills`로 활성화한 환경에서만 해당 slash 호출을 사용합니다.

### 사용되는 리소스

| 종류 | 이름 | 역할 |
|------|------|------|
| **source-only 모듈** | docker-deploy | 카탈로그에서 직접 읽어 Dockerfile, docker-compose, install 스크립트 생성 |

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

### 필요할 때 명시적 적용

기본 구현 컨텍스트에는 넣지 않고, 특정 검증이나 참고가 필요할 때 자연어로 요청합니다. 아래 모듈은 모두 source-only이며 카탈로그에서 직접 읽습니다:

| 스킬 | 역할 | 적용 범위 |
|------|------|----------|
| `fullstack-coding-standards` | 4계층 아키텍처, 코딩 규칙 12개 | 사용자가 명시 요청할 때 |
| `code-reviewer` | 기능/책임 단위 분리, DRY, 보안 체크 | 코드 리뷰나 보안 감사를 요청할 때 |
| `react-best-practices` | Vercel React 규칙 | React 규칙 검토를 요청할 때 |
| `naming-analyzer` | 네이밍 분석·대안 제안 | 네이밍 검토를 요청할 때 |

### 문서화 도구

설계~구현 사이에 끼워 넣어 산출물을 만드는 도구:

| 자연어 요청 | 처리 방식 | 용도 | 끼워 넣는 시점 |
|------|------|------|--------------|
| `PRD 작성해줘` | 네이티브 작성 또는 목적별 source-only 모듈 직접 로드 | PRD (요구사항 정의서) 작성 | 설계 전 또는 설계 중 |
| `API 문서 작성해줘` | 네이티브 작성 또는 source-only `api-handoff` 직접 로드 | API 엔드포인트 문서 생성 | 구현 후 |
| `ERD/시퀀스 다이어그램 만들어줘` | source-only `mermaid-diagrams` 직접 로드 | ERD, 시퀀스, 아키텍처 다이어그램 | 설계 중 또는 구현 후 |
| `DB 스키마 설계해줘` | source-only `database-schema-designer` 직접 로드 | DB 스키마 설계 + ERD (DB-First) | 설계 중 (아키텍처 검토 후) |
| `ADR 작성해줘` | source-only `documentation-and-adrs` 직접 로드 | 결정과 변경 이력 기록 | 설계 결정 후 |
| `기존 문서 업데이트해줘` | 네이티브 문서 작업 | 기존 문서 파일 업데이트 | 구현 후 |

### 리뷰 & 유틸리티

| 자연어 요청 | 처리 방식 | 용도 | 끼워 넣는 시점 |
|------|------|------|--------------|
| `코드 리뷰해줘` | CLI 네이티브 리뷰 + 필요 시 source-only `code-reviewer` 직접 로드 | 코드 리뷰 (품질/보안/성능) | 구현 후, QA 전 |
| `보안 감사해줘` | source-only `code-reviewer` 보안 감사 계약 직접 로드 | 시크릿·공급망·CI/CD·코드·STRIDE 감사 | 구현 후, 배포 전 |
| `dead code 정리해줘` | `/hestia` | 코드 정리, dead code 탐지 | 구현 후, 리뷰 전 |
| `레거시 폐기 계획 세워줘` | source-only `deprecation-and-migration` 직접 로드 | 레거시 폐기/마이그레이션 계획 | 구현 후, 리뷰 전 |
| `이 코드 설명해줘` | 네이티브 설명 + 필요 시 `/explain` | 코드 설명 | 아무 때나 |
| `커밋해줘` | 네이티브 Git 흐름 + 필요 시 source-only `commit-work` 직접 로드 | Git 커밋 | 각 Phase 완료 시 |
| `핸드오프 준비해줘` | Mnemo 세션 규칙 | 세션 요약 + MEMORY.md 업데이트 | 세션 종료 시 |

### 보조 도구를 끼워 넣은 풀 파이프라인

```
/zephermine
  ├─ "PRD 작성해줘" (요구사항 정리가 필요하면)
  ├─ "ERD 만들어줘" (source-only 직접 로드)
  └─ "DB 스키마 설계해줘" (source-only 직접 로드)
     ↓
 "아키텍처를 검토하고 ADR로 기록해줘"
     ↓
 /agent-team
  └─ (파일 패턴별 프로젝트 계약을 현재 CLI의 네이티브 작업자에 배정)
     ↓
 "코드 리뷰와 보안 감사해줘"
     ↓
 /minos
     ↓
 "Docker 배포 환경 만들어줘"
     ↓
 "API 문서 작성하고 기존 문서 업데이트해줘"
     ↓
 "커밋해줘" → "핸드오프 준비해줘"
```

---

## 실전 예시

### 예시 1: 온라인 서점 신규 개발 (풀 코스)

```bash
# 1. 설계
/zephermine "온라인 서점 만들어줘"
# → 인터뷰 20분 → 스펙 + QA + API 명세 + 12개 섹션
# 사용: zephermine 내장 인터뷰, 네이티브 탐색, Tavily, Exa

# 2. 아키텍처
# "아키텍처를 검토하고 ADR로 기록해줘"라고 요청해 @spec.md의 제약과 후보 비교
# → Next.js + Spring Boot + PostgreSQL 결정 근거 보존
# 사용: 네이티브 검토 + source-only documentation-and-adrs, mermaid-diagrams, database-schema-designer 직접 로드

# 3. 구현
/agent-team
# → sections/ 자동 파싱 → Wave 3개 → teammate 10명 병렬
# 사용: 네이티브 구현 작업자, 프로젝트 설정·인접 코드·테스트, 필요 시 Context7

# 4. 검증
/minos
# → qa-scenarios.md 45개 시나리오 → Playwright 실행
# → Healer 2회 수정 → PASS (43/45 즉시 통과, 2개 수정 후 통과)
# 사용: Minos 내장 판정 계약, 프로젝트 테스트 설정, Playwright MCP

# 5. 배포
Docker 배포 환경 만들어줘
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
# 프로젝트 build manifest와 기존 경계를 읽는 네이티브 구현

# 3. 검증
/minos --api-only
# → 결제 API 12개 시나리오 → 실행 → PASS
```

### 예시 3: 로그인 버그 수정

```bash
# 설계 건너뜀, 바로 수정
# 버그 수정 후:

/minos
# → 인증 관련 시나리오 자동 생성 → 실행 → PASS

커밋해줘
# → 변경사항 분석 → 커밋
```

---

## 관련 문서

| 문서 | 내용 |
|------|------|
| [quickstart.md](quickstart.md) | 설치 및 빠른 시작 |
| [schema-design-workflow.md](schema-design-workflow.md) | 스키마 설계 워크플로우 상세 |
| [AGENTS.md](../AGENTS.md) | 에이전트/스킬 전체 목록 + Recommended Workflows |
| [QUICK-REFERENCE.md](../QUICK-REFERENCE.md) | 외부 리소스 포함 전체 참조 |
| [skills/zeus/](../skills/zeus/) | 제우스 Phase 0~6 전자동 파이프라인 (파싱→설계→구현→감리→Docker→테스트→증거 보고) |
| [skills/zephermine/](../skills/zephermine/) | 젭마인 설계 스킬 |
| [skills/agent-team/](../skills/agent-team/) | 4-CLI 네이티브 역할 기반 병렬 실행 |
| [skills/orchestrator/](../skills/orchestrator/) | hard lock·외부 보드·cross-CLI용 MCP 정책 레이어 |
| [skills/minos/](../skills/minos/) | QA 자동 테스트 + Healer |
| [skills/docker-deploy/](../skills/docker-deploy/) | Docker 배포 환경 생성 |
