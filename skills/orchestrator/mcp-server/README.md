# Claude Code Orchestrator MCP Server

PM + Multi-AI Worker 병렬 처리를 위한 MCP 서버입니다.

## 주요 기능

- **파일 락킹**: 다중 Worker 간 파일 충돌 방지
- **태스크 의존성 관리**: 선행 태스크 완료 후 자동 언블록
- **Multi-AI 지원**: Claude, Codex (GPT-5.2), Gemini 3 Pro 통합
- **자동 Fallback**: 설치된 AI CLI만 자동 감지하여 사용

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
# 기본 실행 (3개 Worker, Claude 전용)
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

**실행 모드:**
- **자동 모드** (기본): 권한 확인 없이 자동 작업
- **수동 모드** (`-ManualMode`): 각 작업마다 권한 확인 필요

**Multi-AI 모드:**
- **Full Mode**: Claude + Codex + Gemini 3개 AI 병렬 처리
- **Dual Mode**: 사용 가능한 2개 AI 병렬 처리
- **Single Mode**: Claude만 사용 (기본)

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
        "ORCHESTRATOR_WORKER_ID": "pm"
      }
    }
  }
}
```

Worker는 `ORCHESTRATOR_WORKER_ID`를 `worker-1`, `worker-2` 등으로 변경하여 설정합니다.

## MCP 도구

### Multi-AI 관리 도구

| 도구 | 설명 |
|------|------|
| `orchestrator_detect_providers` | 설치된 AI CLI 감지 (Claude/Codex/Gemini) |
| `orchestrator_get_provider_info` | AI Provider 강점 및 최적 용도 조회 |

### PM 전용 도구

| 도구 | 설명 |
|------|------|
| `orchestrator_analyze_codebase` | 프로젝트 구조 분석 |
| `orchestrator_create_task` | 태스크 생성 (ai_provider 옵션으로 AI 지정 가능) |
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

### PM (Multi-AI 활용)

```
1. orchestrator_detect_providers() - AI CLI 감지
   → 결과: { mode: "full", providers: ["claude", "codex", "gemini"] }

2. orchestrator_analyze_codebase() - 프로젝트 분석

3. AI별 최적 태스크 배정:
   - 코드 생성 → Codex
     orchestrator_create_task({id: "gen-api", prompt: "API 구현", ai_provider: "codex"})

   - 리팩토링/설계 → Claude
     orchestrator_create_task({id: "refactor", prompt: "아키텍처 개선", ai_provider: "claude"})

   - 대용량 분석 → Gemini
     orchestrator_create_task({id: "review", prompt: "전체 코드 리뷰", ai_provider: "gemini"})

4. orchestrator_get_progress() - 진행 상황 모니터링
```

### PM (기본)

```
1. orchestrator_analyze_codebase() - 프로젝트 분석
2. orchestrator_create_task({id: "task-1", prompt: "...", priority: 2})
3. orchestrator_create_task({id: "task-2", prompt: "...", depends_on: ["task-1"]})
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

## AI Provider 별 강점

| Provider | 강점 | 최적 용도 |
|----------|------|----------|
| **Claude** | 복잡한 추론, 맥락 이해 | 코드 리팩토링, 문서 작성, 아키텍처 설계 |
| **Codex** | 빠른 코드 생성 | 테스트 작성, 반복 코드 수정, 프로토타이핑 |
| **Gemini** | 대용량 컨텍스트 (1M 토큰) | 전체 코드베이스 리뷰, 보안 분석, 멀티파일 이해 |

## 상태 파일

오케스트레이터 상태는 `{프로젝트}/.orchestrator/state.json`에 저장됩니다.

```json
{
  "tasks": [...],
  "fileLocks": [...],
  "workers": [...],
  "projectRoot": "...",
  "startedAt": "...",
  "version": "1.0.0"
}
```
