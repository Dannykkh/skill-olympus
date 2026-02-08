---
name: agent-team
description: zephermine 섹션 기반 Agent Teams 오케스트레이션. 의존성 분석, 웨이브 그룹핑, teammate 자동 구성, 병렬 실행. 네이티브 Agent Teams(Opus 4.6) 활용.
triggers:
  - "agent-team"
  - "팀 실행"
  - "agent team"
auto_apply: false
---

# Agent Team — Zephermine 섹션 병렬 실행

> **실험적 기능**: Claude Code Agent Teams (Research Preview) 기반.
> `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 환경변수가 필요합니다.

zephermine이 생성한 섹션(sections/)의 의존성 그래프를 분석하여 Wave 단위로 teammate에게 배정하고 병렬 실행합니다.

## Prerequisites

- Agent Teams 활성화: `settings.json`에 `"env": {"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"}`
- `"teammateMode": "in-process"` 또는 `"tmux"` 설정
- zephermine 계획 산출물 (sections/index.md + section-NN-*.md 파일들)

## Team Name

팀 이름은 **대니즈팀(Dannys Team)**으로 고정합니다.
teammate 생성 시 이 팀명을 사용하세요.

## CRITICAL: First Actions

### 1. Print Intro

```
Agent Team 시작
순서: Parse Sections → Build Wave Plan → Create Tasks → Execute Waves → Verify → Report
```

### 2. Resolve Planning Directory

**$ARGUMENTS가 제공된 경우:** 해당 경로를 planning_dir로 사용

**$ARGUMENTS가 없는 경우:** 자동 탐색
1. `docs/plan/*/sections/index.md` 패턴으로 Glob 검색
2. 여러 개 발견 시 AskUserQuestion으로 선택
3. 발견 못하면 사용자에게 경로 질문

### 3. Validate Prerequisites

1. `sections/index.md` 존재 확인
2. `SECTION_MANIFEST` 블록 파싱 확인
3. 최소 1개 이상 `section-NN-*.md` 파일 존재 확인

실패 시 중단:
```
❌ 필수 파일이 없습니다.
먼저 /zephermine으로 계획을 생성하세요.
```

---

## Workflow

### Step 1: Parse Sections

See [section-parser.md](references/section-parser.md)

`sections/index.md`에서 다음을 추출:

1. **SECTION_MANIFEST** 블록 → 섹션 목록
2. **Dependency Graph** 테이블 → 의존성 관계
3. 각 `section-NN-*.md` 파일의 존재 여부 확인

**출력:** 섹션 목록 + 의존성 맵 + 파일 소유권(각 섹션의 "Files to Create/Modify")

### Step 2: Build Wave Plan

의존성 그래프를 위상 정렬(Kahn's Algorithm)하여 Wave 그룹으로 분류:

**알고리즘:**
1. 의존성이 없는 섹션 → Wave 1
2. Wave 1에만 의존하는 섹션 → Wave 2
3. 반복... 모든 섹션이 Wave에 배정될 때까지
4. 순환 의존성 발견 시 경고 후 사용자에게 보고

**Wave당 최대 teammate 수: 5명** (공식 권장: 3-5명)
- Wave에 6개 이상 섹션이 있으면 5개씩 나눠서 sub-wave로 분할

**사용자에게 실행 계획 출력:**

```
═══════════════════════════════════════
Agent Team 실행 계획
═══════════════════════════════════════
Wave 1 (병렬 3개):
  - section-01-foundation (파일: src/core/**)
  - section-02-config (파일: src/config/**)
  - section-03-types (파일: src/types/**)

Wave 2 (병렬 2개):
  - section-04-api (→ 01, 03 완료 후) (파일: src/api/**)
  - section-05-database (→ 01, 02 완료 후) (파일: src/db/**)

Wave 3 (순차 1개):
  - section-06-integration (→ 04, 05 완료 후)

총 섹션: 6개 | 총 Wave: 3개 | 예상 teammate: 6명
═══════════════════════════════════════
```

AskUserQuestion으로 확인:
- "실행" — 바로 실행
- "수정" — Wave 계획 변경 후 재출력
- "취소" — 중단

### Step 3: Create Tasks

모든 섹션을 TaskCreate로 등록하고 blockedBy 관계를 설정:

```
# Wave 1 (blockedBy 없음)
TaskCreate({
  subject: "Section 01: Foundation",
  description: "[section-01 파일 전체 내용 임베딩]",
  activeForm: "Section 01 구현 중"
})

# Wave 2 (blockedBy 설정)
TaskCreate({
  subject: "Section 04: API",
  description: "[section-04 파일 전체 내용 임베딩]",
  activeForm: "Section 04 구현 중"
})
TaskUpdate({ taskId: "4", addBlockedBy: ["1", "3"] })
```

**핵심 규칙:**
- teammate는 lead의 대화 히스토리를 상속하지 않음
- 따라서 `description`에 섹션 파일 전체 내용을 임베딩해야 함
- 파일 소유권(Files to Create/Modify)도 description에 포함

### Step 4: Execute Waves

See [wave-executor.md](references/wave-executor.md)

```
for each wave:
  1. Wave에 속한 Task들의 blockedBy가 모두 해소되었는지 확인
  2. 각 Task에 대해 teammate에게 자연어로 지시
  3. teammate에게 전달할 컨텍스트 구성 (→ teammate-context-template.md 참조)
  4. TaskList 폴링으로 진행 상황 모니터링
  5. 모든 Task completed → 다음 Wave로 진행
```

**teammate 지시 형식:**

```
"Section NN: {name}을 구현해줘.
Task #{taskId}를 확인해서 상세 내용을 읽고,
구현 완료 후 TaskUpdate로 completed 처리해.
담당 파일: {file_list}
⚠️ 다른 teammate의 파일은 절대 수정하지 마."
```

**모니터링:**
- 30초~1분 간격으로 TaskList 확인
- 실패한 Task 발견 시: 로그 확인 → 재시도 또는 사용자에게 보고
- 모든 Task completed 시 다음 Wave 진행

**Delegate 모드 권장:**
- Lead(나)는 Shift+Tab으로 Delegate 모드 진입
- 코드 작성은 teammate에게만 위임
- Lead는 조율과 모니터링에만 집중

### Step 5: Verify Results

See [verification-protocol.md](references/verification-protocol.md)

모든 Wave 완료 후 검증:

1. **파일 존재 검증**: 각 섹션의 "Files to Create/Modify"에 명시된 파일이 실제로 존재하는지
2. **Acceptance Criteria 검증**: 각 섹션의 체크리스트 항목 확인
3. **파일 소유권 검증**: 다른 teammate가 수정하면 안 되는 파일을 수정했는지

검증 실패 시:
- 해당 섹션의 Task를 다시 생성
- 실패 원인을 description에 포함하여 재실행

### Step 6: Final Report

```
═══════════════════════════════════════
Agent Team: 실행 완료
═══════════════════════════════════════

✅ 성공: N개 섹션
❌ 실패: N개 섹션 (있는 경우)
⏱️ 총 Wave: N개

섹션별 결과:
  ✅ section-01-foundation — 파일 3개 생성
  ✅ section-02-config — 파일 2개 생성
  ✅ section-03-types — 파일 4개 생성
  ✅ section-04-api — 파일 5개 생성
  ✅ section-05-database — 파일 3개 생성
  ✅ section-06-integration — 파일 2개 생성

다음 단계:
  - /zephermine @spec.md 로 구현 검증 (Option D)
  - git diff로 변경사항 확인
═══════════════════════════════════════
```

실패 섹션이 있으면 AskUserQuestion:
- "실패 섹션 재시도" — 해당 섹션만 다시 실행
- "무시하고 완료" — 현재 상태로 종료

---

## vs orchestrator

| 측면 | agent-team (이 스킬) | orchestrator (기존) |
|------|---------------------|---------------------|
| 설치 | 불필요 (env var만) | MCP 서버 빌드 필요 |
| 외부 AI | Claude만 | Claude + Codex + Gemini |
| 파일 충돌 방지 | 소유권 규칙 (soft) | MCP lock_file (hard) |
| 태스크 관리 | TaskCreate/Update (네이티브) | orchestrator MCP 도구 |
| Plan approval | 네이티브 지원 | 미지원 |
| 사용 조건 | zephermine 섹션 필요 | 어떤 계획이든 가능 |
| 팀원 간 대화 | 지원 (mailbox) | 미지원 |

**공존 원칙:**
- zephermine 섹션 기반 → agent-team 권장
- 외부 AI(Codex, Gemini) 필요 → orchestrator 사용
- 기존 orchestrator는 fallback으로 유지

---

## Logging Format

```
═══════════════════════════════════════════════════════════════
STEP {N}/6: {STEP_NAME}
═══════════════════════════════════════════════════════════════
{details}
Step {N} complete: {summary}
───────────────────────────────────────────────────────────────
```

## Error Handling

| 상황 | 대응 |
|------|------|
| SECTION_MANIFEST 파싱 실패 | 사용자에게 index.md 형식 확인 요청 |
| 순환 의존성 발견 | 경고 출력 + 관련 섹션 목록 표시 |
| teammate 실패/타임아웃 | 해당 Task 로그 확인 → 재시도 1회 → 실패 시 사용자 보고 |
| 파일 충돌 감지 | 두 teammate가 같은 파일 수정 → Lead가 merge 또는 사용자에게 보고 |
| 컨텍스트 한도 초과 | 현재 Wave까지 결과 저장 → 사용자에게 새 세션에서 재개 안내 |
