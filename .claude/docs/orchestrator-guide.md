# Multi-AI Orchestrator 상세 가이드

PM + Multi-AI Worker 병렬 처리 시스템의 완전한 사용 가이드입니다.

---

## 개요

### 무엇인가?

Multi-AI Orchestrator는 여러 AI CLI (Claude, Codex, Gemini)를 동시에 활용하여 대규모 작업을 병렬로 처리하는 시스템입니다.

### 언제 사용하나?

| 상황 | 권장 |
|------|------|
| 단일 파일 수정 | 일반 Claude Code |
| 다중 모듈 동시 작업 | **Orchestrator** |
| 대규모 리팩토링 | **Orchestrator** |
| 여러 관점의 코드 리뷰 | **Orchestrator** (Multi-AI) |

### 핵심 기능

- **파일 락킹**: 다중 Worker 간 파일 충돌 방지
- **태스크 의존성**: 선행 작업 완료 후 자동 언블록
- **Multi-AI**: Claude + Codex + Gemini 병렬 실행
- **자동 Fallback**: 설치된 AI만 자동 감지

---

## 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                         PM (Claude)                          │
│  workpm 입력 → AI 감지 → 프로젝트 분석 → 태스크 생성         │
└─────────────────────────────────────────────────────────────┘
                              ↓
              ┌───────────────┼───────────────┐
              ↓               ↓               ↓
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   Worker-1      │ │   Worker-2      │ │   Worker-3      │
│   (Claude)      │ │   (Codex)       │ │   (Gemini)      │
│ claim → work    │ │ claim → work    │ │ claim → work    │
│ → complete      │ │ → complete      │ │ → complete      │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

---

## PM 모드 (workpm)

PM 터미널에서 `workpm` 입력 후:

1. **AI Provider 감지** - 설치된 CLI 자동 감지
2. **프로젝트 분석** - 모듈, 파일 구조 분석
3. **태스크 분해 및 생성** - scope, 의존성, AI 배정
4. **진행 상황 모니터링**

### 태스크 설계 원칙

| 원칙 | 설명 |
|------|------|
| **단일 책임** | 하나의 태스크 = 하나의 목표 |
| **명확한 범위** | scope로 수정 가능 파일 명시 |
| **적절한 크기** | 1-2시간 내 완료 가능 |
| **의존성 명시** | depends_on으로 순서 지정 |

### AI 배정 가이드

| 태스크 유형 | 추천 AI | 이유 |
|------------|---------|------|
| 코드 생성/구현 | `codex` | 빠른 코드 생성 |
| 리팩토링 | `claude` | 복잡한 추론 |
| 코드 리뷰/보안 | `gemini` | 대용량 컨텍스트 |
| 문서 작성 | `claude` | 자연어 품질 |

---

## Worker 모드 (pmworker)

Worker 터미널에서 `pmworker` 입력 후:

1. **가용 태스크 확인** - get_available_tasks
2. **태스크 담당 선언** - claim_task
3. **파일 락 획득** - lock_file
4. **작업 수행** - 세부 TODO 작성 및 진행
5. **완료/실패 보고** - complete_task / fail_task

### 파일 락 규칙

- 다른 Worker가 같은 경로를 락하면 충돌
- 상위/하위 경로도 충돌로 처리
- 태스크 완료 시 자동 해제

---

## 설치 및 설정

### 1. MCP 서버 빌드

```powershell
cd mcp-servers/claude-orchestrator-mcp
npm install && npm run build
```

### 2. settings.local.json

```json
{
  "mcpServers": {
    "orchestrator": {
      "command": "node",
      "args": ["path/to/claude-orchestrator-mcp/dist/index.js"],
      "env": {
        "ORCHESTRATOR_PROJECT_ROOT": "${workspaceFolder}",
        "ORCHESTRATOR_WORKER_ID": "pm"
      }
    }
  }
}
```

### 3. 다중 터미널 실행

```powershell
.\scripts\launch.ps1 -ProjectPath "C:\project" -MultiAI
```

---

## MCP 도구 레퍼런스

### PM 전용

| 도구 | 설명 |
|------|------|
| `orchestrator_detect_providers` | AI CLI 감지 |
| `orchestrator_analyze_codebase` | 프로젝트 분석 |
| `orchestrator_create_task` | 태스크 생성 |
| `orchestrator_get_progress` | 진행 상황 |

### Worker 전용

| 도구 | 설명 |
|------|------|
| `orchestrator_get_available_tasks` | 가용 태스크 |
| `orchestrator_claim_task` | 태스크 담당 |
| `orchestrator_lock_file` | 파일 락 |
| `orchestrator_complete_task` | 완료 보고 |
| `orchestrator_fail_task` | 실패 보고 |

---

## 트러블슈팅

### "Task has unmet dependencies"
→ 선행 태스크 완료 대기

### "Path is locked by another worker"
→ get_file_locks()로 확인, 해당 Worker 완료 대기

### AI Provider 감지 안됨
→ CLI 설치 및 PATH 확인 (`claude --version`)

---

## 참고

- 원본: https://github.com/Dannykkh/claude-code-agent-customizations/blob/master/docs/orchestrator-guide.md
- TermSnap에서 Claude Code 시작 시 자동 설치됩니다.
