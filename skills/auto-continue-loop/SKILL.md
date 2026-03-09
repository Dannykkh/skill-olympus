---
name: auto-continue-loop
description: >
  Use when the user wants uninterrupted "continue automatically" execution without
  repeatedly saying "next", "continue", "다음 진행", or "계속 진행". If a next-step
  recommendation or priority response appears, Chronos must treat the top actionable
  item as the next cycle automatically.
  Delegates the entire loop to a subagent for uninterrupted execution.
  /auto-continue-loop 또는 /loop 또는 /chronos로 실행. Also known as 크로노스.
triggers:
  - "auto-continue-loop"
  - "chronos"
  - "크로노스"
  - "loop"
  - "다음 진행"
  - "계속 진행"
  - "진행하자"
  - "계속해"
  - "next"
  - "continue fixing"
  - "keep going"
  - "끝까지 진행"
  - "끝까지 알아서"
  - "우선순위대로 진행"
  - "추천 나오면 계속"
auto_apply: false
---

# Chronos (크로노스)

> **Chronos**(크로노스: 시간의 신) — 끝없이 돌아가는 시간의 수레바퀴.
> 멈추지 않고 계속 돈다 — 끊김 없는 자율 루프.

서브에이전트가 자율적으로 이슈 찾기 → 수정 → 검증을 반복합니다.
매 사이클의 진행 상황은 `docs/chronos/chronos-log.md`에 실시간 기록됩니다.

---

## Overview

반복적인 "다음 진행" 요청을 **서브에이전트 위임**으로 처리합니다.
메인 컨텍스트는 스코프만 확정하고, 전체 루프를 서브에이전트에 넘깁니다.
서브에이전트가 자기 컨텍스트 안에서 자율적으로 FIND → FIX → VERIFY를 반복합니다.

**사용자 개입 0회. "다음" 입력 불필요.**

추천/우선순위/다음 작업 같은 응답은 **최종 응답 후보가 아니라 내부 작업 큐**로 취급합니다.
즉, 크로노스는 "다음으로 이것을 하세요"라고 말하는 대신 **그 항목을 바로 다음 사이클에서 수행**해야 합니다.

---

## Auto-Continuation Contract

- `다음 작업 추천`, `우선순위`, `남은 작업`, `Recommended next step` 같은 내용이 나오려는 순간, 가장 위의 actionable item을 **즉시 다음 사이클로 승격**합니다.
- 현재 scope 안에 있고 외부 승인/비밀값/수동 조작 없이 진행 가능한 작업이면 **사용자에게 다시 묻지 않고 계속 진행**합니다.
- 사용자에게 다시 넘기는 경우는 다음 3가지뿐입니다:
  - 더 이상 실행 가능한 in-scope 작업이 없음
  - 남은 작업이 전부 blocked / out-of-scope / manual-only
  - 사용자가 처음부터 우선순위 범위를 제한함 (예: "보안만", "High까지만")

---

## Trigger Rules

### 이 스킬을 사용하는 경우:
- 사용자가 `다음 진행`, `계속 진행`, `진행하자`, `next`, `continue` 등을 반복
- 사용자가 "끝까지 해줘", "다 고쳐줘", "루프로 진행" 등 루프 실행을 요청
- 사용자가 "끝까지 알아서", "우선순위대로 계속", "추천 나오면 바로 진행"처럼 **반복 입력 없는 자동 연속 실행**을 원함
- 사용자가 코드 리뷰/버그 수정을 반복적으로 요청

### 이 스킬을 사용하지 않는 경우:
- 사용자가 요약만 요청 (pause, 요약, summary)
- 주제가 완전히 바뀜
- 설계/기획 단계 (→ zephermine 사용)

---

## CLI별 실행 모드

| CLI | 실행 방식 | 서브에이전트 도구 |
|-----|----------|-----------------|
| **Claude** | Agent 서브에이전트 위임 | `Agent({ subagent_type, prompt })` |
| **Codex** | spawn_agent 서브에이전트 위임 | `spawn_agent` → `send_message` → `wait` → `close_agent` |
| **Gemini** | 사전 정의 서브에이전트 호출 | `.gemini/agents/chronos-worker.md` → 메인이 자동 위임 |

### CLI 감지 방법

