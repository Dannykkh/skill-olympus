# Phase Transitions - 페이즈 전환/상태 관리

Zeus 파이프라인의 7단계(Phase 0~6) 전환 규칙과 상태 관리.

---

## 상태 파일: docs/zeus/zeus-state.json

대상 프로젝트의 절대 `project_root`를 시작 시 고정하고 `<project_root>/docs/zeus/zeus-state.json`에 저장한다.
`planning_dir`는 설계 산출물 위치이며 상태 파일 루트가 아니다. 아래 모든 `docs/zeus/...` 경로도
`project_root` 기준이다. 기존 실행 확인은 Phase 0 아카이브보다 먼저 수행한다.

```json
{
  "version": 2,
  "description": "쇼핑몰 만들어줘. React+Spring Boot",
  "startedAt": "2026-02-20T10:00:00Z",
  "currentPhase": "planning",
  "phases": {
    "parsing":        { "status": "completed", "completedAt": "...", "result": {} },
    "planning":       { "status": "in_progress", "step": 14, "errors": [] },
    "implementation": { "status": "pending" },
    "verification":   { "status": "pending" },
    "docker":         { "status": "pending" },
    "testing":        { "status": "pending" },
    "report":         { "status": "pending" }
  },
  "errors": [],
  "artifacts": {
    "interview": "interview.md",
    "plan": "plan.md",
    "sections": "sections/",
    "verifyReport": "verify-report.md",
    "qaScenarios": "qa-scenarios.md",
    "report": "docs/zeus/zeus-report.md"
  }
}
```

각 Phase의 기존 결과에는 최종 등급·증거 상태와 자식 보고서/수리 이력의 실제 경로를 유지한다.
수리 횟수의 정본은 자식 이력이다. Zeus 로그에는 이슈/AC ID, 할당·사용·남은 예산과 그 출처를
기록하되 새 수리 장부를 만들거나 자식 이력을 초기화하지 않는다.

---

## Phase 매핑

| Phase | 이름 | zeus-state.json 키 | currentPhase 값 |
|-------|------|---------------------|-----------------|
| 0 | Description Parsing | `parsing` | `"parsing"` |
| 1 | Planning (zephermine) | `planning` | `"planning"` |
| 2 | Implementation (agent-team/daedalus) | `implementation` | `"implementation"` |
| 3 | Verification (argos) | `verification` | `"verification"` |
| 4 | Docker Setup (docker-deploy) | `docker` | `"docker"` |
| 5 | Testing (minos) | `testing` | `"testing"` |
| 6 | Final Report | `report` | `"report"` |

---

## 전환 규칙

