---
name: long-term-memory
description: 세션 간 장기기억 관리. MEMORY.md 업데이트, 대화 키워드 검색, 자동 태깅
triggers:
  - "장기기억"
  - "memory"
  - "기억해"
  - "remember"
  - "/memory"
auto_apply: false
---

# Long-Term Memory Management

세션 간 지속되는 장기기억을 관리합니다.

> **설치 가이드**: [INSTALL.md](./INSTALL.md)

## 포함 파일

```
long-term-memory/
├── SKILL.md              # 스킬 정의 (이 파일)
├── INSTALL.md            # 설치 가이드
├── CLAUDE.md.snippet     # CLAUDE.md에 추가할 규칙
└── hooks/
    ├── save-conversation.ps1   # 대화 저장 (Windows)
    ├── save-conversation.sh    # 대화 저장 (Linux/Mac)
    ├── update-memory.ps1       # 메모리 업데이트 (Windows)
    └── update-memory.sh        # 메모리 업데이트 (Linux/Mac)
```

## 시스템 구조

```
프로젝트/
├── MEMORY.md                      # 구조화된 장기기억
└── .claude/
    └── conversations/
        ├── 2026-02-02.md          # 대화 로그 (frontmatter + 키워드)
        ├── 2026-02-01.md
        └── index.json             # 키워드 인덱스 (검색용)
```

---

## 명령어

### 1. 정보 기억하기

```
/memory add <내용>
기억해: <내용>
```

MEMORY.md의 적절한 섹션에 정보 추가.

### 2. 기억 검색하기

```
/memory search <키워드>
<키워드> 관련 기억 찾아줘
```

MEMORY.md + 대화 로그에서 키워드 검색.

### 3. 대화 키워드 검색 (RAG 스타일)

```
/memory find <키워드>
이전에 <키워드> 구현한 적 있어?
```

`.claude/conversations/index.json`에서 키워드 매칭 → 관련 대화 파일 찾기.

### 4. 수동 태그 추가

```
/memory tag <키워드1>, <키워드2>, ...
```

오늘 대화 파일의 frontmatter에 키워드 추가.

### 5. 전체 기억 보기

```
/memory list
장기기억 전체 보여줘
```

---

## 대화 파일 형식

```markdown
---
date: 2026-02-02
project: my-project
keywords: [orchestrator, multi-ai, react, typescript]
summary: "Multi-AI 오케스트레이터 구현. React 컴포넌트 리팩토링."
---

# Conversation Log - 2026-02-02

## [14:30:00] User
...
```

---

## 인덱스 파일 형식

`.claude/conversations/index.json`:

```json
{
  "lastUpdated": "2026-02-02T15:30:00Z",
  "conversations": [
    {
      "date": "2026-02-02",
      "file": "2026-02-02.md",
      "keywords": ["orchestrator", "multi-ai", "workpm"],
      "summary": "Multi-AI 오케스트레이터 구현..."
    }
  ],
  "keywordIndex": {
    "orchestrator": ["2026-02-02", "2026-02-01"],
    "react": ["2026-01-30", "2026-01-29"],
    "typescript": ["2026-02-02", "2026-01-30"]
  }
}
```

---

## 검색 워크플로우

### /memory find orchestrator

```
1. index.json 읽기
2. keywordIndex에서 "orchestrator" 찾기 → ["2026-02-02", "2026-02-01"]
3. 해당 대화 파일의 summary 표시
4. 필요 시 상세 내용 조회 제안
```

### 출력 예시

```
📂 "orchestrator" 관련 대화 2건 발견:

1. 2026-02-02
   키워드: orchestrator, multi-ai, workpm, pmworker
   요약: Multi-AI 오케스트레이터 구현. workpm/pmworker 트리거 설정.

2. 2026-02-01
   키워드: orchestrator, mcp, file-locking
   요약: claude-orchestrator-mcp 초기 설정. 파일 락 테스트.

상세 내용을 보려면: "/memory read 2026-02-02"
```

---

## 자동 기록 규칙

다음 내용은 세션 종료 시 자동으로 기록:

| 대상 | 저장 위치 |
|------|----------|
| 아키텍처/설계 결정 | MEMORY.md |
| 버그 원인과 해결 | MEMORY.md |
| 기술 스택 선택 이유 | MEMORY.md |
| 핵심 키워드 | 대화 파일 frontmatter |
| 대화 요약 | 대화 파일 frontmatter |

---

## 수동 태깅 예시

### 입력
```
/memory tag oauth, jwt, authentication, security
```

### 결과 (오늘 대화 파일 frontmatter 업데이트)
```yaml
---
date: 2026-02-02
project: my-project
keywords: [oauth, jwt, authentication, security]  # 업데이트됨
summary: "..."
---
```

---

## 에이전트 동작

이 스킬이 트리거되면:

1. **`/memory add`**: MEMORY.md 적절한 섹션에 추가
2. **`/memory search`**: MEMORY.md에서 grep 검색
3. **`/memory find`**: index.json에서 키워드 검색 → 대화 파일 목록
4. **`/memory tag`**: 오늘 대화 파일 frontmatter 키워드 추가
5. **`/memory read <date>`**: 특정 날짜 대화 파일 읽기
6. **`/memory list`**: MEMORY.md 전체 표시

---

## 컨텍스트 효율성

- MEMORY.md는 항상 로드됨 (CLAUDE.md에서 @MEMORY.md 참조)
- 대화 로그는 필요 시에만 로드 (키워드 검색 후)
- index.json은 가벼운 메타데이터만 포함
