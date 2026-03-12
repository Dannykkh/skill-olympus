---
name: auto-continue-loop
description: >
  끊김 없는 자율 루프. Claude는 Stop 훅, Codex는 notify 자동 재개로 AI가 작업을 끝까지 완수하도록 강제합니다.
  FIND → FIX → VERIFY 사이클을 반복하며, --max-iterations와 --completion-promise로 제어합니다.
  /chronos 또는 /loop로 실행. Also known as 크로노스.
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
> AI가 끝내려 해도 훅 체인이 강제로 계속시킨다.

**Claude Stop 훅 / Codex notify 자동 재개** + **FIND → FIX → VERIFY 자율 사이클**.
AI가 "다 했다"고 착각해도 시스템 레벨에서 완료 조건을 검증합니다.

---

## 동작 원리

```
/chronos 버그 다 고쳐줘 --max-iterations 20 --completion-promise '모든 테스트 통과'

→ 1. setup-loop.sh가 .claude/loop-state.md 상태 파일 생성
→ 2. AI가 크로노스 로직 수행 (스코프 감지, FIND→FIX→VERIFY)
→ 3. AI turn이 끝나거나 세션이 종료되려 함
→ 4. CLI별 훅 체인이 상태 파일을 재검증
     - Claude: loop-stop.sh(Stop 훅)가 block + 같은 프롬프트 재투입
     - Codex: save-turn notify → continue-loop → codex exec resume --last
     - Gemini: chronos-worker가 같은 규칙으로 다음 사이클 수행
→ 5. AI가 이전 결과(파일, git 히스토리)를 보면서 다시 작업
→ 6. 반복...
→ 7. AI가 <promise>모든 테스트 통과</promise> 출력 → 훅이 매칭 → 종료
```

**사용자 개입 0회. "다음" 입력 불필요.**

---

## 사용법

```bash
# 기본 — 자동 스코프 감지, 무제한 반복
/chronos

# 특정 작업 지시
/chronos 버그 다 고쳐줘

# 특정 디렉토리 대상
/chronos src/backend/

# 최대 반복 제한
/chronos 인증 버그 고쳐줘 --max-iterations 10

# 완료 조건 지정
/chronos E2E 테스트 전부 통과시켜줘 --completion-promise '모든 테스트 통과'

# 중단
/cancel-loop
```

**공식 호출명:** `/chronos` (별칭: `/loop`, `크로노스`)

### 옵션

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `--max-iterations <N>` | 최대 반복 횟수 | **50** |
| `--completion-promise '<조건>'` | 완료 조건 (`<promise>` 태그로 매칭) | 없음 (AI 완료 보고 시 자동 종료) |

---

## Auto-Continuation Contract

- `다음 작업 추천`, `우선순위`, `남은 작업` 같은 응답을 만들려는 순간, 가장 위의 actionable item을 **즉시 다음 사이클로 승격**합니다.
- 현재 scope 안에 있고 외부 승인/비밀값/수동 조작 없이 진행 가능하면 **사용자에게 묻지 않고 계속 진행**합니다.
- 사용자에게 넘기는 경우는 3가지뿐:
  - 더 이상 실행 가능한 in-scope 작업이 없음
  - 남은 작업이 전부 blocked / out-of-scope / manual-only
  - 사용자가 우선순위 범위를 제한함 (예: "보안만", "High까지만")

---

## Phase 0: 스코프 확인

루프 시작 전 스코프를 확정합니다.

### 0-1. 스코프 결정

`$ARGUMENTS`가 있으면 해당 경로를 스코프로 사용합니다.

없으면 아래 순서로 자동 감지:
1. 현재 세션에서 이미 작업 중인 디렉토리/파일 패턴
2. `git diff --name-only`로 최근 변경된 파일 영역
3. 프로젝트 루트 전체

### 0-2. 테스트 프레임워크 감지

```
package.json → npm test / npx jest / npx vitest
pytest.ini / pyproject.toml → pytest
pom.xml → mvn test
*.csproj → dotnet test
tsconfig.json → npx tsc --noEmit
없음 → "수동 확인 필요" 모드
```

### 0-3. 상태 파일 생성 + 시작 알림

`setup-loop.sh`(또는 `.ps1`)를 실행하여 공유 상태 파일(`.claude/loop-state.md`)을 생성합니다.

```
크로노스(Chronos) 시작
스코프: {디렉토리/파일 목록}
검증: {감지된 테스트 명령}
반복: 최대 {N}회 (또는 무제한)
완료 조건: {조건} (또는 없음)
로그: docs/chronos/chronos-log.md

중단: /cancel-loop
```

---

## Phase 1: 루프 실행

### CLI별 실행 방식

| CLI | 방식 | 도구 |
|-----|------|------|
| **Claude** | Agent 서브에이전트 + Stop 훅 가드 | `Agent({ subagent_type: "chronos-worker" })` + `hooks/loop-stop.*` |
| **Codex** | spawn_agent + notify 자동 재개 | `spawn_agent` + `save-turn` → `continue-loop` → `codex exec resume --last` |
| **Gemini** | chronos-worker 호출 | `.gemini/agents/chronos-worker.md` |
| **폴백** | 직접 루프 | 메인 컨텍스트에서 직접 실행 |

CLI 감지:
- `Agent` 도구 → Claude
- `spawn_agent` 도구 → Codex
- `chronos-worker` 에이전트 → Gemini
- 모두 없음 → 직접 루프

