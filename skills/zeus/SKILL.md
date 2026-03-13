---
name: zeus
description: >
  Zero-interaction full pipeline skill. 사용자가 한 줄 설명만 제공하면
  설계(zephermine) → 구현(daedalus) → 감리(argos) → Docker 구성 → 테스트(qpassenger) 전체를 자동 완료.
  workpm은 CLI에 맞게 Agent Teams 또는 MCP-only 경로로 자동 라우팅.
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
Phase 1: Planning (zephermine) ─ 합성 인터뷰 → 24단계 설계 자동 완료
    │
    ▼
Phase 2: Implementation (workpm) ─ 통합 PM 엔트리포인트로 task 분해 → workers 병렬 구현
    │
    ▼
Phase 2.5: Verification (argos) ─ 설계 대비 준공검사
    │
    ▼
Phase 2.7: Docker Setup (docker-deploy) ─ Docker 환경 구성 (있으면 skip)
    │
    ▼
Phase 3: Testing (qpassenger) ─ E2E 테스트 + Healer 루프
    │
    ▼
Phase 4: Final Report ─────────── docs/zeus/zeus-report.md 생성
```

---

## CRITICAL RULES

1. **NEVER call AskUserQuestion** — 모든 결정은 자동선택 규칙으로 처리 (`Recommended` 우선, 없으면 자동 응답 테이블)
2. **절대 멈추지 않는다** — 에러 시 기록하고 계속 진행
3. **Phase 완료 즉시 다음 Phase 시작** — "다음을 진행합니다" 같은 중간 보고 금지. Phase 0→1→2→3→4를 한 턴에 연속 실행
4. **[ZEUS-AUTO] 태그** — 자동 결정에는 반드시 태그 표시
5. **재개 지원** — docs/zeus/zeus-state.json으로 중단 지점부터 재개
6. **핵심 3단계 강제 실행** — Planning(zephermine), Implementation(workpm), Testing(qpassenger)은 실패해도 최소 1회 실행 시도 후 종료

### 실행 보장 게이트 (Phase 4 시작 전 필수 — 이 게이트를 건너뛰면 안 됩니다)

- `claude-plan.md` 존재 (Phase 1 실행 증거)
- `docs/zeus/zeus-log.md`에 workpm task 생성/worker 실행 기록 존재 (Phase 2 실행 증거)
- `docs/zeus/zeus-log.md` 또는 QA 결과 파일에 qpassenger 실행 기록 존재 (Phase 3 실행 증거)
- **위 3개 중 하나라도 없으면 Phase 4를 시작하지 말고, 누락된 phase를 먼저 실행**
- **컨텍스트가 부족하여 누락 phase 실행이 불가능하면**: `docs/zeus/zeus-state.json`의 `currentPhase`를 누락 phase로 설정하고 핸드오프 — 다음 `/zeus` 호출에서 재개되도록 함

### 컨텍스트 보전 규칙

- Phase 2 완료 후 컨텍스트가 80% 이상 사용되었다면, **Phase 3~4를 다음 세션으로 위임**:
  1. `docs/zeus/zeus-state.json`에 `currentPhase: "testing"` 저장
  2. 핸드오프 파일 생성
  3. 사용자에게 "`/zeus`를 다시 실행하면 Phase 3(테스트)부터 재개됩니다" 안내
- **Phase 4(리포트)만 먼저 작성하고 Phase 3을 건너뛰는 것은 금지**

---

## Phase 0: Description Parsing

사용자 한 줄 설명에서 구조화된 데이터 추출.

### 절차

1. 사용자 입력 원문 저장
2. **산업군 매칭**: 키워드 테이블로 산업군 판별 (쇼핑몰→ecommerce, 병원→healthcare 등)
3. **기술스택 추출**: 정규식으로 frontend/backend/db/mobile 추출
4. **DB 추론**: 미명시 시 백엔드에서 추론 (Spring Boot→PostgreSQL 등)
5. **기능 목록 생성**: 산업별 기본 기능 세트 + 설명에서 명시된 기능
6. **프로젝트 타입 판별**: fullstack-web / api-only / static-site / cli / mobile / library
7. **프로젝트명 추론**: 핵심 명사 → kebab-case

**상세 규칙**: [references/description-parser.md](references/description-parser.md)

### 파싱 결과 예시

```
입력: "쇼핑몰 만들어줘. React+Spring Boot"
→ industry: "ecommerce"
→ techStack: { frontend: "React", backend: "Spring Boot", db: "PostgreSQL" }
→ features: ["상품관리", "장바구니", "결제", "주문", "회원", "검색", "리뷰"]
→ projectType: "fullstack-web"
→ projectName: "shopping-mall"
```

### 출력 디렉토리 초기화

파싱 시작 시 출력 디렉토리를 생성합니다:
```bash
mkdir -p docs/zeus
```

### docs/zeus/zeus-state.json 초기화

파싱 완료 시 `docs/zeus/zeus-state.json` 생성 (재개 지원용).
**상세 스키마**: [references/phase-transitions.md](references/phase-transitions.md)

---

## Phase 1: Planning (zephermine 24단계)

zephermine SKILL.md를 읽고 24단계를 따르되, **모든 AskUserQuestion을 자동선택으로 대체**.

### AskUserQuestion 자동선택 규칙 (Recommended First)

1. 질문 옵션에 `(Recommended)` 라벨이 있으면 해당 옵션을 자동 선택
2. multiSelect 질문이면 `(Recommended)` 옵션을 모두 선택
3. `(Recommended)` 옵션이 없으면 아래 자동 응답 테이블의 단계별 기본값 사용
4. 모든 자동 선택 결과는 `[ZEUS-AUTO]` 태그로 로그 기록

### Step 1~5: 리서치 단계

- Step 1~3: 초기화, 프로젝트 디렉토리 설정 → **그대로 실행**
- Step 4.2 (코드베이스 리서치?): 코드 파일 존재하면 YES, 없으면 NO
- Step 4.3 (GitHub 유사 프로젝트?): **YES** → WebSearch로 유사 프로젝트 검색
- Step 4.4 (웹 리서치 토픽?): **ALL** 선택

### Step 6: 인터뷰 — 합성 트랜스크립트 자동 생성

**이것이 Zeus의 핵심 차별점.**

AskUserQuestion 대신 합성 인터뷰를 자동 생성:

1. Phase 0 파싱 결과 + 산업별 프리셋 조합
2. A~G 카테고리 질문-답변 쌍을 템플릿으로 생성
3. 모든 답변에 `[ZEUS-AUTO]` 태그
4. `claude-interview.md`에 저장

**산업별 프리셋**: [references/autopilot-defaults.md](references/autopilot-defaults.md)
**생성 로직**: [references/auto-interview-generator.md](references/auto-interview-generator.md)

### Step 7~11: 분석 & 스펙 작성

- Step 7 (도메인 전문가 분석): **그대로 실행** (Claude가 WebSearch로 수행)
- Step 8 (스펙 작성): **그대로 실행**
- Step 9 (팀 리뷰): **건너뜀** (컨텍스트 절약, docs/zeus/zeus-log.md에 "[ZEUS-AUTO] Step 9 건너뜀" 기록)
- Step 10~11: **그대로 실행**

### Step 12~13: 피드백 & 승인

- Step 12 (외부 피드백 통합?): **전부 수용**
- Step 13 (계획 리뷰 완료?): **즉시 승인**

### Step 14~24: 산출물 생성

- Step 14 (DB 스키마): **그대로 실행** (hasDB=true일 때)
- Step 15 (API 스펙): **그대로 실행** (hasAPI=true일 때)
- Step 16~20: **그대로 실행** (섹션 분리, 디자인 시스템 등)
- Step 21 (스킬 탐색): **건너뜀** (외부 스킬 설치 불필요)
- Step 22 (스킬 설치?): **건너뜀**

> 감리(검증)는 Phase 2 완료 후 `/argos`로 독립 실행됩니다.

### Phase 1 완료 조건

- `claude-plan.md` 존재
- `sections/` 디렉토리에 1개 이상 섹션 파일 존재

---

## AskUserQuestion 자동 응답 테이블 (Fallback)

| 스킬 | 단계 | 질문 | 자동 응답 |
|------|------|------|----------|
| zephermine | Step 4.2 | 코드베이스 리서치? | 코드 있으면 YES, 없으면 NO |
| zephermine | Step 4.3 | GitHub 유사 프로젝트? | YES |
| zephermine | Step 4.4 | 웹 리서치 토픽? | ALL 선택 |
| zephermine | Step 6 | 인터뷰 (A~G) | **합성 트랜스크립트 생성** |
| zephermine | Step 9 | 팀 리뷰? | **건너뜀** |
| zephermine | Step 12 | 외부 피드백? | 전부 수용 |
| zephermine | Step 13 | 계획 리뷰? | 즉시 승인 |
| zephermine | Step 21 | 외부 스킬? | 건너뜀 |
| zephermine | Step 22 | 스킬 설치? | 건너뜀 |
| argos | 결과 보고 | 검증 결과? | 즉시 승인 |
| workpm | 시작 | AI provider 선택? | 자동 감지 |
| qpassenger | 시작 | 테스트 범위? | 전체 시나리오 |
| qpassenger | Step 3 | Workers 수 조정? | 기본값 50% 유지 |
| qpassenger | Step 3 | 서버 미실행 시 대기/입력 요청 | docker-compose 우선, 없으면 dev server 자동 실행 |

---

## Phase 2: Implementation (Daedalus — 현장감독 PM)

zephermine이 생성한 plan을 `daedalus(workpm)` 통합 엔트리포인트로 구현합니다.

- Claude: Agent Teams 기반 `daedalus`
- Codex/Gemini: MCP-only `workpm-mcp` 경로로 자동 라우팅

### 연결 흐름

```
Phase 1 완료
    │  claude-plan.md + sections/ 생성됨
    ▼
