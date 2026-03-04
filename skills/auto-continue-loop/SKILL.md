---
name: auto-continue-loop
description: >
  Use when the user repeatedly says "next", "continue", "다음 진행", "계속 진행"
  and wants iterative code review and bug-fix cycles without re-planning each turn.
  Runs a loop of review, fix, verify, and report until stop criteria are met.
  /auto-continue-loop 또는 /loop로 실행.
triggers:
  - "auto-continue-loop"
  - "loop"
  - "다음 진행"
  - "계속 진행"
  - "진행하자"
  - "계속해"
  - "next"
  - "continue fixing"
  - "keep going"
  - "끝까지 진행"
auto_apply: false
---

# Auto Continue Loop

> 한 번 시작하면 멈출 때까지 계속: 이슈 찾기 → 수정 → 검증 → 다음 이슈.

---

## Overview

반복적인 "다음 진행" 요청을 하나의 자율 루프로 처리합니다.
매 사이클마다: 가장 중요한 이슈 탐색 → 최소 패치 → 검증 → 즉시 다음으로.

**사용자 개입 없이 자동 진행합니다. 절대 "계속할까요?"라고 묻지 마세요.**

---

## Trigger Rules

### 이 스킬을 사용하는 경우:
- 사용자가 `다음 진행`, `계속 진행`, `진행하자`, `next`, `continue` 등을 반복
- 사용자가 "끝까지 해줘", "다 고쳐줘", "루프로 진행" 등 루프 실행을 요청
- 사용자가 코드 리뷰/버그 수정을 반복적으로 요청

### 이 스킬을 사용하지 않는 경우:
- 사용자가 요약만 요청 (pause, 요약, summary)
- 주제가 완전히 바뀜
- 설계/기획 단계 (→ zephermine 사용)

---

## Phase 0: 스코프 확인 (최초 1회만)

루프 시작 전 스코프를 확정합니다.

### 0-1. 스코프 결정

`$ARGUMENTS`가 있으면 해당 경로를 스코프로 사용합니다.

없으면 아래 순서로 자동 감지:
1. 현재 세션에서 이미 작업 중인 디렉토리/파일 패턴
2. git diff로 최근 변경된 파일 영역
3. 프로젝트 루트 전체

```
스코프 확정: {디렉토리/파일 목록}
우선순위: 보안 > 데이터 무결성 > 버그 > 스코프 격리 > 코드 품질
```

### 0-2. 이슈 목록 초기 스캔

스코프 내에서 코드를 읽고 잠재적 이슈를 심각도 순으로 정렬합니다.
**목록을 출력하지 마세요.** 바로 Cycle 1로 진입합니다.

---

## Loop Contract (반복 사이클)

**⚠️ CRITICAL: 이 루프는 Stop Condition에 도달할 때까지 자동으로 반복합니다.**
**매 사이클 후 멈추지 말고 즉시 다음 사이클로 진입하세요.**

### 각 사이클에서 수행하는 4단계:

```
┌─────────────────────────────────────────┐
│  Cycle N                                │
│                                         │
│  1. FIND: 남은 이슈 중 최고 심각도 선택  │
│       ↓                                 │
│  2. FIX: 최소 안전 패치 적용             │
│       ↓                                 │
│  3. VERIFY: 관련 테스트/빌드 실행        │
│       ↓                                 │
│  4. REPORT: 간결한 결과 출력             │
│       ↓                                 │
│  → 즉시 Cycle N+1로 진입               │
└─────────────────────────────────────────┘
```

### Step 1: FIND — 이슈 탐색

- 스코프 내에서 아직 수정하지 않은 가장 심각한 이슈를 **1개** 선택
- 심각도 순서: Critical(보안) > High(버그/데이터) > Medium(스코프/구조) > Low(스타일)
- 이전 사이클에서 수정한 이슈는 건너뜀

### Step 2: FIX — 최소 안전 패치

- **최소 변경 원칙**: 이슈 해결에 필요한 최소한의 코드만 변경
- 관련 없는 리팩토링/개선은 하지 않음
- Edit 도구로 정확한 변경 적용

### Step 3: VERIFY — 검증

