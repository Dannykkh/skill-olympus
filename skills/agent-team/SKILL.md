---
name: agent-team
description: zephermine 섹션 기반 Agent Teams 오케스트레이션. 의존성 분석, 웨이브 그룹핑, teammate 자동 구성, 병렬 실행. Claude Agent Teams + Codex spawn_agent 지원. /agent-team으로 실행. 대니즈팀.
triggers:
  - "agent-team"
  - "대니즈팀"
  - "dannys team"
  - "팀 실행"
  - "agent team"
auto_apply: false
---

# Agent Team — Zephermine 섹션 병렬 실행

> **대니즈팀(Dannys Team)**: 젭마인 산출물을 받아 체계적으로 구현합니다.

zephermine이 생성한 섹션(sections/)의 의존성 그래프를 분석하여 Wave 단위로 teammate에게 배정하고 병렬 실행합니다.

## 다이달로스 vs 대니즈팀

| 상황 | 사용할 도구 |
|------|-----------|
| **젭마인 없이** 바로 구현 시작 | **다이달로스** (`/daedalus`) — 직접 리서치 → 제안 → 구현 |
| **젭마인 산출물**(sections/) 기반 구현 | **대니즈팀** (`/agent-team`) — 섹션 파싱 → Wave → 구현 |

## Lead(PM) 핵심 원칙

> 다이달로스의 PM 철학을 대니즈팀 Lead에도 적용합니다.

### 1. 작업 외주화 — Lead는 코딩하지 않는다

Lead의 기억 공간이 전체 작전을 기억하는 **유일한 곳**이다.
코드까지 짜면 기억이 순식간에 꽉 찬다.
**Lead는 전략만. 코딩/리서치는 전부 teammate에게.**

### 2. 기억 외부화 — 기억력을 믿지 마라

대화가 길어지면 오래된 내용이 자동 압축된다.
**중요한 결정이 나올 때마다 activity log에 즉시 기록한다.**

### 3. 체크리스트 완수 — 모든 Acceptance Criteria가 통과할 때까지 끝이 아니다

젭마인 산출물에는 섹션별 **Acceptance Criteria**(체크리스트)와 **flow-diagrams**(공정 도면)이 있다.
teammate가 "완료"라고 보고해도 Lead가 직접 체크리스트를 대조하여 **모든 항목이 통과할 때까지 반복**한다.
한 번 구현하고 끝내는 것은 PM이 아니라 실행자다.

### Lead 운영 규율

**Lead가 직접 하는 것:**
- 젭마인 산출물 검토 (plan, sections, flow-diagrams, acceptance criteria)
- teammate 보고 수신 및 체크리스트 대조
- 의사결정 + activity log 기록
- teammate 배정/교체
- 미통과 항목 → teammate에게 재지시

**Lead가 절대 안 하는 것:**
- ❌ 코드 작성, 파일 수정
- ❌ 리서치, 코드베이스 탐색
- ❌ 테스트 실행
- (teammate에게 시킬 수 있으면 무조건 시킴)

**자기검증 3질문** — Wave 완료 보고 시 반드시 자문:
1. 가장 어려운 결정이 뭐였나?
2. Acceptance Criteria 중 위험한 항목은?
3. 도면과 실제 구현이 일치하는가?

### 팀원 관리 원칙

| 규칙 | 설명 |
|------|------|
| **파일 영역 분리** | 같은 파일을 두 teammate가 동시에 수정 금지 |
| **idle 방치** | teammate idle 알림이 와도 task 진행 중이면 절대 개입 안 함 |
| **교체 정책** | 다음 Wave가 이전 작업과 무관하면 → 새 teammate. 연장선이면 유지 |
| **이름 규칙** | 교체 시 같은 이름 재사용 불가 |

---

## CLI별 실행 모드

| CLI | 실행 방식 | 도구 |
|-----|----------|------|
| **Claude** | Agent Teams (네이티브) | `TeamCreate` / `SendMessage` / `TaskCreate` / `TaskUpdate` |
| **Codex** | spawn_agent (네이티브) | `spawn_agent` / `send_message` / `wait` / `close_agent` |
| **Gemini** | orchestrator MCP 폴백 | `workpm-mcp` (동적 에이전트 생성 미지원) |

### CLI 감지 방법

