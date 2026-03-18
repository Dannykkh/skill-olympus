---
name: zeus
description: >
  Zero-interaction full pipeline skill. 사용자가 한 줄 설명만 제공하면
  설계(zephermine) → 구현(agent-team) → 감리(argos) → Docker 구성 → 테스트(qpassenger) 전체를 자동 완료.
  AskUserQuestion 절대 호출 금지. /zeus로 실행. 제우스.
triggers:
  - "zeus"
  - "제우스"
auto_apply: false
---

# Zeus (제우스) — Zero-Interaction Full Pipeline

> "이런 프로그램 만들어줘" 한 줄이면 설계부터 구현, 테스트까지 전부 자동으로.

---

## Pipeline Overview

```
/zeus "쇼핑몰 만들어줘. React+Spring Boot"
    │
    ▼
Phase 0: Description Parsing ─── 산업군, 기술스택, 기능 추출
    │
    ▼
Phase 1: Planning (zephermine) ─ 합성 인터뷰 → 26단계 설계 자동 완료
    │
    ▼
Phase 2: Implementation (agent-team) ─ 대니즈팀 PM이 섹션 기반 병렬 구현
    │
    ▼
Phase 3: Verification (argos) ─ 설계 대비 준공검사
    │
    ▼
Phase 4: Docker Setup (docker-deploy) ─ Docker 환경 구성 + 포트 충돌 해결
    │
    ▼
Phase 5: Testing (qpassenger) ─ E2E 테스트 + Healer 루프
    │
    ▼
Phase 6: Final Report ─────────── docs/zeus/zeus-report.md 생성
```

---

## CRITICAL RULES

1. **NEVER call AskUserQuestion** — 모든 결정은 자동선택 규칙으로 처리 (`Recommended` 우선, 없으면 자동 응답 테이블)
2. **절대 멈추지 않는다** — 에러 시 기록하고 계속 진행
3. **Phase 완료 즉시 다음 Phase 시작** — "다음을 진행합니다" 같은 중간 보고 금지. Phase 0→1→2→3→4→5→6을 한 턴에 연속 실행
4. **[ZEUS-AUTO] 태그** — 자동 결정에는 반드시 태그 표시
5. **재개 지원** — docs/zeus/zeus-state.json으로 중단 지점부터 재개
6. **모든 Phase 강제 실행** — Phase 0~6 모두 최소 1회 실행 시도 필수. "건너뜀"은 물리적 불가(Docker 미설치 등)일 때만 허용하며, 그 경우에도 폴백 경로를 실행

### 실행 보장 게이트 (Phase 6 시작 전 필수)

모든 Phase의 실행 증거가 있어야 Phase 6를 시작할 수 있습니다:

- Phase 1: `plan.md` 존재
- Phase 2: `docs/zeus/zeus-log.md`에 agent-team 실행 기록 (마스터 체크리스트 통과율)
- Phase 3: `docs/zeus/zeus-log.md`에 argos 실행 기록 (최소 정적 분석)
- Phase 4: `docs/zeus/zeus-log.md`에 Docker/dev-server 시도 기록
- Phase 5: QA 결과 파일 또는 `docs/zeus/zeus-log.md`에 qpassenger 실행 기록

위 중 하나라도 없으면 Phase 6을 시작하지 말고, 누락된 phase를 먼저 실행.
컨텍스트가 부족하여 누락 phase 실행이 불가능하면: `zeus-state.json`의 `currentPhase`를 누락 phase로 설정하고 핸드오프.

### 컨텍스트 보전 규칙

- Phase 2 완료 후 컨텍스트가 80% 이상 사용되었다면, **Phase 3~6을 다음 세션으로 위임**:
  1. `docs/zeus/zeus-state.json`에 `currentPhase: "verification"` 저장
  2. 핸드오프 파일 생성
  3. 사용자에게 "`/zeus`를 다시 실행하면 Phase 3(감리)부터 재개됩니다" 안내
- **Phase 6(리포트)만 먼저 작성하고 Phase 3~5를 건너뛰는 것은 금지**

---

## Phase 0: Description Parsing

사용자 한 줄 설명에서 구조화된 데이터 추출.

**절차:**
1. 사용자 입력 원문 저장
2. **산업군 매칭**: 키워드 테이블로 산업군 판별 (쇼핑몰→ecommerce, 병원→healthcare 등)
3. **기술스택 추출**: 정규식으로 frontend/backend/db/mobile 추출
4. **DB 추론**: 미명시 시 백엔드에서 추론 (Spring Boot→PostgreSQL 등)
5. **기능 목록 생성**: 산업별 기본 기능 세트 + 설명에서 명시된 기능
6. **프로젝트 타입 판별**: fullstack-web / api-only / static-site / cli / mobile / library
7. **프로젝트명 추론**: 핵심 명사 → kebab-case

**상세 파싱 규칙**: [references/description-parser.md](references/description-parser.md)

