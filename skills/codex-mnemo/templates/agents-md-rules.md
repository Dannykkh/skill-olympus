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

## Privacy 태그

대화 저장 시 민감한 정보를 제외하려면 `<private>` 태그를 사용하세요.
훅이 저장 전에 `<private>...</private>` 블록을 `[PRIVATE]`로 대체합니다.

```
API 키는 <private>sk-1234abcd</private> 입니다.
→ 저장: API 키는 [PRIVATE] 입니다.
```

**적용 대상:** 사용자 입력과 AI 응답 모두에 적용됩니다.

## 글로벌 스킬 & 에이전트 카탈로그

설치된 모든 스킬은 `SKILLS-CATALOG.md`, 에이전트는 `AGENTS-CATALOG.md`에 목록화되어 있습니다.

**필수 규칙:**
- 사용자가 스킬을 요청하거나 `/명령어`를 입력하면, **반드시 `SKILLS-CATALOG.md`를 먼저 읽어** 사용 가능한 스킬을 확인하세요.
- 스킬이 확인되면, 해당 스킬의 `skills/{스킬명}/SKILL.md`를 읽어 워크플로우를 따르세요.
- 특정 전문 분야(아키텍처, DB, 보안 등) 작업 시 `AGENTS-CATALOG.md`에서 적합한 에이전트를 찾아 해당 `.md` 파일의 지침을 따르세요.
- "어떤 스킬이 있어?", "뭘 할 수 있어?" 같은 질문에는 두 카탈로그의 목록을 기반으로 답하세요.

## Claude 호환 호출명 규칙

Codex는 Claude처럼 커스텀 slash command 레지스트리를 직접 제공하지 않을 수 있습니다.
그렇더라도 사용자가 Claude 방식 호출명을 쓰면 **명시적 skill invocation**으로 해석하세요.

**핵심 규칙:**
- 사용자 입력이 `/`로 시작하면, 우선 이를 skill 호출 의도로 해석합니다.
- `/foo-bar` 형태면 `foo-bar`라는 skill 이름과 먼저 exact match 시도합니다.
- exact match가 없으면, `SKILLS-CATALOG.md`에서 설명/별칭으로 매칭합니다.
- 일치하는 skill이 있으면 Codex native slash command가 아니어도 **그 skill을 명시적으로 사용**하세요.
- `workpm`, `pmworker`처럼 slash 없이 쓰는 canonical 이름도 단독 요청이면 explicit invocation으로 처리하세요.

**우선 고정 alias:**
- `/chronos`, `/loop`, `크로노스` → `auto-continue-loop`
- `/zephermine`, `젭마인`, `제퍼마인`, `제퍼미네` → `zephermine`
- `/zeus`, `제우스` → `zeus`
- `/minos`, `미노스`, `/qpassenger` (legacy), `큐패신저` → `minos`
- `/clio`, `클리오`, `/closer` (legacy), `클로저` → `clio`
- `/agent-team`, `/poseidon`, `포세이돈`, `poseidon` → `agent-team-codex`
- `/daedalus`, `다이달로스`, `workpm` → `workpm`
- `/argos`, `아르고스` → `argos`

**동작 방식:**
- 예: 사용자가 `/chronos 인증 버그 고쳐줘`라고 입력하면, 이를 `auto-continue-loop` skill의 명시적 호출로 해석하고 해당 워크플로우를 따릅니다.
- 예: 사용자가 `/seo-audit https://example.com`이라고 입력하면, `seo-audit` skill exact match로 해석합니다.
- 예: 사용자가 `/없는명령어`라고 입력하면, `SKILLS-CATALOG.md`를 확인 후 실제 매칭 skill이 없다고 짧게 설명한 뒤 일반 요청으로 처리합니다.

## 오케스트레이터 모드 자동 해석

Codex에는 Claude의 `UserPromptSubmit` 훅이 없으므로, `orchestrator-detector` 역할은 이 규칙으로 대체합니다.

**핵심 규칙:**
- 사용자 요청에 `zeus`, `/zeus`, `제우스`가 있으면 일반 설명으로 넘기지 말고 즉시 `zeus` skill을 읽고 전자동 파이프라인 모드로 들어갑니다.
- 사용자 요청에 `workpm-mcp`, `/workpm-mcp`가 있으면 즉시 `workpm-mcp` skill을 읽고 MCP-only PM 모드로 들어갑니다.
- 사용자 요청에 `workpm`, `/daedalus`, `다이달로스`가 있으면 즉시 `workpm` skill을 읽고 PM 모드로 들어갑니다.
- 사용자 요청에 `pmworker`가 있으면 즉시 `pmworker` skill을 읽고 Worker 모드로 들어갑니다.
- 사용자 요청에 `agent-team`, `/agent-team`, `/poseidon`, `포세이돈`, `poseidon`이 있으면 즉시 `agent-team-codex` skill을 읽고 팀 리드 모드로 들어갑니다.
- 이런 요청은 일반 질의응답보다 **명시적 모드 전환 요청**으로 우선 해석합니다.

