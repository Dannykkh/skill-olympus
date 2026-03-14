#!/bin/bash
# spawn-worker.sh
# Orchestrator Worker를 새 터미널에서 실행하는 스크립트
# 멀티AI 지원: Claude, Codex, Gemini
#
# 사용법:
#   ./spawn-worker.sh <worker-id> <project-root> <auto-terminate> <ai-provider> <log-file>
#   ./spawn-worker.sh worker-1 /path/to/project 1 claude /path/to/worker.log

WORKER_ID="${1:-worker-$(date +%s)}"
PROJECT_ROOT="${2:-$(pwd)}"
AUTO_TERMINATE="${3:-1}"
AI_PROVIDER="${4:-claude}"
LOG_FILE="${5:-}"

# 로그 함수 — 콘솔 + 파일 동시 출력
write_log() {
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "$1"
    if [ -n "$LOG_FILE" ]; then
        echo "[$timestamp] $1" >> "$LOG_FILE" 2>/dev/null
    fi
}

# 환경 변수 설정
export ORCHESTRATOR_WORKER_ID="$WORKER_ID"
export ORCHESTRATOR_PROJECT_ROOT="$PROJECT_ROOT"

write_log ""
write_log "========================================"
write_log "  Orchestrator Worker Starting..."
write_log "========================================"
write_log ""
write_log "Worker ID: $WORKER_ID"
write_log "AI Provider: $AI_PROVIDER"
write_log "Project: $PROJECT_ROOT"
write_log "Auto-terminate: $([ "$AUTO_TERMINATE" = "1" ] && echo "true" || echo "false")"
write_log "Log: $LOG_FILE"
write_log ""

# Worker 시스템 프롬프트
SYSTEM_PROMPT="당신은 Orchestrator Worker입니다. Worker ID: $WORKER_ID

## 자동 모드
1. orchestrator_get_available_tasks로 사용 가능한 태스크 확인
2. 태스크가 있으면 orchestrator_claim_task로 담당 선언
3. 태스크 수행 (코드 작성, 파일 수정 등)
4. orchestrator_complete_task 또는 orchestrator_fail_task로 완료 보고
5. 반복

## 자동 종료 조건
- allTasksCompleted가 true면 즉시 종료
- hasRemainingWork가 false이고 availableTasks가 비어있으면 대기 후 재확인

## 중요 규칙
- 파일 수정 전 반드시 orchestrator_lock_file 호출
- 작업 완료 시 모든 락은 자동 해제됨
- 에러 발생 시 orchestrator_fail_task로 보고

지금 바로 orchestrator_get_available_tasks를 호출하여 작업을 시작하세요."

# 프로젝트 디렉토리로 이동
if [ ! -d "$PROJECT_ROOT" ]; then
    write_log "ERROR: Project root not found: $PROJECT_ROOT"
    exit 1
fi
cd "$PROJECT_ROOT" || exit 1

# AI Provider별 CLI 실행
case "$AI_PROVIDER" in
    claude)
        if ! command -v claude &> /dev/null; then
            write_log "ERROR: claude command not found in PATH"
            exit 1
        fi
        write_log "CLI_STARTED: Claude Code at $(command -v claude)"
        # -p 플래그로 프롬프트 직접 전달 (stdin 파이프 문제 회피)
        claude -p "$SYSTEM_PROMPT" --dangerously-skip-permissions
        ;;
    codex)
        if ! command -v codex &> /dev/null; then
            write_log "ERROR: codex command not found in PATH"
            exit 1
        fi
        write_log "CLI_STARTED: Codex CLI at $(command -v codex)"
        codex --full-auto --approval-mode full-auto -q "$SYSTEM_PROMPT"
        ;;
    gemini)
        if ! command -v gemini &> /dev/null; then
            write_log "ERROR: gemini command not found in PATH"
            exit 1
        fi
        write_log "CLI_STARTED: Gemini CLI at $(command -v gemini)"
        echo "$SYSTEM_PROMPT" | gemini
        ;;
    *)
        write_log "ERROR: Unknown AI provider: $AI_PROVIDER (claude|codex|gemini)"
        exit 1
        ;;
esac

write_log "Worker $WORKER_ID finished successfully"

# 자동 종료가 비활성화된 경우 대기
if [ "$AUTO_TERMINATE" = "0" ]; then
    echo ""
    echo "Worker finished. Press any key to close..."
    read -n 1 -s
fi