1. claude-plan.md → .claude/plans/zeus-{projectName}.md 로 복사
    │  (orchestrator_get_latest_plan이 자동 감지)
    ▼
2. orchestrator_detect_providers 호출
    │  설치된 AI CLI 확인 (claude, codex, gemini)
    ▼
3. orchestrator_analyze_codebase 호출
    │  프로젝트 구조 분석
    ▼
4. sections/ 기반으로 orchestrator_create_task 반복 호출
    │  각 섹션 = 1 task, depends_on으로 의존성 설정
    │  scope: 섹션의 "Files to Create/Modify" 목록
    │  ai_provider: 파일 패턴으로 자동 매칭
    ▼
5. orchestrator_spawn_workers({ count: 2~3 }) 호출
    │  Workers가 자동으로 task claim → 구현 → complete
    ▼
6. orchestrator_get_progress 폴링 (30초 간격, 최대 30분)
    │  전체 완료 시 Phase 3으로 전환
    ▼
7. 실패 task 있으면 1회 재생성 후 재시도
```

### AI Provider 자동 매칭

| 파일 패턴 | 추천 AI | 이유 |
|-----------|---------|------|
| *.tsx, *.jsx, components/** | claude | UI 컴포넌트 생성 강점 |
| *.java, *.kt, api/** | codex (있으면) | 코드 생성 빠름 |
| *.sql, migrations/** | claude | 스키마 정확도 |
| *.md, docs/** | claude | 문서 품질 |
| 기본값 | claude | 범용 |

### Task 설계 원칙

Workers는 PM과 대화할 수 없으므로 task 프롬프트가 완전해야 함:
- 목표 (한 문장)
- 구현 항목 목록
- 입출력 사양
- 성공 기준
- 범위 밖 항목

### 실패 시 폴백 (Phase 2는 skip 금지)

- `claude-plan.md` 미생성 시: Phase 0/인터뷰 산출물 기반 최소 plan을 생성 후 즉시 workpm 실행
- `sections/` 미생성 시: 최소 1개 통합 섹션을 생성하고 단일 task로 실행
- worker 전부 실패 시: 실패 task를 1회 재생성 후 재시도, 그래도 실패면 단일 구현 task로 폴백

---

## Phase 2.5: Verification (argos — 감리)

시공 완료 후 설계 대비 준공검사.

### 절차

1. `<planning_dir>` 경로를 Phase 1에서 받아서 전달
2. argos 워크플로우 실행:
   - Phase 1~5 (정적/런타임/API/QA/도면) 순차 실행
   - 결과 → `claude-verify-report.md`
3. 검증 결과 자동 승인 (zeus는 무중단)

### 폴백 조건

- 설계 산출물(`claude-spec.md`, `claude-plan.md`, `sections/`) **모두** 미존재 → Phase 2.5 건너뜀 (감리 불가)
- 위 파일 중 **하나라도** 존재하면 Phase 2.5 실행 (argos는 존재하는 산출물만 대조)
- 빌드 실패 → 보고서에 기록하고 Phase 3으로 진행 (qpassenger가 추가 검증)

---

## Phase 2.7: Docker Setup (docker-deploy)

테스트 전에 Docker 환경을 구성하고 컨테이너를 실행합니다. DB 등 인프라 의존성을 포함한 통합 환경을 제공합니다.

### 절차

```
1. Docker 설치 확인
   ├── docker --version 성공 → 계속
   └── 실패 → Phase 2.7 건너뜀 (Phase 3에서 dev server fallback)