Phase 0 시작 시 자동 판별:
- `Agent` 도구 사용 가능 → **Claude 모드** (Phase 1-A)
- `spawn_agent` 도구 사용 가능 → **Codex 모드** (Phase 1-B)
- `chronos-worker` 서브에이전트 사용 가능 → **Gemini 모드** (Phase 1-C)
- 모두 없음 → **Direct 모드** (Phase 1-D: 직접 루프)

---

## Phase 0: 스코프 확인 (메인 컨텍스트)

루프 시작 전 스코프를 확정합니다. 이 단계만 메인 컨텍스트에서 실행.

### 0-1. 스코프 결정

`$ARGUMENTS`가 있으면 해당 경로를 스코프로 사용합니다.

없으면 아래 순서로 자동 감지:
1. 현재 세션에서 이미 작업 중인 디렉토리/파일 패턴
2. `git diff --name-only`로 최근 변경된 파일 영역
3. 프로젝트 루트 전체

### 0-2. 테스트 프레임워크 감지

스코프 내에서 사용 가능한 검증 명령을 파악합니다:

```
package.json → npm test / npx jest / npx vitest
pytest.ini / pyproject.toml → pytest
pom.xml → mvn test
*.csproj → dotnet test
tsconfig.json → npx tsc --noEmit
없음 → "수동 확인 필요" 모드
```

### 0-3. 사용자에게 시작 알림

```
크로노스(Chronos) 시작
스코프: {디렉토리/파일 목록}
검증: {감지된 테스트 명령}
로그: docs/chronos/chronos-log.md (실시간 확인 가능)

서브에이전트에 위임합니다. 완료되면 최종 보고서를 보여드립니다.
진행 상황은 다른 터미널에서 확인 가능:
  tail -f docs/chronos/chronos-log.md        # Linux/Mac
  Get-Content docs/chronos/chronos-log.md -Wait  # Windows PowerShell

추천/우선순위 응답은 내부 큐로 처리하며, 사용자에게 다시 "다음"을 입력받지 않습니다.
```

---

## Phase 1-A: 서브에이전트 위임 (Claude)

`Agent` 도구가 사용 가능할 때 이 경로로 진행합니다.

```
Agent({
  subagent_type: "general-purpose",
  description: "크로노스 이슈 수정 루프",
  prompt: <아래 공통 루프 프롬프트를 {변수} 치환하여 전달>
})
```

서브에이전트 완료 후 → Phase 2로 이동.

---

## Phase 1-B: 서브에이전트 위임 (Codex)

`spawn_agent` 도구가 사용 가능할 때 이 경로로 진행합니다.

```
1. spawn_agent로 서브에이전트 생성
2. send_message로 공통 루프 프롬프트 전달
3. wait로 완료 대기 (timeout_ms: 작업 규모에 비례하여 설정)
4. 결과 수신
5. close_agent로 서브에이전트 종료
```

**Codex 서브에이전트 지시 시 추가 규칙:**
- "다른 에이전트가 없으니 자유롭게 작업해도 됨"
- "서브에이전트를 추가로 생성하지 마 (무한 재귀 방지)"
- "완료 시 최종 보고를 메시지로 반환해"

서브에이전트 완료 후 → Phase 2로 이동.

---

## Phase 1-C: 서브에이전트 위임 (Gemini)

Gemini CLI의 서브에이전트 시스템을 활용합니다.
사전에 `.gemini/agents/chronos-worker.md` 파일이 정의되어 있어야 합니다.

**Gemini 서브에이전트는 선언적 방식** — 파일로 정의해두면 메인 에이전트가 description을 보고 자동 호출합니다.

메인 에이전트가 할 일:
```
"chronos-worker에게 위임해. 스코프: {스코프}, 검증 명령: {명령}.
현재 scope 안의 actionable 이슈를 우선순위 순으로 수정하고 docs/chronos/chronos-log.md에 기록해."
```

**전제 조건:**
- `settings.json`에 `"experimental": { "enableAgents": true }` 설정
- `.gemini/agents/chronos-worker.md` 파일 존재 (전역 동기화 시 자동 설치되는 로컬 에이전트 정의)

서브에이전트 완료 후 → Phase 2로 이동.

### chronos-worker.md (Gemini 서브에이전트 정의)

전역 설치 시 `~/.gemini/agents/chronos-worker.md`로 동기화되는 원본 파일:

`skills/auto-continue-loop/agents/chronos-worker.md`

이 파일은 동일한 자동 연장 규칙을 사용하며, 추천/우선순위 응답을 내부 다음 사이클로 승격합니다.