변경에 맞는 검증을 실행합니다:

| 변경 유형 | 검증 명령 |
|-----------|-----------|
| Backend (Java/Spring) | 관련 `mvn test` 타겟 |
| Backend (Python) | 관련 `pytest` 타겟 |
| Backend (Node) | 관련 `npm test` 타겟 |
| Frontend (React/TS) | `npm run typecheck` + 관련 테스트 |
| Frontend (빌드) | `npm run build` |
| 보안/스코프 수정 | 네거티브 경로 테스트 포함 |
| 설정/인프라 | 해당 검증 도구 |

**검증 실패 시:**
- 즉시 수정 시도 (같은 사이클 내)
- 3회 실패하면 해당 이슈를 SKIP 처리하고 다음으로 진행
- SKIP된 이슈는 최종 보고서에 포함

### Step 4: REPORT — 간결한 결과

매 사이클 출력 형식 (이것만 출력, 그 외 설명 금지):

```
── Cycle {N} ──────────────────────────
Issue: {무엇을 발견했는지 1줄}
Fix:   {무엇을 변경했는지 1줄} ({파일:라인})
Verify: {실행한 명령} → {PASS/FAIL}
Next:  {다음에 처리할 이슈 1줄}
────────────────────────────────────────
```

**출력 후 멈추지 않고 바로 다음 사이클 시작.**

---

## Stop Conditions

**아래 중 하나라도 해당하면 루프를 멈추세요:**

1. **사용자 중지**: `중지`, `멈춰`, `pause`, `stop`, `그만` 등 사용자가 명시적으로 중단
2. **이슈 소진**: 스코프 내 High/Medium 이상 이슈가 더 이상 없음
3. **환경 차단**: 빌드/테스트 환경 문제로 안전한 진행이 불가 (정확한 차단 사유 보고)

### 루프 종료 시 최종 보고서

```
══ Loop Complete ══════════════════════
Total cycles: {N}
Fixed: {수정 완료 수}건
Skipped: {건너뛴 수}건
Remaining: {남은 Low 이슈 수}건

Fixed Issues:
  ✅ {이슈1} ({파일})
  ✅ {이슈2} ({파일})

Skipped Issues (수동 확인 필요):
  ⚠️ {이슈} — 사유: {왜 건너뛰었는지}

Remaining Low-priority:
  ℹ️ {이슈} — 자동 수정 범위 밖
═══════════════════════════════════════
```

---

## Quality Gates

**절대 검증 없이 완료를 주장하지 마세요:**

- 변경 후 반드시 관련 테스트 또는 빌드 실행
- 보안/스코프 수정은 네거티브 경로 어서션 포함
- 테스트 명령어가 없는 프로젝트: `typecheck` 또는 `build`라도 실행
- 아무 검증 도구도 없으면: 수동 확인 필요로 표시

---

## Anti-Patterns (하지 말 것)

| 금지 | 이유 |
|------|------|
| "계속할까요?" 질문 | 루프의 존재 이유를 무효화 |
| 전체 이슈 목록 나열 | 시간 낭비, 바로 수정 |
| 이전 작업 재설명 | 사용자가 이미 봄 |
| 한 번에 여러 이슈 수정 | 검증이 어려워짐 |
| 관련 없는 리팩토링 | 최소 변경 원칙 위반 |
| AskUserQuestion 호출 | 루프 중단 금지 |

---

## Usage Examples

```
# 기본 사용 — 현재 작업 영역에서 루프 시작
/loop

# 특정 디렉토리 대상
/loop src/backend/

# 특정 패턴
/loop "보안 이슈 위주로"

# 프론트엔드만
/loop src/components/

# 이미 진행 중인 세션에서 계속
계속 진행
다음
next
```

---

## Related Files

| 파일 | 역할 |
|------|------|
| `skills/code-reviewer/SKILL.md` | 코드 리뷰 기준 참조 |
| `skills/systematic-debugging/SKILL.md` | 디버깅 방법론 참조 |
| `skills/reducing-entropy/SKILL.md` | 기술부채 탐지 체크리스트 |
| `agents/security-reviewer.md` | 보안 이슈 기준 참조 |
