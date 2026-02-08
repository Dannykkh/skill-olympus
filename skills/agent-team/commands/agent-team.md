---
description: zephermine 섹션 기반 Agent Teams 병렬 실행
allowed-tools:
  - TaskCreate
  - TaskUpdate
  - TaskList
  - TaskGet
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - AskUserQuestion
---

# /agent-team 커맨드

zephermine 섹션을 Agent Teams로 병렬 실행합니다.

## 사용법

```
/agent-team [planning_dir_path]
```

**인자:**
- `planning_dir_path` (선택): planning 디렉토리 경로. 없으면 `docs/plan/*/sections/index.md` 자동 탐색.

**예시:**
```
/agent-team docs/plan/my-feature
/agent-team                          # 자동 탐색
```

## 실행

$ARGUMENTS를 planning 디렉토리 경로로 사용하여 SKILL.md의 6단계 워크플로우를 실행합니다.

Read `skills/agent-team/SKILL.md` and follow the workflow from Step 1 to Step 6.
