---
name: mnemo
description: 장기기억 + 세션 핸드오프 통합 시스템. 대화 저장, 키워드 태깅, 과거 검색, MEMORY.md, 세션 전환
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

---

## 포함 파일

```
mnemo/
├── SKILL.md                    # 이 파일
├── install.js                  # 설치 스크립트
├── hooks/                      # 대화 저장 훅
│   ├── save-conversation.ps1/.sh
│   └── save-response.ps1/.sh
├── templates/                  # CLAUDE.md 규칙
│   └── claude-md-rules.md
├── scripts/                    # 핸드오프 스크립트
│   ├── create_handoff.py
│   ├── validate_handoff.py
│   ├── list_handoffs.py
│   └── check_staleness.py
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
사용자 입력
    ↓
[UserPromptSubmit 훅] save-conversation
    → 대화 파일에 User 입력 append
    ↓
Claude 응답 (끝에 #tags 포함)
    ↓
[Stop 훅] save-response
    → transcript에서 응답 추출 → 대화 파일 append
```

---

## 기능 2: MEMORY.md 관리

CLAUDE.md 규칙으로 자동 동작:
- 중요 결정 → MEMORY.md 자동 업데이트
- 과거 질문 → 동의어 확장 검색

**2계층 메모리 구조:**

| 계층 | 파일 | 용도 |
|------|------|------|
| **의미기억** | MEMORY.md | 핵심 결정, 패턴 (항상 로드) |
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
| 키워드 태깅 | Claude가 `#tags:` 추가 |
| 과거 검색 | "이전에 ~했었지?" |
| 지식 축적 | 중요 결정 시 자동 |
| 세션 전환 | `python scripts/create_handoff.py` |
| 세션 재개 | 핸드오프 파일 읽고 이어서 |

---

## 저장 위치

| 파일 | 위치 |
|------|------|
| 대화 로그 | `conversations/YYYY-MM-DD-claude.md` |
| 핸드오프 | `.claude/handoffs/YYYY-MM-DD-HHMMSS-slug.md` |
| 의미기억 | `MEMORY.md` (프로젝트 루트) |
