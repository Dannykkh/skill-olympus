#!/bin/bash
# notify-complete.sh - 작업 완료 시 OS 알림
# macOS: osascript / Linux: notify-send

TITLE="${AGENT_NOTIFY_TITLE:-Claude Code}"
MSG="${AGENT_NOTIFY_MESSAGE:-작업이 완료되었습니다}"
OSA_TITLE="${TITLE//\"/\\\"}"
OSA_MSG="${MSG//\"/\\\"}"

if [[ "$OSTYPE" == "darwin"* ]]; then
    osascript -e "display notification \"$OSA_MSG\" with title \"$OSA_TITLE\" sound name \"Glass\"" 2>/dev/null
elif command -v notify-send &>/dev/null; then
    notify-send "$TITLE" "$MSG" 2>/dev/null
fi

exit 0
