---
name: argos
description: 준공검사 감리 스킬. 설계 산출물(spec, api-spec, qa-scenarios, flow-diagrams) 대비 구현 검증. 정적 분석 + 런타임 검증 + API 일치 + QA 시나리오 + 도면 대조. /argos로 실행.
triggers:
  - "argos"
  - "아르고스"
  - "감리"
  - "준공검사"
  - "verify implementation"
auto_apply: false
---

# Argos (아르고스) — 100개의 눈으로 검증하는 감리

> **아르고스 판옵테스(Argus Panoptes)**: 100개의 눈을 가진 그리스 신화의 감시자.
> 설계 도면과 스펙 대비 구현 상태를 빠짐없이 검증합니다.

## Quick Start

```
/argos                              # planning_dir 자동 탐색
/argos docs/plan/my-feature         # 특정 계획 디렉토리 지정
/argos --phase 5                    # 특정 Phase만 실행
```

**공식 호출명:** `/argos` (별칭: `아르고스`, `감리`)

## 파이프라인 위치

```
/zephermine (설계사)  →  /agent-team (대니즈팀)  →  /argos (감리)  →  /qpassenger (실사)
     도면 생성               섹션 기반 구현           준공검사          런타임 테스트
```

## CRITICAL: First Actions

### 1. Print Intro

```
아르고스(Argos) — 100개의 눈으로 감리 시작
순서: Detect → Phase 1 (정적) → Phase 2 (런타임) → Phase 3 (API) → Phase 4 (QA) → Phase 5 (도면) → Report
```

### 2. Resolve Planning Directory

계획 산출물 디렉토리를 찾습니다:

1. `$ARGUMENTS`로 전달된 경로
2. `docs/plan/*/spec.md` 패턴으로 자동 탐색 (Glob)
3. 못 찾으면 → AskUserQuestion으로 경로 요청

### 3. Scan Artifacts

`<planning_dir>/`에서 검증 대상 파일을 확인:

```
필수:
  spec.md              → Phase 1 (정적 검증)

선택 (있으면 해당 Phase 실행):
  api-spec.md          → Phase 3 (API 일치)
  qa-scenarios.md      → Phase 4 (QA 시나리오)
  flow-diagrams/index.md      → Phase 5 (도면 대조)
```

**spec.md조차 없으면:** 에러 메시지 출력 후 종료.
```
❌ 검증 대상 없음: spec.md를 찾을 수 없습니다.
   /zephermine으로 설계를 먼저 완료하세요.
```

상태 출력:
```
📋 검증 대상:
  ✅ spec.md           → Phase 1, 2
  ✅ api-spec.md       → Phase 3
  ✅ qa-scenarios.md   → Phase 4
  ✅ flow-diagrams/ (3개)     → Phase 5
```

---

## 검증 프로세스 (5 Phase)

### Phase 1: 정적 검증

See [verify-protocol.md](references/verify-protocol.md) — Phase 1

서브에이전트(subagent_type="Explore") **2개를 병렬 실행**:

1. **기능 검증 에이전트**: spec.md의 기능적 요구사항 vs 실제 코드
   - 각 요구사항별 구현 여부 (✅/❌)
   - 누락된 기능 구체적 명시
   - 엣지 케이스 처리 확인

2. **품질 검증 에이전트**: 비기능 요구사항 + 코드 품질
   - 성능/보안/접근성 요구사항 충족 여부
   - 테스트 커버리지
   - 타입 안전성
   - 문서화 상태

두 에이전트의 결과를 합쳐 정적 검증 보고서 작성.

### Phase 2: 런타임 검증

See [verify-protocol.md](references/verify-protocol.md) — Phase 2

빌드, 테스트, E2E를 실행하여 검증합니다.

1. **프로젝트 감지**: package.json, pom.xml, pyproject.toml 등에서 기술 스택 자동 감지
2. **빌드 검증**: `npm run build`, `mvn compile` 등 실행
3. **단위 테스트**: `npm test`, `pytest` 등 실행 + 결과 파싱 (통과/실패/스킵)
4. **E2E 테스트**: Playwright/Cypress 감지 시 실행 (미감지 시 건너뜀)

### Phase 3: API 일치 검증

`api-spec.md`가 있는 경우만 실행.

See [verify-protocol.md](references/verify-protocol.md) — Phase 3

1. 코드에서 실제 API 라우트 추출 (Express/Next.js/Spring/FastAPI 패턴 감지)
2. API Spec 문서와 대조:
   - spec에 있고 코드에 있음 → ✅ 일치
   - spec에 있지만 코드에 없음 → ❌ 미구현
   - 코드에 있지만 spec에 없음 → ⚠️ 미등록