2. docker-compose.yml 존재 확인
   ├── 있음 → Step 3 건너뛰고 Step 4로
   └── 없음 → docker-deploy 스킬 실행

3. docker-deploy 스킬 실행 (파일 생성)
   - Phase 0 파싱 결과의 techStack 참조
   - Dockerfile + docker-compose.yml 생성
   - DB 컨테이너 포함 (PostgreSQL, MySQL 등)
   - 포트 매핑: playwright.config.ts baseURL과 일치하도록 설정

4. 포트 충돌 해결
   - docker-compose.yml에서 외부 포트 추출 (ports: "HOST:CONTAINER")
   - 각 외부 포트에 대해 점유 프로세스 확인 + 종료
   - Windows: Get-NetTCPConnection → Stop-Process
   - Linux/Mac: lsof -ti:{PORT} | xargs kill -9

5. 컨테이너 실행
   - docker compose down --remove-orphans 2>/dev/null
   - docker compose up -d --build
   - 헬스체크 대기 (최대 120초, 2초 간격)
   - 실패 시 docker compose logs로 원인 확인

6. 실행 확인
   ├── 헬스체크 통과 → Phase 3로 진행 (서버 이미 실행 중)
   └── 실패 → 포트 재확인 → 1회 재시도 → 그래도 실패 시 로그 기록
