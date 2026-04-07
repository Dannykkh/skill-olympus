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
/zephermine (설계사)  →  /agent-team (포세이돈)  →  /argos (감리)  →  /minos (실사)
     도면 생성               섹션 기반 구현           준공검사          런타임 테스트
```

## CRITICAL: First Actions

### 1. Print Intro

```
아르고스(Argos) — 100개의 눈으로 감리 시작
순서: Detect → Phase 0 (CPS 추적) → Phase 1 (정적) → Phase 2 (런타임) → Phase 3 (API) → Phase 4 (QA) → Phase 5 (도면) → Report
```

### 2. Resolve Planning Directory

계획 산출물 디렉토리를 찾습니다:

1. `$ARGUMENTS`로 전달된 경로
2. `docs/plan/*/spec.md` 패턴으로 자동 탐색 (Glob) — **archive/ 경로 제외** (결과에서 `archive` 포함된 경로 필터링)
3. 못 찾으면 → AskUserQuestion으로 경로 요청

### 3. Scan Artifacts

`<planning_dir>/`에서 검증 대상 파일을 확인:

```
필수:
  spec.md              → Phase 0 (CPS 추적, Context Map/Problem Statement 있을 때)
                       → Phase 1 (정적 검증)

선택 (있으면 해당 Phase 실행):
  sections/index.md    → Phase 0-2, 0-3 (없으면 해당 서브체크 건너뜀)
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
  ✅ spec.md (CPS)     → Phase 0 (Context Map + Problem Statement 감지됨)
  ✅ spec.md           → Phase 1, 2
  ✅ sections/index.md → Phase 0 (에코시스템 커버리지)
  ✅ api-spec.md       → Phase 3
  ✅ qa-scenarios.md   → Phase 4
  ✅ flow-diagrams/ (3개)     → Phase 5
```

---

## 검증 프로세스 (8 Phase: 0~7)

### Phase 0: CPS 추적성 검증

spec.md에 `## Context Map`과 `## Problem Statement`가 **모두 있는 경우만** 실행합니다.
없으면 아래 메시지 출력 후 Phase 1로 바로 진행:
```
ℹ️ CPS 섹션 미감지 — 레거시 계획, Phase 0 건너뜀
```

See [verify-protocol.md](references/verify-protocol.md) — Phase 0

#### 0-1. Problem → Solution 추적
Problem Statement의 각 문제(P1, P2, P3...)에 대해:
- spec.md Requirements에 대응하는 솔루션이 기술되어 있는가?
- 결과: ✅ 추적됨 / ❌ 솔루션 없음

#### 0-2. 에코시스템 → 섹션 커버리지
Context Map의 에코시스템 맵 각 시스템에 대해:
- `sections/index.md`에서 대응 섹션이 있는가?
- ⏭️ 제외 사유가 문서화되어 있는가?
- 결과: ✅ 커버됨 / ⏭️ 명시적 제외 / ❌ 누락

#### 0-3. Problem → 섹션 매핑
Problem Statement의 '해결 섹션' 열이 가리키는 섹션 파일이 실제로 존재하는가?
- 결과: ✅ 존재 / ❌ 파일 없음

#### 등급 영향
- Phase 0 전체 통과 → 다음 Phase로 진행
- Phase 0 일부 실패 → **CONDITIONAL** 등급 (FAIL이 아님 — 문서 수정으로 해결 가능)
- Healer 분류: "manual fix required" (자동 수정 불가, 설계 문서 수정 필요)

---

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

### Phase 6: 디자인 준수 검증

`design-system.md`가 있는 경우만 실행. UI/프론트엔드가 없는 프로젝트는 자동 건너뜀.

See [verify-protocol.md](references/verify-protocol.md) — Phase 6

#### 6-1. 디자인 토큰 준수
`design-system.md`의 디자인 토큰(색상, 폰트, 간격, 라운딩)이 실제 코드에 적용되었는지 확인:
- CSS 변수 / Tailwind config에 토큰이 정의되어 있는가
- 하드코딩된 색상/폰트가 토큰을 우회하고 있지 않은가
- 결과: ✅ 준수 / ⚠️ 일부 우회 / ❌ 미적용

#### 6-2. AI Slop 탐지
[AI Slop 블랙리스트](../../frontend-design/references/ai-slop-blacklist.md) 기반 검사:
- 10항목 블랙리스트 grep/시각 확인
- Hard Rejection 7개 확인 → 발견 시 FAIL
- 과사용 폰트(Inter, Roboto 등) 프라이머리 사용 여부

#### 6-3. UI/UX 9영역 채점
`ui-ux-auditor`의 채점 방법론 적용:
- 9영역 각각 0-10 채점
- 가중 총점 → A~F 등급
- 5.0 미만 → CONDITIONAL, Hard Rejection 발견 → FAIL

#### 등급 영향
- Phase 6 등급 A~B → 다음 Phase로 진행
- Phase 6 등급 C → **CONDITIONAL** (디자인 개선 권장)
- Phase 6 등급 D~F 또는 Hard Rejection → **FAIL** (디자인 재작업 필요)
- design-system.md 미감지 → 건너뜀 (등급에 영향 없음)

### Phase 7: 보안 검증

**항상 실행.** `security-reviewer` 에이전트의 인프라 우선 방법론을 적용.

See [verify-protocol.md](references/verify-protocol.md) — Phase 7

#### 7-1. 시크릿 탐지 (Secret Archaeology)
- 현재 코드의 하드코딩 시크릿 Grep (`api_key=`, `password=`, `sk-`, `AKIA` 등)
- git 히스토리에서 삭제된 시크릿 탐색 (`git log --all -p -S "SECRET"`)
- .env 파일 커밋 이력 확인
- 결과: 🔴 Critical (노출) / ✅ 안전

#### 7-2. 의존성 공급망 (Supply Chain)
- `npm audit` / `pip-audit` / `trivy` 실행 (설치된 도구 사용)
- Critical/High CVE 탐지
- Lock 파일 커밋 여부
- 결과: 🔴 Critical CVE 수 / 🟠 High CVE 수

#### 7-3. OWASP Top 10 코드 스캔
- SQL Injection, XSS, Command Injection, Path Traversal, SSRF, CSRF 패턴 Grep
- `validate-code` 훅보다 넓은 범위 (훅은 3개 패턴, 여기서는 전체 OWASP)
- 인증/권한 체계 확인 (미인증 엔드포인트 탐지)
- Rate Limiting 존재 여부

#### 7-4. STRIDE 위협 요약
- Spoofing / Tampering / Repudiation / Info Disclosure / DoS / Elevation
- 각 위협별 현재 대응 상태: ✅ 대응 / ⚠️ 부분 / ❌ 미대응
- 미대응 위협에 대한 권고 1줄씩

#### 등급 영향
- 🔴 Critical 1건 이상 → **FAIL** (보안 수정 필수)
- 🟠 High만 있고 Critical 없음 → **CONDITIONAL**
- 🟡 Medium 이하만 → PASS에 영향 없음 (권고만)

---

## 검증 보고서

**Archive 기존 보고서:** `<planning_dir>/verify-report.md`가 이미 존재하면:
```
1. <planning_dir>/archive/ 디렉토리 생성 (없으면)
2. 기존 파일 → <planning_dir>/archive/verify-report-{YYYY-MM-DD-HHMM}.md 로 이동
```

Phase 0~7 결과를 합쳐 `<planning_dir>/verify-report.md`로 작성.

### 보고서 구조

```markdown
# Argos 검증 보고서

## 요약
- CPS 추적성: ✅/⚠️ CONDITIONAL/ℹ️ 건너뜀
- 전체 충족률: {N}%
- 빌드: ✅/❌
- 테스트: {passed}/{total}
- API 일치: {matched}/{total}
- QA 통과: {passed}/{total}
- 도면 매칭: {matched}/{total} 노드
- 디자인 준수: {등급} ({총점}/10) 또는 건너뜀
- 보안: 🔴{N} 🟠{N} 🟡{N} 또는 "통과"

## Phase 0: CPS 추적성 검증
{Problem→Solution 추적 + 에코시스템→섹션 커버리지 + Problem→섹션 매핑 결과}
(CPS 섹션 미감지 시: "레거시 계획 — 건너뜀")

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

## Phase 6: 디자인 준수 검증
{디자인 토큰 준수율 + AI Slop 탐지 결과 + 9영역 스코어카드}
(design-system.md 미감지 시: "UI 없음 — 건너뜀")

## Phase 7: 보안 검증
{시크릿 탐지 + 의존성 CVE + OWASP 스캔 + STRIDE 요약}

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

## 결과 보고 및 자동 수정

검증 결과를 사용자에게 표시한 후:

- **PASS**: 준공 승인, 다음 단계 안내
- **CONDITIONAL/FAIL**: 누락 항목을 **확인 없이 바로 수정** 시도 → 수정 후 해당 Phase만 재검증
  - 자동 수정 불가능한 항목만 리스트로 보고 ("수동 확인 필요")

---

## 옵션

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `--phase N` | 특정 Phase만 실행 (0~7) | 전체 |
| `--skip-build` | Phase 2 빌드 건너뜀 | false |
| `--skip-e2e` | Phase 2 E2E 건너뜀 | false |
| `--report-only` | 기존 보고서 표시만 | false |

---

## 연관 스킬

| 스킬 | 역할 | 연결 |
|------|------|------|
| zephermine | 설계 산출물 생성 | 검증 대상 (spec, api-spec, qa-scenarios, flow-diagrams) |
| flow-verifier | 프로세스 도면 검증 | Phase 5에서 활용 |
| agent-team (포세이돈) | 구현 수행 | 검증 전 선행 단계 (젭마인 산출물 기반) |
| daedalus (다이달로스) | 구현 수행 | 검증 전 선행 단계 (젭마인 없이 직접 진행) |
| minos | Playwright 실사 테스트 | 검증 후 후행 단계 |
| code-reviewer | 코드 품질 검사 (자재검사) | 별도 역할, 시공 중 자동 실행 |

---

## 다음 단계 안내

```
✅ 아르고스 감리 완료! (결과: {PASS/CONDITIONAL/FAIL})

👉 다음 단계 (선택):
  /minos          → Playwright 실사 테스트 (아직 안 했다면)
  /commit              → 변경사항 커밋
  /wrap-up             → 세션 요약 + MEMORY.md 업데이트
```
