---
name: orchestrator
description: 네이티브 PM·실행 방식 비교의 공통 계약과 조건부 MCP 오케스트레이션. hard file lock, 외부 태스크 보드, 크로스-CLI 혼합이 필요할 때 /daedalus --mcp로 실행한다.
---

# Orchestrator - Multi-AI 병렬 작업 시스템 (MCP 대규모 모드)

PM (Project Manager)이 태스크를 분배하고, Worker들이 병렬로 수행합니다.

공통 PM 절차는 `commands/workpm.md`에 있습니다. 실행 중 문맥·작업 분할·도구 순서를 바꿔야 한다는
근거가 있으면 [실행 방식 비교](references/execution-adjustment.md)를 읽습니다. 이 계약은 네이티브·
메인 순차·MCP 경로가 공유하며, 문서 로드만으로 MCP 서버를 실행하거나 MCP 모드로 전환하지 않습니다.

> **참고:** 일반 프로젝트는 `/daedalus` (네이티브 모드)를 권장합니다.
> MCP는 hard lock·외부 태스크 보드·크로스-CLI 혼합 계약이 필요할 때 선택합니다.
> `/daedalus --mcp`로 진입합니다.

**네이티브 vs MCP 선택 기준:**

| 상황 | 진입점 | 이유 |
|------|--------|------|
| 네이티브 위임으로 요구 계약 충족 | `/daedalus` (네이티브) | 내장 탐색자·작업자 사용. Claude Agent Teams는 사용자가 실험 기능을 켠 경우에만 사용 |
| 외부 태스크 보드 / 크로스-CLI 혼합 필요 | `/daedalus --mcp` (이 모드) | 네이티브 도구로 충족하지 못하는 실행 계약 제공 |
| 네이티브 위임 불가·실패, 필수 MCP 계약 없음 | `/daedalus` 메인 순차 폴백 | 메인 컨텍스트에서 같은 계약을 순차 실행 |
| 파일 잠금(hard lock)이 필요한 병렬 수정 | `/daedalus --mcp` | `orchestrator_lock_file` — 네이티브 팀은 소유권 규칙(soft)뿐 |

## 설치

```bash
# 위 모듈 해석 계약으로 이 source-only 스킬의 MODULE_ROOT를 먼저 확정한다.
node "$MODULE_ROOT/install.js" <대상-프로젝트-경로>              # 프로젝트 설치
node "$MODULE_ROOT/install.js" <대상-프로젝트-경로> --uninstall  # 프로젝트 제거
```

MCP 실행 파일은 활성 스킬 레지스트리가 아니라
현재 CLI의 비노출 런타임 미러를 우선 사용합니다. Claude/Grok은
`~/.claude/.olympus/runtime-modules/orchestrator/`, Codex는
`${CODEX_HOME:-~/.codex}/.olympus/runtime-modules/orchestrator/`, Antigravity는
`~/.gemini/antigravity-cli/.olympus/runtime-modules/orchestrator/`입니다.
전체 Olympus 설치에서는 이 미러와 의존성을 자동 관리합니다.

---

## 포함 파일

```
orchestrator/
├── SKILL.md                    # 이 파일
├── install.js                  # 설치 스크립트
├── mcp-server/                 # Orchestrator MCP 서버
│   ├── src/
│   ├── scripts/                # Worker spawn 스크립트 (ps1, sh)
│   └── package.json
├── commands/
│   ├── workpm.md               # 공통 5단계 PM 계약 + CLI별 네이티브 역할
│   ├── workpm-mcp.md           # PM 명령어 (MCP 전용, 모든 CLI)
│   └── pmworker.md             # Worker 명령어 (모든 CLI)
├── references/
│   └── execution-adjustment.md # 현재 태스크의 실행 방식 비교 (모든 실행 경로)
└── docs/
    └── orchestrator-guide.md   # 상세 가이드
```

---

## 사용법

### CLI별 진입점

