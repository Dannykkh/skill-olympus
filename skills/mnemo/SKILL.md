---
name: mnemo
description: >
  과거 대화 검색, 장기기억 설정, 세션 핸드오프할 때 사용. 대화 자동 저장, 키워드 태깅,
  MEMORY.md 관리, 세션 전환. 관리 대상은 프로젝트 루트의 3계층(MEMORY.md + memory/ + conversations/)이며,
  프로젝트 이동 후에도 기록을 함께 사용할 수 있도록 저장 경계를 검증한다.
  /mnemo, 므네모, 장기기억, memory, 기억해, 이전에, handoff, 핸드오프, 핸즈오프, 세션 저장 요청에 사용한다.
---

# Mnemo - 기억 시스템

> 기억의 여신 Mnemosyne에서 유래

세션 간 컨텍스트 유지를 위한 통합 메모리 시스템입니다.

## 설치

```bash
node skills/mnemo/install.js              # 설치
node skills/mnemo/install.js --uninstall  # 제거
```

---

## 핵심 원칙

| 원칙 | 설명 |
|------|------|
| **빠르게** | 훅에서 AI 호출 금지 |
| **단순하게** | 파일 기반, DB 없음 |
| **검색 가능하게** | 키워드 + 동의어 확장 |
| **점진적 공개** | 필요한 깊이까지만 읽기 (Progressive Disclosure) |
| **프라이버시** | `<private>` 태그로 민감 정보 제외, `MNEMO_DISABLE=1`로 저장 전체 opt-out |

---

## 포함 파일

```
mnemo/
├── SKILL.md                    # 이 파일
├── install.js                  # 설치 스크립트
├── hooks/                      # 대화 저장 훅 (root hooks/에 위치)
│   ├── save-conversation.ps1/.sh       # User 입력 저장
│   ├── save-tool-use.ps1/.sh           # 도구 호출 관찰 로그
│   ├── save-response.ps1/.sh           # Assistant 응답 저장 (Stop)
│   └── reconcile-conversations.ps1/.sh # 누락 턴 복구 (SessionStart)
├── templates/                  # CLAUDE.md 규칙
│   └── claude-md-rules.md
├── scripts/                    # 핸드오프 + reconcile 스크립트
│   ├── create_handoff.py
│   ├── validate_handoff.py
│   ├── list_handoffs.py
│   ├── check_staleness.py
│   └── reconcile_conversations.py  # JSONL → conversations/ 복구
├── references/                 # 핸드오프 템플릿
│   ├── handoff-template.md
│   └── resume-checklist.md
├── docs/                       # 상세 문서
│   └── memory-system.md        # 인지 모델 설명
└── evals/                      # 평가
```

---

## 기능 1: 대화 자동 저장

```
[SessionStart 훅] reconcile-conversations
    → 지난 세션에서 놓친 assistant 턴을 JSONL 기준으로 backfill (멱등)
    ↓
사용자 입력
    ↓
[UserPromptSubmit 훅] save-conversation
    → 대화 파일에 User 입력 append (<private> 블록 제거)
    ↓
Claude 도구 호출
    ↓
[PostToolUse 훅] save-tool-use
    → 도구명 + 파일경로를 toollog에 한 줄 append
    ↓
Claude 응답 (끝에 #tags 포함)
    ↓
[Stop 훅] save-response
    → transcript에서 응답 추출 → <private> 블록 제거 → 대화 파일 append
```

**원본 세션** (마지막 단계에서 필요한 대화만 파싱·복구): `~/.claude/projects/<encoded>/*.jsonl`
**검색 대상** (사람이 읽고 Claude가 grep): `conversations/YYYY-MM-DD-claude.md`
**멱등 인덱스**: `conversations/.mnemo-index.json` (JSONL 줄 uuid 기반)

> 검색 순서는 `MEMORY.md` → 관련 기억 항목 → 연결 대화·`#tags:` → 대화 본문 → 범위를 좁힌 원본 세션입니다. 태그가 없어도 본문을 확인합니다. [전역 규칙 정본](templates/claude-md-rules.md)의 읽기 전용·카탈로그·핸드오프 기준을 함께 따릅니다. 설치기는 `autoMemoryEnabled=false`로 설정해 새 의미기억을 프로젝트 Mnemo에 모읍니다. 기존 네이티브 기억과 원본 세션은 삭제하지 않습니다.

Stop 훅이 한 번이라도 실패하거나 Claude Code가 강제 종료되면 해당 턴의
미러링이 누락됩니다. 다음 세션 시작 시 `reconcile-conversations`가 자동으로
JSONL을 스캔하여 놓친 턴을 복구합니다. 수동 실행도 가능합니다:

```bash
python "<module_root>/scripts/reconcile_conversations.py" --project-root "<project>" --date YYYY-MM-DD
python "<module_root>/scripts/reconcile_conversations.py" --project-root "<project>" --days 30
python "<module_root>/scripts/reconcile_conversations.py" --project-root "<project>" --date YYYY-MM-DD --dry-run
```

---

