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
- ⚠️ **TeamCreate 시 반드시 `mode: "bypassPermissions"` 지정** — 미지정 시 teammate가 파일 쓰기 권한 승인 대기 상태에 빠져 무한 대기
- ⚠️ **SendMessage 시 반드시 `summary` 파라미터 포함** — string message만 보내면 `error: summary is required` 에러 발생

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
5. 전문가 매칭 ([expert-matching.md](references/expert-matching.md) 참조)
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

See [artifacts-review.md](references/artifacts-review.md)

젭마인 산출물을 PM 관점에서 검토합니다. 확인 항목:
1. `plan.md` — 전체 구현 방향 파악
2. `sections/index.md` — SECTION_MANIFEST + 의존성 그래프
3. `flow-diagrams/` — 공정 도면 존재 여부 (없으면 사용자 경고)
4. 보조 문서 (api-spec.md, db-schema.md 등) — teammate 전달 레퍼런스 등록
5. 각 section의 Acceptance Criteria — 마스터 체크리스트로 통합
6. 영향도 분석 (기존 코드가 있는 경우) — 교차 영향 파일 경고

### Step 1: Parse Sections

See [section-parser.md](references/section-parser.md)

`sections/index.md`에서 다음을 추출:
1. **SECTION_MANIFEST** 블록 → 섹션 목록
2. **Dependency Graph** 테이블 → 의존성 관계
3. 각 `section-NN-*.md` 파일의 존재 여부 확인

**프로세스 도면 매핑**: `sections/index.md`에 **Flow Diagram Mapping** 테이블이 있으면 섹션↔도면 노드 매핑을 추출하여 Step 2, Step 4에 반영.

**전문가 매칭**: See [expert-matching.md](references/expert-matching.md) — 각 섹션의 파일 패턴으로 전문가 에이전트 자동 매칭.

### Step 2: Build Wave Plan

