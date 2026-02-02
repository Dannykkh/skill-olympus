# 장기기억 시스템 (Long-term Memory System)

세션 간 컨텍스트 유지 및 키워드 기반 대화 검색을 위한 메모리 시스템입니다.

---

## 목차

1. [개요](#개요)
2. [시스템 구조](#시스템-구조)
3. [자동 동작](#자동-동작)
4. [명령어 가이드](#명령어-가이드)
5. [키워드 검색 시스템](#키워드-검색-시스템)
6. [훅 설정](#훅-설정)
7. [실전 예시](#실전-예시)
8. [트러블슈팅](#트러블슈팅)

---

## 개요

### 문제

- Claude Code 세션은 컨텍스트 제한이 있음
- 이전 세션에서 무엇을 했는지 기억하지 못함
- "이전에 어떻게 구현했지?" 질문에 답할 수 없음

### 해결

| 구성요소 | 역할 |
|---------|------|
| **MEMORY.md** | 중요한 결정사항, 교훈 저장 (항상 로드됨) |
| **대화 로그** | 모든 대화 원시 저장 + 키워드 태깅 |
| **index.json** | 키워드 인덱스 (RAG 스타일 검색용) |
| **검색 명령어** | `/memory find`, `/memory search` |

---

## 시스템 구조

```
프로젝트/
├── MEMORY.md                          # 구조화된 장기기억 (Git 추적)
├── CLAUDE.md                          # @MEMORY.md 참조 → 항상 로드
└── .claude/
    ├── conversations/                 # 대화 로그 (Git 제외)
    │   ├── 2026-02-02.md              # 오늘 대화 (frontmatter + 키워드)
    │   ├── 2026-02-01.md              # 어제 대화
    │   ├── 2026-01-31.md
    │   └── index.json                 # 키워드 인덱스
    └── handoffs/                      # 세션 핸드오프 문서
        └── 2026-02-02-auth-impl.md
```

### 대화 파일 형식

```markdown
---
date: 2026-02-02
project: my-project
keywords: [orchestrator, multi-ai, jwt, authentication, react]
summary: "Multi-AI 오케스트레이터 구현. JWT 인증 시스템 설계. React 컴포넌트 리팩토링."
---

# Conversation Log - 2026-02-02

프로젝트: my-project

---

## [14:30:00] User

orchestrator 구현해줘

---

## [14:31:00] User

jwt 인증도 추가해

---
```

### index.json 형식

```json
{
  "lastUpdated": "2026-02-02T18:30:00Z",
  "conversations": [
    {
      "date": "2026-02-02",
      "file": "2026-02-02.md",
      "keywords": ["orchestrator", "multi-ai", "jwt", "authentication"],
      "summary": "Multi-AI 오케스트레이터 구현..."
    },
    {
      "date": "2026-02-01",
      "file": "2026-02-01.md",
      "keywords": ["react", "hooks", "useEffect", "performance"],
      "summary": "React 훅 최적화..."
    }
  ],
  "keywordIndex": {
    "orchestrator": ["2026-02-02"],
    "react": ["2026-02-01", "2026-01-30"],
    "jwt": ["2026-02-02"],
    "authentication": ["2026-02-02", "2026-01-28"]
  }
}
```

---

## 자동 동작

### 세션 중

```
사용자 입력
    ↓
UserPromptSubmit 훅
    ↓
save-conversation.sh/ps1
    ↓
.claude/conversations/2026-02-02.md에 추가
(frontmatter: keywords=[], summary="")
```

### 세션 종료 (Stop 훅)

```
세션 종료 감지
    ↓
update-memory.sh/ps1
    ↓
┌─────────────────────────────────────┐
│ 1. keyword-extractor 에이전트 호출   │
│    - 대화 분석                       │
│    - 키워드 10-20개 추출             │
│    - 요약문 생성                     │
│    - frontmatter 업데이트            │
│    - index.json 업데이트             │
├─────────────────────────────────────┤
│ 2. memory-writer 에이전트 호출       │
│    - 중요 결정사항 추출              │
│    - MEMORY.md 업데이트              │
└─────────────────────────────────────┘
```

---

## 명령어 가이드

### /memory add - 정보 기억하기

```
/memory add Redis 캐시 TTL은 항상 1시간으로 설정
기억해: Spring Boot @Transactional은 public 메서드에만 적용됨
```

**동작**: MEMORY.md의 적절한 섹션에 정보 추가

**결과** (MEMORY.md):
```markdown
### Redis 캐시 설정 (2026-02-02)

- Redis 캐시 TTL은 항상 1시간으로 설정
```

---

### /memory search - MEMORY.md 검색

```
/memory search redis
redis 관련 기억 찾아줘
```

**동작**: MEMORY.md에서 키워드 grep 검색

**출력**:
```
📝 MEMORY.md에서 "redis" 관련 내용:

### Redis 캐시 설정 (2026-02-02)
- Redis 캐시 TTL은 항상 1시간으로 설정

### 성능 개선 (2026-01-30)
- Redis 캐싱으로 API 응답 시간 50% 감소
```

---

### /memory find - 대화 키워드 검색 (RAG 스타일)

```
/memory find orchestrator
이전에 orchestrator 구현한 적 있어?
```

**동작**: index.json에서 키워드 검색 → 관련 대화 목록 반환

**출력**:
```
📂 "orchestrator" 관련 대화 2건 발견:

1. 2026-02-02
   키워드: orchestrator, multi-ai, workpm, pmworker, mcp
   요약: Multi-AI 오케스트레이터 구현. workpm/pmworker 트리거 설정.

2. 2026-02-01
   키워드: orchestrator, file-locking, task-dependency
   요약: claude-orchestrator-mcp 초기 설정. 파일 락 테스트.

상세 내용을 보려면: "/memory read 2026-02-02"
```

---

### /memory read - 특정 대화 읽기

```
/memory read 2026-02-02
2월 2일 대화 보여줘
```

**동작**: 해당 날짜의 대화 파일 전체 읽기

---

### /memory tag - 수동 키워드 태깅

```
/memory tag oauth, jwt, authentication, security
```

**동작**: 오늘 대화 파일의 frontmatter에 키워드 추가/병합

**전**:
```yaml
keywords: [react, hooks]
```

**후**:
```yaml
keywords: [react, hooks, oauth, jwt, authentication, security]
```

---

### /memory list - 전체 기억 보기

```
/memory list
장기기억 전체 보여줘
```

**동작**: MEMORY.md 전체 내용 표시

---

## 키워드 검색 시스템

### 검색 흐름

```
사용자: "이전에 인증 어떻게 구현했어?"
           ↓
┌─────────────────────────────────────┐
│ 1. index.json 읽기                   │
│ 2. keywordIndex에서 "인증" 검색      │
│    → ["2026-02-02", "2026-01-28"]   │
│ 3. conversations에서 상세 정보 조회   │
│ 4. 요약 + 날짜 목록 반환             │
└─────────────────────────────────────┘
           ↓
응답: "2건의 관련 대화가 있습니다..."
           ↓
사용자: "/memory read 2026-02-02"
           ↓
해당 대화 파일 전체 로드
```

### 키워드 자동 추출 규칙

| 추출 대상 | 예시 |
|----------|------|
| 기술 스택 | react, typescript, python, docker, mcp |
| 기능/모듈 | orchestrator, authentication, caching |
| 파일/경로 | state-manager.ts, launch.ps1 |
| 작업 유형 | refactor, implement, fix, config |
| 주요 결정 | jwt-선택, redis-도입 |

### 수동 태깅이 필요한 경우

- 자동 추출이 놓친 중요 키워드
- 프로젝트 특화 용어
- 나중에 검색할 가능성이 높은 키워드

```
/memory tag 결제연동, pg, tosspayments
```

---

## 훅 설정

### 기본 설정 (PowerShell)

`.claude/settings.local.json`:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "description": "대화 로그 저장",
        "hooks": ["powershell -ExecutionPolicy Bypass -File hooks/save-conversation.ps1 \"$PROMPT\""]
      }
    ],
    "Stop": [
      {
        "description": "키워드 추출 + 메모리 업데이트",
        "hooks": ["powershell -ExecutionPolicy Bypass -File hooks/update-memory.ps1"]
      }
    ]
  }
}
```

### Bash 설정 (Linux/Mac/Git Bash)

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": ["bash hooks/save-conversation.sh \"$PROMPT\""]
      }
    ],
    "Stop": [
      {
        "hooks": ["bash hooks/update-memory.sh"]
      }
    ]
  }
}
```

---

## 실전 예시

### 예시 1: 이전 구현 찾기

```
사용자: 이전에 인증 시스템 어떻게 만들었더라?

Claude: /memory find 명령으로 검색합니다.

📂 "인증" 관련 대화 3건:

1. 2026-02-02 - JWT 인증 API 구현
2. 2026-01-28 - OAuth2 소셜 로그인
3. 2026-01-20 - 세션 기반 인증 (레거시)

사용자: 첫 번째꺼 자세히 보여줘

Claude: /memory read 2026-02-02 실행...
[2026-02-02 대화 내용 표시]
```

### 예시 2: 특정 기술 결정 찾기

```
사용자: Redis 왜 도입했었지?

Claude: MEMORY.md와 대화 로그를 검색합니다.

📝 MEMORY.md:
- "Redis 캐싱으로 API 응답 시간 50% 감소" (2026-01-30)

📂 대화 로그:
- 2026-01-30: Redis 도입 논의, 벤치마크 테스트 결과

상세 내용이 필요하시면 "/memory read 2026-01-30"
```

### 예시 3: 수동 태깅

```
사용자: 오늘 작업한 내용에 "결제" 키워드 추가해줘

Claude: /memory tag 결제, payment, tosspayments

오늘 대화(2026-02-02.md)의 키워드에 추가되었습니다:
keywords: [orchestrator, mcp, 결제, payment, tosspayments]
```

---

## 트러블슈팅

### 문제: 키워드가 추출되지 않음

**원인**: Stop 훅이 실행되지 않았거나 실패

**해결**:
```
# 수동으로 키워드 추출 실행
keyword-extractor 에이전트로 오늘 대화 키워드 추출해줘
```

### 문제: index.json이 없음

**원인**: 첫 세션이거나 훅 미실행

**해결**:
```
# 수동 생성
keyword-extractor 에이전트로 .claude/conversations/ 폴더의
모든 대화 파일을 분석해서 index.json 생성해줘
```

### 문제: 검색 결과가 없음

**원인**: 키워드가 태깅되지 않음

**해결**:
```
# 수동 태깅
/memory tag <관련 키워드들>

# 또는 대화 파일 직접 검색
.claude/conversations/ 폴더에서 "검색어" grep 해줘
```

### 문제: MEMORY.md가 업데이트 안됨

**원인**: memory-writer 에이전트 실패

**해결**:
```
# 수동 실행
memory-writer 에이전트로 오늘 대화 분석해서 MEMORY.md 업데이트해줘
```

---

## 관련 파일

| 파일 | 역할 |
|------|------|
| [MEMORY.md](../MEMORY.md) | 장기기억 저장소 |
| [CLAUDE.md](../CLAUDE.md) | @MEMORY.md 참조 |
| [agents/memory-writer.md](../agents/memory-writer.md) | 메모리 정리 에이전트 |
| [agents/keyword-extractor.md](../agents/keyword-extractor.md) | 키워드 추출 에이전트 |
| [skills/long-term-memory/](../skills/long-term-memory/) | 메모리 관리 스킬 |
| [skills/session-handoff/](../skills/session-handoff/) | 세션 핸드오프 스킬 |
| [hooks/save-conversation.ps1](../hooks/save-conversation.ps1) | 대화 저장 훅 |
| [hooks/update-memory.ps1](../hooks/update-memory.ps1) | 메모리 업데이트 훅 |

---

## 참고 자료

| 프로젝트 | 참고 내용 | 링크 |
|---------|----------|------|
| **softaworks/agent-toolkit** | session-handoff 스킬 원본 | [GitHub](https://github.com/softaworks/agent-toolkit) |
| **Yeachan-Heo/oh-my-claudecode** | 메모리 관리 패턴 | [GitHub](https://github.com/Yeachan-Heo/oh-my-claudecode) |

---

**최종 업데이트:** 2026-02-02
