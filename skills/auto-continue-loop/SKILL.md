---
name: auto-continue-loop
description: >
  네이티브 /goal(Stop 게이트)을 녹여 쓰는 자율 작업 규율 스킬. 주 진입점은 /chronos.
  goal은 "끝까지 안 멈추기"(지속성)를 담당하고, 크로노스는 goal이 못 하는 것 — 자가 판단이 아닌
  실제 테스트 실행 검증, 우선순위 사이클(Critical>High>Medium>Low), 한 사이클 한 이슈, 감사 로그 — 을 더합니다.
  크로노스는 goal을 자동 호출하지 않고, 규율을 녹인 goal 목표문을 생성·제시합니다(설정은 /goal 입력 한 번).
  goal이 없는 환경(Gemini/구버전)에서는 Stop 훅·notify 자동 재개로 폴백합니다.
  --max-iterations와 --completion-promise로 제어. /chronos 또는 /loop로 실행. Also known as 크로노스.
triggers:
  - "auto-continue-loop"
  - "chronos"
  - "크로노스"
  - "loop"
  - "goal"
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
> 수레바퀴를 굴리는 힘(지속성)은 네이티브 `/goal`이 제공하고,
> 크로노스는 그 위에서 **무엇을 검증하고 어떤 순서로 돌지**를 규율한다.

**주 진입점은 `/chronos`입니다.** 사용자는 대부분 크로노스를 호출하고, 크로노스가 그 안에 `/goal`을 녹여 씁니다.
goal은 *지치지 않는 의지*(Stop 게이트), 크로노스는 *멈출 줄 아는 판단력*(검증 규율)입니다.

---

## /goal과 크로노스 — 역할 분리

2026년 5월 Claude Code와 Codex에 네이티브 `/goal`("Set a goal Claude checks before stopping")이 들어왔습니다.
이건 **멈추기 전에 목표 달성을 체크하는 Stop 게이트**로, 크로노스의 `loop-stop` 훅과 **같은 레이어**입니다.
그래서 둘은 "자동 위임" 관계가 아니라 **역할을 나누는** 관계입니다.

| 레이어 | 담당 | 제공 주체 |
|--------|------|-----------|
| **지속성** (끝까지 돌리기, Stop마다 목표 체크) | 목표가 충족될 때까지 세션을 살림 | **네이티브 `/goal`** (폴백: 훅·notify) |
| **검증 게이트** (무엇으로 멈출지) | 자가 판단이 아니라 **실제 테스트 명령 실행** + `<promise>` 매칭 | **크로노스** |
| **구조** (어떤 순서로 돌지) | FIND→FIX→VERIFY + 우선순위 + 한 사이클 한 이슈 + 최소 변경 | **크로노스** |
| **흔적** (무엇을 했는지) | `docs/chronos/chronos-log.md` 감사 로그 | **크로노스** |
| **흐름 검증** (제대로 됐는지) | flow-verifier로 구현 흐름 대조 (선택) | **크로노스** |

> **`/goal` 단독과의 결정적 차이:** goal은 목표 달성을 *모델이 자가 판단*하면 멈춥니다.
> 크로노스는 그 위에 **검증 게이트**를 두어, 테스트 명령이 실제로 PASS하기 전에는 완료를 선언하지 못하게 합니다 —
> "다 된 것 같다"와 "검증으로 확인됐다"를 분리합니다.

### 크로노스는 goal을 자동 호출하지 않습니다 (중요)

스킬은 프롬프트 지시문이고, `/goal`은 사용자 입력으로 켜지는 네이티브 커맨드입니다.
크로노스가 런타임에 `/goal`을 프로그램적으로 띄우는 도구는 없습니다. 따라서 통합은 이렇게 동작합니다:

1. 크로노스가 **검증·우선순위·완료조건·로그 규칙을 녹인 goal 목표문**을 생성해 제시
2. 사용자가 그 목표문을 `/goal`로 설정 (입력 한 번)
3. 이후 네이티브 goal이 Stop마다 체크하고, 크로노스 규율대로 진행

"크로노스를 호출하면 goal이 자동으로 돌아간다"가 아니라, **"크로노스가 goal을 잘 쓰도록 목표문을 짜주고, 켜는 건 사용자"**입니다.

### goal 목표문 필수 요소 (Codex·Claude 공통)

