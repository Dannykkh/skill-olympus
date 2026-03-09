---
name: orchestrator
description: PM-Worker 패턴의 Multi-AI 오케스트레이션. 병렬 작업 분배 및 파일 락 관리.
triggers:
  - "workpm"
  - "pmworker"
  - "orchestrator"
auto_apply: false
---

# Orchestrator - Multi-AI 병렬 작업 시스템

PM (Project Manager)이 태스크를 분배하고, Worker들이 병렬로 수행합니다.

## 설치

```bash
node skills/orchestrator/install.js              # 설치
node skills/orchestrator/install.js --uninstall  # 제거
```

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
│   ├── workpm.md               # PM 명령어 (Claude Agent Teams 모드)
│   ├── workpm-mcp.md           # PM 명령어 (MCP 전용, 모든 CLI)
│   └── pmworker.md             # Worker 명령어 (모든 CLI)
└── docs/
    └── orchestrator-guide.md   # 상세 가이드
```

---

## 사용법

### CLI별 진입점

| CLI | 권장 엔트리포인트 | 실제 동작 |
|-----|-------------------|-------------|
| **Claude** | `workpm` | Agent Teams 활용, 실시간 팀원 통신 |
| **Codex** | `workpm` 또는 `workpm-mcp` | MCP 도구만 사용, 태스크 기반 |
| **Gemini** | `workpm` 또는 `workpm-mcp` | MCP 도구만 사용, 태스크 기반 |

- `workpm`: 통합 PM 엔트리포인트. Claude에서는 Agent Teams 모드, Codex/Gemini에서는 `workpm-mcp` 경로로 라우팅
- `workpm-mcp`: 명시적 MCP-only PM 엔트리포인트. 모든 CLI에서 동작

### Worker 모드 (모든 CLI 공통)
```
pmworker
```
- 통합 Worker 엔트리포인트
- 가용 태스크 확인 및 수행
- 파일 락 및 완료 보고
- MCP 도구만 사용하므로 Claude/Codex/Gemini 모두 동작

---

## 핵심 3원칙

| 원칙 | 설명 |
|------|------|
| **작업 외주화** | 리더는 코딩하지 않는다. 전략만 |
| **기억 외부화** | 중요 결정은 activity log에 즉시 기록 |
| **계속 해고** | 작업 끝난 팀원은 교체. 깨끗한 컨텍스트 유지 |

---

## 워크플로우

```
Phase 1: 리서치 & 제안
  리더 → 팀원 4명 → 심부름꾼 ~30명 병렬 리서치
  → 보고서 → 3가지 제안서 → 사용자 승인

Phase 2: 구현 & 검증
  기존 팀원 해고 → 새 팀원 4명 → 심부름꾼 ~30명 병렬 구현
  → 팀원 검토 → 리더 최종 검토 → 최종 보고
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
  /qpassenger          → Playwright 자동 테스트 + Healer 루프
  /review              → 코드 리뷰 (품질/보안/성능)
  /commit              → 변경사항 커밋

📎 참고: docs/workflow-guide.md
```
