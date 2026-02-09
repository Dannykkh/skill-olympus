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
│   └── package.json
├── commands/
│   ├── workpm.md               # PM 시작 명령어
│   └── pmworker.md             # Worker 시작 명령어
└── docs/
    └── orchestrator-guide.md   # 상세 가이드
```

---

## 사용법

### PM 모드 시작
```
workpm
```
- 프로젝트 분석
- 태스크 분해 및 생성
- AI 배정 (Claude, Codex, Gemini)

### Worker 모드 시작
```
pmworker
```
- 가용 태스크 확인
- 태스크 담당 및 파일 락
- 작업 수행 및 완료 보고

---

## PM 명령어

| 명령어 | 설명 |
|--------|------|
| `orchestrator_detect_providers()` | AI CLI 감지 |
| `orchestrator_analyze_codebase()` | 프로젝트 분석 |
| `orchestrator_create_task({...})` | 태스크 생성 |
| `orchestrator_get_progress()` | 진행 상황 |
| `orchestrator_get_status()` | 전체 상태 |

---

## Worker 명령어

| 명령어 | 설명 |
|--------|------|
| `orchestrator_get_available_tasks()` | 가용 태스크 확인 |
| `orchestrator_claim_task({task_id})` | 태스크 담당 |
| `orchestrator_lock_file({path})` | 파일/폴더 락 |
| `orchestrator_complete_task({task_id, result})` | 완료 보고 |
| `orchestrator_fail_task({task_id, error})` | 실패 보고 |

---

## AI 배정 가이드

| 태스크 유형 | 추천 AI | 이유 |
|------------|---------|------|
| 코드 생성/구현 | codex | 빠른 코드 생성 |
| 리팩토링 | claude | 복잡한 추론 |
| 코드 리뷰 | gemini | 대용량 컨텍스트 |
| 문서 작성 | claude | 자연어 품질 |

---

## 워크플로우

```
[PM 터미널]
workpm → 프로젝트 분석 → 태스크 분해 → 생성

[Worker 터미널 1]
pmworker → task-1 담당 → 락 획득 → 작업 → 완료

[Worker 터미널 2]
pmworker → task-2 담당 → 락 획득 → 작업 → 완료

[Worker 터미널 3]
pmworker → task-3 담당 (task-1 완료 후 언블록) → ...
```

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
  /qa-until-pass       → Playwright 자동 테스트 + Healer 루프
  /review              → 코드 리뷰 (품질/보안/성능)
  /commit              → 변경사항 커밋

📎 참고: docs/workflow-guide.md
```
