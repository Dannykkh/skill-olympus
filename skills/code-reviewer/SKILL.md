---
name: code-reviewer
description: |
  Pre-landing PR 리뷰 오케스트레이터. git diff 기반 2-Pass 리뷰 + Specialist 병렬 dispatch +
  Fix-First 자동 수정. "코드 리뷰 해줘", "review", "리뷰", "PR 체크" 요청에 실행.
  코드 작성 완료 시 자동 제안.
license: MIT
metadata:
  version: "3.0.0"
---

# Code Reviewer v3 — Pre-Landing Review Orchestrator

PR 단위 코드 리뷰 오케스트레이터. 구조적 이슈를 찾고, 기계적 수정은 자동 적용하고,
판단이 필요한 건 사용자에게 질문합니다.

## 적용 시점

- 명시적 리뷰 요청 시 ("코드 리뷰 해줘", "review")
- PR 생성 전 (`/ship` 전)
- 코드 작성 완료 시 자동 제안

---

## Step 0: 베이스 브랜치 감지

```bash
# 플랫폼 감지
_REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "unknown")
# 베이스 브랜치 결정
_BASE=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's|refs/remotes/origin/||')
[ -z "$_BASE" ] && git rev-parse --verify origin/main &>/dev/null && _BASE="main"
[ -z "$_BASE" ] && git rev-parse --verify origin/master &>/dev/null && _BASE="master"
[ -z "$_BASE" ] && _BASE="main"
echo "BASE: $_BASE"
echo "BRANCH: $(git branch --show-current 2>/dev/null)"
```

---

## Step 1: 리뷰 대상 확인

1. `git branch --show-current`로 현재 브랜치 확인.
2. 베이스 브랜치 위에 있으면: **"베이스 브랜치에서는 리뷰할 대상이 없습니다."** → 중단.
3. `git fetch origin $_BASE --quiet && git diff origin/$_BASE --stat` 실행.
4. diff가 없으면 동일 메시지 → 중단.

---

## Step 2: Scope 감지

```bash
# 변경된 파일 분석
_DIFF_STAT=$(git diff origin/$_BASE --stat)
_DIFF_LINES=$(echo "$_DIFF_STAT" | tail -1 | grep -oE '[0-9]+ insertion' | grep -oE '[0-9]+' || echo "0")
echo "DIFF_LINES: $_DIFF_LINES"

# 스코프 시그널
_HAS_BACKEND=false; _HAS_FRONTEND=false; _HAS_API=false
_HAS_MIGRATIONS=false; _HAS_AUTH=false
_CHANGED_FILES=$(git diff origin/$_BASE --name-only)
echo "$_CHANGED_FILES" | grep -qiE '\.(py|rb|java|go|cs|rs|kt)$' && _HAS_BACKEND=true
echo "$_CHANGED_FILES" | grep -qiE '\.(tsx?|jsx?|vue|svelte|css|scss)$' && _HAS_FRONTEND=true
echo "$_CHANGED_FILES" | grep -qiE '(controller|route|endpoint|api|handler)' && _HAS_API=true
echo "$_CHANGED_FILES" | grep -qiE '(migrat|schema|alembic|flyway)' && _HAS_MIGRATIONS=true
echo "$_CHANGED_FILES" | grep -qiE '(auth|login|session|token|permission|role)' && _HAS_AUTH=true

echo "SCOPE: backend=$_HAS_BACKEND frontend=$_HAS_FRONTEND api=$_HAS_API migrations=$_HAS_MIGRATIONS auth=$_HAS_AUTH"
```

---

## Step 3: Scope Drift 감지

**계획 대비 실제 구현 검증** — 빠진 것과 초과한 것을 찾습니다.

1. 의도 소스 수집:
   - 커밋 메시지: `git log origin/$_BASE..HEAD --oneline`
   - PR 설명: `gh pr view --json body -q .body 2>/dev/null || true`
   - TODOS.md (있으면)
2. diff의 변경 파일과 의도를 대비하여 평가:

**SCOPE CREEP**: 의도에 없는 파일 변경, 미언급 기능/리팩토링
**MISSING REQUIREMENTS**: 의도에 있지만 diff에 없는 항목

출력:
```
Scope Check: [CLEAN / DRIFT DETECTED / REQUIREMENTS MISSING]
Intent: <1줄 요약>
Delivered: <1줄 요약>
[불일치 항목 목록]
```

이 단계는 **정보 제공** — 리뷰를 차단하지 않습니다.

---

## Step 4: Critical Pass (핵심 리뷰)

`git diff origin/$_BASE`의 전체 diff를 가져와 아래 카테고리를 검사합니다.

### Pass 1 — CRITICAL (최고 심각도)

#### SQL & 데이터 안전
- 문자열 보간 SQL (`.to_i`/`.to_f`여도 파라미터화 쿼리 사용)
- TOCTOU 경쟁: check-then-set → 원자적 `WHERE` + `update_all`
- 모델 검증 우회 직접 DB 쓰기 (update_column, QuerySet.update, raw query)
- N+1 쿼리: 루프에서 사용되는 연관에 eager loading 누락

#### Race Condition & 동시성
- 유니크 제약/중복 키 에러 없는 read-check-write
- 유니크 DB 인덱스 없는 find-or-create
- 원자적 WHERE 없는 상태 전이
- 사용자 제어 데이터에 안전하지 않은 HTML 렌더링 (XSS)

#### LLM 출력 신뢰 경계
- LLM 생성 값 검증 없이 DB 저장/메일러 전달
- 타입/형태 체크 없이 구조화 도구 출력 수용
- 허용 목록 없는 LLM 생성 URL fetch (SSRF)
- 소독 없이 벡터 DB 저장 (저장된 프롬프트 인젝션)

#### Shell Injection
- `subprocess.run(shell=True)` + f-string 보간 → 인자 배열 사용
- `os.system()`에 변수 보간 → `subprocess.run()` 인자 배열
- LLM 생성 코드에 대한 `eval()`/`exec()` (샌드박싱 없음)

#### Enum & 값 완전성
새 enum 값/상태/타입 상수 추가 시:
- **모든 소비자 추적.** 해당 값으로 switch/filter/표시하는 파일을 Grep → Read.
- **허용 목록/필터 배열 확인.** 형제 값을 포함하는 배열에 새 값 포함 여부.
- **case/if-elsif 체인.** 새 값이 잘못된 기본값으로 fall-through 되는지.

### Pass 2 — INFORMATIONAL

#### 비동기/동기 혼합 (Python)
- async def 안 동기 subprocess.run, open, requests.get → asyncio.to_thread 사용
- async에서 time.sleep → asyncio.sleep
- async 컨텍스트에서 run_in_executor 없는 동기 DB 호출

#### 컬럼/필드명 안전
- ORM 쿼리(.select, .eq, .gte, .order)의 컬럼명이 실제 스키마와 일치하는지
- .get() 호출이 실제 선택된 컬럼명 사용

#### 타입 정의
- Python: 타입 힌트 누락 (반환/파라미터)
- TypeScript: `any` 사용, 명확한 인터페이스 미정의

#### CI/CD Pipeline
- 워크플로우 변경 시 빌드 도구 버전, 아티팩트 경로, 시크릿 사용 확인
- 버전 태그 형식 일관성 (v1.2.3 vs 1.2.3)

---

## Confidence 점수

모든 발견에 신뢰도 점수(1-10)를 포함합니다.

| 점수 | 의미 | 표시 규칙 |
|------|------|-----------|
| 9-10 | 구체적 코드 읽어서 검증. 버그/취약점 입증. | 정상 표시 |
| 7-8 | 높은 신뢰도 패턴 매치. | 정상 표시 |
| 5-6 | 중간. 오탐 가능. | 경고 표시: "중간 신뢰도, 실제 이슈인지 확인" |
| 3-4 | 낮음. 의심스럽지만 괜찮을 수도. | 부록에만 포함 |
| 1-2 | 추측. | P0 심각도일 때만 보고 |

