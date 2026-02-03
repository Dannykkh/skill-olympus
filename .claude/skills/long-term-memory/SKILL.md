---
name: long-term-memory
description: 장기기억 관리 스킬 - 기억 추가, 검색, 조회
trigger: /memory
auto_trigger:
  - "기억해"
  - "remember"
  - "기억 찾아"
  - "이전에 뭘 했"
---

# Long-term Memory Skill

세션 간 컨텍스트 유지를 위한 장기기억 관리 스킬입니다.

## 명령어

### /memory add <내용>
정보를 MEMORY.md에 저장합니다.

```
/memory add Redis TTL은 항상 1시간으로 설정
기억해: API 키는 환경변수로 관리
```

### /memory search <키워드>
MEMORY.md에서 키워드 검색합니다.

```
/memory search redis
redis 관련 기억 찾아줘
```

### /memory find <키워드>
대화 로그 인덱스에서 검색합니다 (RAG 스타일).

```
/memory find orchestrator
이전에 orchestrator 구현한 적 있어?
```

### /memory read <날짜>
특정 날짜의 대화 로그를 읽습니다.

```
/memory read 2026-02-02
어제 대화 보여줘
```

### /memory tag <키워드들>
오늘 대화에 키워드를 수동 추가합니다.

```
/memory tag oauth, jwt, authentication
```

### /memory list
MEMORY.md 전체 내용을 표시합니다.

```
/memory list
장기기억 보여줘
```

## 파일 구조

```
프로젝트/
├── MEMORY.md                    # 구조화된 장기기억
├── CLAUDE.md                    # @MEMORY.md 참조
└── .claude/
    └── conversations/           # 대화 로그
        ├── 2026-02-02.md
        ├── 2026-02-01.md
        └── index.json           # 키워드 인덱스
```

## 자동 동작

1. **UserPromptSubmit**: 모든 대화 자동 저장
2. **Stop**: 키워드 추출 + MEMORY.md 업데이트
