#!/bin/bash
# loop-stop.sh - Stop 훅: 루프 활성화 시 세션 종료를 가로채서 같은 프롬프트를 재투입
# 상태 파일: .claude/.codex/.chronos/loop-state.md 중 먼저 발견된 것
# (CLI별 setup-loop가 자기 디렉토리에 만들기 때문에 3곳 모두 검사해야 모든 CLI에서 작동)

# Grok 세션 가드: Grok Stop 페이로드는 camelCase라 재투입 판단 불가 -> Grok 네이티브 기능 사용.
[ -n "${GROK_HOOK_EVENT:-}" ] && exit 0

set -euo pipefail

HOOK_INPUT=$(cat)

# 상태 파일 탐색: Claude(.claude), Codex(.codex), Gemini(.chronos) 순.
# 이전에는 ".claude/loop-state.md"만 봐서 Gemini 세션의 .chronos 상태를 못 찾는 버그가 있었음.
STATE_FILE=""
for candidate in ".claude/loop-state.md" ".codex/loop-state.md" ".chronos/loop-state.md"; do
    if [ -f "$candidate" ]; then
        STATE_FILE="$candidate"
        break
    fi
done

# 상태 파일 없으면 루프 비활성 — 그냥 통과
if [ -z "$STATE_FILE" ]; then
    exit 0
fi

# frontmatter 파싱
FRONTMATTER=$(sed -n '/^---$/,/^---$/{ /^---$/d; p; }' "$STATE_FILE")
ITERATION=$(echo "$FRONTMATTER" | grep '^iteration:' | sed 's/iteration: *//')
MAX_ITERATIONS=$(echo "$FRONTMATTER" | grep '^max_iterations:' | sed 's/max_iterations: *//')
COMPLETION_PROMISE=$(echo "$FRONTMATTER" | grep '^completion_promise:' | sed 's/completion_promise: *//' | sed 's/^"\(.*\)"$/\1/')

# stale 감지: started_at이 2시간 이상 지났으면 자동 비활성화
STARTED_AT=$(echo "$FRONTMATTER" | grep '^started_at:' | sed 's/started_at: *//' | sed 's/^"\(.*\)"$/\1/' || true)
if [ -n "$STARTED_AT" ]; then
    STARTED_EPOCH=$(date -d "$STARTED_AT" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%S" "${STARTED_AT%%Z*}" +%s 2>/dev/null || echo "")
    if [ -n "$STARTED_EPOCH" ]; then
        NOW_EPOCH=$(date +%s)
        ELAPSED=$(( NOW_EPOCH - STARTED_EPOCH ))
        if [ "$ELAPSED" -ge 7200 ]; then
            rm "$STATE_FILE"
            jq -n --arg msg "Chronos EXHAUSTED: 2시간 초과 stale 루프 자동 종료 — 완료(success)가 아니라 미완료입니다. 이어서 진행하려면 /chronos를 다시 실행하세요." '{systemMessage: $msg}'
            exit 0
        fi
    fi
fi

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

# 최대 반복 횟수 도달 — EXHAUSTED(미완료)로 종료. 성공과 구별되게 사유를 표면화한다.
if [ "$MAX_ITERATIONS" -gt 0 ] && [ "$ITERATION" -ge "$MAX_ITERATIONS" ]; then
    rm "$STATE_FILE"
    jq -n --arg msg "Chronos EXHAUSTED: 최대 반복($MAX_ITERATIONS) 소진으로 종료 — 완료(success)가 아니라 미완료입니다. 마지막 보고가 'Chronos Complete'/<promise>가 아니면 작업은 끝나지 않은 것입니다. 이어서 진행하려면 /chronos를 다시 실행하세요." '{systemMessage: $msg}'
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

# 완료 감지 1: AI가 'Chronos Complete' 마커 출력
# 명시적 마커만 검사하므로 tail-500 가드는 불필요 (전체 출력 검사).
# 가드가 있으면 마커 뒤에 긴 설명/표/태그가 붙을 때 미탐(끝 500자 밖으로 밀림)이 발생.
if echo "$LAST_OUTPUT" | grep -qiE 'Chronos Complete'; then
    echo "loop: AI가 작업 완료를 보고했습니다. 루프를 종료합니다."
    rm "$STATE_FILE"
    exit 0
fi

# 완료 감지 2: <promise>텍스트</promise> 매칭 (전체 출력, 포함 매칭)
# 내용이 일치하지 않는 promise는 종료로 인정하지 않는다 — 거짓/불일치 promise를 종료로
# 보상하면 검증 게이트가 무력화됨 (SKILL.md "거짓 promise 출력 금지"와 짝).
# 불일치 시 루프가 계속 돌고, 재투입 systemMessage가 정확한 promise 문구를 다시 알려준다 (max_iterations 상한).
# ("태그만 있으면 완료" 분기는 불일치 promise까지 종료시키는 효과뿐이라 제거함)
if [ "$COMPLETION_PROMISE" != "null" ] && [ -n "$COMPLETION_PROMISE" ]; then
    PROMISE_TEXT=$(echo "$LAST_OUTPUT" | perl -0777 -pe 's/.*?<promise>(.*?)<\/promise>.*/$1/s; s/^\s+|\s+$//g; s/\s+/ /g' 2>/dev/null || echo "")

    if [ -n "$PROMISE_TEXT" ]; then
        # 정확 일치 또는 포함 매칭
        if [ "$PROMISE_TEXT" = "$COMPLETION_PROMISE" ] || echo "$PROMISE_TEXT" | grep -qF "$COMPLETION_PROMISE" || echo "$COMPLETION_PROMISE" | grep -qF "$PROMISE_TEXT"; then
            echo "loop: 완료 조건 달성! <promise>$PROMISE_TEXT</promise>"
            rm "$STATE_FILE"
            exit 0
        fi
        echo "loop: <promise> 내용 불일치 — 종료로 인정하지 않음 (기대: $COMPLETION_PROMISE)"
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
COMMON_MSG="Chronos loop ${NEXT_ITERATION}/${MAX_LABEL} | 이전 작업 결과를 확인하고 다음 할 일을 찾아 진행하세요. 막힌 이슈는 사유와 함께 로그에 주차(Parked:)하고 다음 이슈로 넘어가세요 — 주차된 이슈는 할 작업으로 세지 않습니다. 더 이상 할 작업이 없으면 반드시 'Chronos Complete'를 포함한 최종 보고(주차 이슈마다 Owner Decision Brief)를 출력하세요."

if [ "$COMPLETION_PROMISE" != "null" ] && [ -n "$COMPLETION_PROMISE" ]; then
    SYSTEM_MSG="${COMMON_MSG} 또는 완료 조건 달성 시(검증 PASS를 실제로 확인한 후에만): <promise>$COMPLETION_PROMISE</promise>"
else
    SYSTEM_MSG="$COMMON_MSG"
fi

# 마지막 허용 반복이면(다음 턴이 상한) exhausted 정직 보고를 경고로 주입한다.
if [ "$MAX_ITERATIONS" -gt 0 ] && [ "$NEXT_ITERATION" -ge "$MAX_ITERATIONS" ]; then
    SYSTEM_MSG="${SYSTEM_MSG} | 주의: 이번이 마지막 허용 반복(${NEXT_ITERATION}/${MAX_ITERATIONS})입니다. 작업이 끝나지 않았다면 더 손대지 말고 지금까지를 EXHAUSTED(미완)로 정직하게 보고하세요 — 요구사항→증거 표를 남기고, 검증 PASS를 실제로 확인하지 않았다면 <promise>나 'Chronos Complete'를 출력하지 마세요(거짓 완료 금지)."
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
