---
name: agent-team-codex
description: Codex CLI의 multi_agent 기능으로 default/explorer/worker 및 사용자 정의 에이전트를 조합해 병렬 구현을 실행합니다. zephermine 섹션 모드와 자유 모드를 지원합니다.
triggers:
  - "agent-team-codex"
  - "코덱스 에이전트팀"
  - "codex agent team"
  - "멀티 에이전트"
auto_apply: false
---

# Agent Team Codex

Codex CLI의 실험 기능 `multi_agent`를 사용해 작업을 병렬 분배하는 운영 스킬입니다.
Claude 전용 Agent Teams(Opus 4.6) 대신 Codex의 `default/explorer/worker` 역할을 기준으로 실행합니다.

## Prerequisites

1. Codex CLI `0.102.0+`
2. `config.toml`에 아래 설정:

```toml
[features]
multi_agent = true
```

3. 권장 스레드 수:

```toml
[agents]
max_threads = 6
```

4. (선택) 사용자 정의 에이전트:

```toml
[agents.fast_worker]
description = "빠른 범위 구현 에이전트"
config_file = "C:/Users/Administrator/.codex/agents/fast_worker.toml"
```

## Modes

### 1) 섹션 모드

- 입력에 `docs/plan/*/sections/index.md` 또는 zephermine 산출물이 있는 경우
- 섹션 의존성을 Wave로 분리해 병렬 실행

### 2) 자유 모드

- 일반 작업 요청(예: "auth 리팩토링 + 테스트")
- 파일/모듈 기준으로 태스크를 직접 분해 후 병렬 실행

## Workflow

### Step 1: 작업 분해

1. 목표를 3~8개의 독립 태스크로 분할
2. 태스크별 담당 파일 범위를 고정
3. 의존성 있는 태스크는 후행 Wave로 배치

상세 규칙: `references/role-mapping.md`

### Step 2: 역할 매칭

- `explorer`: 분석, 리스크 점검, 편집 금지
- `worker`: 구현/수정/테스트
- `default`: 조율, 병합 판단, 최종 보고

### Step 3: 에이전트 스폰

Codex 프롬프트에서 자연어로 spawn 지시를 보냅니다.
템플릿은 `references/prompt-templates.md`를 사용합니다.

핵심 규칙:

- 각 worker는 파일 소유권 범위를 벗어나지 않음
- explorer는 코드 수정 금지
- 충돌 가능성이 있으면 즉시 `default`가 재분배
- 각 worker는 작업 과정을 `conversations/{YYYY-MM-DD}-team-dannys.md`에 기록

### Step 4: 모니터링

1. 진행 중 실패 태스크를 우선 확인
2. 실패 원인을 한 번에 하나씩 재시도
3. 3회 이상 반복 실패 시 아키텍처 이슈로 분류 후 사용자 보고

### Step 4.5: Activity Log Summary

통합 전 활동 로그 요약:

1. `conversations/{YYYY-MM-DD}-team-dannys.md` 읽기
2. 에이전트별 활동 통계: 기록 수, 에러 수, 파일 수
3. Orchestrator MCP 사용 시 `orchestrator_get_activity_log`로 JSONL 로그도 확인
4. 요약을 최종 보고에 포함

### Step 5: 통합 및 검증

1. 파일 충돌 여부 확인
2. 필수 테스트 실행
3. 남은 리스크/미해결 항목 정리

## Output Format

최종 보고는 아래 포맷을 따릅니다:

```text
Codex Agent Team 실행 결과
- 완료 태스크: N개
- 실패 태스크: N개
- 주요 변경 파일: ...
- 테스트 결과: ...
- 잔여 리스크: ...
```

## Troubleshooting

### multi_agent가 비활성 상태

- `codex features list`에서 `multi_agent`가 false면:
  - `codex features enable multi_agent`
  - Codex 재시작

### 에이전트 충돌(같은 파일 동시 수정)

- 파일 소유권을 다시 나눠 재스폰
- 공통 모듈은 별도 single-owner 태스크로 분리

### 스레드 과다로 품질 저하

- `max_threads`를 줄여 재실행 (예: 6 → 4)
- explorer를 1개로 고정하고 worker 수만 조절

## References

- 역할/소유권 규칙: `references/role-mapping.md`
- 스폰 프롬프트 템플릿: `references/prompt-templates.md`
