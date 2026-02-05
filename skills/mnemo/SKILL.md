---
name: mnemo
description: 장기기억 시스템. 대화 자동 저장 + 키워드 태깅 + 과거 검색 + MEMORY.md 자동 업데이트
triggers:
  - "장기기억"
  - "memory"
  - "기억해"
  - "이전에"
auto_apply: false
---

# Mnemo - 장기기억 시스템

> 기억의 여신 Mnemosyne에서 유래

세션 간 컨텍스트 유지를 위한 단순하고 빠른 메모리 시스템입니다.

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
├── hooks/
│   ├── save-conversation.ps1   # User 입력 저장 (Windows)
│   ├── save-conversation.sh    # User 입력 저장 (Linux/Mac)
│   ├── save-response.ps1       # Assistant 응답 저장 (Windows)
│   └── save-response.sh        # Assistant 응답 저장 (Linux/Mac)
└── templates/
    └── claude-md-rules.md      # CLAUDE.md 규칙 템플릿
```

---

## 동작 방식

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
    ↓
[CLAUDE.md 규칙]
    → 중요 결정 → MEMORY.md 자동 업데이트
    → 과거 질문 → 동의어 확장 검색
```

---

## 설치되는 구성요소

| 위치 | 내용 |
|------|------|
| `~/.claude/hooks/` | save-conversation, save-response |
| `~/.claude/settings.json` | 훅 설정 |
| `~/.claude/CLAUDE.md` | 태그 규칙, 검색 규칙, MEMORY.md 업데이트 규칙 |

---

## 사용법

설치 후 자동으로 동작합니다:

- **대화 저장**: `.claude/conversations/YYYY-MM-DD.md`에 자동 저장
- **키워드 태깅**: Claude가 응답 끝에 `#tags: keyword1, keyword2` 추가
- **과거 검색**: "이전에 ~했었지?" 라고 물으면 자동 검색
- **지식 축적**: 중요한 결정은 MEMORY.md에 자동 기록

---

## 2계층 메모리 구조

| 계층 | 파일 | 용도 |
|------|------|------|
| **의미기억** | MEMORY.md | 핵심 결정, 패턴 (항상 로드) |
| **일화기억** | conversations/*.md | 상세 대화 원본 (검색 시에만) |