---

## Phase 1-D: 직접 루프 (폴백)

서브에이전트 도구가 모두 없을 때 최후 수단으로 진행합니다.
메인 컨텍스트에서 직접 루프를 실행합니다.

**아래 공통 루프 프롬프트의 규칙을 그대로 따르되, 자기 자신이 루프를 실행합니다.**

⚠️ **CRITICAL: 사이클 사이에 절대 멈추지 마세요.**
- 사용자 확인을 요청하지 않음
- 중간 보고 출력 후 대기하지 않음
- 로그 파일에만 기록하고 즉시 다음 사이클 진입
- 종료 조건에 도달할 때까지 연속 실행

루프 완료 후 → Phase 2로 이동.

---

## 공통 루프 프롬프트

Phase 1-A에서는 서브에이전트에 전달하고, Phase 1-B에서는 자기 자신이 따릅니다.
`{변수}` 부분을 Phase 0에서 수집한 정보로 채웁니다.

```
너는 크로노스(Chronos) — 코드 이슈를 자동으로 찾아 수정하는 루프 에이전트야.
아래 규칙에 따라 모든 이슈를 처리할 때까지 자율적으로 반복해.

## 스코프
{Phase 0에서 확정한 디렉토리/파일 목록}

## 검증 명령
{Phase 0에서 감지한 테스트 명령}

## 로그 파일
매 사이클 완료 시 `docs/chronos/chronos-log.md`에 결과를 **append** 해.
사용자가 다른 터미널에서 실시간으로 확인한다.

로그 기록 방법 (Bash):
  echo '── Cycle N ──────────────────────────' >> docs/chronos/chronos-log.md
  echo 'Issue: ...' >> docs/chronos/chronos-log.md
  echo 'Fix:   ...' >> docs/chronos/chronos-log.md
  echo 'Verify: ... → PASS' >> docs/chronos/chronos-log.md
  echo '────────────────────────────────────────' >> docs/chronos/chronos-log.md

첫 사이클 시작 전 디렉토리 생성 + 로그 파일 초기화:
  mkdir -p docs/chronos
  echo '# Chronos Log' > docs/chronos/chronos-log.md
  echo "Started: $(date -Iseconds)" >> docs/chronos/chronos-log.md
  echo 'Scope: {스코프}' >> docs/chronos/chronos-log.md
  echo '' >> docs/chronos/chronos-log.md

## 우선순위
Critical(보안) > High(버그/데이터 무결성) > Medium(구조/스코프) > Low(스타일)

## 자동 연장 규칙

- `다음 작업 추천`, `우선순위`, `권장 순서`, `남은 작업`을 사용자에게 보여주고 멈추지 마.
- 그런 응답을 만들려는 순간, 가장 위의 actionable item을 **즉시 다음 FIND 대상으로 승격**해.
- 추천 항목이 현재 scope 안이고 외부 승인/비밀값/브라우저 수동 조작 없이 수행 가능하면 즉시 다음 cycle로 들어가.
- 추천 항목이 blocked / out-of-scope / manual-only일 때만 최종 보고에 남겨.
- 사용자가 `"보안만"`, `"High까지만"`처럼 범위를 명시했다면 그 범위 밖 이슈는 remaining으로만 기록하고 종료할 수 있어.

## 사이클 규칙

매 사이클에서 4단계를 수행해:

1. FIND: 스코프 내에서 아직 수정하지 않은 가장 심각한 이슈 1개, 또는 직전 사이클에서 승격된 next-action 1개 선택
2. FIX: 최소 변경 원칙 — 이슈 해결에 필요한 최소한의 코드만 수정
3. VERIFY: 검증 명령 실행. 실패 시 즉시 수정 재시도 (같은 사이클 내 최대 3회)
   - 3회 실패 → SKIP 처리하고 다음 이슈로
4. LOG: docs/chronos/chronos-log.md에 append (위 형식 준수)

로그 기록 후 멈추지 말고 즉시 다음 사이클 시작.

## 종료 조건

아래 중 하나라도 해당하면 루프 종료:
- 현재 scope 안에서 실행 가능한 이슈가 더 이상 없음
- 남은 이슈가 전부 blocked / out-of-scope / manual-only
- 환경 문제로 진행 불가 (DB 미연결, 포트 충돌 등)

## 금지 사항
- AskUserQuestion 호출 금지 (사용자에게 묻지 않음)
- 전체 이슈 목록 나열 금지
- 한 번에 여러 이슈 동시 수정 금지
- 관련 없는 리팩토링 금지
- scope 밖 파일 수정 금지
- 사이클 사이에 멈추거나 대기 금지
- "다음으로는 X를 추천합니다" 같은 문장으로 마무리 금지
- 사용자에게 "계속할까요?" 또는 "다음 진행하실래요?" 묻기 금지

## 최종 보고

루프 종료 시 docs/chronos/chronos-log.md에 최종 요약을 append하고, 같은 내용을 반환해:

══ Chronos Complete ══════════════════
Total cycles: {N}
Fixed: {N}건
Skipped: {N}건
Remaining: {N}건 (blocked / out-of-scope / optional)

Fixed Issues:
  ✅ {이슈} ({파일})
  ...

Skipped Issues:
  ⚠️ {이슈} — 사유: {왜}
  ...

Remaining:
  ℹ️ {이슈} — 사유: {왜}
  ...
═══════════════════════════════════════
```

