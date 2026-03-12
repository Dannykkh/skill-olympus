#!/bin/bash
# loop-stop.sh - Stop 훅: 루프 활성화 시 세션 종료를 가로채서 같은 프롬프트를 재투입
# 상태 파일: .claude/loop-state.md

set -euo pipefail

HOOK_INPUT=$(cat)

STATE_FILE=".claude/loop-state.md"

# 상태 파일 없으면 루프 비활성 — 그냥 통과
if [ ! -f "$STATE_FILE" ]; then
    exit 0
fi

# frontmatter 파싱
FRONTMATTER=$(sed -n '/^---$/,/^---$/{ /^---$/d; p; }' "$STATE_FILE")
ITERATION=$(echo "$FRONTMATTER" | grep '^iteration:' | sed 's/iteration: *//')
MAX_ITERATIONS=$(echo "$FRONTMATTER" | grep '^max_iterations:' | sed 's/max_iterations: *//')
COMPLETION_PROMISE=$(echo "$FRONTMATTER" | grep '^completion_promise:' | sed 's/completion_promise: *//' | sed 's/^"\(.*\)"$/\1/')

# 세션 격리: 다른 세션의 루프와 충돌 방지
STATE_SESSION=$(echo "$FRONTMATTER" | grep '^session_id:' | sed 's/session_id: *//' || true)
HOOK_SESSION=$(echo "$HOOK_INPUT" | jq -r '.session_id // ""')
if [ -n "$STATE_SESSION" ] && [ "$STATE_SESSION" != "$HOOK_SESSION" ]; then
    exit 0
fi

# 숫자 검증 — 손상된 상태 파일 보호
if ! [[ "$ITERATION" =~ ^[0-9]+$ ]]; then
    echo "loop: 상태 파일이 손상되었습니다. 루프를 중단합니다." >&2
    rm "$STATE_FILE"
    exit 0
fi
if ! [[ "$MAX_ITERATIONS" =~ ^[0-9]+$ ]]; then
    echo "loop: 상태 파일이 손상되었습니다. 루프를 중단합니다." >&2
    rm "$STATE_FILE"
    exit 0
fi

# 최대 반복 횟수 도달
if [ "$MAX_ITERATIONS" -gt 0 ] && [ "$ITERATION" -ge "$MAX_ITERATIONS" ]; then
    echo "loop: 최대 반복 횟수($MAX_ITERATIONS)에 도달했습니다."
    rm "$STATE_FILE"
    exit 0
fi

# 트랜스크립트에서 마지막 assistant 메시지 추출
TRANSCRIPT_PATH=$(echo "$HOOK_INPUT" | jq -r '.transcript_path')
if [ ! -f "$TRANSCRIPT_PATH" ]; then
    echo "loop: 트랜스크립트를 찾을 수 없습니다. 루프를 중단합니다." >&2
    rm "$STATE_FILE"
    exit 0
fi

if ! grep -q '"role":"assistant"' "$TRANSCRIPT_PATH"; then
    echo "loop: assistant 메시지를 찾을 수 없습니다. 루프를 중단합니다." >&2
    rm "$STATE_FILE"
    exit 0
fi

LAST_LINES=$(grep '"role":"assistant"' "$TRANSCRIPT_PATH" | tail -n 100)
if [ -z "$LAST_LINES" ]; then
    rm "$STATE_FILE"
    exit 0
fi

set +e
LAST_OUTPUT=$(echo "$LAST_LINES" | jq -rs '
  map(.message.content[]? | select(.type == "text") | .text) | last // ""
' 2>&1)
JQ_EXIT=$?
set -e

if [ $JQ_EXIT -ne 0 ]; then
    echo "loop: JSON 파싱 실패. 루프를 중단합니다." >&2
    rm "$STATE_FILE"
    exit 0
fi

# 완료 감지 1: AI가 "더 이상 할 게 없다" 패턴 출력
if echo "$LAST_OUTPUT" | grep -qiE '(Chronos Complete|더 이상.*(할|수정할|고칠).*(없|작업이 없)|all issues.*fixed|no more.*issues|남은.*이슈.*없|모든.*이슈.*수정.*완료|모든.*작업.*완료)'; then
    echo "loop: AI가 작업 완료를 보고했습니다. 루프를 종료합니다."
    rm "$STATE_FILE"
    exit 0
fi

# 완료 감지 2: <promise>텍스트</promise> 매칭
if [ "$COMPLETION_PROMISE" != "null" ] && [ -n "$COMPLETION_PROMISE" ]; then
    PROMISE_TEXT=$(echo "$LAST_OUTPUT" | perl -0777 -pe 's/.*?<promise>(.*?)<\/promise>.*/$1/s; s/^\s+|\s+$//g; s/\s+/ /g' 2>/dev/null || echo "")

    if [ -n "$PROMISE_TEXT" ] && [ "$PROMISE_TEXT" = "$COMPLETION_PROMISE" ]; then
        echo "loop: 완료 조건 달성! <promise>$COMPLETION_PROMISE</promise>"
        rm "$STATE_FILE"
        exit 0
    fi
fi

# 다음 반복으로 진행
NEXT_ITERATION=$((ITERATION + 1))

# frontmatter 이후의 프롬프트 본문 추출
PROMPT_TEXT=$(awk '/^---$/{i++; next} i>=2' "$STATE_FILE")
if [ -z "$PROMPT_TEXT" ]; then
    echo "loop: 프롬프트를 찾을 수 없습니다. 루프를 중단합니다." >&2
    rm "$STATE_FILE"
    exit 0
fi

# iteration 카운터 업데이트
TEMP_FILE="${STATE_FILE}.tmp.$$"
sed "s/^iteration: .*/iteration: $NEXT_ITERATION/" "$STATE_FILE" > "$TEMP_FILE"
mv "$TEMP_FILE" "$STATE_FILE"

# 시스템 메시지 구성
MAX_LABEL=$([ "$MAX_ITERATIONS" -gt 0 ] && echo "${MAX_ITERATIONS}회" || echo "무제한")
COMMON_MSG="Chronos loop ${NEXT_ITERATION}/${MAX_LABEL} | 이전 작업 결과를 확인하고 다음 할 일을 찾아 진행하세요. 더 이상 할 작업이 없으면 반드시 'Chronos Complete'를 포함하여 최종 보고를 출력하세요."

if [ "$COMPLETION_PROMISE" != "null" ] && [ -n "$COMPLETION_PROMISE" ]; then
    SYSTEM_MSG="${COMMON_MSG} 또는 완료 조건 달성 시: <promise>$COMPLETION_PROMISE</promise>"
else
    SYSTEM_MSG="$COMMON_MSG"
fi

# Stop 훅 block 응답: 같은 프롬프트를 다시 투입
jq -n \
    --arg prompt "$PROMPT_TEXT" \
    --arg msg "$SYSTEM_MSG" \
    '{
        "decision": "block",
        "reason": $prompt,
        "systemMessage": $msg
    }'

exit 0