```

### 포트 충돌 해결 상세

```bash
# docker-compose.yml에서 외부 포트 추출
# 예: ports: ["3000:3000", "5432:5432"] → 3000, 5432

# Windows
powershell -Command "
  @(3000, 5432, 8080) | ForEach-Object {
    \$port = \$_
    Get-NetTCPConnection -LocalPort \$port -ErrorAction SilentlyContinue |
      ForEach-Object { Stop-Process -Id \$_.OwningProcess -Force }
  }
"

# Linux/Mac
for port in 3000 5432 8080; do
  lsof -ti:$port | xargs kill -9 2>/dev/null
done
```

### 폴백 조건

- Docker 미설치 → 건너뜀 (qpassenger가 dev server로 fallback)
- docker-deploy 스킬 실패 → 로그 기록 후 Phase 3으로 진행
- 포트 충돌 해결 불가 (권한 부족 등) → 로그 기록 + Phase 3에서 재시도
- 컨테이너 실행 실패 → docker compose logs 기록 후 dev server fallback

---

## Phase 3: Testing (qpassenger)

구현 완료 후 자동 E2E 테스트.

### 절차

1. `claude-qa-scenarios.md` 존재 확인 (Phase 1에서 생성됨)
2. Playwright 미설치 시 `npx playwright install` 자동 실행
3. qpassenger 워크플로우 실행:
   - Step 1: 시나리오 수집
   - Step 2: Playwright 코드 생성
   - Step 3: 서버 준비 (Phase 2.7에서 이미 실행 중이면 헬스체크만 → skip)
   - Step 4: 테스트 실행
   - Step 5: Healer 루프 (최대 5회)
   - Step 6: 결과 보고 + 서버 정리
4. 결과 집계

### 폴백 조건 (Phase 3는 skip 금지)

- 서버 시작 불가 → `--api-only` 모드로 qpassenger 실행 시도
- QA 시나리오 미존재 → 프로젝트 구조에서 기본 시나리오를 현장 생성 후 실행
- Playwright 설치 실패 → 설치 오류를 기록하고 qpassenger Step 1/2/6을 실행해 실패 원인과 재실행 명령까지 리포트

---

## Phase 4: Final Report (docs/zeus/zeus-report.md)

### ⚠️ Phase 4 진입 조건 (필수)

Phase 4를 시작하기 전에 **반드시** 아래 3개 증거를 확인하세요:

1. ✅ `claude-plan.md` 존재? → 없으면 Phase 1 폴백 실행
2. ✅ `docs/zeus/zeus-log.md`에 workpm 기록? → 없으면 Phase 2 폴백 실행
3. ✅ qpassenger 실행 기록(QA 결과 파일 또는 로그)? → 없으면 Phase 3 실행

**3번이 없는 상태에서 리포트를 작성하는 것은 금지입니다.**
컨텍스트가 부족하면 `zeus-state.json`에 `currentPhase: "testing"`을 저장하고 핸드오프하세요.

### 리포트 형식

```markdown
# Zeus Report
- 입력: "{원본 설명}"
- 총 소요: {duration}
- 결과: SUCCESS / PARTIAL / FAILED

