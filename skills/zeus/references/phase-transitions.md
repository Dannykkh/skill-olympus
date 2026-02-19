# Phase Transitions - 페이즈 전환/상태 관리

Zeus 파이프라인의 4단계 전환 규칙과 상태 관리.

---

## 상태 파일: zeus-state.json

`<planning_dir>/zeus-state.json`에 저장. 중단 후 재개 시 마지막 완료 지점부터 진행.

```json
{
  "version": 1,
  "description": "쇼핑몰 만들어줘. React+Spring Boot",
  "startedAt": "2026-02-20T10:00:00Z",
  "currentPhase": "planning",
  "phases": {
    "parsing": { "status": "completed", "completedAt": "...", "result": {} },
    "planning": { "status": "in_progress", "step": 14, "errors": [] },
    "implementation": { "status": "pending" },
    "testing": { "status": "pending" },
    "report": { "status": "pending" }
  },
  "errors": [],
  "artifacts": {
    "interview": "claude-interview.md",
    "plan": "claude-plan.md",
    "sections": "sections/",
    "qaScenarios": "claude-qa-scenarios.md",
    "report": "zeus-report.md"
  }
}
```

---

## 전환 규칙

### Phase 0 → Phase 1 (Parsing → Planning)

**전환 조건:**
- 파싱 결과 객체가 유효 (industry, techStack, features 존재)

**전환 액션:**
1. 파싱 결과를 zeus-state.json에 저장
2. zephermine SKILL.md 읽기
3. 합성 인터뷰 생성 (auto-interview-generator.md)

**실패 시:**
- 파싱 불가 → industry="general", features=["CRUD"] 로 폴백
- 절대 멈추지 않음

---

### Phase 1 → Phase 2 (Planning → Implementation)

**전환 조건:**
- `claude-plan.md` 파일 존재
- `sections/` 디렉토리에 1개 이상 섹션 파일 존재

**전환 액션:**
1. `claude-plan.md` → `.claude/plans/zeus-{projectName}.md` 복사
2. `orchestrator_detect_providers` 호출
3. `orchestrator_analyze_codebase` 호출
4. sections/ 파싱 → `orchestrator_create_task` 반복 호출
5. `orchestrator_spawn_workers` 호출

**실패 시:**
- plan 파일 미생성 → zeus-log.md에 기록 + Phase 2 건너뜀 → Phase 4 (리포트)
- sections 미생성 → plan 전체를 단일 task로 생성

---

### Phase 2 → Phase 3 (Implementation → Testing)

**전환 조건:**
- 모든 task COMPLETED 또는 최대 1개 FAILED (1회 재시도 후)
- `orchestrator_get_progress`에서 전체 완료 확인

**전환 액션:**
1. `claude-qa-scenarios.md` 존재 확인
2. package.json 또는 build 파일에서 서버 시작 스크립트 감지
3. Playwright 설치 확인 (미설치 시 `npx playwright install`)

**실패 시:**
- 전체 task 실패 → zeus-log.md에 기록 + Phase 3 건너뜀
- 서버 시작 불가 → Phase 3 건너뜀 (리포트에 "테스트 건너뜀" 기록)

---

### Phase 3 → Phase 4 (Testing → Report)

**전환 조건:**
- qpassenger 완료 (PASS/CONDITIONAL/FAIL 무관)
- 또는 Phase 3 건너뜀

**전환 액션:**
1. 전체 결과 집계
2. `zeus-report.md` 생성
3. zeus-state.json status 업데이트

**실패 시:**
- 리포트 생성 불가 → 콘솔에 최소 요약 출력

---

## 재개 로직

`/zeus` 재실행 시:

```
1. zeus-state.json 존재 확인
2. 존재하면:
   a. 현재 phase 확인
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
| **PHASE_SKIP** | plan 미생성, 서버 시작 불가 | 해당 phase 건너뜀 + 로그 |
| **STEP_SKIP** | 개별 task 실패, 테스트 실패 | 해당 step 건너뜀 + 로그 |
| **RECOVERABLE** | 네트워크 타임아웃, 임시 파일 오류 | 1회 재시도 후 skip |

---

## zeus-log.md 형식

```markdown
# Zeus Execution Log

## [HH:MM:SS] Phase 0 — Description Parsing
- Input: "쇼핑몰 만들어줘. React+Spring Boot"
- Industry: ecommerce
- Tech: React + Spring Boot + PostgreSQL
- Features: 7개

## [HH:MM:SS] Phase 1 — Planning
- Zephermine Step 1~24 진행
- Interview: auto-generated (7 categories)
- Sections: 6개 생성
- ⚠️ Step 9 team-review: 건너뜀 (컨텍스트 절약)

## [HH:MM:SS] Phase 2 — Implementation
- Tasks: 6개 생성
- Workers: 2개 스폰 (claude x2)
- Task 1: ✅ completed (45초)
- Task 2: ✅ completed (62초)
- Task 3: ❌ failed → 재시도 → ✅ completed
...

## [HH:MM:SS] Phase 3 — Testing
- Server: npm run dev (port 3000)
- QA scenarios: 12개
- Playwright tests: 8/12 passed
- Healer loops: 2회
```

---

## 폴링 간격

| 대상 | 간격 | 최대 대기 |
|------|------|-----------|
| orchestrator_get_progress | 30초 | 30분 |
| 서버 시작 대기 | 5초 | 60초 |
| Playwright 테스트 완료 | 10초 | 10분 |