크로노스가 생성하는 goal 목표문은 양쪽 CLI에서 동일하게 작동하도록 아래 5가지를 반드시 포함합니다.
특히 **Claude `/goal`의 평가자는 명령을 실행하지 않고 Claude의 대화 출력만 보고 완료를 판정**합니다.
따라서 "검증 결과를 대화에 출력"이 빠지면 평가자가 PASS를 인식하지 못합니다(Codex는 직접 실행하므로 무관하지만, 양쪽 호환을 위해 항상 포함).

1. **측정 가능한 end state** — 예: "test/auth 전부 통과 + 커버리지 80% 이상"
2. **검증 방법 명시** — 어떤 명령으로 증명하는지: "`npm test`가 exit 0"
3. **검증 결과를 대화에 출력** — 평가자가 볼 수 있게 실제 실행 결과를 노출 (자가 판단 금지)
4. **바뀌면 안 되는 제약** — 예: "다른 테스트 파일은 수정 금지"
5. **turn/시간 상한** — 무한 루프 방지: "또는 50턴 내 미완료면 중단하고 보고"

---

## 지속성 엔진 선택 (3계층 폴백)

크로노스 규율(검증 게이트·구조·로그)은 **어떤 엔진을 쓰든 동일**하게 적용됩니다. 다른 건 "무엇이 세션을 끝까지 살리느냐"뿐입니다.

| 우선순위 | 엔진 | 조건 | 크로노스의 연동 방식 |
|----------|------|------|----------------------|
| **1순위** | 네이티브 `/goal` | Claude/Codex에 `/goal` 존재 | goal 목표문 **생성·제시** → 사용자가 `/goal` 설정 |
| **2순위** | Stop 훅 / notify 재개 | `/goal` 없음 + 훅 인프라 설치됨 | `setup-loop`로 상태 파일 생성 → 훅이 재투입 |
| **3순위** | 직접 루프 | 위 둘 다 불가 (Gemini, 폴백) | 메인 컨텍스트에서 직접 사이클 반복 |

> goal과 훅은 같은 Stop 게이트라 **동시에 켜면 중복**됩니다. 1순위(goal) 진입 시 `setup-loop --goal-mode`가
> 3곳(.claude/.codex/.chronos)의 기존 `loop-state.md`를 모두 제거하고 새로 만들지 않으므로, 훅이 재투입할 대상이
> **코드 레벨에서 사라집니다**(하드 가드 — 규율이 아니라 코드로 충돌 가능성 0). 둘 중 하나만 게이트를 담당합니다.

---

## 동작 원리

### 1순위 — goal 목표문 생성 + 연동

```
/chronos 버그 다 고쳐줘 --completion-promise '모든 테스트 통과'

→ 1. 스코프 감지 + 검증 게이트(테스트 명령) 감지 + 로그 초기화
     + setup-loop --goal-mode 실행 → 기존 loop-state.md 전부 제거 (하드 가드, 훅 충돌 방지)
→ 2. 크로노스가 goal 목표문을 생성해 제시:
     ┌─────────────────────────────────────────────────────────┐
     │ /goal 아래 규율로 진행하고, 충족되면 멈춰라:              │
     │  - src/ 안에서 한 번에 한 이슈씩 FIND→FIX→VERIFY          │
     │  - 우선순위 Critical>High>Medium>Low                      │
     │  - 매 수정 후 `npm test`를 실행하고 결과를 대화에 출력    │
     │    (Claude 평가자는 출력만 봄 — 자가 판단 금지)           │
     │  - 각 사이클을 docs/chronos/chronos-log.md에 기록         │
     │  - 50턴 내 미완료면 중단하고 보고 (무한 루프 방지)        │
     │  - 테스트 PASS 출력 확인 시 <promise>모든 테스트 통과</promise> 출력 │
     └─────────────────────────────────────────────────────────┘
→ 3. 사용자가 이 목표문을 /goal로 설정 (입력 한 번)
→ 4. 네이티브 goal이 Stop마다 "목표 충족?" 체크 → 미충족이면 다음 턴 계속
→ 5. 매 턴 크로노스 규율 적용: 한 사이클 한 이슈, 우선순위 순, 검증 실행, 로그 append
→ 6. 검증 PASS + <promise> 출력 → goal 게이트 통과 → 정지
```

### 2순위 — Stop 훅 / notify 폴백 (goal 없는 환경)