의존성 그래프를 위상 정렬(Kahn's Algorithm)하여 Wave 그룹으로 분류:

1. 의존성이 없는 섹션 → Wave 1
2. Wave 1에만 의존하는 섹션 → Wave 2
3. 반복... 순환 의존성 발견 시 경고 후 사용자 보고
4. **Wave당 최대 teammate 수: 5명** — 6개 이상 시 sub-wave 분할

**사용자에게 실행 계획 출력:**

```
═══════════════════════════════════════
대니즈팀(Dannys Team) 실행 계획
═══════════════════════════════════════
Wave 1 (병렬 3개):
  - section-01-foundation [풀스택] (파일: src/core/**)
  - section-02-config [풀스택] (파일: src/config/**)

Wave 2 (병렬 2개):
  - section-04-api [백엔드 전문가] (→ 01, 03 완료 후) 📐 user-auth.mmd
  - section-05-database [DB 전문가] (→ 01, 02 완료 후)

총 섹션: N개 | 총 Wave: M개 | 예상 teammate: K명
═══════════════════════════════════════
```

Wave Plan 출력 후 **확인 없이 바로 Step 3으로 진행** (사용자가 이미 실행 요청한 상태).

### Step 3: Create Tasks

See [teammate-context-template.md](references/teammate-context-template.md)

#### Claude 모드 (TaskCreate)
모든 섹션을 TaskCreate로 등록하고 blockedBy 관계 설정. `description`에 섹션 파일 전체 내용 임베딩.

#### Codex 모드 (spawn_agent)
Wave 단위로 agent spawn. `prompt`에 섹션 파일 전체 내용 + 담당 파일 + 전문가 역할 포함.

**핵심 규칙**: teammate/agent는 lead의 대화 히스토리를 상속하지 않으므로, description/prompt에 섹션 파일 전체 내용을 반드시 임베딩해야 함.

### Step 4: Execute Waves

See [wave-executor.md](references/wave-executor.md)

각 Wave별 실행 사이클:
1. 선행 Task의 blockedBy 해소 여부 확인
2. teammate/agent에게 지시 (담당 파일, 도면 노드, 파일 소유권 규칙 포함)
3. 진행 상황 모니터링 (Claude: TaskList 폴링, Codex: wait 블로킹)
4. 모든 Task completed → 다음 Wave로 진행

**teammate 지시 핵심 요소:**
- 전문가 역할, 섹션 내용, 담당 파일 목록
- 📐 프로세스 도면 경로 + 담당 노드 ID (도면 있는 경우)
- ⚠️ 파일 소유권 규칙 (다른 teammate 파일 수정 금지)
- Activity logging 위치 (`conversations/{YYYY-MM-DD}-team-dannys.md`)

### Step 5: Code Review Gate (자재검사)

각 Wave 완료 후, 다음 Wave 진행 전 코드리뷰 실행.

- Claude: `code-reviewer` 타입 teammate 투입
- Codex: code review용 agent spawn
- 미통과 시 → 수정 지시 → 재리뷰 (최대 2회)

**검수 항목:** 500줄 제한, 보안 취약점, 타입, SRP, DRY

### Step 6: Verify Results — 마스터 체크리스트 대조

See [verification-protocol.md](references/verification-protocol.md)

> **체크리스트가 100% 통과할 때까지 반복한다.**

**검증 루프:**
```
while (마스터 체크리스트 미통과 항목 존재):
  1. 파일 존재 검증 (Files to Create/Modify 전수 확인)
  2. Acceptance Criteria 대조 (코드 존재 여부 확인)
  3. 도면 노드 검증 (flow-diagrams 존재 시)
  4. 파일 소유권 검증

  미통과 → 해당 teammate에 재지시 → 대기 → 재검증 (최대 3회)
  3회 후에도 미통과 → 사용자에게 보고 + 수동 개입 요청
```

### Step 7: Activity Log Summary

모든 Wave 완료 후:
1. `conversations/{YYYY-MM-DD}-team-dannys.md` 읽기
2. teammate별 활동 통계 집계 (기록 수, 에러 수, 파일 수)
3. Orchestrator MCP 사용 시 `orchestrator_get_activity_log`로 JSONL 로그 확인
4. 요약을 Final Report에 포함

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
  ⚠️ section-03-api — 체크 4/5 (테스트 1건 미통과)

Lead 의사결정 로그: conversations/{date}-team-dannys.md
═══════════════════════════════════════
```

실패 섹션 있으면 AskUserQuestion: "실패 섹션 재시도" or "무시하고 완료"

---

## vs orchestrator

| 측면 | agent-team (이 스킬) | orchestrator (기존) |
|------|---------------------|---------------------|
| 설치 | 불필요 (env var / CLI 내장) | MCP 서버 빌드 필요 |
| 지원 CLI | Claude + Codex (네이티브) | Claude + Codex + Gemini (MCP) |
| 파일 충돌 방지 | 소유권 규칙 (soft) | MCP lock_file (hard) |
| 태스크 관리 | Claude: TaskCreate, Codex: spawn_agent | orchestrator MCP 도구 |
| 사용 조건 | zephermine 섹션 또는 자유 모드 | 어떤 계획이든 가능 |

**공존 원칙:** zephermine 섹션 기반 → agent-team 권장 / Gemini 단독 → orchestrator 사용

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
| teammate 무응답 (1분+) | 파일 생성 여부 직접 확인 → 미생성 시 해당 teammate shutdown → `mode: "bypassPermissions"`로 재스폰 |
| teammate/agent 실패 | Claude: Task 로그 확인 → `mode: "bypassPermissions"`로 재스폰 1회, Codex: 재spawn 1회 → 실패 시 사용자 보고 |
| 파일 충돌 감지 | 두 teammate/agent가 같은 파일 수정 → Lead가 merge 또는 사용자에게 보고 |
| 컨텍스트 한도 초과 | 현재 Wave까지 결과 저장 → 사용자에게 새 세션에서 재개 안내 |
| spawn_agent 실패 (Codex) | Codex CLI 설치/권한 확인 → full-auto 모드 권장 → 재시도 |
| agent wait 타임아웃 (Codex) | close_agent 후 재spawn → 섹션 범위 축소 고려 |
| 2회 재시도 후에도 실패 | 해당 섹션을 Lead가 직접 구현 (subagent 위임) 또는 사용자에게 보고 |

## Team Cleanup (필수)

**모든 Wave 완료 후 또는 중단 시 반드시 실행:**

```
1. TeamDelete 호출 → 팀 리소스 해제
2. 좀비 teammate 방지 (idle 상태로 context 점유 차단)
```

⚠️ **중단/실패 시에도 TeamDelete 필수** — 에러로 중단되더라도 팀 정리를 반드시 수행합니다.
rm -rf 같은 수동 정리에 의존하지 마세요.

---

## 다음 단계 안내

```
✅ 에이전트팀 구현 완료!

📊 결과: {통과/실패 요약}

👉 다음 단계 (선택):
  /qpassenger          → Playwright 자동 테스트 + Healer 루프
  /review              → 코드 리뷰 (품질/보안/성능)
  /commit              → 변경사항 커밋

📎 참고: docs/workflow-guide.md
```

---

## References

| 파일 | 내용 |
|------|------|
| [artifacts-review.md](references/artifacts-review.md) | Step 0 산출물 검토 상세 절차, 영향도 분석, 보조 문서 매핑 |
| [section-parser.md](references/section-parser.md) | SECTION_MANIFEST 파싱 규칙, 도면 매핑 추출 |
| [expert-matching.md](references/expert-matching.md) | 섹션 파일 패턴 → 전문가 에이전트 매칭 |
| [wave-executor.md](references/wave-executor.md) | Wave 실행 사이클, teammate 지시 형식, 모니터링 루프, Codex agent 형식 |
| [teammate-context-template.md](references/teammate-context-template.md) | teammate/agent 프롬프트 전체 템플릿 |
| [verification-protocol.md](references/verification-protocol.md) | 검증 5단계, 재시도 프로세스, 통과 기준 |
