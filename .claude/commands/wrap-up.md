---
description: 세션 종료 시 장기기억 정리. 키워드 추출, 세션 요약, MEMORY.md 업데이트.
allowed-tools:
  - Read
  - Edit
  - Glob
  - Grep
---

# /wrap-up - 세션 마침표

세션을 정리하고 장기기억에 핵심만 남기는 명령입니다.

## 실행 절차

### 1단계: 오늘 대화 파일 읽기

`.claude/conversations/YYYY-MM-DD.md` 파일을 읽습니다 (오늘 날짜).

### 2단계: 키워드 추출 및 frontmatter 업데이트

대화 내용에서 키워드를 추출합니다:

**추출 대상:**
- 기술 스택: react, typescript, spring, docker, mcp, powershell 등
- 작업 유형: refactoring, bug-fix, feature, setup, migration 등
- 기능/모듈명: orchestrator, hooks, memory, authentication 등
- 주요 파일명: install-orchestrator.js, save-response.ps1 등

**규칙:**
- 소문자, 하이픈(-) 사용
- 한국어 키워드도 허용
- 기존 키워드에 새 키워드 추가 (중복 제거)
- 5~15개 범위로 유지

Edit 도구로 frontmatter의 `keywords: []`를 업데이트합니다.

### 3단계: 세션 요약 작성

대화 파일 끝에 세션 요약을 추가합니다:

```markdown
## [HH:mm] Session Wrap-up

### 오늘 한 일
- (핵심 작업 1~5개, 간결하게)

### 주요 결정
- (있으면 기록, 없으면 생략)

### 다음 할 일
- (미완성 작업이나 후속 작업)

### MEMORY.md 업데이트
- (업데이트했으면 어떤 섹션에 무엇을 추가했는지)
- (업데이트할 내용 없으면 "해당 없음")
```

### 4단계: MEMORY.md 업데이트 (해당 시)

다음 중 하나라도 있으면 MEMORY.md에 추가합니다:

| 기준 | MEMORY.md 섹션 |
|------|---------------|
| 새로운 아키텍처 결정 | `architecture/` |
| 새로운 작업 패턴 발견 | `patterns/` |
| 새로운 도구/MCP 추가 | `tools/` |
| 삽질 후 알게 된 주의사항 | `gotchas/` |

**항목 형식:**
```markdown
### 항목명
`tags: keyword1, keyword2`
`date: YYYY-MM-DD`

- 핵심 내용 (간결하게)
- **참조**: [대화 링크](.claude/conversations/YYYY-MM-DD.md)
```

**키워드 인덱스 테이블**도 함께 업데이트합니다.

기존 항목과 중복이면 추가하지 않습니다.
기존 결정이 변경되면 Superseded 패턴을 따릅니다.

### 5단계: 완료 보고

사용자에게 요약을 보여줍니다:
- 추출된 키워드 목록
- 세션 요약 (오늘 한 일)
- MEMORY.md 변경사항 (있으면)
- "다음 세션에서 이어갈 내용" 한 줄

## 주의사항

- 대화 파일이 없으면 "오늘 대화 파일이 없습니다" 출력 후 종료
- 단순 인사/잡담만 있었으면 "기록할 내용이 없습니다" 출력 후 종료
- MEMORY.md 업데이트는 정말 중요한 내용만 (매 세션마다 추가하면 비대해짐)
