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

run_notification_hook() {
    local title="${1:-Codex CLI}"
    local message="${2:-작업이 완료되었습니다}"
    local notify_hook="$HOME/.codex/hooks/ddingdong-noti.sh"
    if [ ! -f "$notify_hook" ]; then
        return 0
    fi

    if ! AGENT_NOTIFY_TITLE="$title" AGENT_NOTIFY_MESSAGE="$message" bash "$notify_hook"; then
        debug_log "notify-chain-failed: $notify_hook"
    fi
}

get_node_cmd() {
    if command -v node >/dev/null 2>&1; then
        command -v node
        return 0
    fi
    if command -v node.exe >/dev/null 2>&1; then
        command -v node.exe
        return 0
    fi
    return 1
}

run_hook_bridge() {
    local base_dir="$1"
    local bridge="$SCRIPT_DIR/codex-hook-bridge.js"
    local node_cmd=""
    local output=""

    if [ ! -f "$bridge" ]; then
        printf '%s' '{"warnings":0,"errors":0,"touchedFiles":[],"newFiles":[],"messages":[]}'
        return 0
    fi

    node_cmd="$(get_node_cmd || true)"
    if [ -z "$node_cmd" ]; then
        debug_log "hook-bridge-skip: node not found"
        printf '%s' '{"warnings":0,"errors":0,"touchedFiles":[],"newFiles":[],"messages":[]}'
        return 0
    fi

    if ! output="$(printf '%s' "$PAYLOAD" | "$node_cmd" "$bridge" "--base-dir=$base_dir" 2>&1)"; then
        debug_log "hook-bridge-failed: $output"
        printf '%s' '{"warnings":0,"errors":0,"touchedFiles":[],"newFiles":[],"messages":[]}'
        return 0
    fi

    if [ -z "$output" ]; then
        printf '%s' '{"warnings":0,"errors":0,"touchedFiles":[],"newFiles":[],"messages":[]}'
        return 0
    fi

    printf '%s' "$output"
}

summary_field() {
    local json="$1"
    local field="$2"

    if command -v jq >/dev/null 2>&1; then
        printf '%s' "$json" | jq -r ".$field // 0" 2>/dev/null
        return 0
    fi

    if command -v python3 >/dev/null 2>&1; then
        SUMMARY_JSON="$json" python3 - "$field" <<'PY'
import json
import os
import sys

text = os.environ.get("SUMMARY_JSON", "")
field = sys.argv[1]
try:
    data = json.loads(text)
except Exception:
    print(0)
    sys.exit(0)

value = data.get(field, 0)
if isinstance(value, list):
    print(len(value))
else:
    print(value)
PY
        return 0
    fi

    local node_cmd=""
    node_cmd="$(get_node_cmd || true)"
    if [ -n "$node_cmd" ]; then
        SUMMARY_JSON="$json" "$node_cmd" - "$field" <<'JS'
const text = process.env.SUMMARY_JSON || "";
const field = process.argv[2];
try {
  const data = JSON.parse(text);
  const value = data[field] ?? 0;
  process.stdout.write(String(Array.isArray(value) ? value.length : value));
} catch {
  process.stdout.write("0");
}
JS
        return 0
    fi

    printf '0'
}

