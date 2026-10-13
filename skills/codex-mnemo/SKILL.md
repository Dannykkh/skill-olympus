---
name: codex-mnemo
description: Codex CLI 과거 대화 검색, 서브에이전트 작업 추적과 장기기억 설정에 사용한다. notify 훅으로 대화 자동 저장, 키워드 태깅, 과거 검색을 제공한다. /mnemo, 므네모, 장기기억, 기억해, 이전에, handoff, 핸드오프, 세션 저장, codex 기억, codex memory 요청에 사용한다.
---

# Codex-Mnemo - Codex CLI 기억 시스템

> 기억의 여신 Mnemosyne에서 유래. Claude Code용 Mnemo를 Codex CLI에 이식.

Codex CLI 세션 간 컨텍스트 유지를 위한 장기기억 시스템입니다.

## 설치

```bash
node skills/codex-mnemo/install.js              # 설치
node skills/codex-mnemo/install.js --check      # 설치/notify 진단
node skills/codex-mnemo/install.js --uninstall  # 제거
```

---

## Claude Code Mnemo와의 차이

| | Claude Code (Mnemo) | Codex CLI (Codex-Mnemo) |
|---|---|---|
| 훅 | 2개 (UserPromptSubmit + Stop) | **1개** (notify: agent-turn-complete) |
| 데이터 전달 | stdin JSON + transcript JSONL 파싱 | **notify payload(JSON)** (argv/stdin/파일경로 모두 처리) |
| 설정 | settings.json (JSON) | **config.toml** (TOML) |
| 규칙 파일 | CLAUDE.md | **AGENTS.md** |
| 저장 경로 | `conversations/*-claude.md` | **`conversations/*-codex.md`** |
| 중복 방지 | 입력 세대·응답 UUID | **turn-id 기반** |

---

## 핵심 원칙

| 원칙 | 설명 |
|------|------|
| **빠르게** | 기본은 훅에서 AI 호출 금지. 단, Chronos auto-continue는 예외 체인 |
| **단순하게** | 파일 기반, DB 없음 |
| **검색 가능하게** | 키워드 + 동의어 확장 |

전역 작업 규칙의 정본은 [templates/agents-md-rules.md](templates/agents-md-rules.md)이며,
설치기가 `<CODEX_HOME>/AGENTS.md`의 `CODEX-MNEMO` 관리 블록에 반영합니다.
요청 언어로 응답하고 코드맵을 우선 조회하며, 과거 검색은 메모리 → 대화 링크·태그 → 본문
→ 원본 세션 파싱·복구 순서입니다. 정확한 검색·기억·핸드오프 정책이 필요할 때 정본을 읽습니다.
읽기 전용 요청에서는 복구 파일을 쓰지 않습니다. `--dry-run`은 복구 후보의 집계를 확인하는
옵션이며 대화 본문을 출력하는 검색 기능으로 간주하지 않습니다.

일반 대화의 선호·약속·변경 이유는 [대화 맥락 회상](references/recall.md)을 따라 조회합니다.
동봉된 `scripts/recall.py`가 기존 태그·예약 ID·근거 링크로 질문과 응답을 함께 반환합니다.
검색어·동의어와 의미 판단은 현재 에이전트가 맡으며 파일을 수정하지 않습니다.

---

## 포함 파일

기존 기억의 경로·근거 형식은 공통 닥터의 `--upgrade-memory`로 정비합니다.
실행 범위와 보존 규칙은 [기억 정비 계약](docs/memory-hygiene.md)을 따릅니다.

```
codex-mnemo/
├── SKILL.md                     # 이 파일
├── install.js                   # 설치/제거 스크립트
├── hooks/
│   ├── save-turn.ps1            # Windows notify 오케스트레이터 (+ Chronos optional chain)
│   ├── save-turn.sh             # Linux/Mac notify 오케스트레이터 (+ Chronos optional chain)
│   └── store-turn.js            # 전체 입력·답변·표식의 동시 저장, 대기 턴 재시도
├── scripts/
│   └── reconcile_codex_conversations.py  # rollout JSONL → conversations/ 복구
└── templates/
    └── agents-md-rules.md       # AGENTS.md 주입 규칙
```

---

## Reconcile (누락 턴 복구)

Codex의 notify 훅이 한 번이라도 실패하거나 Codex CLI가 강제 종료되면 해당 턴의
`conversations/YYYY-MM-DD-codex.md` 미러링이 유실됩니다. 그러나 rollout JSONL
(`<CODEX_HOME>/sessions/YYYY/MM/DD/rollout-*.jsonl`)은 Codex가 직접 기록하는 source of truth
이므로, `reconcile_codex_conversations.py`가 이를 스캔해 누락된 turn을 자동 복구합니다.

