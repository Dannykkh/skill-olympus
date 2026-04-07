# Phase Transitions - 페이즈 전환/상태 관리

Zeus 파이프라인의 7단계(Phase 0~6) 전환 규칙과 상태 관리.

---

## 상태 파일: docs/zeus/zeus-state.json

`<planning_dir>/docs/zeus/zeus-state.json`에 저장. 중단 후 재개 시 마지막 완료 지점부터 진행.

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
질문 처리 원칙: AskUserQuestion은 호출하지 않고 `(Recommended)` 옵션 우선 자동선택, 미존재 시 fallback 사용.

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
1. 구현 도구 자동 선택 (TeamCreate 가능 → agent-team, 불가 → daedalus)
2. sections/index.md 파싱 → task 생성

**실패 시:**
- plan 파일 미생성 → 최소 plan 자동 생성 후 진행
- sections 미생성 → 통합 섹션 1개를 생성해 단일 task로 진행

---

### Phase 2 → Phase 3 (Implementation → Verification)

**전환 조건:**
- 구현 도구 완료 확인:
  - agent-team 경로: 모든 teammate 완료 또는 최대 1개 실패 (1회 재시도 후)
  - daedalus 경로: Phase 4(구현) 완료 확인
  - 파일 존재 확인 폴백: `sections/`의 섹션에 해당하는 소스 파일이 1개 이상 존재

**전환 액션:**
1. `<planning_dir>` 경로 확인
2. argos SKILL.md 읽기
3. argos Phase 0~7 순차 실행 (Phase 6 = 디자인 준수, Phase 7 = 보안 검증)

**실패 시:**
- 전체 task 실패 → docs/zeus/zeus-log.md에 기록 + 정적 분석(코드 품질/보안)만이라도 실행

---

### Phase 3 → Phase 4 (Verification → Docker)

**전환 조건:**
- argos 완료 (PASS/CONDITIONAL/FAIL 무관)

**전환 액션:**
1. Docker 설치 여부 확인 (`docker --version`)
2. 설치됨 → docker-deploy 스킬 실행 + 컨테이너 실행
3. 미설치 → dev server fallback

**실패 시:**
- argos 리포트 미생성 → docs/zeus/zeus-log.md에 "argos 실행 시도, 리포트 미생성" 기록 후 진행

---

### Phase 4 → Phase 5 (Docker → Testing)

**전환 조건:**
- 서버 실행 시도 기록이 docs/zeus/zeus-log.md에 존재

**전환 액션:**
1. `qa-scenarios.md` 존재 확인
2. 서버 상태 확인 (헬스체크)
3. Playwright 설치 확인 (미설치 시 `npx playwright install`)
4. minos Step 1~7 실행

**실패 시:**
- 서버 시작 불가 → `--api-only` 모드로 minos 실행
- QA 시나리오 미존재 → 현장 생성 후 실행

---

### Phase 5 → Phase 6 (Testing → Report)

**전환 조건:**
- minos 완료 (PASS/CONDITIONAL/FAIL 무관)

**전환 액션:**
1. 전체 결과 집계
2. Phase 6 진입 게이트 확인 (모든 Phase 실행 증거)
3. `docs/zeus/zeus-report.md` 생성
4. docs/zeus/zeus-state.json status 업데이트

**실패 시:**
- 리포트 생성 불가 → 콘솔에 최소 요약 출력

---

## 재개 로직

`/zeus` 재실행 시:

```
1. docs/zeus/zeus-state.json 존재 확인
2. 존재하면:
   a. currentPhase 확인
   b. "이전 Zeus 실행이 {phase}에서 중단되었습니다. 이어서 진행합니다." 출력
   c. 해당 phase부터 재개
3. 존재하지 않으면:
   a. 새로 시작
```

---

## 에러 처리 등급

| 등급 | 예시 | 대응 |
|------|------|------|
| **FATAL** | 디스크 쓰기 불가, 메모리 부족 | 즉시 중단 + 에러 메시지 |
| **PHASE_FALLBACK** | plan 미생성, 서버 시작 불가 | 해당 phase 폴백 경로 실행 + 로그 |
| **STEP_RETRY** | 개별 task 실패, 테스트 실패 | 1회 재시도 + 실패 내역 기록 |
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
- Path: agent-team (TeamCreate 성공)
- Tasks: 6개 생성
- Wave 1: 3개 → ✅ 완료
- Wave 2: 3개 → ✅ 완료 (1개 재시도)

## [HH:MM:SS] Phase 3 — Verification (argos)
- Argos Phase 0~5 실행
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
- Healer loops: 2회
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
