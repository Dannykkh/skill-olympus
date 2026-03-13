---
name: workpm
description: 다이달로스(Daedalus) — 현장감독 PM. 설계 도면을 받아 시공을 관리합니다. 기본은 네이티브 Agent Teams, --mcp로 대규모/크로스-CLI 모드. /workpm 또는 /daedalus로 실행.
triggers:
  - "workpm"
  - "daedalus"
  - "다이달로스"
auto_apply: false
---

# Daedalus (다이달로스) — 현장감독 PM

> **다이달로스(Daedalus)**: 미노타우로스의 미궁을 지은 그리스 전설의 건축가.
> 설계 도면(flow-diagrams)을 읽고 작업을 분배하여 시공을 관리합니다.

**공식 호출명:** `/workpm` (별칭: `/daedalus`, `다이달로스`)

## 두 가지 모드

| 모드 | 호출 | 적합한 상황 |
|------|------|------------|
| **네이티브** (기본) | `/daedalus` | 일반 프로젝트 (섹션 3~6개, 단일 CLI) |
| **MCP** (대규모) | `/daedalus --mcp` | 대규모 (섹션 10+), 크로스-CLI 혼합, 장시간 작업 |

### 네이티브 모드 장점
- 설치 불필요, 즉시 실행
- 가벼움 (별도 프로세스 없음)
- PM↔teammate 실시간 대화

### MCP 모드 장점
- 각 Worker가 독립 터미널 (모니터링 가능)
- Hard 파일 락 (물리적 충돌 방지)
- 크래시 복원 (태스크 상태 영속)
- 크로스-CLI (Claude PM → Codex/Gemini Worker)
- 대규모 스케일 (컨텍스트 압박 없음)

## Routing Rules

1. `$ARGUMENTS`에 `--mcp`가 있으면 → **MCP 모드**
2. `--mcp` 없으면 → **네이티브 모드** (기본)

### 네이티브 모드
- Claude: `TeamCreate`/`SendMessage` 사용 → `../orchestrator/commands/workpm.md` 워크플로우
- Codex: `spawn_agent` 사용 → `../agent-team-codex/` 참조 또는 네이티브 multi_agent

### MCP 모드
- `../orchestrator/commands/workpm-mcp.md` 워크플로우
- Orchestrator MCP 서버 필요:
  ```bash
  node skills/orchestrator/install.js <target-project-path>
  ```
- 별도 터미널에서 `pmworker`로 Worker 실행 가능

## Important Notes

- `workpm` / `daedalus` are the preferred user-facing names across all CLIs.
- 기본은 네이티브. MCP는 명시적 `--mcp` 플래그가 있을 때만.
- Gemini 단독 PM 시에는 MCP 모드만 가능 (자동 감지).

## Start

State which mode you selected in one short sentence, then load the chosen workflow file and execute it.
