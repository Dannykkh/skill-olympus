#!/bin/bash
# spawn-worker.sh
# Orchestrator Worker를 새 터미널에서 실행하는 스크립트
# 멀티AI 지원: Claude, Codex, Gemini
#
# 사용법:
#   ./spawn-worker.sh <worker-id> <project-root> <auto-terminate> <ai-provider>
#   ./spawn-worker.sh worker-1 /path/to/project 1 claude

WORKER_ID="${1:-worker-$(date +%s)}"
PROJECT_ROOT="${2:-$(pwd)}"
AUTO_TERMINATE="${3:-1}"
AI_PROVIDER="${4:-claude}"

# 환경 변수 설정
export ORCHESTRATOR_WORKER_ID="$WORKER_ID"
export ORCHESTRATOR_PROJECT_ROOT="$PROJECT_ROOT"

echo ""
echo "========================================"
echo "  Orchestrator Worker Starting..."
echo "========================================"
echo ""
echo "Worker ID: $WORKER_ID"
echo "AI Provider: $AI_PROVIDER"
echo "Project: $PROJECT_ROOT"
echo "Auto-terminate: $([ "$AUTO_TERMINATE" = "1" ] && echo "true" || echo "false")"
echo ""

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
cd "$PROJECT_ROOT" || exit 1

# AI Provider별 CLI 실행
case "$AI_PROVIDER" in
    claude)
        if ! command -v claude &> /dev/null; then
            echo "ERROR: claude command not found."
            exit 1
        fi
        echo "Starting Claude Code..."
        echo "$SYSTEM_PROMPT" | claude --dangerously-skip-permissions
        ;;
    codex)
        if ! command -v codex &> /dev/null; then
            echo "ERROR: codex command not found."
            exit 1
        fi
        echo "Starting Codex CLI..."
        codex --full-auto --approval-mode full-auto -q "$SYSTEM_PROMPT"
        ;;
    gemini)
        if ! command -v gemini &> /dev/null; then
            echo "ERROR: gemini command not found."
            exit 1
        fi
        echo "Starting Gemini CLI..."
        echo "$SYSTEM_PROMPT" | gemini
        ;;
    *)
        echo "ERROR: Unknown AI provider: $AI_PROVIDER (claude|codex|gemini)"
        exit 1
        ;;
esac

# 자동 종료가 비활성화된 경우 대기
if [ "$AUTO_TERMINATE" = "0" ]; then
    echo ""
    echo "Worker finished. Press any key to close..."
    read -n 1 -s
fi