Phase 0 시작 시 자동 판별:
- `TeamCreate` 도구 사용 가능 → **Claude 모드**
- `spawn_agent` 도구 사용 가능 → **Codex 모드**
- 둘 다 없음 → 사용자에게 `workpm-mcp` (orchestrator) 안내

## Prerequisites

### Claude 모드
- Agent Teams 활성화: `settings.json`에 `"env": {"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"}`
- `"teammateMode": "in-process"` 또는 `"tmux"` 설정

### Codex 모드
- Codex CLI 설치 (`codex` 명령어 사용 가능)
- full-auto 모드 권장 (`codex --approval-mode full-auto`)

### 공통
- zephermine 계획 산출물 (sections/index.md + section-NN-*.md 파일들)

## Team Name

팀 이름은 **대니즈팀(Dannys Team)**으로 고정합니다.
teammate 생성 시 이 팀명을 사용하세요.

**공식 호출명:** `/agent-team` (별칭: `대니즈팀`, `Dannys Team`)

## CRITICAL: First Actions

### 1. Print Intro

```
대니즈팀(Dannys Team) 시작
```

모드 판별 후 표시:
```
[섹션 모드] 순서: 산출물 검토 → Parse → Wave Plan → Tasks → Execute → Review → Verify(반복) → Report
[자유 모드] 순서: Analyze → Wave Plan → Tasks → Execute → Review → Verify(반복) → Report
```

### 2. Determine Mode

**두 가지 모드를 자동 판별:**

#### 섹션 모드 (zephermine 산출물 있음)
- `$ARGUMENTS`로 planning_dir가 제공되었거나
- `docs/plan/*/sections/index.md`가 존재하면
- → **섹션 모드**로 진행 (기존 6단계 워크플로우)

#### 자유 모드 (사용자 지시만 있음)
- planning_dir이 없고, sections/index.md도 없으면
- 사용자의 대화 컨텍스트에서 작업 지시를 추출
- → **자유 모드**로 진행 (Lead가 직접 분석 → 분배)

```
섹션 모드: "agent-team docs/plan/my-feature" → sections/ 파싱 → Wave 실행
자유 모드: "이 3개 파일 리팩토링해줘. 에이전트팀 진행하자" → Lead가 분석 → 분배
```

### 3. Setup (모드별 분기)

#### 섹션 모드 Setup
1. `sections/index.md` 존재 확인
2. `SECTION_MANIFEST` 블록 파싱 확인
3. 최소 1개 이상 `section-NN-*.md` 파일 존재 확인
4. → **Step 1 (Parse Sections)**로 진행

#### 자유 모드 Setup
1. 사용자 지시에서 작업 목표 추출
2. 관련 코드베이스 탐색 (Glob, Grep, Read)
3. 작업을 독립적인 태스크로 분해 (파일/모듈/기능 단위)
4. 각 태스크의 의존성 판별 → Wave 그룹핑
5. 전문가 매칭 (expert-matching.md 참조)
6. **Step 2 (Build Wave Plan)**의 사용자 확인 출력으로 합류

**자유 모드 태스크 분해 원칙:**
- 파일 충돌 없도록 담당 파일을 명확히 분리
- 태스크당 1~5개 파일 범위
- 의존성이 없으면 모두 Wave 1에 배치 (최대 병렬)
- description에 구현 지시 + 담당 파일 + 관련 코드 컨텍스트 포함

---

## Workflow

### Step 0: 산출물 검토 (PM 게이트)

> **Lead는 설계 도면을 확인하지 않고 공사를 시작하지 않는다.**

젭마인 산출물을 PM 관점에서 검토합니다. teammate에게 넘기기 전에 Lead가 직접 확인.

**필수 확인 항목 (planning_dir 기준):**

