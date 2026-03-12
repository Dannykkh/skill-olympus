#!/bin/bash
# setup-loop.sh — Chronos 강제 루프 시작
# 상태 파일을 생성하고, Stop 훅(loop-stop.sh)이 세션 종료를 가로채게 함

set -euo pipefail

PROMPT_PARTS=()
MAX_ITERATIONS=50
COMPLETION_PROMISE="null"

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            cat << 'HELP_EOF'
Chronos Loop — AI가 반복하며 작업을 완성합니다

사용법:
  /loop 할일 [옵션]

옵션:
  --max-iterations <횟수>         최대 반복 횟수 (기본: 무제한)
  --completion-promise '<조건>'   완료 조건 (여러 단어면 따옴표로 감싸세요)
  -h, --help                     도움말

예시:
  /loop TODO API 만들어줘 --completion-promise '모든 테스트 통과' --max-iterations 20
  /loop --max-iterations 10 인증 버그 고쳐줘
  /loop 캐시 레이어 리팩토링해줘

중단:
  /cancel-loop
HELP_EOF
            exit 0
            ;;
        --max-iterations)
            if [[ -z "${2:-}" ]] || ! [[ "$2" =~ ^[0-9]+$ ]]; then
                echo "max-iterations에는 숫자를 넣어주세요. (예: --max-iterations 20)" >&2
                exit 1
            fi
            MAX_ITERATIONS="$2"
            shift 2
            ;;
        --completion-promise)
            if [[ -z "${2:-}" ]]; then
                echo "completion-promise에 완료 조건을 넣어주세요. (예: --completion-promise '모든 테스트 통과')" >&2
                exit 1
            fi
            COMPLETION_PROMISE="$2"
            shift 2
            ;;
        *)
            PROMPT_PARTS+=("$1")
            shift
            ;;
    esac
done

PROMPT="${PROMPT_PARTS[*]}"

if [[ -z "$PROMPT" ]]; then
    echo "할 일을 알려주세요!" >&2
    echo "" >&2
    echo "  예시: /loop TODO API 만들어줘 --max-iterations 20" >&2
    echo "  도움말: /loop --help" >&2
    exit 1
fi

mkdir -p .claude

# completion_promise YAML 형식
if [[ -n "$COMPLETION_PROMISE" ]] && [[ "$COMPLETION_PROMISE" != "null" ]]; then
    CP_YAML="\"$COMPLETION_PROMISE\""
else
    CP_YAML="null"
fi

cat > .claude/loop-state.md <<EOF
---
active: true
iteration: 1
session_id: ${CLAUDE_CODE_SESSION_ID:-}
last_turn_id: ""
max_iterations: $MAX_ITERATIONS
completion_promise: $CP_YAML
started_at: "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
---

$PROMPT
EOF

cat <<EOF
Chronos Loop 시작

반복: 1회차
최대 반복: $(if [[ $MAX_ITERATIONS -gt 0 ]]; then echo "${MAX_ITERATIONS}회"; else echo "무제한"; fi)
완료 조건: $(if [[ "$COMPLETION_PROMISE" != "null" ]]; then echo "$COMPLETION_PROMISE"; else echo "없음"; fi)

AI가 작업 → 끝내려 함 → Stop 훅이 가로채서 같은 프롬프트 재투입
매 반복마다 이전 결과를 보면서 점진적으로 완성도를 높입니다.

중단: /cancel-loop

EOF

echo "$PROMPT"

if [[ "$COMPLETION_PROMISE" != "null" ]]; then
    echo ""
    echo "════════════════════════════════════════"
    echo "  완료하려면 이걸 출력하세요:"
    echo "  <promise>$COMPLETION_PROMISE</promise>"
    echo ""
    echo "  진짜 완료됐을 때만 출력하세요!"
    echo "════════════════════════════════════════"
fi
