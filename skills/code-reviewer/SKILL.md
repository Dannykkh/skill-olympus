---
name: code-reviewer
description: |
  Pre-landing PR 리뷰 정책 레이어. 일반 버그/품질 리뷰는 사용 가능한 CLI 리뷰 엔진(Claude
  review, Codex /review, Grok bundled review)에 위임하고, 네이티브가 못 하는 것 — Scope Drift 감지, 도메인 체크리스트(LLM 신뢰
  경계, Enum 완전성), Action Triage, Suppressions, 통합 보고서 — 를 더합니다. 네이티브 엔진이
  없는 환경은 풀 경로(2-Pass + Specialist 병렬 dispatch)로 폴백합니다. "보안 감사", "security
  review", "취약점 분석" 요청은 안전한 repository security audit 모드로 분기합니다.
  "코드 리뷰 해줘", "review", "리뷰", "PR 체크" 요청에 실행. 코드 작성 완료 시 자동 제안.
---

# Code Reviewer v4 — Policy Layer + Native Engine

PR 단위 코드 리뷰 오케스트레이터. v4부터 **리뷰 엔진과 정책 레이어를 분리**합니다.

```
리뷰 요청
  │
  ├─ Security audit 요청 → references/security-audit.md
  ├─ Step 0~1: 베이스 브랜치 + 리뷰 대상 확인
  ├─ Step 2: 엔진 선택 (CLI 감지)
  │    ├─ 경로 A: Claude/Grok → 사용 가능한 review 엔진
  │    ├─ 경로 B: Codex   → 네이티브 codex review
  │    └─ 경로 C: 풀 경로 (네이티브 없음 — Antigravity 등)
  └─ Step 3: 정책 레이어 P1~P5 (공통)
       P1 Scope Drift → P2 도메인 보강 패스 → P3 Suppressions
       → P4 Action Triage → P5 통합 보고서
```

**설계 원칙**: 네이티브 엔진이 잘하는 일반 리뷰(버그, 보안 기본기, 성능)는 중복 구현하지 않는다.
이 스킬은 네이티브가 안 하는 것만 담당한다.

## 적용 시점

- 명시적 리뷰 요청 시 ("코드 리뷰 해줘", "review")
- 명시적 보안 감사 요청 시 ("보안 감사", "security review", "취약점 분석")
- PR 생성 전 (`/ship` 전)
- 코드 작성 완료 시 자동 제안

보안 감사 요청이면 Step 0~3 대신 [Repository Security Audit Contract](references/security-audit.md)를
읽어 범위를 정합니다. 일반 코드 리뷰와 달리 전체 저장소 감사를 자동 제안하거나 암묵적으로 실행하지 않습니다.

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

1. `git status --short`로 staged, unstaged, untracked 변경을 먼저 확인합니다.
2. 작업 트리에 변경이 있으면 현재 브랜치가 base여도 `--uncommitted` 범위로 검토합니다.
3. 작업 트리가 깨끗하면 기존 `origin/$_BASE` ref와 `git diff origin/$_BASE...HEAD --stat`을 사용합니다.
4. ref가 없거나 사용자가 최신 원격 기준을 요청한 경우에만 `git fetch origin $_BASE --quiet`를 실행합니다.
5. 두 범위 모두 diff가 없을 때만 **"리뷰할 변경이 없습니다."**로 중단합니다.

---

## Step 2: 엔진 선택

| 환경 | 감지 방법 | 경로 |
|------|----------|------|
| Claude Code | 활성 review skill/command가 실제로 존재 | **A — 런타임 위임** |
| Codex CLI | Codex 세션에서 실행 중 (`codex` CLI 환경) | **B — codex review** |
| Grok Build | bundled `review` skill 존재 | **A — 런타임 위임** |
| Antigravity 또는 review 기능이 없는 런타임 | 위 조건 불충족 | **C — 풀 경로** |