1. **plan.md** 읽기 — 전체 구현 방향 파악
2. **sections/index.md** — SECTION_MANIFEST + 의존성 그래프 확인
3. **flow-diagrams/** — 공정 도면 존재 여부 확인
   - ✅ 있으면 → `flow-diagrams/index.md` 읽어서 섹션↔도면 매핑 확인
   - ❌ 없으면 → 사용자에게 경고: "젭마인 Step 16에서 도면이 생성되지 않았습니다. 도면 없이 진행하시겠습니까?"
4. **보조 문서 존재 확인** — 있으면 teammate에게 전달할 레퍼런스로 등록:
   - `api-spec.md` — API 엔드포인트 계약서 → API/백엔드 섹션 teammate에게 전달
   - `db-schema.md` — ERD + DDL → 데이터베이스 섹션 teammate에게 전달
   - `design-system.md` — 디자인 토큰/규칙 → 프론트엔드 섹션 teammate에게 전달
   - `spec.md` — 요구사항 원본 → 모호한 부분 참조용으로 Lead가 보유
   - `operation-scenarios.md` — 운영 시나리오 → 통합/E2E 섹션 teammate에게 전달
   - `qa-scenarios.md` — 테스트 케이스 → 테스트 작성 시 teammate에게 전달
5. **각 section-NN-*.md의 Acceptance Criteria** — 전체 체크리스트 수집
   - 모든 섹션의 Acceptance Criteria를 하나의 마스터 체크리스트로 통합
   - 이 체크리스트가 **최종 완료 기준**이 됨

**보조 문서 → teammate 매핑:**

| 보조 문서 | 전달 대상 | 전달 방법 |
|----------|----------|----------|
| `api-spec.md` | API/백엔드 담당 teammate | description에 경로 + "Read로 읽어서 참조해" |
| `db-schema.md` | 데이터베이스 담당 teammate | description에 경로 + "Read로 읽어서 참조해" |
| `design-system.md` | 프론트엔드 담당 teammate | description에 경로 + "Read로 읽어서 참조해" |
| `operation-scenarios.md` | 통합/E2E 담당 teammate | description에 경로 전달 |
| `qa-scenarios.md` | 테스트 작성 담당 teammate | description에 경로 전달 |

> **전체 내용 임베딩 X** — teammate가 필요할 때 Read로 직접 읽도록 경로만 전달 (컨텍스트 절약)

**마스터 체크리스트 구성:**

```
═══════════════════════════════════════
마스터 체크리스트 (N개 섹션, 총 M개 항목)
═══════════════════════════════════════
section-01-foundation:
  [ ] BaseModule 클래스가 init()과 destroy() 메서드를 가짐
  [ ] AppConfig 인터페이스가 필수 필드를 정의함
  [ ] 단위 테스트가 존재함

section-02-api:
  [ ] POST /api/auth/login 엔드포인트 동작
  [ ] JWT 토큰 발급 및 검증
  ...
═══════════════════════════════════════
```

**Activity Log 기록:**
```
orchestrator_log_activity 또는 conversations/ 기록:
type: "milestone"
message: "산출물 검토 완료. 섹션 N개, 체크리스트 M개, 도면 K개 확인"
```

### Step 1: Parse Sections

See [section-parser.md](references/section-parser.md)

`sections/index.md`에서 다음을 추출:

1. **SECTION_MANIFEST** 블록 → 섹션 목록
2. **Dependency Graph** 테이블 → 의존성 관계
3. 각 `section-NN-*.md` 파일의 존재 여부 확인

**출력:** 섹션 목록 + 의존성 맵 + 파일 소유권(각 섹션의 "Files to Create/Modify")

#### 프로세스 도면 매핑

`sections/index.md`에 **Flow Diagram Mapping** 테이블이 있으면:
1. 각 섹션이 담당하는 `flow-diagrams/*.mmd` 파일과 노드 ID를 추출
2. 이 매핑을 Step 2 Wave Plan 출력과 Step 4 teammate 지시에 포함
3. `<planning_dir>/flow-diagrams/` 디렉토리 존재 여부 확인

**도면이 있으면:** teammate에게 담당 노드 구현을 지시 (분기 완전성 포함)
**도면이 없으면:** 기존 방식대로 섹션 파일만으로 진행

#### 전문가 매칭

See [expert-matching.md](references/expert-matching.md)

각 섹션의 파일 패턴을 분석하여 전문가 에이전트를 자동 매칭:

```
section-01-foundation → fullstack-coding-standards (타입/모델)
section-02-ui         → frontend-react (tsx 파일 다수)
section-03-api        → backend-spring (api/controllers)
section-04-database   → database-postgresql (migrations/sql)
```

매칭 결과를 Step 2 출력과 Step 4 teammate 지시에 반영.

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
대니즈팀(Dannys Team) 실행 계획
═══════════════════════════════════════
Wave 1 (병렬 3개):
  - section-01-foundation [풀스택] (파일: src/core/**)
  - section-02-config [풀스택] (파일: src/config/**)
  - section-03-types [풀스택] (파일: src/types/**)

Wave 2 (병렬 2개):
  - section-04-api [백엔드 전문가] (→ 01, 03 완료 후) (파일: src/api/**) 📐 user-auth.mmd [Validate→CheckPwd]
  - section-05-database [DB 전문가] (→ 01, 02 완료 후) (파일: src/db/**)

Wave 3 (순차 1개):
  - section-06-integration [풀스택] (→ 04, 05 완료 후)

총 섹션: 6개 | 총 Wave: 3개 | 예상 teammate: 6명
═══════════════════════════════════════
```

AskUserQuestion으로 확인:
- "실행" — 바로 실행
- "수정" — Wave 계획 변경 후 재출력
- "취소" — 중단

### Step 3: Create Tasks

#### Claude 모드 (TaskCreate)

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

#### Codex 모드 (spawn_agent)

Wave 단위로 agent를 spawn합니다. Codex는 Task 시스템이 없으므로 agent 자체가 태스크:

```
# Wave 1 — 각 섹션마다 agent spawn
agent_01 = spawn_agent({
  prompt: "너는 대니즈팀의 풀스택 담당이야.\n\n[section-01 파일 전체 내용]\n\n담당 파일: src/core/**\n⚠️ 다른 파일은 절대 수정하지 마.\n완료 후 결과를 요약해서 보고해."
})

agent_02 = spawn_agent({
  prompt: "너는 대니즈팀의 풀스택 담당이야.\n\n[section-02 파일 전체 내용]\n\n담당 파일: src/config/**\n⚠️ 다른 파일은 절대 수정하지 마.\n완료 후 결과를 요약해서 보고해."
})
```

#### 공통 핵심 규칙
- teammate/agent는 lead의 대화 히스토리를 상속하지 않음
- 따라서 `description`/`prompt`에 섹션 파일 전체 내용을 임베딩해야 함
- 파일 소유권(Files to Create/Modify)도 포함

### Step 4: Execute Waves

See [wave-executor.md](references/wave-executor.md)

#### Claude 모드 (TeamCreate + TaskList 폴링)

```
for each wave:
  1. Wave에 속한 Task들의 blockedBy가 모두 해소되었는지 확인
  2. 각 Task에 대해 teammate에게 자연어로 지시
  3. teammate에게 전달할 컨텍스트 구성 (→ teammate-context-template.md 참조)
  4. teammate에게 Activity Logging 규칙 전달:
     - conversations/{YYYY-MM-DD}-team-dannys.md에 작업 과정 기록
     - 시작/결정/에러/파일변경/완료 5개 시점에 기록
  5. TaskList 폴링으로 진행 상황 모니터링
  6. 모든 Task completed → 다음 Wave로 진행
```

**teammate 지시 형식:**

```
"너는 대니즈팀의 **{전문가 역할}** 담당이야.
agents/{agent-file}.md의 규칙을 참조해서 작업해.

Section NN: {name}을 구현해줘.
Task #{taskId}를 TaskGet으로 읽어서 상세 내용을 확인해.
구현 완료 후 TaskUpdate로 completed 처리해.

담당 파일: {file_list}
⚠️ 다른 teammate의 파일은 절대 수정하지 마.

📐 프로세스 도면: {diagram_path} (노드: {node_ids})
  - 해당 .mmd 파일을 Read로 읽고, 담당 노드의 로직을 구현해.
  - 분기(decision) 노드는 모든 경로(Yes/No/에러)를 빠짐없이 구현해."
```

**모니터링:**
- 30초~1분 간격으로 TaskList 확인
- 실패한 Task 발견 시: 로그 확인 → 재시도 또는 사용자에게 보고
- 모든 Task completed 시 다음 Wave 진행

**Delegate 모드 권장:**
- Lead(나)는 Shift+Tab으로 Delegate 모드 진입
- 코드 작성은 teammate에게만 위임
- Lead는 조율과 모니터링에만 집중

#### Codex 모드 (spawn_agent + wait)

```
for each wave:
  1. 이전 Wave의 모든 agent가 완료되었는지 확인
  2. Wave에 속한 각 섹션마다 spawn_agent 호출
  3. 모든 agent에 send_message로 시작 신호 (prompt에 포함된 경우 생략 가능)
  4. wait로 각 agent 완료 대기
  5. 완료된 agent의 결과를 수집
  6. close_agent로 리소스 해제
  7. 다음 Wave에 선행 결과를 전달
```

**agent 생성 + 실행:**

```
# Wave 1 — 병렬 spawn
agents = []
for section in wave.sections:
  agent = spawn_agent({
    prompt: build_section_prompt(section)  # 섹션 내용 + 파일 소유권 + 전문가 역할
  })
  agents.append(agent)

# Wave 1 — 모든 agent 완료 대기
results = []
for agent in agents:
  result = wait(agent)        # agent 작업 완료까지 대기
  results.append(result)
  close_agent(agent)          # 리소스 해제

# Wave 2 — 선행 결과 포함하여 spawn
for section in wave2.sections:
  predecessor_results = get_results_for_deps(section, results)
  agent = spawn_agent({
    prompt: build_section_prompt(section) + "\n\n## 선행 작업 결과\n" + predecessor_results
  })
```

**Codex agent prompt 형식:**

```
"너는 대니즈팀의 **{전문가 역할}** 담당이야.
agents/{agent-file}.md의 규칙을 참조해서 작업해.

Section NN: {name}을 구현해줘.
아래 섹션 내용을 읽고 구현해:

{section 파일 전체 내용}

담당 파일: {file_list}
⚠️ 다른 agent의 파일은 절대 수정하지 마.

📐 프로세스 도면: {diagram_path} (노드: {node_ids})
  - 해당 .mmd 파일을 Read로 읽고, 담당 노드의 로직을 구현해.
  - 분기(decision) 노드는 모든 경로(Yes/No/에러)를 빠짐없이 구현해.

완료 후 생성/수정한 파일 목록과 구현 요약을 보고해."
```

**모니터링:**
- `wait`이 블로킹이므로 agent 완료 시 자동 진행
- agent가 에러를 반환하면: 에러 로그 확인 → 1회 재spawn → 실패 시 사용자 보고

### Step 5: Code Review Gate (자재검사)

각 Wave 완료 후, 다음 Wave 진행 전 코드리뷰를 실행합니다.

#### Claude 모드
- `code-reviewer` 타입 teammate 1명을 투입
- 완료된 Wave의 구현 결과물을 `skills/code-reviewer/SKILL.md` 기준으로 검수
- 미통과 시 → 해당 구현 teammate에게 수정 지시 → 재리뷰 (최대 2회)

#### Codex 모드
- code review용 agent를 spawn하여 검수
- 미통과 시 → 수정 agent 재spawn → 재리뷰 (최대 2회)

**검수 항목:** 500줄 제한, 보안 취약점, 타입, SRP, DRY
**통과 후:** 다음 Wave 또는 Step 6로 진행

### Step 6: Verify Results — 마스터 체크리스트 대조

See [verification-protocol.md](references/verification-protocol.md)

> **체크리스트가 100% 통과할 때까지 이 Step을 반복한다.**

모든 Wave 완료 + 자재검사 통과 후, **Lead가 직접** 마스터 체크리스트를 대조합니다.

**검증 루프:**

```
while (마스터 체크리스트 미통과 항목 존재):
  1. 파일 존재 검증 — Files to Create/Modify 전수 확인
  2. Acceptance Criteria 대조 — Step 0에서 수집한 마스터 체크리스트 항목별 확인
     - 파일 Read/Grep으로 코드 존재 여부 확인
     - 통과 → [x], 미통과 → [ ] + 원인 기록
  3. 도면 노드 검증 — flow-diagrams 존재 시 노드별 코드 대조
  4. 파일 소유권 검증 — 교차 수정 감지

  미통과 항목이 있으면:
    → 해당 섹션 teammate에게 재지시 (미통과 사유 + 구체적 요구사항 포함)
    → teammate 작업 완료 대기
    → 다시 검증 루프 시작 (최대 3회)

  3회 반복 후에도 미통과:
    → 사용자에게 보고 + 수동 개입 요청
```

**마스터 체크리스트 업데이트:**

```
═══════════════════════════════════════
마스터 체크리스트 (검증 결과)
═══════════════════════════════════════
section-01-foundation:
  [x] BaseModule 클래스가 init()과 destroy() 메서드를 가짐
  [x] AppConfig 인터페이스가 필수 필드를 정의함
  [ ] 단위 테스트가 존재함 ← 미통과 (재지시 필요)

section-02-api:
  [x] POST /api/auth/login 엔드포인트 동작
  [x] JWT 토큰 발급 및 검증

통과율: 85% (17/20) — 미통과 3개 → 재지시 진행
═══════════════════════════════════════
```

**Activity Log 기록:**
```
type: "decision"
message: "검증 1회차: 17/20 통과. section-01 테스트 누락 → teammate에 재지시"
```

### Step 7: Activity Log Summary

모든 Wave 완료 후, Verify 전에 활동 로그를 요약합니다:

1. `conversations/{YYYY-MM-DD}-team-dannys.md` 파일 읽기
2. teammate별 활동 통계 집계:
   - 기록 수, 에러 수, 생성/수정 파일 수
3. Orchestrator MCP 사용 시 `orchestrator_get_activity_log`로 JSONL 로그도 확인
4. 요약을 Final Report에 포함

```
═══════════════════════════════════════
STEP 7/9: ACTIVITY LOG SUMMARY
═══════════════════════════════════════
teammate-1 (section-01): 기록 5건, 에러 0건, 파일 3개
teammate-2 (section-02): 기록 4건, 에러 1건 (해결됨), 파일 2개
...
Activity log: conversations/2026-02-18-team-dannys.md
───────────────────────────────────────────────────────
```

### Step 8: Final Report

```
═══════════════════════════════════════
대니즈팀: 실행 완료
═══════════════════════════════════════

📋 마스터 체크리스트: M/N 통과 (XX%)
📐 도면 매칭: K개 노드 중 J개 구현 (YY%)
⏱️ 총 Wave: W개 | 검증 루프: R회

섹션별 결과:
  ✅ section-01-foundation — 체크 3/3, 파일 3개
  ✅ section-02-config — 체크 2/2, 파일 2개
  ⚠️ section-03-api — 체크 4/5, 파일 5개 (테스트 1건 미통과)
  ...

Lead 의사결정 로그: conversations/{date}-team-dannys.md
═══════════════════════════════════════
```

실패 섹션이 있으면 AskUserQuestion:
- "실패 섹션 재시도" — 해당 섹션만 다시 실행
- "무시하고 완료" — 현재 상태로 종료

---

## vs orchestrator

| 측면 | agent-team (이 스킬) | orchestrator (기존) |
|------|---------------------|---------------------|
| 설치 | 불필요 (env var / CLI 내장) | MCP 서버 빌드 필요 |
| 지원 CLI | Claude + Codex (네이티브) | Claude + Codex + Gemini (MCP) |
| 파일 충돌 방지 | 소유권 규칙 (soft) | MCP lock_file (hard) |
| 태스크 관리 | Claude: TaskCreate, Codex: spawn_agent | orchestrator MCP 도구 |
| Plan approval | 네이티브 지원 (Claude) | 미지원 |
| 사용 조건 | zephermine 섹션 또는 자유 모드 | 어떤 계획이든 가능 |
| 팀원 간 대화 | Claude: mailbox, Codex: send_message | 미지원 |
| 검증 루프 | 각 teammate/agent 내부 | pmworker 내장 (3회 룰) |

**공존 원칙:**
- zephermine 섹션 기반 → agent-team 권장
- Gemini 단독 실행 필요 → orchestrator 사용
- 기존 orchestrator는 Gemini 폴백 + 고급 파일 락 필요 시 유지

---

## Logging Format

```
═══════════════════════════════════════════════════════════════
STEP {N}/9: {STEP_NAME}
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
| teammate/agent 실패 | Claude: Task 로그 확인 → 재시도 1회, Codex: 재spawn 1회 → 실패 시 사용자 보고 |
| 파일 충돌 감지 | 두 teammate/agent가 같은 파일 수정 → Lead가 merge 또는 사용자에게 보고 |
| 컨텍스트 한도 초과 | 현재 Wave까지 결과 저장 → 사용자에게 새 세션에서 재개 안내 |
| spawn_agent 실패 (Codex) | Codex CLI 설치/권한 확인 → full-auto 모드 권장 → 재시도 |
| agent wait 타임아웃 (Codex) | close_agent 후 재spawn → 섹션 범위 축소 고려 |

---

## 다음 단계 안내

구현이 완료되면 사용자에게 다음 단계를 안내합니다:

```
✅ 에이전트팀 구현 완료!

📊 결과: {통과/실패 요약}

👉 다음 단계 (선택):
  /qpassenger          → Playwright 자동 테스트 + Healer 루프
  /review              → 코드 리뷰 (품질/보안/성능)
  /commit              → 변경사항 커밋

📎 참고: docs/workflow-guide.md
```
