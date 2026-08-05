---
name: workpm
description: 다이달로스(Daedalus) — 설계 없이 바로 구현할 때 사용하는 PM. 리서치 → 제안 → 도면 → 구현 → 검증을 자체적으로 진행합니다. /workpm 또는 /daedalus로 실행. 4-CLI 모두 네이티브 멀티에이전트 경로 우선 (Claude Agent Teams / Codex spawn_agent / Gemini 서브에이전트 / Grok spawn_subagent), 네이티브 부재 구버전 CLI만 orchestrator MCP 폴백.
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

> **native-first 원칙** (learned/020): 워크플로우(5단계)는 공통, 실행 프리미티브만 CLI별 네이티브로 교체.

| CLI | 실행 경로 | 기준 파일 |
|-----|----------|----------|
| Claude Code | Native Agent Teams | `skills/orchestrator/commands/workpm.md` |
| Codex | Native spawn_agent (같은 5단계, 프리미티브 교체) | `workpm.md` + 아래 프리미티브 표 |
| Gemini | Native 서브에이전트 (같은 5단계, 사전 정의 에이전트 위임) | `workpm.md` + 아래 프리미티브 표 |
| Grok | Native spawn_subagent (같은 5단계) | `workpm.md` + 아래 프리미티브 표 |
| (폴백) | Orchestrator MCP PM/Worker — 네이티브 멀티에이전트 도구가 전부 없을 때만 | `skills/orchestrator/commands/workpm-mcp.md` |

**CLI별 실행 프리미티브** (agent-team [wave-executor.md](../agent-team/references/wave-executor.md) "CLI별 실행 형식"과 동일 — CLI별 설치본에 agent-team이 없을 수 있어 여기 내장, 수정 시 양쪽 함께):

| CLI | 팀원 생성 | 지시 전달 | 모니터링 | 정리 |
|-----|----------|----------|----------|------|
| **Claude** | `TeamCreate` | `SendMessage` (summary 필수) | `TaskList` 폴링 | shutdown → `TeamDelete` |
| **Codex** | `spawn_agent` | `send_message` | `wait` 블로킹 | `close_agent` |
| **Gemini** | 없음 (사전 정의 에이전트에 위임) | 에이전트명 도구 호출의 위임 프롬프트에 전부 포함 | 도구 반환 = 완료 보고 | 불필요 |
| **Grok** | `spawn_subagent(subagent_type, prompt)` | prompt에 전부 포함 | 반환 요약 수신 | 불필요 |

> ⚠️ Gemini 네이티브 경로는 공식 문서 근거 설계(2026-08-05)이며 실스폰 미실측 — `/agents` 인식 실패 시 폴백 경로 사용.

`pmworker`는 레거시 호출명입니다. 별도 스킬로 보지 말고 이 다이달로스/오케스트레이터 경로로 라우팅합니다.

## 모델 선택 전략

**"무엇을 만들지" 판단 → Opus, "어떻게 만들지" 실행 → Sonnet.**
네이티브 경로에서는 각 CLI의 모델 지정 수단(Claude: TeamCreate model, Gemini: 에이전트 frontmatter model 등)으로,
폴백(MCP) 경로에서는 `orchestrator_detect_providers`로 확인된 provider에 맞춰 같은 의도를 매핑합니다.

| Phase | 팀원 역할 | 모델 |
|-------|----------|------|
| **1. 리서치 & 제안** | 도메인 조사, 아키텍처 비교 | **Opus** |
| **2. 프로세스 도면** | Mermaid 다이어그램 설계 | **Opus** |
| **3. 영향도 분석** | 의존성 탐색 (Grep/Read) | **Sonnet** |
| **4. 구현** | 기능 코딩, 테스트 작성 | **Sonnet** |
| **4. 자재검사** | code-reviewer 검수 | **Opus** |
| **4. 테스트 실행** | 테스트 러너, 린트 | **Sonnet** |
| **5. 공정 점검** | 도면 vs 코드 대조 | **Opus** |

## 도메인사전 통합

다이달로스는 설계 산출물 없이 즉흥 시공하기 때문에 **용어 일관성이 더 중요**합니다. 사전이 없으면 첫 시공부터 용어가 어긋납니다.

### Phase 1 끝: 사전 존재 확인 + 자동 생성

리서치 직후 다음을 자동 수행:

1. **사전 존재 확인**: `docs/domain-dictionary.md` 탐색
2. **있으면**: 컨텍스트로 로드, 모든 후속 Phase에 전달
3. **없으면 즉석 생성** (간이 모드):
   - 글로벌 사전(`~/.agent-memory/domain-dictionaries/{도메인}.md`, `AGENT_DOMAIN_DICTIONARY_HOME` override 가능) 후보 용어를 번호 목록으로 시드 (있으면)
   - 사용자 지시문에서 핵심 용어 5~10개 추출
   - 사용자 1회 확인 후 마스터 사전 v1 생성
   - 이후 시공 중 새 용어 발견 시 사전 자동 갱신 (델타 없이 마스터 직접)
4. **건너뛰기 조건**: 사용자 지시가 5줄 미만의 trivial 작업이면 자동 건너뜀

### Phase 4 (구현): teammate에게 사전 전달

모든 구현 teammate 프롬프트에 사전 컨텍스트와 준수 규칙을 포함합니다. 자세한 형식은 `agent-team` 스킬의 [teammate-context-template.md](../agent-team/references/teammate-context-template.md) "도메인사전 강제 사용 지침" 섹션 참조 — 동일하게 적용. (Codex 설치본에는 agent-team이 없음 — `agent-team-codex`의 [prompt-templates.md](../agent-team-codex/references/prompt-templates.md)를 쓰되, 사전 컨텍스트+준수 규칙+금지 표현을 팀원 프롬프트에 포함한다는 원칙은 동일)

### Phase 5 (공정 점검): 사전 준수 검증

도면 vs 코드 대조 시 사전 준수도 함께 검사:
- 코드 식별자가 사전 영문 식별자를 따르는가
- 금지 표현 사용 여부
- UI 라벨이 사전 한글 표기를 따르는가
- 위반 발견 시 해당 teammate에게 재시공 지시 (rename은 자동 수정 가능)

## 워크플로우

경로에 따라 단계 수가 다릅니다.

| 경로 | 단계 | 차이 |
|-----|------|------|
| 네이티브 (Claude/Codex/Gemini/Grok) | 5단계 | Phase 3에 영향도 분석 포함 |
| 폴백 (orchestrator MCP) | 4단계 | 영향도 분석을 별도 Phase로 두지 않고 구현 계획에 흡수 |

## Start

1. **네이티브 경로** (기본): `skills/orchestrator/commands/workpm.md`를 읽고 5단계 워크플로우를 따릅니다.
   Claude가 아닌 CLI는 workpm.md의 Agent Teams 프리미티브(TeamCreate/SendMessage/TaskList)를
   위 "CLI별 실행 프리미티브" 표의 자기 CLI 행으로 치환해 수행합니다.
2. **폴백 경로**: 네이티브 멀티에이전트 도구가 전부 없으면 `skills/orchestrator/commands/workpm-mcp.md`를 읽고 MCP 기반 PM/Worker 워크플로우를 따릅니다.