네이티브 엔진 호출이 실패하면 경로 C로 폴백하고, P5 보고서에 폴백 사유를 기록합니다.
사용자가 명시적으로 요청하면("풀 경로로 리뷰", "specialist 리뷰") Claude/Codex에서도 경로 C를 사용합니다.

### 경로 A — Claude/Grok 런타임 리뷰 엔진

1. Claude는 활성 review 기능이 확인된 경우에만 호출하고, Grok은 bundled `review`를 사용합니다.
2. 기본 리뷰는 읽기 전용입니다. 수정 옵션을 암묵적으로 전달하지 않습니다.
3. **ultra는 호출 금지** — 원격/과금형 멀티에이전트 리뷰는 사용자 트리거 전용입니다.
   스킬은 호출하지 않으며 권유 안내도 하지 않는다
4. 네이티브 발견을 정규화하여 수집:
   `{"severity":..., "confidence":N, "path":..., "line":N, "category":..., "summary":..., "source":"native"}`

### 경로 B — Codex 네이티브 엔진

1. `codex review --base $_BASE` 실행 — 베이스 브랜치 대비 diff 리뷰.
   커밋 전 변경만 보려면 `codex review --uncommitted` (staged/unstaged/untracked 포함)
2. 자동화 파이프라인에서 구조화 출력이 필요하면 `codex exec review` 사용
   (`codex review`에는 `--json` 옵션이 없음)
3. 발견을 경로 A와 동일 형식으로 정규화 (`source: "native"`)

### 경로 C — 풀 경로 (네이티브 없음)

