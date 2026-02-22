#!/bin/bash
# save-turn.sh - Codex notify orchestrator
# Role split:
# - append-user.sh: persist user message
# - append-assistant.sh: persist assistant message

DEBUG_FILE="$HOME/.codex/hooks/save-turn-debug.log"

debug_log() {
    mkdir -p "$(dirname "$DEBUG_FILE")" 2>/dev/null || true
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$DEBUG_FILE" 2>/dev/null || true
}

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ ! -f "$SCRIPT_DIR/append-user.sh" ] || [ ! -f "$SCRIPT_DIR/append-assistant.sh" ]; then
    debug_log "skip: helper scripts not found in $SCRIPT_DIR"
    exit 0
fi
source "$SCRIPT_DIR/append-user.sh"
source "$SCRIPT_DIR/append-assistant.sh"

PAYLOAD="${@: -1}"
if [ -z "$PAYLOAD" ]; then
    PAYLOAD="$(cat 2>/dev/null)"
fi
if [ -n "$PAYLOAD" ] && [ -f "$PAYLOAD" ]; then
    PAYLOAD="$(cat "$PAYLOAD" 2>/dev/null)"
fi
if [ -z "$PAYLOAD" ]; then
    debug_log "skip: payload parse failed, pwd=$PWD"
    exit 0
fi

json_get() {
    local key="$1"
    if command -v jq &>/dev/null; then
        echo "$PAYLOAD" | jq -r "$key // empty" 2>/dev/null
    elif command -v python3 &>/dev/null; then
        echo "$PAYLOAD" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    keys = '$key'.strip('.').split('.')
    val = d
    for k in keys:
        k = k.strip('\"')
        if k == '[]':
            val = '\n'.join(str(v) for v in val) if isinstance(val, list) else str(val)
            break
        if isinstance(val, dict):
            val = val.get(k, '')
        else:
            val = ''
        if val == '': break
    print(val if val else '')
except: pass
" 2>/dev/null
    fi
}

json_join_array() {
    local key="$1"
    if command -v jq &>/dev/null; then
        echo "$PAYLOAD" | jq -r ".[\"$key\"] // [] | if type == \"array\" then .[] else . end" 2>/dev/null
    elif command -v python3 &>/dev/null; then
        echo "$PAYLOAD" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    val = d.get('$key', [])
    if isinstance(val, list):
        print('\n'.join(str(v) for v in val))
    else:
        print(str(val))
except: pass
" 2>/dev/null
    fi
}

TURN_ID="$(json_get '."turn-id"')"
if [ -z "$TURN_ID" ]; then
    TURN_ID="$(json_get '.turn_id')"
fi

# input-messages가 배열이면 마지막 요소만 추출 (Codex는 누적 전달)
if command -v jq &>/dev/null; then
    USER_TEXT="$(echo "$PAYLOAD" | jq -r '
        (."input-messages" // .input_messages // null)
        | if type == "array" and length > 0 then .[-1]
          elif type == "string" then .
          else empty end
        | if type == "object" then (.text // .content // empty)
          elif type == "array" then map(if type == "object" then (.text // .content // empty) else . end) | join("\n")
          else . end
    ' 2>/dev/null)"
fi
if [ -z "$USER_TEXT" ]; then
    USER_TEXT="$(json_get '."input-messages"')"
fi
if [ -z "$USER_TEXT" ]; then
    USER_TEXT="$(json_get '.input_messages')"
fi
USER_TEXT="$(echo "$USER_TEXT" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"

RESPONSE="$(json_get '."last-assistant-message"')"
if [ -z "$RESPONSE" ]; then
    RESPONSE="$(json_get '.last_assistant_message')"
fi
RESPONSE="$(echo "$RESPONSE" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"

if [ -z "$USER_TEXT" ] && { [ -z "$RESPONSE" ] || [ ${#RESPONSE} -lt 5 ]; }; then
    debug_log "skip: empty turn, pwd=$PWD"
    exit 0
fi

BASE_DIR=""
for key in '."cwd"' '."working-directory"' '.working_directory' '."project-root"' '.project_root' '."workspace-root"' '.workspace_root'; do
    v="$(json_get "$key")"
    if [ -n "$v" ] && [ -d "$v" ]; then
        BASE_DIR="$v"
        break
    fi
done
if [ -z "$BASE_DIR" ] && [ -n "$CODEX_WORKSPACE_ROOT" ] && [ -d "$CODEX_WORKSPACE_ROOT" ]; then
    BASE_DIR="$CODEX_WORKSPACE_ROOT"
fi
if [ -z "$BASE_DIR" ]; then
    BASE_DIR="$PWD"
fi

CONV_DIR="$BASE_DIR/conversations"
TODAY="$(date +%Y-%m-%d)"
CONV_FILE="$CONV_DIR/$TODAY-codex.md"
PROJECT_NAME="$(basename "$BASE_DIR")"

mkdir -p "$CONV_DIR"

if [ ! -f "$CONV_FILE" ]; then
    cat > "$CONV_FILE" << EOF
---
date: $TODAY
project: $PROJECT_NAME
keywords: []
summary: ""
---

# $TODAY

EOF
fi

if [ -n "$TURN_ID" ] && grep -qF "<!-- turn:$TURN_ID -->" "$CONV_FILE" 2>/dev/null; then
    debug_log "skip: duplicate turnId=$TURN_ID"
    exit 0
fi

TIMESTAMP="$(date +%H:%M:%S)"
append_user_entry "$CONV_FILE" "$TIMESTAMP" "$USER_TEXT"
append_assistant_entry "$CONV_FILE" "$TIMESTAMP" "$RESPONSE"

if [ -n "$TURN_ID" ]; then
    echo "<!-- turn:$TURN_ID -->" >> "$CONV_FILE"
fi

debug_log "saved: baseDir=$BASE_DIR, file=$CONV_FILE, userLen=${#USER_TEXT}, respLen=${#RESPONSE}, turnId=$TURN_ID"