여기서 `<CODEX_HOME>`은 `CODEX_HOME` 환경 변수 값이며, 미설정 시 `~/.codex`입니다.

**Dedup 키**: 완료 턴의 `turn-id`와 대화의 `<!-- turn:... -->` 표식을 사용합니다.
notify에 turn-id가 없는 옛 실행은 입력·답변 전체의 SHA-1 표식을 사용합니다.
복구 도구는 `conversations/.mnemo-index.json`의 `codex` 네임스페이스에 턴 ID를 저장합니다.
Claude 인덱스(`claude` 네임스페이스)와 충돌하지 않습니다.

**자동 실행**: Claude Code의 `SessionStart` 훅(`reconcile-conversations.ps1/.sh`)이
Claude 기록과 최근 7일의 Codex 기록을 복구합니다. Codex만 사용하는 환경에서는 이
SessionStart 복구가 실행되지 않으므로 과거 전체 누락은 `--all`로 별도 대조합니다.

**수동 실행**:
```bash
python skills/codex-mnemo/scripts/reconcile_codex_conversations.py              # 최근 7일(세션 파일 수정 시각 기준)
python skills/codex-mnemo/scripts/reconcile_codex_conversations.py --all        # 전체 기간
python skills/codex-mnemo/scripts/reconcile_codex_conversations.py --dry-run    # 원본 스캔 집계만 (병합을 건너뛰어 canonicalized·added·subagent_records_removed는 늘 0)
python skills/codex-mnemo/scripts/reconcile_codex_conversations.py --all --staging-dir <임시폴더>  # 병합 미리보기: 결과 대화 파일 + manifest.json, 실제 대화는 그대로
python skills/codex-mnemo/scripts/reconcile_codex_conversations.py --project-root D:/git/foo
```

---

## 서브에이전트 작업 조회

사용자가 워커의 대화·수행 과정·검증 근거를 물으면 PM의 **정확한 세션 ID**로 조회한다.
현재 세션 ID를 일별 대화의 첫 턴이나 최신 파일에서 추정하지 않는다. 사용할 수 있는
네이티브 `thread/list`·`thread/read`가 있으면 우선하며, 로컬 원본 조회는 다음 도구를 쓴다.
`module_root`는 이번에 읽은 이 `SKILL.md`의 디렉터리다.

```bash
python -B "<module_root>/scripts/trace_subagents.py" --project-root "<workspace>" --parent-session "<PM-ID>"
python -B "<module_root>/scripts/trace_subagents.py" --project-root "<workspace>" --parent-session "<PM-ID>" --session "<child-ID>" --term "검사"
```

첫 명령은 같은 프로젝트의 직계·중첩 워커와 마지막 보고·원본 경로를 반환한다. 두 번째는
워커에게 전달된 메시지, 도구 호출·인자·결과와 답변을 행 번호와 함께 읽는다. 검색은 정제된
내용에 적용하며 `--offset`·`--limit`·`next_offset`으로 이어 읽는다. 전체 JSON의 문자 수는
`--max-chars`로 제한한다. `content_omitted`가 있으면 같은 offset에서 예산을 늘려 조회한다.
활성·보관 세션을 조회하며 부모에게서 상속한 과거 턴, 시스템 주입·reasoning은 제외한다.
`<private>`와 식별 가능한 비밀값을 가리고 파일은 생성·수정하지 않는다. 워커의 보고와
실제 도구 결과를 구분하며, 원본이 삭제됐거나 PM과의 계보가 없으면 미확인으로 보고한다.
이 조회 기능은 Codex용이며 다른 CLI의 서브에이전트 추적 parity를 주장하지 않는다.

## 동작 흐름

```
Codex CLI 대화
    ↓
[notify: agent-turn-complete]
    → JSON 페이로드 수신 (argv/stdin/파일경로)
    → thread-id 세션 파일의 첫 session_meta가 하위 에이전트면 저장·관찰·이어가기를 건너뜀
      (notify는 하위 에이전트 턴에도 실행된다. 변경 파일 검사 bridge만 돈다. 세션 파일이 없으면 저장)
    → input-messages에서 AGENTS.md·<environment_context> 같은 주입 메시지는 User로 쓰지 않음
    → save-turn(오케스트레이터)에서 공통 저장기 호출
      → MEMORY.md + memory/*.md scaffold 자동 생성(없을 때만)
      → store-turn.js: 실제 사용자 입력 모두를 순서대로 저장(추가 입력은 Follow-up)
      → 비어 있지 않은 답변은 길이와 관계없이 저장, 백슬래시·코드 블록을 그대로 보존
      → conversations/.mnemo-pending/에 private 블록을 제거한 완전한 턴을 먼저 보존
      → 프로젝트별 잠금 아래 User·Assistant·turn-id를 함께 append하고 중복 방지
      → 쓰기 실패 시 부분 기록을 원래 길이로 되돌리고 제한된 재시도
      → 계속 실패하면 대기 파일과 오류 로그를 남김(성공 로그는 쓰지 않음)
      → 다음 notify가 대기 턴을 재시도하고 성공한 대기 파일만 제거
    → (optional) auto-continue-loop 설치 시 continue-loop 호출
      → loop-state.md 확인
      → 미완료면 background `codex exec resume --last`
```