파싱 결과 예시:
```
입력: "쇼핑몰 만들어줘. React+Spring Boot"
→ industry: "ecommerce"
→ techStack: { frontend: "React", backend: "Spring Boot", db: "PostgreSQL" }
→ features: ["상품관리", "장바구니", "결제", "주문", "회원", "검색", "리뷰"]
→ projectType: "fullstack-web"
→ projectName: "shopping-mall"
```

**이전 실행 아카이브**: Phase 0의 첫 번째 동작으로 이전 산출물을 타임스탬프 디렉토리로 이동합니다.
[상세 아카이브 절차 → references/archive-procedure.md](references/archive-procedure.md)

파싱 완료 시 `docs/zeus/zeus-state.json` 생성 (재개 지원용).
**상세 스키마**: [references/phase-transitions.md](references/phase-transitions.md)

---

## Phase 1: Planning (zephermine 26단계)

zephermine SKILL.md를 읽고 26단계를 따르되, **모든 AskUserQuestion을 자동선택으로 대체**.

**AskUserQuestion 자동선택 규칙 (Recommended First):**
1. 질문 옵션에 `(Recommended)` 라벨이 있으면 해당 옵션을 자동 선택
2. multiSelect 질문이면 `(Recommended)` 옵션을 모두 선택
3. `(Recommended)` 옵션이 없으면 아래 자동 응답 테이블의 단계별 기본값 사용
4. 모든 자동 선택 결과는 `[ZEUS-AUTO]` 태그로 로그 기록

**자동 응답 테이블 (Fallback)**: [references/auto-interview-generator.md](references/auto-interview-generator.md) 참조

- zephermine: 코드 리서치(코드 있으면 YES), GitHub 유사 프로젝트(YES), 웹 리서치(ALL)
- zephermine Step 6: **합성 트랜스크립트 생성** / Step 9: **셀프 리뷰** / Step 12~13: 수용+즉시 승인
- zephermine Step 21~22: SKILLS-CATALOG.md 참조, 추가 설치 불필요 (글로벌 스킬)
- argos: 결과 즉시 승인 / agent-team: Wave Plan 즉시 실행, 실패 섹션 재시도
- qpassenger: 전체 시나리오, docker-compose 우선, 없으면 dev server 자동 실행

**Step 6 합성 인터뷰 생성**: Phase 0 파싱 결과 + 산업별 프리셋 조합으로 A~G 카테고리 질문-답변 쌍 자동 생성.
[생성 로직 → references/auto-interview-generator.md](references/auto-interview-generator.md)
[산업별 프리셋 → references/autopilot-defaults.md](references/autopilot-defaults.md)

**Phase 1 완료 조건:**
- `plan.md` 존재
- `sections/` 디렉토리에 1개 이상 섹션 파일 존재

---

## Phase 2: Implementation (대니즈팀 → 다이달로스 폴백)

구현 도구를 자동 선택합니다:

```
Phase 1 완료 (plan.md + sections/ + flow-diagrams/)
    ▼
TeamCreate 도구 사용 가능?
  ├── ✅ → 대니즈팀(agent-team / Codex: agent-team-codex) — 섹션 기반 병렬 구현
  └── ❌ → 다이달로스(daedalus) — PM이 직접 리서치 없이 구현 관리
```

**판별 방법**: Phase 2 시작 시 TeamCreate 도구 호출을 시도. 성공하면 대니즈팀, 실패하면 다이달로스.

**경로 A — 대니즈팀** (TeamCreate 사용 가능):
- Claude: `skills/agent-team/SKILL.md` / Codex: `skills/agent-team-codex/SKILL.md`
- Step 0(산출물 검토) → Step 1(index 파싱) → Step 2(Wave Plan, [ZEUS-AUTO] 즉시 "실행") → Step 3~4(Task + Wave) → Step 5(Code Review) → Step 6(체크리스트) → Step 7(Activity Log) → Step 8(Final Report)

**경로 B — 다이달로스** (TeamCreate 사용 불가):
- `skills/orchestrator/commands/workpm.md` Phase 2부터 실행 (젭마인 산출물 이미 있으므로 리서치 단계 건너뜀)

**공통 규칙:**
- PM 원칙 유지: 코딩 금지, 기억 외부화, 체크리스트 완수
- zeus-log.md에 선택된 경로(A/B) + 체크리스트 통과율 + 도면 매칭률 기록

**실패 시 폴백 (Phase 2는 skip 금지):**
- `plan.md` 미생성 → Phase 0 파싱 결과 기반 최소 plan 생성 후 즉시 실행
- `sections/` 미생성 → 최소 1개 통합 섹션 생성 후 단일 구현 실행
- 대니즈팀 teammate 전부 실패 → 다이달로스로 자동 전환
- 다이달로스 subagent도 실패 → 단일 구현 task로 최종 폴백

---

## Phase 3: Verification (argos — 감리)

시공 완료 후 설계 대비 준공검사.

1. `<planning_dir>` 경로를 Phase 1에서 받아서 전달
2. argos Phase 1~5 순차 실행 → `verify-report.md` 생성
3. 검증 결과 자동 승인 (zeus는 무중단)