```
→ 1. setup-loop.sh가 CLI별 상태 파일 생성 (.claude/ · .codex/ · .chronos/loop-state.md)
→ 2. AI가 크로노스 사이클 수행 (FIND→FIX→VERIFY)
→ 3. turn 종료/세션 종료 시도 → 훅 체인이 상태 파일 재검증해 재투입:
     - Claude: loop-stop.sh(Stop 훅)가 block + 같은 프롬프트 재투입
     - Codex: save-turn notify → continue-loop → codex exec resume --last
→ 4. <promise>조건</promise> 출력 → 훅이 매칭 → 상태 파일 삭제 → 종료
```

### 3순위 — 직접 루프 폴백

지속성 엔진이 없으면 메인 컨텍스트에서 직접 사이클을 반복합니다. `--max-iterations`까지 또는 검증 게이트 통과까지 진행하되, 컨텍스트 한도에 유의합니다.

---

## 사용법

```bash
# 기본 — 자동 스코프 감지, 엔진 자동 판별
/chronos

# 특정 작업 지시
/chronos 버그 다 고쳐줘

# 특정 디렉토리 대상
/chronos src/backend/

# 최대 반복 제한 (훅/직접 루프에서 강제, goal에서는 budget 힌트)
/chronos 인증 버그 고쳐줘 --max-iterations 10

# 완료 조건 지정 (검증 게이트 — 모든 엔진 공통)
/chronos E2E 테스트 전부 통과시켜줘 --completion-promise '모든 테스트 통과'

# 정해진 할일만 순서대로 (체크리스트형)
/chronos 아래만 순서대로 완료하고 종료, 이 외 작업 금지: 1) ... 2) ... 3) ... --completion-promise '3개 완료'

# 중단
#  - goal 사용 중: 세션에서 /goal 해제 (esc 또는 /goal stop)
#  - 훅 폴백: cancel-loop 스크립트
bash  skills/auto-continue-loop/scripts/cancel-loop.sh
pwsh -File skills/auto-continue-loop/scripts/cancel-loop.ps1
```

**공식 호출명:** `/chronos` (별칭: `/loop`, `크로노스`)

> **언제 무엇을 쓰나:** 그냥 "끝까지 돌리기"만 필요하면 네이티브 `/goal` 단독으로 충분합니다.
> "검증으로 멈추고, 우선순위대로, 흔적을 남기며" 돌리고 싶으면 `/chronos`를 쓰세요 — goal을 그 규율에 맞게 녹여줍니다.

### 옵션

| 옵션 | 설명 | 기본값 | 엔진별 적용 |
|------|------|--------|-------------|
| `--max-iterations <N>` | 최대 반복 횟수 | **50** | 훅/직접: 강제 종료 / goal: budget 힌트 |
| `--completion-promise '<조건>'` | 검증 게이트 (`<promise>` 태그로 매칭) | 없음 (작업 소진 시 자동 종료) | 모든 엔진 공통 (goal 목표문에도 주입) |

---

## Auto-Continuation Contract

- `다음 작업 추천`, `우선순위`, `남은 작업` 같은 응답을 만들려는 순간, 가장 위의 actionable item을 **즉시 다음 사이클로 승격**합니다.
- 현재 scope 안에 있고 외부 승인/비밀값/수동 조작 없이 진행 가능하면 **사용자에게 묻지 않고 계속 진행**합니다.
- 사용자에게 넘기는 경우는 3가지뿐:
  - 더 이상 실행 가능한 in-scope 작업이 없음
  - 남은 작업이 전부 blocked / out-of-scope / manual-only
  - 사용자가 우선순위 범위를 제한함 (예: "보안만", "High까지만")

---

## Phase 0: 스코프 + 엔진 + 목표문

루프 시작 전 스코프를 확정하고, 엔진을 판별하고, (1순위면) goal 목표문을 짭니다.

### 0-1. 스코프 결정

`$ARGUMENTS`가 있으면 해당 경로를 스코프로 사용합니다.

없으면 아래 순서로 자동 감지:
1. 현재 세션에서 이미 작업 중인 디렉토리/파일 패턴
2. `git diff --name-only`로 최근 변경된 파일 영역
3. 프로젝트 루트 전체

### 0-2. 검증 게이트(테스트 프레임워크) 감지

```
package.json → npm test / npx jest / npx vitest
pytest.ini / pyproject.toml → pytest
pom.xml → mvn test
*.csproj → dotnet test
tsconfig.json → npx tsc --noEmit
없음 → "수동 확인 필요" 모드
```

