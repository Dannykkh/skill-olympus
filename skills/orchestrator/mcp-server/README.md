# Orchestrator MCP Server

PM + Multi-AI Worker 병렬 처리를 위한 MCP 서버입니다.

## 주요 기능

- **파일 락킹**: 다중 Worker 간 파일 충돌 방지
- **태스크 의존성 관리**: 선행 태스크 완료 후 자동 언블록
- **Multi-AI 지원**: MCP에 연결된 어떤 CLI도 PM으로 사용할 수 있고, 자동 Worker 생성은 Claude/Codex/Gemini를 지원
- **Fail-closed routing**: 설치된 provider만 선택하며 요청 provider가 없으면 다른 CLI로 조용히 대체하지 않음

## 설치

```bash
cd claude-orchestrator-mcp
npm install
npm run build
```

## 실행 방법

### 0. 자동 설치 스크립트 사용 (권장)

프로젝트에 Orchestrator를 설치하는 가장 간단한 방법입니다.

```bash
# 설치 (MCP 빌드 + 훅/명령어 복사 + settings.local.json 자동 설정)
node install-orchestrator.js <대상-프로젝트-경로>

# 제거
node install-orchestrator.js <대상-프로젝트-경로> --uninstall
```

설치 스크립트는 다음을 자동 처리합니다:
- MCP 서버 빌드 확인 및 실행
- 플랫폼에 맞는 훅 파일 복사 (Windows: .ps1, Linux/Mac: .sh)
- 슬래시 명령어 복사 (workpm.md, pmworker.md)
- `settings.local.json`에 MCP 서버 + 훅 설정 머지 (기존 설정 보존)

### 1. PowerShell 스크립트 사용 (권장)

```powershell
# 레거시 launcher 기본 실행
.\scripts\launch.ps1 -ProjectPath "C:\your\project"

# Multi-AI 모드 (자동 감지)
.\scripts\launch.ps1 -ProjectPath "C:\your\project" -MultiAI

# Worker 별 AI 직접 지정
.\scripts\launch.ps1 -ProjectPath "C:\your\project" -AIProviders @('claude', 'codex', 'gemini')

# Worker 수 지정
.\scripts\launch.ps1 -ProjectPath "C:\your\project" -WorkerCount 5

# 수동 모드 (권한 확인 필요)
.\scripts\launch.ps1 -ProjectPath "C:\your\project" -ManualMode

# Git Worktree 없이 실행
.\scripts\launch.ps1 -ProjectPath "C:\your\project" -SkipWorktrees

# 클린 스타트 (기존 데이터 삭제)
.\scripts\launch.ps1 -ProjectPath "C:\your\project" -CleanStart
```

자동 Worker 스크립트는 Claude의 auto permission mode, Codex의 workspace-write sandbox 안 자동 리뷰, Gemini의 sandbox 안 자동 승인을 기본으로 사용합니다. approval/sandbox 전체 우회나 workspace trust 우회는 사용하지 않습니다. 더 엄격한 조직 정책이 있으면 자동 실행 대신 승인된 permission mode로 Worker를 수동 실행합니다.

**Multi-AI 모드:**
- **Full Mode**: Claude + Codex + Gemini 3개 AI 병렬 처리
- **Dual Mode**: 사용 가능한 2개 AI 병렬 처리
- **Single Mode**: 실제 감지된 provider 하나만 사용
- **None Mode**: 지원 provider 없음; Worker 생성 실패

### 2. 수동 설정

`.claude/mcp.json` 파일을 프로젝트 루트에 생성:

```json
{
  "mcpServers": {
    "orchestrator": {
      "command": "node",
      "args": ["path/to/claude-orchestrator-mcp/dist/index.js"],
      "env": {
        "ORCHESTRATOR_PROJECT_ROOT": "C:\\your\\project",
        "ORCHESTRATOR_WORKER_ID": "codex-worker-1",
        "ORCHESTRATOR_AI_PROVIDER": "codex"
      }
    }
  }
}
```

PM 프로세스는 `ORCHESTRATOR_AI_PROVIDER`를 생략할 수 있습니다. 수동 Worker는 `ORCHESTRATOR_AI_PROVIDER`를 `claude`, `codex`, `gemini` 중 하나로 설정합니다. 자동 생성 Worker는 provider-prefixed ID에서도 provider를 복원하지만, 수동 구성은 명시적 환경 변수를 권장합니다.

## Provider 및 claim 계약

- `orchestrator_create_task`에서 `ai_provider`를 생략하면 provider-agnostic 태스크이며 어떤 Worker든 claim할 수 있습니다.
- `ai_provider`를 지정하면 같은 provider로 등록된 Worker에게만 목록에 보이고 claim이 허용됩니다.
- claim은 상태, provider, 선행 의존성을 하나의 원자적 compare-and-set에서 검사하므로 동시 요청 중 정확히 한 Worker만 성공합니다.
- 지정 provider가 설치되지 않았으면 태스크 생성과 Worker 생성은 실패하며 Claude 등으로 자동 대체하지 않습니다.
- `orchestrator_spawn_workers`에서 `providers`를 생략하거나 배열이 짧으면 `claude → codex → gemini` 순서 중 실제 감지된 첫 provider로 빈 슬롯을 채웁니다. 아무 provider도 없으면 실패합니다.

