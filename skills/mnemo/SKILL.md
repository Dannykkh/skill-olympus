---
name: mnemo
description: 과거 대화 검색, 장기기억 설정, 세션 핸드오프할 때 사용. 대화 자동 저장, 키워드 태깅, MEMORY.md 관리, 세션 전환.
triggers:
  - "장기기억"
  - "memory"
  - "기억해"
  - "이전에"
  - "handoff"
  - "핸드오프"
  - "세션 저장"
auto_apply: false
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
| **프라이버시** | `<private>` 태그로 민감 정보 제외 |

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

**Source of truth**: `~/.claude/projects/<encoded>/*.jsonl` (Claude Code가 보관)
**검색 미러**: `conversations/YYYY-MM-DD-claude.md` (사람이 읽는 형태)
**멱등 인덱스**: `conversations/.mnemo-index.json` (JSONL 줄 uuid 기반)

Stop 훅이 한 번이라도 실패하거나 Claude Code가 강제 종료되면 해당 턴의
미러링이 누락됩니다. 다음 세션 시작 시 `reconcile-conversations`가 자동으로
JSONL을 스캔하여 놓친 턴을 복구합니다. 수동 실행도 가능합니다:

```bash
python skills/mnemo/scripts/reconcile_conversations.py              # 오늘자
python skills/mnemo/scripts/reconcile_conversations.py --all        # 전체
python skills/mnemo/scripts/reconcile_conversations.py --dry-run    # 시뮬레이션
```

---

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
| 지식 축적 | 중요 결정 시 자동 |
| 세션 전환 | `python scripts/create_handoff.py` |
| 세션 재개 | 핸드오프 파일 읽고 이어서 |

---

## 저장 위치

| 파일 | 위치 |
|------|------|
| 대화 로그 | `conversations/YYYY-MM-DD-claude.md` |
| 도구 사용 로그 | `conversations/YYYY-MM-DD-toollog.md` |
| 핸드오프 | `.claude/handoffs/YYYY-MM-DD-HHMMSS-slug.md` |
| 인덱스 | `MEMORY.md` (프로젝트 루트) |
| 의미기억 | `memory/*.md` (카테고리별 상세) |