감지된 명령이 곧 **검증 게이트**입니다. 매 사이클 이 명령을 실행해 PASS를 확인해야 완료가 허용됩니다(자가 판단 금지).

### 0-3. 엔진 판별 + (1순위) 목표문 제시 / (폴백) 상태 초기화

[지속성 엔진 선택](#지속성-엔진-선택-3계층-폴백)에 따라 엔진을 정합니다.

- **1순위(goal 가용):** [동작 원리 1순위](#1순위--goal-목표문-생성--연동)의 형식으로 **goal 목표문을 생성해 제시**하고, 사용자가 `/goal`로 설정하도록 안내합니다. 진입 시 `setup-loop --goal-mode`를 실행해 기존 `loop-state.md`를 모두 제거합니다 — 폴백 상태 파일을 만들지 않으므로 Stop 훅이 발동할 대상이 코드 레벨에서 사라져 이중 재투입 충돌이 **불가능**합니다(하드 가드). 로그(`docs/chronos/`)만 초기화합니다.
- **2·3순위(폴백):** `setup-loop.sh`(또는 `.ps1`)로 공유 상태 파일을 생성합니다. Claude는 `.claude/loop-state.md`, Codex는 `.codex/loop-state.md`, Gemini는 `.chronos/loop-state.md`를 사용합니다.

```
크로노스(Chronos) 시작
엔진: {네이티브 /goal | Stop 훅·notify | 직접 루프}
스코프: {디렉토리/파일 목록}
검증 게이트: {감지된 테스트 명령}
반복: 최대 {N}회 (또는 무제한)
완료 조건: {조건} (또는 없음)
로그: docs/chronos/chronos-log.md

{1순위면} → 아래 목표문을 /goal로 설정하세요:
{생성된 goal 목표문}
{폴백이면} → 중단: bash skills/auto-continue-loop/scripts/cancel-loop.sh
```

---

## Phase 1: 루프 실행

### 사이클 규칙 (엔진 공통 — 크로노스 규율)

지속성 엔진이 무엇이든, 매 사이클 4단계를 수행합니다:

1. **FIND**: 스코프 내에서 가장 심각한 미수정 이슈 1개, 또는 직전 사이클에서 승격된 next-action 선택
2. **FIX**: 최소 변경 원칙 — 이슈 해결에 필요한 최소한의 코드만 수정
3. **VERIFY**: 검증 게이트 명령 실행. 실패 시 같은 사이클 내 최대 3회 재시도. 3회 실패 → SKIP
4. **LOG**: `docs/chronos/chronos-log.md`에 append

### 우선순위

```
Critical(보안) > High(버그/데이터 무결성) > Medium(구조/스코프) > Low(스타일)
```

### 로그 기록

```bash
# 첫 사이클 전 초기화
mkdir -p docs/chronos
echo '# Chronos Log' > docs/chronos/chronos-log.md
echo "Started: $(date -Iseconds)" >> docs/chronos/chronos-log.md
echo 'Engine: {네이티브 /goal | 훅·notify | 직접}' >> docs/chronos/chronos-log.md
echo 'Scope: {스코프}' >> docs/chronos/chronos-log.md

# 매 사이클
echo '── Cycle N ──────────────────────────' >> docs/chronos/chronos-log.md
echo 'Issue: ...' >> docs/chronos/chronos-log.md
echo 'Fix:   ...' >> docs/chronos/chronos-log.md
echo 'Verify: ... → PASS' >> docs/chronos/chronos-log.md
echo '────────────────────────────────────────' >> docs/chronos/chronos-log.md
```

### 종료 조건 (검증 게이트)

**AI가 루프를 끝내는 방법은 딱 2가지:**

1. **할 게 없으면** → `Chronos Complete`를 포함한 최종 보고 출력
2. **완료 조건 달성** → 검증 게이트 PASS 확인 후 `<promise>조건</promise>` 출력

**그 외에는 AI가 종료를 판단하지 않는다.** 지속성 엔진이 알아서 계속시킨다:
- **네이티브 `/goal`**: 검증 게이트 미충족 시 goal이 Stop에서 "목표 미달"로 판정 → 다음 턴 계속
- **훅 폴백**: 위 패턴 미감지 → Claude Stop 훅이 block + 같은 프롬프트 재투입
- `--max-iterations` 도달 (기본 50회) → 폴백 엔진이 강제 종료
- stale 2시간 초과 → 훅이 자동 종료

**AI가 절대 하지 않는 것:**
- "루프를 종료할까요?" 질문 ❌
- 검증 게이트를 건너뛰고 `<promise>` 출력 ❌ (테스트 PASS 없이 완료 선언 금지)
- loop-state.md 삭제 시도 ❌
- "이만 마치겠습니다" 같은 임의 종료 ❌ (할 게 남았으면 계속)

### 금지 사항

- **`loop-state.md` 절대 접근 금지** (훅 폴백 사용 시) — `.claude/`, `.codex/`, `.chronos/` 아래 상태 파일은 읽기/수정/삭제 모두 금지. 훅/notify 체인만 관리한다.
- **루프 종료를 직접 시도 금지** — 종료는 검증 게이트 통과 시 엔진이 처리하거나, 사용자가 중단(`/goal` 해제 또는 cancel-loop)으로 수행한다.
- **검증 없는 완료 선언 금지** — 검증 게이트가 정의돼 있으면 PASS를 실제로 확인하기 전에 `<promise>`/`Chronos Complete`를 출력하지 않는다.
- AskUserQuestion 호출 금지
- 전체 이슈 목록 나열 금지
- 한 번에 여러 이슈 동시 수정 금지
- 관련 없는 리팩토링 금지
- scope 밖 파일 수정 금지
- 사이클 사이에 멈추거나 대기 금지
- "다음으로는 X를 추천합니다" 같은 문장으로 마무리 금지
- `docs/chronos/` 외의 상태/로그 파일 조작 금지

---

## Phase 2: 최종 보고

```
══ Chronos Complete ══════════════════
Engine: {네이티브 /goal | 훅·notify | 직접}
Total cycles: {N}
Iterations: {N} (엔진 재투입 횟수)
Fixed: {N}건
Skipped: {N}건
Remaining: {N}건

Fixed Issues:
  ✅ {이슈} ({파일})

Skipped Issues:
  ⚠️ {이슈} — 사유: {왜}

Remaining:
  ℹ️ {이슈} — 사유: {왜}
═══════════════════════════════════════
```

---

## 상태 파일 (.claude/.codex/.chronos loop-state.md) — 훅 폴백 전용, AI 접근 금지

> **⚠️ 이 파일은 2순위(훅/notify) 폴백 엔진에서만 사용됩니다. AI는 절대 읽거나 수정하거나 삭제하지 않습니다.**
> 훅(loop-stop.sh/ps1)이 자동으로 생성, 업데이트, 삭제합니다. 네이티브 `/goal`(1순위)은 이 파일을 쓰지 않습니다.

```markdown
---
active: true
iteration: 3
session_id: abc123
last_turn_id: "turn_123"
max_iterations: 20
completion_promise: "모든 테스트 통과"
started_at: "2026-03-12T10:00:00Z"
---

버그 다 고쳐줘
```

**책임 분리:**

| 주체 | 할 수 있는 것 | 할 수 없는 것 |
|------|-------------|-------------|
| **AI (크로노스 규율)** | FIND→FIX→VERIFY 사이클, 검증 게이트 실행, goal 목표문 생성, 로그 기록 | loop-state.md 읽기/수정/삭제, `/goal` 자동 호출 |
| **지속성 엔진** | Stop 게이트 판정, 재투입, loop-state.md 관리(폴백) | 코드 수정, 테스트 실행 |
| **사용자** | `/goal` 설정/해제, cancel-loop 스크립트로 수동 중단 | - |

**AI가 루프를 끝내는 유일한 방법:**
- 할 작업이 없으면 `Chronos Complete`를 포함한 최종 보고를 출력
- 완료 조건이 있으면 검증 게이트 PASS 확인 후 `<promise>조건</promise>`를 출력
- → 엔진이 이 패턴을 감지하고 루프를 종료 (훅 폴백은 상태 파일을 삭제)

---

## 실시간 모니터링

```bash
# Linux/Mac
tail -f docs/chronos/chronos-log.md

# Windows PowerShell
Get-Content docs/chronos/chronos-log.md -Wait
```

---

## 엔진 배선

### 네이티브 `/goal` (1순위)

별도 설치가 필요 없습니다. `/goal`이 있는 Claude/Codex에서 크로노스가 규율을 녹인 목표문을 제시하고, 사용자가 `/goal`로 켭니다.
크로노스는 `/goal`을 자동 호출하지 않습니다(슬래시 커맨드 호출 도구 부재). 목표문 생성·제시까지가 크로노스의 역할입니다.

진입 문법(`/goal <목표>`)은 양쪽이 같지만, 활성화·판정·관리가 다릅니다. 크로노스는 목표문을 자연어로 짜므로 이 차이를 우회하지만, 사용자 안내 시 참고하세요.

| 항목 | Codex `/goal` | Claude `/goal` |
|------|---------------|----------------|
| 활성화 | `features.goals` 필요할 수 있음 (`codex features enable goals`) | v2.1.139+면 기본 |
| 완료 판정 | Codex가 직접 명령 실행해 확인 | 별도 평가 모델이 **대화 출력만** 보고 판정 (명령 실행 안 함) |
| 진행 확인 | TUI 상태 | `/goal` (인자 없이) → 턴/토큰/마지막 사유 |
| 중단/관리 | `/goal pause` · `/goal resume` · `/goal clear` | `/goal clear` (별칭 stop/off/reset/cancel) |

> **판정 차이가 핵심**: Claude 평가자는 명령을 실행하지 않으므로, 목표문에 "검증 결과를 대화에 출력"이 반드시 있어야 PASS가 인식됩니다(위 [goal 목표문 필수 요소](#goal-목표문-필수-요소-codexclaude-공통) 참조).

### Claude Code 훅 (2순위 폴백)

`hooks/loop-stop.sh` (Linux/Mac) 또는 `hooks/loop-stop.ps1` (Windows)를
settings.json의 Stop 이벤트에 등록:

```json
{
  "hooks": {
    "Stop": [
      { "type": "command", "command": "bash ~/.claude/hooks/loop-stop.sh" }
    ]
  }
}
```

> `/goal`을 쓰는 환경에서도 이 훅은 무해합니다 — 크로노스가 1순위로 goal을 쓰면 상태 파일을 만들지 않으므로 훅이 재투입할 대상이 없습니다.

### Codex CLI (2순위 폴백)

Codex는 `Stop` 이벤트가 없으므로 root `hooks/loop-stop.*`를 직접 쓰지 않습니다.
대신 `codex-mnemo`의 notify 훅이 `save-turn` 뒤에서 Chronos를 체인합니다. (`/goal` 지원 빌드라면 1순위로 목표문 연동)

1. `node scripts/sync-codex-assets.js`
2. `node skills/codex-mnemo/install.js`
3. `~/.codex/hooks/save-turn.ps1|sh`가 `~/.codex/skills/auto-continue-loop/scripts/continue-loop.ps1|sh`를 호출

Codex 재개는 background `codex exec resume --last`로 수행되며, 현재 프로젝트의 `docs/chronos/codex-resume.log`에 로그가 남습니다.

---

## Related Files

| 파일 | 역할 |
|------|------|
| `hooks/loop-stop.sh` | Stop 훅 — 세션 종료 가로채기, 2순위 폴백 (Linux/Mac) |
| `hooks/loop-stop.ps1` | Stop 훅 — 세션 종료 가로채기, 2순위 폴백 (Windows) |
| `skills/auto-continue-loop/scripts/setup-loop.sh` | 폴백 루프 시작 스크립트 (Linux/Mac) |
| `skills/auto-continue-loop/scripts/setup-loop.ps1` | 폴백 루프 시작 스크립트 (Windows) |
| `skills/auto-continue-loop/scripts/continue-loop.sh` | Codex notify → background resume (Linux/Mac) |
| `skills/auto-continue-loop/scripts/continue-loop.ps1` | Codex notify → background resume (Windows) |
| `skills/codex-mnemo/hooks/save-turn.sh` | Codex notify 오케스트레이터 + Chronos 체인 |
| `skills/codex-mnemo/hooks/save-turn.ps1` | Codex notify 오케스트레이터 + Chronos 체인 |
| `skills/auto-continue-loop/agents/chronos-worker.md` | Gemini용 서브에이전트 정의 (3순위 직접 루프) |
| `skills/flow-verifier/SKILL.md` | 구현 흐름 검증 통합 (선택 레이어) |
| `skills/code-reviewer/SKILL.md` | 코드 리뷰 기준 참조 |
| `skills/systematic-debugging/SKILL.md` | 디버깅 방법론 참조 |
| `agents/security-reviewer.md` | 보안 이슈 기준 참조 |