`module_root`는 이번에 읽은 정확한 `SKILL.md`의 디렉터리입니다. 날짜 옵션을 생략하면 최근 7일이며,
질문의 실제 시기에 맞춰 `--date` 또는 `--days`를 지정합니다. `--all`은 전체 기간이 필요할 때만 사용합니다.
`--dry-run`은 쓰기 예정 요약이며 대화 전체 추출이 아닙니다. 원본 전체를 컨텍스트에 읽지 말고,
읽기 전용 요청에서는 복구 쓰기를 하지 않습니다. 추가 근거는 실제 파서의 사용자·응답 텍스트만 제한해 추출하고,
그 경로가 없으면 도구의 한계를 알립니다.
현재 reconcile 파서는 assistant 텍스트를 복구합니다. 사용자 질문이 필요하면 해당 세션의 사용자 레코드를
별도로 제한해 파싱하며, assistant 복구 성공을 전체 대화 복구로 보고하지 않습니다.

## 기능 2: MEMORY.md 관리

CLAUDE.md 규칙으로 자동 동작:
- 첫 저장 턴에서 `MEMORY.md` + `memory/*.md` 기본 scaffold 자동 생성
- 중요 결정 → MEMORY.md 자동 업데이트
- 과거 질문 → 동의어 확장 검색

**3계층 메모리 구조:**

| 계층 | 파일 | 용도 |
|------|------|------|
| **인덱스** | MEMORY.md | 키워드 인덱스 + 프로젝트 목표 (항상 로드) |
| **의미기억** | memory/*.md | 카테고리별 상세 항목 (필요 시 Read) |
| **일화기억** | conversations/*.md | 상세 대화 원본 (검색 시에만) |

---

## 기능 3: 세션 핸드오프

컨텍스트가 차거나 작업을 중단할 때 핸드오프 문서를 생성합니다.

핸드오프는 구현한 기능 목록과 구성도/흐름도를 작성하는 산출물입니다.
항상 **Feature/Flow/Decision Snapshot**에 구현 기능, 기능 경계, 구성도, 입력→처리→저장→표시 흐름,
주요 결정/대안/근거를 남깁니다. CodeMap은 TermSnap이 만드는 별도 산출물이므로,
핸드오프는 CodeMap을 대체하지 않고 현재 세션의 구현 근거와 구성도를 작성합니다.

### 핸드오프 생성

```bash
python scripts/create_handoff.py [task-slug]
python scripts/create_handoff.py "auth-part-2" --continues-from previous.md
```

### 핸드오프 검증

```bash
python scripts/validate_handoff.py <handoff-file>
```

### 핸드오프 목록

```bash
python scripts/list_handoffs.py
```

### Staleness 체크

```bash
python scripts/check_staleness.py <handoff-file>
```

**Staleness 레벨:**
- FRESH: 바로 재개 가능
- SLIGHTLY_STALE: 변경사항 확인 후 재개
- STALE: 컨텍스트 검증 필요
- VERY_STALE: 새 핸드오프 권장

---

## 사용법 요약

| 상황 | 방법 |
|------|------|
| 대화 저장 | 자동 (훅) |
| 도구 사용 기록 | 자동 (PostToolUse 훅 → toollog) |
| 키워드 태깅 | Claude가 `#tags:` 추가 |
| 과거 검색 | "이전에 ~했었지?" (Progressive Disclosure) |
| 민감 정보 제외 | `<private>API키</private>` → `[PRIVATE]` |
| 저장 전체 끄기 (opt-out) | 환경변수 `MNEMO_DISABLE=1` — 모든 mnemo 훅(대화/도구 기록/backfill)이 즉시 종료, 기존 저장분은 유지 |
| 지식 축적 | 중요 결정 시 자동 |
| 세션 전환 | `python scripts/create_handoff.py` |
| 세션 재개 | 핸드오프 파일 읽고 이어서 |

---

## 저장 위치

| 파일 | 위치 |
|------|------|
| 대화 로그 | `conversations/YYYY-MM-DD-claude.md` |
| 도구 사용 로그 | `conversations/YYYY-MM-DD-toollog.md` |
| 핸드오프 | `docs/handoffs/YYYY-MM-DD-HHMMSS-slug.md` |
| 인덱스 | `MEMORY.md` (프로젝트 루트) |
| 의미기억 | `memory/*.md` (카테고리별 상세) |

## 프로젝트 저장 경계

기억·대화·핸드오프는 확정된 프로젝트 루트에 저장한다. 공통 규약은 소스의
`skills/mnemo/references/project-storage.md`, 설치 스킬의
`<module_root>/references/project-storage.md`에서 읽는다.

모든 어댑터와 핸드오프·복구 도구는 공통 `mnemo-project-root.js`를 사용한다.
Git 환경변수·하위 cwd로 저장 위치를 바꾸지 않으며, Git도 `.mnemo-root`도 없는
일반 cwd에는 자동 저장하지 않는다. 비-Git 프로젝트는 명시한 workspace에서
초기화한다. 설치 패키지에는 공통 핸드오프 `scripts/`도 포함된다. 소스 checkout의
핸드오프 도구 정본은 `skills/mnemo/scripts/`이다. 실행에는 Python 3와 Node.js가 필요하다.