### 사이클 규칙

매 사이클에서 4단계를 수행:

1. **FIND**: 스코프 내에서 가장 심각한 미수정 이슈 1개, 또는 직전 사이클에서 승격된 next-action 선택
2. **FIX**: 최소 변경 원칙 — 이슈 해결에 필요한 최소한의 코드만 수정
3. **VERIFY**: 검증 명령 실행. 실패 시 같은 사이클 내 최대 3회 재시도. 3회 실패 → SKIP
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
echo 'Scope: {스코프}' >> docs/chronos/chronos-log.md

# 매 사이클
echo '── Cycle N ──────────────────────────' >> docs/chronos/chronos-log.md
echo 'Issue: ...' >> docs/chronos/chronos-log.md
echo 'Fix:   ...' >> docs/chronos/chronos-log.md
echo 'Verify: ... → PASS' >> docs/chronos/chronos-log.md
echo '────────────────────────────────────────' >> docs/chronos/chronos-log.md
```

### 종료 조건

아래 중 하나라도 해당하면 루프 종료:
- scope 안에서 실행 가능한 이슈가 없음
- 남은 이슈가 전부 blocked / out-of-scope / manual-only
- 환경 문제로 진행 불가 (DB 미연결, 포트 충돌 등)
- `--completion-promise` 조건을 달성하여 `<promise>조건</promise>` 출력

**AI가 종료하더라도 훅 체인이 재검증합니다:**
- AI가 "더 이상 할 게 없다" / "Chronos Complete" 등 완료 패턴 출력 → 종료
- `<promise>` 태그가 완료 조건과 매칭되면 → 종료
- 위 조건 모두 미달 → Claude는 Stop 훅 block, Codex는 notify 기반 background resume
- `--max-iterations` 도달 시 (기본 50회) → 강제 종료

### 금지 사항

- AskUserQuestion 호출 금지
- 전체 이슈 목록 나열 금지
- 한 번에 여러 이슈 동시 수정 금지
- 관련 없는 리팩토링 금지
- scope 밖 파일 수정 금지
- 사이클 사이에 멈추거나 대기 금지
- "다음으로는 X를 추천합니다" 같은 문장으로 마무리 금지

---

## Phase 2: 최종 보고

```
══ Chronos Complete ══════════════════
Total cycles: {N}
Iterations: {N} (훅/notify 재투입 횟수)
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

## 상태 파일 (.claude/loop-state.md)

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

Claude `loop-stop.sh/ps1`와 Codex `continue-loop.ps1/sh`가 이 파일을 함께 읽고:
- `iteration`을 증가시키며 반복 추적
- `session_id`로 다른 세션의 루프와 격리
- `last_turn_id`로 Codex notify 중복 재개 방지
- `completion_promise`와 AI 출력의 `<promise>` 태그를 매칭
- `max_iterations` 도달 시 자동 종료
- 파일이 없으면 루프 비활성 → 그냥 통과

---

## 실시간 모니터링

```bash
# Linux/Mac
tail -f docs/chronos/chronos-log.md

# Windows PowerShell
Get-Content docs/chronos/chronos-log.md -Wait
```

---

## 훅 설정

### Claude Code

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

### Codex CLI

Codex는 `Stop` 이벤트가 없으므로 root `hooks/loop-stop.*`를 직접 쓰지 않습니다.
대신 `codex-mnemo`의 notify 훅이 `save-turn` 뒤에서 Chronos를 체인합니다.

1. `node scripts/sync-codex-assets.js`
2. `node skills/codex-mnemo/install.js`
3. `~/.codex/hooks/save-turn.ps1|sh`가 `~/.codex/skills/auto-continue-loop/scripts/continue-loop.ps1|sh`를 호출

Codex 재개는 background `codex exec resume --last`로 수행되며, 현재 프로젝트의 `docs/chronos/codex-resume.log`에 로그가 남습니다.

---

## Related Files

| 파일 | 역할 |
|------|------|
| `hooks/loop-stop.sh` | Stop 훅 — 세션 종료 가로채기 (Linux/Mac) |
| `hooks/loop-stop.ps1` | Stop 훅 — 세션 종료 가로채기 (Windows) |
| `skills/auto-continue-loop/scripts/setup-loop.sh` | 루프 시작 스크립트 (Linux/Mac) |
| `skills/auto-continue-loop/scripts/setup-loop.ps1` | 루프 시작 스크립트 (Windows) |
| `skills/auto-continue-loop/scripts/continue-loop.sh` | Codex notify → background resume (Linux/Mac) |
| `skills/auto-continue-loop/scripts/continue-loop.ps1` | Codex notify → background resume (Windows) |
| `skills/codex-mnemo/hooks/save-turn.sh` | Codex notify 오케스트레이터 + Chronos 체인 |
| `skills/codex-mnemo/hooks/save-turn.ps1` | Codex notify 오케스트레이터 + Chronos 체인 |
| `skills/auto-continue-loop/agents/chronos-worker.md` | Gemini용 서브에이전트 정의 |
| `skills/code-reviewer/SKILL.md` | 코드 리뷰 기준 참조 |
| `skills/systematic-debugging/SKILL.md` | 디버깅 방법론 참조 |
| `agents/security-reviewer.md` | 보안 이슈 기준 참조 |