**실행 규칙:**
- 해당 키워드가 감지되면 먼저 관련 `SKILL.md`를 읽고, 그 워크플로우를 시작합니다.
- 모드 진입 전에 장황한 소개 문구를 출력하지 않습니다.
- 같은 턴 안에서 바로 PM/Worker/Zeus/Agent-Team 흐름을 시작해야 합니다.

## Codex 구조적 한계 (사용자에게 솔직하게 안내)

Codex CLI는 `notify` event 1개만 가지므로 다음 동작이 **구조적으로 불가능**합니다:

1. **PreToolUse 차단**: `protect-files`, `check-new-file` 같은 차단형 hook은 **사후 검증**만 가능 (이미 일이 끝난 후). `.env`, `credentials.json` 등 민감 파일을 수정해도 차단되지 않고 경고만.
2. **PostToolUse 관찰**: `save-tool-use` 같은 도구 단위 관찰 로그가 없음 (turn 단위 관찰만 가능).
3. **SessionStart**: 세션 시작 이벤트가 없어 `reconcile-conversations` 자동 호출 불가. 수동 호출만:
   ```bash
   python ~/.codex/scripts/reconcile_codex_conversations.py --days 7
   ```

이 한계는 codex-hook-bridge.js가 turn 끝에 chain 호출로 부분적으로 보완하지만, **실시간 차단은 절대 불가능**합니다. 사용자에게 솔직히 안내하세요.

## 데이터 손실 방지 (mnemo)

Codex의 conversation은 `~/.codex/sessions/.../rollout-*.jsonl`이 source of truth입니다.
- **save-turn hook이 실패해도 rollout JSONL에는 데이터가 살아있음**
- 누락된 turn은 `reconcile_codex_conversations.py`로 backfill 가능 (`sha1(timestamp+role+content[:200])` 기반 멱등)
- conversation cwd는 항상 git root로 정규화 (Visual Studio bin/Debug 같은 sub-directory는 부모 git root로 매핑)

## 과거 대화 검색 규칙

사용자가 과거 작업을 언급하면 (예: "이전에 ~했었지?", "그때 ~ 어떻게 했더라?"),
대화 기록에서 관련 내용을 검색하여 답변에 활용하세요.

**검색 순서 (Progressive Disclosure — 필요한 깊이까지만 읽기):**
1. **인덱스 스캔** (~50 토큰): MEMORY.md 키워드 인덱스에서 관련 파일 특정 (이미 로드됨)
2. **키워드 확장**: 질문에서 핵심 키워드 추출 + **동의어/관련어 확장**
   - 예: "병렬 작업" → `parallel`, `orchestrator`, `pm-worker`, `병렬`, `concurrent`
   - 예: "속도 문제" → `performance`, `speed`, `느림`, `최적화`, `optimization`
   - 한국어 ↔ 영어 양방향 확장 필수
3. **항목 목차 스캔** (~200 토큰): 해당 memory/*.md에서 `### 제목` + `tags:` 줄만 grep
   - `grep -E "^###|^.tags:" memory/architecture.md`
   - 이 단계에서 관련 항목을 특정하면 **해당 항목만** 읽기 (전체 파일 Read 금지)
4. **항목 상세 읽기** (~500 토큰): 특정된 `### 항목`의 전체 내용만 Read (offset/limit 활용)
5. **대화 원본 검색** (필요 시만): conversations/ 검색 (여러 번 grep):
   - `grep -r "#tags:.*키워드1" conversations/`
   - 첫 grep에서 못 찾으면 동의어로 재시도, 최대 3회
6. 매칭된 대화 파일의 해당 섹션(전후 문맥) 읽기

**핵심: 각 단계에서 답을 찾으면 거기서 멈추기. 더 깊이 들어갈 필요 없음.**

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

**부트스트랩 규칙:**
- `MEMORY.md` 또는 `memory/*.md`가 없으면 오류로 끝내지 말고 최소 scaffold를 먼저 생성합니다.
- notify 훅이 첫 저장 턴에서 기본 scaffold를 자동 생성하지만, 그 전에 직접 써야 하면 즉시 만들어 사용합니다.

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

**토큰 비용 힌트 (memory/*.md 파일 크기 표기):**
MEMORY.md 인덱스에 각 카테고리 파일의 대략적 줄 수를 표기하면 불필요한 대용량 파일 읽기를 방지할 수 있습니다:
```markdown
## architecture/ (~45줄)
## patterns/ (~20줄)
```
줄 수가 100줄 이상이면 해당 파일을 통째로 읽지 말고, 항목 목차 스캔(grep)을 먼저 수행하세요.

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
2. **핸드오프 파일 생성** — 공통 프로젝트 핸드오프 디렉터리인 `.claude/handoffs/YYYY-MM-DD-HHMMSS-{slug}.md`에 아래 형식으로 작성:

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
> - 공통 핸드오프 파일: `.claude/handoffs/{파일명}`
> - MEMORY.md 업데이트 완료
> 새 세션을 시작해주세요."

**중요:** 100%에 도달하면 응답 자체가 불가능하므로, **여유 있을 때 미리** 실행하세요.