---

## Phase 2: 결과 수신 (메인 컨텍스트)

최종 보고서를 사용자에게 표시합니다.
- Phase 1-A (Claude): Agent 서브에이전트가 반환한 결과
- Phase 1-B (Codex): spawn_agent 서브에이전트가 반환한 결과
- Phase 1-C (Gemini): chronos-worker 서브에이전트가 반환한 결과
- Phase 1-D (폴백): 직접 루프 완료 후 로그에서 요약

중요:
- 현재 scope 안에서 실행 가능한 다음 작업이 있으면 **Phase 1로 즉시 되돌아가 계속 진행**합니다.
- 최종 보고에는 사용자가 다시 `"다음 진행"`을 입력해야만 할 것 같은 추천 문구를 넣지 않습니다.
- 사용자는 중단, 범위 변경, 우선순위 제한 같은 override만 지시합니다.

---

## 실시간 모니터링

서브에이전트가 작업하는 동안 다른 터미널에서 진행 상황을 확인할 수 있습니다:

```bash
# Linux/Mac
tail -f docs/chronos/chronos-log.md

# Windows PowerShell
Get-Content docs/chronos/chronos-log.md -Wait

# 또는 VS Code에서 docs/chronos/chronos-log.md 열기 (자동 갱신)
```

로그 파일 예시:
```markdown
# Chronos Log
Started: 2026-03-06 14:30:00
Scope: src/backend/

── Cycle 1 ──────────────────────────
Issue: SQL injection in UserService.ts:42
Fix:   parameterized query로 교체 (src/backend/UserService.ts:42)
Verify: npm test → PASS
────────────────────────────────────────
── Cycle 2 ──────────────────────────
Issue: missing null check in OrderController.ts:78
Fix:   early return 추가 (src/backend/OrderController.ts:78)
Verify: npm test → PASS
────────────────────────────────────────
── Cycle 3 ──────────────────────────
Issue: unhandled promise rejection in PaymentService.ts:103
Fix:   try-catch 추가 (src/backend/PaymentService.ts:103)
Verify: npm test → FAIL → 수정 재시도 → PASS
────────────────────────────────────────

══ Chronos Complete ══════════════════
Total cycles: 3
Fixed: 3건
Skipped: 0건
Remaining: 2건 (Low)

Fixed Issues:
  ✅ SQL injection (UserService.ts:42)
  ✅ missing null check (OrderController.ts:78)
  ✅ unhandled promise rejection (PaymentService.ts:103)

Remaining Low-priority:
  ℹ️ console.log 제거 (UserService.ts:15)
  ℹ️ 미사용 import (OrderController.ts:3)
═══════════════════════════════════════
```

---

## Usage Examples

```
# 기본 사용 — 자동 스코프 감지
/chronos

# 특정 디렉토리 대상
/chronos src/backend/

# 특정 지시
/chronos "보안 이슈 위주로"

# 기존 명령어도 호환
/loop
/loop src/components/
```

---

## Related Files

| 파일 | 역할 |
|------|------|
| `skills/code-reviewer/SKILL.md` | 코드 리뷰 기준 참조 |
| `skills/systematic-debugging/SKILL.md` | 디버깅 방법론 참조 |
| `skills/reducing-entropy/SKILL.md` | 기술부채 탐지 체크리스트 |
| `agents/security-reviewer.md` | 보안 이슈 기준 참조 |