Node.js가 필수입니다(기존 프로젝트 루트 판별기·hook bridge와 같은 런타임).
`store-turn.js`는 Codex 입력을 해석하고 공통 `mnemo-record-store.js`에 전달합니다.
저장·실패 복구 계약은 [대화 레코드 저장 계약](references/record-storage.md)을 따릅니다.
notify 입력이 비면 thread-id의 원본 세션에서 해당 턴만 읽고, AGENTS·환경·하위 작업 알림을
제외합니다. 파일 잠금이 해제돼도 새 notify가 없으면 대기 턴은 아직 Markdown에 반영되지
않습니다. 원본 세션과 `.mnemo-pending/`을 보존하고 다음 notify 또는 수동 복구를 실행합니다.
프로세스가 OS에서 강제 종료되는 모든 시점의 디스크 영속성을 보장하는 계약은 아닙니다.

사용자가 `/fork`한 일반 세션은 저장한다. `forked_from_id`는 계보이며 하위 에이전트 표시가
아니다. 복구는 포크 뒤 이 세션에 속한 턴만 처리해 상속한 부모 대화를 중복 반영하지 않는다.

---

## 저장 위치

| 파일 | 위치 |
|------|------|
| 대화 로그 | `conversations/YYYY-MM-DD-codex.md` |
| 의미기억 | `MEMORY.md` (프로젝트 루트) |
| 훅 | `<CODEX_HOME>/hooks/save-turn.ps1\|.sh` |
| 설정 | `<CODEX_HOME>/config.toml` |
| 규칙 | `<CODEX_HOME>/AGENTS.md` |
| 핸드오프 | 공통 프로젝트 경로 `docs/handoffs/YYYY-MM-DD-HHMMSS-slug.md` |

> 핸드오프는 CLI별 홈 디렉터리가 아니라 프로젝트 안의 공통 디렉터리 `docs/handoffs/`를 사용합니다.
> Claude, Codex, Antigravity가 같은 프로젝트 핸드오프를 이어받기 위한 의도된 동작입니다.
> 핸드오프 작성 시 Mnemo의 공통 품질 계약을 따른다: `Feature/Flow/Decision Snapshot`에 구현 기능 목록,
> 구성도, 기능 경계, 입력→처리→저장→표시 흐름, 주요 결정/대안/근거를 남긴다. CodeMap은 TermSnap 산출물이므로
> 핸드오프는 CodeMap을 대체하지 않고 현재 세션의 구현 근거와 구성도를 작성한다.

## 프로젝트 저장 경계

기억·대화·핸드오프는 확정된 프로젝트 루트에 저장한다. 공통 규약은 소스의
`skills/mnemo/references/project-storage.md`, 설치 스킬의
`<module_root>/references/project-storage.md`에서 읽는다.

모든 어댑터와 핸드오프·복구 도구는 공통 `mnemo-project-root.js`를 사용한다.
Git 환경변수·하위 cwd로 저장 위치를 바꾸지 않으며, Git도 `.mnemo-root`도 없는
일반 cwd에는 자동 저장하지 않는다. 비-Git 프로젝트는 명시한 workspace에서
초기화한다. 설치 패키지에는 공통 핸드오프 `scripts/`도 포함된다. 소스 checkout의
핸드오프 도구 정본은 `skills/mnemo/scripts/`이다. 실행에는 Python 3와 Node.js가 필요하다.
Python 명령은 `python`·`py`·`python3` 중 `--version`이 되는 첫 것을 쓴다 — `python`만 실패했다고
Python 없음으로 판정하지 않는다(Windows 스토어 별칭, `references/handoff-memory.md` 3항).

## 프로젝트 스킬 자기개선

핸드오프 정제 또는 명시적 개선 작업에서는 [자기개선 계약](references/self-improvement.md)을 읽는다.
동봉된 내부 모듈을 직접 읽으며 별도 slash 등록이나 Jev API는 필요하지 않다.
핸드오프에서는 후보만 남기고, 승인된 개선 작업에서 실제 비교 검증을 수행한다.