| CLI | 권장 엔트리포인트 | 실제 동작 |
|-----|-------------------|-------------|
| **Claude** | `workpm` | 내장 subagent; 실험 Agent Teams가 활성화되면 named teammate |
| **Codex** | `workpm` | 내장 `explorer`/`worker`/`default` |
| **Antigravity** | `workpm` | 내장 `research` + 메인/사용자 정의 쓰기 서브에이전트 |
| **Grok** | `workpm` | 내장 `explore`/`general-purpose` |

- `workpm`: 통합 PM 엔트리포인트. 네이티브 작업자에게 업무를 분장하며, 위임 불가·실패 시 메인 순차 폴백. MCP는 hard lock·외부 태스크 보드·혼합 CLI 계약이 필요할 때 선택
- `workpm-mcp`: 명시적 MCP-only PM 엔트리포인트. 모든 CLI에서 동작

### Worker 모드 (모든 CLI 공통)
```
pmworker
```
- 통합 Worker 엔트리포인트
- 가용 태스크 확인 및 수행
- 파일 락 및 완료 보고
- MCP 도구만 사용하므로 Claude/Codex/Antigravity 모두 동작

---

## 핵심 3원칙

| 원칙 | 설명 |
|------|------|
| **업무 분장** | 메인은 경계·의존성·검증과 통합, 작업자는 구현·관련 테스트를 담당. 분장·동시성·폴백은 `commands/workpm.md`의 공통 계약 적용 |
| **기억 외부화** | 중요 결정은 activity log에 즉시 기록 |
| **작업자 수명** | 관련 후속 작업은 담당자 유지. 무관한 업무·역할 차이·확인된 컨텍스트 문제일 때 교체 |

---

## 워크플로우

```
/workpm (네이티브 역할 모드 — 5단계):
  Phase 1: 리서치 & 제안 — 업무 경계별 조사 배정 → 필요한 실행안과 미정 결정 정리
  Phase 2: 프로세스 도면 확보 — flow-diagrams 검증/생성
  Phase 3: 영향도 분석 — 기존 코드 있을 때만 (신규면 건너뜀)
  Phase 4: 구현 & 검증 — 담당자별 구현·관련 테스트 → 독립 리뷰와 결과 검증
  Phase 5: 공정 점검 — 도면 vs 코드 대조

/workpm-mcp (MCP 전용 — 4단계, 영향도 분석 없음):
  Phase 1: 리서치 & 제안
  Phase 2: 프로세스 도면 확보
  Phase 3: 구현 & 검증
  Phase 4: 공정 점검
```

---

## 명령어 요약

### PM 전용

| 명령어 | 설명 |
|--------|------|
| `orchestrator_detect_providers()` | AI CLI 감지 |
| `orchestrator_create_task({...})` | 태스크 생성 |
| `orchestrator_get_progress()` | 진행 상황 |
| `orchestrator_log_activity({...})` | 결정/진행 기록 |
| `orchestrator_get_activity_log({...})` | 활동 로그 조회 |

### Worker 전용

| 명령어 | 설명 |
|--------|------|
| `orchestrator_get_available_tasks()` | 가용 태스크 확인 |
| `orchestrator_claim_task({task_id})` | 태스크 담당 |
| `orchestrator_lock_file({path})` | 파일/폴더 락 |
| `orchestrator_complete_task({task_id, result})` | 완료 보고 |
| `orchestrator_fail_task({task_id, error})` | 실패 보고 |

---

## 상세 가이드

[docs/orchestrator-guide.md](docs/orchestrator-guide.md) 참조

---

## 다음 단계 안내

모든 Worker 태스크가 완료되면 사용자에게 다음 단계를 안내합니다:

```
✅ 오케스트레이터 구현 완료!

📊 결과: {완료 태스크 수}/{전체 태스크 수}

👉 다음 단계 (선택):
  /minos          → Playwright 자동 테스트 + Healer 루프
  /review              → 코드 리뷰 (품질/보안/성능)
  /commit              → 변경사항 커밋

📎 참고: docs/workflow-guide.md
```
