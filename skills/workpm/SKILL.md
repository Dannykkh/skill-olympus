---
name: workpm
description: 다이달로스(Daedalus) — 설계 없이 바로 구현할 때 사용하는 PM. 리서치 → 제안 → 도면 → 구현 → 검증을 자체적으로 진행합니다. /workpm 또는 /daedalus로 실행.
triggers:
  - "workpm"
  - "daedalus"
  - "다이달로스"
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

## 워크플로우

네이티브 Agent Teams (TeamCreate/SendMessage)를 사용합니다.

## Start

Read `skills/orchestrator/commands/workpm.md` and follow the 4-phase workflow.
