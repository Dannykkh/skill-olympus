# 장기기억 시스템

세션 간 컨텍스트 유지를 위한 단순하고 빠른 메모리 시스템입니다.

---

## 핵심 원칙

| 원칙 | 설명 |
|------|------|
| **빠르게** | 훅에서 AI 호출 금지 (단순 append만) |
| **단순하게** | 파일 기반, 복잡한 DB 없음 |
| **검색 가능하게** | 키워드 + 컨텍스트 트리 |

---

## 구조

```
프로젝트/
├── MEMORY.md                    # 컨텍스트 트리 (Git 추적)
├── CLAUDE.md                    # @MEMORY.md 참조
├── hooks/
│   └── save-conversation.ps1    # 대화 저장 (단순 append)
└── .claude/
    └── conversations/           # 대화 로그 (Git 제외)
        └── 2026-02-03.md
```

---

## 동작 방식

```
사용자 입력
    ↓
[UserPromptSubmit 훅] save-conversation.ps1
    ↓
대화 파일에 User 입력 append (30줄 스크립트, AI 호출 없음)
    ↓
Claude 응답
    ↓
[Claude가 직접] 응답 요약 → 대화 파일 append
[Claude가 직접] 키워드 추출 → frontmatter 업데이트
[Claude가 직접] 중요 내용 → MEMORY.md 업데이트
```

**Stop 훅 없음** - 추가 AI 호출로 느려지는 것 방지

**대화 저장 내용:**
- User: 훅에서 자동 저장 (모든 입력)
- Assistant: Claude가 직접 저장 (실제 작업만, 단순 질문 응답 제외)

---

## MEMORY.md 구조 (컨텍스트 트리)

```markdown
# MEMORY.md

## 프로젝트 목표
| 목표 | 상태 |
|------|------|
| 기능 A | ✅ 완성 |
| 기능 B | 🔄 진행중 |

## 키워드 인덱스
| 키워드 | 섹션 |
|--------|------|
| auth, jwt | #architecture/authentication |

## architecture/
### authentication
`tags: auth, jwt, oauth`
`date: 2026-02-03`
- JWT 선택 이유: ...
- **참조**: [대화](.claude/conversations/2026-02-03.md)

## patterns/
### 작업-패턴명
...

## gotchas/
### 주의사항명
...
```

---

## 설치 (3단계)

### 1. 파일 복사

```bash
# 훅 복사
cp skills/long-term-memory/hooks/save-conversation.ps1 hooks/

# 대화 폴더 생성
mkdir -p .claude/conversations
```

### 2. CLAUDE.md 설정

```markdown
@MEMORY.md

## 메모리 자동 기록 규칙
... (CLAUDE.md.snippet 내용 추가)
```

### 3. 훅 등록

`.claude/settings.local.json`:
```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": ".*",
        "hooks": [{
          "type": "command",
          "command": "powershell -ExecutionPolicy Bypass -File hooks/save-conversation.ps1 \"$PROMPT\""
        }]
      }
    ]
  }
}
```

Linux/Mac:
```json
"command": "bash hooks/save-conversation.sh \"$PROMPT\""
```

---

## 결정 변경 시 (Superseded 패턴)

기존 결정이 바뀌면 **삭제하지 말고** 이력 보존:

```markdown
### 기존-결정 ❌ SUPERSEDED
`superseded-by: #새-결정`
~~기존 내용~~

### 새-결정 ✅ CURRENT
`supersedes: #기존-결정`
- 새 내용
- **변경 이유**: ...
```

---

## 관련 파일

| 파일 | 역할 |
|------|------|
| `MEMORY.md` | 컨텍스트 트리 장기기억 |
| `CLAUDE.md` | 메모리 규칙 정의 |
| `hooks/save-conversation.ps1` | 대화 저장 (30줄) |
| `.claude/conversations/` | 대화 로그 |

---

**최종 업데이트:** 2026-02-03