## MCP 도구

### Multi-AI 관리 도구

| 도구 | 설명 |
|------|------|
| `orchestrator_detect_providers` | 설치된 AI CLI 감지 (Claude/Codex/Gemini) |
| `orchestrator_get_provider_info` | AI Provider 설치 상태와 안전한 기본 실행 명령 조회 |

### PM 전용 도구

| 도구 | 설명 |
|------|------|
| `orchestrator_analyze_codebase` | 프로젝트 구조 분석 |
| `orchestrator_create_task` | 태스크 생성 (`ai_provider` 생략 시 provider-agnostic) |
| `orchestrator_get_progress` | 진행 상황 조회 |

### Worker 전용 도구

| 도구 | 설명 |
|------|------|
| `orchestrator_get_available_tasks` | 가용 태스크 목록 조회 |
| `orchestrator_claim_task` | 태스크 담당 선언 |
| `orchestrator_lock_file` | 파일/폴더 락 획득 |
| `orchestrator_unlock_file` | 파일/폴더 락 해제 |
| `orchestrator_complete_task` | 태스크 완료 처리 |
| `orchestrator_fail_task` | 태스크 실패 처리 |

### 공통 도구

| 도구 | 설명 |
|------|------|
| `orchestrator_get_status` | 전체 시스템 상태 조회 |
| `orchestrator_get_task` | 특정 태스크 상세 조회 |
| `orchestrator_get_file_locks` | 현재 파일 락 목록 |
| `orchestrator_delete_task` | 태스크 삭제 |
| `orchestrator_reset` | 상태 초기화 |
| `orchestrator_heartbeat` | 워커 하트비트 갱신 |

## 워크플로우 예시

### PM

```
1. orchestrator_detect_providers() - AI CLI 감지
   → 결과: { mode: "full", providers: ["claude", "codex", "gemini"] }

2. orchestrator_analyze_codebase() - 프로젝트 분석

3. 별도 provider 근거가 없는 태스크는 provider-agnostic으로 생성:
   orchestrator_create_task({
     id: "gen-api",
     prompt: "기존 API 구조와 오류 응답 규칙을 따라 사용자 조회 엔드포인트를 구현하고 단위 테스트와 타입 검사를 통과시킨다.",
     scope: ["src/api/users/**", "tests/api/users/**"]
   })

4. 특정 CLI 재현이 필요한 경우에만 감지된 provider를 고정:
   orchestrator_create_task({
     id: "codex-cli-repro",
     prompt: "Codex CLI에서만 재현되는 MCP 호출 오류를 같은 CLI 환경에서 재현하고 최소 수정 후 회귀 테스트를 실행한다.",
     scope: ["src/mcp/**", "tests/mcp/**"],
     ai_provider: "codex"
   })

5. orchestrator_get_progress() - 진행 상황 모니터링
```

### PM (기본)

```
1. orchestrator_analyze_codebase() - 프로젝트 분석
2. orchestrator_create_task({id: "task-1", prompt: "사용자 조회 API를 기존 규칙에 맞게 구현하고 관련 단위 테스트와 타입 검사를 통과시킨다.", scope: ["src/users/**", "tests/users/**"], priority: 2})
3. orchestrator_create_task({id: "task-2", prompt: "선행 사용자 조회 API의 결과를 검증하는 통합 테스트를 추가하고 전체 테스트 스위트를 실행한다.", scope: ["tests/integration/users/**"], depends_on: ["task-1"]})
4. orchestrator_get_progress() - 진행 상황 모니터링
```

### Worker

```
1. orchestrator_get_available_tasks() - 가용 태스크 확인
2. orchestrator_claim_task({task_id: "task-1"}) - 태스크 담당
3. orchestrator_lock_file({path: "src/module"}) - 파일 락
4. (실제 작업 수행)
5. orchestrator_complete_task({task_id: "task-1", result: "완료"})
```

## Provider 선택 원칙

Provider는 vendor별 고정 강점으로 배정하지 않습니다. 현재 모델과 설정, 사용자 요구, 조직 정책, provider별 재현 필요성, 실제 프로젝트 평가 결과를 근거로 고정합니다. 그런 근거가 없으면 `ai_provider`를 생략합니다.

## 상태 파일

오케스트레이터 상태는 `{프로젝트}/.orchestrator/orchestrator.db`에 SQLite WAL 형식으로 저장됩니다. `tasks.ai_provider`와 `workers.ai_provider`가 provider routing의 정본이며, 기존 `state.json`은 최초 마이그레이션 입력으로만 사용됩니다.