핵심 원칙: 모든 Phase는 **skip 금지**, 실패 시에도 폴백 경로로 최소 1회 실행 시도.
필수 전제 부재·상태 충돌·예산 소진으로 실행 자체가 불가하면 [종결 보고 규칙](final-report-format.md#phase-6-진입-조건-필수-체크)을 적용하며 미실행을 완료로 바꾸지 않는다.
질문 처리 원칙: 인터랙티브 질문 도구는 호출하지 않고 `(Recommended)` 옵션 우선 자동선택, 미존재 시 fallback 사용.

### Phase 0 → Phase 1 (Parsing → Planning)

**전환 조건:**
- 파싱 결과 객체가 유효 (industry, techStack, features 존재)

**전환 액션:**
1. 파싱 결과를 docs/zeus/zeus-state.json에 저장
2. zephermine SKILL.md 읽기
3. 합성 인터뷰 생성 (auto-interview-generator.md — CPS Gate 구조)

**실패 시:**
- 파싱 불가 → industry="general", features=["CRUD"] 로 폴백
- 절대 멈추지 않음

---

### Phase 1 → Phase 2 (Planning → Implementation)

**전환 조건:**
- `plan.md` 파일 존재
- `sections/` 디렉토리에 1개 이상 섹션 파일 존재

**전환 액션:**
1. 구현 도구 자동 선택 (병렬 팀/서브에이전트 가능 → agent-team 계열, 불가 → daedalus)
2. sections/index.md 파싱 → task 생성

**실패 시:**
- plan 파일 미생성 → 최소 plan 자동 생성 후 진행
- sections 미생성 → 통합 섹션 1개를 생성해 단일 task로 진행

---

### Phase 2 → Phase 3 (Implementation → Verification)

**전환 조건:**
- 구현 도구 완료 확인:
  - agent-team 경로: 완료 또는 남은 실패·차단과 자식 예산 내 시도 결과가 보고됨
  - daedalus 경로: Phase 4(구현) 완료 확인
  - 파일 존재 확인 폴백: `sections/`의 섹션에 해당하는 소스 파일이 1개 이상 존재

**전환 액션:**
1. `<planning_dir>` 경로 확인
2. argos SKILL.md 읽기
3. argos Phase 0~8 실행 (각 Phase의 적용 조건은 argos 정본을 따름)

**실패 시:**
- 전체 task 실패 → docs/zeus/zeus-log.md에 기록 + 정적 분석(코드 품질/보안)만이라도 실행

---

### Phase 3 → Phase 4 (Verification → Docker)

**전환 조건:**
- argos 완료 (PASS/CONDITIONAL/FAIL 무관)

**전환 액션:**
1. argos 최종 등급·미해결 이슈/AC·미실행 범위·수리 이력 경로를 보존한다. 다음 Phase 진입은 PASS 판정이 아니다.
2. Zeus resolver 우선순위(프로젝트 exact → current runtime active root exact → 전역
   `SKILLS-CATALOG.md`의 유일한 행/정확한 `읽을 경로`)로 `docker-deploy`를 읽고
   `docker_deploy_root` 설정
3. 모듈과 `docker_deploy_root` 기준 필수 reference 로드 성공 후 Docker 설치 여부 확인
4. 설치됨 → 로드한 모듈 계약 수행 + 선언된 Compose 산출물 exact 경로를 `compose_file`로 고정해
   `docker compose -f "{compose_file}"`로 컨테이너 실행
5. 미설치 → dev server fallback
6. 모듈 로드 실패 → `BLOCKED`, Phase 4 `weak` 기록 + dev server fallback
7. 모듈 수행/Compose 실행 실패 → `FAILED`, Phase 4 `weak` 기록 + dev server fallback

**실패 시:**
- argos 리포트 미생성 → docs/zeus/zeus-log.md에 "argos 실행 시도, 리포트 미생성" 기록 후 진행
- docker-deploy 모듈 미발견을 Docker 미설치나 PASS로 바꾸지 않음

---

### Phase 4 → Phase 5 (Docker → Testing)

**전환 조건:**
- 서버 실행 시도 기록이 docs/zeus/zeus-log.md에 존재

**전환 액션:**
1. `qa-scenarios.md` 존재 확인
2. 서버 상태 확인 (헬스체크)
3. Playwright 설치 확인 (미설치 시 `npx playwright install`)
4. minos Step 1~7 실행. Step 5 탐색 QA → Step 6 Healer → Step 7 보고·정리이며, 수리 재개는 기존 이슈 ID·이력·남은 예산을 그대로 전달한다.

**실패 시:**
- 서버 시작 불가 → `--api-only` 모드로 minos 실행
- QA 시나리오 미존재 → 현장 생성 후 실행

---

### Phase 5 → Phase 6 (Testing → Report)

**전환 조건:**
- minos 완료 (PASS/CONDITIONAL/FAIL 무관)

**전환 액션:**
1. minos 최종 등급과 자동 테스트 수치, 탐색 QA, 미해결·미실행 범위, 수리 이력 경로를 함께 집계한다. 통과율만으로 최종 등급을 대체하지 않는다.
2. [Phase 6 진입 게이트](final-report-format.md#phase-6-진입-조건-필수-체크) 확인 (실행 증거 또는 실제 미실행 사유를 보존한 비성공 종결)
3. `docs/zeus/zeus-report.md` 생성
4. docs/zeus/zeus-state.json에 결과와 Phase별 증거 상태 업데이트. 리포트를 썼다는 사실로 미증명 Phase를 completed/proved로 승격하지 않는다.
5. [비성공 종료 규칙](../SKILL.md#비성공-종료와-자동-재개-해제)에 따라 이번 Zeus 소유 폴백만 엔진 종료 신호로 해제한다.

**실패 시:**
- 리포트 생성 불가 → 콘솔에 최소 요약 출력

---

## 재개 로직

`/zeus` 시작 또는 재실행 시 Phase 0 아카이브 전에:

1. 요청이 가리키는 `project_root`와 정본 상태 경로를 고정한다. 기존 로그·산출물로 확인한
   `planning_dir`가 있으면 구버전 저장 위치 `<planning_dir>/docs/zeus/zeus-state.json`도 확인한다.
   확인할 근거가 없는 planning_dir를 추측하거나 다른 프로젝트·가장 최신 파일을 대신 고르지 않는다.
2. 발견한 상태의 실행을 원문 설명, 시작 시각, 계획·산출물 경로와 기존 로그로 식별한다. 재개 요청이면
   그 실행이 요청 대상과 일치해야 한다. 명시적인 새 실행 요청이면 식별한 이전 실행을 6번에서
   아카이브할 수 있다. JSON을 읽지 못하거나 실행을 식별할 수 없으면 원본을 보존하고
   `BLOCKED: resume state unresolved`로 보고한다. 상태 파일 부재와 손상을 같은 것으로 취급하지 않는다.
3. 정본만 있으면 그것을 사용한다. 구경로만 있고 현재 실행임이 확인되면 **원본을 남긴 채** 정본으로
   복사하고 복사본의 내용 일치를 확인한다. 기존 실행·Phase·자식 이력 경로·사용 횟수를 그대로 유지하고
   정본을 진행시키기 전에 기존 `zeus-log.md`에 확인 시각, 구원본의 절대경로와 파일 바이트의 SHA-256,
   동일 실행을 확인한 식별 근거(원문 설명·startedAt·계획 경로), 정본 절대경로와 내용 일치 확인 결과를
   기록한다. 별도 복구 장부를 만들지 않는다. 정본이 이미 생겼다면 덮어쓰지 않고 다음 규칙을 적용한다.
4. 두 경로가 모두 있으면 기존 로그의 해당 복구/정본 선택 기록을 확인한다. 기록이 없고 내용이
   동일하면 3번의 확인 기록을 남긴 뒤 정본을 사용한다. 기록이 있다면 **두 절대경로의 일치, 현재
   구원본의 SHA-256 일치, 두 상태와 요청의 동일 실행**을 모두 확인한 경우에만 구원본을 보존 사본으로
   취급한다. 이 경우 정본이 진행되어 내용이 달라도 정본을 사용한다. 기록 없이 내용이 다르거나,
   기존 기록의 경로·해시·실행이 불일치하면 새 확인 기록으로 충돌을 정당화하지 않는다. 수정 시각으로
   선택하거나 임의 병합하지 않고, 두 파일과 기존 로그를 보존한 채 `BLOCKED: resume state conflict`로
   보고한다. 실행 식별이 해결되기 전에는 수리·아카이브·새 Phase 0을 시작하지 않는다.
5. 재개라면 선택된 상태의 `currentPhase`, 원래 계획/AC·소유권 기준점, 기존 증거와 자식 수리 이력을 복원한다.
   완료 증거가 유효한 작업은 반복하지 않고, 미완료 작업도 남은 자식 예산 안에서만 이어간다.
   이력을 못 찾으면 그 범위를 `UNVERIFIED`로 남기고 예산을 새로 부여하지 않는다.
6. 정본과 확인 가능한 구경로에 유효한 실행이 없고 상태 오류도 없을 때만 새 실행으로 처리한다.
   사용자가 명시적으로 새 실행을 요청한 경우에도 이전 산출물의 소유 범위를 확인한 뒤 아카이브한다.

---

## 에러 처리 등급

| 등급 | 예시 | 대응 |
|------|------|------|
| **FATAL** | 디스크 쓰기 불가, 메모리 부족 | 즉시 중단 + 에러 메시지 |
| **PHASE_FALLBACK** | plan 미생성, 서버 시작 불가 | 해당 phase 폴백 경로 실행 + 로그 |
| **STEP_RETRY** | 개별 task 실패, 테스트 실패 | SKILL.md의 자식 수리 예산 보존 규칙에 따라 남은 예산 안에서만 재개 |
| **RECOVERABLE** | 네트워크 타임아웃, 임시 파일 오류 | 1회 재시도 후 폴백 |

---

## docs/zeus/zeus-log.md 형식

```markdown
# Zeus Execution Log

## [HH:MM:SS] Phase 0 — Description Parsing
- Input: "쇼핑몰 만들어줘. React+Spring Boot"
- Industry: ecommerce
- Tech: React + Spring Boot + PostgreSQL
- Features: 7개

## [HH:MM:SS] Phase 1 — Planning
- Zephermine Step 1~26 진행
- Interview: auto-generated (CPS 3-Phase, Gate 1/2/3 confirmed)
- Sections: 6개 생성

## [HH:MM:SS] Phase 2 — Implementation
- Path: agent-team 계열 (병렬 팀/서브에이전트 사용 가능)
- Tasks: 6개 생성
- Wave 1: 3개 → ✅ 완료
- Wave 2: 3개 → ✅ 완료 (1개 재시도)

## [HH:MM:SS] Phase 3 — Verification (argos)
- Argos Phase 0~8의 적용 대상 실행
- CPS Traceability: PASS
- Static Analysis: CONDITIONAL (2건 경고)
- Runtime: PASS

## [HH:MM:SS] Phase 4 — Docker Setup
- Docker: v29.1.5
- docker-compose.yml: 생성
- 컨테이너: up (port 3000, 5432)

## [HH:MM:SS] Phase 5 — Testing (minos)
- QA scenarios: 12개
- Playwright tests: 10/12 passed
- Exploratory QA: P0/P1 미해결 0개
- Unresolved: P2 2개 (TC-011 exhausted, TC-012 blocked); 필수 미실행 0개
- Healer: TC-011 사용 2/2, TC-012 사용 0/2; 기존 수리 이력 경로 참조
- Final: CONDITIONAL

## [HH:MM:SS] Phase 6 — Final Report
- docs/zeus/zeus-report.md 생성
- Result: PARTIAL
```

---

## 폴링 간격

| 대상 | 간격 | 최대 대기 |
|------|------|-----------|
| agent-team 완료 대기 | 30초 | 30분 |
| 서버 시작 대기 | 5초 | 120초 |
| Playwright 테스트 완료 | 10초 | 10분 |