Scope 감지 → Critical Pass → Specialist dispatch → Adversarial Review.
[풀 경로 상세](#풀-경로-상세-경로-c) 참조. 발견은 `source: "full-pass"`로 정규화.

경로 C의 Critical Pass는 도메인 체크리스트를 이미 포함하므로 **정책 레이어 P2를 생략**합니다.

---

## Step 3: 정책 레이어 (P1~P5)

엔진 발견을 받아 모든 경로가 공통으로 수행합니다.

### P1 — Scope Drift 감지

**계획 대비 실제 구현 검증** — 빠진 것과 초과한 것을 찾습니다. 네이티브 엔진에는 없는 검사입니다.

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

### P2 — 도메인 보강 패스 (경로 A/B만)

네이티브 엔진이 다루지 않는 이 레포 고유 체크리스트만 diff에 적용합니다.

#### LLM 출력 신뢰 경계
- LLM 생성 값 검증 없이 DB 저장/메일러 전달
- 타입/형태 체크 없이 구조화 도구 출력 수용
- 허용 목록 없는 LLM 생성 URL fetch (SSRF)
- 소독 없이 벡터 DB 저장 (저장된 프롬프트 인젝션)

#### Enum & 값 완전성
새 enum 값/상태/타입 상수 추가 시:
- **모든 소비자 추적.** 해당 값으로 switch/filter/표시하는 파일을 Grep → Read.
- **허용 목록/필터 배열 확인.** 형제 값을 포함하는 배열에 새 값 포함 여부.
- **case/if-elsif 체인.** 새 값이 잘못된 기본값으로 fall-through 되는지.

#### 비동기/동기 혼합 (Python)
- async def 안 동기 subprocess.run, open, requests.get → asyncio.to_thread 사용
- async에서 time.sleep → asyncio.sleep
- async 컨텍스트에서 run_in_executor 없는 동기 DB 호출

#### 컬럼/필드명 안전
- ORM 쿼리(.select, .eq, .gte, .order)의 컬럼명이 실제 스키마와 일치하는지
- .get() 호출이 실제 선택된 컬럼명 사용

발견은 `source: "domain"`으로 정규화. 네이티브 발견과 핑거프린트
(`{path}:{line}:{category}`)가 겹치면 최고 confidence 유지 + 1 (최대 10),
"ENGINE+DOMAIN CONFIRMED" 태그.

### P3 — Suppressions

`checklists/suppressions.md`를 읽고 실제 문맥과 경계를 확인한 경우에만 억제합니다. 문자열 일치만으로
자동 억제하지 않으며, 보안 발견에는 비밀이 아님 또는 도달 불가능함을 입증하는 근거가 필요합니다.
P5 보고서에는 억제 건수와 이유를 남깁니다.

### P4 — Action Triage

기본 리뷰는 읽기 전용입니다. 각 발견을 `FIXABLE` 또는 `ASK`로 분류하되 파일을 수정하지 않습니다.
사용자가 처음부터 `--fix`를 명시했거나 리뷰 뒤 수정을 별도로 승인한 경우에만 수정 단계로 넘어갑니다.

#### 분류 기준

```
FIXABLE (명시적 --fix에서만 수정):      ASK (사람 판단 필요):
├─ 죽은 코드 / 미사용 변수              ├─ 보안 (인증, XSS, 인젝션)
├─ N+1 쿼리 (eager loading 추가)        ├─ 경쟁 조건
├─ 코드와 불일치하는 주석               ├─ 설계 결정
├─ 매직 넘버 → 명명 상수               ├─ 대규모 수정 (>20줄)
├─ LLM 출력 검증 누락                   ├─ Enum 완전성
├─ 버전/경로 불일치                     ├─ 기능 제거
├─ 할당 후 미읽는 변수                  └─ 사용자 가시 동작 변경
└─ 인라인 스타일, O(n*m) 뷰 룩업
```

**원칙:** 시니어 엔지니어가 토론 없이 적용할 수정이면 FIXABLE.
합리적 의견이 갈리면 ASK.

#### P4a: 분류
각 발견을 FIXABLE 또는 ASK로 분류.

#### P4b: 명시적 수정 모드

`--fix`가 없으면 이 단계는 건너뜁니다. `--gate`에서는 질문도 수정도 하지 않고 findings와
PASS/CONDITIONAL/FAIL만 반환합니다.

`--fix`가 있을 때만 다음 형식으로 안전한 FIXABLE 항목을 적용합니다.
```
[FIXED] [file:line] 문제 → 수정 내용
```

#### P4c: ASK 일괄 질문

ASK 항목이 있으면 **하나의 질문으로 일괄**:
```
수정 가능 5건을 찾았습니다. 2건은 판단이 필요합니다:

1. [CRITICAL] (confidence: 9/10) app/models/user.py:42 — 상태 전이 경쟁 조건
   수정: WHERE status = 'draft' 추가
   → A) 수정  B) 건너뛰기

2. [INFORMATIONAL] (confidence: 7/10) app/services/ai.py:88 — LLM 출력 타입 미검증
   수정: JSON 스키마 검증 추가
   → A) 수정  B) 건너뛰기

RECOMMENDATION: 모두 수정 권장 — #1은 실제 경쟁 조건, #2는 침묵 데이터 손상 방지.
```

#### P4d: 승인된 수정 적용
사용자가 "수정"을 선택한 항목 적용.

### P5 — 통합 보고서

```
═══════════════════════════════════════
Pre-Landing Review: N issues (X critical, Y informational)
Engine: [native:claude review / native:codex review / bundled:grok review / full-pass]
Specialist: Z개 디스패치 (names)        ← 경로 C만
═══════════════════════════════════════

SCOPE CHECK: [CLEAN / DRIFT / MISSING]
Intent: ...
Delivered: ...

FIXABLE: (K건)
- [file:line] 문제 → 제안 수정
FIXED: (L건, --fix 또는 별도 승인 시만)
- [file:line] 적용한 수정
...

NEEDS INPUT: (M건)
- [결과 또는 "사용자 승인 완료"]

FINDINGS: (N건 — source 표기: native / domain / full-pass)
[각 발견 — confidence 순 내림차순]

ADVERSARIAL REVIEW:                     ← 경로 C만
[발견 또는 "추가 이슈 없음"]

───────────────────────────────────────
PR Quality Score: X/10
(10 - critical×2 - informational×0.5, 최소 0)
═══════════════════════════════════════
```

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

## 풀 경로 상세 (경로 C)

네이티브 엔진이 없는 환경(Antigravity 등) 또는 네이티브 호출 실패 시 사용합니다.

### C-1: Scope 감지

```bash
# 변경된 파일 분석
_DIFF_STAT=$(git diff origin/$_BASE...HEAD --stat)
_DIFF_LINES=$(git diff origin/$_BASE...HEAD --numstat | awk '{add+=$1; del+=$2} END {print add+del+0}')
echo "DIFF_LINES: $_DIFF_LINES"

# 스코프 시그널
_HAS_BACKEND=false; _HAS_FRONTEND=false; _HAS_API=false
_HAS_MIGRATIONS=false; _HAS_AUTH=false
_CHANGED_FILES=$(git diff origin/$_BASE...HEAD --name-only)
echo "$_CHANGED_FILES" | grep -qiE '\.(py|rb|java|go|cs|rs|kt)$' && _HAS_BACKEND=true
echo "$_CHANGED_FILES" | grep -qiE '\.(tsx?|jsx?|vue|svelte|css|scss)$' && _HAS_FRONTEND=true
echo "$_CHANGED_FILES" | grep -qiE '(controller|route|endpoint|api|handler)' && _HAS_API=true
echo "$_CHANGED_FILES" | grep -qiE '(migrat|schema|alembic|flyway)' && _HAS_MIGRATIONS=true
echo "$_CHANGED_FILES" | grep -qiE '(auth|login|session|token|permission|role)' && _HAS_AUTH=true

echo "SCOPE: backend=$_HAS_BACKEND frontend=$_HAS_FRONTEND api=$_HAS_API migrations=$_HAS_MIGRATIONS auth=$_HAS_AUTH"
```

### C-2: Critical Pass (핵심 리뷰)

`git diff origin/$_BASE`의 전체 diff를 가져와 아래 카테고리를 검사합니다.

#### Pass 1 — CRITICAL (최고 심각도)

##### SQL & 데이터 안전
- 문자열 보간 SQL (`.to_i`/`.to_f`여도 파라미터화 쿼리 사용)
- TOCTOU 경쟁: check-then-set → 원자적 `WHERE` + `update_all`
- 모델 검증 우회 직접 DB 쓰기 (update_column, QuerySet.update, raw query)
- N+1 쿼리: 루프에서 사용되는 연관에 eager loading 누락

##### Race Condition & 동시성
- 유니크 제약/중복 키 에러 없는 read-check-write
- 유니크 DB 인덱스 없는 find-or-create
- 원자적 WHERE 없는 상태 전이
- 사용자 제어 데이터에 안전하지 않은 HTML 렌더링 (XSS)

##### LLM 출력 신뢰 경계
- P2 도메인 보강 패스와 동일 체크리스트 적용

##### Shell Injection
- `subprocess.run(shell=True)` + f-string 보간 → 인자 배열 사용
- `os.system()`에 변수 보간 → `subprocess.run()` 인자 배열
- LLM 생성 코드에 대한 `eval()`/`exec()` (샌드박싱 없음)

##### Enum & 값 완전성
- P2 도메인 보강 패스와 동일 체크리스트 적용

#### Pass 2 — INFORMATIONAL

##### 비동기/동기 혼합 (Python) · 컬럼/필드명 안전
- P2 도메인 보강 패스와 동일 체크리스트 적용

##### 타입 정의
- Python: 타입 힌트 누락 (반환/파라미터)
- TypeScript: `any` 사용, 명확한 인터페이스 미정의

##### CI/CD Pipeline
- 워크플로우 변경 시 빌드 도구 버전, 아티팩트 경로, 시크릿 사용 확인
- 버전 태그 형식 일관성 (v1.2.3 vs 1.2.3)

### C-3: Specialist 병렬 Dispatch

#### 50줄 미만 diff
"소규모 diff ($_DIFF_LINES줄) — specialist 생략." → 정책 레이어로.

#### Specialist 선택

| Specialist | 조건 | 파일 |
|-----------|------|------|
| Testing | 항상 | `specialists/testing.md` |
| Maintainability | 항상 | `specialists/maintainability.md` |
| Security | auth 변경 또는 백엔드 > 100줄 | `specialists/security.md` |
| Performance | 백엔드 또는 프론트엔드 | `specialists/performance.md` |
| Data Migration | 마이그레이션 파일 변경 | `specialists/data-migration.md` |
| API Contract | API 파일 변경 | `specialists/api-contract.md` |
| Design | 프론트엔드 파일 변경 | `specialists/design.md` |

#### Dispatch

선택된 specialist마다 **읽기 전용 탐색·검토 역할**을 배정합니다. 역할명은 의미 계약이며,
현재 CLI가 제공하는 내장 explorer/reviewer를 사용합니다. 각 역할은 diff와 체크리스트만 읽고
파일 수정, 커밋, 상태를 바꾸는 명령을 수행하지 않습니다. 네이티브 병렬 위임이 가능하면 함께
실행하고, 위임 기능이 없거나 실패하면 메인 컨텍스트에서 specialist 체크리스트를 하나씩 순차 적용합니다.
수정 가능한 일반 작업 역할은 이 단계에서 사용하지 않으며, 실제 수정은 P4의 명시적 `--fix` 경로가 담당합니다.

각 검토 역할 프롬프트:
```
[specialist name] specialist 코드 리뷰어로서 활동하세요.
아래 체크리스트를 읽고, `git diff origin/[base]`로 diff를 가져와 체크리스트를 적용하세요.

발견 시 한 줄에 하나씩 JSON 출력:
{"severity":"CRITICAL|INFORMATIONAL","confidence":N,"path":"file","line":N,"category":"[category]","summary":"설명","fix":"수정 방법","specialist":"[name]"}

발견 없으면: NO FINDINGS

체크리스트:
[체크리스트 내용]
```

#### 결과 수집 & 중복 제거

1. 각 specialist 출력에서 JSON 파싱 (NO FINDINGS → 건너뛰기)
2. 핑거프린트: `{path}:{line}:{category}`
3. 동일 핑거프린트 → 최고 confidence 유지, confidence +1 (최대 10)
4. 태그: "MULTI-SPECIALIST CONFIRMED (specialist1 + specialist2)"

### C-4: Adversarial Review (적대적 리뷰)

가능하면 C-3과 분리된 읽기 전용 검토 역할에 위임하여 체크리스트 편향 없는 시각을 얻습니다.
위임할 수 없으면 메인 컨텍스트에서 C-3 결과를 확정하기 전에 아래 프롬프트로 별도 순차 패스를
수행하고, 보고서에 `adversarial: sequential-main`으로 표시합니다.

프롬프트:
```
이 브랜치의 diff를 `git diff origin/[base]`로 읽으세요.
공격자와 카오스 엔지니어의 관점으로 이 코드가 프로덕션에서 실패할 방법을 찾으세요.
엣지 케이스, 경쟁 조건, 보안 취약점, 리소스 누수, 침묵 데이터 손상, 에러 삼킴.
칭찬 없이 문제만. 각 발견을 FIXABLE(수정 방법 알음) 또는 INVESTIGATE(사람 판단 필요)로 분류.
```

---

## 포세이돈(agent-team) 연동

agent-team Step 5(자재검사)의 reviewer teammate는 Skill 도구 접근이 보장되지 않으므로
**경로 C 체크리스트(C-2 + specialist)를 teammate 프롬프트에 임베드하여 직접 적용**합니다.
네이티브 엔진 위임은 메인 세션에서 이 스킬을 직접 실행할 때만 사용합니다.

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
  /code-reviewer 보안 감사 → 저장소 보안 심층 감사
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
| Critical | FAIL | Merge 차단, ASK |
| Major | WARN | FIXABLE 또는 ASK |
| Minor | INFO | FIXABLE |
| Nitpick | NOTE | Suppression 확인 후 무시 가능 |

---

**버전:** 4.1.0 (Policy Layer + Safe Security Audit)
