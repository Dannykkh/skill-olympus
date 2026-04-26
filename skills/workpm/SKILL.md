---
name: workpm
description: 다이달로스(Daedalus) — 설계 없이 바로 구현할 때 사용하는 PM. 리서치 → 제안 → 도면 → 구현 → 검증을 자체적으로 진행합니다. /workpm 또는 /daedalus로 실행. Claude는 native TeamCreate, Codex/Gemini는 orchestrator MCP 경로를 사용합니다.
triggers:
  - "workpm"
  - "daedalus"
  - "다이달로스"
  - "pmworker"
auto_apply: false
---

# Daedalus (다이달로스) — 현장감독 PM

> **다이달로스(Daedalus)**: 미노타우로스의 미궁을 지은 그리스 전설의 건축가.
> 설계 도면 없이도 직접 리서치하고, 제안하고, 도면을 그린 뒤 시공합니다.

**공식 호출명:** `/workpm` (별칭: `/daedalus`, `다이달로스`)

## 언제 사용하나?

| 상황 | 사용할 도구 |
|------|-----------|
| **젭마인 없이** 바로 구현 시작 | **다이달로스** (`/daedalus`) |
| **젭마인 산출물**(sections/) 기반 구현 | **포세이돈** (`/agent-team`) |

다이달로스는 **설계 산출물이 없을 때** 스스로 리서치 → 제안 → 도면 작성 → 구현까지 전체를 관리합니다.
젭마인 산출물이 이미 있다면 `/agent-team`이 더 적합합니다 (섹션 파싱 + Wave 정렬 + 전문가 매칭).

## 실행 경로

| CLI | 실행 경로 | 기준 파일 |
|-----|----------|----------|
| Claude Code | Native Agent Teams (`TeamCreate`/`SendMessage`) | `skills/orchestrator/commands/workpm.md` |
| Codex | Orchestrator MCP PM/Worker | `skills/orchestrator/commands/workpm-mcp.md` |
| Gemini | Orchestrator MCP PM/Worker | `skills/orchestrator/commands/workpm-mcp.md` |

`pmworker`는 레거시 호출명입니다. 별도 스킬로 보지 말고 이 다이달로스/오케스트레이터 경로로 라우팅합니다.

## 모델 선택 전략

**"무엇을 만들지" 판단 → Opus, "어떻게 만들지" 실행 → Sonnet.**
Codex/Gemini MCP 경로에서는 같은 의도를 `orchestrator_detect_providers`로 확인된 provider에 맞춰 매핑합니다.

| Phase | 팀원 역할 | 모델 |
|-------|----------|------|
| **1. 리서치 & 제안** | 도메인 조사, 아키텍처 비교 | **Opus** |
| **2. 프로세스 도면** | Mermaid 다이어그램 설계 | **Opus** |
| **3. 영향도 분석** | 의존성 탐색 (Grep/Read) | **Sonnet** |
| **4. 구현** | 기능 코딩, 테스트 작성 | **Sonnet** |
| **4. 자재검사** | code-reviewer 검수 | **Opus** |
| **4. 테스트 실행** | 테스트 러너, 린트 | **Sonnet** |
| **5. 공정 점검** | 도면 vs 코드 대조 | **Opus** |

## 워크플로우

CLI 런타임에 따라 단계 수가 다릅니다.

| 경로 | 단계 | 차이 |
|-----|------|------|
| Claude native | 5단계 | Phase 3에 영향도 분석 포함 |
| Codex/Gemini MCP | 4단계 | 영향도 분석을 별도 Phase로 두지 않고 구현 계획에 흡수 |

## Start

Claude Code에서는 `skills/orchestrator/commands/workpm.md`를 읽고 native 5단계 워크플로우를 따릅니다.
Codex/Gemini에서는 `skills/orchestrator/commands/workpm-mcp.md`를 읽고 MCP 기반 PM/Worker 워크플로우를 따릅니다.