3. 중복 API 탐지 (단수/복수, 동사 중복)

### Phase 4: QA 시나리오 검증

`qa-scenarios.md`가 있는 경우만 실행.

See [verify-protocol.md](references/verify-protocol.md) — Phase 4

1. 각 테스트 케이스를 코드/테스트 결과 기반으로 판정
2. `qa-scenarios.md`의 체크박스를 ✅/❌ 마킹
3. 통과율 집계 (정상/에러/엣지 케이스별)

### Phase 5: 프로세스 도면 검증

`flow-diagrams/`가 있는 경우만 실행.

See [verify-protocol.md](references/verify-protocol.md) — Phase 5

`flow-verifier` 스킬의 verify 모드를 참조하여 검증:

1. `flow-diagrams/index.md`에서 프로세스 다이어그램 목록 추출
2. 각 `.mmd` 파일의 노드와 실제 코드를 대조:
   - **노드 존재**: 다이어그램 노드에 대응하는 코드가 있는가
   - **분기 완전성**: 모든 분기(if/else, switch)가 구현되었는가
   - **경로 순서**: 코드 실행 순서가 화살표 방향과 일치하는가
   - **에러 처리**: 에러 경로 노드에 예외 처리가 있는가
   - **누락 경로**: 코드에만 있는 경로 (다이어그램 업데이트 필요)

---

## 검증 보고서

Phase 1~5 결과를 합쳐 `<planning_dir>/verify-report.md`로 작성.

### 보고서 구조

```markdown
# Argos 검증 보고서

## 요약
- 전체 충족률: {N}%
- 빌드: ✅/❌
- 테스트: {passed}/{total}
- API 일치: {matched}/{total}
- QA 통과: {passed}/{total}
- 도면 매칭: {matched}/{total} 노드

## Phase 1: 정적 검증
{기능 검증 + 품질 검증 결과 테이블}

## Phase 2: 런타임 검증
{빌드/테스트/E2E 결과 테이블}

## Phase 3: API 일치 검증
{endpoint 대조 테이블}

## Phase 4: QA 시나리오 검증
{통과율 테이블 + 실패 항목}

## Phase 5: 프로세스 도면 검증
{노드 매칭 테이블 + 누락 노드}

## 누락 항목 목록
{전체 Phase에서 ❌인 항목 통합}
```

### 판정 기준

| Grade | 조건 | 판정 |
|-------|------|------|
| **PASS** | 전체 Phase 통과, 누락 0 | 준공 승인 |
| **CONDITIONAL** | 필수 기능 통과, 일부 경고 | 조건부 승인 |
| **FAIL** | 필수 기능 미구현 또는 빌드 실패 | 재시공 필요 |

---

## 결과 보고 및 사용자 선택

검증 결과를 사용자에게 표시한 후:

```
AskUserQuestion:
  question: "아르고스 검증 결과를 확인했습니다. 어떻게 하시겠습니까?"
  options:
    - "수정 후 재검증" (누락 항목 수정 후 /argos 재실행)
    - "현재 상태 승인" (준공 승인, 종료)
```

---

## 옵션

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `--phase N` | 특정 Phase만 실행 (1~5) | 전체 |
| `--skip-build` | Phase 2 빌드 건너뜀 | false |
| `--skip-e2e` | Phase 2 E2E 건너뜀 | false |
| `--report-only` | 기존 보고서 표시만 | false |

---

## 연관 스킬

| 스킬 | 역할 | 연결 |
|------|------|------|
| zephermine | 설계 산출물 생성 | 검증 대상 (spec, api-spec, qa-scenarios, flow-diagrams) |
| flow-verifier | 프로세스 도면 검증 | Phase 5에서 활용 |
| agent-team (대니즈팀) | 구현 수행 | 검증 전 선행 단계 (젭마인 산출물 기반) |
| daedalus (다이달로스) | 구현 수행 | 검증 전 선행 단계 (젭마인 없이 직접 진행) |
| qpassenger | Playwright 실사 테스트 | 검증 후 후행 단계 |
| code-reviewer | 코드 품질 검사 (자재검사) | 별도 역할, 시공 중 자동 실행 |

---

## 다음 단계 안내

```
✅ 아르고스 감리 완료! (결과: {PASS/CONDITIONAL/FAIL})

👉 다음 단계 (선택):
  /qpassenger          → Playwright 실사 테스트 (아직 안 했다면)
  /commit              → 변경사항 커밋
  /wrap-up             → 세션 요약 + MEMORY.md 업데이트
```