ensure_memory_scaffold() {
    local base_dir="$1"
    local memory_dir="$base_dir/memory"
    local project_name
    local today

    project_name="$(basename "$base_dir")"
    today="$(date +%Y-%m-%d)"

    mkdir -p "$memory_dir"

    if [ ! -f "$base_dir/MEMORY.md" ]; then
        cat > "$base_dir/MEMORY.md" << EOF
# MEMORY.md - 프로젝트 장기기억

## 프로젝트 목표

| 목표 | 상태 |
|------|------|
| $project_name 핵심 작업 추적 | 진행 중 |

---

## 키워드 인덱스

| 키워드 | 상세 파일 |
|--------|-----------|
| 프로젝트, 생성일 | #meta |

---

## architecture/
- [memory/architecture.md](memory/architecture.md)

## patterns/
- [memory/patterns.md](memory/patterns.md)

## tools/
- [memory/tools.md](memory/tools.md)

## gotchas/
- [memory/gotchas.md](memory/gotchas.md)

---

## meta/
- **프로젝트**: $project_name
- **생성일**: $today
- **마지막 업데이트**: $today
EOF
    fi

    if [ ! -f "$memory_dir/architecture.md" ]; then
        cat > "$memory_dir/architecture.md" << 'EOF'
# Architecture - 설계 결정

> MEMORY.md 키워드 인덱스에서 이 파일로 연결됩니다.

---
EOF
    fi

    if [ ! -f "$memory_dir/patterns.md" ]; then
        cat > "$memory_dir/patterns.md" << 'EOF'
# Patterns - 작업 패턴, 워크플로우

> MEMORY.md 키워드 인덱스에서 이 파일로 연결됩니다.

---
EOF
    fi

    if [ ! -f "$memory_dir/tools.md" ]; then
        cat > "$memory_dir/tools.md" << 'EOF'
# Tools - MCP 서버, 외부 도구, 라이브러리

> MEMORY.md 키워드 인덱스에서 이 파일로 연결됩니다.

---
EOF
    fi

    if [ ! -f "$memory_dir/gotchas.md" ]; then
        cat > "$memory_dir/gotchas.md" << 'EOF'
# Gotchas - 주의사항, 함정

> MEMORY.md 키워드 인덱스에서 이 파일로 연결됩니다.

---
EOF
    fi
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

# <private> 블록 제거 (민감 정보 보호)
if [ -n "$USER_TEXT" ]; then
    USER_TEXT=$(echo "$USER_TEXT" | perl -0pe 's/<private>.*?<\/private>/[PRIVATE]/gs' 2>/dev/null || echo "$USER_TEXT" | sed 's/<private>[^<]*<\/private>/[PRIVATE]/g')
fi
if [ -n "$RESPONSE" ]; then
    RESPONSE=$(echo "$RESPONSE" | perl -0pe 's/<private>.*?<\/private>/[PRIVATE]/gs' 2>/dev/null || echo "$RESPONSE" | sed 's/<private>[^<]*<\/private>/[PRIVATE]/g')
fi

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

ensure_memory_scaffold "$BASE_DIR"

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
HOOK_SUMMARY="$(run_hook_bridge "$BASE_DIR")"
HOOK_WARNINGS="$(summary_field "$HOOK_SUMMARY" "warnings" | tr -d '\r\n')"
HOOK_ERRORS="$(summary_field "$HOOK_SUMMARY" "errors" | tr -d '\r\n')"
HOOK_WARNINGS="${HOOK_WARNINGS:-0}"
HOOK_ERRORS="${HOOK_ERRORS:-0}"

NOTIFY_TITLE="Codex CLI"
NOTIFY_MESSAGE="작업이 완료되었습니다"
if [ "$HOOK_ERRORS" -gt 0 ] 2>/dev/null; then
    NOTIFY_TITLE="Codex Hook Alert"
    NOTIFY_MESSAGE="작업 완료, hook 오류 ${HOOK_ERRORS}개"
    if [ "$HOOK_WARNINGS" -gt 0 ] 2>/dev/null; then
        NOTIFY_MESSAGE="${NOTIFY_MESSAGE} / 경고 ${HOOK_WARNINGS}개"
    fi
elif [ "$HOOK_WARNINGS" -gt 0 ] 2>/dev/null; then
    NOTIFY_MESSAGE="작업 완료, hook 경고 ${HOOK_WARNINGS}개"
fi
run_notification_hook "$NOTIFY_TITLE" "$NOTIFY_MESSAGE"

# ─────────────────────────────────────────────
# Gotchas/Learned 관찰 기록 (memory/gotchas/ + memory/learned/)
# 응답 텍스트에서 에러/성공 패턴을 감지하여 observations.jsonl에 기록
# ─────────────────────────────────────────────
if [ -n "$RESPONSE" ] && [ -n "$BASE_DIR" ]; then
    OBS_EVENT_TYPE=""
    OBS_TARGET_DIR=""

    if echo "$RESPONSE" | grep -qiE '(error|fail|exception|denied|not found|cannot|unable|ENOENT|ERR_)' 2>/dev/null; then
        OBS_TARGET_DIR="$BASE_DIR/memory/gotchas"
        OBS_EVENT_TYPE="turn_error"
    else
        OBS_TARGET_DIR="$BASE_DIR/memory/learned"
        OBS_EVENT_TYPE="turn_success"
    fi

    mkdir -p "$OBS_TARGET_DIR"
    OBS_FILE="$OBS_TARGET_DIR/observations.jsonl"

    SAFE_RESPONSE="$(echo "$RESPONSE" | head -c 3000 | sed -E 's/(api[_-]?key|token|secret|password|authorization)([\"'"'"' :=]+)[A-Za-z0-9_\\/\\.+=]{8,}/\1\2[REDACTED]/gi' 2>/dev/null || echo "$RESPONSE" | head -c 3000)"
    SAFE_USER="$(echo "$USER_TEXT" | head -c 1000)"
    OBS_TS="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    OBS_SESSION="${TURN_ID:-unknown}"

    if command -v jq &>/dev/null; then
        jq -n -c \
            --arg ts "$OBS_TS" \
            --arg ev "$OBS_EVENT_TYPE" \
            --arg cli "codex" \
            --arg inp "$SAFE_USER" \
            --arg out "$SAFE_RESPONSE" \
            --arg sess "$OBS_SESSION" \
            '{timestamp:$ts, event:$ev, cli:$cli, input:$inp, output:$out, session:$sess}' \
            >> "$OBS_FILE" 2>/dev/null
    fi

    # 파일 크기 제한 (10MB)
    if [ -f "$OBS_FILE" ]; then
        OBS_SIZE_MB=$(du -m "$OBS_FILE" 2>/dev/null | cut -f1)
        if [ "${OBS_SIZE_MB:-0}" -ge 10 ]; then
            OBS_ARCHIVE_DIR="$OBS_TARGET_DIR/archive"
            mkdir -p "$OBS_ARCHIVE_DIR"
            mv "$OBS_FILE" "$OBS_ARCHIVE_DIR/observations-$(date +%Y%m%d-%H%M%S).jsonl" 2>/dev/null || true
        fi
    fi
fi

CHRONOS_CONTINUE="$HOME/.codex/skills/auto-continue-loop/scripts/continue-loop.sh"
if [ -x "$CHRONOS_CONTINUE" ]; then
    if ! printf '%s' "$PAYLOAD" | "$CHRONOS_CONTINUE"; then
        debug_log "chronos-chain-failed: $CHRONOS_CONTINUE"
    fi
fi