## Phase 0: Description Parsing — ✅
- 산업군: {industry}
- 기술스택: {techStack}
- 기능: {features.length}개

## Phase 1: Planning — ✅ / ❌
- 섹션: N개, 에러: N건

## Phase 2: Implementation (workpm) — ✅ / ❌
- Tasks: N개, 성공: N, 실패: N
- Workers: {provider별 수}
- 생성 파일: N개

## Phase 2.5: Verification (argos) — ✅ / ⚠️ / 건너뜀
- 검증 항목: N개, 통과: N, 미통과: N

## Phase 2.7: Docker Setup — ✅ / 건너뜀
- 모드: {Docker / Dev Server / 없음}

## Phase 3: Testing — ✅ / ⚠️ 폴백 실행 / ❌
- 통과: N, 실패: N, 통과율: N%

## Errors & Recovery
| Phase | Step | Error | Recovery |
|-------|------|-------|----------|
| ... | ... | ... | ... |

## Next Steps
- [ ] docs/zeus/zeus-report.md 검토
- [ ] 자동 생성 코드 리뷰
- [ ] git commit && push
- [ ] /docker-deploy (배포 시)
```

### 결과 판정

| 조건 | 결과 |
|------|------|
| Phase 1~3 모두 성공 | SUCCESS |
| Phase 2 또는 3 일부 실패 | PARTIAL |
| FATAL 에러로 중단 | FAILED |

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

| 파일 | 역할 |
|------|------|
| `skills/zeus/SKILL.md` | 메인 오케스트레이션 (이 파일) |
| `skills/zeus/commands/zeus.md` | /zeus 슬래시 명령어 |
| `skills/zeus/references/description-parser.md` | 설명문 파싱 규칙 |
| `skills/zeus/references/autopilot-defaults.md` | 산업별 기본값 프리셋 |
| `skills/zeus/references/auto-interview-generator.md` | 합성 인터뷰 생성 |
| `skills/zeus/references/phase-transitions.md` | 상태 전환/재개 규칙 |
| `skills/zephermine/SKILL.md` | Phase 1에서 호출 (설계) |
| `skills/orchestrator/` | Phase 2에서 호출 (구현) |
| `skills/docker-deploy/SKILL.md` | Phase 2.7에서 호출 (Docker 환경 구성) |
| `skills/qpassenger/SKILL.md` | Phase 3에서 호출 (테스트) |
| `hooks/orchestrator-detector.js` | zeus 키워드 감지 훅 |

---

## Output Artifacts

| 파일 | 생성 시점 | 설명 |
|------|-----------|------|
| `docs/zeus/zeus-state.json` | Phase 0 | 상태 파일 (재개용) |
| `docs/zeus/zeus-log.md` | Phase 0~ | 실행 로그 |
| `claude-interview.md` | Phase 1 | 합성 인터뷰 |
| `claude-plan.md` | Phase 1 | 구현 계획 |
| `sections/` | Phase 1 | 섹션별 상세 스펙 |
| `claude-qa-scenarios.md` | Phase 1 | QA 시나리오 |
| `docs/zeus/zeus-report.md` | Phase 4 | 최종 보고서 |