발견 형식: `[심각도] (confidence: N/10) file:line — 설명`

---

## Step 5: Specialist 병렬 Dispatch

### 50줄 미만 diff
"소규모 diff ($_DIFF_LINES줄) — specialist 생략." → Step 6으로.

### Specialist 선택

| Specialist | 조건 | 파일 |
|-----------|------|------|
| Testing | 항상 | `specialists/testing.md` |
| Maintainability | 항상 | `specialists/maintainability.md` |
| Security | auth 변경 또는 백엔드 > 100줄 | `specialists/security.md` |
| Performance | 백엔드 또는 프론트엔드 | `specialists/performance.md` |
| Data Migration | 마이그레이션 파일 변경 | `specialists/data-migration.md` |
| API Contract | API 파일 변경 | `specialists/api-contract.md` |
| Design | 프론트엔드 파일 변경 | `specialists/design.md` |

### Dispatch

선택된 specialist별로 Agent 도구를 사용하여 **단일 메시지에 모든 subagent를 동시 호출**합니다.

각 subagent 프롬프트:
```
[specialist name] specialist 코드 리뷰어로서 활동하세요.
아래 체크리스트를 읽고, `git diff origin/[base]`로 diff를 가져와 체크리스트를 적용하세요.

발견 시 한 줄에 하나씩 JSON 출력:
{"severity":"CRITICAL|INFORMATIONAL","confidence":N,"path":"file","line":N,"category":"[category]","summary":"설명","fix":"수정 방법","specialist":"[name]"}

발견 없으면: NO FINDINGS

체크리스트:
[체크리스트 내용]
```

### 결과 수집 & 중복 제거

1. 각 specialist 출력에서 JSON 파싱 (NO FINDINGS → 건너뛰기)
2. 핑거프린트: `{path}:{line}:{category}`
3. 동일 핑거프린트 → 최고 confidence 유지, confidence +1 (최대 10)
4. 태그: "MULTI-SPECIALIST CONFIRMED (specialist1 + specialist2)"

### Adversarial Review (적대적 리뷰)

별도 Claude subagent를 디스패치합니다. 체크리스트 편향 없는 신선한 시각.

프롬프트:
```
이 브랜치의 diff를 `git diff origin/[base]`로 읽으세요.
공격자와 카오스 엔지니어의 관점으로 이 코드가 프로덕션에서 실패할 방법을 찾으세요.
엣지 케이스, 경쟁 조건, 보안 취약점, 리소스 누수, 침묵 데이터 손상, 에러 삼킴.
칭찬 없이 문제만. 각 발견을 FIXABLE(수정 방법 알음) 또는 INVESTIGATE(사람 판단 필요)로 분류.
```

---

## Step 6: Fix-First Review

**모든 발견에 조치를 취합니다 — 보고만 하지 않습니다.**

### 분류 기준

```
AUTO-FIX (물어보지 않고 수정):         ASK (사람 판단 필요):
├─ 죽은 코드 / 미사용 변수              ├─ 보안 (인증, XSS, 인젝션)
├─ N+1 쿼리 (eager loading 추가)        ├─ 경쟁 조건
├─ 코드와 불일치하는 주석               ├─ 설계 결정
├─ 매직 넘버 → 명명 상수               ├─ 대규모 수정 (>20줄)
├─ LLM 출력 검증 누락                   ├─ Enum 완전성
├─ 버전/경로 불일치                     ├─ 기능 제거
├─ 할당 후 미읽는 변수                  └─ 사용자 가시 동작 변경
└─ 인라인 스타일, O(n*m) 뷰 룩업
```

**원칙:** 시니어 엔지니어가 토론 없이 적용할 수정이면 AUTO-FIX.
합리적 의견이 갈리면 ASK.

### 6a: 분류
각 발견을 AUTO-FIX 또는 ASK로 분류.