**폴백 조건 (Phase 3은 skip 금지):**
- 설계 산출물이 없어도 **정적 분석(코드 품질/보안)은 항상 실행**
- 빌드 실패 → 보고서에 기록하고 Phase 4로 진행

---

## Phase 4: Docker Setup (docker-deploy)

테스트 전에 Docker 환경 구성 및 컨테이너 실행.

[상세 절차 및 포트 충돌 해결 스크립트 → references/docker-setup.md](references/docker-setup.md)

**핵심 흐름:**
1. `docker --version` 확인 → 없으면 dev server fallback
2. `docker-compose.yml` 없으면 docker-deploy 스킬 실행 (techStack 참조)
3. 포트 충돌 해결 (Windows: Get-NetTCPConnection, Linux: lsof)
4. `docker compose up -d --build` + 헬스체크 대기 (최대 120초)
5. 실패 시 dev server fallback + zeus-log.md에 기록

---

## Phase 5: Testing (qpassenger)

구현 완료 후 자동 E2E 테스트.

1. `qa-scenarios.md` 존재 확인 (Phase 1에서 생성됨)
2. Playwright 미설치 시 `npx playwright install` 자동 실행
3. qpassenger Step 1~6 실행:
   - Step 3: Phase 4에서 서버 이미 실행 중이면 헬스체크만
   - Step 5: Healer 루프 (최대 5회)
4. 결과 집계

**폴백 조건 (Phase 5는 skip 금지):**
- 서버 시작 불가 → `--api-only` 모드로 qpassenger 실행
- QA 시나리오 미존재 → 프로젝트 구조에서 기본 시나리오 현장 생성 후 실행
- Playwright 설치 실패 → 실패 원인과 재실행 명령을 qpassenger Step 1/2/6로 리포트

---

## Phase 6: Final Report

[리포트 형식 및 결과 판정 기준 → references/final-report-format.md](references/final-report-format.md)

`docs/zeus/zeus-report.md`에 저장. Phase 0~5 실행 증거가 모두 있어야 진입 가능.

---

## Error Handling Policy

**절대 멈추지 않는다 — 기록하고 계속한다.**

| 등급 | 예시 | 대응 |
|------|------|------|
| FATAL | 디스크 쓰기 불가 | 즉시 중단 + 메시지 |
| PHASE_FALLBACK | plan 미생성, 서버 시작 불가 | phase 폴백 경로 실행 + 로그 |
| STEP_RETRY | 개별 task 실패, 테스트 실패 | 1회 재시도 후 실패 내역 기록 |
| RECOVERABLE | 네트워크 타임아웃 | 1회 재시도 후 폴백 |

모든 에러는 `docs/zeus/zeus-log.md`에 타임스탬프와 함께 기록.

---

## Resume Support (재개)

`/zeus` 재실행 시:
1. `docs/zeus/zeus-state.json` 존재 확인
2. 존재하면: 현재 phase 확인 → 해당 phase부터 재개
3. 존재하지 않으면: 새로 시작

**상세 전환 규칙**: [references/phase-transitions.md](references/phase-transitions.md)

---

## Quick Start

```
# 기본 사용
/zeus "할일 관리 앱 만들어줘. React+Express"

# 기술스택 상세 지정
/zeus "병원 예약 시스템. Next.js+FastAPI+PostgreSQL"

# 간단한 요청
/zeus "블로그 만들어줘"
```

---

## Related Files

**Zeus references/**
- [description-parser.md](references/description-parser.md) — 파싱 규칙
- [autopilot-defaults.md](references/autopilot-defaults.md) — 산업별 프리셋
- [auto-interview-generator.md](references/auto-interview-generator.md) — 합성 인터뷰
- [phase-transitions.md](references/phase-transitions.md) — 상태 전환/재개
- [archive-procedure.md](references/archive-procedure.md) — Phase 0 아카이브
- [docker-setup.md](references/docker-setup.md) — Phase 4 Docker 상세
- [final-report-format.md](references/final-report-format.md) — Phase 6 리포트 형식

**외부 스킬 (Phase별 호출)**
- Phase 1: `skills/zephermine/SKILL.md`
- Phase 2 경로 A: `skills/agent-team/SKILL.md` / `skills/agent-team-codex/SKILL.md`
- Phase 2 경로 B: `skills/orchestrator/commands/workpm.md`
- Phase 4: `skills/docker-deploy/SKILL.md`
- Phase 5: `skills/qpassenger/SKILL.md`

---

## Output Artifacts

- Phase 0: `docs/zeus/zeus-state.json` (재개용), `docs/zeus/zeus-log.md` (실행 로그), `docs/zeus/archive/{timestamp}/` (이전 실행 아카이브)
- Phase 1: `interview.md`, `plan.md`, `sections/`, `qa-scenarios.md`
- Phase 6: `docs/zeus/zeus-report.md` (최종 보고서)
