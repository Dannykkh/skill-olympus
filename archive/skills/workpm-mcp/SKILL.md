---
name: workpm-mcp
description: 다이달로스 MCP 모드 (대규모/크로스-CLI). 독립 터미널 Worker, Hard 파일 락, 크래시 복원. /daedalus --mcp 또는 /workpm-mcp로 실행.
triggers:
  - "workpm-mcp"
  - "workpm mcp"
  - "daedalus-mcp"
  - "daedalus mcp"
  - "daedalus --mcp"
auto_apply: false
---

# Daedalus MCP (다이달로스 대규모 모드)

> 대규모 프로젝트, 크로스-CLI 혼합, 장시간 작업에 적합한 MCP 기반 오케스트레이션.
> 각 Worker가 독립 터미널에서 실행되어 개별 모니터링이 가능합니다.

## 언제 사용하나?

| 상황 | 이 모드 사용 |
|------|-------------|
| 섹션 10개 이상 대규모 프로젝트 | ✅ |
| Claude + Codex + Gemini 혼합 투입 | ✅ |
| 장시간 작업 (크래시 복원 필요) | ✅ |
| 각 Worker 터미널 개별 모니터링 | ✅ |
| 일반 프로젝트 (3~6개 섹션) | ❌ → `/daedalus` (네이티브) |

## Workflow

1. Read `../orchestrator/commands/workpm-mcp.md`.
2. Follow that workflow exactly.
3. If the Orchestrator MCP server is missing, stop and show the install command:
   ```bash
   node skills/orchestrator/install.js <target-project-path>
   ```
4. Use `pmworker` or `orchestrator_spawn_workers` for worker execution.

## MCP 모드 고유 기능

- **독립 터미널**: 각 Worker가 별도 터미널에서 실행 → 개별 진행 상황 확인
- **Hard 파일 락**: `orchestrator_lock_file`로 물리적 충돌 방지
- **크래시 복원**: 태스크 상태가 JSON 파일로 영속, PM 세션 재시작 가능
- **크로스-CLI**: `ai_provider` 필드로 Claude/Codex/Gemini Worker 혼합 배정
- **외부 모니터링**: 다른 터미널에서 `orchestrator_get_progress` 확인 가능
