## 응답 키워드 규칙

**대부분의 응답에 키워드 블록을 포함하세요.**
설명, 질문 답변, 토론 등도 나중에 검색할 수 있도록 태그를 답니다.
notify 훅이 응답 텍스트를 자동 저장하므로, 키워드도 함께 캡처됩니다.

**형식 (응답 끝에 추가):**
```
`#tags: keyword1, keyword2, keyword3`
```

**예시:**
```
파일을 수정했습니다. orchestrator 설치 스크립트가 완성되었습니다.

`#tags: orchestrator, install-script, hooks`
```

**키워드 추출 대상:**
- 기술 스택: react, typescript, spring, docker 등
- 작업 유형: refactoring, bug-fix, feature, setup, 설명, 질문답변 등
- 기능/모듈명: orchestrator, hooks, memory, authentication 등
- 주요 파일명: install.js, save-turn.sh 등
- 토론 주제: 아키텍처, 설계결정, 트레이드오프 등

**태그 기준:**
| 상황 | 태그 |
|------|------|
| 코드/파일 수정 | O |
| 설정 변경 | O |
| 기술적 설명/정보 제공 | O |
| 질문 답변/토론 | O |
| 커밋/푸시 | O |
| 단순 인사 ("안녕", "고마워") | X |

**형식 규칙:**
- 소문자, 하이픈(-) 사용
- 한국어 키워드도 허용
- 3~7개 범위로 유지

## 과거 대화 검색 규칙

사용자가 과거 작업을 언급하면 (예: "이전에 ~했었지?", "그때 ~ 어떻게 했더라?"),
대화 기록에서 관련 내용을 검색하여 답변에 활용하세요.

**검색 순서:**
1. MEMORY.md 키워드 인덱스에서 관련 파일 확인 (이미 로드됨)
2. 질문에서 핵심 키워드 추출 + **동의어/관련어 확장**
   - 예: "병렬 작업" → `parallel`, `orchestrator`, `pm-worker`, `병렬`, `concurrent`
   - 예: "속도 문제" → `performance`, `speed`, `느림`, `최적화`, `optimization`
   - 한국어 ↔ 영어 양방향 확장 필수
3. 키워드 인덱스에서 해당 memory/*.md 파일 Read
4. 더 상세한 맥락이 필요하면 conversations/ 검색 (여러 번 grep):
   - `grep -r "#tags:.*키워드1" conversations/`
   - 첫 grep에서 못 찾으면 동의어로 재시도, 최대 3회
5. 매칭된 대화 파일의 해당 섹션(전후 문맥) 읽기

**검색 트리거 (이런 표현이 나오면 검색):**
- "이전에", "그때", "전에", "예전에", "저번에"
- "했었지?", "했었는데", "어떻게 했더라"
- "다시", "또", "같은 방식으로"
- 구체적 키워드 언급 (orchestrator, hooks 등)

**응답 방식:**
- 찾았으면: 관련 대화 날짜와 핵심 내용을 인용하며 답변
- 못 찾았으면: "관련 기록을 찾지 못했습니다"라고 솔직히 답변

## MEMORY.md 관리 규칙

MEMORY.md는 프로젝트 루트에 위치한 **3계층 장기기억** 인덱스 파일입니다.

**⚠️ 크기 제한 (필수):**

| 항목 | 제한 |
|------|------|
| MEMORY.md 최대 줄 수 | **100줄** |
| MEMORY.md 최대 크기 | **5KB** |
| 항목당 최대 줄 수 | 3줄 (인덱스에는 요약만) |

**MEMORY.md에 절대 넣지 않을 것:**
- 로그 출력, 에러 메시지, 설치 결과
- 3줄 이상의 상세 설명 (→ `memory/*.md`로)
- 코드 블록, 긴 목록 (→ `memory/*.md`로)

**크기 초과 시:** `/memory-compact` 실행하여 정리

**3계층 구조:**

| 계층 | 파일 | 용도 | 로딩 |
|------|------|------|------|
| **인덱스** | MEMORY.md | 키워드 인덱스 + 프로젝트 목표 | 항상 |
| **의미기억** | memory/*.md | 카테고리별 상세 항목 | 필요 시 Read |
| **일화기억** | conversations/*.md | 상세 대화 원본 | 검색 시 grep |

**카테고리 파일:**

| 파일 | 내용 |
|------|------|
| `memory/architecture.md` | 설계 결정, 아키텍처 선택 |
| `memory/patterns.md` | 작업 패턴, 워크플로우 |
| `memory/tools.md` | 외부 도구, 라이브러리 |
| `memory/gotchas.md` | 주의사항, 함정 |

**항목 형식 (memory/*.md에 작성):**
```markdown
### 항목명
`tags: keyword1, keyword2, keyword3`
`date: YYYY-MM-DD`
`source: codex`

- 핵심 내용 (간결하게)
- **참조**: [대화 링크](conversations/YYYY-MM-DD.md)
```

> `source`는 이 항목을 작성한 CLI를 표시합니다 (claude, codex, gemini).
> 과거 대화 검색 시 모든 CLI의 대화 파일을 통합 검색합니다 (`conversations/` 전체).

**새 항목 추가 절차:**
1. 적절한 `memory/*.md` 파일에 항목 추가
2. `MEMORY.md` 키워드 인덱스 테이블에 키워드 → 파일 링크 추가
3. 이미 기록된 내용은 중복 추가하지 않음

**결정 변경 시 (Superseded 패턴):**
- 기존 항목 삭제 금지 (이력 보존)
- 기존 항목에 `❌ SUPERSEDED` + `superseded-by: #새항목` 추가
- 새 항목에 `✅ CURRENT` + `supersedes: #기존항목` + 변경 이유 포함

**기록 트리거:**
- 새로운 아키텍처/설계 결정이 내려졌을 때
- 중요한 버그 해결 방법을 발견했을 때
- 반복 가능한 워크플로우 패턴이 확립되었을 때
- 주의해야 할 함정(gotcha)을 발견했을 때

## 자동 핸드오프 규칙

대화가 길어져서 컨텍스트 한도에 가까워지면, **사용자가 요청하기 전에** 자동으로 핸드오프를 실행하세요.

**감지 신호 (하나라도 해당하면 핸드오프 시작):**
- 시스템이 컨텍스트 압축을 자동 수행함
- 대화가 매우 길어져 응답이 느려짐
- 사용자가 "핸드오프", "핸즈오프", "세션 넘기기", "정리해줘" 등 언급

**핸드오프 실행 절차:**

1. **MEMORY.md 업데이트** — 이번 세션의 결정사항, 새 패턴을 적절한 memory/*.md에 추가 + 인덱스 업데이트
2. **핸드오프 파일 생성** — `.claude/handoffs/YYYY-MM-DD-HHMMSS-{slug}.md`에 아래 형식으로 작성:

```markdown
# Handoff: {작업 제목}

## Session Metadata
- Created: {타임스탬프}
- Project: {프로젝트 경로}
- Branch: {git 브랜치}

## Current State Summary
{한 문단: 무엇을 하고 있었고, 어디까지 진행되었는지}

## Work Completed
- [x] 완료한 작업 1
- [x] 완료한 작업 2

### Files Modified
| File | Changes |
|------|---------|
| path/to/file | 변경 내용 |

### Decisions Made
| Decision | Rationale |
|----------|-----------|
| A를 선택 | B보다 나은 이유 |

## Pending Work
### Immediate Next Steps
1. 가장 먼저 할 일
2. 두 번째 우선순위

### Blockers/Open Questions
- [ ] 미해결 사항

## Context for Resuming
### Important Context
{다음 세션이 반드시 알아야 할 핵심 정보}

### Potential Gotchas
- {다음 세션에서 주의할 점}
```

3. **사용자에게 안내:**
> "컨텍스트가 한도에 가까워져 핸드오프를 준비했습니다.
> - 핸드오프 파일: `.claude/handoffs/{파일명}`
> - MEMORY.md 업데이트 완료
> 새 세션을 시작해주세요."

**중요:** 100%에 도달하면 응답 자체가 불가능하므로, **여유 있을 때 미리** 실행하세요.