### 6b: AUTO-FIX 적용
```
[AUTO-FIXED] [file:line] 문제 → 수정 내용
```

### 6c: ASK 일괄 질문

ASK 항목이 있으면 **하나의 질문으로 일괄**:
```
자동 수정 5건 완료. 2건은 판단이 필요합니다:

1. [CRITICAL] (confidence: 9/10) app/models/user.py:42 — 상태 전이 경쟁 조건
   수정: WHERE status = 'draft' 추가
   → A) 수정  B) 건너뛰기

2. [INFORMATIONAL] (confidence: 7/10) app/services/ai.py:88 — LLM 출력 타입 미검증
   수정: JSON 스키마 검증 추가
   → A) 수정  B) 건너뛰기

RECOMMENDATION: 모두 수정 권장 — #1은 실제 경쟁 조건, #2는 침묵 데이터 손상 방지.
```

### 6d: 승인된 수정 적용
사용자가 "수정"을 선택한 항목 적용.

---

## Step 7: 보고서 출력

```
═══════════════════════════════════════
Pre-Landing Review: N issues (X critical, Y informational)
Specialist: Z개 디스패치 (names)
═══════════════════════════════════════

SCOPE CHECK: [CLEAN / DRIFT / MISSING]
Intent: ...
Delivered: ...

AUTO-FIXED: (K건)
- [file:line] 문제 → 수정
...

NEEDS INPUT: (M건)
- [결과 또는 "사용자 승인 완료"]

SPECIALIST REVIEW: (N건, Z specialists)
[각 발견 — confidence 순 내림차순]

ADVERSARIAL REVIEW:
[발견 또는 "추가 이슈 없음"]

───────────────────────────────────────
PR Quality Score: X/10
(10 - critical×2 - informational×0.5, 최소 0)
═══════════════════════════════════════
```

---

## Suppressions

리뷰 전 `checklists/suppressions.md`를 읽고, 해당 패턴과 일치하는 발견은 보고하지 않습니다.

---

## 검증 원칙

- "안전하다"고 주장하려면 → 구체적 줄 번호 인용
- "다른 곳에서 처리됨"이라면 → 해당 코드를 읽고 인용
- "테스트가 커버함"이라면 → 테스트 파일과 메서드명 명시
- "아마 처리됨", "아마 테스트됨" → **금지**. 검증하거나 미확인 표시.

---

## 다음 단계 안내

```
✅ 코드 리뷰 완료! (결과: {PASS/CONDITIONAL/FAIL})
   PR Quality Score: X/10

다음 단계 (선택):
  /minos          → Playwright 자동 테스트
  security-reviewer    → 보안 전문 심층 리뷰
  /commit              → 변경사항 커밋
  /ship                → PR 생성
```

---

## 체크리스트 요약

### Critical (반드시 통과)
- [ ] SQL Injection 방지 (파라미터화 쿼리)
- [ ] Race Condition 없음 (원자적 연산)
- [ ] LLM 출력 검증
- [ ] Shell Injection 방지
- [ ] Enum 값 완전성
- [ ] XSS 방지

### High (강력 권장)
- [ ] 타입 힌트/인터페이스 완벽
- [ ] 단일 책임 원칙 (SRP)
- [ ] 중복 코드 제거 (DRY)

### Medium (권장)
- [ ] 복잡한 로직에 "왜" 주석
- [ ] 명확한 변수/함수명
- [ ] 에러 핸들링 적절

### Low (최적화)
- [ ] N+1 쿼리 방지
- [ ] 메모이제이션
- [ ] 번들 크기 최적화

---

## Severity Levels

| Level | 표시 | 조치 |
|-------|------|------|
| Critical | FAIL | Merge 차단, Fix-First ASK |
| Major | WARN | Fix-First AUTO-FIX 또는 ASK |
| Minor | INFO | Fix-First AUTO-FIX |
| Nitpick | NOTE | Suppression 확인 후 무시 가능 |

---

**버전:** 3.0.0 (Orchestrator Edition)
