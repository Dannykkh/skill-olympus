---
name: long-term-memory
description: 세션 간 장기기억 관리. 컨텍스트 트리 구조의 MEMORY.md + 대화 로그 저장
triggers:
  - "장기기억"
  - "memory"
  - "기억해"
auto_apply: false
---

# 장기기억 시스템

세션 간 컨텍스트 유지를 위한 단순하고 빠른 메모리 시스템입니다.

> **설치 가이드**: [INSTALL.md](./INSTALL.md)

---

## 핵심 원칙

| 원칙 | 설명 |
|------|------|
| **빠르게** | 훅에서 AI 호출 금지 (단순 append만) |
| **단순하게** | 파일 기반, 복잡한 DB 없음 |
| **검색 가능하게** | 키워드 + 컨텍스트 트리 |

---

## 포함 파일

```
long-term-memory/
├── SKILL.md              # 스킬 정의 (이 파일)
├── INSTALL.md            # 설치 가이드
├── CLAUDE.md.snippet     # CLAUDE.md에 추가할 규칙
└── hooks/
    ├── save-conversation.ps1   # 대화 저장 (Windows)
    └── save-conversation.sh    # 대화 저장 (Linux/Mac)
```

---

## 시스템 구조

```
프로젝트/
├── MEMORY.md                    # 컨텍스트 트리 (Git 추적)
├── CLAUDE.md                    # @MEMORY.md 참조
├── hooks/
│   └── save-conversation.ps1    # 대화 저장 (30줄)
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
대화 파일에 append (AI 호출 없음, 빠름)
    ↓
Claude 응답
    ↓
[Claude가 직접] 키워드 → frontmatter 업데이트
[Claude가 직접] 중요 내용 → MEMORY.md 업데이트
```

**Stop 훅 없음** - 추가 AI 호출로 느려지는 것 방지

---

## MEMORY.md 구조 (컨텍스트 트리)

```markdown
## 프로젝트 목표
| 목표 | 상태 |
|------|------|
| 기능 A | ✅ 완성 |

## 키워드 인덱스
| 키워드 | 섹션 |
|--------|------|
| auth, jwt | #architecture/auth |

## architecture/
### auth
`tags: auth, jwt`
`date: 2026-02-03`
- JWT 선택 이유
- **참조**: [대화](.claude/conversations/2026-02-03.md)

## patterns/
## gotchas/
```

---

## 결정 변경 시 (Superseded 패턴)

기존 결정 삭제 금지, 이력 보존:

```markdown
### 기존-결정 ❌ SUPERSEDED
`superseded-by: #새-결정`

### 새-결정 ✅ CURRENT
`supersedes: #기존-결정`
- **변경 이유**: ...
```

---

## 명령어

| 명령어 | 설명 |
|--------|------|
| `/memory add <내용>` | MEMORY.md에 정보 저장 |
| `/memory search <키워드>` | MEMORY.md 검색 |
| `/memory list` | 전체 기억 보기 |
| `기억해: <내용>` | /memory add와 동일 |
